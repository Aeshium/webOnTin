import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { passwordResetTokens, users } from "@/db/schema";
import { hashToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const appUrl = process.env.APP_URL;
  if (!apiKey || !from || !appUrl) {
    return NextResponse.json(
      { error: "Chức năng email chưa được cấu hình (RESEND_API_KEY, RESEND_FROM_EMAIL, APP_URL)." },
      { status: 503 }
    );
  }

  let body: { email?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Thông tin gửi lên không hợp lệ." }, { status: 400 });
  }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return NextResponse.json({ error: "Email không hợp lệ." }, { status: 400 });
  }

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) {
    return NextResponse.json({
      message: "Nếu email thuộc tài khoản ÔnTin, hướng dẫn đặt lại mật khẩu sẽ được gửi.",
    });
  }

  const token = randomBytes(32).toString("base64url");
  const resetUrl = new URL("/dat-lai-mat-khau", appUrl);
  resetUrl.searchParams.set("token", token);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  const [record] = await db
    .insert(passwordResetTokens)
    .values({ userId: user.id, tokenHash: hashToken(token), expiresAt })
    .returning({ id: passwordResetTokens.id });

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [user.email],
        subject: "Đặt lại mật khẩu ÔnTin",
        html: `<p>Xin chào ${escapeHtml(user.name)},</p><p>Liên kết đặt lại mật khẩu có hiệu lực trong 1 giờ:</p><p><a href="${resetUrl.toString()}">Đặt lại mật khẩu</a></p><p>Nếu bạn không yêu cầu email này, hãy bỏ qua.</p>`,
      }),
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Resend trả về ${response.status}: ${detail}`);
    }
  } catch (error) {
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.id, record.id));
    console.error("Gửi email đặt lại mật khẩu thất bại:", error);
    return NextResponse.json({ error: "Không gửi được email. Vui lòng thử lại sau." }, { status: 502 });
  }

  return NextResponse.json({
    message: "Nếu email thuộc tài khoản ÔnTin, hướng dẫn đặt lại mật khẩu sẽ được gửi.",
  });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!
  );
}
