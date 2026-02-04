import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { issueInvoiceForOrder } from "@/lib/invoice-service";
import { createAWBForOrder } from "@/lib/awb-service";
import { logActivity } from "@/lib/activity-log";
import { v4 as uuidv4 } from "uuid";
import { hasPermission } from "@/lib/permissions";

interface ProcessResult {
  orderId: string;
  orderNumber: string;
  success: boolean;
  invoiceSuccess?: boolean;
  invoiceNumber?: string;
  invoiceError?: string;
  awbSuccess?: boolean;
  awbNumber?: string;
  awbError?: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Verificăm autentificarea
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Trebuie să fii autentificat" },
        { status: 401 }
      );
    }

    // Verificăm permisiunea de procesare comenzi
    const canProcess = await hasPermission(session.user.id, "orders.process");
    if (!canProcess) {
      return NextResponse.json(
        { success: false, error: "Nu ai permisiunea de a procesa comenzi" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { orderIds, awbOptions, createPickingList = true, autoPrintPickingList = true } = body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "Trebuie să selectezi cel puțin o comandă" },
        { status: 400 }
      );
    }

    console.log(`\n📦 Procesare completă pentru ${orderIds.length} comenzi...`);

    // Count orders by source for logging
    const ordersBySource = await prisma.order.groupBy({
      by: ['source'],
      where: { id: { in: orderIds } },
      _count: true,
    });
    const sourceCounts = ordersBySource.reduce((acc, item) => {
      acc[item.source || 'shopify'] = item._count;
      return acc;
    }, {} as Record<string, number>);
    console.log(`   Surse: Shopify: ${sourceCounts['shopify'] || 0}, Trendyol: ${sourceCounts['trendyol'] || 0}`);

    // Generăm un batch ID pentru a grupa erorile
    const batchId = uuidv4();

    const results: ProcessResult[] = [];
    const errors: ProcessResult[] = [];
    const createdAwbIds: string[] = [];
    let successCount = 0;
    let invoicesIssued = 0;
    let awbsCreated = 0;

    // Batch load - încărcăm toate comenzile într-un singur query
    // Include trendyolOrder for Trendyol orders to enable invoice/AWB sync
    const orders = await prisma.order.findMany({
      where: { id: { in: orderIds } },
      include: {
        store: true,
        invoice: true,
        awb: true,
        lineItems: true,
        trendyolOrder: true,
      },
    });

    // Creăm un map pentru lookup rapid
    const ordersMap = new Map(orders.map(o => [o.id, o]));

    for (const orderId of orderIds) {
      const order = ordersMap.get(orderId);

      if (!order) {
        results.push({
          orderId,
          orderNumber: "N/A",
          success: false,
          invoiceError: "Comanda nu a fost găsită",
        });
        errors.push(results[results.length - 1]);
        continue;
      }

      const result: ProcessResult = {
        orderId: order.id,
        orderNumber: order.shopifyOrderNumber,
        success: true,
      };

      // PASUL 1: Emite factura (dacă nu există deja una validă)
      const needsInvoice = !order.invoice || 
                          order.invoice.status === "error" || 
                          order.invoice.status === "deleted" ||
                          order.invoice.status === "cancelled";

      if (needsInvoice) {
        try {
          console.log(`📄 Emetere factură pentru comanda ${order.shopifyOrderNumber}...`);
          const invoiceResult = await issueInvoiceForOrder(order.id);
          
          if (invoiceResult.success) {
            result.invoiceSuccess = true;
            result.invoiceNumber = `${invoiceResult.invoiceSeries || ""}${invoiceResult.invoiceNumber || ""}`;
            invoicesIssued++;
            console.log(`✅ Factură emisă: ${result.invoiceNumber}`);
          } else {
            result.invoiceSuccess = false;
            result.invoiceError = invoiceResult.error || "Eroare necunoscută la emitere factură";
            result.success = false;
            console.log(`❌ Eroare factură: ${result.invoiceError}`);
            
            // Salvăm eroarea în DB
            await prisma.processingError.create({
              data: {
                orderId: order.id,
                orderNumber: order.shopifyOrderNumber,
                type: "INVOICE",
                status: "PENDING",
                errorMessage: result.invoiceError,
                batchId,
              },
            });
          }
        } catch (invoiceError: any) {
          result.invoiceSuccess = false;
          result.invoiceError = invoiceError.message || "Eroare la emitere factură";
          result.success = false;
          console.log(`❌ Excepție factură: ${result.invoiceError}`);
          
          // Salvăm eroarea în DB
          await prisma.processingError.create({
            data: {
              orderId: order.id,
              orderNumber: order.shopifyOrderNumber,
              type: "INVOICE",
              status: "PENDING",
              errorMessage: result.invoiceError || "Eroare necunoscută la factură",
              batchId,
            },
          });
        }
      } else {
        // Factura există deja și e validă
        result.invoiceSuccess = true;
        result.invoiceNumber = `${order.invoice!.invoiceSeriesName || ''}${order.invoice!.invoiceNumber || ''}`;
        console.log(`ℹ️ Factură existentă: ${result.invoiceNumber}`);
      }

      // PASUL 2: Creează AWB (doar dacă factura e OK și nu există AWB valid)
      const existingAwb = order.awb;
      const awbStatus = existingAwb?.currentStatus?.toLowerCase() || "";
      const needsAwb = !existingAwb || 
                       !existingAwb.awbNumber ||
                       existingAwb.errorMessage ||
                       awbStatus.includes("șters") ||
                       awbStatus.includes("anulat");

      if (result.invoiceSuccess !== false && needsAwb) {
        try {
          console.log(`🚚 Creare AWB pentru comanda ${order.shopifyOrderNumber}...`);
          
          // Dacă există AWB vechi șters/anulat, îl ștergem din DB
          if (existingAwb && (awbStatus.includes("șters") || awbStatus.includes("anulat"))) {
            await prisma.aWBStatusHistory.deleteMany({ where: { awbId: existingAwb.id } });
            await prisma.aWB.delete({ where: { id: existingAwb.id } });
            console.log(`🗑️ AWB vechi șters din DB`);
          }

          const awbResult = await createAWBForOrder(order.id, awbOptions);
          
          if (awbResult.success && awbResult.awbNumber) {
            result.awbSuccess = true;
            result.awbNumber = awbResult.awbNumber;
            awbsCreated++;
            
            // Salvăm ID-ul AWB-ului pentru picking list
            const newAwb = await prisma.aWB.findFirst({
              where: { orderId: order.id, awbNumber: awbResult.awbNumber },
            });
            if (newAwb) {
              createdAwbIds.push(newAwb.id);
            }
            
            console.log(`✅ AWB creat: ${result.awbNumber}`);
          } else {
            result.awbSuccess = false;
            result.awbError = awbResult.error || "Eroare necunoscută la creare AWB";
            result.success = false;
            console.log(`❌ Eroare AWB: ${result.awbError}`);
            
            // Salvăm eroarea în DB
            await prisma.processingError.create({
              data: {
                orderId: order.id,
                orderNumber: order.shopifyOrderNumber,
                type: "AWB",
                status: "PENDING",
                errorMessage: result.awbError,
                batchId,
              },
            });
          }
        } catch (awbError: any) {
          result.awbSuccess = false;
          result.awbError = awbError.message || "Eroare la creare AWB";
          result.success = false;
          console.log(`❌ Excepție AWB: ${result.awbError}`);
          
          // Salvăm eroarea în DB
          await prisma.processingError.create({
            data: {
              orderId: order.id,
              orderNumber: order.shopifyOrderNumber,
              type: "AWB",
              status: "PENDING",
              errorMessage: result.awbError || "Eroare necunoscută la AWB",
              batchId,
            },
          });
        }
      } else if (!needsAwb && existingAwb?.awbNumber) {
        // AWB există deja și e valid
        result.awbSuccess = true;
        result.awbNumber = existingAwb.awbNumber;
        
        // Verificăm dacă AWB-ul nu e deja într-un picking list
        const existingPLA = await prisma.pickingListAWB.findUnique({
          where: { awbId: existingAwb.id },
        });
        if (!existingPLA) {
          createdAwbIds.push(existingAwb.id);
        }
        console.log(`ℹ️ AWB existent: ${result.awbNumber}`);
      } else if (result.invoiceSuccess === false) {
        // Nu încercăm AWB dacă factura a eșuat
        result.awbError = "AWB neinițiat - factura a eșuat";
      }

      // Determină succesul final
      if (result.invoiceSuccess === false || result.awbSuccess === false) {
        result.success = false;
        errors.push(result);
      } else {
        successCount++;
      }

      results.push(result);

      // Loghează activitatea
      await logActivity({
        entityType: "ORDER",
        entityId: order.id,
        action: result.success ? "UPDATE" : "ERROR",
        description: result.success 
          ? `Procesare completă: Factură ${result.invoiceNumber}, AWB ${result.awbNumber}`
          : `Eroare procesare: ${result.invoiceError || result.awbError}`,
        orderId: order.id,
        orderNumber: order.shopifyOrderNumber,
        invoiceNumber: result.invoiceNumber,
        awbNumber: result.awbNumber,
        success: result.success,
        errorMessage: result.invoiceError || result.awbError,
        source: "bulk_process",
      });
    }

    // PASUL 3: Creează Picking List automat (dacă e activat și avem AWB-uri)
    let pickingList = null;
    let pickingListPrintJobId = null;

    if (createPickingList && createdAwbIds.length > 0) {
      try {
        console.log(`\n📋 Creare Picking List pentru ${createdAwbIds.length} AWB-uri...`);
        
        // Obținem AWB-urile cu LineItems
        const awbs = await prisma.aWB.findMany({
          where: { id: { in: createdAwbIds } },
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

        // Agregăm produsele
        const productMap = new Map<string, {
          sku: string;
          barcode: string | null;
          title: string;
          variantTitle: string | null;
          quantity: number;
          imageUrl: string | null;
          location: string | null;
          masterProductId: string | null;
          isRecipeParent?: boolean;
        }>();

        for (const awb of awbs) {
          for (const item of awb.order.lineItems) {
            const key = `${item.sku}|${item.variantTitle || ""}`;
            
            if (productMap.has(key)) {
              const existing = productMap.get(key)!;
              existing.quantity += item.quantity;
            } else {
              productMap.set(key, {
                sku: item.sku || `UNKNOWN-${Date.now()}`,
                barcode: item.barcode,
                title: item.title,
                variantTitle: item.variantTitle,
                quantity: item.quantity,
                imageUrl: item.imageUrl,
                location: item.location,
                masterProductId: item.masterProductId,
              });
            }
          }
        }

        // Expandăm rețetele locale
        const expandedProducts: Array<{
          sku: string;
          barcode: string | null;
          title: string;
          variantTitle: string | null;
          quantity: number;
          imageUrl: string | null;
          location: string | null;
          masterProductId: string | null;
          isRecipeParent: boolean;
          parentItemId: string | null;
        }> = [];

        for (const product of productMap.values()) {
          // Verificăm dacă produsul are rețetă locală
          let hasRecipe = false;
          if (product.masterProductId) {
            const masterProduct = await prisma.masterProduct.findUnique({
              where: { id: product.masterProductId },
              include: {
                recipeAsParent: {
                  include: {
                    componentProduct: true,
                  },
                  orderBy: { sortOrder: "asc" },
                },
              },
            });

            if (masterProduct?.isComposite && masterProduct.recipeAsParent.length > 0) {
              hasRecipe = true;
              
              // Adăugăm produsul părinte (marcat că nu se ridică direct)
              expandedProducts.push({
                ...product,
                isRecipeParent: true,
                parentItemId: null,
              });

              // Adăugăm componentele
              for (const recipe of masterProduct.recipeAsParent) {
                const comp = recipe.componentProduct;
                const componentQty = Number(recipe.quantity) * product.quantity;
                
                expandedProducts.push({
                  sku: comp.sku,
                  barcode: comp.barcode,
                  title: comp.title,
                  variantTitle: null,
                  quantity: componentQty,
                  imageUrl: null,
                  location: comp.warehouseLocation,
                  masterProductId: comp.id,
                  isRecipeParent: false,
                  parentItemId: product.masterProductId, // Link către părinte
                });
              }
            }
          }

          // Dacă nu are rețetă, îl adăugăm direct
          if (!hasRecipe) {
            expandedProducts.push({
              ...product,
              isRecipeParent: false,
              parentItemId: null,
            });
          }
        }

        // Calculăm totaluri (doar pentru produsele care se ridică efectiv)
        const pickableItems = expandedProducts.filter(p => !p.isRecipeParent);
        const totalItems = pickableItems.length;
        const totalQuantity = pickableItems.reduce((sum, p) => sum + p.quantity, 0);
        
        const code = `PL-${Date.now().toString(36).toUpperCase()}`;
        const now = new Date();
        const dateStr = now.toLocaleDateString("ro-RO");
        
        const creatorName = session?.user?.name || session?.user?.email || "System";

        // Creăm picking list-ul
        pickingList = await prisma.pickingList.create({
          data: {
            code,
            name: `Picking ${dateStr} - ${awbs.length} AWB-uri`,
            createdBy: session?.user?.id || null,
            createdByName: creatorName,
            totalItems,
            totalQuantity,
            items: {
              create: expandedProducts.map((p) => ({
                sku: p.sku,
                barcode: p.barcode,
                title: p.title,
                variantTitle: p.variantTitle,
                quantityRequired: p.quantity,
                imageUrl: p.imageUrl,
                location: p.location,
                masterProductId: p.masterProductId,
                isRecipeParent: p.isRecipeParent,
              })),
            },
            awbs: {
              create: createdAwbIds.map((awbId) => ({ awbId })),
            },
          },
        });

        console.log(`✅ Picking List creat: ${pickingList.code} (${totalItems} produse pickabile, ${totalQuantity} bucăți)`);
        if (expandedProducts.some(p => p.isRecipeParent)) {
          console.log(`   📦 Rețete expandate: ${expandedProducts.filter(p => p.isRecipeParent).length} produse compuse`);
        }

        // Notificăm pickerii
        await notifyPickers(pickingList);

        // PASUL 4: Auto-print Picking List
        if (autoPrintPickingList) {
          const autoPrintPrinter = await prisma.printer.findFirst({
            where: { isActive: true, autoPrint: true },
            orderBy: { createdAt: "asc" },
          });

          if (autoPrintPrinter) {
            // Picking list-urile nu se mai printează automat
            // Se pot printa manual din pagina picking list
            console.log(`📋 Picking List ${pickingList.code} creat (printare manuală disponibilă)`);
          }
        }

      } catch (pickingError: any) {
        console.error("Eroare la crearea Picking List:", pickingError);
        // Nu oprim procesarea dacă picking list eșuează
      }
    }

    // PASUL 5: Trimitem AWB-urile la printare
    if (createdAwbIds.length > 0) {
      try {
        await sendAWBsToPrint(createdAwbIds);
      } catch (printError: any) {
        console.error("Eroare la trimiterea AWB-urilor la printare:", printError);
        // Nu oprim procesarea dacă printarea eșuează
      }
    }

    console.log(`\n📊 Rezultat procesare:`);
    console.log(`   ✅ Succes: ${successCount}/${orderIds.length}`);
    console.log(`   📄 Facturi emise: ${invoicesIssued}`);
    console.log(`   🚚 AWB-uri create: ${awbsCreated}`);
    console.log(`   ❌ Erori: ${errors.length}`);
    if (pickingList) {
      console.log(`   📋 Picking List: ${pickingList.code}`);
    }

    return NextResponse.json({
      success: errors.length === 0,
      message: errors.length === 0 
        ? `Toate cele ${orderIds.length} comenzi au fost procesate cu succes!`
        : `${successCount} comenzi procesate, ${errors.length} erori`,
      stats: {
        total: orderIds.length,
        success: successCount,
        failed: errors.length,
        invoicesIssued,
        awbsCreated,
      },
      results,
      errors,
      batchId,
      pickingList: pickingList ? {
        id: pickingList.id,
        code: pickingList.code,
        totalItems: pickingList.totalItems,
        totalQuantity: pickingList.totalQuantity,
        printJobId: pickingListPrintJobId,
      } : null,
    });

  } catch (error: any) {
    console.error("Eroare la procesarea bulk:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Eroare la procesare" },
      { status: 500 }
    );
  }
}

// Notifică toți pickerii despre noul picking list
async function notifyPickers(pickingList: any) {
  try {
    // Găsim toți userii cu rol de Picker
    const pickerRole = await prisma.role.findFirst({
      where: { name: "Picker" },
      include: {
        users: { select: { userId: true } },
      },
    });

    if (!pickerRole || pickerRole.users.length === 0) {
      console.log("Nu există pickeri de notificat");
      return;
    }

    const pickerUserIds = pickerRole.users.map(u => u.userId);

    // Creăm notificări pentru fiecare picker
    await prisma.notification.createMany({
      data: pickerUserIds.map(userId => ({
        userId,
        type: "picking_list_created",
        title: "📋 Picking List Nou",
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
  } catch (error) {
    console.error("Eroare la trimiterea notificărilor:", error);
  }
}

// Trimite AWB-urile la printare automată
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
