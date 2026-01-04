ALTER TABLE "wallet_address" ALTER COLUMN "chain_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "wallet_address" ADD COLUMN "chain_namespace" text;--> statement-breakpoint
UPDATE "wallet_address" SET "chain_namespace" = 'eip155' WHERE "chain_namespace" IS NULL;--> statement-breakpoint
ALTER TABLE "wallet_address" ALTER COLUMN "chain_namespace" SET NOT NULL;--> statement-breakpoint
CREATE INDEX "walletAddress_address_idx" ON "wallet_address" USING btree ("address");--> statement-breakpoint
ALTER TABLE "market" DROP COLUMN "resolution_strategy";