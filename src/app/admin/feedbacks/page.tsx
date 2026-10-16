import type { Metadata } from "next";
import { AdminFeedbacks } from "@/components/admin-feedbacks";

export const metadata: Metadata = { title: "Phản hồi người dùng" };
export default function AdminFeedbacksPage() {
  return <AdminFeedbacks />;
}
