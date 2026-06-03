-- RLS Policies Export
-- Schema: public
-- Total policies: 524

-- ============================================================
-- Table: public.addon_products
-- ============================================================
CREATE POLICY "Admins can manage addon products" ON public.addon_products
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view active addon products" ON public.addon_products
  FOR SELECT TO public
  USING ((is_active = true));

-- ============================================================
-- Table: public.admin_email_connections
-- ============================================================
CREATE POLICY "Admins can manage admin_email_connections" ON public.admin_email_connections
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- Table: public.admin_email_contacts
-- ============================================================
CREATE POLICY "Admins can manage admin_email_contacts" ON public.admin_email_contacts
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- Table: public.admin_email_sends
-- ============================================================
CREATE POLICY "Admins can manage admin_email_sends" ON public.admin_email_sends
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- Table: public.admin_newsletter_drafts
-- ============================================================
CREATE POLICY "Admins can manage admin_newsletter_drafts" ON public.admin_newsletter_drafts
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- Table: public.admin_seo_reports
-- ============================================================
CREATE POLICY "Admins can manage admin_seo_reports" ON public.admin_seo_reports
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- Table: public.admin_settings
-- ============================================================
CREATE POLICY "Admins can read settings" ON public.admin_settings
  FOR SELECT TO public
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can upsert settings" ON public.admin_settings
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can read public build status keys" ON public.admin_settings
  FOR SELECT TO anon, authenticated
  USING ((key = ANY (ARRAY['wave_1_uat_signoff_confirmed'::text, 'wave_2_uat_signoff_confirmed'::text, 'wave_3_uat_signoff_confirmed'::text])));

-- ============================================================
-- Table: public.admin_social_snippets
-- ============================================================
CREATE POLICY "Admins can manage admin_social_snippets" ON public.admin_social_snippets
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- Table: public.admin_wordpress_connection
-- ============================================================
CREATE POLICY "Admins can manage admin_wordpress_connection" ON public.admin_wordpress_connection
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- Table: public.affiliate_marketing_assets
-- ============================================================
CREATE POLICY "Admins can manage marketing assets" ON public.affiliate_marketing_assets
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Affiliates can view active marketing assets" ON public.affiliate_marketing_assets
  FOR SELECT TO authenticated
  USING ((is_active = true));

-- ============================================================
-- Table: public.affiliate_payouts
-- ============================================================
CREATE POLICY "Admins can manage payouts" ON public.affiliate_payouts
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Affiliates can request payouts" ON public.affiliate_payouts
  FOR INSERT TO public
  WITH CHECK ((affiliate_id IN ( SELECT affiliates.id);

-- ============================================================
-- Table: public.affiliate_referrals
-- ============================================================
CREATE POLICY "Admins can manage referrals" ON public.affiliate_referrals
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- Table: public.affiliates
-- ============================================================
CREATE POLICY "Admins can manage affiliates" ON public.affiliates
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Affiliates can update own data" ON public.affiliates
  FOR UPDATE TO public
  USING ((user_id = auth.uid()));
CREATE POLICY "Affiliates can view own data" ON public.affiliates
  FOR SELECT TO public
  USING ((user_id = auth.uid()));

-- ============================================================
-- Table: public.agent_banking
-- ============================================================
CREATE POLICY "Admins can manage all banking" ON public.agent_banking
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Agents can insert own banking" ON public.agent_banking
  FOR INSERT TO public
  WITH CHECK ((auth.uid() = agent_id));
CREATE POLICY "Agents can update own banking" ON public.agent_banking
  FOR UPDATE TO public
  USING ((auth.uid() = agent_id));
CREATE POLICY "Agents can view own banking" ON public.agent_banking
  FOR SELECT TO public
  USING ((auth.uid() = agent_id));
CREATE POLICY "Billing can update banking" ON public.agent_banking
  FOR UPDATE TO public
  USING (has_role(auth.uid(), 'billing'::app_role));
CREATE POLICY "Billing can view all banking" ON public.agent_banking
  FOR SELECT TO public
  USING (has_role(auth.uid(), 'billing'::app_role));

-- ============================================================
-- Table: public.agent_configs
-- ============================================================
CREATE POLICY "Authenticated admin can manage agent_configs" ON public.agent_configs
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Billing/HR can read agent_configs" ON public.agent_configs
  FOR SELECT TO authenticated
  USING ((has_role(auth.uid(), 'billing'::app_role) OR has_role(auth.uid(), 'hr'::app_role)));

-- ============================================================
-- Table: public.agent_onboarding
-- ============================================================
CREATE POLICY "Agents can update own onboarding" ON public.agent_onboarding
  FOR UPDATE TO public
  USING ((applicant_user_id = auth.uid()))
  WITH CHECK ((applicant_user_id = auth.uid()));
CREATE POLICY "Agents can view own onboarding" ON public.agent_onboarding
  FOR SELECT TO public
  USING ((applicant_user_id = auth.uid()));
CREATE POLICY "HR can read all onboarding" ON public.agent_onboarding
  FOR SELECT TO public
  USING (has_role(auth.uid(), 'hr'::app_role));
CREATE POLICY "Supervisors and admins can manage onboarding" ON public.agent_onboarding
  FOR ALL TO public
  USING ((has_role(auth.uid(), 'supervisor'::app_role) OR has_role(auth.uid(), 'admin'::app_role)));

-- ============================================================
-- Table: public.agent_onboarding_log
-- ============================================================
CREATE POLICY "HR can read onboarding logs" ON public.agent_onboarding_log
  FOR SELECT TO public
  USING (has_role(auth.uid(), 'hr'::app_role));
CREATE POLICY "Supervisors and admins can manage onboarding logs" ON public.agent_onboarding_log
  FOR ALL TO public
  USING ((has_role(auth.uid(), 'supervisor'::app_role) OR has_role(auth.uid(), 'admin'::app_role)));

-- ============================================================
-- Table: public.agent_performance_reviews
-- ============================================================
CREATE POLICY "Agents can view their published reviews" ON public.agent_performance_reviews
  FOR SELECT TO authenticated
  USING (((agent_id = auth.uid()) AND (status = 'published'::text)));
CREATE POLICY "Supervisors and admins can manage reviews" ON public.agent_performance_reviews
  FOR ALL TO authenticated
  USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role)))
  WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role)));

-- ============================================================
-- Table: public.agent_prompts
-- ============================================================
CREATE POLICY "Admin can manage agent_prompts" ON public.agent_prompts
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- Table: public.agent_runs
-- ============================================================
CREATE POLICY "Authenticated admin/billing/hr can insert agent_runs" ON public.agent_runs
  FOR INSERT TO authenticated
  WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'billing'::app_role) OR has_role(auth.uid(), 'hr'::app_role)));
CREATE POLICY "Authenticated admin/billing/hr can read agent_runs" ON public.agent_runs
  FOR SELECT TO authenticated
  USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'billing'::app_role) OR has_role(auth.uid(), 'hr'::app_role)));
CREATE POLICY "Sales can read agent_runs" ON public.agent_runs
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'sales'::app_role));

-- ============================================================
-- Table: public.agent_schedules
-- ============================================================
CREATE POLICY "Admins can manage all schedules" ON public.agent_schedules
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Agents can view own schedules" ON public.agent_schedules
  FOR SELECT TO public
  USING ((agent_id = auth.uid()));
CREATE POLICY "Supervisors can delete schedules" ON public.agent_schedules
  FOR DELETE TO public
  USING (has_role(auth.uid(), 'supervisor'::app_role));
CREATE POLICY "Supervisors can insert schedules" ON public.agent_schedules
  FOR INSERT TO public
  WITH CHECK (has_role(auth.uid(), 'supervisor'::app_role));
CREATE POLICY "Supervisors can update schedules" ON public.agent_schedules
  FOR UPDATE TO public
  USING (has_role(auth.uid(), 'supervisor'::app_role));
CREATE POLICY "Supervisors can view all schedules" ON public.agent_schedules
  FOR SELECT TO public
  USING (has_role(auth.uid(), 'supervisor'::app_role));

-- ============================================================
-- Table: public.agent_shift_breaks
-- ============================================================
CREATE POLICY "Admins can view all breaks" ON public.agent_shift_breaks
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Agents can create own breaks" ON public.agent_shift_breaks
  FOR INSERT TO authenticated
  WITH CHECK ((EXISTS ( SELECT 1);

-- ============================================================
-- Table: public.agent_shifts
-- ============================================================
CREATE POLICY "Admins can view all shifts" ON public.agent_shifts
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Agents can create own shifts" ON public.agent_shifts
  FOR INSERT TO authenticated
  WITH CHECK ((agent_id = auth.uid()));
CREATE POLICY "Agents can update own shifts" ON public.agent_shifts
  FOR UPDATE TO authenticated
  USING ((agent_id = auth.uid()));
CREATE POLICY "Agents can view own shifts" ON public.agent_shifts
  FOR SELECT TO authenticated
  USING ((agent_id = auth.uid()));
CREATE POLICY "Supervisors can update shifts" ON public.agent_shifts
  FOR UPDATE TO public
  USING (has_role(auth.uid(), 'supervisor'::app_role));
CREATE POLICY "Supervisors can view all shifts" ON public.agent_shifts
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'supervisor'::app_role));

-- ============================================================
-- Table: public.agent_skills
-- ============================================================
CREATE POLICY "Admins can manage all skills" ON public.agent_skills
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Agents can read own skills" ON public.agent_skills
  FOR SELECT TO public
  USING ((agent_id = auth.uid()));
CREATE POLICY "Supervisors can delete skills" ON public.agent_skills
  FOR DELETE TO public
  USING (has_role(auth.uid(), 'supervisor'::app_role));
CREATE POLICY "Supervisors can insert skills" ON public.agent_skills
  FOR INSERT TO public
  WITH CHECK (has_role(auth.uid(), 'supervisor'::app_role));
CREATE POLICY "Supervisors can read all skills" ON public.agent_skills
  FOR SELECT TO public
  USING (has_role(auth.uid(), 'supervisor'::app_role));
CREATE POLICY "Supervisors can update skills" ON public.agent_skills
  FOR UPDATE TO public
  USING (has_role(auth.uid(), 'supervisor'::app_role));

-- ============================================================
-- Table: public.ai_draft_log
-- ============================================================
CREATE POLICY "Admins read all draft logs" ON public.ai_draft_log
  FOR SELECT TO public
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users read their own draft log" ON public.ai_draft_log
  FOR SELECT TO public
  USING ((auth.uid() = user_id));

-- ============================================================
-- Table: public.approval_policies
-- ============================================================
CREATE POLICY "approval_policies_admin_all" ON public.approval_policies
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- Table: public.approval_policy_versions
-- ============================================================
CREATE POLICY "admins read approval policy versions" ON public.approval_policy_versions
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- Table: public.approval_requests
-- ============================================================
CREATE POLICY "approval_requests_admin_all" ON public.approval_requests
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- Table: public.audit_log
-- ============================================================
CREATE POLICY "Admins can view audit log" ON public.audit_log
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- Table: public.autoblog_queue
-- ============================================================
CREATE POLICY "Admins can manage autoblog queue" ON public.autoblog_queue
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- Table: public.automation_check_runs
-- ============================================================
CREATE POLICY "Admins read check runs" ON public.automation_check_runs
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- Table: public.automation_recommendations
-- ============================================================
CREATE POLICY "Admins read recommendations" ON public.automation_recommendations
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- Table: public.billing_notes
-- ============================================================
CREATE POLICY "Billing/admin can manage billing notes" ON public.billing_notes
  FOR ALL TO authenticated
  USING ((has_role(auth.uid(), 'billing'::app_role) OR has_role(auth.uid(), 'admin'::app_role)))
  WITH CHECK ((has_role(auth.uid(), 'billing'::app_role) OR has_role(auth.uid(), 'admin'::app_role)));

-- ============================================================
-- Table: public.billing_summaries
-- ============================================================
CREATE POLICY "Authenticated admin/billing can insert billing_summaries" ON public.billing_summaries
  FOR INSERT TO authenticated
  WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'billing'::app_role)));
CREATE POLICY "Authenticated admin/billing can read billing_summaries" ON public.billing_summaries
  FOR SELECT TO authenticated
  USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'billing'::app_role)));

