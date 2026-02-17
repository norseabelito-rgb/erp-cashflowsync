import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { buildDaktelaContactFromOrder, syncContactToDaktela } from "@/lib/daktela";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min - poate dura pentru multi clienti

/**
 * POST /api/admin/daktela-sync
 * Trimite toate contactele existente catre Daktela (bulk sync).
 * Super admin only.
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    // Verificam super admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isSuperAdmin: true },
    });
    if (!user?.isSuperAdmin) {
      return NextResponse.json({ error: "Doar super admin" }, { status: 403 });
    }

    // Gasim toate email-urile unice ale clientilor (cu cel putin o comanda)
    const distinctCustomers = await prisma.order.findMany({
      where: {
        customerEmail: { not: null },
      },
      select: {
        id: true,
        customerEmail: true,
      },
      distinct: ["customerEmail"],
      orderBy: { shopifyCreatedAt: "desc" },
    });

    // Adaugam si clientii care au doar telefon (fara email)
    const phonOnlyCustomers = await prisma.order.findMany({
      where: {
        customerEmail: null,
        customerPhone: { not: null },
      },
      select: {
        id: true,
        customerPhone: true,
      },
      distinct: ["customerPhone"],
      orderBy: { shopifyCreatedAt: "desc" },
    });

    const totalCustomers = distinctCustomers.length + phonOnlyCustomers.length;
    console.log(`[Daktela Bulk] Incep sync pentru ${totalCustomers} clienti (${distinctCustomers.length} cu email, ${phonOnlyCustomers.length} doar telefon)`);

    let synced = 0;
    let errors = 0;
    const errorDetails: string[] = [];

    // Procesam in batch-uri de 10 cu pauza intre ele
    const allOrderIds = [
      ...distinctCustomers.map((c) => c.id),
      ...phonOnlyCustomers.map((c) => c.id),
    ];

    for (let i = 0; i < allOrderIds.length; i++) {
      try {
        const data = await buildDaktelaContactFromOrder(allOrderIds[i]);
        if (data) {
          await syncContactToDaktela(data);
          synced++;
        }
      } catch (err: any) {
        errors++;
        errorDetails.push(err.message || "Eroare necunoscuta");
      }

      // Pauza de 100ms la fiecare 10 contacte (rate limiting)
      if ((i + 1) % 10 === 0) {
        await new Promise((r) => setTimeout(r, 100));
        console.log(`[Daktela Bulk] Progres: ${i + 1}/${allOrderIds.length}`);
      }
    }

    console.log(`[Daktela Bulk] Finalizat: ${synced} sincronizati, ${errors} erori`);

    return NextResponse.json({
      success: true,
      total: totalCustomers,
      synced,
      errors,
      errorDetails: errorDetails.slice(0, 10),
    });
  } catch (error: any) {
    console.error("[Daktela Bulk] Eroare:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
