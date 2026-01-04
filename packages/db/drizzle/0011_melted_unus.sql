ALTER TABLE "wallet_address" ALTER COLUMN "chain_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "wallet_address" ADD COLUMN "chain_namespace" text NOT NULL;--> statement-breakpoint
CREATE INDEX "walletAddress_address_idx" ON "wallet_address" USING btree ("address");--> statement-breakpoint
ALTER TABLE "market" DROP COLUMN "resolution_strategy";