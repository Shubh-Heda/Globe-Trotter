-- GlobeTrotter — 001_init.sql
-- Requires PostgreSQL 14+ (tested on 16). Runs unmodified on Render Postgres.

BEGIN;

CREATE EXTENSION IF NOT EXISTS citext;      -- case-insensitive email
CREATE EXTENSION IF NOT EXISTS pg_trgm;     -- fuzzy search on city/activity names
CREATE EXTENSION IF NOT EXISTS btree_gist;  -- lets uuid participate in an EXCLUDE constraint
CREATE EXTENSION IF NOT EXISTS pgcrypto;    -- gen_random_uuid()

CREATE TYPE user_role        AS ENUM ('USER','ADMIN');
CREATE TYPE trip_visibility  AS ENUM ('PRIVATE','PUBLIC');
CREATE TYPE expense_category AS ENUM ('TRANSPORT','STAY','ACTIVITY','MEALS','OTHER');

-- ============================================================
-- Reference catalogue. Seeded once, read-only at runtime.
-- bigint identity keys: internal, never exposed in a URL.
-- ============================================================

CREATE TABLE countries (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name          text    NOT NULL UNIQUE,
  iso2          char(2) NOT NULL UNIQUE,
  region        text    NOT NULL,
  currency_code char(3) NOT NULL
);

CREATE TABLE cities (
  id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  country_id       bigint NOT NULL REFERENCES countries(id) ON DELETE RESTRICT,
  name             text     NOT NULL,
  cost_index       smallint NOT NULL CHECK (cost_index BETWEEN 1 AND 100),
  popularity_score integer  NOT NULL DEFAULT 0 CHECK (popularity_score >= 0),
  image_path       text,
  UNIQUE (country_id, name)
);
CREATE INDEX cities_name_trgm_idx  ON cities USING gin (name gin_trgm_ops);
CREATE INDEX cities_popularity_idx ON cities (popularity_score DESC);
CREATE INDEX cities_country_idx    ON cities (country_id);

CREATE TABLE activity_categories (
  id   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE
);

CREATE TABLE activities (
  id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  city_id          bigint NOT NULL REFERENCES cities(id)              ON DELETE CASCADE,
  category_id      bigint NOT NULL REFERENCES activity_categories(id) ON DELETE RESTRICT,
  name             text   NOT NULL,
  description      text,
  base_cost_cents  bigint  NOT NULL DEFAULT 0 CHECK (base_cost_cents >= 0),
  duration_minutes integer CHECK (duration_minutes BETWEEN 0 AND 1440),
  image_path       text,
  UNIQUE (city_id, name)
);
CREATE INDEX activities_name_trgm_idx ON activities USING gin (name gin_trgm_ops);
CREATE INDEX activities_city_cat_idx  ON activities (city_id, category_id);
CREATE INDEX activities_cost_idx      ON activities (base_cost_cents);

-- ============================================================
-- Accounts
-- ============================================================

CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         citext NOT NULL,
  password_hash text   NOT NULL,
  full_name     text   NOT NULL CHECK (length(trim(full_name)) BETWEEN 1 AND 80),
  home_city_id  bigint REFERENCES cities(id) ON DELETE SET NULL,
  avatar_path   text,
  role          user_role   NOT NULL DEFAULT 'USER',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz
);
-- partial unique: a soft-deleted account releases its email for reuse
CREATE UNIQUE INDEX users_email_active_uq ON users (email) WHERE deleted_at IS NULL;

-- ============================================================
-- Trips
--
-- Date semantics (state this on the ER slide, it is the one thing
-- a judge can get confused by):
--   arrival_date   = first day you are in the city   (inclusive)
--   departure_date = the day you travel out          (exclusive)
--   nights in a stop = departure_date - arrival_date
-- So Kochi [12 Dec, 15 Dec) and Alleppey [15 Dec, 18 Dec) are legal
-- back-to-back stops, and Munnar [14 Dec, 16 Dec) is refused.
-- ============================================================

