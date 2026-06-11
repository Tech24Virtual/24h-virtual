-- System 26: Usage Reconciliation — variance queue

CREATE TABLE public.variance_queue (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        uuid REFERENCES public.leads(id),
  period_start     date,
  period_end       date,
  variance_type    text NOT NULL CHECK (variance_type IN (
    'call_log_vs_usage_record',
    'usage_record_vs_billing_summary',
    'duplicate_call_id',
    'five9_gap'
  )),
  expected_minutes numeric,
  actual_minutes   numeric,
  delta_minutes    numeric,
  delta_pct        numeric,
  status           text NOT NULL DEFAULT 'open' CHECK (status IN (
    'open', 'under_review', 'resolved', 'dismissed'
  )),
  assigned_to      uuid REFERENCES auth.users(id),
  resolved_by      uuid REFERENCES auth.users(id),
  resolved_at      timestamptz,
  resolution_notes text,
  mission_id       uuid REFERENCES public.missions(id),
  raw_details      jsonb,
  created_at       timestamptz DEFAULT now()
);

ALTER TABLE public.variance_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_variance_queue"
  ON public.variance_queue
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "billing_all_variance_queue"
  ON public.variance_queue
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'billing'::app_role))
  WITH CHECK (has_role(auth.uid(), 'billing'::app_role));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.variance_queue TO authenticated;
