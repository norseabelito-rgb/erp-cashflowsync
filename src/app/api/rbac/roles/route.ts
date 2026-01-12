import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission, logAuditAction } from "@/lib/permissions";

// GET /api/rbac/roles - Lista rolurilor
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const roles = await prisma.role.findMany({
      include: {
        permissions: {
          include: { permission: true },
        },
        users: {
          include: { user: { select: { id: true, name: true, email: true, image: true } } },
        },
        groups: {
          include: { group: { select: { id: true, name: true } } },
        },
        _count: {
          select: { users: true, groups: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(roles);
  } catch (error: any) {
    console.error("Error fetching roles:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/rbac/roles - Creare rol nou
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    // Verifică permisiunea
    const canManage = await hasPermission(session.user.id, "admin.roles");
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isSuperAdmin: true },
    });

    if (!canManage && !user?.isSuperAdmin) {
      return NextResponse.json({ error: "Nu ai permisiunea de a gestiona roluri" }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, color, permissionIds } = body;

    if (!name) {
      return NextResponse.json({ error: "Numele este obligatoriu" }, { status: 400 });
    }

    // Verifică dacă există deja
    const existing = await prisma.role.findUnique({ where: { name } });
    if (existing) {
      return NextResponse.json({ error: "Un rol cu acest nume există deja" }, { status: 400 });
    }

    // Creează rolul
    const role = await prisma.role.create({
      data: {
        name,
        description,
        color,
        isSystem: false,
      },
    });

    // Adaugă permisiunile
    if (permissionIds && permissionIds.length > 0) {
      await prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId: string) => ({
          roleId: role.id,
          permissionId,
        })),
      });
    }

    // Log audit
    await logAuditAction({
      userId: session.user.id,
      action: "role.create",
      entityType: "Role",
      entityId: role.id,
      newValue: { name, description, color, permissionIds },
    });

    // Returnează rolul cu permisiunile
    const createdRole = await prisma.role.findUnique({
      where: { id: role.id },
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { users: true, groups: true } },
      },
    });

    return NextResponse.json(createdRole);
  } catch (error: any) {
    console.error("Error creating role:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/rbac/roles - Actualizare rol
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    // Verifică permisiunea
    const canManage = await hasPermission(session.user.id, "admin.roles");
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isSuperAdmin: true },
    });

    if (!canManage && !user?.isSuperAdmin) {
      return NextResponse.json({ error: "Nu ai permisiunea de a gestiona roluri" }, { status: 403 });
    }

    const body = await request.json();
    const { id, name, description, color, permissionIds } = body;

    if (!id) {
      return NextResponse.json({ error: "ID-ul este obligatoriu" }, { status: 400 });
    }

    // Verifică dacă rolul există
    const existingRole = await prisma.role.findUnique({
      where: { id },
      include: { permissions: { include: { permission: true } } },
    });

    if (!existingRole) {
      return NextResponse.json({ error: "Rolul nu a fost găsit" }, { status: 404 });
    }

    // Verifică dacă e rol de sistem și nu poate fi modificat numele
    if (existingRole.isSystem && name !== existingRole.name) {
      return NextResponse.json({ error: "Nu poți schimba numele unui rol de sistem" }, { status: 400 });
    }

    // Actualizează rolul
    const role = await prisma.role.update({
      where: { id },
      data: {
        name,
        description,
        color,
      },
    });

    // Actualizează permisiunile
    if (permissionIds !== undefined) {
      // Șterge permisiunile vechi
      await prisma.rolePermission.deleteMany({ where: { roleId: id } });

      // Adaugă permisiunile noi
      if (permissionIds.length > 0) {
        await prisma.rolePermission.createMany({
          data: permissionIds.map((permissionId: string) => ({
            roleId: id,
            permissionId,
          })),
        });
      }
    }

    // Log audit
    await logAuditAction({
      userId: session.user.id,
      action: "role.update",
      entityType: "Role",
      entityId: id,
      oldValue: {
        name: existingRole.name,
        description: existingRole.description,
        permissions: existingRole.permissions.map(p => p.permission.code),
      },
      newValue: { name, description, color, permissionIds },
    });

    // Returnează rolul actualizat
    const updatedRole = await prisma.role.findUnique({
      where: { id },
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { users: true, groups: true } },
      },
    });

    return NextResponse.json(updatedRole);
  } catch (error: any) {
    console.error("Error updating role:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/rbac/roles - Ștergere rol
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    // Verifică permisiunea
    const canManage = await hasPermission(session.user.id, "admin.roles");
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isSuperAdmin: true },
    });

    if (!canManage && !user?.isSuperAdmin) {
      return NextResponse.json({ error: "Nu ai permisiunea de a gestiona roluri" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID-ul este obligatoriu" }, { status: 400 });
    }

    // Verifică dacă rolul există
    const role = await prisma.role.findUnique({
      where: { id },
      include: { _count: { select: { users: true, groups: true } } },
    });

    if (!role) {
      return NextResponse.json({ error: "Rolul nu a fost găsit" }, { status: 404 });
    }

    // Verifică dacă e rol de sistem
    if (role.isSystem) {
      return NextResponse.json({ error: "Nu poți șterge un rol de sistem" }, { status: 400 });
    }

    // Verifică dacă are utilizatori sau grupuri asignate
    if (role._count.users > 0 || role._count.groups > 0) {
      return NextResponse.json({ 
        error: "Nu poți șterge un rol care are utilizatori sau grupuri asignate. Elimină mai întâi asignările." 
      }, { status: 400 });
    }

    // Șterge rolul (permisiunile se șterg automat prin onDelete: Cascade)
    await prisma.role.delete({ where: { id } });

    // Log audit
    await logAuditAction({
      userId: session.user.id,
      action: "role.delete",
      entityType: "Role",
      entityId: id,
      oldValue: { name: role.name, description: role.description },
    });

    return NextResponse.json({ success: true, message: "Rol șters cu succes" });
  } catch (error: any) {
    console.error("Error deleting role:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