-- ============================================================
-- Table: public.blog_internal_links
-- ============================================================
CREATE POLICY "Admins can manage blog internal links" ON public.blog_internal_links
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- Table: public.blog_posts
-- ============================================================
CREATE POLICY "Admins can manage all blog posts" ON public.blog_posts
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Published blog posts are publicly readable" ON public.blog_posts
  FOR SELECT TO public
  USING ((status = 'published'::text));

-- ============================================================
-- Table: public.call_flow_receptionist_configs
-- ============================================================
CREATE POLICY "recep_cfg_admin_all" ON public.call_flow_receptionist_configs
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "recep_cfg_member_select" ON public.call_flow_receptionist_configs
  FOR SELECT TO authenticated
  USING (is_tenant_member(auth.uid(), (tenant_kind)::text, wl_partner_id, client_lead_id, wl_client_id));
CREATE POLICY "recep_cfg_supervisor_update" ON public.call_flow_receptionist_configs
  FOR UPDATE TO authenticated
  USING ((has_role(auth.uid(), 'supervisor'::app_role) AND is_tenant_member(auth.uid(), (tenant_kind)::text, wl_partner_id, client_lead_id, wl_client_id)))
  WITH CHECK ((has_role(auth.uid(), 'supervisor'::app_role) AND is_tenant_member(auth.uid(), (tenant_kind)::text, wl_partner_id, client_lead_id, wl_client_id)));

-- ============================================================
-- Table: public.call_logs
-- ============================================================
CREATE POLICY "Admins and agents can insert call logs" ON public.call_logs
  FOR INSERT TO public
  WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'agent'::app_role)));
CREATE POLICY "Admins can view all call logs" ON public.call_logs
  FOR SELECT TO public
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- Table: public.call_report_imports
-- ============================================================
CREATE POLICY "Admins can manage call report imports" ON public.call_report_imports
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Agents can view call report imports" ON public.call_report_imports
  FOR SELECT TO public
  USING (has_role(auth.uid(), 'agent'::app_role));

-- ============================================================
-- Table: public.campaign_audit_log
-- ============================================================
CREATE POLICY "campaign_audit_log_admin_all" ON public.campaign_audit_log
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "campaign_audit_log_member_select" ON public.campaign_audit_log
  FOR SELECT TO authenticated
  USING (is_tenant_member(auth.uid(), (tenant_kind)::text, wl_partner_id, client_lead_id, wl_client_id));

-- ============================================================
-- Table: public.campaign_department_type_defaults
-- ============================================================
CREATE POLICY "defaults_admin_delete" ON public.campaign_department_type_defaults
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "defaults_admin_insert" ON public.campaign_department_type_defaults
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "defaults_admin_update" ON public.campaign_department_type_defaults
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "defaults_read_authenticated" ON public.campaign_department_type_defaults
  FOR SELECT TO authenticated
  USING (true);

-- ============================================================
-- Table: public.campaign_faq_entries
-- ============================================================
CREATE POLICY "campaign_faq_entries_admin_all" ON public.campaign_faq_entries
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "campaign_faq_entries_global_select" ON public.campaign_faq_entries
  FOR SELECT TO authenticated
  USING (((scope = 'global'::text) AND (status = 'approved'::text)));
CREATE POLICY "campaign_faq_entries_member_select" ON public.campaign_faq_entries
  FOR SELECT TO authenticated
  USING (((scope <> 'global'::text) AND is_tenant_member(auth.uid(), (tenant_kind)::text, wl_partner_id, client_lead_id, wl_client_id)));
CREATE POLICY "campaign_faq_entries_supervisor_update" ON public.campaign_faq_entries
  FOR UPDATE TO authenticated
  USING ((has_role(auth.uid(), 'supervisor'::app_role) AND ((scope = 'global'::text) OR is_tenant_member(auth.uid(), (tenant_kind)::text, wl_partner_id, client_lead_id, wl_client_id))))
  WITH CHECK ((has_role(auth.uid(), 'supervisor'::app_role) AND ((scope = 'global'::text) OR is_tenant_member(auth.uid(), (tenant_kind)::text, wl_partner_id, client_lead_id, wl_client_id))));

-- ============================================================
-- Table: public.campaign_field_display_labels
-- ============================================================
CREATE POLICY "campaign_field_display_labels_admin_all" ON public.campaign_field_display_labels
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "campaign_field_display_labels_supervisor" ON public.campaign_field_display_labels
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'supervisor'::app_role))
  WITH CHECK (has_role(auth.uid(), 'supervisor'::app_role));

-- ============================================================
-- Table: public.campaign_field_groups
-- ============================================================
CREATE POLICY "campaign_field_groups_admin_all" ON public.campaign_field_groups
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "campaign_field_groups_global_select" ON public.campaign_field_groups
  FOR SELECT TO authenticated
  USING ((scope = 'global'::text));
CREATE POLICY "campaign_field_groups_member_select" ON public.campaign_field_groups
  FOR SELECT TO authenticated
  USING (((scope <> 'global'::text) AND is_tenant_member(auth.uid(), (tenant_kind)::text, wl_partner_id, client_lead_id, wl_client_id)));
CREATE POLICY "campaign_field_groups_supervisor_update" ON public.campaign_field_groups
  FOR UPDATE TO authenticated
  USING ((has_role(auth.uid(), 'supervisor'::app_role) AND ((scope = 'global'::text) OR is_tenant_member(auth.uid(), (tenant_kind)::text, wl_partner_id, client_lead_id, wl_client_id))))
  WITH CHECK ((has_role(auth.uid(), 'supervisor'::app_role) AND ((scope = 'global'::text) OR is_tenant_member(auth.uid(), (tenant_kind)::text, wl_partner_id, client_lead_id, wl_client_id))));

-- ============================================================
-- Table: public.campaign_field_options
-- ============================================================
CREATE POLICY "campaign_field_options_admin_all" ON public.campaign_field_options
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "campaign_field_options_supervisor_update" ON public.campaign_field_options
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'supervisor'::app_role))
  WITH CHECK (has_role(auth.uid(), 'supervisor'::app_role));

-- ============================================================
-- Table: public.campaign_field_visibility_rules
-- ============================================================
CREATE POLICY "campaign_field_visibility_rules_admin_all" ON public.campaign_field_visibility_rules
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "campaign_field_visibility_rules_supervisor" ON public.campaign_field_visibility_rules
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'supervisor'::app_role))
  WITH CHECK (has_role(auth.uid(), 'supervisor'::app_role));

-- ============================================================
-- Table: public.campaign_fields
-- ============================================================
CREATE POLICY "campaign_fields_admin_all" ON public.campaign_fields
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "campaign_fields_member_select_nonprivate" ON public.campaign_fields
  FOR SELECT TO authenticated
  USING (((is_internal_only = false) AND ((scope = 'global'::text) OR is_tenant_member(auth.uid(), (tenant_kind)::text, wl_partner_id, client_lead_id, wl_client_id))));
CREATE POLICY "campaign_fields_supervisor_select" ON public.campaign_fields
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'supervisor'::app_role));
CREATE POLICY "campaign_fields_supervisor_update" ON public.campaign_fields
  FOR UPDATE TO authenticated
  USING ((has_role(auth.uid(), 'supervisor'::app_role) AND ((scope = 'global'::text) OR is_tenant_member(auth.uid(), (tenant_kind)::text, wl_partner_id, client_lead_id, wl_client_id))))
  WITH CHECK ((has_role(auth.uid(), 'supervisor'::app_role) AND ((scope = 'global'::text) OR is_tenant_member(auth.uid(), (tenant_kind)::text, wl_partner_id, client_lead_id, wl_client_id))));

-- ============================================================
-- Table: public.campaign_knowledge_versions
-- ============================================================
CREATE POLICY "campaign_knowledge_versions_admin_all" ON public.campaign_knowledge_versions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "campaign_knowledge_versions_member_select" ON public.campaign_knowledge_versions
  FOR SELECT TO authenticated
  USING (((tenant_kind IS NULL) OR is_tenant_member(auth.uid(), (tenant_kind)::text, wl_partner_id, client_lead_id, wl_client_id)));

-- ============================================================
-- Table: public.campaign_policy_blocks
-- ============================================================
CREATE POLICY "campaign_policy_blocks_admin_all" ON public.campaign_policy_blocks
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "campaign_policy_blocks_global_select" ON public.campaign_policy_blocks
  FOR SELECT TO authenticated
  USING (((scope = 'global'::text) AND (status = 'approved'::text)));
CREATE POLICY "campaign_policy_blocks_member_select" ON public.campaign_policy_blocks
  FOR SELECT TO authenticated
  USING (((scope <> 'global'::text) AND is_tenant_member(auth.uid(), (tenant_kind)::text, wl_partner_id, client_lead_id, wl_client_id)));
CREATE POLICY "campaign_policy_blocks_supervisor_update" ON public.campaign_policy_blocks
  FOR UPDATE TO authenticated
  USING ((has_role(auth.uid(), 'supervisor'::app_role) AND ((scope = 'global'::text) OR is_tenant_member(auth.uid(), (tenant_kind)::text, wl_partner_id, client_lead_id, wl_client_id))))
  WITH CHECK ((has_role(auth.uid(), 'supervisor'::app_role) AND ((scope = 'global'::text) OR is_tenant_member(auth.uid(), (tenant_kind)::text, wl_partner_id, client_lead_id, wl_client_id))));

-- ============================================================
-- Table: public.campaign_publish_versions
-- ============================================================
CREATE POLICY "cpv_admin_all" ON public.campaign_publish_versions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "cpv_member_select" ON public.campaign_publish_versions
  FOR SELECT TO authenticated
  USING (is_tenant_member(auth.uid(), (tenant_kind)::text, wl_partner_id, client_lead_id, wl_client_id));
CREATE POLICY "cpv_supervisor_update" ON public.campaign_publish_versions
  FOR UPDATE TO authenticated
  USING ((has_role(auth.uid(), 'supervisor'::app_role) AND is_tenant_member(auth.uid(), (tenant_kind)::text, wl_partner_id, client_lead_id, wl_client_id)))
  WITH CHECK ((has_role(auth.uid(), 'supervisor'::app_role) AND is_tenant_member(auth.uid(), (tenant_kind)::text, wl_partner_id, client_lead_id, wl_client_id)));

-- ============================================================
-- Table: public.campaign_scenarios
-- ============================================================
CREATE POLICY "campaign_scenarios_admin_all" ON public.campaign_scenarios
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "campaign_scenarios_member_select" ON public.campaign_scenarios
  FOR SELECT TO authenticated
  USING (is_tenant_member(auth.uid(), (tenant_kind)::text, wl_partner_id, client_lead_id, wl_client_id));
CREATE POLICY "campaign_scenarios_supervisor_update" ON public.campaign_scenarios
  FOR UPDATE TO authenticated
  USING ((has_role(auth.uid(), 'supervisor'::app_role) AND is_tenant_member(auth.uid(), (tenant_kind)::text, wl_partner_id, client_lead_id, wl_client_id)))
  WITH CHECK ((has_role(auth.uid(), 'supervisor'::app_role) AND is_tenant_member(auth.uid(), (tenant_kind)::text, wl_partner_id, client_lead_id, wl_client_id)));

-- ============================================================
-- Table: public.campaign_script_document_versions
-- ============================================================
CREATE POLICY "Admins manage script document versions" ON public.campaign_script_document_versions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- Table: public.campaign_script_documents
-- ============================================================
CREATE POLICY "Admins manage script documents" ON public.campaign_script_documents
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- Table: public.campaign_templates
-- ============================================================
CREATE POLICY "Admins manage templates" ON public.campaign_templates
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Supervisors read templates" ON public.campaign_templates
  FOR SELECT TO public
  USING (has_role(auth.uid(), 'supervisor'::app_role));

-- ============================================================
-- Table: public.campaign_training_completions
-- ============================================================
CREATE POLICY "Admins and supervisors manage completions" ON public.campaign_training_completions
  FOR ALL TO public
  USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role)))
  WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role)));
CREATE POLICY "Agents delete their own completions" ON public.campaign_training_completions
  FOR DELETE TO public
  USING ((auth.uid() = agent_id));
