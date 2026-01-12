import prisma from "./db";
import { SyncType, SyncStatus, LogLevel } from "@prisma/client";
import { FanCourierClient } from "./fancourier";

// Tipuri pentru logging
interface SyncContext {
  syncLogId: string;
  ordersProcessed: number;
  awbsUpdated: number;
  invoicesChecked: number;
  errorsCount: number;
}

/**
 * Creează o nouă sesiune de sincronizare
 */
export async function createSyncSession(type: SyncType = "MANUAL"): Promise<string> {
  const syncLog = await prisma.syncLog.create({
    data: {
      type,
      status: "RUNNING",
      startedAt: new Date(),
    },
  });
  
  await addLogEntry(syncLog.id, {
    level: "INFO",
    action: "SYNC_STARTED",
    message: `🚀 Sesiune de sincronizare ${type} începută`,
    details: { type, startTime: new Date().toISOString() },
  });
  
  return syncLog.id;
}

/**
 * Adaugă o intrare în log
 */
export async function addLogEntry(
  syncLogId: string,
  entry: {
    level: LogLevel;
    action: string;
    message: string;
    orderId?: string;
    orderNumber?: string;
    awbNumber?: string;
    invoiceNumber?: string;
    details?: any;
  }
) {
  return prisma.syncLogEntry.create({
    data: {
      syncLogId,
      level: entry.level,
      action: entry.action,
      message: entry.message,
      orderId: entry.orderId,
      orderNumber: entry.orderNumber,
      awbNumber: entry.awbNumber,
      invoiceNumber: entry.invoiceNumber,
      details: entry.details,
    },
  });
}

/**
 * Finalizează sesiunea de sincronizare
 */
export async function completeSyncSession(
  syncLogId: string,
  stats: {
    ordersProcessed: number;
    awbsUpdated: number;
    invoicesChecked: number;
    errorsCount: number;
  }
) {
  const startedAt = await prisma.syncLog.findUnique({
    where: { id: syncLogId },
    select: { startedAt: true },
  });
  
  const completedAt = new Date();
  const durationMs = startedAt ? completedAt.getTime() - startedAt.startedAt.getTime() : 0;
  
  const status: SyncStatus = stats.errorsCount > 0 
    ? (stats.ordersProcessed > 0 ? "COMPLETED_WITH_ERRORS" : "FAILED")
    : "COMPLETED";
  
  const summary = `
📊 REZUMAT SINCRONIZARE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Comenzi procesate: ${stats.ordersProcessed}
🚚 AWB-uri actualizate: ${stats.awbsUpdated}
📄 Facturi verificate: ${stats.invoicesChecked}
${stats.errorsCount > 0 ? `❌ Erori: ${stats.errorsCount}` : '✨ Fără erori'}
⏱️ Durată: ${(durationMs / 1000).toFixed(2)}s
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `.trim();
  
  await addLogEntry(syncLogId, {
    level: stats.errorsCount > 0 ? "WARNING" : "SUCCESS",
    action: "SYNC_COMPLETED",
    message: summary,
    details: { ...stats, durationMs, status },
  });
  
  return prisma.syncLog.update({
    where: { id: syncLogId },
    data: {
      status,
      ordersProcessed: stats.ordersProcessed,
      awbsUpdated: stats.awbsUpdated,
      invoicesChecked: stats.invoicesChecked,
      errorsCount: stats.errorsCount,
      completedAt,
      durationMs,
      summary,
    },
  });
}

/**
 * Sincronizare completă - AWB-uri + Facturi
 */
