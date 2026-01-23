/**
 * AWB Service
 *
 * Serviciu unificat pentru crearea AWB-urilor.
 * Folosește credențiale per firmă pentru FanCourier.
 */

import prisma from "./db";
import { FanCourierAPI } from "./fancourier";

export interface CreateAWBResult {
  success: boolean;
  awbNumber?: string;
  companyId?: string;
  companyName?: string;
  error?: string;
}

export interface AWBOptions {
  serviceType?: string;
  paymentType?: string;
  weight?: number;
  packages?: number;
  cashOnDelivery?: number;
  observations?: string;
}

/**
 * Creează un client FanCourier cu credențialele firmei
 */
function createFanCourierClientForCompany(company: {
  fancourierClientId: string | null;
  fancourierUsername: string | null;
  fancourierPassword: string | null;
}): FanCourierAPI | null {
  if (!company.fancourierClientId || !company.fancourierUsername || !company.fancourierPassword) {
    return null;
  }

  return new FanCourierAPI({
    clientId: company.fancourierClientId,
    username: company.fancourierUsername,
    password: company.fancourierPassword,
  });
}

/**
 * Obține datele expeditorului din firmă
 */
function getSenderInfoFromCompany(company: {
  name: string;
  senderName: string | null;
  senderPhone: string | null;
  senderEmail: string | null;
  senderCounty: string | null;
  senderCity: string | null;
  senderStreet: string | null;
  senderNumber: string | null;
  senderPostalCode: string | null;
  address: string | null;
  city: string | null;
  county: string | null;
  postalCode: string | null;
  phone: string | null;
  email: string | null;
}) {
  return {
    name: company.senderName || company.name,
    phone: company.senderPhone || company.phone || "",
    email: company.senderEmail || company.email,
    county: company.senderCounty || company.county || "",
    city: company.senderCity || company.city || "",
    street: company.senderStreet || company.address || "",
    number: company.senderNumber || "",
    postalCode: company.senderPostalCode || company.postalCode || "",
  };
}

/**
 * Creează un AWB pentru o comandă folosind firma asociată
 */
