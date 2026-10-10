"use client";

const GUEST_ACCESS_KEY = "ontin_guest_access_date";
const GUEST_EXAMS_KEY = "ontin_guest_exams";
const GUEST_PAUSED_EXAM_KEY = "ontin_guest_paused_exam";
const GUEST_EXAMS_EVENT = "ontin-guest-exams-updated";

export type GuestExamResult = {
  id: string;
  correctCount: number;
  totalQuestions: number;
  timeTakenSec: number;
  completedAt: string;
};

export type GuestPausedExam = {
  examId: string | null;
  questions: Array<{ id: number; content: string; options: string[]; difficulty: string }>;
  answers: (number | null)[];
  markedForReview: boolean[];
  currentIndex: number;
  elapsedSec: number;
  pausedAt: string;
};

export function getVietnamDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function startGuestSession() {
  sessionStorage.setItem(GUEST_ACCESS_KEY, getVietnamDateKey());
  sessionStorage.removeItem(GUEST_EXAMS_KEY);
  sessionStorage.removeItem(GUEST_PAUSED_EXAM_KEY);
}

export function hasValidGuestSession() {
  const sessionDate = sessionStorage.getItem(GUEST_ACCESS_KEY);
  if (sessionDate === getVietnamDateKey()) return true;
  clearGuestSession();
  return false;
}

export function clearGuestSession() {
  sessionStorage.removeItem(GUEST_ACCESS_KEY);
  sessionStorage.removeItem(GUEST_EXAMS_KEY);
  sessionStorage.removeItem(GUEST_PAUSED_EXAM_KEY);
  window.dispatchEvent(new Event(GUEST_EXAMS_EVENT));
}

export function saveGuestPausedExam(exam: Omit<GuestPausedExam, "pausedAt">) {
  sessionStorage.setItem(
    GUEST_PAUSED_EXAM_KEY,
    JSON.stringify({ ...exam, pausedAt: new Date().toISOString() })
  );
  window.dispatchEvent(new Event(GUEST_EXAMS_EVENT));
}

export function getGuestPausedExamSnapshot() {
  return sessionStorage.getItem(GUEST_PAUSED_EXAM_KEY) ?? "";
}

export function parseGuestPausedExam(value: string): GuestPausedExam | null {
  try {
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed !== "object" || parsed === null) return null;
    const exam = parsed as Record<string, unknown>;
    const isQuestion = (question: unknown): question is GuestPausedExam["questions"][number] =>
      typeof question === "object" &&
      question !== null &&
      Number.isInteger((question as Record<string, unknown>).id) &&
      typeof (question as Record<string, unknown>).content === "string" &&
      Array.isArray((question as Record<string, unknown>).options) &&
      (question as Record<string, unknown>).options instanceof Array &&
      ((question as Record<string, unknown>).options as unknown[]).every((option) => typeof option === "string") &&
      typeof (question as Record<string, unknown>).difficulty === "string";
    const questions = exam.questions;
    const answers = exam.answers;
    const marks = exam.markedForReview;
    if (
      (exam.examId !== null && typeof exam.examId !== "string") ||
      !Array.isArray(questions) ||
      !questions.every(isQuestion) ||
      !Array.isArray(answers) ||
      !answers.every((answer) => answer === null || (Number.isInteger(answer) && Number(answer) >= 0 && Number(answer) <= 3)) ||
      !Array.isArray(marks) ||
      !marks.every((mark) => typeof mark === "boolean") ||
      answers.length !== questions.length ||
      marks.length !== questions.length ||
      !Number.isInteger(exam.currentIndex) ||
      Number(exam.currentIndex) < 0 ||
      Number(exam.currentIndex) >= questions.length ||
      !Number.isInteger(exam.elapsedSec) ||
      Number(exam.elapsedSec) < 0 ||
      Number(exam.elapsedSec) > 30 * 60 ||
      typeof exam.pausedAt !== "string" ||
      Number.isNaN(Date.parse(exam.pausedAt))
    ) return null;
    return {
      examId: exam.examId,
      questions,
      answers: answers as (number | null)[],
      markedForReview: marks as boolean[],
      currentIndex: Number(exam.currentIndex),
      elapsedSec: Number(exam.elapsedSec),
      pausedAt: exam.pausedAt,
    };
  } catch {
    return null;
  }
}

export function clearGuestPausedExam() {
  sessionStorage.removeItem(GUEST_PAUSED_EXAM_KEY);
  window.dispatchEvent(new Event(GUEST_EXAMS_EVENT));
}

export function addGuestExamResult(result: Omit<GuestExamResult, "id" | "completedAt">) {
  const exams = getGuestExamResults();
  exams.unshift({
    ...result,
    id: crypto.randomUUID(),
    completedAt: new Date().toISOString(),
  });
  sessionStorage.setItem(GUEST_EXAMS_KEY, JSON.stringify(exams.slice(0, 100)));
  window.dispatchEvent(new Event(GUEST_EXAMS_EVENT));
}

export function getGuestExamResults(): GuestExamResult[] {
  return parseGuestExamResults(getGuestExamResultsSnapshot());
}

export function getGuestExamResultsSnapshot() {
  return sessionStorage.getItem(GUEST_EXAMS_KEY) ?? "[]";
}

export function parseGuestExamResults(value: string): GuestExamResult[] {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is GuestExamResult =>
        typeof item === "object" &&
        item !== null &&
        typeof item.id === "string" &&
        typeof item.correctCount === "number" &&
        typeof item.totalQuestions === "number" &&
        typeof item.timeTakenSec === "number" &&
        typeof item.completedAt === "string"
    );
  } catch {
    sessionStorage.removeItem(GUEST_EXAMS_KEY);
    return [];
  }
}

export function subscribeGuestExamResults(callback: () => void) {
  window.addEventListener(GUEST_EXAMS_EVENT, callback);
  return () => window.removeEventListener(GUEST_EXAMS_EVENT, callback);
}

export function safeNextPath(value: string | null | undefined) {
  return value &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\") &&
    !/[\r\n]/.test(value)
    ? value
    : "/";
}
