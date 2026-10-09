import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { userAchievements, users } from "@/db/schema";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { getCurrentUser } from "@/lib/auth";
import { getUserAchievements } from "@/lib/queries";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Vui lòng đăng nhập." }, { status: 401 });

  const progress = await getUserAchievements(user.id);
  return NextResponse.json({ achievements: ACHIEVEMENTS, ...progress });
}

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Vui lòng đăng nhập." }, { status: 401 });

  let body: { achievementKey?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Thông tin gửi lên không hợp lệ." }, { status: 400 });
  }

  const key = body?.achievementKey;
  if (key !== null && (typeof key !== "string" || !ACHIEVEMENTS.some((item) => item.key === key))) {
    return NextResponse.json({ error: "Danh hiệu không hợp lệ." }, { status: 400 });
  }

  if (typeof key === "string") {
    const [earned] = await db
      .select({ id: users.id })
      .from(users)
      .innerJoin(userAchievements, eq(userAchievements.userId, users.id))
      .where(and(eq(users.id, user.id), eq(userAchievements.achievementKey, key)))
      .limit(1);
    if (!earned) {
      return NextResponse.json({ error: "Bạn chưa đạt được danh hiệu này." }, { status: 403 });
    }
  }

  await db
    .update(users)
    .set({ equippedAchievementKey: key })
    .where(eq(users.id, user.id));
  return NextResponse.json({ ok: true });
}
