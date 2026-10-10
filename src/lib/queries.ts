// ============================================================================
// TẬP HỢP CÁC TRUY VẤN dùng chung cho cả Server Components và API Routes.
// Mỗi hàm mình ghi kèm câu SQL tương đương để bạn đối chiếu với MySQL.
// Lưu ý: file này CHỈ chạy phía server (vì nó nói chuyện trực tiếp với DB).
// ============================================================================

import { db } from "@/db";
import {
  topics,
  questions,
  attempts,
  attemptAnswers,
  mockExamSessions,
  userAchievements,
  users,
} from "@/db/schema";
import { and, asc, desc, eq, gte, ilike, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { hashToken } from "@/lib/auth";
import { randomBytes } from "node:crypto";
import { ACHIEVEMENTS } from "@/lib/achievements";

// ---------- Kiểu dữ liệu trả về ----------

export type TopicWithCount = {
  id: string;
  name: string;
  tagline: string;
  icon: string;
  colorFrom: string;
  colorTo: string;
  questionCount: number;
};

export type PublicQuestion = {
  id: number;
  content: string;
  options: string[];
  difficulty: string;
};

export type GradedResult = {
  questionId: number;
  content: string;
  options: string[];
  correctIndex: number;
  selectedIndex: number | null;
  isCorrect: boolean;
  explanation: string;
};

export type AttemptSummary = {
  id: number;
  topicId: string | null;
  topicName: string | null;
  topicColorFrom: string | null;
  topicColorTo: string | null;
  mode: string;
  examId: string | null;
  totalQuestions: number;
  correctCount: number;
  timeTakenSec: number;
  createdAt: string;
};

export type PausedExamSummary = {
  id: number;
  examId: string | null;
  questionCount: number;
  answeredCount: number;
  elapsedSec: number;
  pausedAt: string;
};

export type TopicPerformance = TopicWithCount & {
  attemptCount: number;
  averagePercent: number | null;
};

export type LeaderboardEntry = {
  userId: number;
  name: string;
  examCount: number;
  totalCorrect: number;
  totalQuestions: number;
  averagePercent: number;
  averageTimeSec: number;
};

export type LeaderboardPeriod = "week" | "month" | "all";

export async function getLeaderboard(period: LeaderboardPeriod) {
  const since = period === "all"
    ? null
    : new Date(Date.now() - (period === "week" ? 7 : 30) * 24 * 60 * 60 * 1000);
  const conditions = [
    eq(attempts.mode, "exam"),
    isNotNull(attempts.userId),
  ];
  if (since) conditions.push(gte(attempts.createdAt, since));

  const [entries, summary] = await Promise.all([
    db
      .select({
        userId: users.id,
        name: users.name,
        examCount: sql<number>`cast(count(${attempts.id}) as int)`,
        totalCorrect: sql<number>`cast(sum(${attempts.correctCount}) as int)`,
        totalQuestions: sql<number>`cast(sum(${attempts.totalQuestions}) as int)`,
        averagePercent: sql<number>`cast(round(avg(${attempts.correctCount} * 100.0 / nullif(${attempts.totalQuestions}, 0))) as int)`,
        averageTimeSec: sql<number>`cast(round(avg(${attempts.timeTakenSec})) as int)`,
      })
      .from(attempts)
      .innerJoin(users, eq(attempts.userId, users.id))
      .where(and(...conditions))
      .groupBy(users.id)
      .orderBy(
        desc(sql`avg(${attempts.correctCount} * 100.0 / nullif(${attempts.totalQuestions}, 0))`),
        desc(sql`count(${attempts.id})`),
        asc(sql`avg(${attempts.timeTakenSec})`),
        asc(users.name)
      )
      .limit(100),
    db
      .select({
        examCount: sql<number>`cast(count(${attempts.id}) as int)`,
        learnerCount: sql<number>`cast(count(distinct ${attempts.userId}) as int)`,
      })
      .from(attempts)
      .where(and(...conditions)),
  ]);

  return {
    entries: entries satisfies LeaderboardEntry[],
    examCount: summary[0]?.examCount ?? 0,
    learnerCount: summary[0]?.learnerCount ?? 0,
  };
}

// ---------- Truy vấn ----------

/**
 * Lấy danh sách chuyên đề kèm số câu hỏi.
 * SQL tương đương:
 *   SELECT t.*, COUNT(q.id)::int AS question_count
 *   FROM topics t LEFT JOIN questions q ON q.topic_id = t.id
 *   GROUP BY t.id ORDER BY t.sort_order;
 */
export async function getTopicsWithCounts(): Promise<TopicWithCount[]> {
  const rows = await db
    .select({
      id: topics.id,
      name: topics.name,
      tagline: topics.tagline,
      icon: topics.icon,
      colorFrom: topics.colorFrom,
      colorTo: topics.colorTo,
      questionCount: sql<number>`cast(count(${questions.id}) as int)`,
    })
    .from(topics)
    .leftJoin(questions, eq(questions.topicId, topics.id))
    .groupBy(topics.id)
    .orderBy(topics.sortOrder);
  return rows;
}

/** Đếm số câu hỏi của một chuyên đề: SELECT COUNT(*) FROM questions WHERE topic_id = ? */
export async function countQuestionsInTopic(topicId: string): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`cast(count(*) as int)` })
    .from(questions)
    .where(eq(questions.topicId, topicId));
  return row?.n ?? 0;
}

