# CLAUDE.md — GlobeTrotter

**You are building this project from scratch.** No code exists yet — this
file and the three docs it links to are the entire spec. Nothing in this
repo should be treated as already-written; every path mentioned below is a
file *you* create.

Read this file fully first, then `docs/DATABASE.md`, `docs/API.md`,
`docs/PLAN.md` before writing anything. Update the status table in §10 as
you complete each piece — that table is the shared memory across sessions
and across agents working on this at the same time.

---

## 0. What this is

A multi-city trip planner for a 6-hour hackathon (Odoo x LDCE). A user
creates a trip, adds city stops with dates, attaches activities to days
inside each stop, sees a live cost breakdown, and can publish a read-only
public link others can copy.

**Rubric priorities, in order:** database design (highest) > modularity >
coding standards > security > performance > frontend design. When two
implementations are otherwise equal, pick the one that makes the database
design more visibly correct — that's the highest-leverage place to spend
time, and where a judge looks first.

**Non-negotiable constraint:** zero third-party runtime API dependencies.
No maps, no geocoder, no currency feed, no mail service, no image CDN, no
external search. Everything runs on the stack below and nothing else.

---

## 1. Locked stack

| Layer | Choice |
|---|---|
| Database | PostgreSQL 16, one shared **Render Postgres** instance — no Docker, no local DB |
| Driver / ORM | `psycopg[binary]` v3 + SQLAlchemy 2.0, **sync** sessions (not async — see §7) |
| Migrations | Numbered plain-SQL files in `migrations/`, applied by a small runner script — not Alembic |
| API | FastAPI + Python 3.11, deployed on **Render Web Service** |
| Auth | Argon2id password hash + **one JWT access token, HS256, 12h, no refresh flow** |
| Validation | Pydantic v2 server-side; frontend types generated from `/openapi.json` via `openapi-typescript` |
| Web | React 18 + Vite + TypeScript + Tailwind, deployed on **Vercel** |
| Server state | TanStack Query. UI state: Zustand — two stores only (`session`, `filters`) |
| Charts | Recharts |
| Realtime | FastAPI native WebSocket, one in-memory room per trip — no Socket.IO |

**No Docker anywhere.** A shared Render Postgres instance replaces it —
every dev's `DATABASE_URL` points at the same database, so there's no
schema drift between machines, and the dev database *is* the deploy
database.

---

## 2. Build order

Build in this order — each stage unblocks the next, and it matches the
6-hour timeline in `docs/PLAN.md`:

1. **Schema.** Write and apply `migrations/001_init.sql` and
   `002_views.sql` from `docs/DATABASE.md` verbatim. Verify the date-range
   behavior in `psql` directly (§3 of that doc) before writing a single
   line of API code — this is the part everything else depends on being right.
2. **Backend core.** Config, DB session, security (JWT/argon2), error
   translation, the camelCase schema base. See §5 below for the exact
   behavior each of these needs.
3. **Auth + users modules**, fully real, end to end — this is the
   reference pattern every other module copies: `router.py` (HTTP only) →
   `service.py` (rules, transactions) → `repository.py` (SQL) →
   `schemas.py` (Pydantic).
4. **Contract-first stubs for every other module.** Every route in
   `docs/API.md` gets a handler that returns hardcoded JSON matching its
   response schema exactly — no database calls yet. This exists so the
   frontend never blocks on the backend. Push this before implementing any
   real business logic underneath it.
5. **Frontend shell.** Vite scaffold, design tokens, the seven primitives
   listed in §6, routing, the two auth pages wired to the real endpoints
   from step 3, everything else wired to the stubs from step 4.
6. **Replace stubs with real logic**, module by module: catalog search,
   budget (queries the views — no arithmetic in Python), trips, stops
   (the exclusion-constraint error path), activities, sharing (copy-trip
   transaction). Each replacement should not require the frontend or the
   route signature to change — that's the point of building the contract
   first.
7. **Realtime**, wired last, with the polling fallback in §9 ready to flip
   to at any point.

---

## 3. Repo structure to create