CREATE POLICY "Agents insert their own completions" ON public.campaign_training_completions
  FOR INSERT TO public
  WITH CHECK ((auth.uid() = agent_id));
CREATE POLICY "Agents read their own completions" ON public.campaign_training_completions
  FOR SELECT TO public
  USING ((auth.uid() = agent_id));

-- ============================================================
-- Table: public.campaign_training_lessons
-- ============================================================
CREATE POLICY "Admins and supervisors manage lessons" ON public.campaign_training_lessons
  FOR ALL TO public
  USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role)))
  WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role)));

-- ============================================================
-- Table: public.campaign_training_modules
-- ============================================================
CREATE POLICY "Admins and supervisors manage training modules" ON public.campaign_training_modules
  FOR ALL TO public
  USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role)))
  WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role)));
CREATE POLICY "Agents read published modules" ON public.campaign_training_modules
  FOR SELECT TO public
  USING (((status = 'published'::text) AND has_role(auth.uid(), 'agent'::app_role)));

-- ============================================================
-- Table: public.campaign_training_quiz_attempts
-- ============================================================
CREATE POLICY "Admins and supervisors manage attempts" ON public.campaign_training_quiz_attempts
  FOR ALL TO public
  USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role)))
  WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role)));
CREATE POLICY "Agents insert their own attempts" ON public.campaign_training_quiz_attempts
  FOR INSERT TO public
  WITH CHECK ((auth.uid() = agent_id));
CREATE POLICY "Agents read their own attempts" ON public.campaign_training_quiz_attempts
  FOR SELECT TO public
  USING ((auth.uid() = agent_id));

-- ============================================================
-- Table: public.campaign_training_quiz_questions
-- ============================================================
CREATE POLICY "Admins and supervisors manage questions" ON public.campaign_training_quiz_questions
  FOR ALL TO public
  USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role)))
  WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role)));

-- ============================================================
-- Table: public.campaign_training_retraining_events
-- ============================================================
CREATE POLICY "Admins and supervisors insert retraining events" ON public.campaign_training_retraining_events
  FOR INSERT TO public
  WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role)));
CREATE POLICY "Admins and supervisors read retraining events" ON public.campaign_training_retraining_events
  FOR SELECT TO public
  USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role)));

-- ============================================================
-- Table: public.campaign_training_signoffs
-- ============================================================
CREATE POLICY "Admins and supervisors manage signoffs" ON public.campaign_training_signoffs
  FOR ALL TO public
  USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role)))
  WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role)));
CREATE POLICY "Agents read their own signoffs" ON public.campaign_training_signoffs
  FOR SELECT TO public
  USING ((auth.uid() = agent_id));

-- ============================================================
-- Table: public.campaigns
-- ============================================================
CREATE POLICY "campaigns_admin_all" ON public.campaigns
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "campaigns_member_select" ON public.campaigns
  FOR SELECT TO authenticated
  USING (is_tenant_member(auth.uid(), (tenant_kind)::text, wl_partner_id, client_lead_id, wl_client_id));
CREATE POLICY "campaigns_supervisor_update" ON public.campaigns
  FOR UPDATE TO authenticated
  USING ((has_role(auth.uid(), 'supervisor'::app_role) AND is_tenant_member(auth.uid(), (tenant_kind)::text, wl_partner_id, client_lead_id, wl_client_id)))
  WITH CHECK ((has_role(auth.uid(), 'supervisor'::app_role) AND is_tenant_member(auth.uid(), (tenant_kind)::text, wl_partner_id, client_lead_id, wl_client_id)));

-- ============================================================
-- Table: public.capacity_assumptions
-- ============================================================
CREATE POLICY "Admin full access on capacity_assumptions" ON public.capacity_assumptions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- Table: public.capacity_supply
-- ============================================================
CREATE POLICY "Admin full access on capacity_supply" ON public.capacity_supply
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- Table: public.chat_activity_log
-- ============================================================
CREATE POLICY "Admins manage activity log" ON public.chat_activity_log
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- Table: public.chat_ai_configs
-- ============================================================
CREATE POLICY "Admins manage all ai configs" ON public.chat_ai_configs
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Tech manages all ai configs" ON public.chat_ai_configs
  FOR ALL TO public
  USING (has_role(auth.uid(), 'tech'::app_role))
  WITH CHECK (has_role(auth.uid(), 'tech'::app_role));

-- ============================================================
-- Table: public.chat_assignments
-- ============================================================
CREATE POLICY "Admins manage assignments" ON public.chat_assignments
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Agents insert their own assignment" ON public.chat_assignments
  FOR INSERT TO public
  WITH CHECK ((has_role(auth.uid(), 'agent'::app_role) AND (agent_id = auth.uid())));
CREATE POLICY "Supervisors manage assignments" ON public.chat_assignments
  FOR ALL TO public
  USING (has_role(auth.uid(), 'supervisor'::app_role))
  WITH CHECK (has_role(auth.uid(), 'supervisor'::app_role));

-- ============================================================
-- Table: public.chat_brand_configs
-- ============================================================
CREATE POLICY "Admins manage all brand configs" ON public.chat_brand_configs
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Tech manages all brand configs" ON public.chat_brand_configs
  FOR ALL TO public
  USING (has_role(auth.uid(), 'tech'::app_role))
  WITH CHECK (has_role(auth.uid(), 'tech'::app_role));

-- ============================================================
-- Table: public.chat_canned_responses
-- ============================================================
CREATE POLICY "Admins manage canned responses" ON public.chat_canned_responses
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Staff view canned responses" ON public.chat_canned_responses
  FOR SELECT TO public
  USING ((has_role(auth.uid(), 'agent'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role) OR has_role(auth.uid(), 'tech'::app_role) OR has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Tech manages canned responses" ON public.chat_canned_responses
  FOR ALL TO public
  USING (has_role(auth.uid(), 'tech'::app_role))
  WITH CHECK (has_role(auth.uid(), 'tech'::app_role));

-- ============================================================
-- Table: public.chat_conversations
-- ============================================================
CREATE POLICY "Admins manage all conversations" ON public.chat_conversations
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Agents update only their assigned conversations" ON public.chat_conversations
  FOR UPDATE TO public
  USING ((has_role(auth.uid(), 'agent'::app_role) AND (assigned_agent_id = auth.uid())));
CREATE POLICY "Supervisors update all conversations" ON public.chat_conversations
  FOR UPDATE TO public
  USING (has_role(auth.uid(), 'supervisor'::app_role));
CREATE POLICY "Supervisors view all conversations" ON public.chat_conversations
  FOR SELECT TO public
  USING (has_role(auth.uid(), 'supervisor'::app_role));

-- ============================================================
-- Table: public.chat_deployments
-- ============================================================
CREATE POLICY "Admins manage all deployments" ON public.chat_deployments
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Supervisors view all deployments" ON public.chat_deployments
  FOR SELECT TO public
  USING (has_role(auth.uid(), 'supervisor'::app_role));
CREATE POLICY "Tech manages all deployments" ON public.chat_deployments
  FOR ALL TO public
  USING (has_role(auth.uid(), 'tech'::app_role))
  WITH CHECK (has_role(auth.uid(), 'tech'::app_role));

-- ============================================================
-- Table: public.chat_handoff_events
-- ============================================================
CREATE POLICY "Admins manage handoff events" ON public.chat_handoff_events
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- Table: public.chat_messages
-- ============================================================
CREATE POLICY "Admins manage all messages" ON public.chat_messages
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Agents insert messages on assigned conversations" ON public.chat_messages
  FOR INSERT TO public
  WITH CHECK (((sender_type = 'agent'::chat_sender_type) AND (sender_id = auth.uid()) AND (conversation_id IN ( SELECT chat_conversations.id);
CREATE POLICY "Supervisors insert messages on any conversation" ON public.chat_messages
  FOR INSERT TO public
  WITH CHECK ((has_role(auth.uid(), 'supervisor'::app_role) AND (sender_type = ANY (ARRAY['agent'::chat_sender_type, 'system'::chat_sender_type]))));

-- ============================================================
-- Table: public.chat_visitors
-- ============================================================
CREATE POLICY "Admins manage visitors" ON public.chat_visitors
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- Table: public.client_addons
-- ============================================================
CREATE POLICY "Admins can manage client addons" ON public.client_addons
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- Table: public.client_agent_assignments
-- ============================================================
CREATE POLICY "Agents can view their own assignments" ON public.client_agent_assignments
  FOR SELECT TO authenticated
  USING ((agent_id = auth.uid()));
CREATE POLICY "Supervisors and admins can manage assignments" ON public.client_agent_assignments
  FOR ALL TO authenticated
  USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role)))
  WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role)));

-- ============================================================
-- Table: public.client_contacts
-- ============================================================
CREATE POLICY "client_contacts_admin_all" ON public.client_contacts
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "client_contacts_member_select" ON public.client_contacts
  FOR SELECT TO authenticated
  USING (is_tenant_member(auth.uid(), (tenant_kind)::text, wl_partner_id, client_lead_id, wl_client_id));
CREATE POLICY "client_contacts_supervisor_update" ON public.client_contacts
  FOR UPDATE TO authenticated
  USING ((has_role(auth.uid(), 'supervisor'::app_role) AND is_tenant_member(auth.uid(), (tenant_kind)::text, wl_partner_id, client_lead_id, wl_client_id)))
  WITH CHECK ((has_role(auth.uid(), 'supervisor'::app_role) AND is_tenant_member(auth.uid(), (tenant_kind)::text, wl_partner_id, client_lead_id, wl_client_id)));

-- ============================================================
-- Table: public.client_departments
-- ============================================================
CREATE POLICY "client_departments_admin_all" ON public.client_departments
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "client_departments_member_select" ON public.client_departments
  FOR SELECT TO authenticated
  USING (is_tenant_member(auth.uid(), (tenant_kind)::text, wl_partner_id, client_lead_id, wl_client_id));
CREATE POLICY "client_departments_supervisor_update" ON public.client_departments
  FOR UPDATE TO authenticated
  USING ((has_role(auth.uid(), 'supervisor'::app_role) AND is_tenant_member(auth.uid(), (tenant_kind)::text, wl_partner_id, client_lead_id, wl_client_id)))
  WITH CHECK ((has_role(auth.uid(), 'supervisor'::app_role) AND is_tenant_member(auth.uid(), (tenant_kind)::text, wl_partner_id, client_lead_id, wl_client_id)));

