-- Demo data applied to staging 2026-07-22. Seeds: sales_targets, sales_commissions,
-- meetings, crm_activities, hr_communications, job_postings, contracts.
-- IDs reference specific qa-* test users/leads on staging (see e2e/helpers/auth.ts) --
-- re-running against a different environment will need those UUIDs swapped.

INSERT INTO public.sales_targets (user_id, period_start, period_end, target_leads, actual_leads, target_conversions, actual_conversions, target_revenue, actual_revenue)
VALUES
  ('91b5dc51-cb71-44c7-92f6-80d90db8ca74', '2026-07-01', '2026-07-31', 30, 18, 8, 5, 15000, 9500),
  ('91b5dc51-cb71-44c7-92f6-80d90db8ca74', '2026-06-01', '2026-06-30', 25, 24, 6, 7, 12000, 13200);

INSERT INTO public.sales_commissions (sales_rep_id, lead_id, commission_amount, status, created_at)
SELECT
  '91b5dc51-cb71-44c7-92f6-80d90db8ca74',
  id,
  CASE pipeline_stage
    WHEN 'won' THEN 450.00
    WHEN 'active' THEN 380.00
    ELSE 200.00
  END,
  CASE row_number() OVER (ORDER BY created_at)
    WHEN 1 THEN 'paid'
    WHEN 2 THEN 'paid'
    WHEN 3 THEN 'approved'
    ELSE 'pending'
  END,
  now() - (row_number() OVER (ORDER BY created_at) * interval '5 days')
FROM public.leads
LIMIT 4;

INSERT INTO public.meetings (attendee_name, attendee_email, event_type, scheduled_at, duration_minutes, status, notes, assigned_to)
VALUES
  ('John Smith', 'john.smith@example.com', 'Discovery Call', now() + interval '2 hours', 30, 'scheduled', 'Interested in AI Receptionist plan', '91b5dc51-cb71-44c7-92f6-80d90db8ca74'),
  ('Sarah Johnson', 'sarah.j@techcorp.com', 'Product Demo', now() + interval '1 day', 45, 'scheduled', 'Looking for 500 min plan', '91b5dc51-cb71-44c7-92f6-80d90db8ca74'),
  ('Mike Davis', 'mike@lawfirm.com', 'Follow-up Call', now() - interval '1 day', 30, 'completed', 'Sent proposal after call', '91b5dc51-cb71-44c7-92f6-80d90db8ca74'),
  ('Emma Wilson', 'emma@dental.com', 'Discovery Call', now() - interval '3 days', 30, 'completed', 'Very interested, needs board approval', '91b5dc51-cb71-44c7-92f6-80d90db8ca74'),
  ('Robert Chen', 'rchen@clinic.com', 'Product Demo', now() - interval '5 days', 60, 'no_show', 'Rescheduling needed', '91b5dc51-cb71-44c7-92f6-80d90db8ca74');

INSERT INTO public.crm_activities (lead_id, created_by, activity_type, title, description, created_at)
SELECT l.id, '91b5dc51-cb71-44c7-92f6-80d90db8ca74', a.activity_type, a.title, a.description, now() - (a.days_ago * interval '1 day')
FROM (
  VALUES
    (1, 'call', 'Call: John Smith', 'Called John Smith re: AI Receptionist'),
    (2, 'call', 'Call: Sarah Johnson', 'Follow-up with Sarah Johnson'),
    (3, 'email', 'Email: Mike Davis', 'Sent proposal to Mike Davis'),
    (4, 'email', 'Email: Emma Wilson', 'Intro email to Emma Wilson'),
    (5, 'meeting', 'Meeting: Robert Chen', 'Demo with Robert Chen'),
    (6, 'call', 'Cold call batch', 'Cold call batch - 5 contacts'),
    (7, 'email', 'Newsletter', 'Newsletter to pipeline leads'),
    (8, 'meeting', 'Pipeline review', 'Team pipeline review')
) AS a(days_ago, activity_type, title, description)
JOIN LATERAL (
  SELECT id FROM public.leads ORDER BY created_at
  LIMIT 1 OFFSET ((a.days_ago - 1) % (SELECT COUNT(*) FROM public.leads))
) l ON true;

INSERT INTO public.hr_communications (from_user_id, to_user_id, subject, message, category, read_at, created_at)
VALUES
  ('5239255f-c4e2-45f4-acab-d4afc2dcfe5d', NULL, 'July Payroll Processing', 'Payroll for July will be processed on July 25th. Please ensure all timesheets are submitted by July 24th EOD.', 'announcement', null, now() - interval '2 days'),
  ('5239255f-c4e2-45f4-acab-d4afc2dcfe5d', '6518cd1a-fda8-4c61-96d0-fa5adfbb2056', 'Time Off Request Approved', 'Your time off request for July 28-29 has been approved. Enjoy your break!', 'general', null, now() - interval '1 day'),
  ('5239255f-c4e2-45f4-acab-d4afc2dcfe5d', 'a82dd8b4-4e3b-41e3-b5dc-1767b5b5e3e4', 'Onboarding Reminder', 'Please complete your banking details in the system before Friday.', 'general', null, now() - interval '3 hours'),
  ('5239255f-c4e2-45f4-acab-d4afc2dcfe5d', NULL, 'New HR Policy Update', 'Updated remote work policy is now live. Please review the HR portal for details.', 'policy', null, now() - interval '5 days');

INSERT INTO public.job_postings (title, department, location, description, requirements, status, created_at)
VALUES
  ('Virtual Receptionist Agent', 'Operations', 'Remote', 'We are looking for a professional Virtual Receptionist Agent to handle inbound calls and customer inquiries.', 'Excellent communication skills, 1+ years customer service experience, reliable internet connection', 'open', now() - interval '7 days'),
  ('Senior Sales Representative', 'Sales', 'Remote', 'Join our growing sales team to help businesses discover the power of AI-powered reception services.', 'Proven B2B sales track record, CRM experience, strong negotiation skills', 'open', now() - interval '14 days'),
  ('QA & Training Specialist', 'HR', 'Remote', 'Help us maintain quality standards by reviewing agent calls and developing training materials.', 'Call center QA experience, strong attention to detail, excellent written communication', 'open', now() - interval '3 days'),
  ('Billing Coordinator', 'Finance', 'Remote', 'Manage client billing, process payments, and handle billing inquiries.', 'Accounting background, experience with SaaS billing, detail-oriented', 'closed', now() - interval '30 days');

INSERT INTO public.contracts (user_id, title, document_url, status, signed_at, expires_at, created_at)
VALUES
  ('6518cd1a-fda8-4c61-96d0-fa5adfbb2056', 'Agent Employment Agreement - Jones', 'https://docs.example.com/contracts/jones-2026.pdf', 'signed', now() - interval '180 days', '2027-01-14', now() - interval '180 days'),
  ('a82dd8b4-4e3b-41e3-b5dc-1767b5b5e3e4', 'Agent Employment Agreement - QA Agent', 'https://docs.example.com/contracts/qa-agent-2026.pdf', 'signed', now() - interval '120 days', '2027-02-28', now() - interval '120 days'),
  ('6518cd1a-fda8-4c61-96d0-fa5adfbb2056', 'Non-Disclosure Agreement - Jones', 'https://docs.example.com/contracts/jones-nda.pdf', 'signed', now() - interval '180 days', '2031-01-14', now() - interval '180 days'),
  ('a82dd8b4-4e3b-41e3-b5dc-1767b5b5e3e4', 'Performance Bonus Agreement', null, 'pending', null, '2026-12-31', now() - interval '30 days');
