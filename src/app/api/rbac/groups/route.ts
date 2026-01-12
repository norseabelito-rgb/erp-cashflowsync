import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission, logAuditAction } from "@/lib/permissions";

// GET /api/rbac/groups - Lista grupurilor
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const groups = await prisma.group.findMany({
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true, image: true } } },
        },
        roles: {
          include: { role: { select: { id: true, name: true, color: true } } },
        },
        _count: {
          select: { members: true, roles: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(groups);
  } catch (error: any) {
    console.error("Error fetching groups:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/rbac/groups - Creare grup nou
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    // Verifică permisiunea
    const canManage = await hasPermission(session.user.id, "admin.groups");
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isSuperAdmin: true },
    });

    if (!canManage && !user?.isSuperAdmin) {
      return NextResponse.json({ error: "Nu ai permisiunea de a gestiona grupuri" }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, color, roleIds, memberIds } = body;

    if (!name) {
      return NextResponse.json({ error: "Numele este obligatoriu" }, { status: 400 });
    }

    // Verifică dacă există deja
    const existing = await prisma.group.findUnique({ where: { name } });
    if (existing) {
      return NextResponse.json({ error: "Un grup cu acest nume există deja" }, { status: 400 });
    }

    // Creează grupul
    const group = await prisma.group.create({
      data: {
        name,
        description,
        color,
      },
    });

    // Adaugă rolurile
    if (roleIds && roleIds.length > 0) {
      await prisma.groupRoleAssignment.createMany({
        data: roleIds.map((roleId: string) => ({
          groupId: group.id,
          roleId,
          assignedBy: session.user.id,
        })),
      });
    }

    // Adaugă membrii
    if (memberIds && memberIds.length > 0) {
      await prisma.userGroupMembership.createMany({
        data: memberIds.map((userId: string) => ({
          groupId: group.id,
          userId,
          addedBy: session.user.id,
        })),
      });
    }

    // Log audit
    await logAuditAction({
      userId: session.user.id,
      action: "group.create",
      entityType: "Group",
      entityId: group.id,
      newValue: { name, description, color, roleIds, memberIds },
    });

    // Returnează grupul cu relațiile
    const createdGroup = await prisma.group.findUnique({
      where: { id: group.id },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true, image: true } } },
        },
        roles: {
          include: { role: { select: { id: true, name: true, color: true } } },
        },
        _count: { select: { members: true, roles: true } },
      },
    });

    return NextResponse.json(createdGroup);
  } catch (error: any) {
    console.error("Error creating group:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/rbac/groups - Actualizare grup
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    // Verifică permisiunea
    const canManage = await hasPermission(session.user.id, "admin.groups");
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isSuperAdmin: true },
    });

    if (!canManage && !user?.isSuperAdmin) {
      return NextResponse.json({ error: "Nu ai permisiunea de a gestiona grupuri" }, { status: 403 });
    }

    const body = await request.json();
    const { id, name, description, color, roleIds, memberIds } = body;

    if (!id) {
      return NextResponse.json({ error: "ID-ul este obligatoriu" }, { status: 400 });
    }

    // Verifică dacă grupul există
    const existingGroup = await prisma.group.findUnique({
      where: { id },
      include: {
        roles: true,
        members: true,
      },
    });

    if (!existingGroup) {
      return NextResponse.json({ error: "Grupul nu a fost găsit" }, { status: 404 });
    }

    // Actualizează grupul
    const group = await prisma.group.update({
      where: { id },
      data: {
        name,
        description,
        color,
      },
    });

    // Actualizează rolurile
    if (roleIds !== undefined) {
      await prisma.groupRoleAssignment.deleteMany({ where: { groupId: id } });
      if (roleIds.length > 0) {
        await prisma.groupRoleAssignment.createMany({
          data: roleIds.map((roleId: string) => ({
            groupId: id,
            roleId,
            assignedBy: session.user.id,
          })),
        });
      }
    }

    // Actualizează membrii
    if (memberIds !== undefined) {
      await prisma.userGroupMembership.deleteMany({ where: { groupId: id } });
      if (memberIds.length > 0) {
        await prisma.userGroupMembership.createMany({
          data: memberIds.map((userId: string) => ({
            groupId: id,
            userId,
            addedBy: session.user.id,
          })),
        });
      }
    }

    // Log audit
    await logAuditAction({
      userId: session.user.id,
      action: "group.update",
      entityType: "Group",
      entityId: id,
      oldValue: {
        name: existingGroup.name,
        roleIds: existingGroup.roles.map(r => r.roleId),
        memberIds: existingGroup.members.map(m => m.userId),
      },
      newValue: { name, description, color, roleIds, memberIds },
    });

    // Returnează grupul actualizat
    const updatedGroup = await prisma.group.findUnique({
      where: { id },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true, image: true } } },
        },
        roles: {
          include: { role: { select: { id: true, name: true, color: true } } },
        },
        _count: { select: { members: true, roles: true } },
      },
    });

    return NextResponse.json(updatedGroup);
  } catch (error: any) {
    console.error("Error updating group:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/rbac/groups - Ștergere grup
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    // Verifică permisiunea
    const canManage = await hasPermission(session.user.id, "admin.groups");
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isSuperAdmin: true },
    });

    if (!canManage && !user?.isSuperAdmin) {
      return NextResponse.json({ error: "Nu ai permisiunea de a gestiona grupuri" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID-ul este obligatoriu" }, { status: 400 });
    }

    // Verifică dacă grupul există
    const group = await prisma.group.findUnique({ where: { id } });

    if (!group) {
      return NextResponse.json({ error: "Grupul nu a fost găsit" }, { status: 404 });
    }

    // Șterge grupul (membrii și rolurile se șterg automat prin onDelete: Cascade)
    await prisma.group.delete({ where: { id } });

    // Log audit
    await logAuditAction({
      userId: session.user.id,
      action: "group.delete",
      entityType: "Group",
      entityId: id,
      oldValue: { name: group.name, description: group.description },
    });

    return NextResponse.json({ success: true, message: "Grup șters cu succes" });
  } catch (error: any) {
    console.error("Error deleting group:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
