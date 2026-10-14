CREATE INDEX "attempt_answers_attempt_idx" ON "attempt_answers" USING btree ("attempt_id");--> statement-breakpoint
CREATE INDEX "attempt_answers_question_idx" ON "attempt_answers" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX "attempts_user_mode_created_idx" ON "attempts" USING btree ("user_id","mode","created_at");--> statement-breakpoint
CREATE INDEX "attempts_mode_exam_idx" ON "attempts" USING btree ("mode","exam_id");--> statement-breakpoint
CREATE INDEX "questions_topic_difficulty_idx" ON "questions" USING btree ("topic_id","difficulty");