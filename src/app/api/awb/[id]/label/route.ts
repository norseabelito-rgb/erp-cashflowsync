import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { createFanCourierClient } from "@/lib/fancourier";
import { hasPermission } from "@/lib/permissions";

// GET - Obține eticheta PDF a unui AWB
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Trebuie să fii autentificat" },
        { status: 401 }
      );
    }

    const canView = await hasPermission(session.user.id, "awb.view");
    if (!canView) {
      return NextResponse.json(
        { success: false, error: "Nu ai permisiunea de a vizualiza AWB-uri" },
        { status: 403 }
      );
    }

    const awb = await prisma.aWB.findUnique({
      where: { id: params.id },
      include: {
        order: {
          include: {
            store: true,
          },
        },
      },
    });

    if (!awb) {
      return NextResponse.json(
        { success: false, error: "AWB-ul nu a fost găsit" },
        { status: 404 }
      );
    }

    if (!awb.awbNumber) {
      return NextResponse.json(
        { success: false, error: "AWB-ul nu are număr valid" },
        { status: 400 }
      );
    }

    const fancourier = await createFanCourierClient();
    const pdfBuffer = await fancourier.printAWB(awb.awbNumber, { format: "A6", type: 1 });

    if (!pdfBuffer) {
      return NextResponse.json(
        { success: false, error: "Nu s-a putut genera eticheta AWB" },
        { status: 500 }
      );
    }

    const pdf = pdfBuffer.toString("base64");

    return NextResponse.json({ success: true, pdf, format: "A6" });
  } catch (error: any) {
    console.error("Error fetching AWB label:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
