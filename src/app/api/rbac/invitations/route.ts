import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission, logAuditAction } from "@/lib/permissions";

// GET /api/rbac/invitations - Lista invitațiilor
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    // Verifică permisiunea
    const canInvite = await hasPermission(session.user.id, "users.invite");
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isSuperAdmin: true },
    });

    if (!canInvite && !user?.isSuperAdmin) {
      return NextResponse.json({ error: "Nu ai permisiunea de a gestiona invitații" }, { status: 403 });
    }

    const invitations = await prisma.invitation.findMany({
      include: {
        invitedBy: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Colectăm toate ID-urile necesare pentru batch queries (evită N+1)
    const allRoleIds = [...new Set(invitations.flatMap(inv => inv.roleIds))];
    const allGroupIds = [...new Set(invitations.flatMap(inv => inv.groupIds))];
    const allStoreIds = [...new Set(invitations.flatMap(inv => inv.storeIds))];

    // Batch queries - 3 query-uri în loc de 3*N
    const [allRoles, allGroups, allStores] = await Promise.all([
      allRoleIds.length > 0
        ? prisma.role.findMany({
            where: { id: { in: allRoleIds } },
            select: { id: true, name: true, color: true },
          })
        : [],
      allGroupIds.length > 0
        ? prisma.group.findMany({
            where: { id: { in: allGroupIds } },
            select: { id: true, name: true, color: true },
          })
        : [],
      allStoreIds.length > 0
        ? prisma.store.findMany({
            where: { id: { in: allStoreIds } },
            select: { id: true, name: true },
          })
        : [],
    ]);

    // Creăm maps pentru lookup rapid
    const rolesMap = new Map(allRoles.map(r => [r.id, r]));
    const groupsMap = new Map(allGroups.map(g => [g.id, g]));
    const storesMap = new Map(allStores.map(s => [s.id, s]));

    // Mapăm invitațiile cu detaliile lor
    const invitationsWithDetails = invitations.map(inv => ({
      ...inv,
      roles: inv.roleIds.map(id => rolesMap.get(id)).filter(Boolean),
      groups: inv.groupIds.map(id => groupsMap.get(id)).filter(Boolean),
      stores: inv.storeIds.map(id => storesMap.get(id)).filter(Boolean),
      isExpired: new Date() > inv.expiresAt,
      isAccepted: !!inv.acceptedAt,
    }));

    return NextResponse.json(invitationsWithDetails);
  } catch (error: any) {
    console.error("Error fetching invitations:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/rbac/invitations - Creare invitație nouă
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    // Verifică permisiunea
    const canInvite = await hasPermission(session.user.id, "users.invite");
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isSuperAdmin: true },
    });

    if (!canInvite && !user?.isSuperAdmin) {
      return NextResponse.json({ error: "Nu ai permisiunea de a invita utilizatori" }, { status: 403 });
    }

    const body = await request.json();
    const { email, roleIds, groupIds, storeIds, expiresInDays = 7 } = body;

    if (!email) {
      return NextResponse.json({ error: "Email-ul este obligatoriu" }, { status: 400 });
    }

    // Verifică dacă utilizatorul există deja
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: "Un utilizator cu acest email există deja" }, { status: 400 });
    }

    // Verifică dacă există o invitație activă pentru acest email
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        email,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (existingInvitation) {
      return NextResponse.json({ 
        error: "Există deja o invitație activă pentru acest email",
        invitation: existingInvitation,
      }, { status: 400 });
    }

    // Calculează data de expirare
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // Creează invitația
    const invitation = await prisma.invitation.create({
      data: {
        email,
        roleIds: roleIds || [],
        groupIds: groupIds || [],
        storeIds: storeIds || [],
        invitedById: session.user.id,
        expiresAt,
      },
    });

    // Log audit
    await logAuditAction({
      userId: session.user.id,
      action: "invitation.create",
      entityType: "Invitation",
      entityId: invitation.id,
      newValue: { email, roleIds, groupIds, storeIds, expiresAt },
    });

    // Construiește URL-ul de invitație
    const inviteUrl = `${process.env.NEXTAUTH_URL}/invite/${invitation.token}`;

    return NextResponse.json({
      invitation,
      inviteUrl,
      message: `Invitație creată. Trimite acest link: ${inviteUrl}`,
    });
  } catch (error: any) {
    console.error("Error creating invitation:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/rbac/invitations - Anulare invitație
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    // Verifică permisiunea
    const canInvite = await hasPermission(session.user.id, "users.invite");
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isSuperAdmin: true },
    });

    if (!canInvite && !user?.isSuperAdmin) {
      return NextResponse.json({ error: "Nu ai permisiunea de a anula invitații" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID-ul este obligatoriu" }, { status: 400 });
    }

    const invitation = await prisma.invitation.findUnique({ where: { id } });

    if (!invitation) {
      return NextResponse.json({ error: "Invitația nu a fost găsită" }, { status: 404 });
    }

    if (invitation.acceptedAt) {
      return NextResponse.json({ error: "Nu poți anula o invitație deja acceptată" }, { status: 400 });
    }

    await prisma.invitation.delete({ where: { id } });

    // Log audit
    await logAuditAction({
      userId: session.user.id,
      action: "invitation.cancel",
      entityType: "Invitation",
      entityId: id,
      oldValue: { email: invitation.email },
    });

    return NextResponse.json({ success: true, message: "Invitație anulată" });
  } catch (error: any) {
    console.error("Error canceling invitation:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