-- ============================================================
-- Table: public.client_handoff_documents
-- ============================================================
CREATE POLICY "Admins manage all client docs" ON public.client_handoff_documents
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Direct clients can upload their docs" ON public.client_handoff_documents
  FOR INSERT TO public
  WITH CHECK (((uploaded_by = auth.uid()) AND (handoff_id IN ( SELECT client_onboarding_handoffs.id);
CREATE POLICY "Supervisors can view client docs" ON public.client_handoff_documents
  FOR SELECT TO public
  USING (has_role(auth.uid(), 'supervisor'::app_role));

-- ============================================================
-- Table: public.client_handoff_items
-- ============================================================
CREATE POLICY "Admins manage all client items" ON public.client_handoff_items
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Supervisors can view client items" ON public.client_handoff_items
  FOR SELECT TO public
  USING (has_role(auth.uid(), 'supervisor'::app_role));

-- ============================================================
-- Table: public.client_handoff_requests
-- ============================================================
CREATE POLICY "Admins manage all client requests" ON public.client_handoff_requests
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Supervisors can insert client requests" ON public.client_handoff_requests
  FOR INSERT TO public
  WITH CHECK (has_role(auth.uid(), 'supervisor'::app_role));
CREATE POLICY "Supervisors can view client requests" ON public.client_handoff_requests
  FOR SELECT TO public
  USING (has_role(auth.uid(), 'supervisor'::app_role));

-- ============================================================
-- Table: public.client_locations
-- ============================================================
CREATE POLICY "client_locations_admin_delete" ON public.client_locations
  FOR DELETE TO public
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "client_locations_admin_insert" ON public.client_locations
  FOR INSERT TO public
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "client_locations_admin_update" ON public.client_locations
  FOR UPDATE TO public
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- Table: public.client_onboarding_activity
-- ============================================================
CREATE POLICY "Admins manage all client activity" ON public.client_onboarding_activity
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Supervisors can insert client activity" ON public.client_onboarding_activity
  FOR INSERT TO public
  WITH CHECK (has_role(auth.uid(), 'supervisor'::app_role));
CREATE POLICY "Supervisors can view + add client activity" ON public.client_onboarding_activity
  FOR SELECT TO public
  USING (has_role(auth.uid(), 'supervisor'::app_role));

-- ============================================================
-- Table: public.client_onboarding_handoffs
-- ============================================================
CREATE POLICY "Admins manage all client handoffs" ON public.client_onboarding_handoffs
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Supervisors can update client handoff status" ON public.client_onboarding_handoffs
  FOR UPDATE TO public
  USING (has_role(auth.uid(), 'supervisor'::app_role))
  WITH CHECK (has_role(auth.uid(), 'supervisor'::app_role));
CREATE POLICY "Supervisors can view client handoffs" ON public.client_onboarding_handoffs
  FOR SELECT TO public
  USING (has_role(auth.uid(), 'supervisor'::app_role));

-- ============================================================
-- Table: public.client_quick_links
-- ============================================================
CREATE POLICY "Anon can validate tokens" ON public.client_quick_links
  FOR SELECT TO anon
  USING (((is_active = true) AND ((expires_at IS NULL) OR (expires_at > now()))));
CREATE POLICY "Clients can create quick links" ON public.client_quick_links
  FOR INSERT TO authenticated
  WITH CHECK ((auth.uid() = client_id));
CREATE POLICY "Clients can update own quick links" ON public.client_quick_links
  FOR UPDATE TO authenticated
  USING ((auth.uid() = client_id));
CREATE POLICY "Clients can view own quick links" ON public.client_quick_links
  FOR SELECT TO authenticated
  USING ((auth.uid() = client_id));
CREATE POLICY "Supervisors can delete quick links" ON public.client_quick_links
  FOR DELETE TO authenticated
  USING ((has_role(auth.uid(), 'supervisor'::app_role) OR has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Supervisors can insert quick links" ON public.client_quick_links
  FOR INSERT TO authenticated
  WITH CHECK ((has_role(auth.uid(), 'supervisor'::app_role) OR has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Supervisors can update quick links" ON public.client_quick_links
  FOR UPDATE TO authenticated
  USING ((has_role(auth.uid(), 'supervisor'::app_role) OR has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Supervisors can view all quick links" ON public.client_quick_links
  FOR SELECT TO authenticated
  USING ((has_role(auth.uid(), 'supervisor'::app_role) OR has_role(auth.uid(), 'admin'::app_role)));

-- ============================================================
-- Table: public.client_report_mappings
-- ============================================================
CREATE POLICY "Admins can manage client report mappings" ON public.client_report_mappings
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- Table: public.client_scripts
-- ============================================================
CREATE POLICY "Admins can view all scripts" ON public.client_scripts
  FOR SELECT TO public
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Clients can delete own scripts" ON public.client_scripts
  FOR DELETE TO public
  USING ((auth.uid() = client_id));
CREATE POLICY "Clients can insert own scripts" ON public.client_scripts
  FOR INSERT TO public
  WITH CHECK ((auth.uid() = client_id));
CREATE POLICY "Clients can update own scripts" ON public.client_scripts
  FOR UPDATE TO public
  USING ((auth.uid() = client_id));
CREATE POLICY "Clients can view own scripts" ON public.client_scripts
  FOR SELECT TO public
  USING ((auth.uid() = client_id));

-- ============================================================
-- Table: public.communication_actions
-- ============================================================
CREATE POLICY "Admin full access on communication_actions" ON public.communication_actions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- Table: public.communication_templates
-- ============================================================
CREATE POLICY "Admin full access on communication_templates" ON public.communication_templates
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- Table: public.contracts
-- ============================================================
CREATE POLICY "Admins can manage contracts" ON public.contracts
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "HR can read all contracts" ON public.contracts
  FOR SELECT TO public
  USING (has_role(auth.uid(), 'hr'::app_role));
CREATE POLICY "Users can view own contracts" ON public.contracts
  FOR SELECT TO public
  USING ((user_id = auth.uid()));

-- ============================================================
-- Table: public.crm_activities
-- ============================================================
CREATE POLICY "Admins can manage all activities" ON public.crm_activities
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Agents can create activities" ON public.crm_activities
  FOR INSERT TO public
  WITH CHECK (has_role(auth.uid(), 'agent'::app_role));
CREATE POLICY "Agents can view activities" ON public.crm_activities
  FOR SELECT TO public
  USING (has_role(auth.uid(), 'agent'::app_role));

-- ============================================================
-- Table: public.crm_tasks
-- ============================================================
CREATE POLICY "Admins can manage all tasks" ON public.crm_tasks
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Agents can create tasks" ON public.crm_tasks
  FOR INSERT TO public
  WITH CHECK (has_role(auth.uid(), 'agent'::app_role));
CREATE POLICY "Agents can view tasks" ON public.crm_tasks
  FOR SELECT TO public
  USING (has_role(auth.uid(), 'agent'::app_role));
CREATE POLICY "Staff can update tasks" ON public.crm_tasks
  FOR UPDATE TO public
  USING ((has_role(auth.uid(), 'agent'::app_role) OR has_role(auth.uid(), 'sales'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role) OR has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Staff can view all tasks" ON public.crm_tasks
  FOR SELECT TO public
  USING ((has_role(auth.uid(), 'agent'::app_role) OR has_role(auth.uid(), 'sales'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role) OR has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Users can manage assigned tasks" ON public.crm_tasks
  FOR ALL TO public
  USING ((assigned_to = auth.uid()));

-- ============================================================
-- Table: public.custom_plans
-- ============================================================
CREATE POLICY "Admins can manage custom plans" ON public.custom_plans
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- Table: public.dashboard_events
-- ============================================================
CREATE POLICY "Anonymous can record own dashboard events" ON public.dashboard_events
  FOR INSERT TO anon
  WITH CHECK ((user_id IS NULL));
CREATE POLICY "Authenticated can record own dashboard events" ON public.dashboard_events
  FOR INSERT TO authenticated
  WITH CHECK (((user_id IS NULL) OR (user_id = auth.uid())));
CREATE POLICY "Staff can read dashboard events" ON public.dashboard_events
  FOR SELECT TO authenticated
  USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role)));

-- ============================================================
-- Table: public.data_export_snapshots
-- ============================================================
CREATE POLICY "Admins can view all snapshots" ON public.data_export_snapshots
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- Table: public.department_numbers
-- ============================================================
CREATE POLICY "department_numbers_admin_all" ON public.department_numbers
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "department_numbers_member_select" ON public.department_numbers
  FOR SELECT TO authenticated
  USING (is_tenant_member(auth.uid(), (tenant_kind)::text, wl_partner_id, client_lead_id, wl_client_id));
CREATE POLICY "department_numbers_supervisor_update" ON public.department_numbers
  FOR UPDATE TO authenticated
  USING ((has_role(auth.uid(), 'supervisor'::app_role) AND is_tenant_member(auth.uid(), (tenant_kind)::text, wl_partner_id, client_lead_id, wl_client_id)))
  WITH CHECK ((has_role(auth.uid(), 'supervisor'::app_role) AND is_tenant_member(auth.uid(), (tenant_kind)::text, wl_partner_id, client_lead_id, wl_client_id)));

-- ============================================================
-- Table: public.direct_success_plays
-- ============================================================
CREATE POLICY "dsp admin all" ON public.direct_success_plays
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- Table: public.disc_audiences
-- ============================================================
CREATE POLICY "disc_audiences admin all" ON public.disc_audiences
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- Table: public.disc_faq_sets
-- ============================================================
CREATE POLICY "disc_faq_sets admin all" ON public.disc_faq_sets
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- Table: public.disc_faqs
-- ============================================================
CREATE POLICY "disc_faqs admin all" ON public.disc_faqs
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- Table: public.disc_generated_pages
-- ============================================================
CREATE POLICY "disc_pages admin all" ON public.disc_generated_pages
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "disc_pages public read published" ON public.disc_generated_pages
  FOR SELECT TO anon, authenticated
  USING (((publish_status = 'published'::text) AND (indexation_status = 'index'::text) AND (include_in_sitemap = true)));

-- ============================================================
-- Table: public.disc_internal_link_items
-- ============================================================
CREATE POLICY "disc_link_items admin all" ON public.disc_internal_link_items
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- Table: public.disc_internal_link_sets
-- ============================================================
CREATE POLICY "disc_link_sets admin all" ON public.disc_internal_link_sets
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- Table: public.disc_keywords
-- ============================================================
CREATE POLICY "disc_keywords admin all" ON public.disc_keywords
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- Table: public.disc_locations
-- ============================================================
CREATE POLICY "disc_locations admin all" ON public.disc_locations
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- Table: public.disc_publish_log
-- ============================================================
CREATE POLICY "disc_publish_log admin all" ON public.disc_publish_log
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- Table: public.disc_templates
-- ============================================================
CREATE POLICY "disc_templates admin all" ON public.disc_templates
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- Table: public.email_followups
-- ============================================================
CREATE POLICY "Admins can manage all email followups" ON public.email_followups
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Staff can insert email followups" ON public.email_followups
  FOR INSERT TO public
  WITH CHECK ((has_role(auth.uid(), 'agent'::app_role) OR has_role(auth.uid(), 'sales'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role)));
CREATE POLICY "Staff can update email followups" ON public.email_followups
  FOR UPDATE TO public
  USING ((has_role(auth.uid(), 'agent'::app_role) OR has_role(auth.uid(), 'sales'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role)));
CREATE POLICY "Staff can view email followups" ON public.email_followups
  FOR SELECT TO public
  USING ((has_role(auth.uid(), 'agent'::app_role) OR has_role(auth.uid(), 'sales'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role)));

-- ============================================================
-- Table: public.experiment_allocation_log
-- ============================================================
CREATE POLICY "alloc_log_admin_all" ON public.experiment_allocation_log
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- Table: public.feature_launch_flags
-- ============================================================
CREATE POLICY "Admins can delete launch flags" ON public.feature_launch_flags
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert launch flags" ON public.feature_launch_flags
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update launch flags" ON public.feature_launch_flags
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can read launch flags" ON public.feature_launch_flags
  FOR SELECT TO public
  USING (true);

-- ============================================================
-- Table: public.feedback
-- ============================================================
CREATE POLICY "feedback_admin_delete" ON public.feedback
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "feedback_admin_select" ON public.feedback
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "feedback_admin_update" ON public.feedback
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "feedback_user_insert" ON public.feedback
  FOR INSERT TO authenticated
  WITH CHECK ((auth.uid() IS NOT NULL));
CREATE POLICY "feedback_user_self_select" ON public.feedback
  FOR SELECT TO authenticated
  USING (((user_id = auth.uid()) AND (source_dashboard <> 'wl_partner_escalation'::text)));

-- ============================================================
-- Table: public.feedback_handoffs
-- ============================================================
CREATE POLICY "feedback_handoffs admin read direct" ON public.feedback_handoffs
  FOR SELECT TO authenticated
  USING (((tenant_kind = 'direct_24h'::text) AND has_role(auth.uid(), 'admin'::app_role)));

-- ============================================================
-- Table: public.feedback_messages
-- ============================================================
CREATE POLICY "feedback_messages admin insert" ON public.feedback_messages
  FOR INSERT TO authenticated
  WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) AND (author_user_id = auth.uid()) AND (author_kind = 'admin'::text)));
CREATE POLICY "feedback_messages admin read" ON public.feedback_messages
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "feedback_messages submitter insert" ON public.feedback_messages
  FOR INSERT TO authenticated
  WITH CHECK (((EXISTS ( SELECT 1);

-- ============================================================
-- Table: public.five9_drift_snapshots
-- ============================================================
CREATE POLICY "Admins manage five9 drift snapshots" ON public.five9_drift_snapshots
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- Table: public.five9_native_variables
-- ============================================================
CREATE POLICY "five9_native_admin_delete" ON public.five9_native_variables
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "five9_native_admin_insert" ON public.five9_native_variables
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "five9_native_admin_update" ON public.five9_native_variables
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "five9_native_read_authenticated" ON public.five9_native_variables
  FOR SELECT TO authenticated
  USING (true);

-- ============================================================
-- Table: public.five9_variable_groups
-- ============================================================
CREATE POLICY "five9_variable_groups_admin_all" ON public.five9_variable_groups
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "five9_variable_groups_member_select" ON public.five9_variable_groups
  FOR SELECT TO authenticated
  USING (is_tenant_member(auth.uid(), (tenant_kind)::text, wl_partner_id, client_lead_id, wl_client_id));
CREATE POLICY "five9_variable_groups_supervisor_update" ON public.five9_variable_groups
  FOR UPDATE TO authenticated
  USING ((has_role(auth.uid(), 'supervisor'::app_role) AND is_tenant_member(auth.uid(), (tenant_kind)::text, wl_partner_id, client_lead_id, wl_client_id)))
  WITH CHECK ((has_role(auth.uid(), 'supervisor'::app_role) AND is_tenant_member(auth.uid(), (tenant_kind)::text, wl_partner_id, client_lead_id, wl_client_id)));

-- ============================================================
-- Table: public.five9_variable_mappings
-- ============================================================
CREATE POLICY "five9_variable_mappings_admin_all" ON public.five9_variable_mappings
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "five9_variable_mappings_member_select" ON public.five9_variable_mappings
  FOR SELECT TO authenticated
  USING (is_tenant_member(auth.uid(), (tenant_kind)::text, wl_partner_id, client_lead_id, wl_client_id));
CREATE POLICY "five9_variable_mappings_supervisor_update" ON public.five9_variable_mappings
  FOR UPDATE TO authenticated
  USING ((has_role(auth.uid(), 'supervisor'::app_role) AND is_tenant_member(auth.uid(), (tenant_kind)::text, wl_partner_id, client_lead_id, wl_client_id)))
  WITH CHECK ((has_role(auth.uid(), 'supervisor'::app_role) AND is_tenant_member(auth.uid(), (tenant_kind)::text, wl_partner_id, client_lead_id, wl_client_id)));

-- ============================================================
-- Table: public.forecast_assumptions
-- ============================================================
CREATE POLICY "Admin full access on forecast_assumptions" ON public.forecast_assumptions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- Table: public.forecast_snapshots
-- ============================================================
CREATE POLICY "forecast_snapshots admin all" ON public.forecast_snapshots
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- Table: public.forecast_stage_probabilities
-- ============================================================
CREATE POLICY "Admin full access on forecast_stage_probabilities" ON public.forecast_stage_probabilities
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- Table: public.gtm_targets
-- ============================================================
CREATE POLICY "Admin full access on gtm_targets" ON public.gtm_targets
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- Table: public.hr_communications
-- ============================================================
CREATE POLICY "Users can insert communications" ON public.hr_communications
  FOR INSERT TO public
  WITH CHECK ((from_user_id = auth.uid()));
CREATE POLICY "Users can read their own communications" ON public.hr_communications
  FOR SELECT TO public
  USING (((to_user_id = auth.uid()) OR (from_user_id = auth.uid())));

-- ============================================================
-- Table: public.internal_fulfillment_activity
-- ============================================================
CREATE POLICY "Admin full access intake activity" ON public.internal_fulfillment_activity
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Supervisor can insert intake activity" ON public.internal_fulfillment_activity
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'supervisor'::app_role));
CREATE POLICY "Supervisor can view intake activity" ON public.internal_fulfillment_activity
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'supervisor'::app_role));

-- ============================================================
-- Table: public.internal_fulfillment_intake_documents
-- ============================================================
CREATE POLICY "Admin full access intake docs" ON public.internal_fulfillment_intake_documents
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Supervisor can view intake documents" ON public.internal_fulfillment_intake_documents
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'supervisor'::app_role));

-- ============================================================
-- Table: public.internal_fulfillment_intakes
-- ============================================================
CREATE POLICY "Admin full access intakes" ON public.internal_fulfillment_intakes
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update intakes" ON public.internal_fulfillment_intakes
  FOR UPDATE TO public
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Supervisor can view intakes" ON public.internal_fulfillment_intakes
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'supervisor'::app_role));
CREATE POLICY "Supervisors can update intakes (constraints enforced by trigger" ON public.internal_fulfillment_intakes
  FOR UPDATE TO public
  USING (has_role(auth.uid(), 'supervisor'::app_role))
  WITH CHECK (has_role(auth.uid(), 'supervisor'::app_role));

-- ============================================================
-- Table: public.internal_fulfillment_notes
-- ============================================================
CREATE POLICY "Admin full access intake notes" ON public.internal_fulfillment_notes
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Supervisor can insert intake notes" ON public.internal_fulfillment_notes
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'supervisor'::app_role));
CREATE POLICY "Supervisor can view intake notes" ON public.internal_fulfillment_notes
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'supervisor'::app_role));

