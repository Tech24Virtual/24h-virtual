-- Support for the billing dashboard rework.
--
-- 1. The billing role could not read payment_failures at all (only an admin policy existed), so the
--    dashboard stat, Client Lookup's failures card and the Resolve Payments page always showed nothing.
-- 2. Aggregate-only RPCs so billing never needs raw access to call_logs (caller PII), profiles or
--    full bank details. Each RPC checks the caller's role itself.

-- 1. Billing can see payment failures ------------------------------------------------------------
GRANT SELECT ON public.payment_failures TO authenticated;
DROP POLICY IF EXISTS "Billing can view payment failures" ON public.payment_failures;
CREATE POLICY "Billing can view payment failures" ON public.payment_failures
  FOR SELECT USING (public.has_role(auth.uid(), 'billing'::app_role));

-- 2a. Financial overview (one round trip, computed server-side) ----------------------------------
-- MRR = recurring fixed_amount of each active client's plan: their enabled custom plan if any,
-- otherwise the catalog plan. billing_summaries only stores *overage* (the run does not bill the
-- base subscription), so the revenue figures derived from it are overage revenue.
CREATE OR REPLACE FUNCTION public.billing_overview()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'billing'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  WITH active AS (
    SELECT l.id,
           CASE
             WHEN l.custom_plan_enabled THEN COALESCE(
               (SELECT cp.fixed_amount FROM public.custom_plans cp
                 WHERE cp.lead_id = l.id AND cp.is_active ORDER BY cp.created_at DESC LIMIT 1),
               bp.fixed_amount)
             ELSE bp.fixed_amount
           END AS monthly
    FROM public.leads l
    LEFT JOIN public.billing_plans bp ON bp.id = l.current_plan_id
    WHERE l.pipeline_stage = 'active'
  ),
  months AS (
    SELECT date_trunc('month', now()) - (n || ' month')::interval AS m
    FROM generate_series(0, 5) AS n
  )
  SELECT jsonb_build_object(
    'active_clients',        (SELECT count(*) FROM active),
    'active_clients_priced', (SELECT count(*) FROM active WHERE monthly > 0),
    'mrr',                   COALESCE((SELECT sum(monthly) FROM active WHERE monthly > 0), 0),
    'ytd_paid',              COALESCE((SELECT sum(overage_amount) FROM public.billing_summaries
                                        WHERE created_at >= date_trunc('year', now()) AND payment_status = 'paid'), 0),
    'outstanding',           COALESCE((SELECT sum(overage_amount) FROM public.billing_summaries
                                        WHERE overage_amount > 0 AND COALESCE(payment_status, 'pending') <> 'paid'), 0),
    'wl_revenue_month',      COALESCE((SELECT sum(partner_retail_revenue) FROM public.wl_usage_records
                                        WHERE billing_period_start >= date_trunc('month', now())::date), 0),
    'unresolved_failures',   (SELECT count(*) FROM public.payment_failures WHERE resolved_at IS NULL),
    'wl_partners',           (SELECT count(*) FROM public.white_label_partners),
    'monthly_trend',         (
      SELECT jsonb_agg(jsonb_build_object(
               'month',  to_char(mo.m, 'YYYY-MM'),
               'billed', COALESCE((SELECT sum(bs.overage_amount) FROM public.billing_summaries bs
                                    WHERE date_trunc('month', bs.created_at) = mo.m), 0),
               'paid',   COALESCE((SELECT sum(bs.overage_amount) FROM public.billing_summaries bs
                                    WHERE date_trunc('month', bs.created_at) = mo.m AND bs.payment_status = 'paid'), 0)
             ) ORDER BY mo.m)
      FROM months mo)
  ) INTO result;

  RETURN result;
END $$;

-- 2b. This month's usage for one client (counts + minutes only, no caller details) --------------
CREATE OR REPLACE FUNCTION public.billing_client_usage(p_client_id uuid, p_from date, p_to date)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'billing'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN (
    SELECT jsonb_build_object(
      'calls',   count(*),
      'minutes', COALESCE(sum(billable_minutes), 0)
    )
    FROM public.call_logs
    WHERE client_id = p_client_id
      AND COALESCE(call_date, created_at::date) BETWEEN p_from AND p_to
  );
END $$;

-- 2c. Payout profile per agent: name, pay terms and *masked* bank details ------------------------
CREATE OR REPLACE FUNCTION public.billing_agent_payout_profiles(p_agent_ids uuid[])
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'billing'::app_role)
       OR public.has_role(auth.uid(), 'hr'::app_role)
       OR public.has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'agent_id',             a.id,
      'full_name',            p.full_name,
      'has_banking',          (b.agent_id IS NOT NULL),
      'pay_type',             COALESCE(b.pay_type, 'hourly'),
      'hourly_rate',          b.hourly_rate,
      'monthly_rate',         b.monthly_rate,
      'hours_per_month',      b.hours_per_month,
      'overtime_hourly_rate', b.overtime_hourly_rate,
      'payment_method',       b.payment_method,
      'bank_name',            b.bank_name,
      'account_last4',        NULLIF(right(regexp_replace(COALESCE(b.account_number_encrypted, ''), '\D', '', 'g'), 4), ''),
      'routing_masked',       CASE WHEN COALESCE(b.routing_number, b.transit_number, '') = '' THEN NULL
                                   ELSE repeat('•', 5) || right(COALESCE(b.routing_number, b.transit_number), 3) END,
      'e_transfer_email',     b.e_transfer_email,
      'currency',             b.currency,
      'country',              b.country
    ))
    FROM unnest(p_agent_ids) AS a(id)
    LEFT JOIN public.profiles p ON p.id = a.id
    LEFT JOIN public.agent_banking b ON b.agent_id = a.id
  ), '[]'::jsonb);
END $$;

REVOKE ALL ON FUNCTION public.billing_overview() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.billing_client_usage(uuid, date, date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.billing_agent_payout_profiles(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.billing_overview() TO authenticated;
GRANT EXECUTE ON FUNCTION public.billing_client_usage(uuid, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.billing_agent_payout_profiles(uuid[]) TO authenticated;
