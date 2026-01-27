/**
 * Handover (Predare Curier) - Business Logic Library
 * 
 * Gestionează:
 * - Lista 1: Predare Azi (AWB-uri emise azi, nescanate)
 * - Lista 2: Nepredate (AWB-uri nepredate din zile anterioare)
 * - Scanare AWB pentru predare
 * - Finalizare/Redeschidere predare
 * - Rapoarte
 */

import prisma from "@/lib/db";
import { getFanCourierStatus, isPickupStatus } from "@/lib/fancourier-statuses";

// ==========================================
// TYPES
// ==========================================

export interface HandoverAWB {
  id: string;
  awbNumber: string | null;
  orderId: string;
  orderNumber: string;
  storeName: string;
  storeId: string;
  recipientName: string;
  recipientCity: string;
  products: string;
  fanCourierStatusCode: string | null;
  fanCourierStatusName: string | null;
  fanCourierStatusDesc: string | null;
  handedOverAt: Date | null;
  handedOverByName: string | null;
  notHandedOver: boolean;
  notHandedOverAt: Date | null;
  hasC0WithoutScan: boolean;
  c0ReceivedAt: Date | null;
  createdAt: Date;
}

export interface ScanResult {
  success: boolean;
  message: string;
  type: "success" | "error" | "warning";
  awb?: HandoverAWB;
  details?: {
    awbNumber: string;
    orderNumber: string;
    previousScanDate?: Date;
    wasNotHandedOver?: boolean;
  };
}

export interface HandoverStats {
  totalIssued: number;
  totalHandedOver: number;
  totalNotHandedOver: number;
  totalPending: number;
  totalFromPrevDays: number;
  totalC0Alerts: number;
}

