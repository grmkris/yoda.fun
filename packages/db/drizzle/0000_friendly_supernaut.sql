CREATE SCHEMA "audit";
--> statement-breakpoint
CREATE TYPE "public"."bet_status" AS ENUM('ACTIVE', 'WON', 'LOST', 'REFUNDED');--> statement-breakpoint
CREATE TYPE "public"."bet_vote" AS ENUM('YES', 'NO');--> statement-breakpoint
CREATE TYPE "public"."market_result" AS ENUM('YES', 'NO', 'INVALID');--> statement-breakpoint
CREATE TYPE "public"."market_status" AS ENUM('ACTIVE', 'CLOSED', 'RESOLVED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."resolution_type" AS ENUM('PRICE', 'SPORTS', 'WEB_SEARCH');--> statement-breakpoint
CREATE TYPE "public"."settlement_status" AS ENUM('PENDING', 'SETTLED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."settlement_batch_status" AS ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."deposit_status" AS ENUM('PENDING', 'CONFIRMED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."transaction_status" AS ENUM('PENDING', 'COMPLETED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('DEPOSIT', 'WITHDRAWAL', 'BET_PLACED', 'PAYOUT', 'REFUND');--> statement-breakpoint
CREATE TYPE "public"."withdrawal_status" AS ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."network" AS ENUM('BASE_MAINNET', 'BASE_SEPOLIA');--> statement-breakpoint
CREATE TYPE "public"."leaderboard_period" AS ENUM('DAILY', 'WEEKLY', 'MONTHLY', 'ALL_TIME');--> statement-breakpoint
CREATE TABLE "audit"."record_version" (
	"id" serial PRIMARY KEY NOT NULL,
	"record_id" text,
	"old_record_id" text,
	"op" text,
	"ts" timestamp with time zone DEFAULT now() NOT NULL,
	"table_oid" integer NOT NULL,
	"table_schema" text NOT NULL,
	"table_name" text NOT NULL,
	"record" jsonb,
	"old_record" jsonb
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" uuid PRIMARY KEY NOT NULL,
	"account_id" uuid NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" uuid PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" uuid NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"username" text,
	"is_anonymous" boolean DEFAULT false NOT NULL,
	"display_username" text,
	CONSTRAINT "user_email_unique" UNIQUE("email"),
	CONSTRAINT "user_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" uuid PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "wallet_address" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"address" text NOT NULL,
	"chain_id" integer NOT NULL,
	"is_primary" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bet" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"market_id" uuid NOT NULL,
	"vote" "bet_vote" NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"status" "bet_status" DEFAULT 'ACTIVE' NOT NULL,
	"payout" numeric(10, 2),
	"settlement_status" "settlement_status" DEFAULT 'PENDING' NOT NULL,
	"settled_at" timestamp with time zone,
	"settlement_tx_hash" text,
	"settlement_batch_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "unique_user_market_bet" UNIQUE("user_id","market_id")
);
--> statement-breakpoint
CREATE TABLE "market" (
	"id" uuid PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"image_url" text,
	"category" text,
	"tags" text[],
	"status" "market_status" DEFAULT 'ACTIVE' NOT NULL,
	"voting_ends_at" timestamp with time zone NOT NULL,
	"resolution_deadline" timestamp with time zone NOT NULL,
	"bet_amount" numeric(10, 2) DEFAULT '0.10' NOT NULL,
	"total_yes_votes" integer DEFAULT 0 NOT NULL,
	"total_no_votes" integer DEFAULT 0 NOT NULL,
	"total_pool" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"result" "market_result",
	"created_by_id" uuid,
	"resolved_at" timestamp with time zone,
	"resolution_criteria" text,
	"resolution_type" "resolution_type",
	"resolution_strategy" jsonb,
	"resolution_sources" jsonb,
	"resolution_confidence" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_balance" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"available_balance" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"pending_balance" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"total_deposited" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"total_withdrawn" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_balance_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "settlement_batch" (
	"id" uuid PRIMARY KEY NOT NULL,
	"status" "settlement_batch_status" DEFAULT 'PENDING' NOT NULL,
	"total_amount" numeric(12, 2) NOT NULL,
	"user_count" integer NOT NULL,
	"tx_hash" text,
	"processed_at" timestamp with time zone,
	"failure_reason" text,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deposit" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"status" "deposit_status" DEFAULT 'PENDING' NOT NULL,
	"tx_hash" text NOT NULL,
	"wallet_address" text NOT NULL,
	"transaction_id" uuid,
	"confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transaction" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "transaction_type" NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"status" "transaction_status" DEFAULT 'PENDING' NOT NULL,
	"tx_hash" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "withdrawal" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"status" "withdrawal_status" DEFAULT 'PENDING' NOT NULL,
	"wallet_address" text NOT NULL,
	"tx_hash" text,
	"transaction_id" uuid,
	"completed_at" timestamp with time zone,
	"settlement_batch_id" uuid,
	"requested_amount" numeric(10, 2),
	"actual_amount" numeric(10, 2),
	"minimum_threshold_met" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_config" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"network" "network" DEFAULT 'BASE_SEPOLIA' NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "follow" (
	"id" uuid PRIMARY KEY NOT NULL,
	"follower_id" uuid NOT NULL,
	"following_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "unique_follow_relationship" UNIQUE("follower_id","following_id")
);
--> statement-breakpoint
CREATE TABLE "user_profile" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"bio" text,
	"avatar_url" text,
	"is_public" boolean DEFAULT true NOT NULL,
	"show_stats" boolean DEFAULT true NOT NULL,
	"show_bet_history" boolean DEFAULT true NOT NULL,
	"twitter_handle" text,
	"telegram_handle" text,
	"follower_count" integer DEFAULT 0 NOT NULL,
	"following_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_profile_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user_stats" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"total_bets" integer DEFAULT 0 NOT NULL,
	"total_wins" integer DEFAULT 0 NOT NULL,
	"total_losses" integer DEFAULT 0 NOT NULL,
	"total_profit" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"win_rate" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"current_streak" integer DEFAULT 0 NOT NULL,
	"longest_streak" integer DEFAULT 0 NOT NULL,
	"last_streak_type" text,
	"daily_profit" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"daily_wins" integer DEFAULT 0 NOT NULL,
	"weekly_profit" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"weekly_wins" integer DEFAULT 0 NOT NULL,
	"monthly_profit" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"monthly_wins" integer DEFAULT 0 NOT NULL,
	"last_bet_at" timestamp with time zone,
	"last_win_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_stats_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_address" ADD CONSTRAINT "wallet_address_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bet" ADD CONSTRAINT "bet_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bet" ADD CONSTRAINT "bet_market_id_market_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."market"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market" ADD CONSTRAINT "market_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_balance" ADD CONSTRAINT "user_balance_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deposit" ADD CONSTRAINT "deposit_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deposit" ADD CONSTRAINT "deposit_transaction_id_transaction_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transaction"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "withdrawal" ADD CONSTRAINT "withdrawal_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "withdrawal" ADD CONSTRAINT "withdrawal_transaction_id_transaction_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transaction"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "withdrawal" ADD CONSTRAINT "withdrawal_settlement_batch_id_settlement_batch_id_fk" FOREIGN KEY ("settlement_batch_id") REFERENCES "public"."settlement_batch"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow" ADD CONSTRAINT "follow_follower_id_user_id_fk" FOREIGN KEY ("follower_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow" ADD CONSTRAINT "follow_following_id_user_id_fk" FOREIGN KEY ("following_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profile" ADD CONSTRAINT "user_profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_stats" ADD CONSTRAINT "user_stats_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "record_version_ts" ON "audit"."record_version" USING brin ("ts");--> statement-breakpoint
CREATE INDEX "record_version_table_oid" ON "audit"."record_version" USING btree ("table_oid");--> statement-breakpoint
CREATE INDEX "record_version_record_id" ON "audit"."record_version" USING btree ("record_id");--> statement-breakpoint
CREATE INDEX "record_version_old_record_id" ON "audit"."record_version" USING btree ("old_record_id");--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "walletAddress_userId_idx" ON "wallet_address" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_follow_follower" ON "follow" USING btree ("follower_id");--> statement-breakpoint
CREATE INDEX "idx_follow_following" ON "follow" USING btree ("following_id");--> statement-breakpoint
CREATE INDEX "idx_user_stats_total_profit" ON "user_stats" USING btree ("total_profit");--> statement-breakpoint
CREATE INDEX "idx_user_stats_win_rate" ON "user_stats" USING btree ("win_rate");--> statement-breakpoint
CREATE INDEX "idx_user_stats_current_streak" ON "user_stats" USING btree ("current_streak");--> statement-breakpoint
CREATE INDEX "idx_user_stats_daily_profit" ON "user_stats" USING btree ("daily_profit");--> statement-breakpoint
CREATE INDEX "idx_user_stats_weekly_profit" ON "user_stats" USING btree ("weekly_profit");--> statement-breakpoint
CREATE INDEX "idx_user_stats_monthly_profit" ON "user_stats" USING btree ("monthly_profit");