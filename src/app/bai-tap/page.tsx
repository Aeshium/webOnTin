import type { Metadata } from "next";
import { StudentAssignments } from "@/components/student-assignments";

export const metadata: Metadata = { title: "Bài tập" };
export default function AssignmentsPage() {
  return <StudentAssignments />;
}
