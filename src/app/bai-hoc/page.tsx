import type { Metadata } from "next";
import { StudentLessons } from "@/components/student-lessons";

export const metadata: Metadata = { title: "Bài học" };

export default function LessonsPage() {
  return <StudentLessons />;
}
