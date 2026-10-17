CREATE TABLE "assignment_questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"assignment_id" integer NOT NULL,
	"source_question_id" integer,
	"content" text NOT NULL,
	"options" jsonb NOT NULL,
	"correct_index" integer NOT NULL,
	"explanation" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lesson_questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"lesson_id" integer NOT NULL,
	"question_id" integer NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
DROP INDEX "assignment_submissions_assignment_user_idx";--> statement-breakpoint
ALTER TABLE "assignment_submissions" ALTER COLUMN "content" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "assignment_submissions" ALTER COLUMN "submitted_at" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "assignment_submissions" ALTER COLUMN "submitted_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "assignment_submissions" ADD COLUMN "selected_answers" jsonb;--> statement-breakpoint
ALTER TABLE "assignment_submissions" ADD COLUMN "current_index" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "assignment_submissions" ADD COLUMN "started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "assignments" ADD COLUMN "duration_sec" integer DEFAULT 1800 NOT NULL;--> statement-breakpoint
ALTER TABLE "feedbacks" ADD COLUMN "image_data_url" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "login_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "assignment_questions" ADD CONSTRAINT "assignment_questions_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_questions" ADD CONSTRAINT "assignment_questions_source_question_id_questions_id_fk" FOREIGN KEY ("source_question_id") REFERENCES "public"."questions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_questions" ADD CONSTRAINT "lesson_questions_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_questions" ADD CONSTRAINT "lesson_questions_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assignment_questions_assignment_order_idx" ON "assignment_questions" USING btree ("assignment_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "lesson_questions_lesson_question_idx" ON "lesson_questions" USING btree ("lesson_id","question_id");--> statement-breakpoint
CREATE INDEX "lesson_questions_lesson_order_idx" ON "lesson_questions" USING btree ("lesson_id","sort_order");--> statement-breakpoint
CREATE INDEX "assignment_submissions_assignment_user_idx" ON "assignment_submissions" USING btree ("assignment_id","user_id");
--> statement-breakpoint
ALTER TABLE public.lesson_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_questions ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "lesson_questions_server_access" ON public.lesson_questions
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "assignment_questions_server_access" ON public.assignment_questions
  FOR ALL TO service_role USING (true) WITH CHECK (true);