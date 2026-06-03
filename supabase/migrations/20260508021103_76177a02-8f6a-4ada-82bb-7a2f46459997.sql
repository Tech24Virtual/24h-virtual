REVOKE ALL ON FUNCTION public.emit_dashboard_event(text,text,text,text,uuid,jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_leads_emit_capture_event() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_leads_emit_stage_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_lead_conversions_emit() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_intake_emit_created() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_campaigns_emit_created() FROM PUBLIC, anon, authenticated;
