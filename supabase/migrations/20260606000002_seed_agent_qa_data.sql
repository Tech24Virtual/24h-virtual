-- QA data seed: assign qa-agent to qa-client and seed approved client-scoped
-- FAQs + policies so the agent FAQ/Policy tabs have real content to display.
--
-- IDs confirmed against staging:
--   qa-agent user_id  : a82dd8b4-4e3b-41e3-b5dc-1767b5b5e3e4
--   qa-client lead_id : 15bb3903-7f9d-4b3e-8d99-c017fc1bfc22
--   department id     : 953d7a46-cd6b-49dc-8e06-7ca8d4343864  (Test Call Flow)

-- 1. Assign qa-agent to qa-client (idempotent)
INSERT INTO public.client_agent_assignments (client_id, agent_id, is_primary, notes)
VALUES (
  '15bb3903-7f9d-4b3e-8d99-c017fc1bfc22',
  'a82dd8b4-4e3b-41e3-b5dc-1767b5b5e3e4',
  true,
  'QA test assignment — agent portal FAQ/Policy lookup testing'
)
ON CONFLICT DO NOTHING;

-- 2. Seed approved client-scoped FAQs for qa-client
INSERT INTO public.campaign_faq_entries
  (tenant_kind, client_lead_id, scope, client_department_id, question, answer_md, status, version, tags)
VALUES
  (
    'direct_24h',
    '15bb3903-7f9d-4b3e-8d99-c017fc1bfc22',
    'client',
    NULL,
    'What are your business hours?',
    'We are open **Monday through Friday, 8 AM – 6 PM EST**. After-hours calls are handled by our 24H Virtual team.',
    'approved', 1, ARRAY['hours','availability']
  ),
  (
    'direct_24h',
    '15bb3903-7f9d-4b3e-8d99-c017fc1bfc22',
    'client',
    NULL,
    'How do I schedule an appointment?',
    'You can schedule an appointment by:
1. Calling our main line during business hours
2. Using the online booking portal at our website
3. Requesting a callback — an agent will call you within 2 hours',
    'approved', 1, ARRAY['appointments','scheduling']
  ),
  (
    'direct_24h',
    '15bb3903-7f9d-4b3e-8d99-c017fc1bfc22',
    'client',
    NULL,
    'What payment methods do you accept?',
    'We accept the following payment methods:
- **Credit/Debit cards** (Visa, MasterCard, Amex)
- **ACH/Bank transfer**
- **Check** (payable to QA Client Inc.)

All payments are processed securely.',
    'approved', 1, ARRAY['billing','payments']
  ),
  (
    'direct_24h',
    '15bb3903-7f9d-4b3e-8d99-c017fc1bfc22',
    'department',
    '953d7a46-cd6b-49dc-8e06-7ca8d4343864',
    'How do I reach the billing department?',
    'For billing inquiries, press **2** on the main menu or ask to be transferred to billing. Billing hours are **9 AM – 5 PM EST, Monday–Friday**.',
    'approved', 1, ARRAY['billing','transfer']
  );

-- 3. Seed approved client-scoped policies for qa-client
INSERT INTO public.campaign_policy_blocks
  (tenant_kind, client_lead_id, scope, client_department_id, policy_kind, title, body_md, status, version, tags)
VALUES
  (
    'direct_24h',
    '15bb3903-7f9d-4b3e-8d99-c017fc1bfc22',
    'client',
    NULL,
    'service_rule',
    'Do Not Discuss Pending Litigation',
    'Agents **must not** discuss, acknowledge, or comment on any pending or past litigation involving the client.

If a caller raises this topic, respond with:
> "I''m not able to discuss that. I can connect you with our legal department — would that be helpful?"

Then offer a transfer or callback.',
    'approved', 1, ARRAY['legal','restricted']
  ),
  (
    'direct_24h',
    '15bb3903-7f9d-4b3e-8d99-c017fc1bfc22',
    'client',
    NULL,
    'escalation_rule',
    'Escalation: Angry or Abusive Callers',
    'If a caller becomes verbally abusive:
1. Calmly state: *"I want to help you, but I need us to keep this conversation respectful."*
2. If behaviour continues, inform the caller: *"I will need to end this call if the language continues."*
3. After a second warning, disconnect and log the call with disposition **ABUSIVE_CALLER**.
4. Notify your supervisor immediately.',
    'approved', 1, ARRAY['escalation','conduct']
  ),
  (
    'direct_24h',
    '15bb3903-7f9d-4b3e-8d99-c017fc1bfc22',
    'department',
    '953d7a46-cd6b-49dc-8e06-7ca8d4343864',
    'general_policy',
    'Callback SLA — Test Call Flow',
    'All callback requests logged in the Test Call Flow department must be returned within **2 business hours**.

If the SLA cannot be met, the agent must:
- Update the ticket status to **CALLBACK_DELAYED**
- Log the reason in the notes field
- Notify the supervisor on duty',
    'approved', 1, ARRAY['callbacks','sla']
  );
