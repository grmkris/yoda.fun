ALTER TABLE "ai_event" ADD COLUMN "temperature" numeric(3, 2);--> statement-breakpoint
ALTER TABLE "ai_event" ADD COLUMN "max_tokens" integer;--> statement-breakpoint
ALTER TABLE "ai_event" ADD COLUMN "top_p" numeric(3, 2);--> statement-breakpoint
ALTER TABLE "ai_event" ADD COLUMN "tools_provided" jsonb;--> statement-breakpoint
ALTER TABLE "ai_event" ADD COLUMN "reasoning_tokens" integer;--> statement-breakpoint
ALTER TABLE "ai_event" ADD COLUMN "cache_read_tokens" integer;--> statement-breakpoint
ALTER TABLE "ai_event" ADD COLUMN "cache_write_tokens" integer;--> statement-breakpoint
ALTER TABLE "ai_event" ADD COLUMN "finish_reason" text;--> statement-breakpoint
ALTER TABLE "ai_event" ADD COLUMN "response_id" text;--> statement-breakpoint
ALTER TABLE "ai_event" ADD COLUMN "total_cost_usd" numeric(10, 6);