/** Thống kê tổng quan cho trang chủ. */
function attemptOwnerCondition(userId?: number) {
  return userId ? eq(attempts.userId, userId) : sql`false`;
}

function mockExamCondition(userId?: number) {
  return and(
    attemptOwnerCondition(userId),
    eq(attempts.mode, "exam")
  );
}

export async function getSiteStats(userId?: number) {
  const [q] = await db
    .select({ n: sql<number>`cast(count(*) as int)` })
    .from(questions);
  const [a] = await db
    .select({
      n: sql<number>`cast(count(*) as int)`,
      averagePercent: sql<number | null>`cast(round(avg(${attempts.correctCount} * 100.0 / nullif(${attempts.totalQuestions}, 0))) as int)`,
    })
    .from(attempts)
    .where(mockExamCondition(userId));
  return {
    questionCount: q?.n ?? 0,
    attemptCount: a?.n ?? 0,
    averagePercent: a?.averagePercent ?? null,
  };
}

/** Điểm trung bình theo chuyên đề, tính trên các lượt đã lưu trong database. */
export async function getTopicPerformance(userId?: number): Promise<TopicPerformance[]> {
  const topicAttemptScores = db.$with("topic_attempt_scores").as(
    db
      .select({
        topicId: questions.topicId,
        attemptId: attempts.id,
        correctCount: sql<number>`cast(sum(case when ${attemptAnswers.isCorrect} then 1 else 0 end) as int)`.as("correct_count"),
        totalQuestions: sql<number>`cast(count(*) as int)`.as("total_questions"),
      })
      .from(attemptAnswers)
      .innerJoin(attempts, eq(attemptAnswers.attemptId, attempts.id))
      .innerJoin(questions, eq(attemptAnswers.questionId, questions.id))
      .where(mockExamCondition(userId))
      .groupBy(questions.topicId, attempts.id)
  );
  const [topicRows, attemptRows] = await Promise.all([
    getTopicsWithCounts(),
    db
      .with(topicAttemptScores)
      .select({
        topicId: topicAttemptScores.topicId,
        attemptCount: sql<number>`cast(count(*) as int)`,
        averagePercent: sql<number>`cast(round(avg(${topicAttemptScores.correctCount} * 100.0 / nullif(${topicAttemptScores.totalQuestions}, 0))) as int)`,
      })
      .from(topicAttemptScores)
      .groupBy(topicAttemptScores.topicId),
  ]);

  const attemptsByTopic = new Map(
    attemptRows.map((row) => [row.topicId, row])
  );

  return topicRows.map((topic) => {
    const performance = attemptsByTopic.get(topic.id);
    return {
      ...topic,
      attemptCount: performance?.attemptCount ?? 0,
      averagePercent: performance?.averagePercent ?? null,
    };
  });
}

