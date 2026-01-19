import prisma from "./db";

/**
 * Rezultatul verificării stocului pentru un articol
 */
export interface StockCheckResult {
  itemId: string;
  sku: string;
  name: string;
  isComposite: boolean;
  hasRecipe: boolean;
  canFulfill: boolean;
  availableQuantity: number;
  requestedQuantity: number;
  insufficientComponents: Array<{
    componentId: string;
    componentSku: string;
    componentName: string;
    requiredQuantity: number;
    availableStock: number;
    shortage: number;
  }>;
}

/**
 * Verifică disponibilitatea stocului pentru un articol din inventar
 * Pentru articole compuse, verifică stocul componentelor din rețetă
 */
export async function checkInventoryItemStock(
  itemId: string,
  quantity: number
): Promise<StockCheckResult> {
  const item = await prisma.inventoryItem.findUnique({
    where: { id: itemId },
    include: {
      recipeComponents: {
        include: {
          componentItem: {
            select: {
              id: true,
              sku: true,
              name: true,
              currentStock: true,
              unit: true,
            },
          },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!item) {
    return {
      itemId,
      sku: "",
      name: "Articol negăsit",
      isComposite: false,
      hasRecipe: false,
      canFulfill: false,
      availableQuantity: 0,
      requestedQuantity: quantity,
      insufficientComponents: [],
    };
  }

  const result: StockCheckResult = {
    itemId: item.id,
    sku: item.sku,
    name: item.name,
    isComposite: item.isComposite,
    hasRecipe: item.recipeComponents.length > 0,
    canFulfill: true,
    availableQuantity: 0,
    requestedQuantity: quantity,
    insufficientComponents: [],
  };

  if (!item.isComposite) {
    // Articol individual - verificăm stocul direct
    const currentStock = Number(item.currentStock);
    result.availableQuantity = currentStock;
    result.canFulfill = currentStock >= quantity;

    if (!result.canFulfill) {
      result.insufficientComponents.push({
        componentId: item.id,
        componentSku: item.sku,
        componentName: item.name,
        requiredQuantity: quantity,
        availableStock: currentStock,
        shortage: quantity - currentStock,
      });
    }
  } else {
    // Articol compus - verificăm stocul componentelor
    if (item.recipeComponents.length === 0) {
      // Nu are rețetă definită
      result.canFulfill = false;
      result.availableQuantity = 0;
    } else {
      let minAvailable = Infinity;

      for (const comp of item.recipeComponents) {
        const requiredQuantity = Number(comp.quantity) * quantity;
        const availableStock = Number(comp.componentItem.currentStock);
        const possibleUnits = Math.floor(availableStock / Number(comp.quantity));

        minAvailable = Math.min(minAvailable, possibleUnits);

        if (availableStock < requiredQuantity) {
          result.canFulfill = false;
          result.insufficientComponents.push({
            componentId: comp.componentItem.id,
            componentSku: comp.componentItem.sku,
            componentName: comp.componentItem.name,
            requiredQuantity,
            availableStock,
            shortage: requiredQuantity - availableStock,
          });
        }
      }

      result.availableQuantity = minAvailable === Infinity ? 0 : minAvailable;
    }
  }

  return result;
}

/**
 * Verifică stocul pentru mai multe articole dintr-o comandă
 */
export async function checkOrderStock(
  items: Array<{ inventoryItemId: string; quantity: number }>
): Promise<{
  canFulfill: boolean;
  results: StockCheckResult[];
  insufficientItems: StockCheckResult[];
}> {
  const results: StockCheckResult[] = [];
  const insufficientItems: StockCheckResult[] = [];

  for (const item of items) {
    const result = await checkInventoryItemStock(item.inventoryItemId, item.quantity);
    results.push(result);

    if (!result.canFulfill) {
      insufficientItems.push(result);
    }
  }

  return {
    canFulfill: insufficientItems.length === 0,
    results,
    insufficientItems,
  };
}

/**
 * Verifică stocul pentru o comandă pe baza produselor mapate la inventar
 */
export async function checkOrderStockByProducts(
  orderId: string
): Promise<{
  canFulfill: boolean;
  results: StockCheckResult[];
  insufficientItems: StockCheckResult[];
  unmappedProducts: Array<{ sku: string; title: string }>;
}> {
  const lineItems = await prisma.lineItem.findMany({
    where: { orderId },
  });

  const results: StockCheckResult[] = [];
  const insufficientItems: StockCheckResult[] = [];
  const unmappedProducts: Array<{ sku: string; title: string }> = [];

  for (const lineItem of lineItems) {
    if (!lineItem.sku) {
      unmappedProducts.push({ sku: "", title: lineItem.title });
      continue;
    }

    // Găsește produsul master și articolul inventar asociat
    const masterProduct = await prisma.masterProduct.findUnique({
      where: { sku: lineItem.sku },
      select: {
        id: true,
        sku: true,
        title: true,
        inventoryItemId: true,
      },
    });

    if (!masterProduct?.inventoryItemId) {
      unmappedProducts.push({
        sku: lineItem.sku,
        title: lineItem.title,
      });
      continue;
    }

    const result = await checkInventoryItemStock(
      masterProduct.inventoryItemId,
      lineItem.quantity
    );
    results.push(result);

    if (!result.canFulfill) {
      insufficientItems.push(result);
    }
  }

  return {
    canFulfill: insufficientItems.length === 0,
    results,
    insufficientItems,
    unmappedProducts,
  };
}

/**
 * Descarcă stocul pentru un articol (individual sau compus)
 */
export async function deductInventoryStock(
  itemId: string,
  quantity: number,
  options: {
    orderId?: string;
    invoiceId?: string;
    reason?: string;
    userId?: string;
    userName?: string;
  } = {}
): Promise<{
  success: boolean;
  movements: Array<{
    itemId: string;
    sku: string;
    quantity: number;
    previousStock: number;
    newStock: number;
  }>;
  error?: string;
}> {
  const movements: Array<{
    itemId: string;
    sku: string;
    quantity: number;
    previousStock: number;
    newStock: number;
  }> = [];

  try {
    const item = await prisma.inventoryItem.findUnique({
      where: { id: itemId },
      include: {
        recipeComponents: {
          include: {
            componentItem: true,
          },
        },
      },
    });

    if (!item) {
      return { success: false, movements, error: "Articolul nu a fost găsit" };
    }

    if (!item.isComposite) {
      // Articol individual - scădem stocul direct
      const previousStock = Number(item.currentStock);
      const newStock = previousStock - quantity;

      await prisma.inventoryItem.update({
        where: { id: itemId },
        data: { currentStock: newStock },
      });

      await prisma.inventoryStockMovement.create({
        data: {
          itemId,
          type: "SALE",
          quantity: -quantity,
          previousStock,
          newStock,
          orderId: options.orderId,
          invoiceId: options.invoiceId,
          reason: options.reason || "Vânzare",
          userId: options.userId,
          userName: options.userName,
        },
      });

      movements.push({
        itemId,
        sku: item.sku,
        quantity,
        previousStock,
        newStock,
      });
    } else {
      // Articol compus - scădem stocul componentelor
      if (item.recipeComponents.length === 0) {
        return {
          success: false,
          movements,
          error: "Articolul compus nu are rețetă definită",
        };
      }

      for (const comp of item.recipeComponents) {
        const componentQuantity = Number(comp.quantity) * quantity;
        const previousStock = Number(comp.componentItem.currentStock);
        const newStock = previousStock - componentQuantity;

        await prisma.inventoryItem.update({
          where: { id: comp.componentItemId },
          data: { currentStock: newStock },
        });

        await prisma.inventoryStockMovement.create({
          data: {
            itemId: comp.componentItemId,
            type: "SALE",
            quantity: -componentQuantity,
            previousStock,
            newStock,
            orderId: options.orderId,
            invoiceId: options.invoiceId,
            reason: options.reason || `Vânzare - Component pentru ${item.name}`,
            userId: options.userId,
            userName: options.userName,
          },
        });

        movements.push({
          itemId: comp.componentItemId,
          sku: comp.componentItem.sku,
          quantity: componentQuantity,
          previousStock,
          newStock,
        });
      }
    }

    return { success: true, movements };
  } catch (error: any) {
    return {
      success: false,
      movements,
      error: error.message || "Eroare la descărcarea stocului",
    };
  }
}

/**
 * Obține alertele de stoc scăzut pentru articolele din inventar
 */
export async function getLowStockAlerts(): Promise<
  Array<{
    id: string;
    sku: string;
    name: string;
    currentStock: number;
    minStock: number;
    shortage: number;
    unit: string;
    isComposite: boolean;
  }>
> {
  // Articole individuale cu stoc sub minim
  const items = await prisma.inventoryItem.findMany({
    where: {
      isActive: true,
      isComposite: false,
      minStock: { not: null },
    },
    select: {
      id: true,
      sku: true,
      name: true,
      currentStock: true,
      minStock: true,
      unit: true,
      isComposite: true,
    },
  });

  return items
    .filter((item) => Number(item.currentStock) <= Number(item.minStock))
    .map((item) => ({
      id: item.id,
      sku: item.sku,
      name: item.name,
      currentStock: Number(item.currentStock),
      minStock: Number(item.minStock),
      shortage: Number(item.minStock) - Number(item.currentStock),
      unit: item.unit,
      isComposite: item.isComposite,
    }));
}

/**
 * Verifică dacă un articol compus poate fi produs și returnează capacitatea
 */
export async function getProductionCapacity(itemId: string): Promise<{
  itemId: string;
  sku: string;
  name: string;
  canProduce: number;
  limitingComponent?: {
    id: string;
    sku: string;
    name: string;
    currentStock: number;
    requiredPerUnit: number;
  };
}> {
  const item = await prisma.inventoryItem.findUnique({
    where: { id: itemId },
    include: {
      recipeComponents: {
        include: {
          componentItem: {
            select: {
              id: true,
              sku: true,
              name: true,
              currentStock: true,
              unit: true,
            },
          },
        },
      },
    },
  });

  if (!item || !item.isComposite || item.recipeComponents.length === 0) {
    return {
      itemId,
      sku: item?.sku || "",
      name: item?.name || "",
      canProduce: 0,
    };
  }

  let minCapacity = Infinity;
  let limitingComponent = undefined;

  for (const comp of item.recipeComponents) {
    const availableStock = Number(comp.componentItem.currentStock);
    const requiredPerUnit = Number(comp.quantity);
    const capacity = Math.floor(availableStock / requiredPerUnit);

    if (capacity < minCapacity) {
      minCapacity = capacity;
      limitingComponent = {
        id: comp.componentItem.id,
        sku: comp.componentItem.sku,
        name: comp.componentItem.name,
        currentStock: availableStock,
        requiredPerUnit,
      };
    }
  }

  return {
    itemId: item.id,
    sku: item.sku,
    name: item.name,
    canProduce: minCapacity === Infinity ? 0 : minCapacity,
    limitingComponent,
  };
}

/**
 * Procesează descărcarea stocului din inventar pentru o comandă
 * Folosește maparea MasterProduct -> InventoryItem
 */
export async function processInventoryStockForOrder(
  orderId: string,
  invoiceId: string
): Promise<{
  success: boolean;
  processed: number;
  skipped: number;
  errors: string[];
  movements: Array<{
    sku: string;
    itemName: string;
    quantity: number;
    previousStock: number;
    newStock: number;
  }>;
}> {
  const result = {
    success: true,
    processed: 0,
    skipped: 0,
    errors: [] as string[],
    movements: [] as Array<{
      sku: string;
      itemName: string;
      quantity: number;
      previousStock: number;
      newStock: number;
    }>,
  };

  console.log("\n" + "=".repeat(60));
  console.log("📦 PROCESARE STOC INVENTAR PENTRU COMANDĂ");
  console.log("=".repeat(60));
  console.log(`🛒 Order ID: ${orderId}`);
  console.log(`🧾 Invoice ID: ${invoiceId}`);

  try {
    // Obține produsele din comandă
    const lineItems = await prisma.lineItem.findMany({
      where: { orderId },
    });

    console.log(`📋 Produse în comandă: ${lineItems.length}`);

    for (const lineItem of lineItems) {
      if (!lineItem.sku) {
        console.log(`  ⚠️ Produs "${lineItem.title}" nu are SKU - skip`);
        result.skipped++;
        continue;
      }

      // Găsește MasterProduct și verifică dacă are inventoryItemId
      const masterProduct = await prisma.masterProduct.findUnique({
        where: { sku: lineItem.sku },
        select: {
          id: true,
          sku: true,
          title: true,
          inventoryItemId: true,
          inventoryItem: {
            include: {
              recipeComponents: {
                include: {
                  componentItem: true,
                },
              },
            },
          },
        },
      });

      if (!masterProduct) {
        console.log(`  ⚠️ SKU "${lineItem.sku}" nu există în MasterProduct - skip`);
        result.skipped++;
        continue;
      }

      if (!masterProduct.inventoryItemId || !masterProduct.inventoryItem) {
        console.log(`  ⚠️ SKU "${lineItem.sku}" nu este mapat la inventar - skip`);
        result.skipped++;
        continue;
      }

      const invItem = masterProduct.inventoryItem;
      console.log(`\n  📦 Procesez: ${invItem.name} (${invItem.sku})`);
      console.log(`     Cantitate comandată: ${lineItem.quantity}`);
      console.log(`     Este compus: ${invItem.isComposite ? "DA" : "NU"}`);

      // Deducem stocul folosind funcția existentă
      const deductResult = await deductInventoryStock(
        invItem.id,
        lineItem.quantity,
        {
          orderId,
          invoiceId,
          reason: `Vânzare - Comandă, Produs: ${lineItem.title}`,
        }
      );

      if (!deductResult.success) {
        result.errors.push(`Eroare la ${invItem.sku}: ${deductResult.error}`);
        console.log(`     ❌ ${deductResult.error}`);
      } else {
        for (const mov of deductResult.movements) {
          result.movements.push({
            sku: mov.sku,
            itemName: mov.sku,
            quantity: mov.quantity,
            previousStock: mov.previousStock,
            newStock: mov.newStock,
          });
          console.log(`     ✅ ${mov.sku}: ${mov.previousStock} → ${mov.newStock}`);
        }
        result.processed++;
      }
    }

    console.log("\n" + "-".repeat(60));
    console.log(`📊 REZULTAT: ${result.processed} articole procesate, ${result.skipped} sărite, ${result.errors.length} erori`);
    console.log("=".repeat(60) + "\n");

    result.success = result.errors.length === 0;
  } catch (error: any) {
    console.error("❌ Eroare la procesarea stocului inventar:", error.message);
    result.success = false;
    result.errors.push(error.message);
  }

  return result;
}

// ============================================
// MULTI-WAREHOUSE FUNCTIONS
// ============================================

/**
 * Obține depozitul principal
 */
export async function getPrimaryWarehouse(): Promise<{
  id: string;
  code: string;
  name: string;
} | null> {
  return prisma.warehouse.findFirst({
    where: { isPrimary: true, isActive: true },
    select: { id: true, code: true, name: true },
  });
}

/**
 * Obține stocul total al unui articol (suma din toate depozitele)
 */
export async function getTotalItemStock(itemId: string): Promise<number> {
  const result = await prisma.warehouseStock.aggregate({
    where: { itemId },
    _sum: { currentStock: true },
  });
  return Number(result._sum.currentStock || 0);
}

/**
 * Obține stocul unui articol per depozit
 */
export async function getItemStockByWarehouse(itemId: string): Promise<
  Array<{
    warehouseId: string;
    warehouseCode: string;
    warehouseName: string;
    currentStock: number;
    minStock: number | null;
    isPrimary: boolean;
  }>
> {
  const stocks = await prisma.warehouseStock.findMany({
    where: { itemId },
    include: {
      warehouse: {
        select: {
          id: true,
          code: true,
          name: true,
          isPrimary: true,
        },
      },
    },
  });

  return stocks.map((stock) => ({
    warehouseId: stock.warehouse.id,
    warehouseCode: stock.warehouse.code,
    warehouseName: stock.warehouse.name,
    currentStock: Number(stock.currentStock),
    minStock: stock.minStock ? Number(stock.minStock) : null,
    isPrimary: stock.warehouse.isPrimary,
  }));
}

/**
 * Verifică disponibilitatea stocului pentru un articol DINTR-UN DEPOZIT SPECIFIC
 */
export async function checkInventoryItemStockInWarehouse(
  itemId: string,
  warehouseId: string,
  quantity: number
): Promise<StockCheckResult & { warehouseStock: number }> {
  const item = await prisma.inventoryItem.findUnique({
    where: { id: itemId },
    include: {
      recipeComponents: {
        include: {
          componentItem: {
            select: {
              id: true,
              sku: true,
              name: true,
              unit: true,
            },
          },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!item) {
    return {
      itemId,
      sku: "",
      name: "Articol negăsit",
      isComposite: false,
      hasRecipe: false,
      canFulfill: false,
      availableQuantity: 0,
      requestedQuantity: quantity,
      insufficientComponents: [],
      warehouseStock: 0,
    };
  }

  const result: StockCheckResult & { warehouseStock: number } = {
    itemId: item.id,
    sku: item.sku,
    name: item.name,
    isComposite: item.isComposite,
    hasRecipe: item.recipeComponents.length > 0,
    canFulfill: true,
    availableQuantity: 0,
    requestedQuantity: quantity,
    insufficientComponents: [],
    warehouseStock: 0,
  };

  if (!item.isComposite) {
    // Articol individual - verificăm stocul din depozitul specificat
    const warehouseStock = await prisma.warehouseStock.findUnique({
      where: {
        warehouseId_itemId: {
          warehouseId,
          itemId,
        },
      },
      select: { currentStock: true },
    });

    const currentStock = Number(warehouseStock?.currentStock || 0);
    result.warehouseStock = currentStock;
    result.availableQuantity = currentStock;
    result.canFulfill = currentStock >= quantity;

    if (!result.canFulfill) {
      result.insufficientComponents.push({
        componentId: item.id,
        componentSku: item.sku,
        componentName: item.name,
        requiredQuantity: quantity,
        availableStock: currentStock,
        shortage: quantity - currentStock,
      });
    }
  } else {
    // Articol compus - verificăm stocul componentelor din depozitul specificat
    if (item.recipeComponents.length === 0) {
      result.canFulfill = false;
      result.availableQuantity = 0;
    } else {
      let minAvailable = Infinity;

      for (const comp of item.recipeComponents) {
        const warehouseStock = await prisma.warehouseStock.findUnique({
          where: {
            warehouseId_itemId: {
              warehouseId,
              itemId: comp.componentItemId,
            },
          },
          select: { currentStock: true },
        });

        const requiredQuantity = Number(comp.quantity) * quantity;
        const availableStock = Number(warehouseStock?.currentStock || 0);
        const possibleUnits = Math.floor(availableStock / Number(comp.quantity));

        minAvailable = Math.min(minAvailable, possibleUnits);

        if (availableStock < requiredQuantity) {
          result.canFulfill = false;
          result.insufficientComponents.push({
            componentId: comp.componentItem.id,
            componentSku: comp.componentItem.sku,
            componentName: comp.componentItem.name,
            requiredQuantity,
            availableStock,
            shortage: requiredQuantity - availableStock,
          });
        }
      }

      result.availableQuantity = minAvailable === Infinity ? 0 : minAvailable;
    }
  }

  return result;
}

/**
 * Descarcă stocul pentru un articol dintr-un DEPOZIT SPECIFIC
 */
export async function deductInventoryStockFromWarehouse(
  itemId: string,
  warehouseId: string,
  quantity: number,
  options: {
    orderId?: string;
    invoiceId?: string;
    reason?: string;
    userId?: string;
    userName?: string;
  } = {}
): Promise<{
  success: boolean;
  movements: Array<{
    itemId: string;
    sku: string;
    quantity: number;
    previousStock: number;
    newStock: number;
    warehouseId: string;
  }>;
  error?: string;
}> {
  const movements: Array<{
    itemId: string;
    sku: string;
    quantity: number;
    previousStock: number;
    newStock: number;
    warehouseId: string;
  }> = [];

  try {
    const item = await prisma.inventoryItem.findUnique({
      where: { id: itemId },
      include: {
        recipeComponents: {
          include: {
            componentItem: true,
          },
        },
      },
    });

    if (!item) {
      return { success: false, movements, error: "Articolul nu a fost găsit" };
    }

    // Verifică existența depozitului
    const warehouse = await prisma.warehouse.findUnique({
      where: { id: warehouseId },
    });

    if (!warehouse || !warehouse.isActive) {
      return { success: false, movements, error: "Depozitul nu a fost găsit sau este inactiv" };
    }

    if (!item.isComposite) {
      // Articol individual - scădem stocul din depozitul specificat
      const warehouseStock = await prisma.warehouseStock.findUnique({
        where: {
          warehouseId_itemId: {
            warehouseId,
            itemId,
          },
        },
      });

      const previousStock = Number(warehouseStock?.currentStock || 0);
      const newStock = previousStock - quantity;

      if (newStock < 0) {
        return {
          success: false,
          movements,
          error: `Stoc insuficient în depozit. Disponibil: ${previousStock}, Cerut: ${quantity}`,
        };
      }

      await prisma.$transaction(async (tx) => {
        // Actualizează sau creează WarehouseStock
        await tx.warehouseStock.upsert({
          where: {
            warehouseId_itemId: {
              warehouseId,
              itemId,
            },
          },
          create: {
            warehouseId,
            itemId,
            currentStock: newStock,
          },
          update: {
            currentStock: newStock,
          },
        });

        // Creează mișcarea de stoc
        await tx.inventoryStockMovement.create({
          data: {
            itemId,
            type: "SALE",
            quantity: -quantity,
            previousStock,
            newStock,
            warehouseId,
            orderId: options.orderId,
            invoiceId: options.invoiceId,
            reason: options.reason || "Vânzare",
            userId: options.userId,
            userName: options.userName,
          },
        });

        // Actualizează stocul total în InventoryItem
        const totalStock = await tx.warehouseStock.aggregate({
          where: { itemId },
          _sum: { currentStock: true },
        });

        await tx.inventoryItem.update({
          where: { id: itemId },
          data: { currentStock: totalStock._sum.currentStock || 0 },
        });
      });

      movements.push({
        itemId,
        sku: item.sku,
        quantity,
        previousStock,
        newStock,
        warehouseId,
      });
    } else {
      // Articol compus - scădem stocul componentelor din depozitul specificat
      if (item.recipeComponents.length === 0) {
        return {
          success: false,
          movements,
          error: "Articolul compus nu are rețetă definită",
        };
      }

      await prisma.$transaction(async (tx) => {
        for (const comp of item.recipeComponents) {
          const componentQuantity = Number(comp.quantity) * quantity;

          const warehouseStock = await tx.warehouseStock.findUnique({
            where: {
              warehouseId_itemId: {
                warehouseId,
                itemId: comp.componentItemId,
              },
            },
          });

          const previousStock = Number(warehouseStock?.currentStock || 0);
          const newStock = previousStock - componentQuantity;

          if (newStock < 0) {
            throw new Error(
              `Stoc insuficient pentru ${comp.componentItem.sku}. Disponibil: ${previousStock}, Cerut: ${componentQuantity}`
            );
          }

          // Actualizează WarehouseStock
          await tx.warehouseStock.upsert({
            where: {
              warehouseId_itemId: {
                warehouseId,
                itemId: comp.componentItemId,
              },
            },
            create: {
              warehouseId,
              itemId: comp.componentItemId,
              currentStock: newStock,
            },
            update: {
              currentStock: newStock,
            },
          });

          // Creează mișcarea de stoc
          await tx.inventoryStockMovement.create({
            data: {
              itemId: comp.componentItemId,
              type: "SALE",
              quantity: -componentQuantity,
              previousStock,
              newStock,
              warehouseId,
              orderId: options.orderId,
              invoiceId: options.invoiceId,
              reason: options.reason || `Vânzare - Component pentru ${item.name}`,
              userId: options.userId,
              userName: options.userName,
            },
          });

          // Actualizează stocul total în InventoryItem
          const totalStock = await tx.warehouseStock.aggregate({
            where: { itemId: comp.componentItemId },
            _sum: { currentStock: true },
          });

          await tx.inventoryItem.update({
            where: { id: comp.componentItemId },
            data: { currentStock: totalStock._sum.currentStock || 0 },
          });

          movements.push({
            itemId: comp.componentItemId,
            sku: comp.componentItem.sku,
            quantity: componentQuantity,
            previousStock,
            newStock,
            warehouseId,
          });
        }
      });
    }

    return { success: true, movements };
  } catch (error: any) {
    return {
      success: false,
      movements,
      error: error.message || "Eroare la descărcarea stocului",
    };
  }
}

/**
 * Sincronizează stocul total al unui articol cu suma din depozite
 */
export async function syncItemTotalStock(itemId: string): Promise<number> {
  const totalStock = await prisma.warehouseStock.aggregate({
    where: { itemId },
    _sum: { currentStock: true },
  });

  const newTotal = Number(totalStock._sum.currentStock || 0);

  await prisma.inventoryItem.update({
    where: { id: itemId },
    data: { currentStock: newTotal },
  });

  return newTotal;
}

/**
 * Procesează descărcarea stocului din inventar pentru o comandă
 * Folosește maparea MasterProduct -> InventoryItem
 * VERSIUNE: Folosește DEPOZITUL PRINCIPAL
 */
export async function processInventoryStockForOrderFromPrimary(
  orderId: string,
  invoiceId: string
): Promise<{
  success: boolean;
  processed: number;
  skipped: number;
  errors: string[];
  movements: Array<{
    sku: string;
    itemName: string;
    quantity: number;
    previousStock: number;
    newStock: number;
    warehouseId: string;
  }>;
  warehouseName?: string;
}> {
  const result = {
    success: true,
    processed: 0,
    skipped: 0,
    errors: [] as string[],
    movements: [] as Array<{
      sku: string;
      itemName: string;
      quantity: number;
      previousStock: number;
      newStock: number;
      warehouseId: string;
    }>,
    warehouseName: undefined as string | undefined,
  };

  console.log("\n" + "=".repeat(60));
  console.log("📦 PROCESARE STOC INVENTAR PENTRU COMANDĂ (MULTI-WAREHOUSE)");
  console.log("=".repeat(60));
  console.log(`🛒 Order ID: ${orderId}`);
  console.log(`🧾 Invoice ID: ${invoiceId}`);

  try {
    // Obține depozitul principal
    const primaryWarehouse = await getPrimaryWarehouse();

    if (!primaryWarehouse) {
      result.success = false;
      result.errors.push("Nu există depozit principal configurat");
      console.log("❌ Nu există depozit principal configurat");
      return result;
    }

    result.warehouseName = primaryWarehouse.name;
    console.log(`🏭 Depozit principal: ${primaryWarehouse.name} (${primaryWarehouse.code})`);

    // Obține produsele din comandă
    const lineItems = await prisma.lineItem.findMany({
      where: { orderId },
    });

    console.log(`📋 Produse în comandă: ${lineItems.length}`);

    for (const lineItem of lineItems) {
      if (!lineItem.sku) {
        console.log(`  ⚠️ Produs "${lineItem.title}" nu are SKU - skip`);
        result.skipped++;
        continue;
      }

      // Găsește MasterProduct și verifică dacă are inventoryItemId
      const masterProduct = await prisma.masterProduct.findUnique({
        where: { sku: lineItem.sku },
        select: {
          id: true,
          sku: true,
          title: true,
          inventoryItemId: true,
          inventoryItem: {
            include: {
              recipeComponents: {
                include: {
                  componentItem: true,
                },
              },
            },
          },
        },
      });

      if (!masterProduct) {
        console.log(`  ⚠️ SKU "${lineItem.sku}" nu există în MasterProduct - skip`);
        result.skipped++;
        continue;
      }

      if (!masterProduct.inventoryItemId || !masterProduct.inventoryItem) {
        console.log(`  ⚠️ SKU "${lineItem.sku}" nu este mapat la inventar - skip`);
        result.skipped++;
        continue;
      }

      const invItem = masterProduct.inventoryItem;
      console.log(`\n  📦 Procesez: ${invItem.name} (${invItem.sku})`);
      console.log(`     Cantitate comandată: ${lineItem.quantity}`);
      console.log(`     Este compus: ${invItem.isComposite ? "DA" : "NU"}`);

      // Deducem stocul din depozitul principal
      const deductResult = await deductInventoryStockFromWarehouse(
        invItem.id,
        primaryWarehouse.id,
        lineItem.quantity,
        {
          orderId,
          invoiceId,
          reason: `Vânzare - Comandă, Produs: ${lineItem.title}`,
        }
      );

      if (!deductResult.success) {
        result.errors.push(`Eroare la ${invItem.sku}: ${deductResult.error}`);
        console.log(`     ❌ ${deductResult.error}`);
      } else {
        for (const mov of deductResult.movements) {
          result.movements.push({
            sku: mov.sku,
            itemName: mov.sku,
            quantity: mov.quantity,
            previousStock: mov.previousStock,
            newStock: mov.newStock,
            warehouseId: mov.warehouseId,
          });
          console.log(`     ✅ ${mov.sku}: ${mov.previousStock} → ${mov.newStock}`);
        }
        result.processed++;
      }
    }

    console.log("\n" + "-".repeat(60));
    console.log(`📊 REZULTAT: ${result.processed} articole procesate, ${result.skipped} sărite, ${result.errors.length} erori`);
    console.log("=".repeat(60) + "\n");

    result.success = result.errors.length === 0;
  } catch (error: any) {
    console.error("❌ Eroare la procesarea stocului inventar:", error.message);
    result.success = false;
    result.errors.push(error.message);
  }

  return result;
}