```
GlobeTrotter/
├── README.md
├── render.yaml                 ← Render deploy blueprint (API only)
├── migrations/
│   ├── 001_init.sql
│   └── 002_views.sql
├── scripts/
│   └── migrate.py              ← applies migrations/*.sql, idempotent
├── backend/
│   ├── requirements.txt
│   ├── .env.example
│   └── app/
│       ├── main.py             ← app factory, mounts every router
│       ├── core/
│       │   ├── config.py       ← settings, Render URL rewrite, sslmode
│       │   ├── db.py           ← sync SQLAlchemy session
│       │   ├── security.py     ← argon2, JWT, get_current_user dependency
│       │   ├── errors.py       ← AppError hierarchy, Postgres error translation
│       │   └── schema_base.py  ← CamelModel (camelCase Pydantic base)
│       ├── models/tables.py    ← SQLAlchemy models matching the schema exactly
│       ├── modules/
│       │   ├── auth/            router.py, service.py, repository.py, schemas.py
│       │   ├── users/           (same four files)
│       │   ├── trips/
│       │   ├── stops/
│       │   ├── activities/
│       │   ├── catalog/
│       │   ├── budget/
│       │   └── sharing/
│       ├── realtime/manager.py ← WebSocket hub
│       ├── seed/
│       │   ├── data/*.json      ← countries, cities, categories, activities
│       │   └── run.py           ← idempotent seed, `--demo` flag for volume data
│       └── static/covers/       ← 8 preset cover images, no upload pipeline
│   └── tests/
│       ├── conftest.py
│       └── test_invariants.py  ← the 4 tests in docs/PLAN.md §5
└── frontend/
    ├── package.json, vite.config.ts, tsconfig.json, tailwind.config.js, vercel.json
    └── src/
        ├── main.tsx, App.tsx
        ├── styles/tokens.css
        ├── api/client.ts, api/types.ts (generated, not hand-written)
        ├── stores/session.ts, stores/filters.ts
        ├── components/primitives/  ← Button, Input, Field, Select, Dialog, Toast, EmptyState
        ├── components/rail/, components/budget/
        └── pages/  ← one per route in docs/PLAN.md §1
```

Every module folder under `backend/app/modules/` follows the same shape:
`router.py` (HTTP only, no SQL) → `service.py` (business rules and
transaction boundaries, no SQL, no FastAPI imports) → `repository.py` (SQL
only) → `schemas.py` (Pydantic). A router that imports SQLAlchemy, or a
service that imports FastAPI, is wrong — fix it before moving on.

---

## 4. How it runs, once built

```bash
# Backend
cd backend
cp .env.example .env          # fill in DATABASE_URL (shared Render instance), JWT_SECRET
pip install -r requirements.txt
python ../scripts/migrate.py  # only the schema owner runs this — see docs/PLAN.md §3
python -m app.seed.run --demo
uvicorn app.main:app --reload # http://localhost:8000/docs

# Frontend
cd frontend
cp .env.example .env.local
npm install
npm run gen:types             # after the backend is up — regenerates src/api/types.ts
npm run dev                   # http://localhost:5173
```

`gen:types` should be an `openapi-typescript` script call against the live
`/openapi.json`, wired as an npm script. Run it once the backend boots,
and again at every sync point in `docs/PLAN.md` — a Pydantic change the
frontend hasn't absorbed should become a TypeScript compile error, not a
runtime surprise.

---

## 5. Conventions — not optional, apply everywhere

**camelCase on the wire, snake_case in Python/SQL.** Every Pydantic schema
inherits from one base class so this is handled once:

```python
# app/core/schema_base.py
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )
```

**Money is always `...Cents`, always an integer.** Never a float in a
budget field, in either language. The client formats for display and
never computes on it.

**`departure_date` is exclusive, `arrival_date` is inclusive.** See
`docs/DATABASE.md` §3 before writing anything date-related — this is the
single easiest thing in the whole schema to get backwards, and it's the
thing the demo script in `docs/PLAN.md` is built around proving.

**Render's `DATABASE_URL` needs rewriting at boot**, not read raw:

```python
# app/core/config.py — sketch, not literal
url = self.DATABASE_URL
if url.startswith("postgres://"):
    url = "postgresql+psycopg://" + url[len("postgres://"):]
if self.ENV == "production" and "sslmode" not in url:
    url += ("&" if "?" in url else "?") + "sslmode=require"
```

**Ownership check before any read or write on a trip-scoped resource, and
a private trip owned by someone else returns 404, never 403.** One helper,
called everywhere a trip is loaded:

```python
# app/modules/trips/repository.py
def get_owned_trip(db, trip_id, user_id):
    trip = db.query(Trip).filter(
        Trip.id == trip_id, Trip.user_id == user_id, Trip.deleted_at.is_(None)
    ).first()
    if not trip:
        raise NotFound("Trip not found.")  # never Forbidden — don't confirm existence
    return trip
```

**Postgres errors get translated, never surfaced raw.** Two functions in
`core/errors.py`: one maps `IntegrityError` (constraint violations —
`23505` → `EMAIL_TAKEN`, `23P01` / the `stop_no_overlap` exclusion
constraint → `STOP_OVERLAP`) to an `AppError` subclass; the other maps the
two `RAISE EXCEPTION` names from the schema's constraint triggers
(`stop_outside_trip_range`, `activity_outside_stop_range`) to
`STOP_OUTSIDE_TRIP` / `ACTIVITY_OUTSIDE_STOP`. Every write against
`trip_stops` or `stop_activities` should be wrapped to catch and translate
both.

**WebSocket events are invalidation hints, never data.** Emit only after
`db.commit()` has succeeded, never before or inside the transaction. The
frontend does `queryClient.invalidateQueries([...])` on receipt and
refetches — it never merges the event payload into state directly.

