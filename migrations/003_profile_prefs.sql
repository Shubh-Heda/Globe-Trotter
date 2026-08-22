-- GlobeTrotter — 003_profile_prefs.sql
-- Adds the language preference field for the Profile/Settings screen.
-- Additive only — never edit 001_init.sql once applied.

BEGIN;

ALTER TABLE users
  ADD COLUMN preferred_language text NOT NULL DEFAULT 'en';

COMMIT;
