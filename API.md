# GlobeTrotter — API Contract

Base path: `/api/v1`. Auth: `Authorization: Bearer <jwt>` on every route
except the two marked public below. Once the backend is running, `/docs`
gives interactive Swagger UI generated from the Pydantic schemas — treat
that as the live reference once it exists; this file is the contract to
build it *from*.

Build every route below as a contract-first stub first (hardcoded JSON
matching the response shape, no database call), then replace the stub
with real logic module by module — see `CLAUDE.md` §2 "Build order".

## 1. Endpoints

### Auth & users
| Method | Path | Notes |
|---|---|---|
| POST | `/auth/register` | `{email, password, fullName}` → `{token, user}` |
| POST | `/auth/login` | `{email, password}` → `{token, user}`. Generic failure message — never reveal which field was wrong. |
| GET | `/users/me` | |
| PATCH | `/users/me` | `{fullName?, homeCityId?, avatarPath?}` |
| GET/POST | `/users/me/saved-destinations` | |
| DELETE | `/users/me/saved-destinations/{cityId}` | |

### Trips
| Method | Path | Notes |
|---|---|---|
| GET | `/trips` | `?q=&status=UPCOMING\|ONGOING\|COMPLETED&sort=&limit=&offset=`. Reads `v_trip_summary`, scoped to the caller. |
| POST | `/trips` | `{name, description?, startDate, endDate, coverImagePath?, currencyCode?, budgetCapCents?}` |
| GET | `/trips/{id}` | Trip + stops + activities assembled in **one** query. |
| PATCH/DELETE | `/trips/{id}` | Delete is soft (`deleted_at`), never a hard delete. |
| PATCH | `/trips/{id}/visibility` | `{visibility}` — issues `share_slug` on first publish (see §4 algorithm), reuses it after. |

### Stops
| Method | Path | Notes |
|---|---|---|
| GET/POST | `/trips/{id}/stops` | POST can return `409 STOP_OVERLAP` or `400 STOP_OUTSIDE_TRIP` |
| PATCH/DELETE | `/stops/{id}` | Delete cascades to its activities; leaves gaps in `sort_order` (see §4). |
| PATCH | `/trips/{id}/stops/order` | `{stopIds: [...]}` — full ordered array, one transaction (see §4). |

### Scheduled activities & expenses
| Method | Path | Notes |
|---|---|---|
| GET/POST | `/stops/{id}/activities` | POST can return `400 ACTIVITY_OUTSIDE_STOP` |
| PATCH/DELETE | `/scheduled-activities/{id}` | |
| GET/POST | `/trips/{id}/expenses` | |
| DELETE | `/expenses/{id}` | |

### Catalogue (search — read-only, no auth required if you choose, but keep it consistent with the rest)
| Method | Path | Notes |
|---|---|---|
| GET | `/cities` | `?q=&countryId=&region=&sort=cost\|popularity&limit=&offset=` |
| GET | `/cities/{id}/activities` | |
| GET | `/activities` | `?q=&cityId=&categoryId=&maxCostCents=&maxDurationMinutes=` |
| GET | `/activity-categories` | |

### Budget
| Method | Path | Notes |
|---|---|---|
| GET | `/trips/{id}/budget` | One query against `v_trip_budget`, one against `v_trip_daily_cost`. |
| GET | `/trips/{id}/calendar` | P1 — day-indexed activity load for a month grid. |

### Sharing (public)
| Method | Path | Notes |
|---|---|---|
| GET | `/public/trips/{slug}` | **No auth required.** 404 if not published. |
| POST | `/public/trips/{slug}/copy` | Auth required. Transactional deep copy, dates rebased — see §4 algorithm. |

### Admin (P1 — only if every P0 route is real and there's time left)
| Method | Path | Notes |
|---|---|---|
| GET | `/admin/stats` | Requires an admin-role dependency. |

### Realtime
`WS /ws/trips/{trip_id}?token=<jwt>` — server pushes
`{"type": "budget.changed" | "stops.changed" | "activities.changed", "tripId": "..."}`
after any commit that changes that trip's data. Client refetches on
receipt; the payload carries no data itself.

## 2. Wire conventions

- **Casing:** `camelCase` in JSON, `snake_case` in Python/SQL — handled
  once by a Pydantic base class with `alias_generator=to_camel`. Don't
  hand-roll aliasing per model.
- **Money:** every amount field is named `...Cents` and is an integer.
  The client formats for display and never computes on it.
- **Dates:** ISO `YYYY-MM-DD`. `departureDate` is exclusive (see
  `docs/DATABASE.md` §3).
- **Pagination:** `?limit=&offset=`, default 20, server-enforced cap 100.
- **Errors:** always this shape —
  ```json
  {
    "error": { "code": "STOP_OVERLAP", "message": "...", "details": [] },
    "requestId": "..."
  }
  ```
  `message` is shown to the user as-is — write it in the product's voice,
  not a stack trace. `details` is populated for `VALIDATION_FAILED`, as
  `[{field, issue}]` pairs the frontend maps onto individual form fields.

## 3. Error codes

| Code | Status | Source |
|---|---|---|
| `VALIDATION_FAILED` | 400 | Pydantic validation, converted by a `RequestValidationError` handler |
| `EMAIL_TAKEN` | 409 | Postgres `23505` on the partial unique index |
| `INVALID_CREDENTIALS` | 401 | Auth service — deliberately generic, never says which half was wrong |
| `UNAUTHORIZED` | 401 | Missing/invalid JWT |
| `NOT_FOUND` | 404 | Also returned for a private trip requested by a non-owner — never 403 |
| `STOP_OVERLAP` | 409 | Postgres `23P01`, the `stop_no_overlap` exclusion constraint |
| `STOP_OUTSIDE_TRIP` | 400 | The `stop_outside_trip_range` constraint trigger |
| `ACTIVITY_OUTSIDE_STOP` | 400 | The `activity_outside_stop_range` constraint trigger |
| `RATE_LIMITED` | 429 | Login/register rate limiting |

The bottom three come from the database, not from application code —
worth saying out loud in the demo while the error is on screen, since it
proves the invariant can't be bypassed by a bug in the API layer.
