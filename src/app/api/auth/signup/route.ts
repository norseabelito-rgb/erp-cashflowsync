import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/db";
import { notifySuperAdmins } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password } = body;

    // Validări
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email și parola sunt obligatorii" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Parola trebuie să aibă cel puțin 8 caractere" },
        { status: 400 }
      );
    }

    // Verifică dacă utilizatorul există deja
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Un cont cu acest email există deja" },
        { status: 400 }
      );
    }

    // Hash-uiește parola
    const hashedPassword = await bcrypt.hash(password, 12);

    // Verifică dacă e primul utilizator (devine SuperAdmin)
    const userCount = await prisma.user.count();
    const isFirstUser = userCount === 0;

    // Creează utilizatorul
    const user = await prisma.user.create({
      data: {
        name: name || null,
        email: email.toLowerCase(),
        password: hashedPassword,
        isSuperAdmin: isFirstUser,
        emailVerified: new Date(), // Considerăm email-ul verificat pentru signup cu parolă
      },
    });

    // Notifică SuperAdmin-ii (dacă nu e primul utilizator)
    if (!isFirstUser) {
      await notifySuperAdmins({
        id: user.id,
        email: user.email,
        name: user.name,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Cont creat cu succes",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error: any) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Eroare la crearea contului" },
      { status: 500 }
    );
  }
}
