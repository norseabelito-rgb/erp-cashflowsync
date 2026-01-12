import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import bcrypt from "bcryptjs";

// GET /api/user/profile - Obține profilul utilizatorului curent
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        isSuperAdmin: true,
        isActive: true,
        createdAt: true,
        emailVerified: true,
        roles: {
          include: {
            role: {
              select: { id: true, name: true, color: true },
            },
          },
        },
        groups: {
          include: {
            group: {
              select: { id: true, name: true, color: true },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Utilizator negăsit" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error: any) {
    console.error("Error fetching profile:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/user/profile - Actualizează profilul
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const body = await request.json();
    const { name, currentPassword, newPassword } = body;

    const updateData: any = {};

    // Actualizare nume
    if (name !== undefined) {
      if (!name.trim()) {
        return NextResponse.json({ error: "Numele este obligatoriu" }, { status: 400 });
      }
      updateData.name = name.trim();
    }

    // Schimbare parolă
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json({ error: "Parola curentă este obligatorie" }, { status: 400 });
      }

      if (newPassword.length < 8) {
        return NextResponse.json({ error: "Parola nouă trebuie să aibă cel puțin 8 caractere" }, { status: 400 });
      }

      // Verifică parola curentă
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { password: true },
      });

      if (!user?.password) {
        return NextResponse.json({ error: "Contul folosește autentificarea cu Google" }, { status: 400 });
      }

      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) {
        return NextResponse.json({ error: "Parola curentă este incorectă" }, { status: 400 });
      }

      updateData.password = await bcrypt.hash(newPassword, 12);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "Nu există date de actualizat" }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
    });

    return NextResponse.json({ 
      success: true, 
      user: updatedUser,
      message: newPassword ? "Profil și parolă actualizate" : "Profil actualizat" 
    });
  } catch (error: any) {
    console.error("Error updating profile:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