/**
 * Rút ngẫu nhiên N câu hỏi (KHÔNG kèm đáp án — đáp án chỉ nằm ở server!).
 * SQL: SELECT id, content, options FROM questions
 *      [WHERE topic_id = ?] ORDER BY random() LIMIT n;
 * Trong MySQL thì random() viết là RAND() — chỉ khác chút xíu vậy thôi.
 */
export async function getRandomQuestions(
  topicId: string | null,
  limit: number,
  difficulty?: "basic" | "advanced"
): Promise<PublicQuestion[]> {
  const conditions = [];
  if (topicId) conditions.push(eq(questions.topicId, topicId));
  if (difficulty) conditions.push(eq(questions.difficulty, difficulty));
  return db
    .select({
      id: questions.id,
      content: questions.content,
      options: questions.options,
      difficulty: questions.difficulty,
    })
    .from(questions)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(sql`random()`)
    .limit(limit);
}

/** Ôn tập có đáp án: chỉ dùng khi người học chủ động chọn chế độ ôn từng câu. */
export async function getRandomStudyQuestions(
  topicId: string | null,
  limit: number
) {
  const cols = {
    id: questions.id,
    content: questions.content,
    options: questions.options,
    difficulty: questions.difficulty,
    correctIndex: questions.correctIndex,
    explanation: questions.explanation,
  };

  if (topicId) {
    return db
      .select(cols)
      .from(questions)
      .where(eq(questions.topicId, topicId))
      .orderBy(sql`random()`)
      .limit(limit);
  }

  return db.select(cols).from(questions).orderBy(sql`random()`).limit(limit);
}

export function createExamSessionToken() {
  return randomBytes(32).toString("base64url");
}

export async function storeMockExamSession(input: {
  userId: number | null;
  token: string;
  questionIds: number[];
  durationSec: number;
  examId?: string | null;
}) {
  const startedAt = new Date();
  await db.insert(mockExamSessions).values({
    userId: input.userId,
    tokenHash: hashToken(input.token),
    questionIds: input.questionIds,
    startedAt,
    examId: input.examId ?? null,
    answers: Array(input.questionIds.length).fill(null),
    markedForReview: Array(input.questionIds.length).fill(false),
    expiresAt: new Date(startedAt.getTime() + (input.durationSec + 60) * 1000),
  });
}

export async function getPublicQuestionsByIds(ids: number[]): Promise<PublicQuestion[]> {
  if (ids.length === 0) return [];
  const rows = await db
    .select({
      id: questions.id,
      content: questions.content,
      options: questions.options,
      difficulty: questions.difficulty,
    })
    .from(questions)
    .where(inArray(questions.id, ids));
  const byId = new Map(rows.map((question) => [question.id, question]));
  return ids.flatMap((id) => {
    const question = byId.get(id);
    return question ? [question] : [];
  });
}

export async function listPausedMockExams(userId: number): Promise<PausedExamSummary[]> {
  const rows = await db
    .select({
      id: mockExamSessions.id,
      examId: mockExamSessions.examId,
      questionIds: mockExamSessions.questionIds,
      answers: mockExamSessions.answers,
      elapsedSec: mockExamSessions.elapsedSec,
      pausedAt: mockExamSessions.pausedAt,
    })
    .from(mockExamSessions)
    .where(and(
      eq(mockExamSessions.userId, userId),
      eq(mockExamSessions.isPaused, true),
      isNull(mockExamSessions.submittedAt),
      gte(mockExamSessions.expiresAt, new Date())
    ))
    .orderBy(desc(mockExamSessions.pausedAt));

  return rows.map((row) => ({
    id: row.id,
    examId: row.examId,
    questionCount: row.questionIds.length,
    answeredCount: row.answers?.filter((answer) => answer !== null).length ?? 0,
    elapsedSec: row.elapsedSec,
    pausedAt: (row.pausedAt ?? new Date()).toISOString(),
  }));
}

