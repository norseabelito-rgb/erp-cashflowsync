-- Add externalHandle column to master_product_channels table
-- This stores the product handle/slug for public storefront URLs

ALTER TABLE master_product_channels ADD COLUMN IF NOT EXISTS "externalHandle" TEXT;
