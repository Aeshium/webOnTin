import type { PublicQuestion } from "@/lib/queries";

export const QUIZ_PROGRESS_KEY = "ontin-active-quiz";

export type SavedQuizProgress = {
  configKey: string;
  examId: string | null;
  mode: "practice" | "study" | "exam";
  selectedCount: number;
  questions: PublicQuestion[];
  answers: (number | null)[];
  markedForReview: boolean[];
  currentIndex: number;
  elapsedSec: number;
  examSessionToken: string | null;
  savedAt: number;
};

export function readQuizProgress(): SavedQuizProgress | null {
  try {
    const raw = sessionStorage.getItem(QUIZ_PROGRESS_KEY);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return null;
    const progress = value as Partial<SavedQuizProgress>;
    if (
      typeof progress.configKey !== "string" ||
      (progress.examId !== null && typeof progress.examId !== "string") ||
      !["practice", "study", "exam"].includes(progress.mode ?? "") ||
      !Number.isInteger(progress.selectedCount) ||
      !Array.isArray(progress.questions) ||
      progress.questions.length === 0 ||
      !progress.questions.every(isPublicQuestion) ||
      !Array.isArray(progress.answers) ||
      !progress.answers.every(
        (answer) =>
          answer === null ||
          (Number.isInteger(answer) && Number(answer) >= 0 && Number(answer) <= 3)
      ) ||
      !Array.isArray(progress.markedForReview) ||
      !progress.markedForReview.every((marked) => typeof marked === "boolean") ||
      progress.answers.length !== progress.questions.length ||
      progress.markedForReview.length !== progress.questions.length ||
      !Number.isInteger(progress.currentIndex) ||
      Number(progress.currentIndex) < 0 ||
      Number(progress.currentIndex) >= progress.questions.length ||
      !Number.isInteger(progress.elapsedSec) ||
      Number(progress.elapsedSec) < 0 ||
      (progress.examSessionToken !== null &&
        typeof progress.examSessionToken !== "string") ||
      !Number.isFinite(progress.savedAt)
    ) {
      sessionStorage.removeItem(QUIZ_PROGRESS_KEY);
      return null;
    }
    return progress as SavedQuizProgress;
  } catch {
    sessionStorage.removeItem(QUIZ_PROGRESS_KEY);
    return null;
  }
}

export function clearQuizProgress() {
  sessionStorage.removeItem(QUIZ_PROGRESS_KEY);
}

function isPublicQuestion(value: unknown): value is PublicQuestion {
  if (typeof value !== "object" || value === null) return false;
  const question = value as Record<string, unknown>;
  return (
    Number.isInteger(question.id) &&
    typeof question.content === "string" &&
    Array.isArray(question.options) &&
    question.options.length === 4 &&
    question.options.every((option) => typeof option === "string") &&
    typeof question.difficulty === "string"
  );
}
