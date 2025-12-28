CREATE TABLE "ai_event" (
	"id" uuid PRIMARY KEY NOT NULL,
	"trace_id" text,
	"market_id" uuid,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"operation" text,
	"input" jsonb,
	"output" jsonb,
	"input_tokens" integer,
	"output_tokens" integer,
	"latency_ms" integer,
	"input_cost_usd" numeric(10, 6),
	"output_cost_usd" numeric(10, 6),
	"success" boolean DEFAULT true NOT NULL,
	"error" text,
	"http_status" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_event" ADD CONSTRAINT "ai_event_market_id_market_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."market"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "aie_trace_idx" ON "ai_event" USING btree ("trace_id");--> statement-breakpoint
CREATE INDEX "aie_market_idx" ON "ai_event" USING btree ("market_id");--> statement-breakpoint
CREATE INDEX "aie_created_idx" ON "ai_event" USING brin ("created_at");