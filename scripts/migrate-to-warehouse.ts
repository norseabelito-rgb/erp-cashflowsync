/**
 * Script de migrare către sistemul multi-warehouse
 *
 * Acest script:
 * 1. Creează un depozit principal default
 * 2. Migrează stocurile existente din InventoryItem.currentStock în WarehouseStock
 * 3. Actualizează mișcările de stoc existente cu warehouseId
 * 4. Actualizează recepțiile existente cu warehouseId
 *
 * Rulare: npx ts-node scripts/migrate-to-warehouse.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function migrateToWarehouseSystem() {
  console.log("=".repeat(60));
  console.log("🏭 MIGRARE CĂTRE SISTEM MULTI-WAREHOUSE");
  console.log("=".repeat(60));
  console.log("");

  try {
    // Verifică dacă există deja depozite
    const existingWarehouses = await prisma.warehouse.count();
    if (existingWarehouses > 0) {
      console.log("⚠️  Există deja depozite în sistem. Verifică dacă migrarea e necesară.");
      const primaryWarehouse = await prisma.warehouse.findFirst({
        where: { isPrimary: true },
      });
      if (primaryWarehouse) {
        console.log(`   Depozit principal existent: ${primaryWarehouse.name} (${primaryWarehouse.code})`);
      }

      const answer = process.argv.includes("--force");
      if (!answer) {
        console.log("");
        console.log("Pentru a continua oricum, rulează cu --force");
        return;
      }
      console.log("   Continuăm cu --force...");
    }

    // 1. Creează depozitul principal default
    console.log("\n📦 PASUL 1: Creare depozit principal");
    console.log("-".repeat(40));

    let primaryWarehouse = await prisma.warehouse.findFirst({
      where: { isPrimary: true },
    });

    if (!primaryWarehouse) {
      primaryWarehouse = await prisma.warehouse.create({
        data: {
          code: "DEP-PRINCIPAL",
          name: "Depozit Principal",
          description: "Depozit principal creat automat la migrare",
          isPrimary: true,
          isActive: true,
          sortOrder: 0,
        },
      });
      console.log(`   ✅ Creat: ${primaryWarehouse.name} (ID: ${primaryWarehouse.id})`);
    } else {
      console.log(`   ℹ️  Depozit principal existent: ${primaryWarehouse.name}`);
    }

    // 2. Migrează stocurile din InventoryItem.currentStock
    console.log("\n📦 PASUL 2: Migrare stocuri");
    console.log("-".repeat(40));

    const itemsWithStock = await prisma.inventoryItem.findMany({
      where: {
        isComposite: false,
        currentStock: { gt: 0 },
      },
      select: {
        id: true,
        sku: true,
        name: true,
        currentStock: true,
        minStock: true,
      },
    });

    console.log(`   Articole cu stoc de migrat: ${itemsWithStock.length}`);

    let migratedStock = 0;
    let skippedStock = 0;

    for (const item of itemsWithStock) {
      // Verifică dacă există deja înregistrare în WarehouseStock
      const existing = await prisma.warehouseStock.findUnique({
        where: {
          warehouseId_itemId: {
            warehouseId: primaryWarehouse.id,
            itemId: item.id,
          },
        },
      });

      if (existing) {
        skippedStock++;
        continue;
      }

      await prisma.warehouseStock.create({
        data: {
          warehouseId: primaryWarehouse.id,
          itemId: item.id,
          currentStock: item.currentStock,
          minStock: item.minStock,
        },
      });

      migratedStock++;
    }

    console.log(`   ✅ Stocuri migrate: ${migratedStock}`);
    if (skippedStock > 0) {
      console.log(`   ℹ️  Stocuri deja existente (skip): ${skippedStock}`);
    }

    // 3. Actualizează mișcările de stoc existente
    console.log("\n📦 PASUL 3: Actualizare mișcări de stoc");
    console.log("-".repeat(40));

    const movementsWithoutWarehouse = await prisma.inventoryStockMovement.count({
      where: { warehouseId: null },
    });

    console.log(`   Mișcări fără warehouseId: ${movementsWithoutWarehouse}`);

    if (movementsWithoutWarehouse > 0) {
      const updateResult = await prisma.inventoryStockMovement.updateMany({
        where: { warehouseId: null },
        data: { warehouseId: primaryWarehouse.id },
      });

      console.log(`   ✅ Actualizate: ${updateResult.count}`);
    } else {
      console.log(`   ℹ️  Toate mișcările au deja warehouseId`);
    }

    // 4. Actualizează recepțiile existente
    console.log("\n📦 PASUL 4: Actualizare recepții (NIR)");
    console.log("-".repeat(40));

    const receiptsWithoutWarehouse = await prisma.goodsReceipt.count({
      where: { warehouseId: null },
    });

    console.log(`   Recepții fără warehouseId: ${receiptsWithoutWarehouse}`);

    if (receiptsWithoutWarehouse > 0) {
      const updateResult = await prisma.goodsReceipt.updateMany({
        where: { warehouseId: null },
        data: { warehouseId: primaryWarehouse.id },
      });

      console.log(`   ✅ Actualizate: ${updateResult.count}`);
    } else {
      console.log(`   ℹ️  Toate recepțiile au deja warehouseId`);
    }

    // 5. Verificare finală
    console.log("\n📦 VERIFICARE FINALĂ");
    console.log("-".repeat(40));

    const totalWarehouses = await prisma.warehouse.count();
    const totalWarehouseStock = await prisma.warehouseStock.count();
    const totalMovementsWithWarehouse = await prisma.inventoryStockMovement.count({
      where: { warehouseId: { not: null } },
    });
    const totalReceiptsWithWarehouse = await prisma.goodsReceipt.count({
      where: { warehouseId: { not: null } },
    });

    console.log(`   Depozite totale: ${totalWarehouses}`);
    console.log(`   Înregistrări WarehouseStock: ${totalWarehouseStock}`);
    console.log(`   Mișcări cu warehouseId: ${totalMovementsWithWarehouse}`);
    console.log(`   Recepții cu warehouseId: ${totalReceiptsWithWarehouse}`);

    // Verifică consistența stocurilor
    console.log("\n📦 VERIFICARE CONSISTENȚĂ STOCURI");
    console.log("-".repeat(40));

    const inconsistentItems = await prisma.$queryRaw<Array<{ id: string; sku: string; inventoryStock: number; warehouseStock: number }>>`
      SELECT
        i.id,
        i.sku,
        CAST(i."currentStock" AS DECIMAL(10,3)) as "inventoryStock",
        COALESCE(SUM(CAST(ws."currentStock" AS DECIMAL(10,3))), 0) as "warehouseStock"
      FROM inventory_items i
      LEFT JOIN warehouse_stocks ws ON i.id = ws."itemId"
      WHERE i."isComposite" = false
      GROUP BY i.id, i.sku, i."currentStock"
      HAVING CAST(i."currentStock" AS DECIMAL(10,3)) != COALESCE(SUM(CAST(ws."currentStock" AS DECIMAL(10,3))), 0)
      LIMIT 10
    `;

    if (inconsistentItems.length > 0) {
      console.log(`   ⚠️  Articole cu stoc inconsistent: ${inconsistentItems.length}`);
      for (const item of inconsistentItems) {
        console.log(`      - ${item.sku}: Inventar=${item.inventoryStock}, Warehouse=${item.warehouseStock}`);
      }
    } else {
      console.log(`   ✅ Toate stocurile sunt consistente`);
    }

    console.log("\n" + "=".repeat(60));
    console.log("✅ MIGRARE COMPLETĂ");
    console.log("=".repeat(60));
    console.log("");
    console.log("Următorii pași:");
    console.log("1. Rulează seed-ul pentru permisiuni: npx prisma db seed");
    console.log("2. Verifică că aplicația funcționează corect");
    console.log("3. Creează celelalte depozite din UI");
    console.log("");

  } catch (error) {
    console.error("\n❌ EROARE LA MIGRARE:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Rulează scriptul
migrateToWarehouseSystem()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
