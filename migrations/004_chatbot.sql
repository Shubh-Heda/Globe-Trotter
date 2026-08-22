-- GlobeTrotter — 004_chatbot.sql
-- Backs the AI suggestion chatbot (CHATBOT.md): draft/confirmed itinerary items,
-- per-trip preferences for grounding, and a log of suggestion actions.
-- Additive only — never edit 001_init.sql/002_views.sql/003_profile_prefs.sql once applied.

BEGIN;

CREATE TYPE stop_activity_status AS ENUM ('DRAFT', 'CONFIRMED');
CREATE TYPE activity_source      AS ENUM ('MANUAL', 'AI_SUGGESTED');

-- Existing rows (and every future manual write through the activities module)
-- default to CONFIRMED/MANUAL, so nothing already in the DB changes behavior.
ALTER TABLE stop_activities
  ADD COLUMN status stop_activity_status NOT NULL DEFAULT 'CONFIRMED',
  ADD COLUMN source activity_source      NOT NULL DEFAULT 'MANUAL';

CREATE TABLE trip_preferences (
  trip_id       uuid PRIMARY KEY REFERENCES trips(id) ON DELETE CASCADE,
  budget_level  text CHECK (budget_level IS NULL OR budget_level IN ('BUDGET','MODERATE','LUXURY')),
  interest_tags text[] NOT NULL DEFAULT '{}',
  pace          text CHECK (pace IS NULL OR pace IN ('RELAXED','BALANCED','PACKED')),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ai_suggestion_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id      uuid   NOT NULL REFERENCES trips(id)      ON DELETE CASCADE,
  trip_stop_id uuid   NOT NULL REFERENCES trip_stops(id) ON DELETE CASCADE,
  activity_id  bigint          REFERENCES activities(id) ON DELETE SET NULL,
  action       text   NOT NULL CHECK (action IN ('ACCEPTED','SKIPPED','IMPROVED')),
  steer_text   text CHECK (steer_text IS NULL OR length(steer_text) <= 280),
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ai_suggestion_log_trip_idx ON ai_suggestion_log (trip_id, created_at DESC);

COMMIT;
