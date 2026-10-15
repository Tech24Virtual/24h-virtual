-- Client dashboard 30-day call trend, aggregated in the database.
--
-- Replaces a client-side fetch that (a) bucketed on created_at — the import
-- time, not when the call happened — and (b) was silently capped at 1000 rows
-- by PostgREST. Uses call_date/call_time (the telephony wall-clock time).
--
-- After-hours = outside the client's enabled wl_client_schedules window for
-- that weekday (day_of_week 0 = Sunday, matching extract(dow)). Clients with
-- no saved schedule use the portal default: Mon–Fri 09:00–17:00.
--
-- SECURITY INVOKER: wl_call_logs / call_logs RLS still scopes rows to the caller.

CREATE OR REPLACE FUNCTION public.client_call_trend(
  p_scope text,
  p_client_id uuid,
  p_days integer DEFAULT 30
)
RETURNS TABLE (day date, total integer, missed integer, seconds bigint, after_hours integer)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH bounds AS (
    SELECT (now() AT TIME ZONE 'America/Toronto')::date AS d1,
           (now() AT TIME ZONE 'America/Toronto')::date - (greatest(p_days, 1) - 1) AS d0
  ),
  calls AS (
    SELECT l.call_date AS d, l.call_time AS t, l.status,
           coalesce(l.handle_time_seconds, l.call_duration, 0) AS secs
    FROM public.wl_call_logs l, bounds b
    WHERE p_scope = 'wl' AND l.wl_client_id = p_client_id
      AND l.call_date BETWEEN b.d0 AND b.d1
    UNION ALL
    SELECT c.call_date, c.call_time, c.status, coalesce(c.call_duration, 0)
    FROM public.call_logs c, bounds b
    WHERE p_scope = 'direct' AND c.client_id = p_client_id
      AND c.call_date BETWEEN b.d0 AND b.d1
  ),
  sched AS (
    SELECT s.day_of_week, s.start_time, s.end_time
    FROM public.wl_client_schedules s
    WHERE p_scope = 'wl' AND s.wl_client_id = p_client_id AND s.is_enabled
  ),
  has_sched AS (
    SELECT EXISTS (
      SELECT 1 FROM public.wl_client_schedules s
      WHERE p_scope = 'wl' AND s.wl_client_id = p_client_id
    ) AS v
  )
  SELECT
    g.d::date AS day,
    count(c.d)::integer AS total,
    count(c.d) FILTER (WHERE c.status = 'missed')::integer AS missed,
    coalesce(sum(c.secs), 0)::bigint AS seconds,
    count(c.d) FILTER (
      WHERE c.t IS NOT NULL AND NOT (
        CASE WHEN (SELECT v FROM has_sched) THEN EXISTS (
               SELECT 1 FROM sched s
               WHERE s.day_of_week = extract(dow FROM c.d)::integer
                 AND c.t >= s.start_time AND c.t < s.end_time)
             ELSE extract(isodow FROM c.d) BETWEEN 1 AND 5
                  AND c.t >= time '09:00' AND c.t < time '17:00'
        END)
    )::integer AS after_hours
  FROM bounds b
  CROSS JOIN LATERAL generate_series(b.d0, b.d1, interval '1 day') AS g(d)
  LEFT JOIN calls c ON c.d = g.d::date
  GROUP BY g.d
  ORDER BY g.d;
$$;

REVOKE ALL ON FUNCTION public.client_call_trend(text, uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.client_call_trend(text, uuid, integer) TO authenticated;
