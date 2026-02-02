-- Migration: Add TrendyolStore table for multi-store support
-- Date: 2026-01-30
-- Purpose: Support multiple Trendyol stores per company

-- Create trendyol_stores table
CREATE TABLE IF NOT EXISTS trendyol_stores (
  id VARCHAR(30) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  supplier_id VARCHAR(100) NOT NULL UNIQUE,
  api_key VARCHAR(255) NOT NULL,
  api_secret VARCHAR(255) NOT NULL,
  webhook_secret VARCHAR(255) NOT NULL,
  store_front_code VARCHAR(10) NOT NULL,
  is_test_mode BOOLEAN DEFAULT false,
  default_brand_id INT,
  currency_rate DECIMAL(10, 4),
  invoice_series_name VARCHAR(50),
  company_id VARCHAR(30) NOT NULL REFERENCES companies(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_trendyol_stores_company_id ON trendyol_stores(company_id);

-- Add trendyol_store_id to trendyol_orders
ALTER TABLE trendyol_orders
ADD COLUMN IF NOT EXISTS trendyol_store_id VARCHAR(30) REFERENCES trendyol_stores(id);

CREATE INDEX IF NOT EXISTS idx_trendyol_orders_store_id ON trendyol_orders(trendyol_store_id);

-- Remove old Trendyol fields from settings (cleanup)
-- These will be null after migration, can be dropped later
-- ALTER TABLE settings DROP COLUMN IF EXISTS trendyol_supplier_id;
-- ALTER TABLE settings DROP COLUMN IF EXISTS trendyol_api_key;
-- etc.
-- Note: Keeping columns for now to avoid breaking changes, schema update handles it