**No query inside a loop.** The trip-detail read (trip + stops +
activities) and the budget read are each one query. If a handler needs a
`for` loop that hits the database per iteration, that's a sign to write a
join or a view instead.

**Validation errors get one shape everywhere.** FastAPI's default 422 is
the wrong shape for the frontend — register an exception handler that
converts `RequestValidationError` into `{error: {code:
"VALIDATION_FAILED", message, details: [{field, issue}]}, requestId}`, so
the `Field` primitive on the frontend has exactly one error shape to
render for every form.

---

## 6. Frontend component contract

Seven primitives, built once, used everywhere — don't let individual
pages roll their own button or input styling:

`Button` (variants: primary / secondary / destructive) · `Input` ·
`Field` (label + error + help text wrapper — every form control lives
inside one, so the API's `details[]` array renders identically on every
form) · `Select` · `Dialog` (used for "Create trip" — that's a dialog, not
a route) · `Toast` · `EmptyState` (an empty screen is an invitation to
act, not an apology — always pair it with a call-to-action).

Design tokens (CSS variables): `--ink #14181f`, `--paper`, `--wash`,
`--rail`, `--transit #0e6e8c`, `--stamp #b33a2b` (errors/destructive),
`--ochre`. Fonts: a display face for headings, a body sans, a monospace
for tabular data (dates, money, durations — use `font-variant-numeric:
tabular-nums` so a changing total doesn't reflow the layout).

---

## 7. Decisions already made — don't relitigate these mid-build

- **JWT for the session, argon2 for the password hash — two different
  things.** The session token is a JWT. Argon2id only hashes and verifies
  the password itself. This has never been in question; if it comes up,
  point here.
- **A single 12-hour token, no refresh rotation, stored in
  `localStorage`.** A named, deliberate cut for a six-hour build, not an
  oversight. State it on the security slide in the demo.
- **No Docker.** One shared Render Postgres instead — see `docs/PLAN.md` §3.
- **Sync SQLAlchemy, not async.** No throughput difference at this scale;
  async sessions have greenlet/lifecycle failure modes that cost hours
  the first time someone hits them cold. Boring on purpose.
- **No file uploads.** Cover images are 8 preset paths under
  `backend/static/covers/`. Removes a vulnerability class and real
  build time for no loss the judges would notice.
- **Plain SQL migrations, not Alembic.** Exclusion constraints,
  constraint triggers, and views are needed from the first migration;
  Alembic can't autogenerate any of them, so it buys nothing here.

---

## 8. Definition of done

A feature is done when: the happy path works in the browser, the error
path shows a readable message in the right place (via `Field`'s `error`
prop, sourced from the API's `details[]`), the empty state isn't a blank
div, it doesn't break at 360px width, there are no console errors, and
it's merged to `main`. "It works on my branch" is not done.

---

## 9. Pre-decided failure switches

Decided in advance so nobody has to debate them mid-build:

| If | …isn't working by then | Do this |
|---|---|---|
| Sync point 2 (see `docs/PLAN.md`) | Any P0 endpoint still returns mock data | Cut the feature or reassign it — don't push it further |
| Sync point 3 | WebSocket | Set `refetchInterval: 5000` on the trip and budget queries. Same endpoints, same UI, stop calling the emit function. |
| Later | Copy-trip transaction | Ship the public page without the copy button — don't leave a dead one |
| Later | Render deploy | Demo locally, submit the repo, say so plainly |

Cut order if behind schedule: admin → calendar grid → profile page →
drag-to-reorder → realtime. Never cut into the 8 P0 routes in
`docs/PLAN.md` §1.

---

## 10. Living status log

Update this as you build. This table is the only thing that tells the
next session (or the next agent) what's actually done versus what's still
spec. Keep entries short — one line per module.

| Module | Status | Notes |
|---|---|---|
| `migrations/001_init.sql`, `002_views.sql` | Not started | |
| `backend/app/core/*` | Not started | |
| `backend/app/models/tables.py` | Not started | |
| `modules/auth` | Not started | |
| `modules/users` | Not started | |
| `modules/catalog` | Not started | |
| `modules/budget` | Not started | |
| `modules/trips` | Not started | |
| `modules/stops` | Not started | |
| `modules/activities` | Not started | |
| `modules/sharing` | Not started | |
| `realtime/manager.py` | Not started | |
| Frontend shell + primitives | Not started | |
| Frontend pages (per `docs/PLAN.md` §1) | Not started | |
| Tests (`test_invariants.py`) | Not started | |
| Seed data | Not started | |
| Deploy (Render + Vercel) | Not started | |

Append-only decision log below — one line per decision that changes
something in this file or diverges from `docs/PLAN.md`:

```
[not started] Spec handoff complete. Nothing built yet.
```
