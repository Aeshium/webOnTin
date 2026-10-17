ALTER TABLE "assignment_questions" ADD COLUMN "question_type" text DEFAULT 'single' NOT NULL;--> statement-breakpoint
ALTER TABLE "assignment_questions" ADD COLUMN "correct_answers" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "assignment_questions" ADD COLUMN "accepted_answers" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "assignment_questions" ADD COLUMN "difficulty" text DEFAULT 'basic' NOT NULL;--> statement-breakpoint
ALTER TABLE "assignments" ADD COLUMN "category" text DEFAULT 'chapter' NOT NULL;--> statement-breakpoint
ALTER TABLE "assignments" ADD COLUMN "solution_display" text DEFAULT 'after_submit' NOT NULL;
--> statement-breakpoint
UPDATE "assignment_questions" SET "question_type" = 'single_choice', "correct_answers" = jsonb_build_array("correct_index");