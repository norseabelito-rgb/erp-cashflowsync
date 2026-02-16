-- Migration: Add intercompanySeriesName to companies table
-- This column stores the Oblio series name for intercompany settlement invoices
-- Run this migration on production database to fix the P2022 error

ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "intercompanySeriesName" TEXT;

-- Optional: Add a comment to document the column purpose
COMMENT ON COLUMN "companies"."intercompanySeriesName" IS 'Oblio series name for intercompany settlement invoices (e.g., DEC, DECONT)';
