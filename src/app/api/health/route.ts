import { NextResponse } from "next/server";
import prisma from "@/lib/db";

// GET /api/health - Health check endpoint for Railway
export async function GET() {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      database: "connected",
    });
  } catch (error: any) {
    // Return 503 if database is not connected
    return NextResponse.json(
      {
        status: "error",
        timestamp: new Date().toISOString(),
        database: "disconnected",
        error: error.message,
      },
      { status: 503 }
    );
  }
}
