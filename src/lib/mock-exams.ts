export type MockExamDefinition = {
  id: string;
  name: string;
  level: "basic" | "advanced";
  description: string;
};

export const MOCK_EXAMS: MockExamDefinition[] = Array.from({ length: 15 }, (_, index) => {
  const level = index < 7 ? "basic" : "advanced";
  const number = index + 1;
  return {
    id: `exam-${String(number).padStart(2, "0")}`,
    name: `Đề ${String(number).padStart(2, "0")}`,
    level,
    description: level === "basic" ? "Mức cơ bản" : "Mức nâng cao",
  };
});

export function getMockExam(examId: string) {
  return MOCK_EXAMS.find((exam) => exam.id === examId) ?? null;
}

export function getMockExamName(examId: string | null) {
  return MOCK_EXAMS.find((exam) => exam.id === examId)?.name ?? "Thi thử tổng hợp";
}
