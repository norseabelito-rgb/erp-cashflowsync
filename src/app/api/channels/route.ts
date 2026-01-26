import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

export const dynamic = 'force-dynamic';

// GET - Lista canalelor (cu auto-sync pentru Store-uri Shopify noi)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canView = await hasPermission(session.user.id, "products.view");
    if (!canView) {
      return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
    }

    // Auto-sync: creează canale pentru Store-uri Shopify active care nu au canal
    const storesWithoutChannel = await prisma.store.findMany({
      where: {
        channel: null,
        isActive: true,
      }
    });

    if (storesWithoutChannel.length > 0) {
      for (const store of storesWithoutChannel) {
        try {
          await prisma.channel.create({
            data: {
              name: store.name,
              type: "SHOPIFY",
              storeId: store.id,
              isActive: true,
            }
          });
          console.log(`Auto-created channel for store: ${store.name}`);
        } catch (err) {
          // Ignoră erori de duplicat (race condition)
          console.warn(`Could not create channel for store ${store.name}:`, err);
        }
      }
    }

    const channels = await prisma.channel.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        store: {
          select: {
            id: true,
            name: true,
            shopifyDomain: true,
            isActive: true,
          }
        },
        _count: {
          select: { products: true }
        }
      }
    });

    return NextResponse.json({ success: true, channels });
  } catch (error: any) {
    console.error("Error fetching channels:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Sincronizează canale cu Store-urile existente
// Creează automat canale pentru Store-urile care nu au încă
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canEdit = await hasPermission(session.user.id, "products.edit");
    if (!canEdit) {
      return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
    }

    const body = await request.json();
    const { action } = body;

    if (action === "sync-stores") {
      // Obține toate Store-urile fără canal
      const storesWithoutChannel = await prisma.store.findMany({
        where: {
          channel: null,
          isActive: true,
        }
      });

      const createdChannels = [];

      for (const store of storesWithoutChannel) {
        const channel = await prisma.channel.create({
          data: {
            name: store.name,
            type: "SHOPIFY",
            storeId: store.id,
            isActive: true,
          },
          include: {
            store: {
              select: {
                id: true,
                name: true,
                shopifyDomain: true,
              }
            }
          }
        });
        createdChannels.push(channel);
      }

      return NextResponse.json({
        success: true,
        message: `${createdChannels.length} canale create`,
        channels: createdChannels,
      });
    }

    // Creare canal manual (pentru eMAG, Temu, etc.)
    const { name, type } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, error: "Numele canalului este obligatoriu" },
        { status: 400 }
      );
    }

    if (!type || !["SHOPIFY", "EMAG", "TEMU", "TRENDYOL"].includes(type)) {
      return NextResponse.json(
        { success: false, error: "Tipul canalului este invalid" },
        { status: 400 }
      );
    }

    const channel = await prisma.channel.create({
      data: {
        name: name.trim(),
        type,
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      channel,
      message: "Canal creat cu succes",
    });
  } catch (error: any) {
    console.error("Error creating channel:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT - Actualizează canal
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canEdit = await hasPermission(session.user.id, "products.edit");
    if (!canEdit) {
      return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
    }

    const body = await request.json();
    const { id, name, isActive, settings } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID-ul canalului este obligatoriu" },
        { status: 400 }
      );
    }

    const channel = await prisma.channel.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(isActive !== undefined && { isActive }),
        ...(settings !== undefined && { settings }),
      },
      include: {
        store: {
          select: {
            id: true,
            name: true,
            shopifyDomain: true,
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      channel,
      message: "Canal actualizat cu succes",
    });
  } catch (error: any) {
    console.error("Error updating channel:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Șterge canal (doar cele non-Shopify)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canEdit = await hasPermission(session.user.id, "products.edit");
    if (!canEdit) {
      return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID-ul canalului este obligatoriu" },
        { status: 400 }
      );
    }

    const channel = await prisma.channel.findUnique({
      where: { id },
      include: {
        _count: { select: { products: true } }
      }
    });

    if (!channel) {
      return NextResponse.json(
        { success: false, error: "Canalul nu există" },
        { status: 404 }
      );
    }

    if (channel.storeId) {
      return NextResponse.json(
        { success: false, error: "Nu poți șterge un canal Shopify. Șterge magazinul din Setări." },
        { status: 400 }
      );
    }

    // Șterge mai întâi asocierile cu produsele
    await prisma.masterProductChannel.deleteMany({
      where: { channelId: id }
    });

    await prisma.channel.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Canal șters cu succes",
    });
  } catch (error: any) {
    console.error("Error deleting channel:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
