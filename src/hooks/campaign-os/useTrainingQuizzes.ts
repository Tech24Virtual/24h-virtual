import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TrainingLesson {
  id: string;
  module_id: string;
  kind: 'content' | 'acknowledgement' | 'quiz';
  title: string;
  body_md: string | null;
  passing_score: number | null;
  sort_order: number;
}

export interface QuizQuestionRow {
  id: string;
  lesson_id: string;
  question: string;
  choices: string[];
  correct_index: number;
  explanation: string | null;
  sort_order: number;
}

export interface QuizAttemptRow {
  id: string;
  lesson_id: string;
  agent_id: string;
  score_pct: number;
  passed: boolean;
  answers: any;
  created_at: string;
}

export interface QuizAttemptSummary {
  lesson_id: string;
  score: number;
  passed: boolean;
}

/** The current agent's attempts for a set of quiz lessons — used to persist pass/fail across dialog re-opens. */
export function useMyQuizAttempts(lessonIds: string[]) {
  return useQuery({
    queryKey: ['campaign-os', 'my-quiz-attempts', lessonIds.slice().sort().join(',')],
    enabled: lessonIds.length > 0,
    queryFn: async (): Promise<QuizAttemptSummary[]> => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data, error } = await (supabase as any)
        .from('campaign_training_quiz_attempts')
        .select('lesson_id, score, passed')
        .eq('agent_id', u.user.id)
        .in('lesson_id', lessonIds);
      if (error) throw error;
      return (data ?? []) as QuizAttemptSummary[];
    },
  });
}

export function useModuleLessons(moduleId?: string | null) {
  return useQuery({
    queryKey: ['campaign-os', 'lessons', moduleId ?? 'none'],
    enabled: !!moduleId,
    queryFn: async (): Promise<TrainingLesson[]> => {
      const { data, error } = await (supabase as any)
        .from('campaign_training_lessons')
        .select('*')
        .eq('module_id', moduleId)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as TrainingLesson[];
    },
  });
}

export function useQuizQuestions(lessonId?: string | null) {
  return useQuery({
    queryKey: ['campaign-os', 'quiz-questions', lessonId ?? 'none'],
    enabled: !!lessonId,
    queryFn: async (): Promise<QuizQuestionRow[]> => {
      const { data, error } = await (supabase as any)
        .from('campaign_training_quiz_questions')
        .select('*')
        .eq('lesson_id', lessonId)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as QuizQuestionRow[];
    },
  });
}

export function useUpsertLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<TrainingLesson> & { module_id: string }) => {
      if (input.id) {
        const { id, ...update } = input;
        const { data, error } = await (supabase as any)
          .from('campaign_training_lessons')
          .update(update)
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await (supabase as any)
        .from('campaign_training_lessons')
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['campaign-os', 'lessons', vars.module_id] });
    },
  });
}

export function useDeleteLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, module_id: _m }: { id: string; module_id: string }) => {
      const { error } = await (supabase as any)
        .from('campaign_training_lessons')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['campaign-os', 'lessons', vars.module_id] });
    },
  });
}

export function useReorderLessons() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      module_id,
      ordered_ids,
    }: {
      module_id: string;
      ordered_ids: string[];
    }) => {
      // Persist new sort_order for each lesson
      await Promise.all(
        ordered_ids.map((id, idx) =>
          (supabase as any)
            .from('campaign_training_lessons')
            .update({ sort_order: idx + 1 })
            .eq('id', id)
        )
      );
    },
    onMutate: async ({ module_id, ordered_ids }) => {
      await qc.cancelQueries({ queryKey: ['campaign-os', 'lessons', module_id] });
      const prev = qc.getQueryData<TrainingLesson[]>([
        'campaign-os',
        'lessons',
        module_id,
      ]);
      if (prev) {
        const byId = new Map(prev.map((l) => [l.id, l]));
        const next = ordered_ids
          .map((id, idx) => {
            const l = byId.get(id);
            return l ? { ...l, sort_order: idx + 1 } : null;
          })
          .filter(Boolean) as TrainingLesson[];
        qc.setQueryData(['campaign-os', 'lessons', module_id], next);
      }
      return { prev };
    },
    onError: (_e, vars, ctx) => {
      if (ctx?.prev) {
        qc.setQueryData(['campaign-os', 'lessons', vars.module_id], ctx.prev);
      }
    },
    onSettled: (_d, _e, vars) => {
      qc.invalidateQueries({ queryKey: ['campaign-os', 'lessons', vars.module_id] });
    },
  });
}

export function useUpsertQuizQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<QuizQuestionRow> & { lesson_id: string }) => {
      if (input.id) {
        const { id, ...update } = input;
        const { data, error } = await (supabase as any)
          .from('campaign_training_quiz_questions')
          .update(update)
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await (supabase as any)
        .from('campaign_training_quiz_questions')
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['campaign-os', 'quiz-questions', vars.lesson_id] });
    },
  });
}

export function useDeleteQuizQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, lesson_id: _l }: { id: string; lesson_id: string }) => {
      const { error } = await (supabase as any)
        .from('campaign_training_quiz_questions')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['campaign-os', 'quiz-questions', vars.lesson_id] });
    },
  });
}

export function useSubmitQuizAttempt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      lesson_id: string;
      module_id: string;
      campaign_id: string;
      score_pct: number;
      passed: boolean;
      answers: any;
    }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error('Not authenticated');
      const { data, error } = await (supabase as any)
        .from('campaign_training_quiz_attempts')
        .insert({
          lesson_id: input.lesson_id,
          module_id: input.module_id,
          campaign_id: input.campaign_id,
          agent_id: u.user.id,
          score: input.score_pct,
          passed: input.passed,
          answers: input.answers,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaign-os', 'training-coverage'] });
      qc.invalidateQueries({ queryKey: ['campaign-os', 'my-quiz-attempts'] });
    },
  });
}
