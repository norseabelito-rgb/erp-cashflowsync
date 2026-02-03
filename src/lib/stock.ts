import prisma from "./db";
import { StockMovementType } from "@/types/prisma-enums";

/**
 * Găsește un produs după SKU
 */
export async function findProductBySku(sku: string) {
  return prisma.product.findUnique({
    where: { sku },
    include: {
      components: {
        include: {
          componentProduct: true,
        },
      },
    },
  });
}

/**
 * Creează sau actualizează un produs
 */
export async function upsertProduct(data: {
  sku: string;
  name: string;
  description?: string;
  price?: number;
  costPrice?: number;
  stockQuantity?: number;
  lowStockAlert?: number;
  isComposite?: boolean;
  category?: string;
  supplier?: string;
  unit?: string;
}) {
  return prisma.product.upsert({
    where: { sku: data.sku },
    create: {
      sku: data.sku,
      name: data.name,
      description: data.description,
      price: data.price || 0,
      costPrice: data.costPrice || 0,
      stockQuantity: data.stockQuantity || 0,
      lowStockAlert: data.lowStockAlert || 5,
      isComposite: data.isComposite || false,
      category: data.category,
      supplier: data.supplier,
      unit: data.unit || "buc",
    },
    update: {
      name: data.name,
      description: data.description,
      price: data.price,
      costPrice: data.costPrice,
      category: data.category,
      supplier: data.supplier,
      unit: data.unit,
    },
  });
}

/**
 * Adaugă componente la un produs compus
 */
export async function setProductComponents(
  compositeProductId: string,
  components: Array<{ componentSku: string; quantity: number }>
) {
  // Șterge componentele existente
  await prisma.productComponent.deleteMany({
    where: { compositeProductId },
  });

  // Adaugă noile componente
  for (const comp of components) {
    const componentProduct = await prisma.product.findUnique({
      where: { sku: comp.componentSku },
    });

    if (componentProduct) {
      await prisma.productComponent.create({
        data: {
          compositeProductId,
          componentProductId: componentProduct.id,
          quantity: comp.quantity,
        },
      });
    }
  }

  // Marchează produsul ca fiind compus
  await prisma.product.update({
    where: { id: compositeProductId },
    data: { isComposite: true },
  });
}

/**
 * Obține componentele efective ale unui produs (inclusiv pentru produse simple)
 * Pentru un produs simplu, returnează produsul însuși cu quantity = 1
 * Pentru un produs compus, returnează componentele cu cantitățile din rețetă
 */
export async function getEffectiveComponents(
  productId: string
): Promise<Array<{ productId: string; sku: string; name: string; quantity: number }>> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      components: {
        include: {
          componentProduct: true,
        },
      },
    },
  });

  if (!product) {
    return [];
  }

  if (!product.isComposite || product.components.length === 0) {
    // Produs simplu - returnează produsul însuși
    return [
      {
        productId: product.id,
        sku: product.sku,
        name: product.name,
        quantity: 1,
      },
    ];
  }

  // Produs compus - returnează componentele
  return product.components.map((comp) => ({
    productId: comp.componentProduct.id,
    sku: comp.componentProduct.sku,
    name: comp.componentProduct.name,
    quantity: comp.quantity,
  }));
}

/**
 * Înregistrează o mișcare de stoc
 */