-- ============================================================
-- Table: public.job_applications
-- ============================================================
CREATE POLICY "Admins can manage applications" ON public.job_applications
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Applicants can insert" ON public.job_applications
  FOR INSERT TO public
  WITH CHECK ((applicant_user_id = auth.uid()));
CREATE POLICY "Applicants can view own applications" ON public.job_applications
  FOR SELECT TO public
  USING ((applicant_user_id = auth.uid()));
CREATE POLICY "HR can read all job applications" ON public.job_applications
  FOR SELECT TO public
  USING (has_role(auth.uid(), 'hr'::app_role));

-- ============================================================
-- Table: public.job_postings
-- ============================================================
CREATE POLICY "Admins can manage postings" ON public.job_postings
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view active postings" ON public.job_postings
  FOR SELECT TO public
  USING ((status = 'active'::text));
CREATE POLICY "HR can manage job postings" ON public.job_postings
  FOR ALL TO public
  USING (has_role(auth.uid(), 'hr'::app_role));

-- ============================================================
-- Table: public.keyword_tracker
-- ============================================================
CREATE POLICY "Admins can manage keyword tracker" ON public.keyword_tracker
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- Table: public.lead_conversions
-- ============================================================
CREATE POLICY "Admins can insert lead conversions" ON public.lead_conversions
  FOR INSERT TO public
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can view lead conversions" ON public.lead_conversions
  FOR SELECT TO public
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- Table: public.leads
-- ============================================================
CREATE POLICY "Admins can manage leads" ON public.leads
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Clients can view own lead record" ON public.leads
  FOR SELECT TO authenticated
  USING ((user_id = auth.uid()));
CREATE POLICY "Public lead form submissions" ON public.leads
  FOR INSERT TO anon, authenticated
  WITH CHECK (((email IS NOT NULL) AND ((length(email) >= 5) AND (length(email) <= 254)) AND (name IS NOT NULL) AND ((length(TRIM(BOTH FROM name)) >= 1) AND (length(TRIM(BOTH FROM name)) <= 200))));

-- ============================================================
-- Table: public.meetings
-- ============================================================
CREATE POLICY "Sales/admin can update meetings" ON public.meetings
  FOR UPDATE TO public
  USING ((has_role(auth.uid(), 'sales'::app_role) OR has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Sales/admin/supervisor can view meetings" ON public.meetings
  FOR SELECT TO public
  USING ((has_role(auth.uid(), 'sales'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role)));

-- ============================================================
-- Table: public.mission_control_events
-- ============================================================
CREATE POLICY "Authenticated admin/billing/hr can insert mission_control_event" ON public.mission_control_events
  FOR INSERT TO authenticated
  WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'billing'::app_role) OR has_role(auth.uid(), 'hr'::app_role)));
CREATE POLICY "Authenticated admin/billing/hr can read mission_control_events" ON public.mission_control_events
  FOR SELECT TO authenticated
  USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'billing'::app_role) OR has_role(auth.uid(), 'hr'::app_role)));
CREATE POLICY "Sales can read mission_control_events" ON public.mission_control_events
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'sales'::app_role));

-- ============================================================
-- Table: public.missions
-- ============================================================
CREATE POLICY "Admin can update missions" ON public.missions
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated users with admin/billing/hr can read missions" ON public.missions
  FOR SELECT TO authenticated
  USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'billing'::app_role) OR has_role(auth.uid(), 'hr'::app_role)));
CREATE POLICY "Sales can read missions" ON public.missions
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'sales'::app_role));
CREATE POLICY "Service role and admin can insert missions" ON public.missions
  FOR INSERT TO authenticated
  WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'billing'::app_role) OR has_role(auth.uid(), 'hr'::app_role)));

-- ============================================================
-- Table: public.notifications
-- ============================================================
CREATE POLICY "Admins can insert notifications" ON public.notifications
  FOR INSERT TO public
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can delete own notifications" ON public.notifications
  FOR DELETE TO authenticated
  USING ((user_id = auth.uid()));
CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE TO public
  USING ((user_id = auth.uid()));
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT TO public
  USING ((user_id = auth.uid()));

-- ============================================================
-- Table: public.offer_exposures
-- ============================================================
CREATE POLICY "offer_exposures admin read" ON public.offer_exposures
  FOR SELECT TO public
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "offer_exposures anon insert visitor" ON public.offer_exposures
  FOR INSERT TO anon
  WITH CHECK (((user_id IS NULL) AND (visitor_key IS NOT NULL)));
CREATE POLICY "offer_exposures auth insert" ON public.offer_exposures
  FOR INSERT TO authenticated
  WITH CHECK (((user_id IS NULL) OR (user_id = auth.uid())));

-- ============================================================
-- Table: public.offers
-- ============================================================
CREATE POLICY "offers admin all" ON public.offers
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- Table: public.open_shifts
-- ============================================================
CREATE POLICY "Admins can manage open shifts" ON public.open_shifts
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Agents can claim open shifts" ON public.open_shifts
  FOR UPDATE TO public
  USING ((has_role(auth.uid(), 'agent'::app_role) AND (status = 'open'::text)))
  WITH CHECK ((claimed_by = auth.uid()));
CREATE POLICY "Agents can view open shifts" ON public.open_shifts
  FOR SELECT TO public
  USING (has_role(auth.uid(), 'agent'::app_role));
CREATE POLICY "Supervisors can manage open shifts" ON public.open_shifts
  FOR ALL TO public
  USING (has_role(auth.uid(), 'supervisor'::app_role));

-- ============================================================
-- Table: public.outbound_call_attempts
-- ============================================================
CREATE POLICY "Staff can insert outbound call attempts" ON public.outbound_call_attempts
  FOR INSERT TO public
  WITH CHECK ((has_role(auth.uid(), 'agent'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role) OR has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Staff can view outbound call attempts" ON public.outbound_call_attempts
  FOR SELECT TO public
  USING ((has_role(auth.uid(), 'agent'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role) OR has_role(auth.uid(), 'admin'::app_role)));

-- ============================================================
-- Table: public.outbound_call_requests
-- ============================================================
CREATE POLICY "Admins can manage all outbound requests" ON public.outbound_call_requests
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Clients can cancel own pending requests" ON public.outbound_call_requests
  FOR UPDATE TO public
  USING (((client_id = auth.uid()) AND (status = 'pending'::text)));
CREATE POLICY "Clients can insert own outbound requests" ON public.outbound_call_requests
  FOR INSERT TO public
  WITH CHECK ((client_id = auth.uid()));
CREATE POLICY "Clients can view own outbound requests" ON public.outbound_call_requests
  FOR SELECT TO public
  USING ((client_id = auth.uid()));
CREATE POLICY "Staff can update outbound requests" ON public.outbound_call_requests
  FOR UPDATE TO public
  USING ((has_role(auth.uid(), 'agent'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role) OR has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Staff can view all outbound requests" ON public.outbound_call_requests
  FOR SELECT TO public
  USING ((has_role(auth.uid(), 'agent'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role) OR has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "WL clients can cancel own pending requests" ON public.outbound_call_requests
  FOR UPDATE TO public
  USING (((wl_client_id IS NOT NULL) AND (wl_client_id = get_wl_client_id(auth.uid())) AND (status = 'pending'::text)));
CREATE POLICY "WL clients can insert own outbound requests" ON public.outbound_call_requests
  FOR INSERT TO public
  WITH CHECK (((wl_client_id IS NOT NULL) AND (wl_client_id = get_wl_client_id(auth.uid()))));
CREATE POLICY "WL clients can view own outbound requests" ON public.outbound_call_requests
  FOR SELECT TO public
  USING (((wl_client_id IS NOT NULL) AND (wl_client_id = get_wl_client_id(auth.uid()))));

-- ============================================================
-- Table: public.outline_progress
-- ============================================================
CREATE POLICY "Staff can insert outline progress" ON public.outline_progress
  FOR INSERT TO authenticated
  WITH CHECK (is_internal_staff(auth.uid()));
CREATE POLICY "Staff can update outline progress" ON public.outline_progress
  FOR UPDATE TO authenticated
  USING (is_internal_staff(auth.uid()))
  WITH CHECK (is_internal_staff(auth.uid()));
CREATE POLICY "Staff can view outline progress" ON public.outline_progress
  FOR SELECT TO authenticated
  USING (is_internal_staff(auth.uid()));

-- ============================================================
-- Table: public.partner_success_plays
-- ============================================================
CREATE POLICY "psp admin all" ON public.partner_success_plays
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- Table: public.payment_failures
-- ============================================================
CREATE POLICY "Admins can manage payment failures" ON public.payment_failures
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- Table: public.people
-- ============================================================
CREATE POLICY "Admin and HR can delete people" ON public.people
  FOR DELETE TO authenticated
  USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role)));
CREATE POLICY "Admin and HR can insert people" ON public.people
  FOR INSERT TO authenticated
  WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role)));
