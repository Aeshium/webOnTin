export const ASSIGNMENT_QUESTION_TYPES = [
  "single_choice",
  "multiple_choice",
  "true_false",
  "short_answer",
] as const;

export type AssignmentQuestionType = (typeof ASSIGNMENT_QUESTION_TYPES)[number];
export type AssignmentAnswer = number | number[] | string | null;

export type AssignmentQuestionForGrading = {
  questionType: string;
  options: string[];
  correctIndex: number;
  correctAnswers: number[] | null;
  acceptedAnswers: string[] | null;
};

export function correctAnswerIndexes(question: AssignmentQuestionForGrading) {
  return question.correctAnswers?.length ? question.correctAnswers : [question.correctIndex];
}

export function normalizeShortAnswer(answer: string) {
  return answer.trim().replace(/\s+/g, " ").toLocaleLowerCase("vi");
}

export function isValidAssignmentAnswer(question: AssignmentQuestionForGrading, answer: unknown): answer is AssignmentAnswer {
  if (answer === null) return true;
  if (question.questionType === "multiple_choice") {
    return Array.isArray(answer) &&
      answer.every((index) => Number.isInteger(index) && index >= 0 && index < question.options.length) &&
      new Set(answer).size === answer.length;
  }
  if (question.questionType === "short_answer") {
    return typeof answer === "string" && answer.length <= 2000;
  }
  return Number.isInteger(answer) && (answer as number) >= 0 && (answer as number) < question.options.length;
}

export function gradeAssignmentAnswer(question: AssignmentQuestionForGrading, answer: AssignmentAnswer) {
  const correctIndexes = correctAnswerIndexes(question);
  if (question.questionType === "short_answer") {
    const normalized = typeof answer === "string" ? normalizeShortAnswer(answer) : "";
    const isCorrect = normalized.length > 0 &&
      (question.acceptedAnswers ?? []).some((accepted) => normalizeShortAnswer(accepted) === normalized);
    return { points: isCorrect ? 1 : 0, isCorrect, correctIndexes };
  }
  if (question.questionType === "multiple_choice") {
    const selected = Array.isArray(answer) ? answer : [];
    const points = correctIndexes.length
      ? selected.filter((index) => correctIndexes.includes(index)).length / correctIndexes.length
      : 0;
    return { points, isCorrect: points === 1 && selected.length === correctIndexes.length, correctIndexes };
  }
  const isCorrect = typeof answer === "number" && correctIndexes.includes(answer);
  return { points: isCorrect ? 1 : 0, isCorrect, correctIndexes };
}

export function gradeAssignment(questions: AssignmentQuestionForGrading[], answers: AssignmentAnswer[]) {
  const results = questions.map((question, index) => gradeAssignmentAnswer(question, answers[index] ?? null));
  const earned = results.reduce((total, result) => total + result.points, 0);
  return {
    score: questions.length ? Math.round((earned / questions.length) * 100) : 0,
    correctCount: results.filter((result) => result.isCorrect).length,
    totalQuestions: questions.length,
    results,
  };
}
