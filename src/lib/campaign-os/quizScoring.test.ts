import { describe, expect, it } from 'vitest';
import { scoreQuizAttempt, type QuizQuestion } from './quizScoring';

const questions: QuizQuestion[] = [
  {
    id: 'q1',
    prompt: '2 + 2',
    choices: [
      { id: 'a', text: '3', correct: false },
      { id: 'b', text: '4', correct: true },
    ],
  },
  {
    id: 'q2',
    prompt: 'Capital of France',
    choices: [
      { id: 'a', text: 'Paris', correct: true },
      { id: 'b', text: 'Lyon', correct: false },
    ],
  },
  {
    id: 'q3',
    prompt: 'Sky color',
    choices: [
      { id: 'a', text: 'Green', correct: false },
      { id: 'b', text: 'Blue', correct: true },
    ],
  },
];

describe('quizScoring', () => {
  it('passes when score meets threshold', () => {
    const result = scoreQuizAttempt(
      questions,
      [
        { question_id: 'q1', choice_id: 'b' },
        { question_id: 'q2', choice_id: 'a' },
        { question_id: 'q3', choice_id: 'b' },
      ],
      80,
    );
    expect(result.scorePct).toBe(100);
    expect(result.passed).toBe(true);
  });

  it('fails when score is below threshold', () => {
    const result = scoreQuizAttempt(
      questions,
      [
        { question_id: 'q1', choice_id: 'a' },
        { question_id: 'q2', choice_id: 'a' },
        { question_id: 'q3', choice_id: 'a' },
      ],
      80,
    );
    expect(result.scorePct).toBe(33);
    expect(result.passed).toBe(false);
  });

  it('handles unanswered questions as incorrect', () => {
    const result = scoreQuizAttempt(
      questions,
      [{ question_id: 'q1', choice_id: 'b' }],
      50,
    );
    expect(result.correct).toBe(1);
    expect(result.passed).toBe(false);
  });

  it('returns zero on empty quiz', () => {
    const result = scoreQuizAttempt([], [], 80);
    expect(result.total).toBe(0);
    expect(result.passed).toBe(false);
  });
});
