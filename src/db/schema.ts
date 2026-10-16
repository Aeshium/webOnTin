// ============================================================================
// SCHEMA = bản thiết kế các bảng trong database.
// Nếu bạn đã học MySQL: mỗi pgTable(...) tương đương một lệnh CREATE TABLE.
// Ví dụ bảng `questions` tương đương:
//
//   CREATE TABLE questions (
//     id            SERIAL PRIMARY KEY,
//     topic_id      TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
//     content       TEXT NOT NULL,
//     options       JSONB NOT NULL,          -- mảng 4 đáp án A/B/C/D
//     correct_index INT  NOT NULL,           -- vị trí đáp án đúng (0..3)
//     explanation   TEXT NOT NULL            -- giải thích sau khi chấm
//   );
//
// Khác MySQL chút xíu: SERIAL ~ AUTO_INCREMENT, JSONB ~ JSON.
// Drizzle ORM cho phép khai báo bảng bằng TypeScript thay vì viết SQL thô.
// ============================================================================

import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
  uuid,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export type UserRole = "student" | "teacher" | "admin";
export type FeedbackType = "bug" | "feature" | "other";
export type FeedbackStatus = "pending" | "resolved";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  schoolName: text("school_name"),
  className: text("class_name"),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").$type<UserRole>().notNull().default("student"),
  isActive: boolean("is_active").notNull().default(true),
  background: text("background").notNull().default("aurora"),
  avatarUrl: text("avatar_url"),
  examDate: timestamp("exam_date", { withTimezone: true }),
  loginStreak: integer("login_streak").notNull().default(0),
  correctAnswerStreak: integer("correct_answer_streak").notNull().default(0),
  equippedAchievementKey: text("equipped_achievement_key"),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => [
  check("users_role_check", sql`${table.role} in ('student', 'teacher', 'admin')`),
]);

export const feedbacks = pgTable(
  "feedbacks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: integer("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    type: text("type").$type<FeedbackType>().notNull(),
    content: text("content").notNull(),
    status: text("status").$type<FeedbackStatus>().notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("feedbacks_status_created_idx").on(table.status, table.createdAt),
    check("feedbacks_type_check", sql`${table.type} in ('bug', 'feature', 'other')`),
    check("feedbacks_status_check", sql`${table.status} in ('pending', 'resolved')`),
  ]
);

export const courses = pgTable("courses", {
  id: serial("id").primaryKey(),
  teacherId: integer("teacher_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const courseEnrollments = pgTable(
  "course_enrollments",
  {
    id: serial("id").primaryKey(),
    courseId: integer("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    enrolledAt: timestamp("enrolled_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("course_enrollments_course_user_idx").on(table.courseId, table.userId),
    index("course_enrollments_user_idx").on(table.userId),
  ]
);

export const lessons = pgTable(
  "lessons",
  {
    id: serial("id").primaryKey(),
    courseId: integer("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    content: text("content").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("lessons_course_order_idx").on(table.courseId, table.sortOrder)]
);

export const assignments = pgTable("assignments", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  dueAt: timestamp("due_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const assignmentSubmissions = pgTable(
  "assignment_submissions",
  {
    id: serial("id").primaryKey(),
    assignmentId: integer("assignment_id")
      .notNull()
      .references(() => assignments.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    score: integer("score"),
    feedback: text("feedback"),
    submittedAt: timestamp("submitted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    gradedAt: timestamp("graded_at", { withTimezone: true }),
  },
  (table) => [
    index("assignment_submissions_assignment_idx").on(table.assignmentId),
    index("assignment_submissions_user_idx").on(table.userId),
    uniqueIndex("assignment_submissions_assignment_user_idx").on(table.assignmentId, table.userId),
  ]
);

export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const mockExamSessions = pgTable("mock_exam_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  tokenHash: text("token_hash").notNull().unique(),
  questionIds: jsonb("question_ids").$type<number[]>().notNull(),
  startedAt: timestamp("started_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  examId: text("exam_id"),
  answers: jsonb("answers").$type<(number | null)[]>(),
  markedForReview: jsonb("marked_for_review").$type<boolean[]>(),
  currentIndex: integer("current_index").notNull().default(0),
  elapsedSec: integer("elapsed_sec").notNull().default(0),
  isPaused: boolean("is_paused").notNull().default(false),
  pausedAt: timestamp("paused_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  message: text("message").notNull(),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const userAchievements = pgTable(
  "user_achievements",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    achievementKey: text("achievement_key").notNull(),
    earnedAt: timestamp("earned_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("user_achievements_user_key_unique").on(
      table.userId,
      table.achievementKey
    ),
  ]
);

/** Bảng chuyên đề ôn thi (Phần cứng, Hệ điều hành, ...). id là slug dùng trên URL. */
export const topics = pgTable("topics", {
  id: text("id").primaryKey(), // ví dụ: "phan-cung"
  name: text("name").notNull(), // ví dụ: "Phần cứng máy tính"
  tagline: text("tagline").notNull(), // mô tả ngắn
  icon: text("icon").notNull(), // tên icon Lucide (map ở phía client)
  colorFrom: text("color_from").notNull(), // màu gradient đầu (hex)
  colorTo: text("color_to").notNull(), // màu gradient cuối (hex)
  sortOrder: integer("sort_order").notNull().default(0),
});

/** Bảng câu hỏi trắc nghiệm. */
export const questions = pgTable(
  "questions",
  {
    id: serial("id").primaryKey(),
    topicId: text("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    options: jsonb("options").$type<string[]>().notNull(), // ["A...", "B...", "C...", "D..."]
    correctIndex: integer("correct_index").notNull(),
    explanation: text("explanation").notNull(),
    difficulty: text("difficulty").notNull().default("basic"),
  },
  (table) => [
    index("questions_topic_difficulty_idx").on(
      table.topicId,
      table.difficulty
    ),
  ]
);

/** Bảng lượt làm bài (mỗi lần bấm "Nộp bài" = 1 dòng). topicId = null nghĩa là thi thử tổng hợp. */
export const attempts = pgTable(
  "attempts",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    topicId: text("topic_id").references(() => topics.id, {
      onDelete: "set null",
    }),
    mode: text("mode").notNull().default("practice"), // "practice" | "exam"
    examId: text("exam_id"),
    totalQuestions: integer("total_questions").notNull(),
    correctCount: integer("correct_count").notNull(),
    timeTakenSec: integer("time_taken_sec").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("attempts_user_mode_created_idx").on(
      table.userId,
      table.mode,
      table.createdAt
    ),
    index("attempts_mode_exam_idx").on(table.mode, table.examId),
  ]
);

/** Bảng chi tiết từng câu trả lỡi của một lượt làm bài (để xem lại lịch sử). */
export const attemptAnswers = pgTable(
  "attempt_answers",
  {
    id: serial("id").primaryKey(),
    attemptId: integer("attempt_id")
      .notNull()
      .references(() => attempts.id, { onDelete: "cascade" }),
    questionId: integer("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    selectedIndex: integer("selected_index"), // null = bỏ trống
    isCorrect: boolean("is_correct").notNull().default(false),
  },
  (table) => [
    index("attempt_answers_attempt_idx").on(table.attemptId),
    index("attempt_answers_question_idx").on(table.questionId),
  ]
);

// Kiểu TypeScript suy ra tự động từ schema — khỏi viết interface tay.
export type Topic = typeof topics.$inferSelect;
export type Question = typeof questions.$inferSelect;
export type Attempt = typeof attempts.$inferSelect;
export type AttemptAnswer = typeof attemptAnswers.$inferSelect;
export type User = typeof users.$inferSelect;