export async function runFullSync(type: SyncType = "MANUAL") {
  const syncLogId = await createSyncSession(type);
  
  const stats = {
    ordersProcessed: 0,
    awbsUpdated: 0,
    invoicesChecked: 0,
    errorsCount: 0,
  };
  
  try {
    // 1. Obține toate comenzile care au AWB sau factură
    const orders = await prisma.order.findMany({
      where: {
        OR: [
          { awb: { isNot: null } },
          { invoice: { isNot: null } },
        ],
        // Exclude comenzile finalizate (livrate/returnate/anulate) mai vechi de 30 zile
        NOT: {
          AND: [
            { status: { in: ["DELIVERED", "RETURNED", "CANCELLED"] } },
            { updatedAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
          ],
        },
      },
      include: {
        awb: true,
        invoice: true,
      },
      orderBy: { createdAt: "desc" },
    });
    
    await addLogEntry(syncLogId, {
      level: "INFO",
      action: "ORDERS_FETCHED",
      message: `📋 Găsite ${orders.length} comenzi pentru sincronizare`,
      details: { totalOrders: orders.length },
    });
    
    // Inițializează FanCourier
    const settings = await prisma.settings.findUnique({ where: { id: "default" } });
    
    if (!settings?.fancourierClientId || !settings?.fancourierUsername || !settings?.fancourierPassword) {
      await addLogEntry(syncLogId, {
        level: "ERROR",
        action: "FANCOURIER_CONFIG_MISSING",
        message: "❌ Configurare FanCourier lipsă - nu pot sincroniza AWB-uri",
      });
    }
    
    const fancourier = settings?.fancourierClientId ? new FanCourierClient({
      clientId: settings.fancourierClientId,
      username: settings.fancourierUsername!,
      password: settings.fancourierPassword!,
    }) : null;
    
    // 2. Procesează fiecare comandă
    for (const order of orders) {
      stats.ordersProcessed++;
      
      await addLogEntry(syncLogId, {
        level: "INFO",
        action: "ORDER_PROCESSING_START",
        message: `\n${"═".repeat(50)}\n📦 Procesez comanda #${order.shopifyOrderNumber}\n${"═".repeat(50)}`,
        orderId: order.id,
        orderNumber: order.shopifyOrderNumber,
      });
      
      // 2a. Sincronizează AWB
      if (order.awb?.awbNumber && fancourier) {
        try {
          await syncAWBStatus(syncLogId, order, fancourier, stats);
        } catch (error: any) {
          stats.errorsCount++;
          await addLogEntry(syncLogId, {
            level: "ERROR",
            action: "AWB_SYNC_ERROR",
            message: `❌ Eroare la sincronizarea AWB ${order.awb.awbNumber}: ${error.message}`,
            orderId: order.id,
            orderNumber: order.shopifyOrderNumber,
            awbNumber: order.awb.awbNumber,
            details: { error: error.message, stack: error.stack },
          });
        }
      } else if (order.awb && !order.awb.awbNumber) {
        await addLogEntry(syncLogId, {
          level: "WARNING",
          action: "AWB_NO_NUMBER",
          message: `⚠️ Comandă cu AWB dar fără număr AWB`,
          orderId: order.id,
          orderNumber: order.shopifyOrderNumber,
        });
      }
      
      // 2b. Verifică status factură
      if (order.invoice) {
        await syncInvoiceStatus(syncLogId, order, stats);
      }
    }
    
    // 3. Finalizează
    await completeSyncSession(syncLogId, stats);
    
    return {
      success: true,
      syncLogId,
      stats,
    };
    
  } catch (error: any) {
    stats.errorsCount++;
    
    await addLogEntry(syncLogId, {
      level: "ERROR",
      action: "SYNC_FATAL_ERROR",
      message: `💥 Eroare fatală la sincronizare: ${error.message}`,
      details: { error: error.message, stack: error.stack },
    });
    
    await prisma.syncLog.update({
      where: { id: syncLogId },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        errorsCount: stats.errorsCount,
        summary: `Sincronizare eșuată: ${error.message}`,
      },
    });
    
    return {
      success: false,
      syncLogId,
      error: error.message,
      stats,
    };
  }
}

/**
 * Detectează tipul de schimbare pentru AWB
 */