export async function recordStockMovement(data: {
  productId: string;
  type: StockMovementType;
  quantity: number;
  orderId?: string;
  invoiceId?: string;
  reference?: string;
  notes?: string;
  createdBy?: string;
}) {
  const product = await prisma.product.findUnique({
    where: { id: data.productId },
  });

  if (!product) {
    throw new Error(`Produsul cu ID ${data.productId} nu a fost găsit`);
  }

  const previousStock = product.stockQuantity;
  const quantityChange = data.type === StockMovementType.OUT ? -Math.abs(data.quantity) : Math.abs(data.quantity);
  const newStock = previousStock + quantityChange;

  // B13: Validate that stock doesn't go negative (unless explicitly allowed)
  if (newStock < 0) {
    throw new Error(
      `Stoc insuficient pentru ${product.name} (${product.sku}). ` +
      `Stoc curent: ${previousStock}, Necesar: ${Math.abs(data.quantity)}`
    );
  }

  // B14: Use transaction to ensure atomicity of all stock updates
  return prisma.$transaction(async (tx) => {
    // Actualizează stocul produsului în inventar (Product)
    await tx.product.update({
      where: { id: data.productId },
      data: { stockQuantity: newStock },
    });

    // Actualizează și MasterProduct dacă există cu același SKU
    try {
      const masterProduct = await tx.masterProduct.findUnique({
        where: { sku: product.sku },
      });

      if (masterProduct) {
        const newMasterStock = Math.max(0, masterProduct.stock + quantityChange);
        await tx.masterProduct.update({
          where: { sku: product.sku },
          data: {
            stock: newMasterStock,
            stockLastSyncedAt: new Date(),
          },
        });
        console.log(`     📦 MasterProduct ${product.sku} stock: ${masterProduct.stock} → ${newMasterStock}`);
      }
    } catch (masterError) {
      // Nu oprim procesarea dacă MasterProduct nu poate fi actualizat
      console.warn(`     ⚠️ Nu s-a putut actualiza MasterProduct pentru ${product.sku}`);
    }

    // Înregistrează mișcarea
    return tx.stockMovement.create({
      data: {
        productId: data.productId,
        type: data.type,
        quantity: quantityChange,
        previousStock,
        newStock,
        orderId: data.orderId,
        invoiceId: data.invoiceId,
        reference: data.reference,
        notes: data.notes,
        createdBy: data.createdBy,
      },
    });
  }); // Close transaction
}

/**
 * Procesează descărcarea stocului pentru o comandă (la emiterea facturii)
 */
export async function processStockForOrder(
  orderId: string,
  invoiceId: string
): Promise<{
  success: boolean;
  processed: number;
  errors: string[];
  movements: Array<{ sku: string; quantity: number; newStock: number }>;
}> {
  const result = {
    success: true,
    processed: 0,
    errors: [] as string[],
    movements: [] as Array<{ sku: string; quantity: number; newStock: number }>,
  };

  console.log("\n" + "=".repeat(60));
  console.log("📦 PROCESARE STOC PENTRU COMANDĂ");
  console.log("=".repeat(60));
  console.log(`🛒 Order ID: ${orderId}`);
  console.log(`🧾 Invoice ID: ${invoiceId}`);

  try {
    // Obține produsele din comandă
    const lineItems = await prisma.lineItem.findMany({
      where: { orderId },
    });

    console.log(`📋 Produse în comandă: ${lineItems.length}`);

    // OPTIMIZATION: Batch load all products by SKU to avoid N+1 queries
    const skus = lineItems.filter((li) => li.sku).map((li) => li.sku as string);
    const products = skus.length > 0
      ? await prisma.product.findMany({
          where: { sku: { in: skus } },
          include: {
            components: {
              include: {
                componentProduct: true,
              },
            },
          },
        })
      : [];

    // Create a lookup map for fast access
    const productBySku = new Map(products.map((p) => [p.sku, p]));

    for (const item of lineItems) {
      if (!item.sku) {
        console.log(`  ⚠️ Produs "${item.title}" nu are SKU - skip`);
        continue;
      }

      // Găsește produsul din lookup map (no additional query)
      const product = productBySku.get(item.sku);

      if (!product) {
        console.log(`  ⚠️ SKU "${item.sku}" nu există în inventar - skip`);
        continue;
      }

      console.log(`\n  📦 Procesez: ${product.name} (${product.sku})`);
      console.log(`     Cantitate comandată: ${item.quantity}`);
      console.log(`     Este compus: ${product.isComposite ? "DA" : "NU"}`);

      // Obține componentele efective inline (data already loaded, no query needed)
      const components = (!product.isComposite || product.components.length === 0)
        ? [{ productId: product.id, sku: product.sku, name: product.name, quantity: 1 }]
        : product.components.map((comp) => ({
            productId: comp.componentProduct.id,
            sku: comp.componentProduct.sku,
            name: comp.componentProduct.name,
            quantity: comp.quantity,
          }));

      for (const comp of components) {
        const totalQuantity = comp.quantity * item.quantity;

        console.log(`     → Scad ${totalQuantity}x ${comp.name} (${comp.sku})`);

        try {
          const movement = await recordStockMovement({
            productId: comp.productId,
            type: StockMovementType.OUT,
            quantity: totalQuantity,
            orderId,
            invoiceId,
            notes: `Vânzare - Comandă ${orderId}, Produs: ${item.title}`,
          });

          result.movements.push({
            sku: comp.sku,
            quantity: totalQuantity,
            newStock: movement.newStock,
          });

          console.log(`     ✅ Stoc nou: ${movement.newStock}`);
          result.processed++;
        } catch (error: any) {
          const errorMsg = `Eroare la descărcarea stocului pentru ${comp.sku}: ${error.message}`;
          console.error(`     ❌ ${errorMsg}`);
          result.errors.push(errorMsg);
        }
      }
    }

    console.log("\n" + "-".repeat(60));
    console.log(`📊 REZULTAT: ${result.processed} mișcări procesate, ${result.errors.length} erori`);
    console.log("=".repeat(60) + "\n");

  } catch (error: any) {
    console.error("❌ Eroare la procesarea stocului:", error.message);
    result.success = false;
    result.errors.push(error.message);
  }

  return result;
}

