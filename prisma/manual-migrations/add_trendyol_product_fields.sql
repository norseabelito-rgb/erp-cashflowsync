-- Add Trendyol integration fields to master_products
-- Safe migration: only adds columns if they don't exist

-- Trendyol product fields
DO $$
BEGIN
    -- trendyolBarcode
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'master_products' AND column_name = 'trendyolBarcode') THEN
        ALTER TABLE master_products ADD COLUMN "trendyolBarcode" TEXT;
        CREATE INDEX IF NOT EXISTS "master_products_trendyolBarcode_idx" ON master_products("trendyolBarcode");
    END IF;

    -- trendyolBrandId
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'master_products' AND column_name = 'trendyolBrandId') THEN
        ALTER TABLE master_products ADD COLUMN "trendyolBrandId" INTEGER;
    END IF;

    -- trendyolBrandName
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'master_products' AND column_name = 'trendyolBrandName') THEN
        ALTER TABLE master_products ADD COLUMN "trendyolBrandName" TEXT;
    END IF;

    -- trendyolProductId
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'master_products' AND column_name = 'trendyolProductId') THEN
        ALTER TABLE master_products ADD COLUMN "trendyolProductId" TEXT;
    END IF;

    -- trendyolStatus
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'master_products' AND column_name = 'trendyolStatus') THEN
        ALTER TABLE master_products ADD COLUMN "trendyolStatus" TEXT;
    END IF;

    -- trendyolBatchId
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'master_products' AND column_name = 'trendyolBatchId') THEN
        ALTER TABLE master_products ADD COLUMN "trendyolBatchId" TEXT;
    END IF;

    -- trendyolError
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'master_products' AND column_name = 'trendyolError') THEN
        ALTER TABLE master_products ADD COLUMN "trendyolError" TEXT;
    END IF;

    -- trendyolAttributes (JSON)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'master_products' AND column_name = 'trendyolAttributes') THEN
        ALTER TABLE master_products ADD COLUMN "trendyolAttributes" JSONB DEFAULT '[]';
    END IF;

    -- trendyolLastSyncedAt
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'master_products' AND column_name = 'trendyolLastSyncedAt') THEN
        ALTER TABLE master_products ADD COLUMN "trendyolLastSyncedAt" TIMESTAMP(3);
    END IF;

    -- trendyolCategoryId
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'master_products' AND column_name = 'trendyolCategoryId') THEN
        ALTER TABLE master_products ADD COLUMN "trendyolCategoryId" INTEGER;
    END IF;

    -- trendyol_attribute_values (JSON)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'master_products' AND column_name = 'trendyol_attribute_values') THEN
        ALTER TABLE master_products ADD COLUMN "trendyol_attribute_values" JSONB;
    END IF;
END $$;

-- Add Trendyol category mapping to categories table
DO $$
BEGIN
    -- trendyolCategoryId on categories
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'trendyolCategoryId') THEN
        ALTER TABLE categories ADD COLUMN "trendyolCategoryId" INTEGER;
    END IF;

    -- trendyolCategoryName on categories
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'trendyolCategoryName') THEN
        ALTER TABLE categories ADD COLUMN "trendyolCategoryName" TEXT;
    END IF;

    -- trendyolAttributes on categories (JSON)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'trendyolAttributes') THEN
        ALTER TABLE categories ADD COLUMN "trendyolAttributes" JSONB DEFAULT '[]';
    END IF;
END $$;
