import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

/**
 * GET - Listează toate comentariile unui AWB
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificăm autentificarea
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Trebuie să fii autentificat" },
        { status: 401 }
      );
    }

    // Verificăm permisiunea de vizualizare AWB
    const canView = await hasPermission(session.user.id, "awb.view");
    if (!canView) {
      return NextResponse.json(
        { success: false, error: "Nu ai permisiunea de a vizualiza AWB-uri" },
        { status: 403 }
      );
    }

    // Verificăm că AWB-ul există
    const awb = await prisma.aWB.findUnique({
      where: { id: params.id },
      select: { id: true },
    });

    if (!awb) {
      return NextResponse.json(
        { success: false, error: "AWB-ul nu a fost găsit" },
        { status: 404 }
      );
    }

    // Obținem comentariile cu imaginile și user info
    const comments = await prisma.aWBComment.findMany({
      where: { awbId: params.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        images: {
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      comments,
    });
  } catch (error: any) {
    console.error("Error fetching AWB comments:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST - Adaugă un comentariu nou
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificăm autentificarea
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Trebuie să fii autentificat" },
        { status: 401 }
      );
    }

    // Verificăm permisiunea de editare AWB (pentru a adăuga comentarii)
    const canEdit = await hasPermission(session.user.id, "awb.edit");
    if (!canEdit) {
      return NextResponse.json(
        { success: false, error: "Nu ai permisiunea de a adăuga comentarii" },
        { status: 403 }
      );
    }

    // Verificăm că AWB-ul există
    const awb = await prisma.aWB.findUnique({
      where: { id: params.id },
      select: { id: true, awbNumber: true },
    });

    if (!awb) {
      return NextResponse.json(
        { success: false, error: "AWB-ul nu a fost găsit" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { content, imageIds } = body;

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Conținutul comentariului este obligatoriu" },
        { status: 400 }
      );
    }

    // Creăm comentariul
    const comment = await prisma.aWBComment.create({
      data: {
        awbId: params.id,
        userId: session.user.id,
        content: content.trim(),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        images: true,
      },
    });

    // Dacă avem imageIds, le legăm de comentariu
    if (imageIds && Array.isArray(imageIds) && imageIds.length > 0) {
      await prisma.aWBCommentImage.updateMany({
        where: {
          id: { in: imageIds },
          commentId: null, // Doar imaginile neîncă asociate
        },
        data: {
          commentId: comment.id,
        },
      });

      // Re-obținem comentariul cu imaginile
      const updatedComment = await prisma.aWBComment.findUnique({
        where: { id: comment.id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          images: true,
        },
      });

      return NextResponse.json({
        success: true,
        comment: updatedComment,
      });
    }

    return NextResponse.json({
      success: true,
      comment,
    });
  } catch (error: any) {
    console.error("Error creating AWB comment:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