CREATE POLICY "Admin and HR can read people" ON public.people
  FOR SELECT TO authenticated
  USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role)));
CREATE POLICY "Admin and HR can update people" ON public.people
  FOR UPDATE TO authenticated
  USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role)));

-- ============================================================
-- Table: public.people_external_ids
-- ============================================================
CREATE POLICY "Admin and HR can delete people_external_ids" ON public.people_external_ids
  FOR DELETE TO authenticated
  USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role)));
CREATE POLICY "Admin and HR can insert people_external_ids" ON public.people_external_ids
  FOR INSERT TO authenticated
  WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role)));
CREATE POLICY "Admin and HR can read people_external_ids" ON public.people_external_ids
  FOR SELECT TO authenticated
  USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role)));
CREATE POLICY "Admin and HR can update people_external_ids" ON public.people_external_ids
  FOR UPDATE TO authenticated
  USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role)));

-- ============================================================
-- Table: public.platform_knowledge
-- ============================================================
CREATE POLICY "Admins can delete platform knowledge" ON public.platform_knowledge
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert platform knowledge" ON public.platform_knowledge
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update platform knowledge" ON public.platform_knowledge
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated users can read platform knowledge" ON public.platform_knowledge
  FOR SELECT TO authenticated
  USING (true);

-- ============================================================
-- Table: public.platform_settings
-- ============================================================
CREATE POLICY "Admin can manage platform_settings" ON public.platform_settings
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- Table: public.play_suggestions
-- ============================================================
CREATE POLICY "Admins read play_suggestions" ON public.play_suggestions
  FOR SELECT TO public
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins write play_suggestions" ON public.play_suggestions
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- Table: public.playbook_templates
-- ============================================================
CREATE POLICY "Admins read playbook_templates" ON public.playbook_templates
  FOR SELECT TO public
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins write playbook_templates" ON public.playbook_templates
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- Table: public.pricing_experiment_assignments
-- ============================================================
CREATE POLICY "Admins manage pricing assignments" ON public.pricing_experiment_assignments
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- Table: public.pricing_experiments
-- ============================================================
CREATE POLICY "Admins manage pricing experiments" ON public.pricing_experiments
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- Table: public.profiles
-- ============================================================
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT TO public
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "HR can read all profiles" ON public.profiles
  FOR SELECT TO public
  USING (has_role(auth.uid(), 'hr'::app_role));
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO public
  WITH CHECK ((auth.uid() = id));
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO public
  USING ((auth.uid() = id));
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO public
  USING ((auth.uid() = id));

-- ============================================================
-- Table: public.qa_environment_flags
-- ============================================================
CREATE POLICY "qa_env admin read" ON public.qa_environment_flags
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "qa_env admin write" ON public.qa_environment_flags
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- Table: public.qa_phase2_results
-- ============================================================
CREATE POLICY "Admins can insert qa results" ON public.qa_phase2_results
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can read qa results" ON public.qa_phase2_results
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- Table: public.qa_release_gates
-- ============================================================
CREATE POLICY "qa_release_gates admin delete" ON public.qa_release_gates
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "qa_release_gates admin insert" ON public.qa_release_gates
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "qa_release_gates admin select" ON public.qa_release_gates
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "qa_release_gates admin update" ON public.qa_release_gates
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- Table: public.referral_partners
-- ============================================================
CREATE POLICY "Admins can manage all referrals" ON public.referral_partners
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated users can submit referral" ON public.referral_partners
  FOR INSERT TO public
  WITH CHECK ((auth.uid() IS NOT NULL));
CREATE POLICY "Users can view own referrals" ON public.referral_partners
  FOR SELECT TO public
  USING ((user_id = auth.uid()));

-- ============================================================
-- Table: public.renewal_expansion_deals
-- ============================================================
CREATE POLICY "Admins manage deals" ON public.renewal_expansion_deals
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- Table: public.renewal_workflows
-- ============================================================
CREATE POLICY "Admin full access on renewal_workflows" ON public.renewal_workflows
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- Table: public.revops_period_snapshots
-- ============================================================
CREATE POLICY "revops_period_snapshots admin all" ON public.revops_period_snapshots
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- Table: public.revops_snapshot_capacity
-- ============================================================
CREATE POLICY "revops_snapshot_capacity admin all" ON public.revops_snapshot_capacity
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- Table: public.revops_snapshot_metrics
-- ============================================================
CREATE POLICY "revops_snapshot_metrics admin all" ON public.revops_snapshot_metrics
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- Table: public.revops_snapshot_pipeline
-- ============================================================
CREATE POLICY "revops_snapshot_pipeline admin all" ON public.revops_snapshot_pipeline
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- Table: public.sales_commissions
-- ============================================================
CREATE POLICY "Sales reps can view their own commissions" ON public.sales_commissions
  FOR SELECT TO public
  USING ((auth.uid() = sales_rep_id));

-- ============================================================
-- Table: public.sales_proposals
-- ============================================================
CREATE POLICY "Users can insert their own proposals" ON public.sales_proposals
  FOR INSERT TO public
  WITH CHECK ((auth.uid() = created_by));
CREATE POLICY "Users can update their own proposals" ON public.sales_proposals
  FOR UPDATE TO public
  USING ((auth.uid() = created_by));
CREATE POLICY "Users can view proposals they created" ON public.sales_proposals
  FOR SELECT TO public
  USING ((auth.uid() = created_by));

-- ============================================================
-- Table: public.sales_targets
-- ============================================================
CREATE POLICY "Users can view their own targets" ON public.sales_targets
  FOR SELECT TO public
  USING ((auth.uid() = user_id));

-- ============================================================
-- Table: public.saved_scenarios
-- ============================================================
CREATE POLICY "Admin can manage saved_scenarios" ON public.saved_scenarios
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- Table: public.script_change_comments
-- ============================================================
CREATE POLICY "Clients can comment on own requests" ON public.script_change_comments
  FOR INSERT TO authenticated
  WITH CHECK (((auth.uid() = author_id) AND (EXISTS ( SELECT 1);
CREATE POLICY "Supervisors can comment on any request" ON public.script_change_comments
  FOR INSERT TO authenticated
  WITH CHECK (((auth.uid() = author_id) AND (has_role(auth.uid(), 'supervisor'::app_role) OR has_role(auth.uid(), 'admin'::app_role))));
CREATE POLICY "Supervisors can view all comments" ON public.script_change_comments
  FOR SELECT TO authenticated
  USING ((has_role(auth.uid(), 'supervisor'::app_role) OR has_role(auth.uid(), 'admin'::app_role)));

-- ============================================================
-- Table: public.script_change_requests
-- ============================================================
CREATE POLICY "Anon can insert quick link requests" ON public.script_change_requests
  FOR INSERT TO anon
  WITH CHECK ((source = 'quick_link'::text));
CREATE POLICY "Clients can create change requests" ON public.script_change_requests
  FOR INSERT TO authenticated
  WITH CHECK ((auth.uid() = client_id));
CREATE POLICY "Clients can view own change requests" ON public.script_change_requests
  FOR SELECT TO authenticated
  USING ((auth.uid() = client_id));
CREATE POLICY "Supervisors can update change requests" ON public.script_change_requests
  FOR UPDATE TO authenticated
  USING ((has_role(auth.uid(), 'supervisor'::app_role) OR has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Supervisors can view all change requests" ON public.script_change_requests
  FOR SELECT TO authenticated
  USING ((has_role(auth.uid(), 'supervisor'::app_role) OR has_role(auth.uid(), 'admin'::app_role)));

-- ============================================================
-- Table: public.shift_invoices
-- ============================================================
CREATE POLICY "Admins can update invoices" ON public.shift_invoices
  FOR UPDATE TO public
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can view all invoices" ON public.shift_invoices
  FOR SELECT TO public
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Agents can insert own invoices" ON public.shift_invoices
  FOR INSERT TO public
  WITH CHECK ((auth.uid() = agent_id));
CREATE POLICY "Agents can update own submitted invoices" ON public.shift_invoices
  FOR UPDATE TO public
  USING (((auth.uid() = agent_id) AND (status = 'submitted'::text)));
CREATE POLICY "Agents can view own invoices" ON public.shift_invoices
  FOR SELECT TO public
  USING ((auth.uid() = agent_id));
CREATE POLICY "Billing can update invoices" ON public.shift_invoices
  FOR UPDATE TO public
  USING (has_role(auth.uid(), 'billing'::app_role));
CREATE POLICY "Billing can view invoices" ON public.shift_invoices
  FOR SELECT TO public
  USING (has_role(auth.uid(), 'billing'::app_role));
CREATE POLICY "Supervisors can update invoices" ON public.shift_invoices
  FOR UPDATE TO public
  USING (has_role(auth.uid(), 'supervisor'::app_role));
CREATE POLICY "Supervisors can view all invoices" ON public.shift_invoices
  FOR SELECT TO public
  USING (has_role(auth.uid(), 'supervisor'::app_role));

-- ============================================================
-- Table: public.slack_channels
-- ============================================================
CREATE POLICY "Staff can read slack channels" ON public.slack_channels
  FOR SELECT TO authenticated
  USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'agent'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role)));

-- ============================================================
-- Table: public.slack_user_mappings
-- ============================================================
CREATE POLICY "Staff can read slack user mappings" ON public.slack_user_mappings
  FOR SELECT TO authenticated
  USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'agent'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role)));

-- ============================================================
-- Table: public.supervisor_escalations
-- ============================================================
CREATE POLICY "Supervisors and admins can manage escalations" ON public.supervisor_escalations
  FOR ALL TO authenticated
  USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role)))
  WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role)));
CREATE POLICY "Target department staff can view escalations" ON public.supervisor_escalations
  FOR SELECT TO authenticated
  USING ((has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'billing'::app_role) OR has_role(auth.uid(), 'sales'::app_role)));

-- ============================================================
-- Table: public.supervisor_tenant_assignments
-- ============================================================
CREATE POLICY "supervisor_assignments_admin_all" ON public.supervisor_tenant_assignments
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "supervisor_assignments_self_select" ON public.supervisor_tenant_assignments
  FOR SELECT TO authenticated
  USING ((supervisor_user_id = auth.uid()));

-- ============================================================
-- Table: public.support_requests
-- ============================================================
CREATE POLICY "Admins can create support requests" ON public.support_requests
  FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1);

-- ============================================================
-- Table: public.support_tickets
-- ============================================================
CREATE POLICY "Admins can manage all tickets" ON public.support_tickets
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Agents can update assigned agent tickets" ON public.support_tickets
  FOR UPDATE TO authenticated
  USING ((has_role(auth.uid(), 'agent'::app_role) AND (work_queue = 'agent'::text) AND (assigned_to = auth.uid())));