function detectAWBChangeType(
  previousStatus: string | null,
  newStatus: string,
  eventCode: string,
  trackingSuccess: boolean,
  events: any[],
  trackingError?: string  // Adaugă parametru pentru a ști de ce a eșuat
): {
  changeType: 'NEW_STATUS' | 'DELIVERED' | 'RETURNED' | 'CANCELLED' | 'DELETED' | 'MODIFIED' | 'NO_CHANGE' | 'ERROR' | 'PENDING';
  description: string;
  severity: 'info' | 'success' | 'warning' | 'error';
} {
  // Verifică dacă statusul anterior indică deja șters/anulat
  const prevLower = (previousStatus || '').toLowerCase();
  const isAlreadyDeleted = prevLower.includes('șters') || prevLower.includes('sters') || prevLower.includes('deleted');
  const isAlreadyCancelled = prevLower.includes('anulat') || prevLower.includes('cancelled');
  
  // Dacă tracking-ul nu a reușit, verificăm motivul
  if (!trackingSuccess) {
    const errorLower = (trackingError || '').toLowerCase();
    
    // Dacă eroarea este "AWB negăsit" și AWB-ul avea un status valid anterior, e ȘTERS
    if (errorLower.includes('negăsit') || errorLower.includes('negasit') || 
        errorLower.includes('not found') || errorLower.includes('inexistent')) {
      
      // Dacă AWB-ul avea deja statusuri reale (nu doar pending/așteptare), înseamnă că a fost șters
      if (previousStatus && 
          !prevLower.includes('așteptare') && 
          !prevLower.includes('asteptare') && 
          !prevLower.includes('pending') &&
          !isAlreadyDeleted) {
        return {
          changeType: 'DELETED',
          description: `AWB șters din FanCourier (anterior: ${previousStatus})`,
          severity: 'warning',
        };
      }
      
      // Dacă nu avea status anterior sau era în așteptare, posibil a fost șters înainte de preluare
      return {
        changeType: 'DELETED',
        description: 'AWB inexistent în FanCourier (posibil șters)',
        severity: 'warning',
      };
    }
    
    // Altfel e o eroare temporară de rețea sau API
    return {
      changeType: 'ERROR',
      description: `Eroare la tracking: ${trackingError || 'necunoscută'} (poate fi temporar)`,
      severity: 'warning',
    };
  }
  
  // Dacă nu are evenimente, e un AWB nou sau în așteptare
  if (events.length === 0) {
    // Dacă anterior avea status, dar acum nu are evenimente, e ciudat dar NU înseamnă neapărat șters
    if (previousStatus && !previousStatus.toLowerCase().includes('așteptare') && !previousStatus.toLowerCase().includes('pending')) {
      return {
        changeType: 'PENDING',
        description: `AWB fără evenimente în FanCourier (posibil nou sau în așteptare ridicare)`,
        severity: 'info',
      };
    }
    return {
      changeType: 'NO_CHANGE',
      description: 'AWB în așteptare (fără evenimente încă)',
      severity: 'info',
    };
  }

  // Coduri pentru AWB anulat
  const cancelledCodes = ['A0', 'A1', 'A2', 'A3', 'Anulat', 'ANULAT'];
  if (cancelledCodes.includes(eventCode) || newStatus.toLowerCase().includes('anulat')) {
    return {
      changeType: 'CANCELLED',
      description: `AWB anulat în FanCourier: ${newStatus}`,
      severity: 'warning',
    };
  }

  // Coduri pentru livrat
  const deliveredCodes = ['S1', 'S2', 'Livrat', 'LIVRAT'];
  if (deliveredCodes.includes(eventCode) || newStatus.toLowerCase().includes('livrat')) {
    return {
      changeType: 'DELIVERED',
      description: `AWB livrat cu succes: ${newStatus}`,
      severity: 'success',
    };
  }

  // Coduri pentru returnat
  const returnedCodes = ['S3', 'S4', 'S5', 'S50', 'S51', 'Returnat', 'RETURNAT', 'Refuzat', 'REFUZAT'];
  if (returnedCodes.includes(eventCode) || 
      newStatus.toLowerCase().includes('retur') || 
      newStatus.toLowerCase().includes('refuz')) {
    return {
      changeType: 'RETURNED',
      description: `AWB returnat/refuzat: ${newStatus}`,
      severity: 'warning',
    };
  }

  // Verifică dacă s-a schimbat statusul
  if (previousStatus !== newStatus) {
    return {
      changeType: 'NEW_STATUS',
      description: `Status actualizat: ${previousStatus || 'N/A'} → ${newStatus}`,
      severity: 'info',
    };
  }

  return {
    changeType: 'NO_CHANGE',
    description: 'Fără modificări',
    severity: 'info',
  };
}

/**
 * Sincronizează statusul unui AWB
 */
