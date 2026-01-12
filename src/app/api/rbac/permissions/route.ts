import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { PERMISSIONS, PERMISSION_CATEGORIES, hasPermission, seedPermissions, seedDefaultRoles } from "@/lib/permissions";

// GET /api/rbac/permissions - Lista permisiunilor
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    // Verifică permisiunea
    const canView = await hasPermission(session.user.id, "admin.permissions");
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isSuperAdmin: true },
    });

    if (!canView && !user?.isSuperAdmin) {
      return NextResponse.json({ error: "Acces interzis" }, { status: 403 });
    }

    // Obține permisiunile din baza de date
    const permissions = await prisma.permission.findMany({
      orderBy: { sortOrder: "asc" },
    });

    // Dacă nu există permisiuni, le seed-uim
    if (permissions.length === 0) {
      await seedPermissions();
      await seedDefaultRoles();
      
      const newPermissions = await prisma.permission.findMany({
        orderBy: { sortOrder: "asc" },
      });
      
      return NextResponse.json({
        permissions: newPermissions,
        categories: PERMISSION_CATEGORIES,
        seeded: true,
      });
    }

    return NextResponse.json({
      permissions,
      categories: PERMISSION_CATEGORIES,
    });
  } catch (error: any) {
    console.error("Error fetching permissions:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/rbac/permissions/seed - Seed permisiuni și roluri
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    // Doar SuperAdmin poate face seed
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isSuperAdmin: true },
    });

    if (!user?.isSuperAdmin) {
      return NextResponse.json({ error: "Doar SuperAdmin poate face seed" }, { status: 403 });
    }

    await seedPermissions();
    await seedDefaultRoles();

    return NextResponse.json({
      success: true,
      message: "Permisiuni și roluri seed-uite cu succes",
    });
  } catch (error: any) {
    console.error("Error seeding permissions:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