CREATE POLICY "Authenticated users can create tickets" ON public.support_tickets
  FOR INSERT TO authenticated
  WITH CHECK ((auth.uid() IS NOT NULL));
CREATE POLICY "Billing can update billing queue tickets" ON public.support_tickets
  FOR UPDATE TO authenticated
  USING ((has_role(auth.uid(), 'billing'::app_role) AND (work_queue = 'billing'::text)));
CREATE POLICY "HR can update hr queue tickets" ON public.support_tickets
  FOR UPDATE TO authenticated
  USING ((has_role(auth.uid(), 'hr'::app_role) AND (work_queue = 'hr'::text)));
CREATE POLICY "Sales can update assigned sales tickets" ON public.support_tickets
  FOR UPDATE TO authenticated
  USING ((has_role(auth.uid(), 'sales'::app_role) AND (work_queue = 'sales'::text) AND (assigned_to = auth.uid())));
CREATE POLICY "Staff can view relevant tickets" ON public.support_tickets
  FOR SELECT TO authenticated
  USING ((has_role(auth.uid(), 'admin'::app_role) OR (submitted_by = auth.uid()) OR (assigned_to = auth.uid()) OR (has_role(auth.uid(), 'agent'::app_role) AND (work_queue = 'agent'::text)) OR (has_role(auth.uid(), 'supervisor'::app_role) AND (work_queue = ANY (ARRAY['agent'::text, 'supervisor'::text]))) OR (has_role(auth.uid(), 'sales'::app_role) AND (work_queue = 'sales'::text)) OR (has_role(auth.uid(), 'billing'::app_role) AND (work_queue = 'billing'::text)) OR (has_role(auth.uid(), 'tech'::app_role) AND (work_queue = 'tech'::text)) OR (has_role(auth.uid(), 'hr'::app_role) AND (work_queue = 'hr'::text))));
CREATE POLICY "Supervisors can update supervisor queue tickets" ON public.support_tickets
  FOR UPDATE TO authenticated
  USING ((has_role(auth.uid(), 'supervisor'::app_role) AND (work_queue = ANY (ARRAY['agent'::text, 'supervisor'::text]))));
CREATE POLICY "Tech can update tech queue tickets" ON public.support_tickets
  FOR UPDATE TO authenticated
  USING ((has_role(auth.uid(), 'tech'::app_role) AND (work_queue = 'tech'::text)));
CREATE POLICY "Users can view own tickets" ON public.support_tickets
  FOR SELECT TO public
  USING ((submitted_by = auth.uid()));

