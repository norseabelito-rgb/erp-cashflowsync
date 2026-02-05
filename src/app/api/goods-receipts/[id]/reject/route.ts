import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { transitionNIR } from "@/lib/reception-workflow";

export const dynamic = 'force-dynamic';

/**
 * POST - Manager rejects NIR
 * Transition: VERIFICAT -> RESPINS
 *
 * Permission: reception.approve_differences (George action)
 *
 * Body: { reason?: string } - Optional rejection reason stored in notes
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canReject = await hasPermission(session.user.id, "reception.approve_differences");
    if (!canReject) {
      return NextResponse.json(
        { error: "Nu ai permisiunea necesara" },
        { status: 403 }
      );
    }

    const { id } = params;

    // Parse optional rejection reason
    let reason: string | undefined;
    try {
      const body = await request.json();
      reason = body.reason;
    } catch {
      // No body or invalid JSON - reason is optional
    }

    const result = await transitionNIR(
      id,
      'RESPINS',
      {
        userId: session.user.id,
        userName: session.user.name || session.user.email || ''
      }
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    // Store rejection reason in notes if provided
    if (reason) {
      const existingNir = await prisma.goodsReceipt.findUnique({
        where: { id },
        select: { notes: true }
      });

      const rejectionNote = `[RESPINS ${new Date().toISOString()}] ${reason}`;
      const newNotes = existingNir?.notes
        ? `${existingNir.notes}\n\n${rejectionNote}`
        : rejectionNote;

      await prisma.goodsReceipt.update({
        where: { id },
        data: { notes: newNotes }
      });
    }

    console.log(`[NIR] ${id} respins de manager (${session.user.email})${reason ? `: ${reason}` : ''}`);

    return NextResponse.json({
      success: true,
      data: result.nir,
      message: 'NIR respins'
    });
  } catch (error: any) {
    console.error("Error rejecting NIR:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Eroare la respingerea NIR" },
      { status: 500 }
    );
  }
}
