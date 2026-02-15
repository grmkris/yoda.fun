ALTER TYPE "public"."transaction_type" ADD VALUE 'FAUCET_CLAIM';--> statement-breakpoint
ALTER TABLE "bet" ADD COLUMN "on_chain_tx_hash" text;--> statement-breakpoint
ALTER TABLE "bet" ADD COLUMN "on_chain_bet_amount" integer;--> statement-breakpoint
ALTER TABLE "market" ADD COLUMN "on_chain_market_id" integer;--> statement-breakpoint
ALTER TABLE "market" ADD COLUMN "on_chain_tx_hash" text;