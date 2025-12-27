CREATE TYPE "public"."reward_status" AS ENUM('PENDING', 'CLAIMED', 'AUTO_CREDITED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."reward_type" AS ENUM('DAILY_STREAK', 'FIRST_BET', 'WIN_STREAK', 'REFERRAL_BONUS', 'VOLUME_MILESTONE');--> statement-breakpoint
CREATE TYPE "public"."media_source" AS ENUM('replicate', 'upload', 'external');--> statement-breakpoint
CREATE TYPE "public"."media_status" AS ENUM('pending', 'source_ready', 'processed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."media_type" AS ENUM('market_image', 'market_thumbnail', 'user_avatar');--> statement-breakpoint
CREATE TABLE "referral" (
	"id" uuid PRIMARY KEY NOT NULL,
	"referrer_id" uuid NOT NULL,
	"referee_id" uuid NOT NULL,
	"referrer_rewarded" boolean DEFAULT false NOT NULL,
	"rewarded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "referral_referee_id_unique" UNIQUE("referee_id")
);
--> statement-breakpoint
CREATE TABLE "reward_claim" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"reward_type" "reward_type" NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"status" "reward_status" DEFAULT 'PENDING' NOT NULL,
	"metadata" jsonb,
	"claimed_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"transaction_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_reward_state" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"current_daily_streak" integer DEFAULT 0 NOT NULL,
	"last_daily_claim_at" timestamp with time zone,
	"first_bet_bonus_claimed" boolean DEFAULT false NOT NULL,
	"win_streak_3_claimed" boolean DEFAULT false NOT NULL,
	"win_streak_5_claimed" boolean DEFAULT false NOT NULL,
	"win_streak_10_claimed" boolean DEFAULT false NOT NULL,
	"total_betting_volume" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"volume_100_claimed" boolean DEFAULT false NOT NULL,
	"volume_500_claimed" boolean DEFAULT false NOT NULL,
	"volume_1000_claimed" boolean DEFAULT false NOT NULL,
	"referral_code" text,
	"referral_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_reward_state_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "user_reward_state_referral_code_unique" UNIQUE("referral_code")
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" uuid PRIMARY KEY NOT NULL,
	"type" "media_type" NOT NULL,
	"source" "media_source" NOT NULL,
	"status" "media_status" DEFAULT 'pending' NOT NULL,
	"source_url" text,
	"final_key" text,
	"thumbnail_key" text,
	"metadata" jsonb,
	"error_message" text,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"tags" text[],
	"user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "referral" ADD CONSTRAINT "referral_referrer_id_user_id_fk" FOREIGN KEY ("referrer_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral" ADD CONSTRAINT "referral_referee_id_user_id_fk" FOREIGN KEY ("referee_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reward_claim" ADD CONSTRAINT "reward_claim_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reward_claim" ADD CONSTRAINT "reward_claim_transaction_id_transaction_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transaction"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_reward_state" ADD CONSTRAINT "user_reward_state_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_referral_referrer" ON "referral" USING btree ("referrer_id");--> statement-breakpoint
CREATE INDEX "idx_reward_claim_user" ON "reward_claim" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_reward_claim_status" ON "reward_claim" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_reward_claim_type" ON "reward_claim" USING btree ("reward_type");--> statement-breakpoint
CREATE INDEX "idx_media_user" ON "media" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_media_status" ON "media" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_media_type_status" ON "media" USING btree ("type","status");--> statement-breakpoint
CREATE INDEX "idx_media_tags" ON "media" USING gin ("tags");