async function syncAWBStatus(
  syncLogId: string,
  order: any,
  fancourier: FanCourierClient,
  stats: { awbsUpdated: number; errorsCount: number }
) {
  const awb = order.awb;
  const awbNumber = awb.awbNumber;
  
  await addLogEntry(syncLogId, {
    level: "INFO",
    action: "AWB_STATUS_CHECK_START",
    message: `🔍 Verific status AWB: ${awbNumber}`,
    orderId: order.id,
    orderNumber: order.shopifyOrderNumber,
    awbNumber,
    details: { currentStatus: awb.currentStatus },
  });
  
  // Apelează FanCourier pentru tracking
  let trackingResult: any;
  try {
    trackingResult = await fancourier.trackAWB(awbNumber);
  } catch (error: any) {
    trackingResult = { success: false, error: error.message, events: [] };
  }
  
  await addLogEntry(syncLogId, {
    level: "DEBUG",
    action: "AWB_TRACKING_RESPONSE",
    message: `📡 Răspuns FanCourier pentru AWB ${awbNumber}`,
    orderId: order.id,
    orderNumber: order.shopifyOrderNumber,
    awbNumber,
    details: { 
      success: trackingResult.success,
      eventsCount: trackingResult.events?.length || 0,
      rawResponse: trackingResult,
    },
  });
  
  const events = trackingResult.events || [];
  const previousStatus = awb.currentStatus;
  
  // Sortează evenimentele și ia ultimul
  let eventCode = '';
  let eventDescription = previousStatus || 'Necunoscut';
  let eventDate = new Date();
  
  if (events.length > 0) {
    const sortedEvents = events.sort((a: any, b: any) => 
      new Date(b.date || b.eventDate).getTime() - new Date(a.date || a.eventDate).getTime()
    );
    const lastEvent = sortedEvents[0];
    // FanCourier returnează: id (codul statusului, ex: "S1"), name (descrierea), location, date
    eventCode = lastEvent.id || lastEvent.code || lastEvent.eventId || lastEvent.status || '';
    eventDescription = lastEvent.name || lastEvent.description || lastEvent.event || lastEvent.statusDescription || 'Status necunoscut';
    eventDate = new Date(lastEvent.date || lastEvent.eventDate);
  }
  
  // Detectează tipul de schimbare
  const changeDetection = detectAWBChangeType(
    previousStatus,
    eventDescription,
    eventCode,
    trackingResult.success,
    events,
    trackingResult.error  // Pasăm și eroarea de tracking
  );
  
  // Logăm detectarea
  await addLogEntry(syncLogId, {
    level: changeDetection.severity === 'error' ? "ERROR" : 
           changeDetection.severity === 'warning' ? "WARNING" : 
           changeDetection.severity === 'success' ? "SUCCESS" : "INFO",
    action: `AWB_CHANGE_DETECTED_${changeDetection.changeType}`,
    message: `🔎 Detectat: ${changeDetection.description}`,
    orderId: order.id,
    orderNumber: order.shopifyOrderNumber,
    awbNumber,
    details: { 
      changeType: changeDetection.changeType,
      previousStatus,
      newStatus: eventDescription,
      eventCode,
    },
  });
  
  // Dacă nu s-a schimbat nimic sau e doar eroare temporară, ieșim
  if (changeDetection.changeType === 'NO_CHANGE' || changeDetection.changeType === 'ERROR' || changeDetection.changeType === 'PENDING') {
    await addLogEntry(syncLogId, {
      level: changeDetection.changeType === 'ERROR' ? "WARNING" : "INFO",
      action: changeDetection.changeType === 'ERROR' ? "AWB_TRACKING_ERROR" : "AWB_STATUS_UNCHANGED",
      message: changeDetection.changeType === 'ERROR' 
        ? `⚠️ AWB ${awbNumber} - ${changeDetection.description}`
        : `✓ AWB ${awbNumber} - ${changeDetection.description}`,
      orderId: order.id,
      orderNumber: order.shopifyOrderNumber,
      awbNumber,
    });
    return;
  }
  
  // Logăm în ActivityLog pentru istoric permanent (doar pentru schimbări reale)
  try {
    const { logAWBStatusUpdate } = await import("./activity-log");
    await logAWBStatusUpdate({
      orderId: order.id,
      orderNumber: order.shopifyOrderNumber,
      awbNumber,
      oldStatus: previousStatus || 'N/A',
      newStatus: eventDescription,
      statusText: changeDetection.description,
    });
  } catch (e) {
    console.error("Error logging to ActivityLog:", e);
  }

  // Actualizează AWB în funcție de tipul de schimbare
  const updateData: any = {
    currentStatus: eventDescription,
    currentStatusDate: eventDate,
  };
  
  // Pentru AWB anulat, marcăm special
  if (changeDetection.changeType === 'CANCELLED') {
    updateData.currentStatus = `ANULAT: ${eventDescription}`;
  }
  
  // Pentru AWB șters, marcăm ca necunoscut
  if (changeDetection.changeType === 'DELETED') {
    updateData.currentStatus = 'ȘTERS DIN FANCOURIER';
    
    // Adaugă în istoric
    await prisma.aWBStatusHistory.create({
      data: {
        awbId: awb.id,
        status: 'ȘTERS DIN FANCOURIER',
        statusDate: new Date(),
        description: changeDetection.description,
      },
    });
  }
  
  await prisma.aWB.update({
    where: { id: awb.id },
    data: updateData,
  });
  
  // Salvează în istoric doar dacă avem evenimente
  if (events.length > 0) {
    const sortedEvents = events.sort((a: any, b: any) => 
      new Date(b.date || b.eventDate).getTime() - new Date(a.date || a.eventDate).getTime()
    );
    
    for (const event of sortedEvents) {
      const existingHistory = await prisma.aWBStatusHistory.findFirst({
        where: {
          awbId: awb.id,
          status: event.description || event.event,
          statusDate: new Date(event.date || event.eventDate),
        },
      });
      
      if (!existingHistory) {
        await prisma.aWBStatusHistory.create({
          data: {
            awbId: awb.id,
            status: event.description || event.event,
            statusDate: new Date(event.date || event.eventDate),
            location: event.location,
            description: `[${event.code || event.eventId}] ${event.description || event.event}`,
          },
        });
      }
    }
  }
  
  // Determină noul status al comenzii
  const statusMap = getAWBStatusMap();
  let newOrderStatus = order.status;
  
  if (changeDetection.changeType === 'DELIVERED') {
    newOrderStatus = 'DELIVERED';
  } else if (changeDetection.changeType === 'RETURNED') {
    newOrderStatus = 'RETURNED';
  } else if (changeDetection.changeType === 'CANCELLED' || changeDetection.changeType === 'DELETED') {
    // La AWB anulat sau șters, revine la starea anterioară pentru a putea crea alt AWB
    newOrderStatus = 'AWB_PENDING';
  } else if (statusMap[eventCode]) {
    newOrderStatus = statusMap[eventCode].orderStatus;
  } else if (events.length > 0) {
    // Dacă avem evenimente dar codul nu e în map, e cel puțin SHIPPED
    newOrderStatus = 'SHIPPED';
  }
  
  const previousOrderStatus = order.status;
  
  // Actualizează status comandă dacă e necesar
  if (newOrderStatus !== previousOrderStatus) {
    await prisma.order.update({
      where: { id: order.id },
      data: { status: newOrderStatus as any },
    });
    
    await addLogEntry(syncLogId, {
      level: "SUCCESS",
      action: "ORDER_STATUS_UPDATED",
      message: `🔄 Status comandă actualizat: ${previousOrderStatus} → ${newOrderStatus}`,
      orderId: order.id,
      orderNumber: order.shopifyOrderNumber,
      awbNumber,
      details: { previousStatus: previousOrderStatus, newStatus: newOrderStatus, changeType: changeDetection.changeType },
    });
  }
  
  stats.awbsUpdated++;
  
  // Mesaj final bazat pe tipul de schimbare
  const changeEmoji: Record<string, string> = {
    'DELIVERED': '🎉',
    'RETURNED': '📦↩️',
    'CANCELLED': '❌',
    'DELETED': '🗑️',
    'NEW_STATUS': '🔄',
    'MODIFIED': '✏️',
    'ERROR': '⚠️',
  };
  
  await addLogEntry(syncLogId, {
    level: changeDetection.severity === 'error' ? "ERROR" : 
           changeDetection.severity === 'success' ? "SUCCESS" : "INFO",
    action: "AWB_STATUS_UPDATED",
    message: `${changeEmoji[changeDetection.changeType] || '✅'} AWB ${awbNumber}:\n   ${changeDetection.description}\n   Status anterior: ${previousStatus || 'N/A'}\n   Status nou: ${updateData.currentStatus}`,
    orderId: order.id,
    orderNumber: order.shopifyOrderNumber,
    awbNumber,
    details: { 
      changeType: changeDetection.changeType,
      previousStatus, 
      newStatus: updateData.currentStatus, 
      orderStatusChanged: newOrderStatus !== previousOrderStatus 
    },
  });
}

