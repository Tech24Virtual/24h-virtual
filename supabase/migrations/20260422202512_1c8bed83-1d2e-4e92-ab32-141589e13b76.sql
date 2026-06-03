-- Wave 2 Batch A: Script Document schema
-- Two tables for structured campaign scripts with versioning

CREATE TABLE public.campaign_script_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  tenant_kind public.campaign_tenant_kind NOT NULL,
  wl_partner_id UUID REFERENCES public.white_label_partners(id) ON DELETE CASCADE,
  wl_client_id UUID REFERENCES public.white_label_clients(id) ON DELETE CASCADE,
  client_lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled Script',
  status TEXT NOT NULL DEFAULT 'draft',
  current_version_id UUID,
  tree JSONB NOT NULL DEFAULT '{"nodes":[],"edges":[],"intents":[]}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID,
  CONSTRAINT campaign_script_documents_status_chk CHECK (status IN ('draft','published','archived'))
);

CREATE INDEX idx_csd_campaign ON public.campaign_script_documents(campaign_id);
CREATE INDEX idx_csd_wl_partner ON public.campaign_script_documents(wl_partner_id);
CREATE INDEX idx_csd_wl_client ON public.campaign_script_documents(wl_client_id);
CREATE INDEX idx_csd_client_lead ON public.campaign_script_documents(client_lead_id);

CREATE TABLE public.campaign_script_document_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.campaign_script_documents(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  tree JSONB NOT NULL,
  notes TEXT,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_by UUID,
  UNIQUE (document_id, version_number)
);

CREATE INDEX idx_csdv_document ON public.campaign_script_document_versions(document_id);

-- Enable RLS
ALTER TABLE public.campaign_script_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_script_document_versions ENABLE ROW LEVEL SECURITY;

-- Mirror campaigns RLS: admins full access; tenant rows scoped via parent campaign access
-- Admin policies
CREATE POLICY "Admins manage script documents"
ON public.campaign_script_documents
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage script document versions"
ON public.campaign_script_document_versions
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Tenant access: any user who can SELECT the parent campaign can read the script document
CREATE POLICY "Tenant can read own script documents"
ON public.campaign_script_documents
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.campaigns c
    WHERE c.id = campaign_script_documents.campaign_id
  )
);

CREATE POLICY "Tenant can read own script document versions"
ON public.campaign_script_document_versions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.campaign_script_documents d
    WHERE d.id = campaign_script_document_versions.document_id
  )
);

-- updated_at trigger
CREATE TRIGGER trg_csd_updated_at
BEFORE UPDATE ON public.campaign_script_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();