-- Phase F: Quizzes
CREATE TABLE public.campaign_training_lessons (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id uuid NOT NULL REFERENCES public.campaign_training_modules(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('content','acknowledgement','quiz')),
  title text NOT NULL,
  body_md text NOT NULL DEFAULT '',
  sort_order int NOT NULL DEFAULT 0,
  passing_score int NOT NULL DEFAULT 80 CHECK (passing_score BETWEEN 0 AND 100),
  required boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ctl_module ON public.campaign_training_lessons(module_id, sort_order);
ALTER TABLE public.campaign_training_lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and supervisors manage lessons"
  ON public.campaign_training_lessons FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'supervisor'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'supervisor'));

CREATE POLICY "Agents read lessons on visible modules"
  ON public.campaign_training_lessons FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.campaign_training_modules m
      WHERE m.id = module_id AND m.status = 'published'
    )
    AND public.has_role(auth.uid(), 'agent')
  );

CREATE TRIGGER trg_ctl_updated_at
  BEFORE UPDATE ON public.campaign_training_lessons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.campaign_training_quiz_questions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id uuid NOT NULL REFERENCES public.campaign_training_lessons(id) ON DELETE CASCADE,
  question text NOT NULL,
  choices jsonb NOT NULL DEFAULT '[]'::jsonb,
  correct_index int NOT NULL DEFAULT 0,
  explanation text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ctqq_lesson ON public.campaign_training_quiz_questions(lesson_id, sort_order);
ALTER TABLE public.campaign_training_quiz_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and supervisors manage questions"
  ON public.campaign_training_quiz_questions FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'supervisor'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'supervisor'));

CREATE POLICY "Agents read questions on visible lessons"
  ON public.campaign_training_quiz_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.campaign_training_lessons l
      JOIN public.campaign_training_modules m ON m.id = l.module_id
      WHERE l.id = lesson_id AND m.status = 'published'
    )
    AND public.has_role(auth.uid(), 'agent')
  );

CREATE TABLE public.campaign_training_quiz_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id uuid NOT NULL REFERENCES public.campaign_training_lessons(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES public.campaign_training_modules(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  score int NOT NULL DEFAULT 0,
  passed boolean NOT NULL DEFAULT false,
  attempted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ctqa_agent ON public.campaign_training_quiz_attempts(agent_id, lesson_id, attempted_at DESC);
CREATE INDEX idx_ctqa_campaign ON public.campaign_training_quiz_attempts(campaign_id);
ALTER TABLE public.campaign_training_quiz_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents insert their own attempts"
  ON public.campaign_training_quiz_attempts FOR INSERT
  WITH CHECK (auth.uid() = agent_id);

CREATE POLICY "Agents read their own attempts"
  ON public.campaign_training_quiz_attempts FOR SELECT
  USING (auth.uid() = agent_id);

CREATE POLICY "Admins and supervisors manage attempts"
  ON public.campaign_training_quiz_attempts FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'supervisor'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'supervisor'));

-- Helper view: agent has passed every required quiz on a module?
CREATE OR REPLACE VIEW public.campaign_training_module_quiz_status
WITH (security_invoker='true') AS
SELECT
  m.id AS module_id,
  l.id AS lesson_id,
  a.agent_id,
  bool_or(a.passed) AS passed,
  max(a.score) AS best_score
FROM public.campaign_training_modules m
JOIN public.campaign_training_lessons l ON l.module_id = m.id AND l.kind = 'quiz' AND l.required = true
LEFT JOIN public.campaign_training_quiz_attempts a ON a.lesson_id = l.id
GROUP BY m.id, l.id, a.agent_id;

GRANT SELECT ON public.campaign_training_module_quiz_status TO authenticated;