export async function getMockExamStats() {
  const rows = await db
    .select({
      examId: attempts.examId,
      attemptCount: sql<number>`count(*)::int`,
      averagePercent: sql<number>`avg(${attempts.correctCount}::numeric * 100 / nullif(${attempts.totalQuestions}, 0))`,
    })
    .from(attempts)
    .where(and(eq(attempts.mode, "exam"), isNotNull(attempts.examId)))
    .groupBy(attempts.examId);
  return Object.fromEntries(rows.map((row) => [
    row.examId!,
    { attemptCount: row.attemptCount, averagePercent: row.averagePercent === null ? null : Number(row.averagePercent) },
  ]));
}

export async function pauseMockExamSession(input: {
  userId: number;
  token: string;
  answers: (number | null)[];
  markedForReview: boolean[];
  currentIndex: number;
}) {
  const now = new Date();
  const [session] = await db
    .select()
    .from(mockExamSessions)
    .where(eq(mockExamSessions.tokenHash, hashToken(input.token)))
    .limit(1);
  if (
    !session ||
    session.userId !== input.userId ||
    session.isPaused ||
    session.submittedAt ||
    session.expiresAt <= now
  ) {
    throw new MockExamSubmissionError("Phiên thi không hợp lệ hoặc đã hết hạn.");
  }
  if (
    input.answers.length !== session.questionIds.length ||
    input.markedForReview.length !== session.questionIds.length ||
    input.currentIndex < 0 ||
    input.currentIndex >= session.questionIds.length
  ) {
    throw new MockExamSubmissionError("Tiến trình bài thi không hợp lệ.");
  }
  const elapsedSec = Math.min(
    30 * 60,
    session.elapsedSec + Math.max(0, Math.floor((now.getTime() - session.startedAt.getTime()) / 1000))
  );
  const [paused] = await db
    .update(mockExamSessions)
    .set({
      answers: input.answers,
      markedForReview: input.markedForReview,
      currentIndex: input.currentIndex,
      elapsedSec,
      isPaused: true,
      pausedAt: now,
      expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
    })
    .where(and(
      eq(mockExamSessions.id, session.id),
      eq(mockExamSessions.userId, input.userId),
      eq(mockExamSessions.isPaused, false),
      isNull(mockExamSessions.submittedAt)
    ))
    .returning({ id: mockExamSessions.id });
  if (!paused) throw new MockExamSubmissionError("Không thể tạm dừng phiên thi.");
}

export async function resumeMockExamSession(input: { userId: number; sessionId: number }) {
  const now = new Date();
  const [session] = await db
    .select()
    .from(mockExamSessions)
    .where(and(
      eq(mockExamSessions.id, input.sessionId),
      eq(mockExamSessions.userId, input.userId),
      eq(mockExamSessions.isPaused, true),
      isNull(mockExamSessions.submittedAt),
      gte(mockExamSessions.expiresAt, now)
    ))
    .limit(1);
  if (!session) throw new MockExamSubmissionError("Không tìm thấy bài thi tạm dừng hoặc bài đã hết hạn.");
  if (session.elapsedSec >= 30 * 60) {
    throw new MockExamSubmissionError("Bài thi đã hết thời gian và không thể tiếp tục.");
  }
  const questionsInSession = await getPublicQuestionsByIds(session.questionIds);
  if (questionsInSession.length !== session.questionIds.length) {
    throw new MockExamSubmissionError("Không thể khôi phục đầy đủ câu hỏi của bài thi.");
  }
  const token = createExamSessionToken();
  const remainingSec = 30 * 60 - session.elapsedSec;
  const [resumed] = await db
    .update(mockExamSessions)
    .set({
      tokenHash: hashToken(token),
      startedAt: now,
      isPaused: false,
      pausedAt: null,
      expiresAt: new Date(now.getTime() + (remainingSec + 60) * 1000),
    })
    .where(and(
      eq(mockExamSessions.id, session.id),
      eq(mockExamSessions.isPaused, true),
      isNull(mockExamSessions.submittedAt),
      gte(mockExamSessions.expiresAt, now)
    ))
    .returning({ id: mockExamSessions.id });
  if (!resumed) throw new MockExamSubmissionError("Bài thi vừa được tiếp tục ở nơi khác.");
  return {
    token,
    examId: session.examId,
    questions: questionsInSession,
    answers: session.answers ?? Array(session.questionIds.length).fill(null),
    markedForReview: session.markedForReview ?? Array(session.questionIds.length).fill(false),
    currentIndex: session.currentIndex,
    elapsedSec: session.elapsedSec,
  };
}

