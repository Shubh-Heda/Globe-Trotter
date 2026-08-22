-- GlobeTrotter — 005_chat.sql
-- Backs the conversational trip-planning assistant: a persisted chat
-- transcript per session, where an assistant message can carry a proposed
-- write (create trip / add stop / add activity) that the user must
-- explicitly accept before anything is written to trips/trip_stops/
-- stop_activities. Supersedes the per-stop suggestion-card flow from
-- 004_chatbot.sql (whose columns/tables stay — additive, never dropped).
-- Additive only — never edit 001_init.sql/002_views.sql/003_profile_prefs.sql/
-- 004_chatbot.sql once applied.

BEGIN;

CREATE TYPE chat_role          AS ENUM ('USER', 'ASSISTANT', 'TOOL');
CREATE TYPE chat_action_type   AS ENUM ('CREATE_TRIP', 'ADD_STOP', 'ADD_ACTIVITY');
CREATE TYPE chat_action_status AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

CREATE TABLE chat_sessions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trip_id    uuid REFERENCES trips(id) ON DELETE SET NULL,
  title      text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX chat_sessions_user_idx ON chat_sessions (user_id, updated_at DESC);

CREATE TABLE chat_messages (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id     uuid NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role           chat_role NOT NULL,
  content        text,
  action_type    chat_action_type,
  action_payload jsonb,
  action_status  chat_action_status,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chat_action_fields_together CHECK (
    (action_type IS NULL AND action_status IS NULL) OR
    (action_type IS NOT NULL AND action_status IS NOT NULL)
  )
);
CREATE INDEX chat_messages_session_idx ON chat_messages (session_id, created_at);

COMMIT;
