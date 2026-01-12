import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { logAuditAction } from "@/lib/permissions";

// GET /api/rbac/invitations/accept?token=xxx - Obține detaliile invitației
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Token lipsă" }, { status: 400 });
    }

    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        invitedBy: {
          select: { name: true, email: true },
        },
      },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Invitație nu a fost găsită" }, { status: 404 });
    }

    // Obține detalii despre roluri, grupuri și store-uri
    const roles = invitation.roleIds.length > 0
      ? await prisma.role.findMany({
          where: { id: { in: invitation.roleIds } },
          select: { id: true, name: true, color: true },
        })
      : [];

    const groups = invitation.groupIds.length > 0
      ? await prisma.group.findMany({
          where: { id: { in: invitation.groupIds } },
          select: { id: true, name: true, color: true },
        })
      : [];

    const stores = invitation.storeIds.length > 0
      ? await prisma.store.findMany({
          where: { id: { in: invitation.storeIds } },
          select: { id: true, name: true },
        })
      : [];

    return NextResponse.json({
      id: invitation.id,
      email: invitation.email,
      roles,
      groups,
      stores,
      invitedBy: invitation.invitedBy,
      expiresAt: invitation.expiresAt.toISOString(),
      isExpired: new Date() > invitation.expiresAt,
      isAccepted: !!invitation.acceptedAt,
    });
  } catch (error: any) {
    console.error("Error fetching invitation:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/rbac/invitations/accept - Acceptă invitația
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: "Trebuie să fii autentificat" }, { status: 401 });
    }

    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: "Token lipsă" }, { status: 400 });
    }

    const invitation = await prisma.invitation.findUnique({
      where: { token },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Invitație nu a fost găsită" }, { status: 404 });
    }

    if (invitation.acceptedAt) {
      return NextResponse.json({ error: "Invitația a fost deja acceptată" }, { status: 400 });
    }

    if (new Date() > invitation.expiresAt) {
      return NextResponse.json({ error: "Invitația a expirat" }, { status: 400 });
    }

    // Verifică dacă email-ul corespunde
    if (session.user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      return NextResponse.json({ 
        error: `Email-ul nu corespunde. Te-ai autentificat cu ${session.user.email}, dar invitația este pentru ${invitation.email}` 
      }, { status: 400 });
    }

    // Marchează invitația ca acceptată
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() },
    });

    // Asignează rolurile
    if (invitation.roleIds.length > 0) {
      await prisma.userRoleAssignment.createMany({
        data: invitation.roleIds.map((roleId) => ({
          userId: session.user.id,
          roleId,
          assignedBy: invitation.invitedById,
        })),
        skipDuplicates: true,
      });
    }

    // Adaugă în grupuri
    if (invitation.groupIds.length > 0) {
      await prisma.userGroupMembership.createMany({
        data: invitation.groupIds.map((groupId) => ({
          userId: session.user.id,
          groupId,
          addedBy: invitation.invitedById,
        })),
        skipDuplicates: true,
      });
    }

    // Setează accesul la store-uri
    if (invitation.storeIds.length > 0) {
      await prisma.userStoreAccess.createMany({
        data: invitation.storeIds.map((storeId) => ({
          userId: session.user.id,
          storeId,
          grantedBy: invitation.invitedById,
        })),
        skipDuplicates: true,
      });
    }

    // Log audit
    await logAuditAction({
      userId: session.user.id,
      action: "invitation.accept",
      entityType: "Invitation",
      entityId: invitation.id,
      newValue: {
        email: invitation.email,
        roleIds: invitation.roleIds,
        groupIds: invitation.groupIds,
        storeIds: invitation.storeIds,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Invitație acceptată cu succes!",
    });
  } catch (error: any) {
    console.error("Error accepting invitation:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