export async function createAWBForOrder(
  orderId: string,
  options?: AWBOptions
): Promise<CreateAWBResult> {
  try {
    // B10: Use row-level lock to prevent duplicate AWB creation
    // This ensures idempotency when concurrent requests try to create AWB for same order
    const order = await prisma.$transaction(async (tx) => {
      // Lock the order row using raw SQL FOR UPDATE to prevent concurrent AWB creation
      await tx.$executeRaw`SELECT id FROM "orders" WHERE id = ${orderId} FOR UPDATE`;

      return tx.order.findUnique({
        where: { id: orderId },
        include: {
          store: {
            include: { company: true },
          },
          awb: true,
          lineItems: true,
          billingCompany: true,
        },
      });
    });

    if (!order) {
      return { success: false, error: "Comanda nu a fost găsită" };
    }

    // Verificăm dacă AWB-ul existent poate fi înlocuit
    if (order.awb?.awbNumber) {
      const currentStatus = order.awb.currentStatus?.toLowerCase() || "";

      const canCreateNew =
        order.awb.errorMessage ||
        currentStatus.includes("șters") ||
        currentStatus.includes("sters") ||
        currentStatus.includes("deleted") ||
        currentStatus.includes("anulat") ||
        currentStatus.includes("cancelled") ||
        currentStatus.includes("canceled");

      if (!canCreateNew) {
        return {
          success: false,
          error: `AWB-ul a fost deja creat: ${order.awb.awbNumber}. Dacă dorești să creezi unul nou, trebuie să anulezi mai întâi AWB-ul existent.`,
        };
      }

      // Ștergem vechiul AWB pentru a face loc celui nou
      await prisma.aWB.delete({
        where: { id: order.awb.id },
      });
    }

    // Determinăm firma pentru AWB
    // Prioritate: 1) billingCompany, 2) company din store
    const company = order.billingCompany || order.store?.company;

    if (!company) {
      return {
        success: false,
        error: "Comanda nu are o firmă asociată. Configurează firma pentru magazin sau setează billingCompany.",
      };
    }

    // Verificăm credențialele FanCourier pentru firmă
    if (!company.fancourierClientId || !company.fancourierUsername || !company.fancourierPassword) {
      return {
        success: false,
        error: `Credențialele FanCourier nu sunt configurate pentru firma "${company.name}". Configurează-le în Setări > Firme.`,
      };
    }

    const fancourier = createFanCourierClientForCompany(company);

    if (!fancourier) {
      return {
        success: false,
        error: "Nu s-a putut crea clientul FanCourier.",
      };
    }

    // Obținem sender info din firmă
    const sender = getSenderInfoFromCompany(company);

    // Obținem setările default din Settings (ca fallback)
    const settings = await prisma.settings.findUnique({ where: { id: "default" } });

    // Determinăm suma ramburs
    let cod = options?.cashOnDelivery;
    const paymentType = options?.paymentType || settings?.defaultPaymentType || "destinatar";

    // Verificăm dacă e ramburs (destinatar = ramburs)
    const isRamburs = paymentType === "destinatar" || paymentType === "recipient";

    if (cod === undefined && isRamburs) {
      cod = Math.round(Number(order.totalPrice) * 100) / 100;
    }

    // Determinăm serviciul (Cont Colector dacă e ramburs și serviciul nu e deja Cont Colector)
    let service = options?.serviceType || settings?.defaultServiceType || "Standard";
    if (cod && cod > 0 && !service.toLowerCase().includes("colector")) {
      service = "Cont Colector";
    }

    // Construim observațiile cu lista de produse
    let observations = options?.observations || "";

    if (order.lineItems && order.lineItems.length > 0) {
      const productList = order.lineItems
        .map((item) => {
          let productName = item.title;
          if (item.variantTitle && item.variantTitle !== "Default Title") {
            productName += ` - ${item.variantTitle}`;
          }
          return `${item.quantity}x ${productName}`;
        })
        .join(", ");

      const maxObsLength = 200;
      let productsObs = `Produse: ${productList}`;

      if (productsObs.length > maxObsLength) {
        productsObs = productsObs.substring(0, maxObsLength - 3) + "...";
      }

      if (observations) {
        observations = `${observations} | ${productsObs}`;
      } else {
        observations = productsObs;
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("📦 CREARE AWB - FANCOURIER");
    console.log("=".repeat(60));
    console.log(`📦 Comandă: ${order.shopifyOrderNumber || order.id}`);
    console.log(`🏢 Firmă: ${company.name} (${company.code})`);
    console.log(`📍 Expeditor: ${sender.name}, ${sender.city}, ${sender.county}`);
    console.log(`📍 Destinatar: ${order.shippingCity}, ${order.shippingProvince}`);
    console.log(`💰 Ramburs: ${cod ? `${cod} RON` : "NU"}`);
    console.log("=".repeat(60));

    const result = await fancourier.createAWB({
      // Sender info din firmă
      senderName: sender.name,
      senderPhone: sender.phone,
      senderEmail: sender.email,
      senderCounty: sender.county,
      senderCity: sender.city,
      senderStreet: sender.street,
      senderStreetNo: sender.number,
      senderZipCode: sender.postalCode,
      // Recipient info din comandă
      recipientName: [order.customerFirstName, order.customerLastName].filter(Boolean).join(" "),
      recipientPhone: order.customerPhone || "",
      recipientEmail: order.customerEmail || undefined,
      recipientCounty: order.shippingProvince || "",
      recipientCity: order.shippingCity || "",
      recipientStreet: order.shippingAddress1 || "",
      recipientStreetNo: "",
      recipientZipCode: order.shippingZip || undefined,
      // AWB details
      service,
      payment: isRamburs ? "recipient" : "sender",
      parcels: options?.packages || settings?.defaultPackages || 1,
      weight: options?.weight || Number(settings?.defaultWeight) || 1,
      content: `Comandă ${order.shopifyOrderNumber || order.id}`,
      cod: cod || 0,
      declaredValue: Math.round(Number(order.totalPrice) * 100) / 100,
      observation: observations,
      costCenter: order.store?.name || company.name,
      options: ["X"], // ePOD - permite etichetă A6 pregătită de expeditor
    });

    if (!result.success || !result.awb) {
      await prisma.aWB.upsert({
        where: { orderId },
        create: {
          orderId,
          companyId: company.id,
          currentStatus: "error",
          errorMessage: result.error || "Eroare necunoscută",
        },
        update: {
          companyId: company.id,
          currentStatus: "error",
          errorMessage: result.error || "Eroare necunoscută",
        },
      });
      await prisma.order.update({
        where: { id: orderId },
        data: { status: "AWB_ERROR" },
      });
      return { success: false, error: result.error };
    }

    await prisma.aWB.upsert({
      where: { orderId: order.id },
      create: {
        orderId: order.id,
        companyId: company.id,
        awbNumber: result.awb,
        serviceType: service,
        paymentType,
        weight: options?.weight || Number(settings?.defaultWeight) || 1,
        packages: options?.packages || settings?.defaultPackages || 1,
        cashOnDelivery: cod,
        declaredValue: Number(order.totalPrice),
        observations: options?.observations,
        currentStatus: "created",
      },
      update: {
        companyId: company.id,
        awbNumber: result.awb,
        serviceType: service,
        paymentType,
        weight: options?.weight || Number(settings?.defaultWeight) || 1,
        packages: options?.packages || settings?.defaultPackages || 1,
        cashOnDelivery: cod,
        declaredValue: Number(order.totalPrice),
        observations: options?.observations,
        currentStatus: "created",
        errorMessage: null,
      },
    });

    // Actualizăm statusul comenzii
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "AWB_CREATED",
        billingCompanyId: company.id, // Setăm firma dacă nu e deja setată
      },
    });

    // Logăm în ActivityLog
    try {
      const { logAWBCreated } = await import("./activity-log");
      await logAWBCreated({
        orderId: order.id,
        orderNumber: order.shopifyOrderNumber || order.id,
        awbNumber: result.awb,
        courier: "FanCourier",
        companyName: company.name,
      });
    } catch (logError) {
      console.error("Eroare la logare:", logError);
    }

    console.log(`✅ AWB creat cu succes: ${result.awb}`);

    return {
      success: true,
      awbNumber: result.awb,
      companyId: company.id,
      companyName: company.name,
    };
  } catch (error: any) {
    console.error("Eroare la crearea AWB:", error);
    return {
      success: false,
      error: error.message || "Eroare necunoscută la crearea AWB-ului",
    };
  }
}

