CREATE TYPE "public"."feedback_status" AS ENUM('PENDING_AUTH', 'SUBMITTED', 'CONFIRMED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."feedback_type" AS ENUM('RESOLUTION', 'QUALITY');--> statement-breakpoint
CREATE TABLE "agent_feedback" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"market_id" uuid NOT NULL,
	"agent_id" integer NOT NULL,
	"feedback_type" "feedback_type" NOT NULL,
	"score" integer NOT NULL,
	"tx_hash" text,
	"on_chain_index" integer,
	"feedback_status" "feedback_status" DEFAULT 'PENDING_AUTH',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "unique_user_market_feedback_type" UNIQUE("user_id","market_id","feedback_type")
);
--> statement-breakpoint
CREATE TABLE "agent_identity" (
	"id" uuid PRIMARY KEY NOT NULL,
	"agent_id" integer NOT NULL,
	"owner_address" text NOT NULL,
	"token_uri" text,
	"chain_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"cached_resolution_score" integer,
	"cached_resolution_count" integer DEFAULT 0,
	"cached_quality_score" integer,
	"cached_quality_count" integer DEFAULT 0,
	"last_cache_update" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agent_identity_agent_id_unique" UNIQUE("agent_id")
);
--> statement-breakpoint
ALTER TABLE "agent_feedback" ADD CONSTRAINT "agent_feedback_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_feedback" ADD CONSTRAINT "agent_feedback_market_id_market_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."market"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_feedback_user_id_idx" ON "agent_feedback" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "agent_feedback_market_id_idx" ON "agent_feedback" USING btree ("market_id");--> statement-breakpoint
CREATE INDEX "agent_feedback_agent_id_idx" ON "agent_feedback" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "agent_feedback_status_idx" ON "agent_feedback" USING btree ("feedback_status");