/**
 * Verifică statusul unei facturi
 */
async function syncInvoiceStatus(
  syncLogId: string,
  order: any,
  stats: { invoicesChecked: number }
) {
  const invoice = order.invoice;
  
  stats.invoicesChecked++;
  
  const invoiceNumber = invoice.smartbillSeries && invoice.smartbillNumber 
    ? `${invoice.smartbillSeries}${invoice.smartbillNumber}`
    : 'N/A';
  
  await addLogEntry(syncLogId, {
    level: "INFO",
    action: "INVOICE_STATUS_CHECK",
    message: `📄 Factură ${invoiceNumber}\n   Status: ${invoice.status}\n   Emisă: ${invoice.issuedAt ? new Date(invoice.issuedAt).toLocaleString('ro-RO') : 'N/A'}`,
    orderId: order.id,
    orderNumber: order.shopifyOrderNumber,
    invoiceNumber,
    details: { 
      status: invoice.status, 
      series: invoice.smartbillSeries,
      number: invoice.smartbillNumber,
      issuedAt: invoice.issuedAt,
      errorMessage: invoice.errorMessage,
    },
  });
  
  // Notă: SmartBill API nu oferă endpoint de listare/citire status încasare
  // Ar trebui verificat manual sau printr-un endpoint personalizat
  if (invoice.status === "error" && invoice.errorMessage) {
    await addLogEntry(syncLogId, {
      level: "WARNING",
      action: "INVOICE_HAS_ERROR",
      message: `⚠️ Factura are eroare: ${invoice.errorMessage}`,
      orderId: order.id,
      orderNumber: order.shopifyOrderNumber,
      invoiceNumber,
      details: { errorMessage: invoice.errorMessage },
    });
  }
}