export interface HandoverReport {
  date: Date;
  stats: HandoverStats;
  closedAt: Date | null;
  closedBy: string | null;
  closeType: string | null;
  handedOverList: HandoverAWB[];
  notHandedOverList: HandoverAWB[];
  fromPrevDaysList: HandoverAWB[];
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Obține data de azi la miezul nopții (timezone Romania)
 */
export function getTodayStart(): Date {
  const now = new Date();
  // Setăm la miezul nopții în timezone local
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  return today;
}

/**
 * Obține data de mâine la miezul nopții
 */
export function getTodayEnd(): Date {
  const today = getTodayStart();
  return new Date(today.getTime() + 24 * 60 * 60 * 1000);
}

/**
 * Formatează lista de produse pentru afișare
 */
function formatProducts(lineItems: Array<{ quantity: number; title: string; variantTitle: string | null }>): string {
  return lineItems.map(item => {
    let name = item.title;
    if (item.variantTitle && item.variantTitle !== "Default Title") {
      name += ` - ${item.variantTitle}`;
    }
    return `${item.quantity}x ${name}`;
  }).join(", ");
}

/**
 * Transformă un AWB din DB în format HandoverAWB
 */
function mapAWBToHandover(awb: any): HandoverAWB {
  return {
    id: awb.id,
    awbNumber: awb.awbNumber,
    orderId: awb.orderId,
    orderNumber: awb.order?.shopifyOrderNumber || "-",
    storeName: awb.order?.store?.name || "-",
    storeId: awb.order?.store?.id || "",
    recipientName: awb.order?.shippingName || awb.order?.customerName || "-",
    recipientCity: awb.order?.shippingCity || "-",
    products: awb.order?.lineItems ? formatProducts(awb.order.lineItems) : "-",
    fanCourierStatusCode: awb.fanCourierStatusCode,
    fanCourierStatusName: awb.fanCourierStatusName,
    fanCourierStatusDesc: awb.fanCourierStatusDesc,
    handedOverAt: awb.handedOverAt,
    handedOverByName: awb.handedOverByName,
    notHandedOver: awb.notHandedOver,
    notHandedOverAt: awb.notHandedOverAt,
    hasC0WithoutScan: awb.hasC0WithoutScan,
    c0ReceivedAt: awb.c0ReceivedAt,
    createdAt: awb.createdAt,
  };
}

// ==========================================
// LISTA 1: PREDARE AZI
// ==========================================

/**
 * Obține AWB-urile pentru predare azi
 * Condiții:
 * - AWB creat azi
 * - Nu a fost scanat (handedOverAt = null)
 * - Nu e anulat/livrat/returnat
 */
export async function getTodayHandoverList(storeId?: string): Promise<HandoverAWB[]> {
  const todayStart = getTodayStart();
  const todayEnd = getTodayEnd();

  const whereClause: any = {
    createdAt: {
      gte: todayStart,
      lt: todayEnd,
    },
    handedOverAt: null,
    awbNumber: { not: null },
    // Excludem AWB-urile anulate sau în status final negativ
    NOT: {
      OR: [
        { currentStatus: "cancelled" },
        { currentStatus: "deleted" },
      ],
    },
  };

  // Filtru opțional per magazin
  if (storeId) {
    whereClause.order = { storeId };
  }

  const awbs = await prisma.aWB.findMany({
    where: whereClause,
    include: {
      order: {
        include: {
          store: true,
          lineItems: {
            select: { quantity: true, title: true, variantTitle: true },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return awbs.map(mapAWBToHandover);
}

/**
 * Obține statisticile pentru azi
 */
export async function getTodayStats(storeId?: string): Promise<HandoverStats> {
  const todayStart = getTodayStart();
  const todayEnd = getTodayEnd();

  const baseWhere: any = {
    createdAt: { gte: todayStart, lt: todayEnd },
    awbNumber: { not: null },
  };

  if (storeId) {
    baseWhere.order = { storeId };
  }

  // Total emise azi
  const totalIssued = await prisma.aWB.count({ where: baseWhere });

  // Total predate (scanate) azi
  const totalHandedOver = await prisma.aWB.count({
    where: { ...baseWhere, handedOverAt: { not: null } },
  });

  // Total nepredate (marcate explicit)
  const totalNotHandedOver = await prisma.aWB.count({
    where: { ...baseWhere, notHandedOver: true },
  });

  // Total în așteptare (niciuna din cele de mai sus)
  const totalPending = await prisma.aWB.count({
    where: { ...baseWhere, handedOverAt: null, notHandedOver: false },
  });

  // Total predate din zile anterioare (azi)
  const totalFromPrevDays = await prisma.aWB.count({
    where: {
      createdAt: { lt: todayStart },
      handedOverAt: { gte: todayStart, lt: todayEnd },
      ...(storeId ? { order: { storeId } } : {}),
    },
  });

  // Total alerte C0 fără scanare
  const totalC0Alerts = await prisma.aWB.count({
    where: { ...baseWhere, hasC0WithoutScan: true },
  });

  return {
    totalIssued,
    totalHandedOver,
    totalNotHandedOver,
    totalPending,
    totalFromPrevDays,
    totalC0Alerts,
  };
}

// ==========================================
// LISTA 2: NEPREDATE
// ==========================================

/**
 * Obține AWB-urile nepredate din toate zilele
 */
export async function getNotHandedOverList(storeId?: string): Promise<HandoverAWB[]> {
  const whereClause: any = {
    notHandedOver: true,
    awbNumber: { not: null },
  };

  if (storeId) {
    whereClause.order = { storeId };
  }

  const awbs = await prisma.aWB.findMany({
    where: whereClause,
    include: {
      order: {
        include: {
          store: true,
          lineItems: {
            select: { quantity: true, title: true, variantTitle: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return awbs.map(mapAWBToHandover);
}

// ==========================================
// SCANARE AWB
// ==========================================

/**
 * Scanează un AWB pentru predare
 */
export async function scanAWB(
  awbNumber: string,
  userId: string,
  userName: string
): Promise<ScanResult> {
  const todayStart = getTodayStart();
  const todayEnd = getTodayEnd();

  // Validare format AWB
  if (!awbNumber || awbNumber.trim().length < 5) {
    return {
      success: false,
      message: "Codul scanat nu este un număr AWB valid",
      type: "error",
    };
  }

  const cleanAwbNumber = awbNumber.trim();

  // Căutăm AWB-ul
  // FanCourier barcode format: primele 13 caractere = awbNumber (stocat în DB)
  // Barcode complet pe etichetă: 21 caractere (ex: 7000121083646001F1870)
  // Scanner-ul trimite barcode-ul complet, dar în DB avem doar awbNumber (13 cifre)

  let awb = await prisma.aWB.findFirst({
    where: { awbNumber: cleanAwbNumber },
    include: {
      order: {
        include: {
          store: true,
          lineItems: {
            select: { quantity: true, title: true, variantTitle: true },
          },
        },
      },
    },
  });

  // Dacă nu găsim exact match, încercăm prefix match
  // (barcode-ul scanat începe cu awbNumber-ul din DB)
  if (!awb && cleanAwbNumber.length > 13) {
    const prefix = cleanAwbNumber.substring(0, 13);
    awb = await prisma.aWB.findFirst({
      where: { awbNumber: prefix },
      include: {
        order: {
          include: {
            store: true,
            lineItems: {
              select: { quantity: true, title: true, variantTitle: true },
            },
          },
        },
      },
    });
  }

  // AWB inexistent
  if (!awb) {
    return {
      success: false,
      message: `AWB-ul ${cleanAwbNumber} nu există în sistem`,
      type: "error",
      details: { awbNumber: cleanAwbNumber, orderNumber: "-" },
    };
  }

  const orderNumber = awb.order?.shopifyOrderNumber || "-";

  // AWB anulat
  if (awb.currentStatus === "cancelled" || awb.currentStatus === "deleted") {
    return {
      success: false,
      message: `AWB-ul ${cleanAwbNumber} a fost anulat și nu poate fi scanat`,
      type: "error",
      details: { awbNumber: cleanAwbNumber, orderNumber },
    };
  }

  // AWB deja livrat
  if (awb.currentStatus === "delivered") {
    return {
      success: false,
      message: `AWB-ul ${cleanAwbNumber} este deja marcat ca livrat`,
      type: "error",
      details: { awbNumber: cleanAwbNumber, orderNumber },
    };
  }

  // AWB în retur
  if (awb.currentStatus === "returned") {
    return {
      success: false,
      message: `AWB-ul ${cleanAwbNumber} este în retur și nu poate fi predat`,
      type: "error",
      details: { awbNumber: cleanAwbNumber, orderNumber },
    };
  }

  // AWB deja scanat azi
  if (awb.handedOverAt && awb.handedOverAt >= todayStart && awb.handedOverAt < todayEnd) {
    return {
      success: false,
      message: `AWB-ul a fost deja scanat azi la ${awb.handedOverAt.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}`,
      type: "error",
      details: { awbNumber: cleanAwbNumber, orderNumber, previousScanDate: awb.handedOverAt },
    };
  }

  // AWB scanat în altă zi (rescanare)
  if (awb.handedOverAt && awb.handedOverAt < todayStart) {
    // Obținem sesiunea curentă
    const currentSession = await getOrCreateTodaySession();
    
    // Actualizăm data scanării
    await prisma.aWB.update({
      where: { id: awb.id },
      data: {
        handedOverAt: new Date(),
        handedOverBy: userId,
        handedOverByName: userName,
        handedOverNote: `Rescanat. Scanat anterior pe ${awb.handedOverAt.toLocaleDateString("ro-RO")}`,
        notHandedOver: false,
        notHandedOverAt: null,
        hasC0WithoutScan: false,
        handoverSessionId: currentSession.id,
      },
    });

    const updatedAwb = await prisma.aWB.findUnique({
      where: { id: awb.id },
      include: {
        order: {
          include: {
            store: true,
            lineItems: { select: { quantity: true, title: true, variantTitle: true } },
          },
        },
      },
    });

    return {
      success: true,
      message: `AWB-ul a fost scanat pe ${awb.handedOverAt.toLocaleDateString("ro-RO")}. Va fi marcat ca predat pentru azi.`,
      type: "warning",
      awb: updatedAwb ? mapAWBToHandover(updatedAwb) : undefined,
      details: { awbNumber: cleanAwbNumber, orderNumber, previousScanDate: awb.handedOverAt },
    };
  }

  // AWB din Lista Nepredate
  if (awb.notHandedOver) {
    // Obținem sesiunea curentă
    const currentSession = await getOrCreateTodaySession();
    
    await prisma.aWB.update({
      where: { id: awb.id },
      data: {
        handedOverAt: new Date(),
        handedOverBy: userId,
        handedOverByName: userName,
        handedOverNote: `Fost NEPREDAT din ${awb.createdAt.toLocaleDateString("ro-RO")}`,
        notHandedOver: false,
        notHandedOverAt: null,
        hasC0WithoutScan: false,
        handoverSessionId: currentSession.id,
      },
    });

    const updatedAwb = await prisma.aWB.findUnique({
      where: { id: awb.id },
      include: {
        order: {
          include: {
            store: true,
            lineItems: { select: { quantity: true, title: true, variantTitle: true } },
          },
        },
      },
    });

    return {
      success: true,
      message: `AWB-ul este din ${awb.createdAt.toLocaleDateString("ro-RO")} și era marcat NEPREDAT. A fost mutat în predările de azi.`,
      type: "warning",
      awb: updatedAwb ? mapAWBToHandover(updatedAwb) : undefined,
      details: { awbNumber: cleanAwbNumber, orderNumber, wasNotHandedOver: true },
    };
  }

  // Obținem sesiunea curentă pentru a lega AWB-ul
  const currentSession = await getOrCreateTodaySession();

  // Scanare normală (AWB de azi, prima scanare)
  await prisma.aWB.update({
    where: { id: awb.id },
    data: {
      handedOverAt: new Date(),
      handedOverBy: userId,
      handedOverByName: userName,
      handedOverNote: null,
      notHandedOver: false,
      notHandedOverAt: null,
      hasC0WithoutScan: false,
      handoverSessionId: currentSession.id,
    },
  });

  const updatedAwb = await prisma.aWB.findUnique({
    where: { id: awb.id },
    include: {
      order: {
        include: {
          store: true,
          lineItems: { select: { quantity: true, title: true, variantTitle: true } },
        },
      },
    },
  });

  return {
    success: true,
    message: `✓ AWB ${cleanAwbNumber} scanat cu succes`,
    type: "success",
    awb: updatedAwb ? mapAWBToHandover(updatedAwb) : undefined,
    details: { awbNumber: cleanAwbNumber, orderNumber },
  };
}

// ==========================================
// SESIUNE PREDARE
// ==========================================

/**
 * Obține sau creează sesiunea de predare pentru azi
 */
export async function getOrCreateTodaySession(): Promise<{
  id: string;
  status: "OPEN" | "CLOSED";
  closedAt: Date | null;
  closedBy: string | null;
  closeType: string | null;
}> {
  const today = getTodayStart();

  let session = await prisma.handoverSession.findUnique({
    where: { date: today },
  });

  if (!session) {
    session = await prisma.handoverSession.create({
      data: { date: today },
    });
  }

  return {
    id: session.id,
    status: session.status as "OPEN" | "CLOSED",
    closedAt: session.closedAt,
    closedBy: session.closedByName,
    closeType: session.closeType,
  };
}

/**
 * Finalizează predarea pentru azi
 */
export async function finalizeHandover(
  userId: string,
  userName: string,
  closeType: "auto" | "manual"
): Promise<{ success: boolean; message: string; stats: HandoverStats }> {
  const todayStart = getTodayStart();
  const todayEnd = getTodayEnd();

  // Marcăm toate AWB-urile nescanate ca NEPREDAT
  const result = await prisma.aWB.updateMany({
    where: {
      createdAt: { gte: todayStart, lt: todayEnd },
      awbNumber: { not: null },
      handedOverAt: null,
      notHandedOver: false,
    },
    data: {
      notHandedOver: true,
      notHandedOverAt: new Date(),
    },
  });

  // Calculăm statisticile
  const stats = await getTodayStats();

  // Actualizăm sesiunea
  await prisma.handoverSession.upsert({
    where: { date: todayStart },
    create: {
      date: todayStart,
      status: "CLOSED",
      closedAt: new Date(),
      closedBy: userId,
      closedByName: userName,
      closeType,
      totalIssued: stats.totalIssued,
      totalHandedOver: stats.totalHandedOver,
      totalNotHandedOver: stats.totalNotHandedOver,
      totalFromPrevDays: stats.totalFromPrevDays,
    },
    update: {
      status: "CLOSED",
      closedAt: new Date(),
      closedBy: userId,
      closedByName: userName,
      closeType,
      totalIssued: stats.totalIssued,
      totalHandedOver: stats.totalHandedOver,
      totalNotHandedOver: stats.totalNotHandedOver,
      totalFromPrevDays: stats.totalFromPrevDays,
    },
  });

  return {
    success: true,
    message: `Predarea a fost finalizată. ${result.count} AWB-uri marcate ca NEPREDAT.`,
    stats,
  };
}

/**
 * Redeschide predarea pentru azi
 */
export async function reopenHandover(
  userId: string,
  userName: string
): Promise<{ success: boolean; message: string }> {
  const today = getTodayStart();

  const session = await prisma.handoverSession.findUnique({
    where: { date: today },
  });

  if (!session) {
    return { success: false, message: "Nu există o sesiune de predare pentru azi." };
  }

  if (session.status === "OPEN") {
    return { success: false, message: "Predarea este deja deschisă." };
  }

  await prisma.handoverSession.update({
    where: { id: session.id },
    data: {
      status: "OPEN",
      reopenedAt: new Date(),
      reopenedBy: userId,
      reopenedByName: userName,
    },
  });

  return { success: true, message: "Predarea a fost redeschisă." };
}

// ==========================================
// ALERTE C0
// ==========================================

/**
 * Obține AWB-urile cu C0 dar fără scanare internă
 */
export async function getC0Alerts(storeId?: string): Promise<HandoverAWB[]> {
  const todayStart = getTodayStart();
  const todayEnd = getTodayEnd();

  const whereClause: any = {
    createdAt: { gte: todayStart, lt: todayEnd },
    hasC0WithoutScan: true,
    awbNumber: { not: null },
  };

  if (storeId) {
    whereClause.order = { storeId };
  }

  const awbs = await prisma.aWB.findMany({
    where: whereClause,
    include: {
      order: {
        include: {
          store: true,
          lineItems: { select: { quantity: true, title: true, variantTitle: true } },
        },
      },
    },
    orderBy: { c0ReceivedAt: "desc" },
  });

  return awbs.map(mapAWBToHandover);
}

/**
 * Rezolvă o alertă C0 - marchează ca predat sau ignoră
 */
export async function resolveC0Alert(
  awbId: string,
  action: "mark_handed" | "ignore",
  userId: string,
  userName: string
): Promise<{ success: boolean; message: string }> {
  const awb = await prisma.aWB.findUnique({ where: { id: awbId } });

  if (!awb) {
    return { success: false, message: "AWB-ul nu a fost găsit." };
  }

  if (!awb.hasC0WithoutScan) {
    return { success: false, message: "AWB-ul nu are o alertă C0 activă." };
  }

  if (action === "mark_handed") {
    // Obținem sesiunea curentă
    const currentSession = await getOrCreateTodaySession();
    
    await prisma.aWB.update({
      where: { id: awbId },
      data: {
        handedOverAt: awb.c0ReceivedAt || new Date(),
        handedOverBy: userId,
        handedOverByName: userName,
        handedOverNote: "Marcat automat pe baza confirmării FanCourier (C0)",
        hasC0WithoutScan: false,
        handoverSessionId: currentSession.id,
      },
    });
    return { success: true, message: "AWB-ul a fost marcat ca predat." };
  } else {
    // Ignore - doar ștergem flag-ul, va rămâne nescanat
    await prisma.aWB.update({
      where: { id: awbId },
      data: {
        hasC0WithoutScan: false,
      },
    });
    return { success: true, message: "Alerta a fost ignorată. AWB-ul rămâne nescanat." };
  }
}

/**
 * Rezolvă toate alertele C0 cu o singură acțiune
 */
export async function resolveAllC0Alerts(
  action: "mark_handed" | "ignore",
  userId: string,
  userName: string,
  storeId?: string
): Promise<{ success: boolean; message: string; count: number }> {
  const todayStart = getTodayStart();
  const todayEnd = getTodayEnd();

  const whereClause: any = {
    createdAt: { gte: todayStart, lt: todayEnd },
    hasC0WithoutScan: true,
  };

  if (storeId) {
    whereClause.order = { storeId };
  }

  if (action === "mark_handed") {
    // Obținem sesiunea curentă
    const currentSession = await getOrCreateTodaySession();
    
    // Obținem AWB-urile pentru a folosi c0ReceivedAt
    const awbs = await prisma.aWB.findMany({ where: whereClause });
    
    let count = 0;
    for (const awb of awbs) {
      await prisma.aWB.update({
        where: { id: awb.id },
        data: {
          handedOverAt: awb.c0ReceivedAt || new Date(),
          handedOverBy: userId,
          handedOverByName: userName,
          handedOverNote: "Marcat automat pe baza confirmării FanCourier (C0)",
          hasC0WithoutScan: false,
          handoverSessionId: currentSession.id,
        },
      });
      count++;
    }
    
    return { success: true, message: `${count} AWB-uri marcate ca predate.`, count };
  } else {
    const result = await prisma.aWB.updateMany({
      where: whereClause,
      data: { hasC0WithoutScan: false },
    });
    
    return { success: true, message: `${result.count} alerte ignorate.`, count: result.count };
  }
}

// ==========================================
// RAPORT
// ==========================================

/**
 * Generează raportul pentru o zi specifică
 */
export async function getHandoverReport(date: Date, storeId?: string): Promise<HandoverReport> {
  const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const baseWhere: any = {
    createdAt: { gte: dayStart, lt: dayEnd },
    awbNumber: { not: null },
  };

  if (storeId) {
    baseWhere.order = { storeId };
  }

  // Sesiunea
  const session = await prisma.handoverSession.findUnique({
    where: { date: dayStart },
  });

  // AWB-uri predate (scanate în ziua respectivă, indiferent de data creării)
  const handedOverAwbs = await prisma.aWB.findMany({
    where: {
      ...baseWhere,
      handedOverAt: { not: null },
    },
    include: {
      order: {
        include: {
          store: true,
          lineItems: { select: { quantity: true, title: true, variantTitle: true } },
        },
      },
    },
    orderBy: { handedOverAt: "asc" },
  });

  // AWB-uri nepredate din ziua respectivă
  const notHandedOverAwbs = await prisma.aWB.findMany({
    where: {
      ...baseWhere,
      notHandedOver: true,
    },
    include: {
      order: {
        include: {
          store: true,
          lineItems: { select: { quantity: true, title: true, variantTitle: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // AWB-uri din zile anterioare predate în ziua respectivă
  const fromPrevDaysAwbs = await prisma.aWB.findMany({
    where: {
      createdAt: { lt: dayStart },
      handedOverAt: { gte: dayStart, lt: dayEnd },
      ...(storeId ? { order: { storeId } } : {}),
    },
    include: {
      order: {
        include: {
          store: true,
          lineItems: { select: { quantity: true, title: true, variantTitle: true } },
        },
      },
    },
    orderBy: { handedOverAt: "asc" },
  });

  // Statistici
  const totalIssued = await prisma.aWB.count({ where: baseWhere });
  const totalHandedOver = handedOverAwbs.length;
  const totalNotHandedOver = notHandedOverAwbs.length;
  const totalPending = totalIssued - totalHandedOver - totalNotHandedOver;

  return {
    date: dayStart,
    stats: {
      totalIssued,
      totalHandedOver,
      totalNotHandedOver,
      totalPending,
      totalFromPrevDays: fromPrevDaysAwbs.length,
      totalC0Alerts: 0, // Nu e relevant pentru rapoarte istorice
    },
    closedAt: session?.closedAt || null,
    closedBy: session?.closedByName || null,
    closeType: session?.closeType || null,
    handedOverList: handedOverAwbs.map(mapAWBToHandover),
    notHandedOverList: notHandedOverAwbs.map(mapAWBToHandover),
    fromPrevDaysList: fromPrevDaysAwbs.map(mapAWBToHandover),
  };
}

// ==========================================
// CRON: FINALIZARE AUTOMATĂ
// ==========================================

/**
 * Verifică dacă trebuie rulată finalizarea automată
 * Apelată din CRON job
 *
 * Finalizează dacă:
 * - Ora curentă >= ora setată (default 20:00)
 * - Sesiunea de azi e încă deschisă
 *
 * De asemenea, marchează automat AWB-urile vechi nescanate ca nepredate
 */
export async function checkAutoFinalize(): Promise<boolean> {
  // Mai întâi, marchează AWB-urile din zilele anterioare care nu au fost scanate/marcate
  await markOldUnscannedAsNotHandedOver();

  const settings = await prisma.settings.findFirst();
  const closeTime = settings?.handoverAutoCloseTime || "20:00";

  const now = new Date();
  const [closeHour, closeMinute] = closeTime.split(":").map(Number);

  // Calculăm minutele de la miezul nopții pentru comparație ușoară
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const closeMinutes = closeHour * 60 + closeMinute;

  // Verificăm dacă am trecut de ora de închidere
  if (nowMinutes >= closeMinutes) {
    const session = await getOrCreateTodaySession();

    if (session.status === "OPEN") {
      await finalizeHandover("system", "System (Auto)", "auto");
      return true;
    }
  }

  return false;
}

/**
 * Marchează automat AWB-urile din zilele anterioare care nu au fost scanate și nici marcate ca nepredate
 * Acestea sunt AWB-uri "uitate" - probabil predarea din ziua respectivă nu s-a finalizat
 */
export async function markOldUnscannedAsNotHandedOver(): Promise<number> {
  const todayStart = getTodayStart();

  // Găsim AWB-uri create ÎNAINTE de azi, nescanate, nemarcate ca nepredate
  const result = await prisma.aWB.updateMany({
    where: {
      createdAt: { lt: todayStart },
      awbNumber: { not: null },
      handedOverAt: null,
      notHandedOver: false,
      // Excludem cele anulate/livrate/returnate
      NOT: {
        OR: [
          { currentStatus: "cancelled" },
          { currentStatus: "deleted" },
          { currentStatus: "delivered" },
          { currentStatus: "returned" },
        ],
      },
    },
    data: {
      notHandedOver: true,
      notHandedOverAt: new Date(),
    },
  });

  if (result.count > 0) {
    console.log(`🔴 ${result.count} AWB-uri vechi nescanate marcate automat ca NEPREDATE`);
  }

  return result.count;
}

/**
 * Detectează și marchează AWB-urile cu C0 dar fără scanare internă
 * Apelată din sincronizarea FanCourier când primim C0
 */
export async function markC0WithoutScan(awbId: string, c0Date: Date): Promise<void> {
  const awb = await prisma.aWB.findUnique({ where: { id: awbId } });
  
  if (awb && !awb.handedOverAt) {
    await prisma.aWB.update({
      where: { id: awbId },
      data: {
        hasC0WithoutScan: true,
        c0ReceivedAt: c0Date,
      },
    });
  }
}
