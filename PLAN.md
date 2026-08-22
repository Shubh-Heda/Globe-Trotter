# GlobeTrotter — Scope & Execution Plan

**Build window:** 6 hours. Feature freeze at **H+4:30**.

## 1. Scope

**The Itinerary Builder is a workspace, not a screen.** City search and
activity search should exist as slide-over panels inside it *and* as
reusable standalone components. That collapses three of the original
brief's 13 screens into one build without losing any functionality.

### P0 — 8 routes, covering 10 of the brief's 13 screens

| # | Route | Covers (brief's screen #) | Must do |
|---|---|---|---|
| 1 | `/login`, `/signup` | 1 | Register, log in, inline field errors, session survives refresh |
| 2 | `/` Dashboard | 2 | Next trip with countdown, recent trips, top cities |
| 3 | `/trips` My Trips | 4 | Cards grouped by status, search + sort |
| 4 | Create Trip **dialog** | 3 | Not a route — a Dialog on top of My Trips |
| 5 | `/trips/:id/build` | 5, 7, 8 | Stop rail, city panel, activity panel |
| 6 | `/trips/:id` | 6 | Day-wise rail, running per-day total |
| 7 | `/trips/:id/budget` | 9 | Donut, per-day bars, over-cap flags |
| 8 | `/t/:slug` Public | 11 | No auth, read-only rail, "Copy this trip" |

### P1 — only once every P0 route is real, not stubbed

Profile/settings screen, calendar month grid (data comes from
`/trips/{id}/calendar`), admin/analytics dashboard.

### P2 — cut unless there is genuinely idle time

Drag-to-reorder in the UI (ships as up/down buttons hitting the same
reorder endpoint), social share buttons on the public page.

### Explicitly out of scope — say so on the slide

