import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Đăng nhập" };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const googleError = error === "google_failed"
    ? "Không thể đăng nhập bằng Google. Hãy thử lại hoặc dùng email."
    : undefined;
  return <AuthForm mode="login" nextPath={next} googleError={googleError} />;
}
