-- Migration: Add source field to orders table
-- Date: 2026-01-30
-- Purpose: Support multi-source orders (Shopify, Trendyol, manual)

-- Add source column with default value
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'shopify';

-- Update any NULL values to default
UPDATE orders SET source = 'shopify' WHERE source IS NULL;

-- Make column NOT NULL after setting defaults
ALTER TABLE orders
ALTER COLUMN source SET NOT NULL;

-- Note: Existing orders will have source='shopify'
-- Trendyol orders created via webhook will have source='trendyol'
