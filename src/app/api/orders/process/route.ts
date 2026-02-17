import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { issueInvoiceForOrder } from "@/lib/invoice-service";
import { createAWBForOrder } from "@/lib/fancourier";
import { v4 as uuidv4 } from "uuid";
import { buildDaktelaContactFromOrder, syncContactToDaktela } from "@/lib/daktela";

interface ProcessingResult {
  orderId: string;
  orderNumber: string;
  invoiceSuccess: boolean;
  invoiceNumber?: string;
  invoiceError?: string;
  awbSuccess: boolean;
  awbNumber?: string;
  awbError?: string;
  awbId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    // Verificăm permisiunile necesare
    const canProcess = await hasPermission(session.user.id, "orders.process");
    if (!canProcess) {
      return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
    }

    const body = await request.json();
    const { orderIds, awbOptions } = body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "Selectează cel puțin o comandă" },
        { status: 400 }
      );
    }

    // Generăm un batch ID pentru a grupa erorile
    const batchId = uuidv4();

    // Rezultate procesare
    const results: ProcessingResult[] = [];
    const successfulAwbIds: string[] = [];

    // Obținem comenzile cu toate datele necesare
    const orders = await prisma.order.findMany({
      where: { id: { in: orderIds } },
      include: {
        store: true,
        invoices: { where: { status: { not: "cancelled" } }, orderBy: { createdAt: "desc" }, take: 1 },
        awb: true,
        lineItems: true,
      },
    });

    // Procesăm fiecare comandă secvențial
    for (const order of orders) {
      const result: ProcessingResult = {
        orderId: order.id,
        orderNumber: order.shopifyOrderNumber,
        invoiceSuccess: false,
        awbSuccess: false,
      };

      // PASUL 1: Emitere factură (dacă nu există deja)
      const activeInvoice = order.invoices?.[0];
      if (!activeInvoice) {
        try {
          const invoiceResult = await issueInvoiceForOrder(order.id);
          if (invoiceResult.success) {
            result.invoiceSuccess = true;
            result.invoiceNumber = invoiceResult.invoiceNumber;
          } else {
            result.invoiceError = invoiceResult.error;
            // Salvăm eroarea
            await saveProcessingError({
              orderId: order.id,
              orderNumber: order.shopifyOrderNumber,
              type: "INVOICE",
              errorMessage: invoiceResult.error || "Eroare necunoscută la emiterea facturii",
              batchId,
            });
          }
        } catch (error: any) {
          result.invoiceError = error.message;
          await saveProcessingError({
            orderId: order.id,
            orderNumber: order.shopifyOrderNumber,
            type: "INVOICE",
            errorMessage: error.message,
            batchId,
          });
        }
      } else {
        // Factura există deja
        result.invoiceSuccess = true;
        result.invoiceNumber = activeInvoice.invoiceNumber || undefined;
      }

      // PASUL 2: Emitere AWB (doar dacă factura a reușit și nu există AWB)
      if (result.invoiceSuccess && !order.awb) {
        try {
          const awbResult = await createAWBForOrder(order.id, awbOptions);
          if (awbResult.success) {
            result.awbSuccess = true;
            result.awbNumber = awbResult.awbNumber;
            
            // Obținem ID-ul AWB-ului creat
            const createdAwb = await prisma.aWB.findFirst({
              where: { orderId: order.id },
              orderBy: { createdAt: "desc" },
            });
            if (createdAwb) {
              result.awbId = createdAwb.id;
              successfulAwbIds.push(createdAwb.id);
            }
          } else {
            result.awbError = awbResult.error;
            await saveProcessingError({
              orderId: order.id,
              orderNumber: order.shopifyOrderNumber,
              type: "AWB",
              errorMessage: awbResult.error || "Eroare necunoscută la emiterea AWB",
              batchId,
            });
          }
        } catch (error: any) {
          result.awbError = error.message;
          await saveProcessingError({
            orderId: order.id,
            orderNumber: order.shopifyOrderNumber,
            type: "AWB",
            errorMessage: error.message,
            batchId,
          });
        }
      } else if (order.awb) {
        // AWB există deja
        result.awbSuccess = true;
        result.awbNumber = order.awb.awbNumber || undefined;
        result.awbId = order.awb.id;
        
        // Verificăm dacă AWB-ul nu e deja într-un picking list
        const existingPLA = await prisma.pickingListAWB.findUnique({
          where: { awbId: order.awb.id },
        });
        if (!existingPLA) {
          successfulAwbIds.push(order.awb.id);
        }
      }

      results.push(result);

      // Sync contact la Daktela (fire-and-forget)
      console.log(`[Daktela] Comanda ${order.shopifyOrderNumber}: invoiceSuccess=${result.invoiceSuccess}, awbSuccess=${result.awbSuccess}`);
      if (result.invoiceSuccess && result.awbSuccess) {
        buildDaktelaContactFromOrder(order.id)
          .then((data) => {
            console.log(`[Daktela] Date construite pentru ${order.shopifyOrderNumber}:`, data ? data.title : "null");
            return syncContactToDaktela(data);
          })
          .catch((err) => {
            console.error(`[Daktela] Eroare sync contact pentru comanda ${order.shopifyOrderNumber}:`, err);
          });
      }
    }

    // PASUL 3: Creăm picking list pentru AWB-urile procesate cu succes
    // Deduplică AWB IDs pentru a evita duplicate la picking list și print
    const uniqueAwbIds = [...new Set(successfulAwbIds)];
    let pickingList = null;
    if (uniqueAwbIds.length > 0) {
      try {
        pickingList = await createPickingListFromAWBs({
          awbIds: uniqueAwbIds,
          createdById: session.user.id,
          createdByName: session.user.name || session.user.email || "Unknown",
        });

        // PASUL 4: Notificăm toți pickerii
        if (pickingList) {
          await notifyPickers(pickingList);
        }
      } catch (error: any) {
        console.error("Eroare la crearea picking list:", error);
        // Nu oprim procesul, dar logăm eroarea
      }
    }

    // PASUL 5: Trimitem AWB-urile la printare
    if (uniqueAwbIds.length > 0) {
      try {
        await sendAWBsToPrint(uniqueAwbIds);
      } catch (error: any) {
        console.error("Eroare la trimiterea AWB-urilor la printare:", error);
      }
    }

    // Calculăm statistici
    const stats = {
      total: orders.length,
      invoicesCreated: results.filter(r => r.invoiceSuccess && r.invoiceNumber).length,
      awbsCreated: results.filter(r => r.awbSuccess && r.awbNumber).length,
      errors: results.filter(r => r.invoiceError || r.awbError).length,
    };

    return NextResponse.json({
      success: stats.errors < stats.total,
      stats,
      results,
      pickingList: pickingList ? {
        id: pickingList.id,
        code: pickingList.code,
        totalItems: pickingList.totalItems,
        totalQuantity: pickingList.totalQuantity,
      } : null,
      batchId,
    });
  } catch (error: any) {
    console.error("Error processing orders:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// ===== HELPER FUNCTIONS =====

async function saveProcessingError(params: {
  orderId: string;
  orderNumber: string;
  type: "INVOICE" | "AWB" | "PICKING_LIST";
  errorMessage: string;
  batchId: string;
}) {
  await prisma.processingError.create({
    data: {
      orderId: params.orderId,
      orderNumber: params.orderNumber,
      type: params.type,
      status: "PENDING",
      errorMessage: params.errorMessage,
      batchId: params.batchId,
    },
  });
}

async function createPickingListFromAWBs(params: {
  awbIds: string[];
  createdById: string;
  createdByName: string;
}) {
  const { awbIds, createdById, createdByName } = params;

  // Verificăm care AWB-uri nu sunt deja într-un picking list
  const existingPLAs = await prisma.pickingListAWB.findMany({
    where: { awbId: { in: awbIds } },
    select: { awbId: true },
  });
  const existingAwbIds = new Set(existingPLAs.map(p => p.awbId));
  const newAwbIds = awbIds.filter(id => !existingAwbIds.has(id));

  if (newAwbIds.length === 0) {
    return null; // Toate AWB-urile sunt deja în picking lists
  }

  // Obținem AWB-urile cu LineItems
  const awbs = await prisma.aWB.findMany({
    where: { id: { in: newAwbIds } },
    include: {
      order: {
        include: {
          lineItems: {
            select: {
              sku: true,
              barcode: true,
              title: true,
              variantTitle: true,
              quantity: true,
              imageUrl: true,
              location: true,
              masterProductId: true,
            },
          },
        },
      },
    },
  });

  if (awbs.length === 0) {
    return null;
  }

  // Rețete produse - funcționalitatea SmartBill a fost dezactivată
  // TODO: Implementare rețete locale sau din Facturis când va fi disponibil
  const recipes = new Map<string, any>();

  // Agregăm produsele și expandăm rețetele
  const productMap = new Map<string, {
    sku: string;
    barcode: string | null;
    title: string;
    variantTitle: string | null;
    quantity: number;
    imageUrl: string | null;
    location: string | null;
    masterProductId: string | null;
    isRecipeParent: boolean;
    parentKey: string | null;
    recipeLevel: number;
  }>();

  const addProduct = (
    item: any, 
    quantity: number, 
    parentKey: string | null = null, 
    recipeLevel: number = 0
  ) => {
    const key = `${item.sku}|${item.variantTitle || ""}|${parentKey || "root"}`;
    
    if (productMap.has(key)) {
      const existing = productMap.get(key)!;
      existing.quantity += quantity;
    } else {
      productMap.set(key, {
        sku: item.sku || `UNKNOWN-${Date.now()}`,
        barcode: item.barcode || null,
        title: item.title || item.name,
        variantTitle: item.variantTitle || null,
        quantity: quantity,
        imageUrl: item.imageUrl || null,
        location: item.location || null,
        masterProductId: item.masterProductId || null,
        isRecipeParent: false,
        parentKey,
        recipeLevel,
      });
    }
  };

  // Procesăm fiecare item și expandăm rețetele recursiv
  const expandRecipe = (
    sku: string, 
    quantity: number, 
    parentItem: any, 
    parentKey: string | null, 
    level: number
  ) => {
    const recipe = recipes.get(sku);
    
    if (recipe?.hasRecipe && recipe.components?.length > 0) {
      // Marcăm părintele ca având rețetă
      const parentMapKey = `${parentItem.sku}|${parentItem.variantTitle || ""}|${parentKey || "root"}`;
      const parentEntry = productMap.get(parentMapKey);
      if (parentEntry) {
        parentEntry.isRecipeParent = true;
      }

      // Adăugăm componentele
      for (const comp of recipe.components) {
        const compQuantity = quantity * comp.quantity;
        addProduct({
          sku: comp.code,
          title: comp.name,
          barcode: null,
          variantTitle: null,
          imageUrl: null,
          location: null,
          masterProductId: null,
        }, compQuantity, parentMapKey, level + 1);

        // Recursiv pentru sub-componente
        if (comp.subComponents?.length > 0) {
          expandRecipe(comp.code, compQuantity, comp, parentMapKey, level + 1);
        }
      }
    }
  };

  for (const awb of awbs) {
    for (const item of awb.order.lineItems) {
      // Adăugăm produsul principal
      addProduct(item, item.quantity, null, 0);
      
      // Expandăm rețeta dacă există
      if (item.sku) {
        expandRecipe(item.sku, item.quantity, item, null, 0);
      }
    }
  }

  // Calculăm totaluri (doar pentru itemii care nu sunt părinți de rețetă)
  const pickableItems = Array.from(productMap.values()).filter(
    p => !p.isRecipeParent || p.recipeLevel > 0
  );
  const totalItems = pickableItems.length;
  const totalQuantity = pickableItems.reduce((sum, p) => sum + p.quantity, 0);

  // Generăm cod unic
  const code = `PL-${Date.now().toString(36).toUpperCase()}`;

  // Creăm picking list-ul
  const pickingList = await prisma.$transaction(async (tx) => {
    const pl = await tx.pickingList.create({
      data: {
        code,
        name: `Picking ${new Date().toLocaleDateString("ro-RO")} - ${awbs.length} AWB-uri`,
        createdBy: createdById,
        createdByName: createdByName,
        totalItems,
        totalQuantity,
        items: {
          create: Array.from(productMap.entries()).map(([key, p]) => ({
            sku: p.sku,
            barcode: p.barcode,
            title: p.title,
            variantTitle: p.variantTitle,
            quantityRequired: p.quantity,
            imageUrl: p.imageUrl,
            location: p.location,
            masterProductId: p.masterProductId,
            isRecipeParent: p.isRecipeParent,
            recipeLevel: p.recipeLevel,
            // parentItemId se va seta după creare dacă e nevoie
          })),
        },
        awbs: {
          create: newAwbIds.map((awbId) => ({ awbId })),
        },
      },
      include: {
        items: true,
        awbs: true,
      },
    });

    return pl;
  });

  console.log(`📋 Picking list creat: ${code} cu ${totalItems} produse (${totalQuantity} bucăți)`);

  return pickingList;
}

async function notifyPickers(pickingList: any) {
  // Găsim toți userii cu rol de Picker
  const pickerRole = await prisma.role.findFirst({
    where: { name: "Picker" },
    include: {
      users: {
        include: {
          user: true,
        },
      },
    },
  });

  if (!pickerRole) {
    console.log("Rolul Picker nu există, nu se trimit notificări");
    return;
  }

  const pickerUserIds = pickerRole.users.map(u => u.userId);

  // Trimitem notificare fiecărui picker
  await prisma.notification.createMany({
    data: pickerUserIds.map(userId => ({
      userId,
      type: "picking_list_created",
      title: "Picking List Nou",
      message: `Un nou picking list (${pickingList.code}) cu ${pickingList.totalItems} produse așteaptă să fie preluat.`,
      actionUrl: `/picking/${pickingList.id}`,
      data: {
        pickingListId: pickingList.id,
        pickingListCode: pickingList.code,
        totalItems: pickingList.totalItems,
        totalQuantity: pickingList.totalQuantity,
      },
    })),
  });

  console.log(`🔔 Notificări trimise la ${pickerUserIds.length} pickeri`);
}

async function sendAWBsToPrint(awbIds: string[]) {
  // Verificăm dacă există imprimante cu autoPrint
  const autoPrintPrinter = await prisma.printer.findFirst({
    where: { isActive: true, autoPrint: true },
    orderBy: { createdAt: "asc" },
  });

  if (!autoPrintPrinter) {
    console.log("Nu există imprimante cu autoPrint activat");
    return;
  }

  // Obținem AWB-urile
  const awbs = await prisma.aWB.findMany({
    where: { id: { in: awbIds } },
    include: { order: true },
  });

  // Filtrăm AWB-urile care au awbNumber valid
  const awbsWithNumber = awbs.filter(awb => awb.awbNumber);
  if (awbsWithNumber.length === 0) {
    return;
  }

  // Verificăm dacă există deja print jobs PENDING pentru aceste AWB-uri
  const awbNumbers = awbsWithNumber.map(awb => awb.awbNumber as string);
  const existingPendingJobs = await prisma.printJob.findMany({
    where: {
      documentType: "awb",
      documentId: { in: awbNumbers },
      status: "PENDING",
    },
    select: { documentId: true },
  });
  const existingAwbNumbers = new Set(existingPendingJobs.map(job => job.documentId));

  // Creăm joburi de printare doar pentru AWB-urile care NU au deja job PENDING
  let created = 0;
  for (const awb of awbsWithNumber) {
    if (!existingAwbNumbers.has(awb.awbNumber)) {
      await prisma.printJob.create({
        data: {
          printerId: autoPrintPrinter.id,
          documentType: "awb",
          documentId: awb.awbNumber!,
          documentNumber: awb.awbNumber!,
          orderId: awb.order.id,
          orderNumber: awb.order.shopifyOrderNumber,
          status: "PENDING",
        },
      });
      created++;
    }
  }

  if (created > 0) {
    console.log(`🖨️ ${created} AWB-uri trimise la printare`);
  }
  if (existingAwbNumbers.size > 0) {
    console.log(`ℹ️ ${existingAwbNumbers.size} AWB-uri aveau deja job PENDING - skip`);
  }
}
