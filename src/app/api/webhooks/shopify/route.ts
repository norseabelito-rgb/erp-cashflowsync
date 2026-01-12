import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/db";
import { syncSingleOrder } from "@/lib/shopify";

// Verifică semnătura HMAC a webhook-ului
function verifyWebhook(body: string, hmacHeader: string, secret: string): boolean {
  const generatedHash = crypto
    .createHmac("sha256", secret)
    .update(body, "utf8")
    .digest("base64");
  return crypto.timingSafeEqual(
    Buffer.from(generatedHash),
    Buffer.from(hmacHeader)
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const hmac = request.headers.get("x-shopify-hmac-sha256");
    const topic = request.headers.get("x-shopify-topic");
    const shopDomain = request.headers.get("x-shopify-shop-domain");

    if (!hmac || !topic || !shopDomain) {
      return NextResponse.json(
        { error: "Missing required headers" },
        { status: 400 }
      );
    }

    // Găsim magazinul
    const store = await prisma.store.findFirst({
      where: { shopifyDomain: shopDomain },
    });

    if (!store) {
      console.log(`Store not found for domain: ${shopDomain}`);
      return NextResponse.json(
        { error: "Store not found" },
        { status: 404 }
      );
    }

    // Verificăm semnătura dacă avem secret
    if (store.webhookSecret) {
      const isValid = verifyWebhook(body, hmac, store.webhookSecret);
      if (!isValid) {
        console.log("Invalid webhook signature");
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 }
        );
      }
    }

    const data = JSON.parse(body);

    // Procesăm în funcție de topic
    switch (topic) {
      case "orders/create":
      case "orders/updated":
        await syncSingleOrder(data, store.id);
        break;

      case "orders/cancelled":
        await prisma.order.updateMany({
          where: {
            shopifyOrderId: String(data.id),
            storeId: store.id,
          },
          data: { status: "CANCELLED" },
        });
        break;

      default:
        console.log(`Unhandled webhook topic: ${topic}`);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
