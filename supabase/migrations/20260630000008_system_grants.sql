-- feature_launch_flags: add UPDATE (SELECT already granted in 20260630000007)
GRANT UPDATE ON public.feature_launch_flags TO authenticated;

-- audit_log: read-only for admin audit trail viewer
GRANT SELECT ON public.audit_log TO authenticated;

-- platform_settings: needed for EmergencySimulationToggle in Mission Control
GRANT SELECT, UPDATE ON public.platform_settings TO authenticated;

-- feedback: add UPDATE + DELETE so status transitions and note edits work
GRANT UPDATE, DELETE ON public.feedback TO authenticated;

-- wl_partner_feedback_escalations: escalation bridge status in Feedback Queue
GRANT SELECT, UPDATE ON public.wl_partner_feedback_escalations TO authenticated;
