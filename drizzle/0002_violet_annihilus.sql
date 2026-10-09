CREATE TABLE "mock_exam_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"token_hash" text NOT NULL,
	"question_ids" jsonb NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"submitted_at" timestamp with time zone,
	CONSTRAINT "mock_exam_sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "mock_exam_sessions" ADD CONSTRAINT "mock_exam_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;