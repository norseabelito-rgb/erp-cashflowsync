-- Phase 7.8: Map MasterProducts to InventoryItems
-- Run this script via Railway CLI: railway run psql < prisma/migrations/manual/map_masterproduct_to_inventoryitem.sql
-- Or via Prisma: npx prisma db execute --file prisma/migrations/manual/map_masterproduct_to_inventoryitem.sql

-- Step 1: Create InventoryItems for MasterProducts that don't have one
-- Only for products with valid SKU

INSERT INTO "InventoryItem" (
  "id",
  "sku",
  "name",
  "description",
  "unit",
  "currentStock",
  "minStock",
  "costPrice",
  "isComposite",
  "isActive",
  "category",
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid()::text,  -- Generate new UUID
  mp."sku",
  mp."title",
  mp."description",
  'buc',  -- Default unit
  COALESCE(mp."stock", 0),  -- Use MasterProduct stock as initial value
  5,  -- Default minStock
  COALESCE(mp."costPrice", 0),
  false,  -- Simple items by default
  mp."isActive",
  mp."category",
  NOW(),
  NOW()
FROM "MasterProduct" mp
WHERE mp."sku" IS NOT NULL
  AND mp."sku" != ''
  AND mp."inventoryItemId" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "InventoryItem" ii WHERE ii."sku" = mp."sku"
  );

-- Step 2: Link MasterProducts to their InventoryItems by SKU
UPDATE "MasterProduct" mp
SET "inventoryItemId" = ii."id"
FROM "InventoryItem" ii
WHERE mp."sku" = ii."sku"
  AND mp."inventoryItemId" IS NULL;

-- Step 3: Report results
DO $$
DECLARE
  mapped_count INTEGER;
  unmapped_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO mapped_count
  FROM "MasterProduct"
  WHERE "inventoryItemId" IS NOT NULL;

  SELECT COUNT(*) INTO unmapped_count
  FROM "MasterProduct"
  WHERE "inventoryItemId" IS NULL AND "sku" IS NOT NULL AND "sku" != '';

  RAISE NOTICE 'Migration complete: % MasterProducts mapped to InventoryItems', mapped_count;
  RAISE NOTICE 'Remaining unmapped (no matching SKU): %', unmapped_count;
END $$;

-- Step 4: Create WarehouseStock entries for the primary warehouse
-- This ensures new InventoryItems have stock in the primary warehouse
INSERT INTO "WarehouseStock" (
  "id",
  "warehouseId",
  "itemId",
  "currentStock",
  "minStock",
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  w."id",
  ii."id",
  ii."currentStock",
  ii."minStock",
  NOW(),
  NOW()
FROM "InventoryItem" ii
CROSS JOIN "Warehouse" w
WHERE w."isPrimary" = true
  AND NOT EXISTS (
    SELECT 1 FROM "WarehouseStock" ws
    WHERE ws."itemId" = ii."id" AND ws."warehouseId" = w."id"
  );