/** Chấm bài ôn tập nhưng không ghi attempts hoặc attempt_answers. */
export async function gradeAnswers(
  answers: Array<{ questionId: number; selectedIndex: number | null }>
) {
  const ids = [...new Set(answers.map((a) => a.questionId))];
  if (ids.length === 0) throw new InvalidAnswerError("Bài làm rỗng");

  const rows = await db.select().from(questions).where(inArray(questions.id, ids));
  const byId = new Map(rows.map((r) => [r.id, r]));

  const results: GradedResult[] = answers
    .filter((a) => byId.has(a.questionId))
    .map((a) => {
      const q = byId.get(a.questionId)!;
      return {
        questionId: q.id,
        content: q.content,
        options: q.options,
        correctIndex: q.correctIndex,
        selectedIndex: a.selectedIndex,
        isCorrect: a.selectedIndex === q.correctIndex,
        explanation: q.explanation,
      };
    });

  if (results.length !== answers.length) {
    throw new InvalidAnswerError("Không tìm thấy một hoặc nhiều câu hỏi để chấm.");
  }
  const correctCount = results.filter((r) => r.isCorrect).length;
  return { correctCount, total: results.length, results };
}

export class InvalidAnswerError extends Error {}

export class MockExamSubmissionError extends Error {}

/** Chấm và lưu duy nhất một phiên thi thử đã được máy chủ khởi tạo. */
export async function gradeAndStoreMockExam(input: {
  userId: number | null;
  token: string;
  answers: Array<{ questionId: number; selectedIndex: number | null }>;
}) {
  const [examSession] = await db
    .select()
    .from(mockExamSessions)
    .where(eq(mockExamSessions.tokenHash, hashToken(input.token)))
    .limit(1);

  if (
    !examSession ||
    examSession.submittedAt ||
    examSession.isPaused ||
    examSession.expiresAt <= new Date() ||
    examSession.userId !== input.userId
  ) {
    throw new MockExamSubmissionError("Phiên thi thử không hợp lệ, đã nộp hoặc đã hết hạn.");
  }

  const submittedIds = input.answers.map((answer) => answer.questionId);
  if (
    submittedIds.length !== examSession.questionIds.length ||
    submittedIds.some((id, index) => id !== examSession.questionIds[index])
  ) {
    throw new MockExamSubmissionError("Danh sách câu hỏi không khớp với phiên thi thử.");
  }

  const graded = await gradeAnswers(input.answers);
  if (graded.total !== examSession.questionIds.length) {
    throw new MockExamSubmissionError("Không thể chấm đủ câu hỏi trong phiên thi thử.");
  }
  const submittedAt = new Date();
  const timeTakenSec = Math.min(
    Math.max(0, examSession.elapsedSec + Math.floor((submittedAt.getTime() - examSession.startedAt.getTime()) / 1000)),
    30 * 60
  );

  return db.transaction(async (tx) => {
    const [claimed] = await tx
      .update(mockExamSessions)
      .set({ submittedAt })
      .where(
        and(
          eq(mockExamSessions.id, examSession.id),
          isNull(mockExamSessions.submittedAt),
          eq(mockExamSessions.isPaused, false),
          gte(mockExamSessions.expiresAt, submittedAt)
        )
      )
      .returning({ id: mockExamSessions.id });

    if (!claimed) {
      throw new MockExamSubmissionError("Phiên thi thử đã được nộp hoặc đã hết hạn.");
    }

    const [attempt] = await tx
      .insert(attempts)
      .values({
        userId: input.userId,
        topicId: null,
        mode: "exam",
        examId: examSession.examId,
        totalQuestions: graded.total,
        correctCount: graded.correctCount,
        timeTakenSec,
      })
      .returning({ id: attempts.id });

    await tx.insert(attemptAnswers).values(
      graded.results.map((result) => ({
        attemptId: attempt.id,
        questionId: result.questionId,
        selectedIndex: result.selectedIndex,
        isCorrect: result.isCorrect,
      }))
    );

    if (input.userId !== null) {
      const [progress] = await tx
        .select({ correctAnswerStreak: users.correctAnswerStreak })
        .from(users)
        .where(eq(users.id, input.userId))
        .for("update");
      let correctStreak = progress?.correctAnswerStreak ?? 0;
      for (const answer of graded.results) {
        correctStreak = answer.isCorrect ? correctStreak + 1 : 0;
      }
      if (progress) {
        await tx
          .update(users)
          .set({ correctAnswerStreak: correctStreak })
          .where(eq(users.id, input.userId));
      }

      const topicQuestionRows = await tx
        .select({ id: questions.id, topicId: questions.topicId })
        .from(questions)
        .where(inArray(questions.id, graded.results.map((result) => result.questionId)));
      const questionTopics = new Map(topicQuestionRows.map((question) => [question.id, question.topicId]));
      const topicScores = new Map<string, { total: number; correct: number }>();
      for (const result of graded.results) {
        const topicId = questionTopics.get(result.questionId);
        if (!topicId) continue;
        const score = topicScores.get(topicId) ?? { total: 0, correct: 0 };
        score.total += 1;
        if (result.isCorrect) score.correct += 1;
        topicScores.set(topicId, score);
      }

      const earnedKeys: string[] = [];
      if (correctStreak >= 10) earnedKeys.push("correct-10");
      if (correctStreak >= 100) earnedKeys.push("correct-100");
      for (const [topicId, score] of topicScores) {
        if (score.total >= 5 && score.correct / score.total >= 0.9) {
          earnedKeys.push(`topic-${topicId}`);
        }
      }
      if (earnedKeys.length > 0) {
        const knownKeys = new Set<string>(ACHIEVEMENTS.map((achievement) => achievement.key));
        await tx
          .insert(userAchievements)
          .values(
            earnedKeys
              .filter((key) => knownKeys.has(key))
              .map((achievementKey) => ({ userId: input.userId!, achievementKey }))
          )
          .onConflictDoNothing();
      }
    }

    return { ...graded, attemptId: attempt.id };
  });
}