/**
 * Actualizează statisticile zilnice de vânzări
 */
export async function updateDailySales(
  date: Date,
  data: {
    salesAmount?: number;
    ordersCount?: number;
    invoicesCount?: number;
    itemsCount?: number;
    costAmount?: number;
    awbsCount?: number;
    deliveredCount?: number;
    returnedCount?: number;
  }
) {
  // Normalizează data la începutul zilei
  const normalizedDate = new Date(date);
  normalizedDate.setHours(0, 0, 0, 0);

  const existing = await prisma.dailySales.findUnique({
    where: { date: normalizedDate },
  });

  if (existing) {
    return prisma.dailySales.update({
      where: { date: normalizedDate },
      data: {
        totalSales: { increment: data.salesAmount || 0 },
        totalOrders: { increment: data.ordersCount || 0 },
        totalInvoices: { increment: data.invoicesCount || 0 },
        totalItems: { increment: data.itemsCount || 0 },
        totalCost: { increment: data.costAmount || 0 },
        totalProfit: { increment: (data.salesAmount || 0) - (data.costAmount || 0) },
        totalAWBs: { increment: data.awbsCount || 0 },
        totalDelivered: { increment: data.deliveredCount || 0 },
        totalReturned: { increment: data.returnedCount || 0 },
      },
    });
  }

  return prisma.dailySales.create({
    data: {
      date: normalizedDate,
      totalSales: data.salesAmount || 0,
      totalOrders: data.ordersCount || 0,
      totalInvoices: data.invoicesCount || 0,
      totalItems: data.itemsCount || 0,
      totalCost: data.costAmount || 0,
      totalProfit: (data.salesAmount || 0) - (data.costAmount || 0),
      totalAWBs: data.awbsCount || 0,
      totalDelivered: data.deliveredCount || 0,
      totalReturned: data.returnedCount || 0,
    },
  });
}

/**
 * Calculează costul total al produselor dintr-o comandă
 */
export async function calculateOrderCost(orderId: string): Promise<number> {
  let totalCost = 0;

  const lineItems = await prisma.lineItem.findMany({
    where: { orderId },
  });

  for (const item of lineItems) {
    if (!item.sku) continue;

    const product = await findProductBySku(item.sku);
    if (!product) continue;

    if (product.isComposite && product.components) {
      // Pentru produse compuse, calculăm costul componentelor
      const components = await getEffectiveComponents(product.id);
      for (const comp of components) {
        const compProduct = await prisma.product.findUnique({
          where: { id: comp.productId },
        });
        if (compProduct) {
          totalCost += Number(compProduct.costPrice) * comp.quantity * item.quantity;
        }
      }
    } else {
      // Pentru produse simple
      totalCost += Number(product.costPrice) * item.quantity;
    }
  }

  return totalCost;
}

/**
 * Obține produsele cu stoc scăzut
 */
export async function getLowStockProducts() {
  // Folosim raw SQL pentru că Prisma nu suportă comparație între două câmpuri
  const products = await prisma.product.findMany({
    where: {
      isActive: true,
    },
    orderBy: {
      stockQuantity: "asc",
    },
  });

  // Filtrăm în JavaScript produsele cu stoc sub alertă
  return products.filter(p => p.stockQuantity <= p.lowStockAlert);
}

/**
 * Obține statisticile de stoc
 */
