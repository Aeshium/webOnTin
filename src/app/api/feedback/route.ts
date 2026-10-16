import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { feedbacks, type FeedbackType } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const FEEDBACK_TYPES = {
  bug: "Báo lỗi",
  feature: "Góp ý tính năng",
  other: "Khác",
} as const;

function isFeedbackType(value: unknown): value is FeedbackType {
  return typeof value === "string" && Object.hasOwn(FEEDBACK_TYPES, value);
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Vui lòng đăng nhập để gửi phản hồi." }, { status: 401 });
  }

  let body: { type?: unknown; content?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dữ liệu phản hồi không hợp lệ." }, { status: 400 });
  }

  const type = body?.type;
  const content = typeof body?.content === "string" ? body.content.trim() : "";
  if (
    !isFeedbackType(type) ||
    content.length < 5 ||
    content.length > 4000
  ) {
    return NextResponse.json(
      { error: "Hãy chọn loại phản hồi và nhập nội dung từ 5 đến 4.000 ký tự." },
      { status: 400 }
    );
  }

  let feedback: { id: string; createdAt: Date };
  try {
    const [created] = await db
      .insert(feedbacks)
      .values({ userId: user.id, type, content })
      .returning({ id: feedbacks.id, createdAt: feedbacks.createdAt });
    if (!created) throw new Error("Database did not return the created feedback.");
    feedback = created;
  } catch (error) {
    console.error("Lưu phản hồi thất bại:", error);
    return NextResponse.json({ error: "Không lưu được phản hồi. Vui lòng thử lại." }, { status: 500 });
  }

  const webhookUrl = process.env.DISCORD_FEEDBACK_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error("Không gửi được thông báo feedback: thiếu DISCORD_FEEDBACK_WEBHOOK_URL.");
    return NextResponse.json({
      ok: true,
      notificationSent: false,
      warning: "Phản hồi đã được lưu, nhưng chưa gửi được thông báo Discord.",
    }, { status: 201 });
  }

  try {
    const discordResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "ÔnTin · Phản hồi",
        allowed_mentions: { parse: [] },
        embeds: [{
          title: `Phản hồi mới · ${FEEDBACK_TYPES[type]}`,
          color: type === "bug" ? 0xef4444 : type === "feature" ? 0x22d3ee : 0xa78bfa,
          description: content.slice(0, 4000),
          fields: [
            { name: "Người gửi", value: `${user.name}\n${user.email}`.slice(0, 1024), inline: true },
            { name: "ID phản hồi", value: feedback.id, inline: true },
          ],
          timestamp: feedback.createdAt.toISOString(),
        }],
      }),
      signal: AbortSignal.timeout(7000),
      cache: "no-store",
    });
    if (!discordResponse.ok) {
      console.error("Discord webhook trả về lỗi:", discordResponse.status);
      return NextResponse.json({
        ok: true,
        notificationSent: false,
        warning: "Phản hồi đã được lưu, nhưng Discord chưa nhận được thông báo.",
      }, { status: 201 });
    }
  } catch (error) {
    console.error("Gửi thông báo feedback tới Discord thất bại:", error);
    return NextResponse.json({
      ok: true,
      notificationSent: false,
      warning: "Phản hồi đã được lưu, nhưng Discord chưa nhận được thông báo.",
    }, { status: 201 });
  }

  return NextResponse.json({ ok: true, notificationSent: true }, { status: 201 });
}
