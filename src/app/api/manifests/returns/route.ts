import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import {
  generateReturnManifest,
  listReturnManifests
} from "@/lib/manifest/return-manifest";
import { ManifestStatus } from "@prisma/client";

/**
 * GET /api/manifests/returns
 * List return manifests with optional status filter
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canView = await hasPermission(session.user.id, "handover.scan");
    if (!canView) {
      return NextResponse.json(
        { error: "Nu ai permisiunea de a vizualiza manifestele" },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const statusParam = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    const status = statusParam as ManifestStatus | undefined;

    const result = await listReturnManifests({ status, limit, offset });

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error("Error in GET /api/manifests/returns:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/manifests/returns
 * Generate a new return manifest from scanned AWBs
 *
 * Body: { documentDate?: string, returnAwbIds?: string[] }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canCreate = await hasPermission(session.user.id, "handover.scan");
    if (!canCreate) {
      return NextResponse.json(
        { error: "Nu ai permisiunea de a genera manifeste" },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { documentDate, returnAwbIds } = body;

    const date = documentDate ? new Date(documentDate) : undefined;

    const result = await generateReturnManifest(date, returnAwbIds);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      manifestId: result.manifestId,
      itemCount: result.itemCount
    });
  } catch (error: any) {
    console.error("Error in POST /api/manifests/returns:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