-- ============================================================
-- Table: public.task_notes
-- ============================================================
CREATE POLICY "Staff can add task notes" ON public.task_notes
  FOR INSERT TO public
  WITH CHECK ((has_role(auth.uid(), 'agent'::app_role) OR has_role(auth.uid(), 'sales'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role) OR has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Staff can view task notes" ON public.task_notes
  FOR SELECT TO public
  USING ((has_role(auth.uid(), 'agent'::app_role) OR has_role(auth.uid(), 'sales'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role) OR has_role(auth.uid(), 'admin'::app_role)));

-- ============================================================
-- Table: public.tech_issues
-- ============================================================
CREATE POLICY "All staff can view tech issues" ON public.tech_issues
  FOR SELECT TO authenticated
  USING ((has_role(auth.uid(), 'agent'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role) OR has_role(auth.uid(), 'billing'::app_role) OR has_role(auth.uid(), 'sales'::app_role) OR has_role(auth.uid(), 'hr'::app_role)));
CREATE POLICY "Tech/admin can manage tech issues" ON public.tech_issues
  FOR ALL TO authenticated
  USING ((has_role(auth.uid(), 'tech'::app_role) OR has_role(auth.uid(), 'admin'::app_role)))
  WITH CHECK ((has_role(auth.uid(), 'tech'::app_role) OR has_role(auth.uid(), 'admin'::app_role)));

-- ============================================================
-- Table: public.tenant_brand_profiles
-- ============================================================
CREATE POLICY "tenant_brand_profiles_admin_all" ON public.tenant_brand_profiles
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "tenant_brand_profiles_member_select" ON public.tenant_brand_profiles
  FOR SELECT TO authenticated
  USING (is_tenant_member(auth.uid(), (tenant_kind)::text, wl_partner_id, client_lead_id, wl_client_id));
CREATE POLICY "tenant_brand_profiles_supervisor_update" ON public.tenant_brand_profiles
  FOR UPDATE TO authenticated
  USING ((has_role(auth.uid(), 'supervisor'::app_role) AND is_tenant_member(auth.uid(), (tenant_kind)::text, wl_partner_id, client_lead_id, wl_client_id)))
  WITH CHECK ((has_role(auth.uid(), 'supervisor'::app_role) AND is_tenant_member(auth.uid(), (tenant_kind)::text, wl_partner_id, client_lead_id, wl_client_id)));

-- ============================================================
-- Table: public.ticket_replies
-- ============================================================
CREATE POLICY "Admins can manage ticket replies" ON public.ticket_replies
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Staff can add replies in their queue" ON public.ticket_replies
  FOR INSERT TO authenticated
  WITH CHECK ((EXISTS ( SELECT 1);
CREATE POLICY "Users can reply to own tickets" ON public.ticket_replies
  FOR INSERT TO public
  WITH CHECK (((EXISTS ( SELECT 1);

-- ============================================================
-- Table: public.ticket_views
-- ============================================================
CREATE POLICY "Users manage own ticket views" ON public.ticket_views
  FOR ALL TO authenticated
  USING ((user_id = auth.uid()))
  WITH CHECK ((user_id = auth.uid()));

-- ============================================================
-- Table: public.time_off_requests
-- ============================================================
CREATE POLICY "Admins can manage all requests" ON public.time_off_requests
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Agents can create requests" ON public.time_off_requests
  FOR INSERT TO public
  WITH CHECK ((agent_id = auth.uid()));
CREATE POLICY "Agents can view own requests" ON public.time_off_requests
  FOR SELECT TO public
  USING ((agent_id = auth.uid()));
CREATE POLICY "HR can read all time off requests" ON public.time_off_requests
  FOR SELECT TO public
  USING (has_role(auth.uid(), 'hr'::app_role));
CREATE POLICY "HR can update time off requests" ON public.time_off_requests
  FOR UPDATE TO public
  USING (has_role(auth.uid(), 'hr'::app_role));
CREATE POLICY "Supervisors can update requests" ON public.time_off_requests
  FOR UPDATE TO public
  USING (has_role(auth.uid(), 'supervisor'::app_role));
CREATE POLICY "Supervisors can view all requests" ON public.time_off_requests
  FOR SELECT TO public
  USING (has_role(auth.uid(), 'supervisor'::app_role));

-- ============================================================
-- Table: public.training_templates
-- ============================================================
CREATE POLICY "Supervisors and admins can manage training templates" ON public.training_templates
  FOR ALL TO public
  USING ((has_role(auth.uid(), 'supervisor'::app_role) OR has_role(auth.uid(), 'admin'::app_role)));

-- ============================================================
-- Table: public.usage_records
-- ============================================================
CREATE POLICY "Admins can manage all usage records" ON public.usage_records
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Clients can view own usage records" ON public.usage_records
  FOR SELECT TO public
  USING ((client_id = auth.uid()));

-- ============================================================
-- Table: public.user_roles
-- ============================================================
CREATE POLICY "Admins can delete roles" ON public.user_roles
  FOR DELETE TO public
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert roles" ON public.user_roles
  FOR INSERT TO public
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT TO public
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "HR can read all user roles" ON public.user_roles
  FOR SELECT TO public
  USING (has_role(auth.uid(), 'hr'::app_role));
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO public
  USING ((auth.uid() = user_id));

-- ============================================================
-- Table: public.white_label_branding
-- ============================================================
CREATE POLICY "Admins can manage all branding" ON public.white_label_branding
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Partners can insert own branding" ON public.white_label_branding
  FOR INSERT TO public
  WITH CHECK ((partner_id IN ( SELECT white_label_partners.id);

-- ============================================================
-- Table: public.white_label_clients
-- ============================================================
CREATE POLICY "Admins can manage all white label clients" ON public.white_label_clients
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Partners can insert own clients" ON public.white_label_clients
  FOR INSERT TO public
  WITH CHECK ((partner_id IN ( SELECT white_label_partners.id);
CREATE POLICY "WL clients update own record" ON public.white_label_clients
  FOR UPDATE TO authenticated
  USING ((user_id = auth.uid()));
CREATE POLICY "WL clients view own record" ON public.white_label_clients
  FOR SELECT TO authenticated
  USING ((user_id = auth.uid()));

-- ============================================================
-- Table: public.white_label_domain_aliases
-- ============================================================
CREATE POLICY "Anyone can read domain aliases" ON public.white_label_domain_aliases
  FOR SELECT TO public
  USING (true);

-- ============================================================
-- Table: public.white_label_partners
-- ============================================================
CREATE POLICY "Admins can manage all white label partners" ON public.white_label_partners
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can insert own white label application" ON public.white_label_partners
  FOR INSERT TO public
  WITH CHECK (((user_id = auth.uid()) OR (user_id IS NULL)));
CREATE POLICY "Users can update own white label data" ON public.white_label_partners
  FOR UPDATE TO public
  USING ((user_id = auth.uid()));
CREATE POLICY "Users can view own white label data" ON public.white_label_partners
  FOR SELECT TO public
  USING ((user_id = auth.uid()));

-- ============================================================
-- Table: public.wizard_sessions
-- ============================================================
CREATE POLICY "Anon can update unclaimed wizard sessions" ON public.wizard_sessions
  FOR UPDATE TO anon, authenticated
  USING (((session_token IS NOT NULL) AND (is_complete = false) AND (user_id IS NULL) AND (created_at > (now() - '7 days'::interval))))
  WITH CHECK (((session_token IS NOT NULL) AND (user_id IS NULL) AND (is_complete = ANY (ARRAY[true, false]))));
CREATE POLICY "Anyone can create a wizard session" ON public.wizard_sessions
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);
CREATE POLICY "Owners can read own wizard sessions" ON public.wizard_sessions
  FOR SELECT TO authenticated
  USING (((user_id = auth.uid()) OR ((email IS NOT NULL) AND (lower(email) = lower(COALESCE((auth.jwt() ->> 'email'::text), ''::text))))));
CREATE POLICY "Staff can read all wizard sessions" ON public.wizard_sessions
  FOR SELECT TO authenticated
  USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'sales'::app_role) OR has_role(auth.uid(), 'billing'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role) OR has_role(auth.uid(), 'hr'::app_role)));
CREATE POLICY "Staff can update wizard sessions" ON public.wizard_sessions
  FOR UPDATE TO authenticated
  USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'sales'::app_role)))
  WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'sales'::app_role)));

-- ============================================================
-- Table: public.wl_addon_pricing
-- ============================================================
CREATE POLICY "Admin full access on wl_addon_pricing" ON public.wl_addon_pricing
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- Table: public.wl_blog_queue
-- ============================================================
CREATE POLICY "Partners can insert into their own blog queue" ON public.wl_blog_queue
  FOR INSERT TO public
  WITH CHECK ((partner_id IN ( SELECT white_label_partners.id);

-- ============================================================
-- Table: public.wl_call_logs
-- ============================================================
CREATE POLICY "Admin full access on wl_call_logs" ON public.wl_call_logs
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Billing full access on wl_call_logs" ON public.wl_call_logs
  FOR ALL TO public
  USING (has_role(auth.uid(), 'billing'::app_role));
CREATE POLICY "Supervisor view wl_call_logs" ON public.wl_call_logs
  FOR SELECT TO public
  USING (has_role(auth.uid(), 'supervisor'::app_role));
CREATE POLICY "WL clients view own call logs" ON public.wl_call_logs
  FOR SELECT TO authenticated
  USING ((wl_client_id = get_wl_client_id(auth.uid())));

-- ============================================================
-- Table: public.wl_campaign_recipients
-- ============================================================
CREATE POLICY "Admin full access on wl_campaign_recipients" ON public.wl_campaign_recipients
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Billing access on wl_campaign_recipients" ON public.wl_campaign_recipients
  FOR SELECT TO public
  USING (has_role(auth.uid(), 'billing'::app_role));

-- ============================================================
-- Table: public.wl_client_campaigns
-- ============================================================
CREATE POLICY "Admin full access on wl_client_campaigns" ON public.wl_client_campaigns
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Billing access on wl_client_campaigns" ON public.wl_client_campaigns
  FOR ALL TO public
  USING (has_role(auth.uid(), 'billing'::app_role));

-- ============================================================
-- Table: public.wl_client_reviews
-- ============================================================
CREATE POLICY "Admin full access on wl_client_reviews" ON public.wl_client_reviews
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Billing read wl_client_reviews" ON public.wl_client_reviews
  FOR SELECT TO public
  USING (has_role(auth.uid(), 'billing'::app_role));
CREATE POLICY "Supervisor read wl_client_reviews" ON public.wl_client_reviews
  FOR SELECT TO public
  USING (has_role(auth.uid(), 'supervisor'::app_role));
CREATE POLICY "WL clients create own reviews" ON public.wl_client_reviews
  FOR INSERT TO authenticated
  WITH CHECK ((wl_client_id = get_wl_client_id(auth.uid())));
CREATE POLICY "WL clients view own reviews" ON public.wl_client_reviews
  FOR SELECT TO authenticated
  USING ((wl_client_id = get_wl_client_id(auth.uid())));

-- ============================================================
-- Table: public.wl_client_service_config
-- ============================================================
CREATE POLICY "Admin full access on wl_client_service_config" ON public.wl_client_service_config
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Billing full access on wl_client_service_config" ON public.wl_client_service_config
  FOR ALL TO public
  USING (has_role(auth.uid(), 'billing'::app_role));

-- ============================================================
-- Table: public.wl_client_ticket_replies
-- ============================================================
CREATE POLICY "Admin full access on wl_client_ticket_replies" ON public.wl_client_ticket_replies
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "WL clients insert own ticket replies" ON public.wl_client_ticket_replies
  FOR INSERT TO authenticated
  WITH CHECK (((ticket_id IN ( SELECT wl_client_tickets.id);

-- ============================================================
-- Table: public.wl_client_tickets
-- ============================================================
CREATE POLICY "Admin full access on wl_client_tickets" ON public.wl_client_tickets
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "WL clients create own tickets" ON public.wl_client_tickets
  FOR INSERT TO authenticated
  WITH CHECK ((wl_client_id = get_wl_client_id(auth.uid())));
CREATE POLICY "WL clients update own tickets" ON public.wl_client_tickets
  FOR UPDATE TO authenticated
  USING ((wl_client_id = get_wl_client_id(auth.uid())));
CREATE POLICY "WL clients view own tickets" ON public.wl_client_tickets
  FOR SELECT TO authenticated
  USING ((wl_client_id = get_wl_client_id(auth.uid())));

-- ============================================================
-- Table: public.wl_email_connections
-- ============================================================
CREATE POLICY "Admins manage all wl_email_connections" ON public.wl_email_connections
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- Table: public.wl_email_contacts
-- ============================================================
CREATE POLICY "Admins manage all wl_email_contacts" ON public.wl_email_contacts
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- Table: public.wl_email_sends
-- ============================================================
CREATE POLICY "Admins manage all wl_email_sends" ON public.wl_email_sends
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- Table: public.wl_invoices
-- ============================================================
CREATE POLICY "Partners can insert their own invoices" ON public.wl_invoices
  FOR INSERT TO public
  WITH CHECK ((partner_id IN ( SELECT white_label_partners.id);

-- ============================================================
-- Table: public.wl_keyword_tracker
-- ============================================================
CREATE POLICY "Partners can insert their own keywords" ON public.wl_keyword_tracker
  FOR INSERT TO public
  WITH CHECK ((partner_id IN ( SELECT white_label_partners.id);

-- ============================================================
-- Table: public.wl_knowledge_base
-- ============================================================
CREATE POLICY "Admin full access on wl_knowledge_base" ON public.wl_knowledge_base
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- Table: public.wl_newsletter_drafts
-- ============================================================
CREATE POLICY "Partners can insert own drafts" ON public.wl_newsletter_drafts
  FOR INSERT TO public
  WITH CHECK ((partner_id IN ( SELECT white_label_partners.id);

-- ============================================================
-- Table: public.wl_partner_client_portal_access
-- ============================================================
CREATE POLICY "wl_portal_access_partner_insert" ON public.wl_partner_client_portal_access
  FOR INSERT TO public
  WITH CHECK (((partner_id IN ( SELECT white_label_partners.id);

-- ============================================================
-- Table: public.wl_partner_feedback
-- ============================================================
CREATE POLICY "wl_pf_admin_audit_select" ON public.wl_partner_feedback
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "wl_pf_self_select" ON public.wl_partner_feedback
  FOR SELECT TO authenticated
  USING ((submitted_by_user_id = auth.uid()));
CREATE POLICY "wl_pf_user_insert" ON public.wl_partner_feedback
  FOR INSERT TO authenticated
  WITH CHECK ((auth.uid() IS NOT NULL));

-- ============================================================
-- Table: public.wl_partner_feedback_escalations
-- ============================================================
CREATE POLICY "wl_pfe_admin_select" ON public.wl_partner_feedback_escalations
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "wl_pfe_admin_update" ON public.wl_partner_feedback_escalations
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- Table: public.wl_partner_feedback_messages
-- ============================================================
CREATE POLICY "wl_pfm_insert_end_client" ON public.wl_partner_feedback_messages
  FOR INSERT TO authenticated
  WITH CHECK (((author_kind = 'submitter'::text) AND (author_role = 'wl_end_client'::text) AND (author_user_id = auth.uid()) AND (visible_to_submitter = true) AND (EXISTS ( SELECT 1);
CREATE POLICY "wl_pfm_insert_partner_member" ON public.wl_partner_feedback_messages
  FOR INSERT TO authenticated
  WITH CHECK (((author_kind = 'partner'::text) AND (author_user_id = auth.uid()) AND wl_is_partner_member(partner_id, auth.uid()) AND (author_role = ('partner_'::text || wl_partner_member_role(partner_id, auth.uid()))) AND (EXISTS ( SELECT 1);
CREATE POLICY "wl_pfm_select_partner_member" ON public.wl_partner_feedback_messages
  FOR SELECT TO authenticated
  USING (wl_is_partner_member(partner_id, auth.uid()));

-- ============================================================
-- Table: public.wl_partner_handoff_documents
-- ============================================================
CREATE POLICY "Partner can insert own handoff docs" ON public.wl_partner_handoff_documents
  FOR INSERT TO authenticated
  WITH CHECK (((partner_id IN ( SELECT white_label_partners.id);

-- ============================================================
-- Table: public.wl_partner_handoff_items
-- ============================================================
CREATE POLICY "Partner can insert own handoff items" ON public.wl_partner_handoff_items
  FOR INSERT TO authenticated
  WITH CHECK (((partner_id IN ( SELECT white_label_partners.id);

-- ============================================================
-- Table: public.wl_partner_handoff_requests
-- ============================================================
CREATE POLICY "Admin can delete handoff requests" ON public.wl_partner_handoff_requests
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin can insert handoff requests" ON public.wl_partner_handoff_requests
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Supervisor can insert handoff requests" ON public.wl_partner_handoff_requests
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'supervisor'::app_role));
CREATE POLICY "Supervisor can update handoff requests" ON public.wl_partner_handoff_requests
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'supervisor'::app_role))
  WITH CHECK (has_role(auth.uid(), 'supervisor'::app_role));

-- ============================================================
-- Table: public.wl_partner_leads
-- ============================================================
CREATE POLICY "wl_partner_leads partner insert" ON public.wl_partner_leads
  FOR INSERT TO public
  WITH CHECK (((partner_id IN ( SELECT white_label_partners.id);

-- ============================================================
-- Table: public.wl_partner_members
-- ============================================================
CREATE POLICY "wl_pm_select_self" ON public.wl_partner_members
  FOR SELECT TO authenticated
  USING ((user_id = auth.uid()));

-- ============================================================
-- Table: public.wl_partner_onboarding_handoffs
-- ============================================================
CREATE POLICY "wl_handoffs_partner_insert" ON public.wl_partner_onboarding_handoffs
  FOR INSERT TO public
  WITH CHECK (((partner_id IN ( SELECT white_label_partners.id);

-- ============================================================
-- Table: public.wl_partner_proposal_activity
-- ============================================================
CREATE POLICY "Partner owners and admins can insert proposal activity" ON public.wl_partner_proposal_activity
  FOR INSERT TO authenticated
  WITH CHECK (((partner_id IN ( SELECT white_label_partners.id);

-- ============================================================
-- Table: public.wl_partner_proposal_shares
-- ============================================================
CREATE POLICY "wl_proposal_shares_insert_owner" ON public.wl_partner_proposal_shares
  FOR INSERT TO authenticated
  WITH CHECK (((partner_id IN ( SELECT white_label_partners.id);

-- ============================================================
-- Table: public.wl_partner_proposals
-- ============================================================
CREATE POLICY "Partners can insert own proposals" ON public.wl_partner_proposals
  FOR INSERT TO authenticated
  WITH CHECK (((partner_id IN ( SELECT white_label_partners.id);

-- ============================================================
-- Table: public.wl_partner_tasks
-- ============================================================
CREATE POLICY "wl_tasks_partner_insert" ON public.wl_partner_tasks
  FOR INSERT TO public
  WITH CHECK (((partner_id IN ( SELECT white_label_partners.id);

-- ============================================================
-- Table: public.wl_partner_usage_summary
-- ============================================================
CREATE POLICY "Admin full access on wl_partner_usage_summary" ON public.wl_partner_usage_summary
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Billing full access on wl_partner_usage_summary" ON public.wl_partner_usage_summary
  FOR ALL TO public
  USING (has_role(auth.uid(), 'billing'::app_role));

-- ============================================================
-- Table: public.wl_seo_reports
-- ============================================================
CREATE POLICY "Partners can insert own reports" ON public.wl_seo_reports
  FOR INSERT TO public
  WITH CHECK ((partner_id IN ( SELECT white_label_partners.id);

-- ============================================================
-- Table: public.wl_social_snippets
-- ============================================================
CREATE POLICY "Partners can insert own snippets" ON public.wl_social_snippets
  FOR INSERT TO public
  WITH CHECK ((partner_id IN ( SELECT white_label_partners.id);

-- ============================================================
-- Table: public.wl_terms_agreements
-- ============================================================
CREATE POLICY "Admin full access on wl_terms_agreements" ON public.wl_terms_agreements
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Partners can sign agreements" ON public.wl_terms_agreements
  FOR INSERT TO public
  WITH CHECK ((partner_id IN ( SELECT white_label_partners.id);

-- ============================================================
-- Table: public.wl_ticket_forwards
-- ============================================================
CREATE POLICY "wl_ticket_forwards_admin_all" ON public.wl_ticket_forwards
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- Table: public.wl_usage_records
-- ============================================================
CREATE POLICY "Admin full access on wl_usage_records" ON public.wl_usage_records
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Billing full access on wl_usage_records" ON public.wl_usage_records
  FOR ALL TO public
  USING (has_role(auth.uid(), 'billing'::app_role));
CREATE POLICY "WL clients view own usage" ON public.wl_usage_records
  FOR SELECT TO authenticated
  USING ((wl_client_id = get_wl_client_id(auth.uid())));

-- ============================================================
-- Table: public.wl_wholesale_pricing
-- ============================================================
CREATE POLICY "Admin full access on wl_wholesale_pricing" ON public.wl_wholesale_pricing
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Billing full access on wl_wholesale_pricing" ON public.wl_wholesale_pricing
  FOR ALL TO public
  USING (has_role(auth.uid(), 'billing'::app_role));

-- ============================================================
-- Table: public.wl_wordpress_connections
-- ============================================================
CREATE POLICY "Partners can insert their own WP connection" ON public.wl_wordpress_connections
  FOR INSERT TO public
  WITH CHECK ((partner_id IN ( SELECT white_label_partners.id)))