/**
 * Mapare statusuri FanCourier
 */
function getAWBStatusMap(): Record<string, { orderStatus: string; description: string }> {
  return {
    // RIDICARE
    "C0": { orderStatus: "SHIPPED", description: "Expediție ridicată" },
    "C1": { orderStatus: "SHIPPED", description: "Expediție preluată spre livrare" },
    
    // TRANZIT ȘI DEPOZIT (H0-H17)
    "H0": { orderStatus: "SHIPPED", description: "În tranzit spre depozitul de destinație" },
    "H1": { orderStatus: "SHIPPED", description: "Descărcată în depozitul de destinație" },
    "H2": { orderStatus: "SHIPPED", description: "În tranzit" },
    "H3": { orderStatus: "SHIPPED", description: "Sortată pe bandă" },
    "H4": { orderStatus: "SHIPPED", description: "Sortată pe bandă" },
    "H10": { orderStatus: "SHIPPED", description: "În tranzit spre depozitul de destinație" },
    "H11": { orderStatus: "SHIPPED", description: "Descărcată în depozitul de destinație" },
    "H12": { orderStatus: "SHIPPED", description: "În depozit" },
    "H13": { orderStatus: "SHIPPED", description: "În depozit" },
    "H15": { orderStatus: "SHIPPED", description: "În depozit" },
    "H17": { orderStatus: "SHIPPED", description: "În depozitul de destinație" },
    
    // LIVRARE
    "S1": { orderStatus: "SHIPPED", description: "În livrare" },
    "S2": { orderStatus: "DELIVERED", description: "Livrat" },
    "S8": { orderStatus: "SHIPPED", description: "Livrare din sediul FAN Courier" },
    "S35": { orderStatus: "SHIPPED", description: "Retrimis în livrare" },
    "S46": { orderStatus: "SHIPPED", description: "Predat punct livrare" },
    "S47": { orderStatus: "SHIPPED", description: "Predat partener extern" },
    
    // AVIZĂRI ȘI AȘTEPTĂRI
    "S3": { orderStatus: "SHIPPED", description: "Avizat" },
    "S11": { orderStatus: "SHIPPED", description: "Avizat și trimis SMS" },
    "S12": { orderStatus: "SHIPPED", description: "Contactat; livrare ulterioară" },
    "S21": { orderStatus: "SHIPPED", description: "Avizat, lipsă persoană de contact" },
    "S22": { orderStatus: "SHIPPED", description: "Avizat, nu are bani de ramburs" },
    "S24": { orderStatus: "SHIPPED", description: "Avizat, nu are împuternicire/CI" },
    
    // PROBLEME ADRESĂ
    "S4": { orderStatus: "SHIPPED", description: "Adresă incompletă" },
    "S5": { orderStatus: "SHIPPED", description: "Adresă greșită, destinatar mutat" },
    "S9": { orderStatus: "SHIPPED", description: "Redirecționat" },
    "S10": { orderStatus: "SHIPPED", description: "Adresă greșită, fără telefon" },
    "S14": { orderStatus: "SHIPPED", description: "Restricții acces la adresă" },
    "S19": { orderStatus: "SHIPPED", description: "Adresă incompletă - trimis SMS" },
    "S20": { orderStatus: "SHIPPED", description: "Adresă incompletă, fără telefon" },
    "S25": { orderStatus: "SHIPPED", description: "Adresă greșită - trimis SMS" },
    "S27": { orderStatus: "SHIPPED", description: "Adresă greșită, nr telefon greșit" },
    "S28": { orderStatus: "SHIPPED", description: "Adresă incompletă, nr telefon greșit" },
    "S30": { orderStatus: "SHIPPED", description: "Nu răspunde la telefon" },
    "S42": { orderStatus: "SHIPPED", description: "Adresă greșită" },
    
    // REFUZURI ȘI RETURURI
    "S6": { orderStatus: "RETURNED", description: "Refuz primire" },
    "S7": { orderStatus: "RETURNED", description: "Refuz plată transport" },
    "S15": { orderStatus: "RETURNED", description: "Refuz predare ramburs" },
    "S16": { orderStatus: "RETURNED", description: "Retur la termen" },
    "S33": { orderStatus: "RETURNED", description: "Retur solicitat" },
    "S43": { orderStatus: "RETURNED", description: "Retur" },
    "S50": { orderStatus: "RETURNED", description: "Refuz confirmare" },
    
    // ALTE STATUSURI
    "S37": { orderStatus: "SHIPPED", description: "Despăgubit" },
    "S38": { orderStatus: "AWB_ERROR", description: "AWB neexpediat" },
    "S49": { orderStatus: "SHIPPED", description: "Activitate suspendată" },
  };
}

