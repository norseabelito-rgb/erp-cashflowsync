-- Migration: Add invoice and AWB tracking fields to trendyol_orders
-- Date: 2026-01-30
-- Purpose: Track invoice/AWB send status back to Trendyol

-- Invoice tracking fields
ALTER TABLE trendyol_orders
ADD COLUMN IF NOT EXISTS invoice_sent_to_trendyol BOOLEAN DEFAULT false;

ALTER TABLE trendyol_orders
ADD COLUMN IF NOT EXISTS invoice_sent_at TIMESTAMP;

ALTER TABLE trendyol_orders
ADD COLUMN IF NOT EXISTS invoice_send_error TEXT;

ALTER TABLE trendyol_orders
ADD COLUMN IF NOT EXISTS oblio_invoice_link TEXT;

-- AWB tracking fields
ALTER TABLE trendyol_orders
ADD COLUMN IF NOT EXISTS tracking_sent_to_trendyol BOOLEAN DEFAULT false;

ALTER TABLE trendyol_orders
ADD COLUMN IF NOT EXISTS tracking_sent_at TIMESTAMP;

ALTER TABLE trendyol_orders
ADD COLUMN IF NOT EXISTS tracking_send_error TEXT;

ALTER TABLE trendyol_orders
ADD COLUMN IF NOT EXISTS local_awb_number TEXT;

ALTER TABLE trendyol_orders
ADD COLUMN IF NOT EXISTS local_carrier TEXT;
