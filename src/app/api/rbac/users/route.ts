import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission, logAuditAction, getUserPermissions } from "@/lib/permissions";

// GET /api/rbac/users - Lista utilizatorilor cu roluri și grupuri
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    // Verifică permisiunea
    const canView = await hasPermission(session.user.id, "users.view");
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isSuperAdmin: true },
    });

    if (!canView && !currentUser?.isSuperAdmin) {
      return NextResponse.json({ error: "Nu ai permisiunea de a vizualiza utilizatori" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const roleId = searchParams.get("roleId");
    const groupId = searchParams.get("groupId");
    const includeInactive = searchParams.get("includeInactive") === "true";

    const whereClause: any = {};

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    if (roleId) {
      whereClause.roles = { some: { roleId } };
    }

    if (groupId) {
      whereClause.groups = { some: { groupId } };
    }

    if (!includeInactive) {
      whereClause.isActive = true;
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      include: {
        roles: {
          include: { role: { select: { id: true, name: true, color: true } } },
        },
        groups: {
          include: { group: { select: { id: true, name: true, color: true } } },
        },
        storeAccess: {
          include: { store: { select: { id: true, name: true } } },
        },
      },
      orderBy: [
        { isSuperAdmin: "desc" },
        { name: "asc" },
      ],
    });

    return NextResponse.json(users);
  } catch (error: any) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/rbac/users - Actualizare utilizator (roluri, grupuri, store access)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const body = await request.json();
    const { userId, action, roleIds, groupIds, storeIds, isActive, isSuperAdmin } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId este obligatoriu" }, { status: 400 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isSuperAdmin: true },
    });

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: true,
        groups: true,
        storeAccess: true,
      },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Utilizatorul nu a fost găsit" }, { status: 404 });
    }

    // Verifică dacă încearcă să modifice un SuperAdmin fără a fi SuperAdmin
    if (targetUser.isSuperAdmin && !currentUser?.isSuperAdmin) {
      return NextResponse.json({ error: "Nu poți modifica un SuperAdmin" }, { status: 403 });
    }

    // Actualizare roluri
    if (action === "updateRoles" || roleIds !== undefined) {
      const canAssignRoles = await hasPermission(session.user.id, "users.roles");
      if (!canAssignRoles && !currentUser?.isSuperAdmin) {
        return NextResponse.json({ error: "Nu ai permisiunea de a asigna roluri" }, { status: 403 });
      }

      // Șterge rolurile vechi
      await prisma.userRoleAssignment.deleteMany({ where: { userId } });

      // Adaugă rolurile noi
      if (roleIds && roleIds.length > 0) {
        await prisma.userRoleAssignment.createMany({
          data: roleIds.map((roleId: string) => ({
            userId,
            roleId,
            assignedBy: session.user.id,
          })),
        });
      }

      await logAuditAction({
        userId: session.user.id,
        action: "user.roles.update",
        entityType: "User",
        entityId: userId,
        oldValue: { roleIds: targetUser.roles.map(r => r.roleId) },
        newValue: { roleIds },
      });
    }

    // Actualizare grupuri
    if (action === "updateGroups" || groupIds !== undefined) {
      const canManageGroups = await hasPermission(session.user.id, "users.groups");
      if (!canManageGroups && !currentUser?.isSuperAdmin) {
        return NextResponse.json({ error: "Nu ai permisiunea de a gestiona grupuri" }, { status: 403 });
      }

      // Șterge grupurile vechi
      await prisma.userGroupMembership.deleteMany({ where: { userId } });

      // Adaugă grupurile noi
      if (groupIds && groupIds.length > 0) {
        await prisma.userGroupMembership.createMany({
          data: groupIds.map((groupId: string) => ({
            userId,
            groupId,
            addedBy: session.user.id,
          })),
        });
      }

      await logAuditAction({
        userId: session.user.id,
        action: "user.groups.update",
        entityType: "User",
        entityId: userId,
        oldValue: { groupIds: targetUser.groups.map(g => g.groupId) },
        newValue: { groupIds },
      });
    }

    // Actualizare store access
    if (action === "updateStoreAccess" || storeIds !== undefined) {
      if (!currentUser?.isSuperAdmin) {
        return NextResponse.json({ error: "Doar SuperAdmin poate modifica accesul la store-uri" }, { status: 403 });
      }

      // Șterge accesul vechi
      await prisma.userStoreAccess.deleteMany({ where: { userId } });

      // Adaugă accesul nou (dacă storeIds e gol sau undefined, utilizatorul are acces la toate)
      if (storeIds && storeIds.length > 0) {
        await prisma.userStoreAccess.createMany({
          data: storeIds.map((storeId: string) => ({
            userId,
            storeId,
            grantedBy: session.user.id,
          })),
        });
      }

      await logAuditAction({
        userId: session.user.id,
        action: "user.storeAccess.update",
        entityType: "User",
        entityId: userId,
        oldValue: { storeIds: targetUser.storeAccess.map(s => s.storeId) },
        newValue: { storeIds },
      });
    }

    // Activare/Dezactivare
    if (isActive !== undefined) {
      const canDeactivate = await hasPermission(session.user.id, "users.deactivate");
      if (!canDeactivate && !currentUser?.isSuperAdmin) {
        return NextResponse.json({ error: "Nu ai permisiunea de a dezactiva utilizatori" }, { status: 403 });
      }

      // Nu te poți dezactiva pe tine însuți
      if (userId === session.user.id && !isActive) {
        return NextResponse.json({ error: "Nu te poți dezactiva pe tine însuți" }, { status: 400 });
      }

      await prisma.user.update({
        where: { id: userId },
        data: { isActive },
      });

      await logAuditAction({
        userId: session.user.id,
        action: isActive ? "user.activate" : "user.deactivate",
        entityType: "User",
        entityId: userId,
      });
    }

    // Promovare/Retrogradare SuperAdmin (doar SuperAdmin poate face asta)
    if (isSuperAdmin !== undefined && currentUser?.isSuperAdmin) {
      // Nu te poți retrograda pe tine însuți
      if (userId === session.user.id && !isSuperAdmin) {
        return NextResponse.json({ error: "Nu te poți retrograda pe tine însuți" }, { status: 400 });
      }

      await prisma.user.update({
        where: { id: userId },
        data: { isSuperAdmin },
      });

      await logAuditAction({
        userId: session.user.id,
        action: isSuperAdmin ? "user.promote.superadmin" : "user.demote.superadmin",
        entityType: "User",
        entityId: userId,
      });
    }

    // Returnează utilizatorul actualizat
    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: { role: { select: { id: true, name: true, color: true } } },
        },
        groups: {
          include: { group: { select: { id: true, name: true, color: true } } },
        },
        storeAccess: {
          include: { store: { select: { id: true, name: true } } },
        },
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error: any) {
    console.error("Error updating user:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET /api/rbac/users/me/permissions - Obține permisiunile utilizatorului curent
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const body = await request.json();
    
    // Dacă e cerere pentru permisiunile utilizatorului curent
    if (body.action === "getMyPermissions") {
      const permissions = await getUserPermissions(session.user.id);
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { isSuperAdmin: true },
      });

      return NextResponse.json({
        permissions,
        isSuperAdmin: user?.isSuperAdmin || false,
      });
    }

    return NextResponse.json({ error: "Acțiune necunoscută" }, { status: 400 });
  } catch (error: any) {
    console.error("Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
