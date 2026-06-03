
-- Phase 39: QA Readiness & Test Harness
CREATE TABLE IF NOT EXISTS public.qa_release_gates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  release_label text NOT NULL UNIQUE,
  scope_summary text,
  scope_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  gate_checks jsonb NOT NULL DEFAULT '[]'::jsonb,
  decision text NOT NULL DEFAULT 'pending' CHECK (decision IN ('pending','go','no_go')),
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  decided_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  decided_at timestamptz
);

ALTER TABLE public.qa_release_gates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "qa_release_gates admin select"
  ON public.qa_release_gates FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "qa_release_gates admin insert"
  ON public.qa_release_gates FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "qa_release_gates admin update"
  ON public.qa_release_gates FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "qa_release_gates admin delete"
  ON public.qa_release_gates FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_qa_release_gates_updated_at
  BEFORE UPDATE ON public.qa_release_gates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_qa_release_gates_decision ON public.qa_release_gates(decision);
CREATE INDEX IF NOT EXISTS idx_qa_release_gates_created_at ON public.qa_release_gates(created_at DESC);

-- BI mirror
CREATE OR REPLACE VIEW public.v_bi_qa_release_gates
WITH (security_invoker = true) AS
SELECT
  id,
  release_label,
  scope_summary,
  decision,
  jsonb_array_length(gate_checks) AS total_checks,
  (
    SELECT count(*) FROM jsonb_array_elements(gate_checks) c
    WHERE c->>'status' = 'pass'
  ) AS passed_checks,
  (
    SELECT count(*) FROM jsonb_array_elements(gate_checks) c
    WHERE c->>'status' = 'fail'
  ) AS failed_checks,
  created_at,
  decided_at
FROM public.qa_release_gates;

GRANT SELECT ON public.v_bi_qa_release_gates TO authenticated;
