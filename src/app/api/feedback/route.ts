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

  let type: unknown;
  let rawContent: unknown;
  let image: File | null = null;
  try {
    const form = await request.formData();
    type = form.get("type");
    rawContent = form.get("content");
    const upload = form.get("image");
    image = upload instanceof File && upload.size > 0 ? upload : null;
  } catch {
    return NextResponse.json({ error: "Dữ liệu phản hồi không hợp lệ." }, { status: 400 });
  }

  const content = typeof rawContent === "string" ? rawContent.trim() : "";
  if (
    !isFeedbackType(type) ||
    content.length < 5 ||
    content.length > 4000 ||
    (image !== null && image.size > 3 * 1024 * 1024)
  ) {
    return NextResponse.json(
      { error: "Hãy chọn loại phản hồi, nhập nội dung từ 5–4.000 ký tự; ảnh tối đa 3 MB." },
      { status: 400 }
    );
  }

  let imageDataUrl: string | null = null;
  if (image) {
    const bytes = Buffer.from(await image.arrayBuffer());
    const validImage =
      image.type === "image/png" && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
      image.type === "image/jpeg" && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes.at(-2) === 0xff && bytes.at(-1) === 0xd9 ||
      image.type === "image/webp" && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
    if (!validImage) {
      return NextResponse.json({ error: "Chỉ hỗ trợ ảnh PNG, JPEG hoặc WebP hợp lệ." }, { status: 400 });
    }
    imageDataUrl = `data:${image.type};base64,${bytes.toString("base64")}`;
  }

  let feedback: { id: string; createdAt: Date };
  try {
    const [created] = await db
      .insert(feedbacks)
      .values({ userId: user.id, type, content, imageDataUrl })
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
    const payload = {
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
          ...(image ? { image: { url: `attachment://${image.name}` } } : {}),
          timestamp: feedback.createdAt.toISOString(),
        }],
      };
    let requestBody: BodyInit;
    if (image) {
      const discordForm = new FormData();
      discordForm.set("payload_json", JSON.stringify(payload));
      discordForm.set("files[0]", new Blob([await image.arrayBuffer()], { type: image.type }), image.name);
      requestBody = discordForm;
    } else {
      requestBody = JSON.stringify(payload);
    }
    const discordResponse = await fetch(webhookUrl, {
      method: "POST",
      ...(image ? {} : { headers: { "Content-Type": "application/json" } }),
      body: requestBody,
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
