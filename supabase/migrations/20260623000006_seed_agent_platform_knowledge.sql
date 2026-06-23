-- Seed agent dashboard knowledge for PiP support assistant
INSERT INTO platform_knowledge (dashboard, title, description, content_type, sort_order, is_active)
VALUES
('agent', 'How do I clock in?', 'Go to your dashboard and click the Clock In button at the top. Your shift timer will start immediately. You can also clock out from the same button when your shift ends.', 'faq', 1, true),
('agent', 'How do I submit my timesheet?', 'Go to Schedule → Shifts. At the end of your pay period, click Submit Invoice. Your supervisor will review and approve it.', 'faq', 2, true),
('agent', 'How do I find my assigned clients?', 'Click Clients in the sidebar to see all clients assigned to you. You can search by name or company and see their last call date.', 'faq', 3, true),
('agent', 'How do I complete my training?', 'Go to Training in the sidebar. Click Start Training on any module, read the content, check the acknowledgement box and click Mark Complete. Your supervisor will then approve your completion.', 'faq', 4, true),
('agent', 'Where are the call scripts?', 'Go to Scripts in the sidebar. You will find three tabs: Scripts (call scripts), FAQs (common questions), and Policies (company policies). All information you need for calls is here.', 'faq', 5, true),
('agent', 'How do outbound calls work?', 'Go to Outbound in the sidebar. You will see a queue of callback requests from clients. Claim a request to take ownership, call the contact using the number shown, then log the outcome (reached/no answer/voicemail).', 'faq', 6, true),
('agent', 'How do I request time off?', 'Go to Schedule → Time Off. Click Request Time Off, fill in the dates and reason, and submit. Your supervisor will approve or deny the request.', 'faq', 7, true),
('agent', 'How do I view my schedule?', 'Go to Schedule → Schedule to see your upcoming shifts. You can also see open shifts available to claim under Schedule → Shifts.', 'faq', 8, true),
('agent', 'What is the Workspace page?', 'The Workspace is your main working area. It has 4 modes: Chats (messages), Tickets (support tickets), Tasks (assigned tasks), and Outbound (callback queue). Switch between them using the tabs.', 'faq', 9, true),
('agent', 'How do I view my onboarding progress?', 'Go to Profile → Onboarding to see your onboarding journey. You can check off completed training items and see which steps are pending supervisor approval.', 'faq', 10, true),
('agent', 'How do I get help?', 'You can ask me anything here in the Support page! For urgent issues contact your supervisor directly. For technical issues use the Submit a Request form above.', 'faq', 11, true)
ON CONFLICT DO NOTHING;