No email delivery (no "Forgot password" flow — "change password while
signed in" instead). No file uploads (8 preset cover images). No live
pricing or currency conversion. No map tiles.

## 2. Ownership

Assign these once at H+0:00 and don't reshuffle mid-build:

| Owner | Scope |
|---|---|
| Schema owner | `migrations/`, seed script, budget view queries → then the itinerary builder + budget screen frontend |
| Backend-core owner | FastAPI app factory, error handling, trips/stops/activities/catalog modules, WebSocket hub |
| Auth/security owner | Auth module, validation, ownership guards, rate limiting, sharing + copy-trip, invariant tests |
| Frontend-shell owner | Vite scaffold, tokens, primitives, auth screens, dashboard, trip list, search panels |

## 3. Environments — no Docker

One **Render Postgres** instance, created at H+0:00, shared by every
developer and by the deployed API — nobody installs a local database.
`DATABASE_URL` goes in everyone's `backend/.env`. Two things to build
into `core/config.py` from the start, per `CLAUDE.md` §5: Render's URL
starts `postgres://` and needs rewriting to `postgresql+psycopg://`;
Render requires TLS in production (`sslmode=require`).

**Migration discipline:** only the schema owner runs `scripts/migrate.py`
against the shared database. Anyone else needing a schema change asks
them to add a new numbered `.sql` file — never edit an already-applied
one. The seed script must be idempotent so re-running it during the build
is always safe.

**Deploy at H+1:00**, on a skeleton, before there's anything to lose —
Render for the API (a `render.yaml` blueprint), Vercel for the frontend
(needs an SPA rewrite so client-side routes don't 404 on refresh). Two
hosting facts worth planning around: Render's free tier sleeps after 15
minutes idle (hit the URL ten minutes before presenting); a deployed
HTTPS frontend cannot call an `http://localhost` backend — browsers block
the mixed content. **Demo entirely from localhost** (both sides local, no
cold start, no wifi dependency) and treat the deployed instance as the
submission artifact and backup, not the live demo.

## 4. Algorithms — the parts nobody specifies until they're stuck

**Stop reorder.** `PATCH /trips/{id}/stops/order` takes the full ordered
stop-id array. One transaction, one `UPDATE ... SET sort_order = :i`
per id, using its index in the incoming array. `stop_order_uq` is
`DEFERRABLE INITIALLY DEFERRED` specifically so this never needs a
temporary negative-number shuffle. Verify the incoming id array is
exactly the trip's current stop-id set before writing anything.

**Stop delete.** Leave gaps in `sort_order`; ordering is `ORDER BY
sort_order`, gaps are harmless. Do not renumber the remaining stops.

**Copy trip.** One transaction:
1. `offset = max(0, today - source.start_date)` — rebase a past trip to
   start today; keep a future trip's own dates.
2. Insert the new trip: `copied_from_trip_id = source.id`,
   `visibility = 'PRIVATE'`, `share_slug = NULL`, dates shifted by `offset`.
3. Insert all stops, dates shifted by `offset`, `sort_order` preserved.
4. Insert all `stop_activities`, `scheduled_date` shifted by `offset`.
5. Insert all `trip_expenses`, `incurred_on` shifted by `offset` where present.

Because both constraint triggers are `DEFERRABLE INITIALLY DEFERRED`, all
five steps can insert in any order and the checks only run at commit —
insert parent and children in whatever order is convenient, then commit once.

**Share slug.** `secrets.token_urlsafe(6)` on first transition to
`PUBLIC`; retry once on a unique-constraint collision, then store it
permanently. Unpublishing sets `visibility = 'PRIVATE'` but keeps the
slug, so republishing reuses the same URL.

**Budget.** `SELECT * FROM v_trip_budget WHERE trip_id = :id` plus
`SELECT * FROM v_trip_daily_cost WHERE trip_id = :id`. Zero arithmetic in
application code. The client fills any missing days with zero for the bar chart.

## 5. Testing

Four `pytest` tests, against a disposable test database:

1. Overlapping stops are refused — insert Kochi `[12,15)` then Alleppey
   `[15,18)` (both succeed), then Munnar `[14,16)` (expect `23P01`).
2. A stop outside its trip's date range is refused by the constraint trigger.
3. A non-owner requesting a private trip gets 404, and the response body
   doesn't confirm the trip exists.
4. `v_trip_budget.total_cents` equals the exact sum of seeded stay,
   transport, activity, and expense lines for one trip.

Plus: attempt each schema violation directly in `psql`, bypassing the API
entirely, as a sanity check that the invariant lives in the database and
not only in application-layer validation.

## 6. Timeline

| Window | Schema owner | Backend-core owner | Auth/security owner | Frontend-shell owner |
|---|---|---|---|---|
| 0:00–0:20 | *All:* create the shared Render Postgres instance, whiteboard the ER model until everyone can draw it from memory, freeze `docs/API.md`, agree the auth-dependency shape | | | |
| 0:20–1:00 | Apply migrations, catalogue seed | **Push contract-first stub routers with mock JSON by 0:40** — this unblocks everyone else | Argon2 + JWT, register/login working end to end | Vite scaffold, tokens, primitives, auth screens |
| **1:00** | **SYNC 1** — deploy the skeleton to Render + Vercel. Regenerate frontend TS types. Everyone confirms they can hit the deployed API. | | | |
| 1:00–2:00 | Volume seed (`--demo`), budget view queries | Trips module made real, stops module, reorder transaction | Ownership guard used everywhere, auth screens wired to real endpoints | Dashboard, trip list, create-trip dialog |
| 2:00–3:00 | `/trips/{id}/budget` real, then switch to frontend work | Activities module, catalog search (trigram) | Publish/visibility, public GET, copy-trip transaction | City + activity search panels |
| **3:00** | **SYNC 2** — regenerate types. Every P0 endpoint now returns real data, not mocks. Anything still stubbed gets cut or reassigned now. | | | |
| 3:00–3:45 | Builder rail: add/reorder/delete stop, add activity to a day | WebSocket hub, emit after commit | 4 invariant tests, security sweep | Itinerary view, public page |
| **3:45** | **SYNC 3 — realtime go/no-go.** Socket not stable? Flip to `refetchInterval: 5000` on the trip and budget queries. One line, move on. | | | |
| 3:45–4:30 | Budget screen: donut, per-day bars, over-cap flags | Wire WS events → `invalidateQueries` | `/admin/stats` only if everything above is green | Empty states, error states, 360px pass |
| **4:30** | **FEATURE FREEZE.** Nothing new starts after this. | | | |
| 4:30–5:15 | *All:* bug bash on the demo path only. Seed the demo account. Export an ER diagram image. | | | |
| 5:15–6:00 | *All:* rehearse twice on the deployed instance and the demo machine. Build 5-6 slides. Tidy commit history. | | | |

## 7. Demo script — six minutes, bottom-up, everyone presents their own layer

1. **Schema owner (90s)** — ER diagram on screen before the app. The five
   domain sentences from `docs/DATABASE.md` §1. Point at the exclusion
   constraint and say what it prevents.
2. **Backend-core owner (90s)** — Build "Kerala Backwaters" live. Kochi
   12→15, Alleppey 15→18 both accepted. Munnar 14→16 refused, naming the
   conflict on screen. Line: *this is a database constraint, so it holds
   even if two requests race.*
3. **Auth/security owner (60s)** — the same invalid payload rejected
   three ways: blocked in the form, `400` from Pydantic via `curl`,
   refused by Postgres with validation disabled entirely.
4. **Schema owner (60s)** — two browser tabs open on the same trip's
   budget screen. Add a cost in one; the donut and bars update in the
   other. Line: *the total is a SQL view, so it cannot drift.*
5. **Frontend-shell owner (60s)** — type "Barcelna", get Barcelona
   (trigram search). Publish the trip, open the public link in a private
   window, copy it.

Close on **zero third-party runtime services** — no maps, no geocoder, no
currency feed, no mail, no CDN, self-hosted fonts. It's a scored
criterion and no judge notices it unless someone says it out loud.

## 8. Pre-decided failure switches

See `CLAUDE.md` §9 — kept there since it's the file every session opens
first. Cut order if behind schedule: admin → calendar grid → profile page
→ drag-to-reorder → realtime. Never cut into the 8 P0 routes in §1.
