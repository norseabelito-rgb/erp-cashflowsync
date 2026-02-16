-- AlterTable: Remove unique constraint on orderId in invoices table
-- This allows multiple invoices per order (e.g. original + storno + re-issue)

-- Drop the unique constraint on orderId
ALTER TABLE "invoices" DROP CONSTRAINT IF EXISTS "invoices_orderId_key";

-- Add an index on orderId for query performance (replaces the implicit unique index)
CREATE INDEX IF NOT EXISTS "invoices_orderId_idx" ON "invoices"("orderId");
