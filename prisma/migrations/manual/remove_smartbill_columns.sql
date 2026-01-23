-- Migration: Remove SmartBill columns from invoice_series
-- Date: 2026-01-23
-- Description: SmartBill has been completely removed from the system.
--              This migration removes the deprecated SmartBill columns from invoice_series table.

-- Step 1: Remove SmartBill columns from invoice_series table
ALTER TABLE "invoice_series" DROP COLUMN IF EXISTS "sync_to_smartbill";
ALTER TABLE "invoice_series" DROP COLUMN IF EXISTS "smartbill_series";

-- Step 2: Verify the columns are removed
-- Run this SELECT to confirm (should return empty or error if columns don't exist):
-- SELECT sync_to_smartbill, smartbill_series FROM invoice_series LIMIT 1;

-- Note: Make sure to run 'prisma generate' after applying this migration
-- to update the Prisma client.
