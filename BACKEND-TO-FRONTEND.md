# Backend → Frontend Handoff

The backend is done and tested (59/59 endpoint checks, 7/7 DB-invariant tests,
all against the real shared database — not mocked). This document maps every
backend capability to the frontend screen it belongs to, per `FEATURES.md`.

**Base URL:** `/api/v1` (proxied by Vite dev server to `http://localhost:8000`).
**Auth:** every route except the two marked "no auth" needs
`Authorization: Bearer <token>`, where `<token>` comes from register/login.
**Wire format:** camelCase JSON in and out. Python/SQL are snake_case; you
never see that side.
**Money:** every field ending in `Cents` is an integer number of paise/cents.
Never send or expect a decimal. Format for display only
(`(cents / 100).toFixed(2)`), never do arithmetic on the formatted string.
**Dates:** `YYYY-MM-DD`. For a trip stop, `departureDate` is **exclusive** —
a stop `[12 Dec, 15 Dec)` means you leave the morning of the 15th, and a
back-to-back next stop can legally start on the 15th too.
**Errors:** every failure has this shape —
```json
{ "error": { "code": "STOP_OVERLAP", "message": "...", "details": [] }, "requestId": "..." }
```
`message` is written for end users — show it as-is (e.g. in a toast). For
`VALIDATION_FAILED`, `details` is `[{ "field": "email", "issue": "..." }]` —
map each entry onto the named form field's error text.

---

## Screen 1 — Login / Signup

| Action | Call |
|---|---|
| Sign up | `POST /auth/register` `{ email, password, fullName }` → `{ token, user }` |
| Log in | `POST /auth/login` `{ email, password }` → `{ token, user }` |

- Store `token` (localStorage is fine — see `CLAUDE.md`, this is a named
  simplification for the hackathon). Send it as `Authorization: Bearer
  <token>` on every subsequent call.
- **Password rules the form must enforce before submit** (the API rejects
  anything that doesn't match, so mirror this client-side or users get an
  unexplained failure): min 8 characters, at least one uppercase letter, at
  least one digit.
- Login failure is **always** `401 INVALID_CREDENTIALS` with a generic
  "Incorrect email or password" — the API deliberately never says which
  field was wrong. Don't try to distinguish "wrong password" from "no such
  user" in the UI.
- Duplicate signup email → `409 EMAIL_TAKEN`.
- **Not implemented:** "Forgot Password" has no backend route yet. If this
  screen needs the link/flow, it needs a backend addition first — don't
  build a form that calls a route that doesn't exist.

## Screen 2 — Dashboard / Home

`GET /dashboard` → one call, one shape:
```jsonc
{
  "user": { "id", "fullName", "email" },
  "recentTrips": [{ "id", "name", "startDate", "endDate", "coverImagePath",
                     "status", "stopCount", "totalCents" }],
  "recommendedCities": [{ "id", "name", "countryName", "popularityScore",
                           "costIndex", "imagePath" }],
  "budgetHighlight": { "tripId", "tripName", "totalCents", "budgetCapCents" } | null
}
```
`status` is one of `UPCOMING` / `ONGOING` / `COMPLETED`, computed server-side
from today's date vs. the trip's dates — don't recompute it client-side.

## Screen 3 — Create Trip

`POST /trips`
```jsonc
// request
{ "name", "description"?, "startDate", "endDate", "coverImagePath"?, "currencyCode"?, "budgetCapCents"? }
```
- `name`: 1–120 chars, required.
- `endDate` must not be before `startDate`; span capped at 365 days. Both are
  validated server-side with a clear message — surface `error.message`
  directly if the API rejects it (400).
- `coverImagePath`: **no file upload exists**. This is a dropdown/picker
  over a fixed set of preset image paths under `/static/covers/` — not a
  file input. Confirm the preset list with backend before wiring this field;
  it's optional, so the form works fine without it in the meantime.
- Response is the created trip (`TripOut` shape — see Screen 6 for the full
  field list). A brand-new trip always has 0 stops and 0 cost.

## Screen 4 — My Trips (list)

`GET /trips?q=&status=&sort=&limit=&offset=`
```jsonc
{ "items": [ /* TripSummaryOut, see below */ ], "total": number }
```
Each item includes `status`, `stopCount`, `totalCents` — everything the trip
card needs in one call, no follow-up requests per card.

- `status` filter accepts `UPCOMING` / `ONGOING` / `COMPLETED`.
- `sort` — check with backend for accepted values (`startDate` is confirmed
  working; ask before relying on others).
- Default page size 20, server caps at 100.
- Edit → `PATCH /trips/{id}`. Delete → `DELETE /trips/{id}` (soft delete —
  the trip disappears from lists immediately, `204` on success).

