import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canView = await hasPermission(session.user.id, "stores.view");
    if (!canView) {
      return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
    }

    const stores = await prisma.store.findMany({
      include: {
        _count: {
          select: { orders: true },
        },
        invoiceSeries: {
          select: {
            id: true,
            name: true,
            prefix: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
            oblioEmail: true,
            oblioSecretToken: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Adaugă flag pentru hasOblioCredentials la fiecare store
    const storesWithFlags = stores.map(store => ({
      ...store,
      hasOblioCredentials: !!(store.company?.oblioEmail && store.company?.oblioSecretToken),
      company: store.company ? {
        id: store.company.id,
        name: store.company.name,
      } : null,
    }));

    return NextResponse.json({ stores: storesWithFlags });
  } catch (error: any) {
    console.error("Error fetching stores:", error);
    return NextResponse.json(
      { error: "Eroare la încărcarea magazinelor" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canManage = await hasPermission(session.user.id, "stores.manage");
    if (!canManage) {
      return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
    }

    const body = await request.json();
    const { name, shopifyDomain, accessToken } = body;
    
    console.log("[Store] Received:", {
      name,
      shopifyDomain,
      hasToken: !!accessToken,
      tokenLength: accessToken?.length,
    });

    if (!name || !shopifyDomain || !accessToken) {
      console.log("[Store] VALIDATION FAILED - missing fields");
      return NextResponse.json(
        { error: "Toate câmpurile sunt obligatorii" },
        { status: 400 }
      );
    }

    // Normalizăm domeniul (lowercase, fără spații)
    const normalizedDomain = shopifyDomain.trim().toLowerCase();
    console.log("[Store] Normalized domain:", normalizedDomain);

    // Verificăm dacă domeniul există deja
    const existing = await prisma.store.findUnique({
      where: { shopifyDomain: normalizedDomain },
    });

    if (existing) {
      console.log("[Store] DUPLICATE - store already exists:", existing.id);
      return NextResponse.json(
        { error: "Acest magazin există deja", existingId: existing.id },
        { status: 409 }
      );
    }

    // Testăm conexiunea la Shopify înainte de a salva
    console.log("[Store] Testing Shopify connection...");
    try {
      const testUrl = `https://${normalizedDomain}/admin/api/2024-01/shop.json`;
      console.log("[Store] Shopify URL:", testUrl);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 sec timeout
      
      const testResponse = await fetch(testUrl, {
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      console.log("[Store] Shopify response status:", testResponse.status);

      if (!testResponse.ok) {
        const errorText = await testResponse.text();
        console.log("[Store] Shopify error response:", errorText);
        
        let errorMessage = "Eroare la conectarea la Shopify";
        if (testResponse.status === 401) {
          errorMessage = "Token-ul de acces este invalid sau a expirat";
        } else if (testResponse.status === 404) {
          errorMessage = "Domeniul Shopify nu a fost găsit";
        } else if (testResponse.status === 403) {
          errorMessage = "Token-ul nu are permisiunile necesare";
        }
        
        return NextResponse.json(
          { error: errorMessage, details: errorText.substring(0, 200) },
          { status: 400 }
        );
      }
      
      const shopData = await testResponse.json();
      console.log("[Store] Shopify shop name:", shopData?.shop?.name);
      
    } catch (shopifyError: any) {
      console.log("[Store] Shopify connection error:", shopifyError.message);
      
      if (shopifyError.name === 'AbortError') {
        return NextResponse.json(
          { error: "Conexiunea la Shopify a expirat (timeout). Verifică domeniul." },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: `Nu s-a putut conecta la Shopify: ${shopifyError.message}` },
        { status: 400 }
      );
    }

    // Totul OK - creăm magazinul
    console.log("[Store] Shopify OK, creating store in DB...");
    const store = await prisma.store.create({
      data: {
        name: name.trim(),
        shopifyDomain: normalizedDomain,
        accessToken,
      },
    });
    
    console.log("[Store] SUCCESS - Store created:", store.id);
    console.log("========== CREATE STORE END ==========\n");

    return NextResponse.json({ 
      store, 
      message: "Magazin adăugat cu succes",
      success: true 
    });
    
  } catch (error: any) {
    console.error("[Store] EXCEPTION:", error);
    console.log("========== CREATE STORE END (ERROR) ==========\n");
    
    // Verificăm dacă e eroare de duplicat (race condition)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: "Acest magazin există deja" },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || "Eroare la adăugarea magazinului" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/stores - Actualizează un magazin (oblioSeriesName, companyId, etc.)
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canManage = await hasPermission(session.user.id, "stores.manage");
    if (!canManage) {
      return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
    }

    const body = await request.json();
    const { id, oblioSeriesName, companyId, invoiceSeriesId } = body;

    if (!id) {
      return NextResponse.json({ error: "ID-ul magazinului este obligatoriu" }, { status: 400 });
    }

    // Verificăm că magazinul există
    const existing = await prisma.store.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Magazinul nu a fost găsit" }, { status: 404 });
    }

    // Construim obiectul de update
    const updateData: any = {};
    if (oblioSeriesName !== undefined) updateData.oblioSeriesName = oblioSeriesName || null;
    if (companyId !== undefined) updateData.companyId = companyId || null;
    if (invoiceSeriesId !== undefined) updateData.invoiceSeriesId = invoiceSeriesId || null;

    const store = await prisma.store.update({
      where: { id },
      data: updateData,
    });

    console.log(`[Store] Updated store ${id}:`, updateData);

    return NextResponse.json({ store, success: true });
  } catch (error: any) {
    console.error("Error updating store:", error);
    return NextResponse.json(
      { error: error.message || "Eroare la actualizarea magazinului" },
      { status: 500 }
    );
  }
}
