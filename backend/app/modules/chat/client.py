"""Server-side-only OpenRouter client. The frontend never calls OpenRouter
directly — only our own /chat/* endpoints.

Uses OpenRouter's OpenAI-compatible tool-calling: the model is given a fixed
set of tools (see TOOLS below) and decides which to call. Read-only search
tools are executed immediately by the caller (chat.service) against our own
catalogue; write-shaped "propose_*" tools are never executed here — they are
surfaced to the user as a pending action and only run on explicit Accept.
This is what keeps the assistant grounded in real data and never able to
silently mutate the database mid-conversation.

Any failure (missing key, quota exhausted, timeout, malformed response)
returns None; the caller falls back to a fixed message rather than crashing.
"""

import threading
from datetime import datetime, timezone

import httpx

from app.core.config import get_settings

settings = get_settings()

_OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "search_cities",
            "description": "Search the trip-planning catalogue for cities to visit.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Free-text city or region name."},
                    "region": {"type": "string", "description": "Optional region/continent filter."},
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_activities",
            "description": "Search the catalogue for real activities available in a given city.",
            "parameters": {
                "type": "object",
                "properties": {
                    "cityId": {"type": "integer", "description": "A city id returned by search_cities."},
                    "maxCostCents": {"type": "integer", "description": "Optional upper cost bound, in cents."},
                },
                "required": ["cityId"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "propose_create_trip",
            "description": (
                "Propose creating a new trip. Does NOT create it — the user must accept the "
                "proposal in the UI first. Call this once you know a name and a date range."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "startDate": {"type": "string", "description": "YYYY-MM-DD"},
                    "endDate": {"type": "string", "description": "YYYY-MM-DD"},
                    "description": {"type": "string"},
                    "currencyCode": {"type": "string", "description": "3-letter code, default INR"},
                    "budgetCapCents": {"type": "integer"},
                },
                "required": ["name", "startDate", "endDate"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "propose_add_stop",
            "description": (
                "Propose adding a city stop to the trip currently being planned in this "
                "conversation. Does NOT add it — the user must accept. Use a cityId from "
                "search_cities, never a made-up one."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "cityId": {"type": "integer"},
                    "arrivalDate": {"type": "string", "description": "YYYY-MM-DD, inclusive"},
                    "departureDate": {"type": "string", "description": "YYYY-MM-DD, exclusive"},
                },
                "required": ["cityId", "arrivalDate", "departureDate"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "propose_add_activity",
            "description": (
                "Propose adding one activity to a stop already in the trip. Does NOT add it — "
                "the user must accept. Use an activityId from search_activities when the idea "
                "matches a real catalogue entry; otherwise omit activityId and set customName."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "stopId": {"type": "string", "description": "A stop id from a prior accepted ADD_STOP."},
                    "activityId": {"type": "integer"},
                    "customName": {"type": "string"},
                    "scheduledDate": {"type": "string", "description": "YYYY-MM-DD"},
                    "costCents": {"type": "integer"},
                    "startTime": {"type": "string", "description": "HH:MM, optional"},
                },
                "required": ["stopId", "scheduledDate"],
            },
        },
    },
]

_PROPOSE_TOOL_NAMES = {"propose_create_trip", "propose_add_stop", "propose_add_activity"}

SYSTEM_PROMPT = (
    "You are GlobeTrotter's trip-planning assistant. You help the user plan a multi-city trip "
    "through conversation. Ground every idea in the app's own catalogue: call search_cities and "
    "search_activities before proposing anything, and only reference cityId/activityId values "
    "those tools actually returned. You cannot write to the database yourself — use the "
    "propose_create_trip / propose_add_stop / propose_add_activity tools to suggest a concrete "
    "next step, and the user will accept or reject it in the UI. Propose one thing at a time, "
    "in order: a trip first, then its stops, then activities for each stop. When a stop is "
    "accepted you will see a system note containing 'stopId=<uuid>' — copy that exact uuid into "
    "the stopId field of any propose_add_activity call for that city; never invent one. Keep "
    "replies short and conversational."
)

_lock = threading.Lock()
_counter_date: str | None = None
_counter_count = 0


def _under_daily_limit() -> bool:
    global _counter_date, _counter_count
    today = datetime.now(timezone.utc).date().isoformat()
    with _lock:
        if _counter_date != today:
            _counter_date = today
            _counter_count = 0
        if _counter_count >= settings.OPENROUTER_DAILY_LIMIT:
            return False
        _counter_count += 1
        return True


def run_turn(messages: list[dict]) -> dict | None:
    """One chat-completion call with tools enabled. Returns the raw assistant
    message dict ({"role", "content", "tool_calls"}) or None on any failure."""
    if not settings.OPENROUTER_API_KEY or not _under_daily_limit():
        return None

    payload = {
        "model": settings.OPENROUTER_MODEL,
        "messages": messages,
        "tools": TOOLS,
        "tool_choice": "auto",
        "temperature": 0.6,
    }
    headers = {
        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
    }
    try:
        resp = httpx.post(_OPENROUTER_URL, headers=headers, json=payload, timeout=25.0)
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]
    except (httpx.HTTPError, KeyError, IndexError, ValueError):
        return None
