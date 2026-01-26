-- Migration: Remove SmartBill columns from invoice_series
-- Date: 2026-01-23
-- Description: SmartBill has been completely removed from the system.
--              This migration removes the deprecated SmartBill columns from invoice_series table.

-- Step 1: Remove SmartBill columns from invoice_series table
ALTER TABLE "invoice_series" DROP COLUMN IF EXISTS "sync_to_smartbill";
ALTER TABLE "invoice_series" DROP COLUMN IF EXISTS "smartbill_series";

-- Step 2: Fix currentNumber = 0 (must be at least 1)
UPDATE "invoice_series"
SET "currentNumber" = 1
WHERE "currentNumber" IS NULL OR "currentNumber" < 1;

-- Step 3: Fix startNumber = 0 (must be at least 1)
UPDATE "invoice_series"
SET "startNumber" = 1
WHERE "startNumber" IS NULL OR "startNumber" < 1;

-- Step 4: Associate series without company to the primary company
UPDATE "invoice_series"
SET "companyId" = (
  SELECT id FROM "companies"
  WHERE "isPrimary" = true
  LIMIT 1
)
WHERE "companyId" IS NULL
  AND EXISTS (SELECT 1 FROM "companies" WHERE "isPrimary" = true);

-- Step 5: If no primary company, associate with any active company
UPDATE "invoice_series"
SET "companyId" = (
  SELECT id FROM "companies"
  WHERE "isActive" = true
  ORDER BY "createdAt" ASC
  LIMIT 1
)
WHERE "companyId" IS NULL
  AND EXISTS (SELECT 1 FROM "companies" WHERE "isActive" = true);

-- Note: Make sure to run 'prisma generate' after applying this migration
-- to update the Prisma client.
