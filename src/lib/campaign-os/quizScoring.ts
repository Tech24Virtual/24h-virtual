// Pure quiz-scoring logic. Deterministic, no I/O.

export interface QuizQuestion {
  id: string;
  prompt: string;
  choices: Array<{ id: string; text: string; correct: boolean }>;
}

export interface QuizAttemptAnswer {
  question_id: string;
  choice_id: string | null;
}

export interface QuizScoreResult {
  total: number;
  correct: number;
  scorePct: number;
  passed: boolean;
}

export function scoreQuizAttempt(
  questions: QuizQuestion[],
  answers: QuizAttemptAnswer[],
  passingPct: number,
): QuizScoreResult {
  const total = questions.length;
  if (total === 0) {
    return { total: 0, correct: 0, scorePct: 0, passed: false };
  }
  const answerMap = new Map(answers.map((a) => [a.question_id, a.choice_id]));
  let correct = 0;
  for (const q of questions) {
    const picked = answerMap.get(q.id) ?? null;
    if (!picked) continue;
    const choice = q.choices.find((c) => c.id === picked);
    if (choice?.correct) correct += 1;
  }
  const scorePct = Math.round((correct / total) * 100);
  return {
    total,
    correct,
    scorePct,
    passed: scorePct >= passingPct,
  };
}
