# TripCraft

A multi-city travel planning app. Build an itinerary city by city, attach
activities to each stop, see a live cost breakdown, and publish a
read-only link for others to view or copy. Built for the Odoo x LDCE
hackathon.

## What it does

- **Auth** — email/password signup and login (Google sign-in is stubbed
  in the UI, pending an OAuth backend route)
- **Trips** — create, edit, delete; each trip has a name, date range,
  currency, and optional budget cap
- **Itinerary builder** — add city stops with arrival/departure dates,
  attach activities to each stop with a time and cost
- **Budget** — total spend and a category breakdown (transport, stay,
  activities, meals, other), computed from the trip's stops and
  activities, never entered by hand
- **Calendar** — every scheduled activity across all trips, grouped by
  date
- **Search** — browse the seeded city and activity catalogue, sortable
  by cost index or popularity
- **Sharing** — publish a trip to a public read-only link; anyone with
  the link can view it, and a logged-in visitor can copy it into their
  own account
- **AI trip-planning chat** — a conversational assistant that can
  propose creating a trip, adding a stop, or adding an activity; each
  proposal is shown as a card you explicitly accept or reject before
  anything is written to your trip. Runs against a free OpenRouter
  model with a rule-based fallback if the key is unset or the daily
  quota is hit — the rest of the app works with no AI dependency at all.
- **Profile** — edit name and home city, manage saved destinations
- **Admin** — platform stats, activity trends, and user management,
  gated to accounts with the `ADMIN` role

## Stack

| Layer | Choice |
|---|---|
| Database | PostgreSQL 16 (one shared instance — everyone points at the same `DATABASE_URL`, no local Postgres) |
| Migrations | Plain numbered SQL files in `migrations/`, applied by `scripts/migrate.py` — not Alembic |
| Backend | FastAPI (Python 3.11+), SQLAlchemy 2.0, sync sessions |
| Auth | Argon2id password hashing, one JWT access token (HS256, 12h, no refresh) |
| AI chat | OpenRouter (`google/gemma-4-31b-it:free`), server-side only — the frontend never calls it directly |
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS |
| Server state | TanStack Query |
| Client state | Zustand (session store) |

No Docker. No file uploads — cover images are a fixed set of preset
paths. Zero third-party runtime dependencies beyond the one optional AI
call, which degrades gracefully when unavailable.

## Project layout

```
TripCraft/
├── migrations/              numbered SQL, applied in order
├── scripts/
│   └── migrate.py           applies migrations/*.sql, idempotent
├── backend/
│   ├── app/
│   │   ├── main.py          FastAPI app factory, mounts every router
│   │   ├── core/             config, db session, security, error translation
│   │   ├── models/tables.py  SQLAlchemy models matching the schema
│   │   ├── modules/          one folder per feature area:
│   │   │                     auth, users, trips, stops, activities,
│   │   │                     catalog, budget, dashboard, sharing,
│   │   │                     admin, chat
│   │   └── seed/             catalogue seed data + idempotent seed script
│   └── tests/                pytest — DB-invariant tests, chat tests
├── frontend/
│   └── src/
│       ├── api/               typed fetch client + one file per domain
│       ├── components/        shared layout
│       ├── pages/              one per screen
│       └── stores/session.ts  auth token + current user
└── render.yaml               Render deploy blueprint (API only)
```

Every backend module follows the same shape: `router.py` (HTTP only) →
`service.py` (business rules, transactions) → `repository.py` (SQL) →
`schemas.py` (Pydantic request/response models).

## Running it locally

You need Python 3.11+, Node 18+, and access to the shared Postgres
`DATABASE_URL` (ask a teammate — there's no local DB to stand up).

### Backend

```bash
cd backend
cp .env.example .env          # fill in DATABASE_URL and JWT_SECRET
pip install -r requirements.txt
python ../scripts/migrate.py  # applies any migrations not yet run
python -m app.seed.run --demo # seeds the city/activity catalogue
uvicorn app.main:app --reload # http://localhost:8000/docs
```

`OPENROUTER_API_KEY` in `.env` is optional — leave it blank to run the
chat feature on its rule-based fallback instead of a live model call.

### Frontend

```bash
cd frontend
npm install
npm run dev                   # http://localhost:5173, proxies /api to :8000
```

### Tests

```bash
cd backend
pytest tests/                 # DB-invariant + chat tests, against the real DB
```

## Database design notes

- **The budget is never stored.** It's a SQL view (`v_trip_budget`) over
  stops, activities, and expenses — computed fresh on every read, so it
  can't go stale.
- **`departure_date` is exclusive, `arrival_date` is inclusive.** A stop
  ending the 15th and the next one starting the 15th is a legal
  back-to-back pair, not an overlap.
- **Stop overlap is enforced by a Postgres exclusion constraint**
  (`EXCLUDE USING gist`), not application code — it holds under
  concurrent writes, which an app-level check can't guarantee.
- **A private trip owned by someone else returns 404, never 403** —
  the API never confirms a resource exists to someone who can't see it.
- Full schema detail lives in the numbered files under `migrations/`.

## Known limitations

Named cuts, not oversights — most are flagged in the UI itself rather
than silently missing:

- **No password reset.** "Forgot password" has no backend route; the
  login screen says so instead of pretending the link works.
- **No account deletion.** Same treatment on the Profile screen — shown
  disabled rather than wired to an endpoint that doesn't exist.
- **No language preference**, despite the column existing in the users
  table — never exposed through the API.
- **No Google OAuth backend yet.** The button is on both auth screens
  and shows a clear message instead of failing silently; wiring it up is
  in progress.
- **Realtime is half-built.** The WebSocket hub mounts and accepts
  connections at `/ws/trips/{id}`, but no write path calls
  `manager.broadcast()` yet, so a connected client never actually
  receives an invalidation event. The frontend doesn't attempt to use it
  — everything works off plain request/refetch.
- **Single 12-hour JWT, no refresh rotation, stored in localStorage.** A
  deliberate scope cut for a hackathon build, not a production posture.
- **No file uploads.** Cover images and avatars are preset paths, not
  upload endpoints — removes a whole vulnerability class for no real
  loss at this scale.
- **The AI chat depends on an external free-tier model** (200
  requests/day). It has a rule-based fallback, but that fallback is
  simpler than a live model response — expect the difference in quality.

## Deploying

`render.yaml` deploys the API to Render; the frontend deploys to Vercel
(`frontend/vercel.json` handles the SPA routing fallback). `DATABASE_URL`
and `JWT_SECRET` are set manually in the Render dashboard, not committed.
