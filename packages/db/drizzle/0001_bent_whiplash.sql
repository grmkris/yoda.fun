CREATE TYPE "public"."activity_type" AS ENUM('BET_PLACED', 'BET_WON', 'BET_LOST', 'STREAK_MILESTONE', 'LEADERBOARD_RANK', 'FOLLOWED_USER', 'PROFILE_UPDATED');--> statement-breakpoint
CREATE TYPE "public"."leaderboard_period" AS ENUM('DAILY', 'WEEKLY', 'MONTHLY', 'ALL_TIME');--> statement-breakpoint
CREATE TABLE "activity" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "activity_type" NOT NULL,
	"metadata" jsonb,
	"is_public" boolean DEFAULT true NOT NULL,
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
ALTER TABLE "activity" ADD CONSTRAINT "activity_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow" ADD CONSTRAINT "follow_follower_id_user_id_fk" FOREIGN KEY ("follower_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow" ADD CONSTRAINT "follow_following_id_user_id_fk" FOREIGN KEY ("following_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profile" ADD CONSTRAINT "user_profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_stats" ADD CONSTRAINT "user_stats_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_activity_user" ON "activity" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_activity_type" ON "activity" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_activity_created" ON "activity" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_activity_public" ON "activity" USING btree ("is_public","created_at");--> statement-breakpoint
CREATE INDEX "idx_follow_follower" ON "follow" USING btree ("follower_id");--> statement-breakpoint
CREATE INDEX "idx_follow_following" ON "follow" USING btree ("following_id");--> statement-breakpoint
CREATE INDEX "idx_user_stats_total_profit" ON "user_stats" USING btree ("total_profit");--> statement-breakpoint
CREATE INDEX "idx_user_stats_win_rate" ON "user_stats" USING btree ("win_rate");--> statement-breakpoint
CREATE INDEX "idx_user_stats_current_streak" ON "user_stats" USING btree ("current_streak");--> statement-breakpoint
CREATE INDEX "idx_user_stats_daily_profit" ON "user_stats" USING btree ("daily_profit");--> statement-breakpoint
CREATE INDEX "idx_user_stats_weekly_profit" ON "user_stats" USING btree ("weekly_profit");--> statement-breakpoint
CREATE INDEX "idx_user_stats_monthly_profit" ON "user_stats" USING btree ("monthly_profit");