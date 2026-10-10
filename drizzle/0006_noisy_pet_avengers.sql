ALTER TABLE "attempts" ADD COLUMN "exam_id" text;--> statement-breakpoint
ALTER TABLE "mock_exam_sessions" ADD COLUMN "exam_id" text;--> statement-breakpoint
ALTER TABLE "mock_exam_sessions" ADD COLUMN "answers" jsonb;--> statement-breakpoint
ALTER TABLE "mock_exam_sessions" ADD COLUMN "marked_for_review" jsonb;--> statement-breakpoint
ALTER TABLE "mock_exam_sessions" ADD COLUMN "current_index" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "mock_exam_sessions" ADD COLUMN "elapsed_sec" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "mock_exam_sessions" ADD COLUMN "is_paused" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "mock_exam_sessions" ADD COLUMN "paused_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "school_name" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "class_name" text;