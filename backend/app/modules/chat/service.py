import json
import uuid

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.errors import ValidationFailed, translate_db_error
from app.models.tables import ChatMessage, ChatSession, TripStop, User
from app.modules.activities import repository as activities_repo
from app.modules.activities.schemas import ScheduledActivityCreate
from app.modules.catalog import repository as catalog_repo
from app.modules.chat import client, repository as repo
from app.modules.stops import repository as stops_repo
from app.modules.stops.schemas import StopCreate
from app.modules.trips import repository as trips_repo
from app.modules.trips.schemas import TripCreate

_MAX_TOOL_ROUNDS = 4

_ACTION_TYPE_BY_TOOL = {
    "propose_create_trip": "CREATE_TRIP",
    "propose_add_stop": "ADD_STOP",
    "propose_add_activity": "ADD_ACTIVITY",
}

_FALLBACK_MESSAGE = (
    "I'm having trouble reaching the planning assistant right now — you can still add trips, "
    "stops, and activities manually while this sorts itself out."
)


def _history_to_openai(messages: list[ChatMessage]) -> list[dict]:
    out = []
    for m in messages:
        if m.role == "USER":
            out.append({"role": "user", "content": m.content or ""})
        elif m.role == "ASSISTANT":
            out.append({"role": "assistant", "content": m.content or ""})
        elif m.role == "TOOL":
            out.append({"role": "user", "content": f"[System note] {m.content}"})
    return out


def _default_proposal_text(action_type: str, args: dict) -> str:
    if action_type == "CREATE_TRIP":
        return (
            f"How about a trip called \"{args.get('name', 'Your Trip')}\" "
            f"from {args.get('startDate')} to {args.get('endDate')}?"
        )
    if action_type == "ADD_STOP":
        return (
            f"I'd suggest adding a stop (city #{args.get('cityId')}) "
            f"from {args.get('arrivalDate')} to {args.get('departureDate')}."
        )
    if action_type == "ADD_ACTIVITY":
        name = args.get("customName") or f"activity #{args.get('activityId')}"
        return f"How about adding {name} on {args.get('scheduledDate')}?"
    return "Here's a suggestion."


def _resolve_stop_id(db: Session, session: ChatSession, stop_id_raw) -> uuid.UUID | None:
    """The model is told the real stopId in a system note after ADD_STOP is
    accepted (see the note text below), but small free models sometimes
    still omit or invent it. If the trip has exactly one stop, that's
    unambiguous — fall back to it rather than failing a request the user
    clearly meant. Multi-stop trips still require a real, matching id."""
    if stop_id_raw:
        try:
            candidate = uuid.UUID(str(stop_id_raw))
            stop = db.query(TripStop).filter(TripStop.id == candidate).first()
            if stop is not None and stop.trip_id == session.trip_id:
                return candidate
        except ValueError:
            pass

    if not session.trip_id:
        return None
    stops = db.query(TripStop.id).filter(TripStop.trip_id == session.trip_id).all()
    if len(stops) == 1:
        return stops[0][0]
    return None


def _execute_search_tool(db: Session, tool_call: dict) -> dict:
    name = tool_call["function"]["name"]
    try:
        args = json.loads(tool_call["function"].get("arguments") or "{}")
    except (json.JSONDecodeError, TypeError):
        args = {}

    if name == "search_cities":
        rows, _total = catalog_repo.search_cities(
            db, q=args.get("query"), region=args.get("region"), limit=8
        )
        return {
            "cities": [
                {"id": r["id"], "name": r["name"], "countryName": r["country_name"], "costIndex": r["cost_index"]}
                for r in rows
            ]
        }
    if name == "search_activities":
        city_id = args.get("cityId")
        if city_id is None:
            return {"error": "cityId is required"}
        rows, _total = catalog_repo.search_activities(
            db, city_id=city_id, max_cost_cents=args.get("maxCostCents"), limit=10
        )
        return {
            "activities": [
                {"id": r["id"], "name": r["name"], "category": r["category_name"], "costCents": r["base_cost_cents"]}
                for r in rows
            ]
        }
    return {"error": f"unknown tool {name}"}