/**
 * Verifică dacă se poate crea AWB pentru o comandă
 */
export async function canCreateAWB(orderId: string): Promise<{
  canCreate: boolean;
  reason?: string;
}> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      store: {
        include: { company: true },
      },
      awb: true,
      billingCompany: true,
    },
  });

  if (!order) {
    return { canCreate: false, reason: "Comanda nu a fost găsită" };
  }

  // Verificăm dacă AWB-ul există deja și e valid
  if (order.awb?.awbNumber) {
    const currentStatus = order.awb.currentStatus?.toLowerCase() || "";
    const canCreateNew =
      order.awb.errorMessage ||
      currentStatus.includes("șters") ||
      currentStatus.includes("anulat") ||
      currentStatus.includes("cancelled");

    if (!canCreateNew) {
      return { canCreate: false, reason: "AWB-ul a fost deja creat" };
    }
  }

  const company = order.billingCompany || order.store?.company;

  if (!company) {
    return { canCreate: false, reason: "Nu există firmă asociată" };
  }

  if (!company.fancourierClientId || !company.fancourierUsername || !company.fancourierPassword) {
    return {
      canCreate: false,
      reason: `Credențialele FanCourier nu sunt configurate pentru ${company.name}`,
    };
  }

  return { canCreate: true };
}

/**
 * Creează AWB-uri pentru mai multe comenzi
 */
export async function createAWBsForOrders(
  orderIds: string[],
  options?: AWBOptions
): Promise<{
  created: number;
  failed: number;
  results: CreateAWBResult[];
}> {
  const results: CreateAWBResult[] = [];
  let created = 0;
  let failed = 0;

  for (const orderId of orderIds) {
    const result = await createAWBForOrder(orderId, options);
    results.push({ ...result, awbNumber: result.awbNumber || orderId });

    if (result.success) {
      created++;
    } else {
      failed++;
    }
  }

  return { created, failed, results };
}
