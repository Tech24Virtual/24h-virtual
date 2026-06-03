
DO $$
DECLARE
  v_set_id uuid;
BEGIN
  SELECT id INTO v_set_id FROM public.disc_faq_sets WHERE name = 'Receptionist Basics' LIMIT 1;
  IF v_set_id IS NULL THEN RETURN; END IF;

  INSERT INTO public.disc_faqs (faq_set_id, question, answer_short, answer_full, display_order, active)
  SELECT v_set_id, q.q, q.s, q.a, q.ord, true
  FROM (VALUES
    ('How quickly can 24H Virtual start answering my calls?',
     'Most accounts go live within 3 to 5 business days after onboarding.',
     'After your consultation we build your script, configure call routing, and run a short training cycle with your assigned agents. Most accounts go live within 3 to 5 business days, and we can accelerate that for urgent launches.',
     10),
    ('Do you charge per call or per minute?',
     'We bill by the minute on transparent monthly plans with no per call surcharge.',
     'You pick a monthly plan that fits your call volume and we bill by the minute. There is no per call fee, no setup fee, and no surprise charges. If you need more minutes one month we apply a clear overage rate that is published up front.',
     11),
    ('Can your team follow my custom call handling rules?',
     'Yes. Every account has a custom script with routing, escalation, and message rules.',
     'Your script is the source of truth for how we answer, qualify, route, and escalate calls. You can update it any time and changes propagate to your team within minutes. We also support after hours rules, holiday schedules, and VIP routing.',
     12),
    ('What happens if a call needs to reach me right away?',
     'We escalate per your rules by phone, SMS, email, or Slack within seconds.',
     'Your script defines what counts as urgent and how we should reach you. We can call your mobile, send an SMS, ping a shared inbox, or post to a Slack channel. Escalations are logged so you can audit response time end to end.',
     13),
    ('Do you serve businesses outside major metros?',
     'Yes. Our agents work remotely so we serve businesses in any city across the country.',
     'Because our team works from secure remote facilities, geography never limits coverage. We support businesses in major metros, mid sized cities, and smaller markets with the same response time and quality standard.',
     14)
  ) AS q(q, s, a, ord)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.disc_faqs f
    WHERE f.faq_set_id = v_set_id AND f.question = q.q
  );
END $$;

UPDATE public.disc_keywords k
SET default_faq_set_id = (SELECT id FROM public.disc_faq_sets WHERE name = 'Receptionist Basics' LIMIT 1)
WHERE k.default_faq_set_id IS NULL;

DO $$
DECLARE
  v_pillar_set uuid;
  v_industry_set uuid;
BEGIN
  SELECT id INTO v_pillar_set FROM public.disc_internal_link_sets WHERE name = 'Core Service Pillars' LIMIT 1;
  SELECT id INTO v_industry_set FROM public.disc_internal_link_sets WHERE name = 'Industry Hubs' LIMIT 1;

  IF v_pillar_set IS NOT NULL THEN
    INSERT INTO public.disc_internal_link_items (link_set_id, anchor_text, target_url, target_type, display_order, active)
    SELECT v_pillar_set, x.anchor, x.url, 'pillar', x.ord, true
    FROM (VALUES
      ('See our virtual receptionist plans', '/services/virtual-receptionist', 1),
      ('Explore the AI receptionist', '/services/ai-receptionist', 2),
      ('Read how 24H Virtual works', '/how-it-works', 3),
      ('Book a free consultation', '/contact', 4)
    ) AS x(anchor, url, ord)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.disc_internal_link_items WHERE link_set_id = v_pillar_set AND target_url = x.url
    );
  END IF;

  IF v_industry_set IS NOT NULL THEN
    INSERT INTO public.disc_internal_link_items (link_set_id, anchor_text, target_url, target_type, display_order, active)
    SELECT v_industry_set, x.anchor, x.url, 'cluster', x.ord, true
    FROM (VALUES
      ('Answering services for law firms', '/industries/law-firms', 1),
      ('Answering services for medical clinics', '/industries/medical', 2),
      ('Answering services for dental practices', '/industries/dental', 3),
      ('Answering services for home services', '/industries/home-services', 4),
      ('Answering services for real estate', '/industries/real-estate', 5)
    ) AS x(anchor, url, ord)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.disc_internal_link_items WHERE link_set_id = v_industry_set AND target_url = x.url
    );
  END IF;
END $$;
