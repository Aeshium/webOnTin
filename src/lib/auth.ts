import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { and, eq, gt, sql } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";

const scryptAsync = promisify(scrypt);
export const SESSION_COOKIE = "ontin_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export type PublicUser = Pick<
  typeof users.$inferSelect,
  | "id"
  | "name"
  | "schoolName"
  | "className"
  | "email"
  | "background"
  | "avatarUrl"
  | "examDate"
  | "lastLoginAt"
  | "equippedAchievementKey"
>;

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return `scrypt$${salt.toString("hex")}$${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password: string, encoded: string) {
  const [algorithm, saltHex, keyHex] = encoded.split("$");
  if (algorithm !== "scrypt" || !saltHex || !keyHex) return false;

  const expected = Buffer.from(keyHex, "hex");
  const actual = (await scryptAsync(
    password,
    Buffer.from(saltHex, "hex"),
    expected.length
  )) as Buffer;
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function createSession(userId: number) {
  const token = randomBytes(32).toString("base64url");
  await db.insert(sessions).values({
    userId,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + SESSION_MAX_AGE * 1000),
  });
  return token;
}

export async function getCurrentUser(): Promise<PublicUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const [session] = await db
    .select({
      id: users.id,
      name: users.name,
      schoolName: users.schoolName,
      className: users.className,
      email: users.email,
      background: users.background,
      avatarUrl: sql<string | null>`
        case
          when ${users.avatarUrl} like 'data:image/%' then '/api/profile/avatar'
          else ${users.avatarUrl}
        end
      `.as("avatar_url"),
      examDate: users.examDate,
      lastLoginAt: users.lastLoginAt,
      equippedAchievementKey: users.equippedAchievementKey,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(
      and(
        eq(sessions.tokenHash, hashToken(token)),
        gt(sessions.expiresAt, new Date())
      )
    )
    .limit(1);

  if (!session) return null;
  return session;
}
