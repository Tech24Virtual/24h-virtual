-- Create support_requests table for AI-powered issue resolution
CREATE TABLE public.support_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  issue_type TEXT DEFAULT 'bug',
  description TEXT NOT NULL,
  page_url TEXT,
  console_errors JSONB,
  ai_response TEXT,
  ai_analyzed_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending',
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;

-- Policies for admin access
CREATE POLICY "Admins can view all support requests"
ON public.support_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can create support requests"
ON public.support_requests
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can update support requests"
ON public.support_requests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Add billing_period column to leads if not exists
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS billing_period TEXT DEFAULT 'monthly';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_support_requests_status ON public.support_requests(status);
CREATE INDEX IF NOT EXISTS idx_support_requests_created_at ON public.support_requests(created_at DESC);