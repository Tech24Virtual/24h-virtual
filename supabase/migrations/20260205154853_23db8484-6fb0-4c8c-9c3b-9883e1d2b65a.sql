-- Grant table permissions to anon role (for anonymous form submissions)
GRANT INSERT ON public.leads TO anon;

-- Grant table permissions to authenticated role (for logged-in users)  
GRANT INSERT ON public.leads TO authenticated;

-- Also ensure SELECT permissions for returning the inserted ID
GRANT SELECT ON public.leads TO anon;
GRANT SELECT ON public.leads TO authenticated;