/** Cập nhật chuỗi trả lời đúng để xét danh hiệu mà không lưu lượt ôn vào lịch sử. */
export async function updatePracticeAnswerStreak(
  userId: number,
  results: GradedResult[]
) {
  await db.transaction(async (tx) => {
    const [progress] = await tx
      .select({ correctAnswerStreak: users.correctAnswerStreak })
      .from(users)
      .where(eq(users.id, userId))
      .for("update");
    if (!progress) return;

    let correctStreak = progress.correctAnswerStreak;
    for (const answer of results) {
      correctStreak = answer.isCorrect ? correctStreak + 1 : 0;
    }

    await tx
      .update(users)
      .set({ correctAnswerStreak: correctStreak })
      .where(eq(users.id, userId));

    const earnedKeys: string[] = [];
    if (correctStreak >= 10) earnedKeys.push("correct-10");
    if (correctStreak >= 100) earnedKeys.push("correct-100");
    if (earnedKeys.length > 0) {
      await tx
        .insert(userAchievements)
        .values(earnedKeys.map((achievementKey) => ({ userId, achievementKey })))
        .onConflictDoNothing();
    }
  });
}

export async function getUserAchievements(userId: number) {
  const [earned, user] = await Promise.all([
    db
      .select({ achievementKey: userAchievements.achievementKey })
      .from(userAchievements)
      .where(eq(userAchievements.userId, userId)),
    db
      .select({ equippedAchievementKey: users.equippedAchievementKey })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1),
  ]);
  return {
    earnedKeys: earned.map((row) => row.achievementKey),
    equippedKey: user[0]?.equippedAchievementKey ?? null,
  };
}