## Screen 5 — Itinerary Builder

**Add a stop:** `POST /trips/{tripId}/stops`
```jsonc
{ "cityId", "arrivalDate", "departureDate", "sortOrder"?, "stayCents"?, "transportInCents"?, "notes"? }
```
- Omit `sortOrder` (or send nothing) to append the stop to the end of the
  trip — the backend picks the next position automatically. Only send it
  explicitly if you're inserting at a specific spot.
- **Two error codes are central to this screen, both from real DB
  constraints — build the UI around them, don't just show a generic toast:**
  - `409 STOP_OVERLAP` — this stop's dates collide with another stop already
    on the trip. Highlight the date range, don't just show a banner.
  - `400 STOP_OUTSIDE_TRIP` — this stop's dates fall outside the trip's own
    start/end. Same treatment.
- Remember the exclusive-end-date rule: a stop ending the 15th and the next
  one starting the 15th is valid and expected, not a bug.

**Reorder stops:** `PATCH /trips/{tripId}/stops/order`
```jsonc
{ "stopIds": ["uuid1", "uuid2", "uuid3"] }  // full list, in the new order
```
Send the **entire** ordered array every time, not a diff. Returns `204` (no
body) on success — don't wait for JSON back, just refetch or optimistically
reorder.

**Add an activity to a stop:** `POST /stops/{stopId}/activities`
```jsonc
{ "activityId"?, "customName"?, "scheduledDate", "startTime"?, "durationMinutes"?, "costCents"?, "sortOrder"?, "notes"? }
```
- Either `activityId` (pick from catalogue) or `customName` (freehand) is
  required — the form should let the user do one or the other, not neither.
- `400 ACTIVITY_OUTSIDE_STOP` if `scheduledDate` falls outside that stop's
  `arrivalDate`/`departureDate` range — same "flag the field" treatment as
  above.
- Edit: `PATCH /scheduled-activities/{id}`. Delete: `DELETE
  /scheduled-activities/{id}`.
- Reorder within a day: `PATCH /stops/{stopId}/activities/order` `{
  scheduledDate, activityIds }`.

**Delete a stop:** `DELETE /stops/{id}` — cascades to its activities, `204`.

## Screen 6 — Itinerary View

