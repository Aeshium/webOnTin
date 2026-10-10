import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

const MAX_AVATAR_SIZE = 1024 * 1024;
const IMAGE_SIGNATURES = [
  { type: "image/jpeg", matches: (bytes: Uint8Array) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff },
  { type: "image/png", matches: (bytes: Uint8Array) => bytes.slice(0, 8).join(",") === "137,80,78,71,13,10,26,10" },
  { type: "image/webp", matches: (bytes: Uint8Array) => String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP" },
];

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new NextResponse(null, { status: 401 });
  const [record] = await db
    .select({ avatarUrl: users.avatarUrl })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);
  const match = record?.avatarUrl?.match(
    /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/
  );
  if (!match) return new NextResponse(null, { status: 404 });
  return new NextResponse(Buffer.from(match[2], "base64"), {
    headers: {
      "Content-Type": match[1],
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Vui lòng đăng nhập." }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Hãy chọn ảnh đại diện." }, { status: 400 });
  }
  if (file.size > MAX_AVATAR_SIZE) {
    return NextResponse.json({ error: "Ảnh đại diện không được lớn hơn 1 MB." }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const image = IMAGE_SIGNATURES.find((signature) => signature.matches(bytes));
  if (!image || file.type !== image.type) {
    return NextResponse.json({ error: "Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP hợp lệ." }, { status: 400 });
  }

  const avatarUrl = `data:${image.type};base64,${Buffer.from(bytes).toString("base64")}`;
  await db.update(users).set({ avatarUrl }).where(eq(users.id, user.id));
  return NextResponse.json({ avatarUrl: "/api/profile/avatar" });
}
