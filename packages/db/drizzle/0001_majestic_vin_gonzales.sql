ALTER TABLE "market" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "market" ALTER COLUMN "status" SET DEFAULT 'PROCESSING'::text;--> statement-breakpoint
UPDATE "market" SET "status" = CASE "status"
  WHEN 'PENDING' THEN 'PROCESSING'
  WHEN 'ACTIVE' THEN 'LIVE'
  WHEN 'CLOSED' THEN 'VOTING_ENDED'
  WHEN 'RESOLVED' THEN 'SETTLED'
  ELSE "status"
END;--> statement-breakpoint
DROP TYPE "public"."market_status";--> statement-breakpoint
CREATE TYPE "public"."market_status" AS ENUM('PROCESSING', 'LIVE', 'VOTING_ENDED', 'SETTLED', 'CANCELLED');--> statement-breakpoint
ALTER TABLE "market" ALTER COLUMN "status" SET DEFAULT 'PROCESSING'::"public"."market_status";--> statement-breakpoint
ALTER TABLE "market" ALTER COLUMN "status" SET DATA TYPE "public"."market_status" USING "status"::"public"."market_status";--> statement-breakpoint
ALTER TABLE "market" ADD COLUMN "thumbnail_url" text;