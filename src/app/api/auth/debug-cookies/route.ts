import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { cookies } from "next/headers";

// GET /api/auth/debug-cookies - Debug cookies and session
export async function GET(request: NextRequest) {
  try {
    // Get all cookies
    const cookieStore = cookies();
    const allCookies = cookieStore.getAll();
    
    // Get session
    const session = await getServerSession(authOptions);
    
    // Get request cookies
    const requestCookies = request.cookies.getAll();
    
    // Check for session token
    const sessionToken = cookieStore.get("next-auth.session-token") 
      || cookieStore.get("__Secure-next-auth.session-token");
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      nextAuthUrl: process.env.NEXTAUTH_URL,
      session: session ? {
        userId: session.user?.id,
        email: session.user?.email,
        isSuperAdmin: session.user?.isSuperAdmin,
      } : null,
      cookies: {
        fromCookieStore: allCookies.map(c => ({ name: c.name, valueLength: c.value?.length || 0 })),
        fromRequest: requestCookies.map(c => ({ name: c.name, valueLength: c.value?.length || 0 })),
        sessionToken: sessionToken ? {
          name: sessionToken.name,
          valueLength: sessionToken.value?.length || 0,
        } : null,
      },
      headers: {
        host: request.headers.get("host"),
        cookie: request.headers.get("cookie")?.substring(0, 200) + "...",
      },
    });
  } catch (error: any) {
    console.error("Cookie debug error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
