-- Migration: Add oblioSeriesName to Store
-- Date: 2026-01-25
-- Description: Add field to store the Oblio series name for each store

-- Add oblioSeriesName column to stores table
ALTER TABLE stores ADD COLUMN IF NOT EXISTS "oblioSeriesName" VARCHAR(100);

-- Done!
-- Users will need to:
-- 1. Go to Settings > Companies > Edit
-- 2. For each store, select the Oblio series to use
