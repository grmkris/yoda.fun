ALTER TYPE "public"."bet_vote" ADD VALUE 'SKIP';--> statement-breakpoint
ALTER TYPE "public"."transaction_type" ADD VALUE 'POINT_PURCHASE';--> statement-breakpoint
ALTER TYPE "public"."transaction_type" ADD VALUE 'DAILY_CLAIM';--> statement-breakpoint
ALTER TYPE "public"."transaction_type" ADD VALUE 'SKIP';--> statement-breakpoint
ALTER TYPE "public"."transaction_type" ADD VALUE 'SIGNUP_BONUS';--> statement-breakpoint
CREATE TABLE "daily_state" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"free_skips_used" integer DEFAULT 0 NOT NULL,
	"daily_points_claimed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "unique_user_date_state" UNIQUE("user_id","date")
);
--> statement-breakpoint
ALTER TABLE "bet" ADD COLUMN "points_spent" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "bet" ADD COLUMN "points_returned" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "user_balance" ADD COLUMN "points" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_balance" ADD COLUMN "total_points_purchased" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
DELETE FROM "transaction";--> statement-breakpoint
ALTER TABLE "transaction" ADD COLUMN "points" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "daily_state" ADD CONSTRAINT "daily_state_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bet" DROP COLUMN "amount";--> statement-breakpoint
ALTER TABLE "bet" DROP COLUMN "payout";--> statement-breakpoint
ALTER TABLE "bet" DROP COLUMN "settlement_tx_hash";--> statement-breakpoint
ALTER TABLE "user_balance" DROP COLUMN "available_balance";--> statement-breakpoint
ALTER TABLE "user_balance" DROP COLUMN "pending_balance";--> statement-breakpoint
ALTER TABLE "user_balance" DROP COLUMN "total_deposited";--> statement-breakpoint
ALTER TABLE "user_balance" DROP COLUMN "total_withdrawn";--> statement-breakpoint
ALTER TABLE "transaction" DROP COLUMN "amount";