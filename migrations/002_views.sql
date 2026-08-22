-- GlobeTrotter — 002_views.sql
-- Nothing here is stored. This file is the answer to "why is your budget always correct".

BEGIN;

-- Every line item that costs money, normalised into one shape.
CREATE VIEW v_trip_cost_lines AS
  SELECT s.trip_id, 'STAY'::expense_category AS category,
         s.arrival_date AS on_date, s.stay_cents AS amount_cents
  FROM trip_stops s WHERE s.stay_cents > 0
UNION ALL
  SELECT s.trip_id, 'TRANSPORT'::expense_category, s.arrival_date, s.transport_in_cents
  FROM trip_stops s WHERE s.transport_in_cents > 0
UNION ALL
  SELECT s.trip_id, 'ACTIVITY'::expense_category, sa.scheduled_date, sa.cost_cents
  FROM stop_activities sa
  JOIN trip_stops s ON s.id = sa.trip_stop_id
  WHERE sa.cost_cents > 0
UNION ALL
  SELECT e.trip_id, e.category, COALESCE(e.incurred_on, t.start_date), e.amount_cents
  FROM trip_expenses e
  JOIN trips t ON t.id = e.trip_id;

-- One row per trip: total, per-category rollup, average per day.
CREATE VIEW v_trip_budget AS
SELECT t.id AS trip_id,
       t.duration_days,
       t.budget_cap_cents,
       COALESCE(SUM(l.amount_cents), 0)                                       AS total_cents,
       COALESCE(SUM(l.amount_cents) FILTER (WHERE l.category='TRANSPORT'), 0) AS transport_cents,
       COALESCE(SUM(l.amount_cents) FILTER (WHERE l.category='STAY'), 0)      AS stay_cents,
       COALESCE(SUM(l.amount_cents) FILTER (WHERE l.category='ACTIVITY'), 0)  AS activity_cents,
       COALESCE(SUM(l.amount_cents) FILTER (WHERE l.category='MEALS'), 0)     AS meals_cents,
       COALESCE(SUM(l.amount_cents) FILTER (WHERE l.category='OTHER'), 0)     AS other_cents,
       ROUND(COALESCE(SUM(l.amount_cents),0)::numeric / NULLIF(t.duration_days,0))::bigint
                                                                              AS avg_per_day_cents
FROM trips t
LEFT JOIN v_trip_cost_lines l ON l.trip_id = t.id
WHERE t.deleted_at IS NULL
GROUP BY t.id, t.duration_days, t.budget_cap_cents;

-- Per-day series for the bar chart, with the over-budget flag computed in SQL.
CREATE VIEW v_trip_daily_cost AS
SELECT l.trip_id,
       l.on_date,
       SUM(l.amount_cents) AS amount_cents,
       (t.budget_cap_cents IS NOT NULL
        AND SUM(l.amount_cents) > t.budget_cap_cents / GREATEST(t.duration_days,1)) AS over_cap
FROM v_trip_cost_lines l
JOIN trips t ON t.id = l.trip_id
GROUP BY l.trip_id, l.on_date, t.budget_cap_cents, t.duration_days;

-- Trip status derived from today's date. No cron job, no stale rows,
-- correct the instant the date rolls over.
CREATE VIEW v_trip_summary AS
SELECT t.id, t.user_id, t.name, t.description, t.start_date, t.end_date,
       t.cover_image_path, t.visibility, t.share_slug, t.currency_code,
       t.budget_cap_cents, t.duration_days, t.copied_from_trip_id, t.created_at,
       CASE WHEN CURRENT_DATE <  t.start_date THEN 'UPCOMING'
            WHEN CURRENT_DATE >  t.end_date   THEN 'COMPLETED'
            ELSE 'ONGOING' END AS status,
       (SELECT count(*) FROM trip_stops s WHERE s.trip_id = t.id) AS stop_count,
       (SELECT COALESCE(SUM(b.total_cents),0) FROM v_trip_budget b WHERE b.trip_id = t.id)
                                                                  AS total_cents
FROM trips t
WHERE t.deleted_at IS NULL;

COMMIT;
