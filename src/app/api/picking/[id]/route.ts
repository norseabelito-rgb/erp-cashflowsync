import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { hasPermission } from "@/lib/permissions";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Obține detalii picking list
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Verificăm autentificarea
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Trebuie să fii autentificat" },
        { status: 401 }
      );
    }

    // Verificăm permisiunea de vizualizare picking
    const canView = await hasPermission(session.user.id, "picking.view");
    if (!canView) {
      return NextResponse.json(
        { error: "Nu ai permisiunea de a vizualiza picking lists" },
        { status: 403 }
      );
    }

    const { id } = await params;

    const pickingList = await prisma.pickingList.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: [
            { location: "asc" },
            { sku: "asc" },
          ],
        },
        awbs: {
          include: {
            awb: {
              select: {
                id: true,
                awbNumber: true,
                currentStatus: true,
                order: {
                  select: {
                    id: true,
                    shopifyOrderNumber: true,
                    customerFirstName: true,
                    customerLastName: true,
                    customerPhone: true,
                    shippingCity: true,
                    shippingAddress1: true,
                    totalPrice: true,
                    currency: true,
                    lineItems: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!pickingList) {
      return NextResponse.json(
        { error: "Picking list nu a fost găsit" },
        { status: 404 }
      );
    }

    // Calculăm progresul - excludem produsele părinte (cu rețetă) care nu se ridică direct
    const pickableItems = pickingList.items.filter((i: any) => !i.isRecipeParent);
    const progress = {
      totalItems: pickableItems.length,
      completedItems: pickableItems.filter((i: any) => i.isComplete).length,
      totalQuantity: pickableItems.reduce((sum: number, i: any) => sum + i.quantityRequired, 0),
      pickedQuantity: pickableItems.reduce((sum: number, i: any) => sum + i.quantityPicked, 0),
      percentComplete: 0,
    };
    progress.percentComplete = progress.totalQuantity > 0 
      ? Math.round((progress.pickedQuantity / progress.totalQuantity) * 100) 
      : 0;

    return NextResponse.json({
      pickingList,
      progress,
    });
  } catch (error: any) {
    console.error("Error fetching picking list:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// PATCH - Actualizează picking list (status, assigned, scan produs)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action } = body;

    // Verificăm că picking list-ul există
    const pickingList = await prisma.pickingList.findUnique({
      where: { id },
      include: { 
        items: {
          select: {
            id: true,
            sku: true,
            barcode: true,
            title: true,
            quantityRequired: true,
            quantityPicked: true,
            isComplete: true,
            masterProductId: true,
          },
        },
      },
    });

    if (!pickingList) {
      return NextResponse.json(
        { error: "Picking list nu a fost găsit" },
        { status: 404 }
      );
    }

    // ACȚIUNE: Scanare produs
    if (action === "scan") {
      const { barcode, sku, quantity = 1, pickedBy } = body;

      if (!barcode && !sku) {
        return NextResponse.json(
          { error: "Furnizează barcode sau SKU" },
          { status: 400 }
        );
      }

      // Căutăm item-ul în picking list
      const item = pickingList.items.find((i) => 
        (barcode && i.barcode === barcode) || 
        (sku && i.sku === sku)
      );

      if (!item) {
        return NextResponse.json({
          success: false,
          error: "Produsul nu se află în acest picking list",
          scannedValue: barcode || sku,
        }, { status: 400 });
      }

      // Verificăm dacă mai e nevoie de acest produs
      if (item.isComplete) {
        return NextResponse.json({
          success: false,
          error: `Produsul "${item.title}" a fost deja completat (${item.quantityPicked}/${item.quantityRequired})`,
          item,
        }, { status: 400 });
      }

      // Actualizăm cantitatea scanată
      const newQuantityPicked = item.quantityPicked + quantity;
      const isComplete = newQuantityPicked >= item.quantityRequired;
      const actualQuantityPicked = Math.min(newQuantityPicked, item.quantityRequired);
      const quantityToDeduct = actualQuantityPicked - item.quantityPicked;

      // Tranzacție pentru update item + decrementare stoc
      const [updatedItem] = await prisma.$transaction(async (tx) => {
        // 1. Update picking list item
        const updated = await tx.pickingListItem.update({
          where: { id: item.id },
          data: {
            quantityPicked: actualQuantityPicked,
            isComplete,
            pickedAt: isComplete ? new Date() : undefined,
            pickedBy: pickedBy || undefined,
          },
        });

        // 2. Decrementăm stocul din MasterProduct (dacă există legătură)
        if (item.masterProductId && quantityToDeduct > 0) {
          const masterProduct = await tx.masterProduct.findUnique({
            where: { id: item.masterProductId },
            select: { id: true, stock: true },
          });

          if (masterProduct) {
            await tx.masterProduct.update({
              where: { id: item.masterProductId },
              data: {
                stock: Math.max(0, masterProduct.stock - quantityToDeduct),
              },
            });
          }
        } else if (!item.masterProductId && item.sku && quantityToDeduct > 0) {
          // Încercăm să găsim MasterProduct după SKU
          const masterProduct = await tx.masterProduct.findUnique({
            where: { sku: item.sku },
            select: { id: true, stock: true },
          });

          if (masterProduct) {
            await tx.masterProduct.update({
              where: { id: masterProduct.id },
              data: {
                stock: Math.max(0, masterProduct.stock - quantityToDeduct),
              },
            });
          }
        }

        return [updated];
      });

      // Actualizăm statisticile picking list-ului
      const allItems = await prisma.pickingListItem.findMany({
        where: { pickingListId: id },
      });

      // Excludem produsele părinte din calcule
      const pickableItems = allItems.filter(i => !i.isRecipeParent);
      const pickedQuantity = pickableItems.reduce((sum, i) => sum + i.quantityPicked, 0);
      const allComplete = pickableItems.every((i) => i.isComplete);

      await prisma.pickingList.update({
        where: { id },
        data: {
          pickedQuantity,
          status: allComplete ? "COMPLETED" : pickingList.status === "PENDING" ? "IN_PROGRESS" : pickingList.status,
          startedAt: pickingList.startedAt || new Date(),
          completedAt: allComplete ? new Date() : undefined,
        },
      });

      return NextResponse.json({
        success: true,
        message: isComplete 
          ? `✓ ${item.title} completat (${updatedItem.quantityPicked}/${item.quantityRequired})`
          : `${item.title}: ${updatedItem.quantityPicked}/${item.quantityRequired}`,
        item: updatedItem,
        isComplete,
        remaining: item.quantityRequired - updatedItem.quantityPicked,
        stockDeducted: quantityToDeduct,
      });
    }

    // ACȚIUNE: Pick Item (marcare manuală cu cantitate specificată)
    if (action === "pickItem") {
      const { itemId, quantity, userId, userName } = body;

      if (!itemId) {
        return NextResponse.json(
          { error: "ID-ul produsului este necesar" },
          { status: 400 }
        );
      }

      // Găsim item-ul
      const item = pickingList.items.find((i) => i.id === itemId);

      if (!item) {
        return NextResponse.json({
          success: false,
          error: "Produsul nu a fost găsit în acest picking list",
        }, { status: 400 });
      }

      // Verificăm dacă e deja complet
      if (item.isComplete) {
        // Logăm încercarea de surplus
        await prisma.pickingLog.create({
          data: {
            pickingListId: id,
            action: "SURPLUS_ATTEMPT",
            userId,
            userName,
            itemId: item.id,
            itemSku: item.sku,
            itemTitle: item.title,
            quantityBefore: item.quantityPicked,
            quantityAttempted: quantity,
            message: `Încercare de surplus: ${item.title} (deja complet: ${item.quantityPicked}/${item.quantityRequired})`,
          },
        });

        return NextResponse.json({
          success: false,
          error: `Cantitatea necesară pentru "${item.title}" a fost deja scanată (${item.quantityPicked}/${item.quantityRequired})`,
          item,
        }, { status: 400 });
      }

      // Verificăm cantitatea
      const remaining = item.quantityRequired - item.quantityPicked;
      const actualQuantity = Math.min(quantity || 1, remaining);

      if (actualQuantity <= 0) {
        return NextResponse.json({
          success: false,
          error: "Cantitatea trebuie să fie mai mare decât 0",
        }, { status: 400 });
      }

      // Actualizăm cantitatea
      const newQuantityPicked = item.quantityPicked + actualQuantity;
      const isComplete = newQuantityPicked >= item.quantityRequired;

      // Tranzacție pentru update item + decrementare stoc
      const [updatedItem] = await prisma.$transaction(async (tx) => {
        // 1. Update picking list item
        const updated = await tx.pickingListItem.update({
          where: { id: item.id },
          data: {
            quantityPicked: newQuantityPicked,
            isComplete,
            pickedAt: isComplete ? new Date() : undefined,
            pickedBy: userId,
            pickedByName: userName,
          },
        });

        // 2. Decrementăm stocul din MasterProduct
        if (item.masterProductId && actualQuantity > 0) {
          const masterProduct = await tx.masterProduct.findUnique({
            where: { id: item.masterProductId },
            select: { id: true, stock: true },
          });

          if (masterProduct) {
            await tx.masterProduct.update({
              where: { id: item.masterProductId },
              data: {
                stock: Math.max(0, masterProduct.stock - actualQuantity),
              },
            });
          }
        } else if (!item.masterProductId && item.sku && actualQuantity > 0) {
          const masterProduct = await tx.masterProduct.findUnique({
            where: { sku: item.sku },
            select: { id: true, stock: true },
          });

          if (masterProduct) {
            await tx.masterProduct.update({
              where: { id: masterProduct.id },
              data: {
                stock: Math.max(0, masterProduct.stock - actualQuantity),
              },
            });
          }
        }

        return [updated];
      });

      // Logăm acțiunea
      await prisma.pickingLog.create({
        data: {
          pickingListId: id,
          action: "ITEM_PICKED",
          userId,
          userName,
          itemId: item.id,
          itemSku: item.sku,
          itemTitle: item.title,
          quantityBefore: item.quantityPicked,
          quantityAfter: newQuantityPicked,
          message: `${item.title}: ${item.quantityPicked} → ${newQuantityPicked} (adăugat ${actualQuantity})`,
        },
      });

      // Actualizăm statisticile picking list-ului
      const allItems = await prisma.pickingListItem.findMany({
        where: { pickingListId: id },
      });

      // Excludem produsele părinte din calcule
      const pickableItems = allItems.filter(i => !i.isRecipeParent);
      const pickedQuantity = pickableItems.reduce((sum, i) => sum + i.quantityPicked, 0);
      const allComplete = pickableItems.every((i) => i.isComplete);

      await prisma.pickingList.update({
        where: { id },
        data: {
          pickedQuantity,
          status: allComplete ? "COMPLETED" : pickingList.status === "PENDING" ? "IN_PROGRESS" : pickingList.status,
          startedAt: pickingList.startedAt || new Date(),
          completedAt: allComplete ? new Date() : undefined,
          completedBy: allComplete ? userId : undefined,
          completedByName: allComplete ? userName : undefined,
        },
      });

      // Dacă s-a completat automat, logăm
      if (allComplete) {
        await prisma.pickingLog.create({
          data: {
            pickingListId: id,
            action: "LIST_COMPLETED",
            userId,
            userName,
            message: `Picking list finalizat automat de ${userName} (toate produsele ridicate)`,
          },
        });
      }

      return NextResponse.json({
        success: true,
        message: isComplete 
          ? `✓ ${item.title} completat (${updatedItem.quantityPicked}/${item.quantityRequired})`
          : `${item.title}: ${updatedItem.quantityPicked}/${item.quantityRequired}`,
        item: updatedItem,
        isComplete,
        allComplete,
        remaining: item.quantityRequired - updatedItem.quantityPicked,
      });
    }

    // ACȚIUNE: Start picking
    if (action === "start") {
      const { userId, userName } = body;

      if (pickingList.status === "IN_PROGRESS" && pickingList.startedBy) {
        // Deja preluat de altcineva
        return NextResponse.json({
          success: false,
          error: `Picking list-ul a fost deja preluat de ${pickingList.startedByName || 'altcineva'}`,
        }, { status: 400 });
      }

      if (pickingList.status !== "PENDING" && pickingList.status !== "IN_PROGRESS") {
        return NextResponse.json(
          { error: "Picking list-ul nu mai poate fi preluat" },
          { status: 400 }
        );
      }

      const updated = await prisma.pickingList.update({
        where: { id },
        data: {
          status: "IN_PROGRESS",
          startedAt: new Date(),
          startedBy: userId,
          startedByName: userName,
        },
      });

      // Logăm acțiunea
      await prisma.pickingLog.create({
        data: {
          pickingListId: id,
          action: "LIST_STARTED",
          userId,
          userName,
          message: `Picking list preluat de ${userName}`,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Picking list preluat cu succes",
        pickingList: updated,
      });
    }

    // ACȚIUNE: Complete
    if (action === "complete") {
      const { userId, userName } = body;

      const incompleteItems = pickingList.items.filter((i) => !i.isComplete);
      
      if (incompleteItems.length > 0) {
        return NextResponse.json({
          success: false,
          error: `Mai sunt ${incompleteItems.length} produse incomplete. Nu poți finaliza până nu sunt toate produsele ridicate.`,
          incompleteItems: incompleteItems.map((i) => ({
            sku: i.sku,
            title: i.title,
            picked: i.quantityPicked,
            required: i.quantityRequired,
          })),
        }, { status: 400 });
      }

      // Generăm PDF-ul finalizat
      let pdfData: Buffer | null = null;
      try {
        pdfData = await generatePickingListPDF(id, userId, userName);
      } catch (pdfError) {
        console.error("Eroare la generarea PDF:", pdfError);
        // Continuăm fără PDF
      }

      const updated = await prisma.pickingList.update({
        where: { id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          completedBy: userId,
          completedByName: userName,
          pdfData: pdfData,
          pdfGeneratedAt: pdfData ? new Date() : undefined,
        },
      });

      // Logăm acțiunea
      await prisma.pickingLog.create({
        data: {
          pickingListId: id,
          action: "LIST_COMPLETED",
          userId,
          userName,
          message: `Picking list finalizat de ${userName}`,
        },
      });

      // Notificăm administratorii
      try {
        await notifyAdminsPickingComplete(updated, pdfData);
      } catch (notifyError) {
        console.error("Eroare la trimiterea notificărilor:", notifyError);
      }

      return NextResponse.json({
        success: true,
        message: "Picking list finalizat cu succes",
        pickingList: updated,
      });
    }

    // ACȚIUNE: Cancel
    if (action === "cancel") {
      if (pickingList.status === "COMPLETED") {
        return NextResponse.json(
          { error: "Nu poți anula un picking list finalizat" },
          { status: 400 }
        );
      }

      const updated = await prisma.pickingList.update({
        where: { id },
        data: {
          status: "CANCELLED",
        },
      });

      return NextResponse.json({
        success: true,
        message: "Picking list anulat",
        pickingList: updated,
      });
    }

    // ACȚIUNE: Reset item (anulează scanarea unui produs)
    if (action === "resetItem") {
      const { itemId } = body;

      if (!itemId) {
        return NextResponse.json(
          { error: "Furnizează itemId" },
          { status: 400 }
        );
      }

      // Găsim item-ul pentru a ști cât stoc trebuie restaurat
      const itemToReset = pickingList.items.find((i) => i.id === itemId);
      if (!itemToReset) {
        return NextResponse.json(
          { error: "Item nu a fost găsit" },
          { status: 404 }
        );
      }

      const quantityToRestore = itemToReset.quantityPicked;

      // Tranzacție pentru reset item + restaurare stoc
      const [updatedItem] = await prisma.$transaction(async (tx) => {
        // 1. Reset item
        const updated = await tx.pickingListItem.update({
          where: { id: itemId },
          data: {
            quantityPicked: 0,
            isComplete: false,
            pickedAt: null,
            pickedBy: null,
          },
        });

        // 2. Restaurăm stocul în MasterProduct (dacă a fost decrementat)
        if (quantityToRestore > 0) {
          if (itemToReset.masterProductId) {
            await tx.masterProduct.update({
              where: { id: itemToReset.masterProductId },
              data: {
                stock: { increment: quantityToRestore },
              },
            });
          } else if (itemToReset.sku) {
            // Încercăm să găsim MasterProduct după SKU
            const masterProduct = await tx.masterProduct.findUnique({
              where: { sku: itemToReset.sku },
            });
            if (masterProduct) {
              await tx.masterProduct.update({
                where: { id: masterProduct.id },
                data: {
                  stock: { increment: quantityToRestore },
                },
              });
            }
          }
        }

        return [updated];
      });

      // Recalculăm statisticile
      const allItems = await prisma.pickingListItem.findMany({
        where: { pickingListId: id },
      });
      // Excludem produsele părinte din calcule
      const pickableItems = allItems.filter(i => !i.isRecipeParent);
      const pickedQuantity = pickableItems.reduce((sum, i) => sum + i.quantityPicked, 0);

      await prisma.pickingList.update({
        where: { id },
        data: {
          pickedQuantity,
          status: "IN_PROGRESS",
          completedAt: null,
        },
      });

      return NextResponse.json({
        success: true,
        message: `${updatedItem.title} resetat`,
        item: updatedItem,
        stockRestored: quantityToRestore,
      });
    }

    // ACȚIUNE: Update general
    const { name, assignedTo, notes } = body;
    const updated = await prisma.pickingList.update({
      where: { id },
      data: {
        name: name || undefined,
        assignedTo: assignedTo || undefined,
        notes: notes || undefined,
      },
    });

    return NextResponse.json({
      success: true,
      pickingList: updated,
    });
  } catch (error: any) {
    console.error("Error updating picking list:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Șterge picking list
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // Verificăm autentificarea
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Trebuie să fii autentificat" },
        { status: 401 }
      );
    }

    // Verificăm permisiunea de creare picking (include și ștergere)
    const canCreate = await hasPermission(session.user.id, "picking.create");
    if (!canCreate) {
      return NextResponse.json(
        { error: "Nu ai permisiunea de a șterge picking lists" },
        { status: 403 }
      );
    }

    const { id } = await params;

    const pickingList = await prisma.pickingList.findUnique({
      where: { id },
    });

    if (!pickingList) {
      return NextResponse.json(
        { error: "Picking list nu a fost găsit" },
        { status: 404 }
      );
    }

    if (pickingList.status === "IN_PROGRESS") {
      return NextResponse.json(
        { error: "Nu poți șterge un picking list în progres" },
        { status: 400 }
      );
    }

    await prisma.pickingList.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Picking list șters",
    });
  } catch (error: any) {
    console.error("Error deleting picking list:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// ===== HELPER FUNCTIONS =====

// Generează PDF pentru picking list finalizat
async function generatePickingListPDF(
  pickingListId: string,
  completedById?: string,
  completedByName?: string
): Promise<Buffer> {
  const pickingList = await prisma.pickingList.findUnique({
    where: { id: pickingListId },
    include: {
      items: { orderBy: [{ location: "asc" }, { sku: "asc" }] },
      awbs: {
        include: {
          awb: {
            select: {
              awbNumber: true,
              order: {
                select: {
                  shopifyOrderNumber: true,
                  customerFirstName: true,
                  customerLastName: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!pickingList) {
    throw new Error("Picking list nu a fost găsit");
  }

  const pdfDoc = await PDFDocument.create();
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 40;

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const formatDate = (date: Date | string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleString("ro-RO");
  };

  // Header
  page.drawText("PICKING LIST - FINALIZAT", { x: margin, y, font: helveticaBold, size: 18 });
  y -= 25;
  page.drawText(pickingList.code, { x: margin, y, font: helvetica, size: 14 });
  y -= 20;

  // Info
  page.drawText(`Data: ${formatDate(pickingList.createdAt)}`, { x: margin, y, font: helvetica, size: 10 });
  y -= 15;
  page.drawText(`Creat de: ${pickingList.createdByName || "-"}`, { x: margin, y, font: helvetica, size: 10 });
  y -= 20;

  // Box preluare
  page.drawRectangle({ x: margin, y: y - 50, width: pageWidth - 2 * margin, height: 55, borderColor: rgb(0.2, 0.5, 0.2), borderWidth: 1, color: rgb(0.95, 1, 0.95) });
  page.drawText("PRELUAT DE:", { x: margin + 10, y: y - 15, font: helveticaBold, size: 11 });
  page.drawText(pickingList.startedByName || "-", { x: margin + 100, y: y - 15, font: helvetica, size: 11 });
  page.drawText(`La ora: ${formatDate(pickingList.startedAt)}`, { x: margin + 10, y: y - 35, font: helvetica, size: 10 });
  y -= 70;

  // Box finalizare
  page.drawRectangle({ x: margin, y: y - 50, width: pageWidth - 2 * margin, height: 55, borderColor: rgb(0.2, 0.2, 0.5), borderWidth: 1, color: rgb(0.95, 0.95, 1) });
  page.drawText("FINALIZAT DE:", { x: margin + 10, y: y - 15, font: helveticaBold, size: 11 });
  page.drawText(completedByName || pickingList.completedByName || "-", { x: margin + 110, y: y - 15, font: helvetica, size: 11 });
  page.drawText(`La ora: ${formatDate(pickingList.completedAt || new Date())}`, { x: margin + 10, y: y - 35, font: helvetica, size: 10 });
  y -= 70;

  // Statistici
  page.drawText(`Total produse: ${pickingList.totalItems} | Total bucati: ${pickingList.totalQuantity} | AWB-uri: ${pickingList.awbs.length}`, 
    { x: margin, y, font: helvetica, size: 10 });
  y -= 25;

  // Linie
  page.drawLine({ start: { x: margin, y }, end: { x: pageWidth - margin, y }, thickness: 0.5 });
  y -= 15;

  // Tabel produse
  page.drawText("SKU", { x: margin, y, font: helveticaBold, size: 9 });
  page.drawText("Produs", { x: margin + 100, y, font: helveticaBold, size: 9 });
  page.drawText("Cant.", { x: margin + 400, y, font: helveticaBold, size: 9 });
  y -= 15;

  for (const item of pickingList.items) {
    if (y < 80) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }

    page.drawText(item.sku.substring(0, 15), { x: margin, y, font: helvetica, size: 9 });
    page.drawText(item.title.substring(0, 50), { x: margin + 100, y, font: helvetica, size: 9 });
    page.drawText(`${item.quantityPicked}/${item.quantityRequired}`, { x: margin + 400, y, font: helveticaBold, size: 9 });
    y -= 14;
  }

  // Footer
  const firstPage = pdfDoc.getPages()[0];
  firstPage.drawText(`Generat la ${formatDate(new Date())} | Cash Flow Grup ERP`, 
    { x: margin, y: 30, font: helvetica, size: 8, color: rgb(0.5, 0.5, 0.5) });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

// Notifică administratorii când un picking list e finalizat
async function notifyAdminsPickingComplete(pickingList: any, pdfData: Buffer | null) {
  // Găsim SuperAdmins și userii cu rol Administrator
  const adminRole = await prisma.role.findFirst({
    where: { name: "Administrator" },
    include: {
      users: { include: { user: true } },
    },
  });

  const superAdmins = await prisma.user.findMany({
    where: { isSuperAdmin: true },
  });

  // Combinăm user IDs unici
  const adminUserIds = new Set<string>();
  superAdmins.forEach(u => adminUserIds.add(u.id));
  adminRole?.users.forEach(u => adminUserIds.add(u.userId));

  // Trimitem notificări
  for (const userId of adminUserIds) {
    await prisma.notification.create({
      data: {
        userId,
        type: "picking_list_completed",
        title: "Picking List Finalizat",
        message: `Picking list ${pickingList.code} a fost finalizat de ${pickingList.completedByName || 'necunoscut'} la ${new Date().toLocaleString("ro-RO")}`,
        actionUrl: `/picking/${pickingList.id}`,
        attachmentData: pdfData,
        attachmentName: `picking-${pickingList.code}.pdf`,
        attachmentMimeType: "application/pdf",
        data: {
          pickingListId: pickingList.id,
          pickingListCode: pickingList.code,
          completedBy: pickingList.completedByName,
          completedAt: pickingList.completedAt,
        },
      },
    });
  }

  console.log(`🔔 Notificări trimise la ${adminUserIds.size} administratori`);
}
