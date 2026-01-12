import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";

// GET /api/user/preferences - Obține preferințele utilizatorului curent
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { preferences: true },
    });

    return NextResponse.json({ 
      preferences: user?.preferences || null 
    });
  } catch (error: any) {
    console.error("Error fetching preferences:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/user/preferences - Actualizează preferințele
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const body = await request.json();
    const { preferences } = body;

    if (!preferences) {
      return NextResponse.json({ error: "Preferințele sunt obligatorii" }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: { preferences },
      select: { preferences: true },
    });

    return NextResponse.json({ 
      success: true, 
      preferences: updatedUser.preferences 
    });
  } catch (error: any) {
    console.error("Error updating preferences:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