export async function getStockStats() {
  const products = await prisma.product.findMany({
    where: { isActive: true },
  });

  const totalProducts = products.length;
  const totalValue = products.reduce(
    (sum, p) => sum + Number(p.stockQuantity) * Number(p.costPrice),
    0
  );
  const lowStockCount = products.filter(
    (p) => p.stockQuantity <= p.lowStockAlert
  ).length;
  const outOfStockCount = products.filter((p) => p.stockQuantity <= 0).length;

  return {
    totalProducts,
    totalValue,
    lowStockCount,
    outOfStockCount,
  };
}

/**
 * Procesează readăugarea stocului pentru o comandă returnată
 * Se apelează când se scanează un retur și se confirmă primirea
 */
export async function processStockReturnForOrder(
  orderId: string,
  returnAwbId: string
): Promise<{
  success: boolean;
  processed: number;
  errors: string[];
  movements: Array<{ sku: string; quantity: number; newStock: number }>;
}> {
  const result = {
    success: true,
    processed: 0,
    errors: [] as string[],
    movements: [] as Array<{ sku: string; quantity: number; newStock: number }>,
  };

  console.log("\n" + "=".repeat(60));
  console.log("📦 PROCESARE RETUR STOC PENTRU COMANDĂ");
  console.log("=".repeat(60));
  console.log(`🛒 Order ID: ${orderId}`);
  console.log(`📦 Return AWB ID: ${returnAwbId}`);

  try {
    // Obține produsele din comandă
    const lineItems = await prisma.lineItem.findMany({
      where: { orderId },
    });

    console.log(`📋 Produse în comandă: ${lineItems.length}`);

    // OPTIMIZATION: Batch load all products by SKU to avoid N+1 queries
    const skus = lineItems.filter((li) => li.sku).map((li) => li.sku as string);
    const products = skus.length > 0
      ? await prisma.product.findMany({
          where: { sku: { in: skus } },
          include: {
            components: {
              include: {
                componentProduct: true,
              },
            },
          },
        })
      : [];

    // Create a lookup map for fast access
    const productBySku = new Map(products.map((p) => [p.sku, p]));

    for (const item of lineItems) {
      if (!item.sku) {
        console.log(`  ⚠️ Produs "${item.title}" nu are SKU - skip`);
        continue;
      }

      // Găsește produsul din lookup map (no additional query)
      const product = productBySku.get(item.sku);

      if (!product) {
        console.log(`  ⚠️ SKU "${item.sku}" nu există în inventar - skip`);
        continue;
      }

      console.log(`\n  📦 Procesez retur: ${product.name} (${product.sku})`);
      console.log(`     Cantitate returnată: ${item.quantity}`);
      console.log(`     Este compus: ${product.isComposite ? "DA" : "NU"}`);

      // Obține componentele efective inline (data already loaded, no query needed)
      const components = (!product.isComposite || product.components.length === 0)
        ? [{ productId: product.id, sku: product.sku, name: product.name, quantity: 1 }]
        : product.components.map((comp) => ({
            productId: comp.componentProduct.id,
            sku: comp.componentProduct.sku,
            name: comp.componentProduct.name,
            quantity: comp.quantity,
          }));

      for (const comp of components) {
        const totalQuantity = comp.quantity * item.quantity;

        console.log(`     → Adaug ${totalQuantity}x ${comp.name} (${comp.sku})`);

        try {
          const movement = await recordStockMovement({
            productId: comp.productId,
            type: StockMovementType.IN,
            quantity: totalQuantity,
            orderId,
            reference: `RETUR-${returnAwbId}`,
            notes: `Retur - Comandă ${orderId}, Produs: ${item.title}`,
          });

          result.movements.push({
            sku: comp.sku,
            quantity: totalQuantity,
            newStock: movement.newStock,
          });

          console.log(`     ✅ Stoc nou: ${movement.newStock}`);
          result.processed++;
        } catch (error: any) {
          const errorMsg = `Eroare la adăugarea stocului pentru ${comp.sku}: ${error.message}`;
          console.error(`     ❌ ${errorMsg}`);
          result.errors.push(errorMsg);
        }
      }
    }

    console.log("\n" + "-".repeat(60));
    console.log(`📊 REZULTAT RETUR: ${result.processed} mișcări procesate, ${result.errors.length} erori`);
    console.log("=".repeat(60) + "\n");

  } catch (error: any) {
    console.error("❌ Eroare la procesarea stocului retur:", error.message);
    result.success = false;
    result.errors.push(error.message);
  }

  return result;
}