`GET /trips/{id}` → the full trip, nested, in one call:
```jsonc
{
  "id", "name", "description", "startDate", "endDate", "coverImagePath",
  "visibility", "shareSlug", "currencyCode", "budgetCapCents", "durationDays",
  "copiedFromTripId", "createdAt", "updatedAt",
  "stops": [{
    "id", "cityId", "cityName", "arrivalDate", "departureDate", "sortOrder",
    "stayCents", "transportInCents", "notes",
    "activities": [{ "id", "activityId", "customName", "scheduledDate",
                      "startTime", "durationMinutes", "costCents",
                      "sortOrder", "notes" }]
  }]
}
```
Stops arrive pre-sorted by `sortOrder`; activities pre-sorted by
`scheduledDate` then `sortOrder`. No client-side sorting needed for the
default view. This is a private-trip read — a non-owner gets `404` (never
`403` — the API deliberately doesn't reveal that a private trip exists at
all to someone who isn't its owner).

## Screen 7 — City Search

`GET /cities?q=&countryId=&region=&sort=cost|popularity&limit=&offset=`
```jsonc
{ "items": [{ "id", "countryId", "name", "costIndex", "popularityScore",
               "imagePath", "countryName", "countryIso2", "region" }], "total": number }
```
`GET /cities/{id}/activities` — activities for one city, for a quick preview
before "Add to Trip." No auth required on catalogue reads.

## Screen 8 — Activity Search

`GET /activities?q=&cityId=&categoryId=&maxCostCents=&maxDurationMinutes=`
```jsonc
{ "items": [{ "id", "cityId", "categoryId", "name", "description",
               "baseCostCents", "durationMinutes", "imagePath",
               "cityName", "categoryName" }], "total": number }
```
`GET /activity-categories` → `[{ id, name, slug }]` for the filter chips.

## Screen 9 — Trip Budget & Cost Breakdown

`GET /trips/{id}/budget`
```jsonc
{
  "summary": {
    "tripId", "durationDays", "budgetCapCents",
    "totalCents", "transportCents", "stayCents", "activityCents",
    "mealsCents", "otherCents", "avgPerDayCents"
  },
  "dailyCosts": [{ "tripId", "onDate", "amountCents", "overCap": boolean | null }]
}
```
**Totals are nested under `summary`, not top-level** — a common mistake,
double check your destructuring. `dailyCosts` already carries the per-day
over-budget flag pre-computed — don't recompute it from `budgetCapCents`
client-side, just render the boolean. Everything here is view-computed on
every read, so it's always current; no caching/staleness to worry about.

**Add an expense** (transport/stay/meals/other not tied to a specific
activity): `POST /trips/{id}/expenses` `{ tripStopId?, category, label,
amountCents, incurredOn? }`. `category` is one of `TRANSPORT` / `STAY` /
`ACTIVITY` / `MEALS` / `OTHER`.

## Screen 10 — Trip Calendar / Timeline

`GET /trips/{id}/calendar` → one entry per day in the trip:
```jsonc
[{ "date", "activities": [{ "id", "activityId", "customName", "startTime",
                              "durationMinutes", "costCents", "sortOrder",
                              "notes", "stopId", "cityName" }] }]
```
Day-indexed and pre-grouped — build the month/week grid by iterating this
array directly.

- **Drag-to-reorder** in this view should call the same `PATCH
  /stops/{stopId}/activities/order` endpoint used in the Itinerary Builder
  (Screen 5) — there's no separate calendar-specific reorder route.

## Screen 11 — Shared / Public Itinerary View

**Publish:** `PATCH /trips/{id}/visibility` `{ visibility: "PUBLIC" }` →
returns the trip with a `shareSlug` now set. Calling it again reuses the
existing slug rather than generating a new one — safe to call repeatedly.

**Public page** (no auth, no token needed — this is the one screen that
works for a logged-out visitor):
`GET /public/trips/{slug}`
```jsonc
{ "id", "name", "description", "startDate", "endDate", "coverImagePath",
  "currencyCode", "durationDays", "shareSlug",
  "stops": [{ "id", "cityId", "cityName", "arrivalDate", "departureDate",
               "sortOrder", "activities": [...] }] }
```
`404` if the slug doesn't exist or the trip was unpublished — same
no-leak-on-404 pattern as private trips.

**Copy Trip** (requires login): `POST /public/trips/{slug}/copy` → creates a
new trip under the caller's account with `copiedFromTripId` set to the
original. Route the user to their new trip (`My Trips` or the trip detail
view) after this succeeds.

## Screen 12 — User Profile / Settings

`GET /users/me` / `PATCH /users/me` `{ fullName?, homeCityId?, avatarPath? }`

**Saved destinations:**
- `GET /users/me/saved-destinations` → `[{ cityId, savedAt }]`
- `POST /users/me/saved-destinations` `{ cityId }`
- `DELETE /users/me/saved-destinations/{cityId}` → `204`

**Two things this screen needs that don't exist in the backend yet — flag
these back rather than building dead UI:**
- **Language preference.** The DB column exists (`preferredLanguage`) but
  it's not readable or writable through the API at all yet. Don't build the
  language dropdown against a live call until this is added — or build it
  disabled/stubbed and note it as pending.
- **Delete account.** No endpoint exists. Same treatment — needs a backend
  addition first.

## Screen 13 — Admin / Analytics (optional)

`GET /admin/stats`
```jsonc
{
  "totalUsers", "totalTrips", "totalStops", "totalActivities",
  "tripsCreated30D": [{ "date", "count" }],  // note the capital D — not a typo
  "topCities": [{ "name", "count" }],
  "topActivities": [{ "name", "count" }],
  "engagement": { "totalUsers", "activeUsers", "tripsPerActiveUser" }
}
```
`GET /admin/users?...` → paginated user list. `PATCH /admin/users/{id}` `{
role?, deletedAt? }` — set `role` to promote/demote, set `deletedAt` to
null to reactivate a soft-deleted account.

Every route under `/admin` requires the caller's account to have
`role: "ADMIN"` — a non-admin gets `401 UNAUTHORIZED`. There's no self-serve way to
become an admin through the API; that has to be set directly in the
database for whoever demos this screen.

---

## Cross-cutting notes for every screen

- **Ownership is invisible by design.** Any private resource (a trip you
  don't own, its stops, its activities) returns `404`, never `403` — the API
  never confirms something exists that you can't see. Don't build UI that
  distinguishes "doesn't exist" from "not yours."
- **Loading/empty/error states** — every list endpoint can legitimately
  return `{ "items": [], "total": 0 }` (a new user's dashboard, an unseeded
  filter combo). Design the empty state as an invitation to act (e.g. "Plan
  your first trip"), not a blank div.
- **Realtime is not available yet.** A WebSocket hub exists in the backend
  code but isn't actually wired up or reachable. Don't build a
  `WS /ws/trips/{id}` client against it — build for plain request/refetch
  for now. If this becomes available later, it will be announced here.
- **No file uploads anywhere in this API.** Cover images and avatars are
  path strings, not upload endpoints.