/**
 * Sincronizează o singură comandă
 */
export async function syncSingleOrder(orderId: string) {
  const syncLogId = await createSyncSession("SINGLE_ORDER");
  
  const stats = {
    ordersProcessed: 0,
    awbsUpdated: 0,
    invoicesChecked: 0,
    errorsCount: 0,
  };
  
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { awb: true, invoice: true },
    });
    
    if (!order) {
      throw new Error(`Comanda cu ID ${orderId} nu a fost găsită`);
    }
    
    await addLogEntry(syncLogId, {
      level: "INFO",
      action: "SINGLE_ORDER_SYNC",
      message: `🎯 Sincronizare comandă individuală: #${order.shopifyOrderNumber}`,
      orderId: order.id,
      orderNumber: order.shopifyOrderNumber,
    });
    
    stats.ordersProcessed = 1;
    
    // Sincronizează AWB
    if (order.awb?.awbNumber) {
      const settings = await prisma.settings.findUnique({ where: { id: "default" } });
      
      if (settings?.fancourierClientId) {
        const fancourier = new FanCourierClient({
          clientId: settings.fancourierClientId,
          username: settings.fancourierUsername!,
          password: settings.fancourierPassword!,
        });
        
        await syncAWBStatus(syncLogId, order, fancourier, stats);
      }
    }
    
    // Verifică factură
    if (order.invoice) {
      await syncInvoiceStatus(syncLogId, order, stats);
    }
    
    await completeSyncSession(syncLogId, stats);
    
    return { success: true, syncLogId, stats };
    
  } catch (error: any) {
    stats.errorsCount++;
    
    await addLogEntry(syncLogId, {
      level: "ERROR",
      action: "SINGLE_ORDER_SYNC_ERROR",
      message: `❌ Eroare: ${error.message}`,
      orderId,
      details: { error: error.message },
    });
    
    await completeSyncSession(syncLogId, stats);
    
    return { success: false, syncLogId, error: error.message, stats };
  }
}

/**
 * Obține ultimele sesiuni de sincronizare
 */
export async function getSyncHistory(limit: number = 20) {
  return prisma.syncLog.findMany({
    orderBy: { startedAt: "desc" },
    take: limit,
    include: {
      _count: {
        select: { entries: true },
      },
    },
  });
}

/**
 * Obține detaliile unei sesiuni de sincronizare
 */
export async function getSyncLogDetails(syncLogId: string) {
  return prisma.syncLog.findUnique({
    where: { id: syncLogId },
    include: {
      entries: {
        orderBy: { timestamp: "asc" },
      },
    },
  });
}
