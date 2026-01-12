import { NextRequest, NextResponse } from "next/server";
import { runFullSync, getSyncHistory, getSyncLogDetails, syncSingleOrder } from "@/lib/sync-service";

// POST - Rulează sincronizare
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { orderId } = body;
    
    let result;
    
    if (orderId) {
      // Sincronizare pentru o singură comandă
      result = await syncSingleOrder(orderId);
    } else {
      // Sincronizare completă
      result = await runFullSync("MANUAL");
    }
    
    return NextResponse.json(result);
    
  } catch (error: any) {
    console.error("Eroare la sincronizare:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// GET - Obține istoricul sincronizărilor sau detaliile unei sesiuni
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const syncLogId = searchParams.get("id");
    const limit = parseInt(searchParams.get("limit") || "20");
    
    if (syncLogId) {
      // Returnează detaliile unei sesiuni specifice
      const details = await getSyncLogDetails(syncLogId);
      
      if (!details) {
        return NextResponse.json(
          { error: "Sesiunea de sincronizare nu a fost găsită" },
          { status: 404 }
        );
      }
      
      return NextResponse.json(details);
    }
    
    // Returnează istoricul sesiunilor
    const history = await getSyncHistory(limit);
    
    return NextResponse.json({ history });
    
  } catch (error: any) {
    console.error("Eroare la obținerea istoricului:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