def send_message(
    db: Session, user: User, session_id: uuid.UUID, content: str
) -> tuple[ChatSession, list[ChatMessage]]:
    session = repo.get_owned_session(db, session_id, user.id)
    new_messages = [repo.append_message(db, session.id, "USER", content)]

    working_messages = [{"role": "system", "content": client.SYSTEM_PROMPT}]
    working_messages += _history_to_openai(repo.list_messages(db, session.id))

    for _round in range(_MAX_TOOL_ROUNDS):
        raw = client.run_turn(working_messages)
        if raw is None:
            new_messages.append(repo.append_message(db, session.id, "ASSISTANT", _FALLBACK_MESSAGE))
            repo.touch_session(db, session)
            return session, new_messages

        tool_calls = raw.get("tool_calls") or []
        if not tool_calls:
            text = raw.get("content") or "I'm not sure how to respond to that — could you rephrase?"
            new_messages.append(repo.append_message(db, session.id, "ASSISTANT", text))
            repo.touch_session(db, session)
            return session, new_messages

        propose_call = next(
            (tc for tc in tool_calls if tc["function"]["name"] in _ACTION_TYPE_BY_TOOL), None
        )
        if propose_call is not None:
            action_type = _ACTION_TYPE_BY_TOOL[propose_call["function"]["name"]]
            try:
                args = json.loads(propose_call["function"].get("arguments") or "{}")
            except (json.JSONDecodeError, TypeError):
                args = {}
            text = raw.get("content") or _default_proposal_text(action_type, args)
            new_messages.append(
                repo.append_message(
                    db, session.id, "ASSISTANT", text,
                    action_type=action_type, action_payload=args, action_status="PENDING",
                )
            )
            repo.touch_session(db, session)
            return session, new_messages

        # Every tool call this round is a read-only search — execute and loop again.
        working_messages.append(raw)
        for tc in tool_calls:
            result = _execute_search_tool(db, tc)
            working_messages.append(
                {"role": "tool", "tool_call_id": tc["id"], "content": json.dumps(result)}
            )

    new_messages.append(
        repo.append_message(
            db, session.id, "ASSISTANT",
            "Let's take that one step at a time — could you tell me a bit more about what you'd like?",
        )
    )
    repo.touch_session(db, session)
    return session, new_messages


def start_session(db: Session, user: User, content: str) -> tuple[ChatSession, list[ChatMessage]]:
    session = repo.create_session(db, user.id)
    return send_message(db, user, session.id, content)


def get_session(db: Session, user: User, session_id: uuid.UUID) -> ChatSession:
    return repo.get_owned_session(db, session_id, user.id)


def list_sessions(db: Session, user: User) -> list[ChatSession]:
    return repo.list_sessions(db, user.id)


def get_messages(db: Session, user: User, session_id: uuid.UUID) -> list[ChatMessage]:
    repo.get_owned_session(db, session_id, user.id)
    return repo.list_messages(db, session_id)


def accept_action(db: Session, user: User, message_id: uuid.UUID) -> dict:
    message = repo.get_owned_message(db, message_id, user.id)
    if message.action_status != "PENDING":
        raise ValidationFailed("This suggestion has already been handled.")
    session = repo.get_owned_session(db, message.session_id, user.id)
    payload = message.action_payload or {}

    result: dict = {"trip": None, "stop": None, "activity": None}

    if message.action_type == "CREATE_TRIP":
        data = TripCreate(**payload)
        try:
            trip = trips_repo.create_trip(db, user.id, data.model_dump(exclude_unset=False))
        except SQLAlchemyError as exc:
            db.rollback()
            raise translate_db_error(exc)
        repo.set_session_trip(db, session, trip.id)
        note = f'Trip "{trip.name}" created.'
        result["trip"] = trip

    elif message.action_type == "ADD_STOP":
        if not session.trip_id:
            raise ValidationFailed("No trip exists yet for this conversation.")
        data = StopCreate(**payload)
        try:
            stop = stops_repo.create_stop(db, session.trip_id, data.model_dump(exclude_unset=False))
        except SQLAlchemyError as exc:
            db.rollback()
            raise translate_db_error(exc)
        note = f"Stop added (stopId={stop.id}): city #{stop.city_id}, {stop.arrival_date} to {stop.departure_date}."
        result["stop"] = stop

    elif message.action_type == "ADD_ACTIVITY":
        stop_id = _resolve_stop_id(db, session, payload.get("stopId"))
        if stop_id is None:
            raise ValidationFailed(
                "This suggestion doesn't say which stop it belongs to, and this trip has more "
                "than one — tell the assistant which city you mean and try again."
            )
        data = ScheduledActivityCreate(**payload)
        act_data = data.model_dump(exclude_unset=False)
        act_data["source"] = "AI_SUGGESTED"
        act_data["status"] = "CONFIRMED"
        try:
            act = activities_repo.create_activity(db, stop_id, act_data)
        except SQLAlchemyError as exc:
            db.rollback()
            raise translate_db_error(exc)
        note = f"Activity added: {act.custom_name or ('#' + str(act.activity_id))} on {act.scheduled_date}."
        result["activity"] = act

    else:
        raise ValidationFailed("Unknown suggestion type.")

    updated_message = repo.update_action_status(db, message, "ACCEPTED")
    repo.append_message(db, session.id, "TOOL", note)
    repo.touch_session(db, session)

    result["message"] = updated_message
    return result


def reject_action(db: Session, user: User, message_id: uuid.UUID) -> ChatMessage:
    message = repo.get_owned_message(db, message_id, user.id)
    if message.action_status != "PENDING":
        raise ValidationFailed("This suggestion has already been handled.")
    updated_message = repo.update_action_status(db, message, "REJECTED")
    repo.append_message(db, message.session_id, "TOOL", "Suggestion dismissed.")
    repo.touch_session(db, repo.get_owned_session(db, message.session_id, user.id))
    return updated_message
