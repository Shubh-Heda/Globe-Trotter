"""Invariant tests for the conversational trip-planning chatbot
(modules/chat), matching the style of test_invariants.py:
1. A non-owner accessing someone else's session/messages gets 404.
2. Accepting a scripted CREATE_TRIP proposal creates the real trip row and
   points the session at it.
3. Rejecting a proposal never writes a trip row.
4. A hallucinated activityId in an ADD_ACTIVITY proposal is rejected at
   accept-time (FK violation -> AppError), never silently persisted.
"""

import uuid
from unittest import mock

import pytest
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.core.security import create_access_token
from app.models.tables import City, Trip, TripStop, User
from app.modules.chat import repository as repo, service


def _scripted_tool_call(name: str, arguments: dict, call_id: str = "call_1") -> dict:
    import json

    return {
        "role": "assistant",
        "content": None,
        "tool_calls": [{"id": call_id, "function": {"name": name, "arguments": json.dumps(arguments)}}],
    }


def _cleanup_session(db: Session, session_id, trip_id=None):
    db.execute(text("DELETE FROM chat_messages WHERE session_id = :id"), {"id": session_id})
    db.execute(text("DELETE FROM chat_sessions WHERE id = :id"), {"id": session_id})
    if trip_id:
        db.execute(
            text(
                "DELETE FROM stop_activities WHERE trip_stop_id IN "
                "(SELECT id FROM trip_stops WHERE trip_id = :id)"
            ),
            {"id": trip_id},
        )
        db.execute(text("DELETE FROM trip_stops WHERE trip_id = :id"), {"id": trip_id})
        db.execute(text("DELETE FROM trips WHERE id = :id"), {"id": trip_id})
    db.commit()


class TestOwnershipGuard:
    def test_non_owner_gets_404_on_messages(self, client, db: Session, test_user):
        session = repo.create_session(db, test_user.id)
        other = User(
            id=uuid.uuid4(),
            email=f"other-{uuid.uuid4().hex[:8]}@test.globetrotter",
            password_hash="x",
            full_name="Other User",
        )
        db.add(other)
        db.commit()
        try:
            resp = client.get(
                f"/api/v1/chat/sessions/{session.id}/messages",
                headers={"Authorization": f"Bearer {create_access_token(other.id)}"},
            )
            assert resp.status_code == 404
            assert resp.json()["error"]["code"] == "NOT_FOUND"
        finally:
            _cleanup_session(db, session.id)
            db.execute(text("DELETE FROM users WHERE id = :id"), {"id": other.id})
            db.commit()


class TestAcceptCreateTrip:
    def test_accept_creates_trip_and_links_session(self, db: Session, test_user):
        session = repo.create_session(db, test_user.id)
        try:
            scripted = _scripted_tool_call(
                "propose_create_trip",
                {"name": "Chat-Planned Trip", "startDate": "2026-12-10", "endDate": "2026-12-15"},
            )
            with mock.patch("app.modules.chat.service.client.run_turn", return_value=scripted):
                _, new_messages = service.send_message(db, test_user, session.id, "Plan me a trip")

            proposal = new_messages[-1]
            assert proposal.action_type == "CREATE_TRIP"
            assert proposal.action_status == "PENDING"

            result = service.accept_action(db, test_user, proposal.id)
            trip = result["trip"]
            assert trip is not None
            assert trip.name == "Chat-Planned Trip"

            db.refresh(session)
            assert session.trip_id == trip.id

            refreshed = db.query(Trip).filter(Trip.id == trip.id).first()
            assert refreshed is not None
        finally:
            trip_id = session.trip_id
            _cleanup_session(db, session.id, trip_id=trip_id)


class TestRejectAction:
    def test_reject_writes_nothing(self, db: Session, test_user):
        session = repo.create_session(db, test_user.id)
        try:
            scripted = _scripted_tool_call(
                "propose_create_trip",
                {"name": "Rejected Trip", "startDate": "2026-12-10", "endDate": "2026-12-15"},
            )
            with mock.patch("app.modules.chat.service.client.run_turn", return_value=scripted):
                _, new_messages = service.send_message(db, test_user, session.id, "Plan me a trip")

            proposal = new_messages[-1]
            service.reject_action(db, test_user, proposal.id)

            db.refresh(session)
            assert session.trip_id is None
            count = db.execute(
                text("SELECT count(*) FROM trips WHERE name = 'Rejected Trip'")
            ).scalar()
            assert count == 0
        finally:
            _cleanup_session(db, session.id)


class TestHallucinatedActivityRejected:
    def test_nonexistent_activity_id_raises_not_persisted(self, db: Session, test_user):
        city_id = db.execute(text("SELECT id FROM cities LIMIT 1")).scalar()
        if not city_id:
            pytest.skip("No cities seeded yet")

        trip = Trip(
            user_id=test_user.id,
            name="Hallucination Test Trip",
            start_date="2026-12-10",
            end_date="2026-12-20",
        )
        db.add(trip)
        db.flush()
        stop = TripStop(
            trip_id=trip.id,
            city_id=city_id,
            arrival_date="2026-12-12",
            departure_date="2026-12-15",
            sort_order=0,
        )
        db.add(stop)
        db.commit()

        session = repo.create_session(db, test_user.id)
        session.trip_id = trip.id
        db.commit()

        message = repo.append_message(
            db, session.id, "ASSISTANT", "How about this activity?",
            action_type="ADD_ACTIVITY",
            action_payload={
                "stopId": str(stop.id),
                "activityId": 999999999,  # does not exist in the catalogue
                "scheduledDate": "2026-12-12",
                "costCents": 1000,
            },
            action_status="PENDING",
        )

        try:
            with pytest.raises(AppError):
                service.accept_action(db, test_user, message.id)

            count = db.execute(
                text("SELECT count(*) FROM stop_activities WHERE trip_stop_id = :id"),
                {"id": stop.id},
            ).scalar()
            assert count == 0
        finally:
            db.rollback()
            _cleanup_session(db, session.id, trip_id=trip.id)