/** Lịch sử làm bài (mới nhất trước) — LEFT JOIN sang bảng topics để lấy tên. */
export async function listAttempts(limit = 30, userId?: number): Promise<AttemptSummary[]> {
  const rows = await db
    .select({
      id: attempts.id,
      topicId: attempts.topicId,
      topicName: topics.name,
      topicColorFrom: topics.colorFrom,
      topicColorTo: topics.colorTo,
      mode: attempts.mode,
      examId: attempts.examId,
      totalQuestions: attempts.totalQuestions,
      correctCount: attempts.correctCount,
      timeTakenSec: attempts.timeTakenSec,
      createdAt: attempts.createdAt,
    })
    .from(attempts)
    .leftJoin(topics, eq(attempts.topicId, topics.id))
    .where(mockExamCondition(userId))
    .orderBy(desc(attempts.createdAt))
    .limit(limit);

  return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
}

/** Chi tiết một lượt làm bài (để xem lại từng câu đã trả lờat). */
export async function getAttemptDetail(id: number, userId?: number) {
  const [head] = await db
    .select({
      id: attempts.id,
      topicId: attempts.topicId,
      topicName: topics.name,
      examId: attempts.examId,
      mode: attempts.mode,
      totalQuestions: attempts.totalQuestions,
      correctCount: attempts.correctCount,
      timeTakenSec: attempts.timeTakenSec,
      createdAt: attempts.createdAt,
    })
    .from(attempts)
    .leftJoin(topics, eq(attempts.topicId, topics.id))
    .where(
      and(
        eq(attempts.id, id),
        mockExamCondition(userId)
      )
    );

  if (!head) return null;

  // JOIN 3 bảng: attempt_answers → questions → topics
  const details = await db
    .select({
      questionId: attemptAnswers.questionId,
      selectedIndex: attemptAnswers.selectedIndex,
      isCorrect: attemptAnswers.isCorrect,
      content: questions.content,
      options: questions.options,
      correctIndex: questions.correctIndex,
      explanation: questions.explanation,
      topicName: topics.name,
    })
    .from(attemptAnswers)
    .innerJoin(questions, eq(attemptAnswers.questionId, questions.id))
    .innerJoin(topics, eq(questions.topicId, topics.id))
    .where(eq(attemptAnswers.attemptId, id));

  return { ...head, createdAt: head.createdAt.toISOString(), results: details };
}

/** Tra cứu ngân hàng câu hỏi — ilike giống LIKE '%...%' nhưng không phân biệt hoa thường. */
export async function searchQuestionBank(q: string, topicId: string) {
  const conds = [];
  if (topicId) conds.push(eq(questions.topicId, topicId));
  if (q) conds.push(ilike(questions.content, `%${q}%`));

  return db
    .select({
      id: questions.id,
      content: questions.content,
      options: questions.options,
      correctIndex: questions.correctIndex,
      explanation: questions.explanation,
      topicId: questions.topicId,
      difficulty: questions.difficulty,
      topicName: topics.name,
      colorFrom: topics.colorFrom,
      colorTo: topics.colorTo,
    })
    .from(questions)
    .innerJoin(topics, eq(questions.topicId, topics.id))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(questions.topicId, questions.id)
    .limit(200);
}
