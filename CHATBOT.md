# CHATBOT.md — AI Trip Suggestion Feature for GlobeTrotter

## Context

GlobeTrotter is a multi-city travel planning app (hackathon project). This spec covers ONE feature: an AI suggestion chatbot embedded in the **Create a New Plan** flow (specifically the Itinerary Builder, where users build out stops/cities/activities).

Hackathon judging weights **database design (their #1 priority)**, minimal third-party API usage, real/dynamic data over hardcoded content, robust input validation, clean git history, and usable UI. Every design decision below is made with those priorities in mind — in particular, **the AI must be grounded in our own database, not a freestanding chat toy that invents places.**

Do not start writing feature code until Phase 0 is complete and you've confirmed your findings make sense. If anything is ambiguous or missing (e.g. no `cities`/`activities` data exists yet), stop and report back rather than guessing.

---

## Phase 0: Investigate the existing codebase

Before writing anything, explore the repo and answer these for yourself:

1. **Stack detection** — Inspect `package.json`, config files, and folder structure. Confirm the actual frontend framework, backend framework, database, and ORM/driver in use. Do not assume MERN/Next.js — verify.
2. **Trip data model** — Locate existing schema/models for trips, stops, cities, and activities.
   - Do `cities` and `activities` already exist as real, seeded tables/collections? What fields do they have?
   - If they don't exist yet, that's a blocker for grounding suggestions — flag it. (See "Data model" section below for what's needed.)
3. **Auth pattern** — How is the logged-in user identified in a request (JWT middleware, session, cookie)? The suggestion/accept endpoints need to know which user's trip they're touching.
4. **Conventions** — Folder structure, naming conventions, validation middleware/library already in use (e.g. Zod, Joi, express-validator), and how any existing third-party API calls are structured, so this integration matches the rest of the codebase.
5. **Env/config pattern** — Where API keys/secrets are currently stored and loaded (`.env`, config module, etc.), so the OpenRouter key follows the same pattern.

---

## Feature overview

**Interaction model:** structured suggestion feed, not freeform chat. One suggestion card at a time, scoped **per stop** (i.e., suggestions are generated for a specific city + date range within the trip, not the whole trip at once).

Each card has three actions:
- **Accept** → immediately persists the item to the database as a draft-status itinerary item for that stop.
- **Skip** → discarded, move to the next suggestion in the queue. No DB write.
- **Improve/Similar** → opens a small inline text input where the user types a steer (e.g. "cheaper," "more outdoorsy," "closer to downtown"). That text is sent back to the model along with the original suggestion and stop context, and the card is replaced with a new suggestion.

When the user clicks the main **Save** button (finalizing the whole trip plan, not just one stop), the backend filters and organizes everything that was Accepted across all stops into the trip's finalized itinerary and recomputes the budget rollup.

---

## Data model (proposed — reconcile with what Phase 0 finds)

Adapt naming/types to match whatever convention already exists in the repo. If equivalent tables already exist, extend them instead of duplicating.

```
cities
  id, name, country, region, avg_daily_cost, popularity_score, tags[]

activities
  id, city_id (FK), name, category, description, image_url,
  estimated_cost, duration_minutes, tags[]

trip_stops
  id, trip_id (FK), city_id (FK), start_date, end_date, order_index

stop_items                          -- the actual itinerary line items
  id, stop_id (FK), activity_id (FK, nullable), custom_name (if not linked
    to activities table), day, time_slot, cost,
  status        ENUM('draft', 'confirmed'),
  source        ENUM('ai_suggested', 'manual'),
  created_at

trip_preferences                    -- optional, set once per trip
  trip_id (FK), budget_level, interest_tags[], pace

ai_suggestion_log                   -- optional but recommended
  id, trip_id (FK), stop_id (FK), activity_id (FK, nullable),
  action ENUM('accepted','skipped','improved'), steer_text (nullable),
  created_at
```

`ai_suggestion_log` isn't strictly required for the feature to work, but it's cheap to add and gives you real data for the Admin/Analytics dashboard (acceptance rate, most-skipped suggestions, etc.) — worth it given how much the judges weight database design.

---

## Backend

### 1. OpenRouter integration — server-side only

The OpenRouter API key must live only on the backend. The frontend never calls OpenRouter directly — it calls your own endpoints, which call OpenRouter.

- Model: `google/gemma-4-31b-it:free` (OpenRouter's free tier — 200 requests/day, rate-limited, native function calling support, 262K context window).
- Use the model's native function-calling / structured-output support to force the response into a defined JSON schema (see below). Do not parse free-text model output — that's fragile and won't pass "robust input validation" scrutiny.
- Because the free tier is capped at 200 req/day, implement a simple usage counter (or catch the 429) and a graceful fallback: if the AI is unavailable, disable the suggestion button with a clear message, and optionally fall back to a rule-based suggestion (top-rated activities from the DB matching the stop's city/preferences, no LLM call). This keeps the feature demoable even if the quota is exhausted mid-hackathon-judging.

### 2. Grounding the model in real data (critical)

Before calling the LLM, query the DB for a candidate list of cities/activities matching the stop's city and any stated preferences (budget level, interest tags). Pass that candidate list into the prompt and instruct the model to select/rank/adapt from it, rather than inventing places from nothing. This is what satisfies "real-time dynamic data" and "minimal 3rd-party API use" — the LLM is doing selection and phrasing, not being the source of truth.

The prompt sent to the model should include:
- Stop context: city, date range, day being planned
- Trip-level preferences (if set)
- Candidate activities/cities pulled from the DB
- Items already Accepted or Skipped for this stop in the current session (avoid duplicates/re-suggesting skipped items)
- If this is an Improve request: the original suggestion + the user's steer text
- An explicit instruction to return only valid JSON matching the defined schema

### 3. Structured output schema (suggestion object)

```json
{
  "type": "activity" | "city",
  "ref_id": "matches an id from cities/activities table, or null if novel",
  "name": "string",
  "description": "string, 1-2 sentences",
  "estimated_cost": "number",
  "category": "string",
  "tags": ["string"]
}
```

Backend must validate the returned JSON against this schema before doing anything with it (correct types, `ref_id` actually exists in the DB if present, cost is a positive number). Reject and retry once on malformed output; if it fails twice, fall back to the rule-based suggestion path.

### 4. Endpoints

```
POST /api/trips/:tripId/stops/:stopId/suggestions
  -> generates and returns a batch of suggestion cards for this stop

POST /api/trips/:tripId/stops/:stopId/suggestions/:suggestionId/improve
  body: { steerText: string }
  -> returns one replacement suggestion, steered by the input

POST /api/trips/:tripId/stops/:stopId/items
  body: accepted suggestion payload
  -> writes a stop_items row with status='draft', source='ai_suggested'

POST /api/trips/:tripId/finalize
  -> filters, organizes, and confirms the trip (see below)
```

Skip requires no endpoint — it's purely a frontend "show next card" action. (Optionally log it to `ai_suggestion_log` if you added that table.)

### 5. Finalize/Save logic

`POST /api/trips/:tripId/finalize` should:
1. Validate the trip has required fields (name, valid date range) and at least one stop.
2. Pull all `stop_items` across all stops for this trip.
3. **Filter**: drop anything still `draft` that the user never explicitly interacted with if that's possible in your flow (in the described flow, Accept already writes draft rows, so this step is mostly a no-op safety check — but validate no orphaned/invalid references slipped through).
4. **Organize**: assign/normalize `order_index` and `time_slot` per stop so the itinerary renders in day order; check for and flag same-day time conflicts.
5. Transition all draft `stop_items` for this trip to `status='confirmed'`.
6. Compute the cost rollup (by category: transport, stay, activities, meals — whatever categories exist in your budget screen) and persist it (either a `trip_budget_summary` table or computed fields on `trips`), so the Trip Budget & Cost Breakdown screen has real numbers to render.
7. Mark the trip itself as finalized/planned (whatever status field the trip model uses).
8. Return the finalized itinerary + budget summary.

---

## Frontend

- Suggestion feed component lives inside the Itinerary Builder, scoped to whichever stop is currently being edited.
- One card visible at a time: name, short description, estimated cost, category/tags, three buttons (Accept / Skip / Improve).
- Improve click → inline text field appears on the card ("What would you like different?") → submit calls the improve endpoint → card content swaps in place once the response returns; show a loading state during the call.
- Accept → optimistic UI update (mark card as accepted, immediately request the next suggestion) while the write happens in the background; surface an error state if the write fails.
- When the suggestion batch is exhausted, show a "Get more suggestions" action that calls the generate endpoint again, excluding already-seen items.
- If the AI is rate-limited/unavailable, show a non-blocking message and let the user continue adding items manually — the AI is an assist, never a blocker to using the app.

---

## Validation requirements

- Sanitize/length-limit the `steerText` input before it's included in any prompt sent to the model (prevent prompt injection and abuse of the free-tier quota via absurdly long input).
- Validate stop/trip IDs on every request belong to the authenticated user before touching the DB.
- Validate the LLM's structured output against the schema server-side before persisting anything (see above) — never trust model output directly into the DB.
- Validate date ranges and required fields on the finalize endpoint; return clear 4xx errors, not silent failures.

## Out of scope for this feature

- No freeform/open-ended chat UI — suggestion cards only.
- No new third-party APIs beyond OpenRouter (city/activity data comes from our own DB).
- No client-side calls to OpenRouter — backend proxy only.
