import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { PortalShell } from "@/components/portal-shell";
import { getCurrentUser } from "@/lib/auth";
import { roleHomePath } from "@/lib/role-access";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/dang-nhap?next=%2Fadmin");
  if (user.role !== "admin") redirect(roleHomePath(user.role));
  return <PortalShell type="admin">{children}</PortalShell>;
}
