-- Temu Integration Tables
-- Apply with: psql $DATABASE_URL -f add_temu_tables.sql
-- Date: 2026-02-05
-- Purpose: Support Temu marketplace integration (stores, orders, order items)

-- =============================================================================
-- Create temu_stores table
-- =============================================================================
CREATE TABLE IF NOT EXISTS temu_stores (
  id VARCHAR(30) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  app_key VARCHAR(255) NOT NULL UNIQUE,
  app_secret VARCHAR(255) NOT NULL,
  access_token TEXT NOT NULL,
  access_token_expiry TIMESTAMP NOT NULL,
  webhook_secret VARCHAR(255),
  region VARCHAR(10) DEFAULT 'EU',
  currency_rate DECIMAL(10, 4),
  invoice_series_name VARCHAR(50),
  company_id VARCHAR(30) NOT NULL REFERENCES companies(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for temu_stores
CREATE INDEX IF NOT EXISTS idx_temu_stores_company_id ON temu_stores(company_id);
CREATE INDEX IF NOT EXISTS idx_temu_stores_is_active ON temu_stores(is_active);

-- =============================================================================
-- Create temu_orders table
-- =============================================================================
CREATE TABLE IF NOT EXISTS temu_orders (
  id VARCHAR(30) PRIMARY KEY,
  temu_order_id VARCHAR(100) NOT NULL UNIQUE,
  temu_order_number VARCHAR(100) NOT NULL,
  order_date TIMESTAMP NOT NULL,
  status VARCHAR(50) NOT NULL,

  -- Customer info
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255),
  customer_phone VARCHAR(50),
  customer_address TEXT NOT NULL,

  -- Financials
  total_price DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'EUR',

  -- Link to main Order (after sync)
  order_id VARCHAR(30) UNIQUE REFERENCES orders(id),

  -- Link to TemuStore
  temu_store_id VARCHAR(30) REFERENCES temu_stores(id),

  -- Invoice tracking - for sending invoice link back to Temu
  invoice_sent_to_temu BOOLEAN DEFAULT false,
  invoice_sent_at TIMESTAMP,
  invoice_send_error TEXT,

  -- AWB tracking - for sending tracking number back to Temu
  tracking_sent_to_temu BOOLEAN DEFAULT false,
  tracking_sent_at TIMESTAMP,
  tracking_send_error TEXT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for temu_orders
CREATE INDEX IF NOT EXISTS idx_temu_orders_order_id ON temu_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_temu_orders_store_id ON temu_orders(temu_store_id);
CREATE INDEX IF NOT EXISTS idx_temu_orders_status ON temu_orders(status);
CREATE INDEX IF NOT EXISTS idx_temu_orders_order_date ON temu_orders(order_date);

-- =============================================================================
-- Create temu_order_items table
-- =============================================================================
CREATE TABLE IF NOT EXISTS temu_order_items (
  id VARCHAR(30) PRIMARY KEY,
  temu_order_id VARCHAR(30) NOT NULL REFERENCES temu_orders(id) ON DELETE CASCADE,

  -- Temu product identifiers
  goods_id VARCHAR(100) NOT NULL,
  sku_id VARCHAR(100) NOT NULL,
  title VARCHAR(500) NOT NULL,
  quantity INT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,

  -- Mapping to local products
  local_sku VARCHAR(100),
  master_product_id VARCHAR(30) REFERENCES master_products(id),
  is_mapped BOOLEAN DEFAULT false
);

-- Indexes for temu_order_items
CREATE INDEX IF NOT EXISTS idx_temu_order_items_order ON temu_order_items(temu_order_id);
CREATE INDEX IF NOT EXISTS idx_temu_order_items_goods_id ON temu_order_items(goods_id);
CREATE INDEX IF NOT EXISTS idx_temu_order_items_sku_id ON temu_order_items(sku_id);
CREATE INDEX IF NOT EXISTS idx_temu_order_items_master_product ON temu_order_items(master_product_id);

-- =============================================================================
-- Notes
-- =============================================================================
-- This migration is idempotent - IF NOT EXISTS prevents duplicate table creation
-- Foreign keys reference: companies, orders, temu_stores, master_products
--
-- Expected order of execution:
-- 1. Ensure companies table exists
-- 2. Ensure orders table exists
-- 3. Ensure master_products table exists
-- 4. Run this migration
