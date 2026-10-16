import type { Metadata } from "next";
import { TeacherPortal } from "@/components/teacher-portal";

export const metadata: Metadata = { title: "Cổng giáo viên" };
export default function TeacherPage() {
  return <TeacherPortal />;
}
