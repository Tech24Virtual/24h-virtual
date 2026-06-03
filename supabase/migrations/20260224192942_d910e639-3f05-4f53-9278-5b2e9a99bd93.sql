
-- 1. Add wl_client to app_role enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'wl_client';

-- 2. Add user_id column to white_label_clients
ALTER TABLE public.white_label_clients
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL UNIQUE;

-- 3. Create helper function to resolve wl_client_id from auth.uid()
CREATE OR REPLACE FUNCTION public.get_wl_client_id(_user_id uuid)
  RETURNS uuid
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
AS $$
  SELECT id FROM public.white_label_clients WHERE user_id = _user_id LIMIT 1
$$;

-- 4. Create wl_client_scripts table
CREATE TABLE IF NOT EXISTS public.wl_client_scripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.white_label_partners(id) ON DELETE CASCADE,
  wl_client_id uuid NOT NULL REFERENCES public.white_label_clients(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text,
  category text DEFAULT 'general',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.wl_client_scripts ENABLE ROW LEVEL SECURITY;

-- 5. Create wl_client_schedules table
CREATE TABLE IF NOT EXISTS public.wl_client_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.white_label_partners(id) ON DELETE CASCADE,
  wl_client_id uuid NOT NULL REFERENCES public.white_label_clients(id) ON DELETE CASCADE,
  day_of_week int NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time,
  end_time time,
  is_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.wl_client_schedules ENABLE ROW LEVEL SECURITY;

-- 6. RLS policies for wl_client_scripts
CREATE POLICY "WL clients view own scripts"
  ON public.wl_client_scripts FOR SELECT TO authenticated
  USING (
    wl_client_id = public.get_wl_client_id(auth.uid())
    OR partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "WL partners manage client scripts"
  ON public.wl_client_scripts FOR ALL TO authenticated
  USING (
    partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- 7. RLS policies for wl_client_schedules
CREATE POLICY "WL clients view own schedules"
  ON public.wl_client_schedules FOR SELECT TO authenticated
  USING (
    wl_client_id = public.get_wl_client_id(auth.uid())
    OR partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "WL clients manage own schedules"
  ON public.wl_client_schedules FOR ALL TO authenticated
  USING (
    wl_client_id = public.get_wl_client_id(auth.uid())
    OR partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    wl_client_id = public.get_wl_client_id(auth.uid())
    OR partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- 8. Add WL client RLS policies to existing wl_* tables (currently only partner/admin access)
-- wl_call_logs: WL clients can view their own call logs
CREATE POLICY "WL clients view own call logs"
  ON public.wl_call_logs FOR SELECT TO authenticated
  USING (wl_client_id = public.get_wl_client_id(auth.uid()));

-- wl_client_tickets: WL clients can view and create their own tickets
CREATE POLICY "WL clients view own tickets"
  ON public.wl_client_tickets FOR SELECT TO authenticated
  USING (wl_client_id = public.get_wl_client_id(auth.uid()));

CREATE POLICY "WL clients create own tickets"
  ON public.wl_client_tickets FOR INSERT TO authenticated
  WITH CHECK (wl_client_id = public.get_wl_client_id(auth.uid()));

CREATE POLICY "WL clients update own tickets"
  ON public.wl_client_tickets FOR UPDATE TO authenticated
  USING (wl_client_id = public.get_wl_client_id(auth.uid()));

-- wl_usage_records: WL clients can view their own usage
CREATE POLICY "WL clients view own usage"
  ON public.wl_usage_records FOR SELECT TO authenticated
  USING (wl_client_id = public.get_wl_client_id(auth.uid()));

-- wl_knowledge_base: WL clients can read their partner's KB
CREATE POLICY "WL clients read partner knowledge base"
  ON public.wl_knowledge_base FOR SELECT TO authenticated
  USING (
    partner_id IN (
      SELECT partner_id FROM public.white_label_clients WHERE user_id = auth.uid()
    )
  );

-- white_label_clients: WL clients can view their own record
CREATE POLICY "WL clients view own record"
  ON public.white_label_clients FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "WL clients update own record"
  ON public.white_label_clients FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- 9. Trigger for updated_at on wl_client_scripts
CREATE TRIGGER update_wl_client_scripts_updated_at
  BEFORE UPDATE ON public.wl_client_scripts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
