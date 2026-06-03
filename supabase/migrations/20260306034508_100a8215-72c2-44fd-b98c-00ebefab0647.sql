
-- Create people directory table
CREATE TABLE public.people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_email text NOT NULL,
  full_name text NOT NULL,
  type_tags text[] DEFAULT '{}',
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  slack_user_id text,
  stripe_customer_id text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create people_external_ids table
CREATE TABLE public.people_external_ids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  source text NOT NULL,
  external_id text NOT NULL,
  extra jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.people_external_ids ENABLE ROW LEVEL SECURITY;

-- RLS: admin and hr can read/write people
CREATE POLICY "Admin and HR can read people"
  ON public.people FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr'));

CREATE POLICY "Admin and HR can insert people"
  ON public.people FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr'));

CREATE POLICY "Admin and HR can update people"
  ON public.people FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr'));

CREATE POLICY "Admin and HR can delete people"
  ON public.people FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr'));

-- RLS: admin and hr can read/write people_external_ids
CREATE POLICY "Admin and HR can read people_external_ids"
  ON public.people_external_ids FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr'));

CREATE POLICY "Admin and HR can insert people_external_ids"
  ON public.people_external_ids FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr'));

CREATE POLICY "Admin and HR can update people_external_ids"
  ON public.people_external_ids FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr'));

CREATE POLICY "Admin and HR can delete people_external_ids"
  ON public.people_external_ids FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr'));

-- Updated_at trigger for people
CREATE TRIGGER update_people_updated_at
  BEFORE UPDATE ON public.people
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Unique constraint on email to support deduplication
CREATE UNIQUE INDEX people_primary_email_unique ON public.people (primary_email);