CREATE TABLE trips (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name                text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 120),
  description         text CHECK (description IS NULL OR length(description) <= 2000),
  start_date          date NOT NULL,
  end_date            date NOT NULL,
  cover_image_path    text,
  visibility          trip_visibility NOT NULL DEFAULT 'PRIVATE',
  share_slug          text UNIQUE,
  currency_code       char(3) NOT NULL DEFAULT 'INR',
  budget_cap_cents    bigint CHECK (budget_cap_cents IS NULL OR budget_cap_cents > 0),
  duration_days       integer GENERATED ALWAYS AS (end_date - start_date + 1) STORED,
  copied_from_trip_id uuid REFERENCES trips(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz,
  CONSTRAINT trip_dates_ordered CHECK (end_date >= start_date),
  CONSTRAINT trip_span_sane     CHECK (end_date - start_date <= 365),
  CONSTRAINT public_needs_slug  CHECK (visibility = 'PRIVATE' OR share_slug IS NOT NULL)
);
CREATE INDEX trips_user_recent_idx ON trips (user_id, start_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX trips_public_idx      ON trips (share_slug)
  WHERE visibility = 'PUBLIC' AND deleted_at IS NULL;

CREATE TABLE trip_stops (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id            uuid   NOT NULL REFERENCES trips(id)  ON DELETE CASCADE,
  city_id            bigint NOT NULL REFERENCES cities(id) ON DELETE RESTRICT,
  arrival_date       date    NOT NULL,
  departure_date     date    NOT NULL,
  sort_order         integer NOT NULL CHECK (sort_order >= 0),
  stay_cents         bigint  NOT NULL DEFAULT 0 CHECK (stay_cents >= 0),
  transport_in_cents bigint  NOT NULL DEFAULT 0 CHECK (transport_in_cents >= 0),
  notes              text CHECK (notes IS NULL OR length(notes) <= 1000),
  CONSTRAINT stop_at_least_one_night CHECK (departure_date > arrival_date),
  CONSTRAINT stop_order_uq UNIQUE (trip_id, sort_order) DEFERRABLE INITIALLY DEFERRED,
  -- THE headline constraint: two stops of one trip can never occupy the same day.
  -- Half-open '[)' so departure day == next arrival day is allowed.
  CONSTRAINT stop_no_overlap EXCLUDE USING gist (
    trip_id WITH =,
    daterange(arrival_date, departure_date, '[)') WITH &&
  )
);
CREATE INDEX trip_stops_trip_order_idx ON trip_stops (trip_id, sort_order);
CREATE INDEX trip_stops_city_idx       ON trip_stops (city_id);

CREATE TABLE stop_activities (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_stop_id     uuid   NOT NULL REFERENCES trip_stops(id) ON DELETE CASCADE,
  activity_id      bigint REFERENCES activities(id) ON DELETE SET NULL,
  custom_name      text CHECK (custom_name IS NULL OR length(trim(custom_name)) BETWEEN 1 AND 120),
  scheduled_date   date NOT NULL,
  start_time       time,
  duration_minutes integer CHECK (duration_minutes BETWEEN 0 AND 1440),
  cost_cents       bigint  NOT NULL DEFAULT 0 CHECK (cost_cents >= 0),
  sort_order       integer NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  notes            text CHECK (notes IS NULL OR length(notes) <= 500),
  -- it either points at the catalogue or carries its own name; never neither
  CONSTRAINT activity_is_named CHECK (activity_id IS NOT NULL OR custom_name IS NOT NULL)
);
CREATE INDEX stop_activities_day_idx ON stop_activities (trip_stop_id, scheduled_date, sort_order);

CREATE TABLE trip_expenses (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id      uuid NOT NULL REFERENCES trips(id)      ON DELETE CASCADE,
  trip_stop_id uuid          REFERENCES trip_stops(id) ON DELETE CASCADE,
  category     expense_category NOT NULL,
  label        text   NOT NULL CHECK (length(trim(label)) BETWEEN 1 AND 120),
  amount_cents bigint NOT NULL CHECK (amount_cents >= 0 AND amount_cents <= 100000000000),
  incurred_on  date
);
CREATE INDEX trip_expenses_trip_idx ON trip_expenses (trip_id, category);

CREATE TABLE saved_destinations (
  user_id  uuid   NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  city_id  bigint NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  saved_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, city_id)
);

-- ============================================================
-- Cross-table invariants. A CHECK cannot see another table, so
-- these are constraint triggers. Both DEFERRABLE so a single
-- transaction can move a parent and its children in any order.
-- ============================================================

CREATE OR REPLACE FUNCTION enforce_stop_within_trip() RETURNS trigger AS $$
DECLARE t_start date; t_end date;
BEGIN
  SELECT start_date, end_date INTO t_start, t_end FROM trips WHERE id = NEW.trip_id;
  IF NEW.arrival_date < t_start OR NEW.departure_date > t_end + 1 THEN
    RAISE EXCEPTION 'stop_outside_trip_range'
      USING DETAIL = format('trip runs %s..%s, stop runs %s..%s',
                            t_start, t_end, NEW.arrival_date, NEW.departure_date);
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER trg_stop_within_trip
  AFTER INSERT OR UPDATE ON trip_stops
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION enforce_stop_within_trip();

CREATE OR REPLACE FUNCTION enforce_activity_within_stop() RETURNS trigger AS $$
DECLARE s_arr date; s_dep date;
BEGIN
  SELECT arrival_date, departure_date INTO s_arr, s_dep
  FROM trip_stops WHERE id = NEW.trip_stop_id;
  IF NEW.scheduled_date < s_arr OR NEW.scheduled_date >= s_dep THEN
    RAISE EXCEPTION 'activity_outside_stop_range'
      USING DETAIL = format('stop covers %s..%s, activity on %s', s_arr, s_dep, NEW.scheduled_date);
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER trg_activity_within_stop
  AFTER INSERT OR UPDATE ON stop_activities
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION enforce_activity_within_stop();

COMMIT;
