import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Đăng nhập" };

export default function SignInPage() {
  return <AuthForm mode="login" />;
}
