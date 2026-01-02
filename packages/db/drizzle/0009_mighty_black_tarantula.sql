ALTER TABLE "market" ALTER COLUMN "resolution_type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."resolution_type";--> statement-breakpoint
CREATE TYPE "public"."resolution_type" AS ENUM('PRICE', 'WEB_SEARCH');--> statement-breakpoint
ALTER TABLE "market" ALTER COLUMN "resolution_type" SET DATA TYPE "public"."resolution_type" USING "resolution_type"::"public"."resolution_type";--> statement-breakpoint
ALTER TABLE "system_config" ALTER COLUMN "network" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "system_config" ALTER COLUMN "network" SET DEFAULT 'BASE_MAINNET'::text;--> statement-breakpoint
DROP TYPE "public"."network";--> statement-breakpoint
CREATE TYPE "public"."network" AS ENUM('BASE_MAINNET');--> statement-breakpoint
ALTER TABLE "system_config" ALTER COLUMN "network" SET DEFAULT 'BASE_MAINNET'::"public"."network";--> statement-breakpoint
ALTER TABLE "system_config" ALTER COLUMN "network" SET DATA TYPE "public"."network" USING "network"::"public"."network";--> statement-breakpoint
ALTER TABLE "market" ADD COLUMN "resolution_error" text;--> statement-breakpoint
ALTER TABLE "market" ADD COLUMN "resolution_failed_at" timestamp with time zone;