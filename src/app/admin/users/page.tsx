import type { Metadata } from "next";
import { AdminUsers } from "@/components/admin-users";

export const metadata: Metadata = { title: "Tài khoản người dùng" };
export default function AdminUsersPage() {
  return <AdminUsers />;
}
