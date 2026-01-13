import { NextResponse } from "next/server";

// GET /api/health - Simple health check endpoint for Railway
// Does not check database to ensure fast response for healthchecks
export async function GET() {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
}
