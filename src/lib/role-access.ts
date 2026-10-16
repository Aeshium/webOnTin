import type { UserRole } from "@/db/schema";

export function roleHomePath(role: UserRole) {
  if (role === "admin") return "/admin";
  if (role === "teacher") return "/teacher";
  return "/";
}

export function roleSafeNextPath(role: UserRole, requestedPath?: string | null) {
  if (role !== "student") return roleHomePath(role);
  if (!requestedPath) return "/";
  if (
    !requestedPath.startsWith("/") ||
    requestedPath.startsWith("//") ||
    requestedPath.includes("\\") ||
    requestedPath.startsWith("/admin") ||
    requestedPath.startsWith("/teacher") ||
    /[\r\n]/.test(requestedPath)
  ) {
    return "/";
  }
  return requestedPath;
}

export function canAccessRolePath(role: UserRole, path: string) {
  if (path === "/admin" || path.startsWith("/admin/")) return role === "admin";
  if (path === "/teacher" || path.startsWith("/teacher/")) {
    return role === "teacher" || role === "admin";
  }
  return true;
}
