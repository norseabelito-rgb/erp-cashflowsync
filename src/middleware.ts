import { withAuth } from "next-auth/middleware";
import { NextResponse, NextRequest } from "next/server";
import type { NextRequestWithAuth } from "next-auth/middleware";

// Embed routes middleware - handles iframe domain verification
function handleEmbedRequest(req: NextRequest) {
  const allowedDomains = process.env.EMBED_ALLOWED_DOMAINS?.split(",").map(d => d.trim()) || [];

  // Check Origin or Referer header
  const origin = req.headers.get("origin") || "";
  const referer = req.headers.get("referer") || "";

  // For direct navigation (no origin), check referer
  const requestOrigin = origin || (referer ? new URL(referer).origin : "");

  // Allow if from whitelisted domain OR if no domain configured (testing) OR direct access
  const isAllowed =
    allowedDomains.length === 0 || // No whitelist = allow all (for testing)
    !requestOrigin || // Direct browser access
    allowedDomains.some(domain => requestOrigin.startsWith(domain));

  if (!isAllowed) {
    return new NextResponse("Access denied: Domain not whitelisted", { status: 403 });
  }

  // Set headers for iframe embedding
  const response = NextResponse.next();

  // Build frame-ancestors CSP
  const frameAncestors = allowedDomains.length > 0
    ? `frame-ancestors 'self' ${allowedDomains.join(" ")}`
    : "frame-ancestors *"; // Allow all if no whitelist (testing)

  response.headers.set("Content-Security-Policy", frameAncestors);
  // X-Frame-Options is deprecated but set for older browsers
  response.headers.delete("X-Frame-Options");

  return response;
}

// Check if request is for embed functionality
function isEmbedRoute(pathname: string) {
  return pathname.startsWith("/customers/embed");
}

// Main middleware export
export default withAuth(
  function middleware(req: NextRequestWithAuth) {
    // Handle embed routes (this shouldn't match due to config, but as fallback)
    if (isEmbedRoute(req.nextUrl.pathname)) {
      return handleEmbedRequest(req);
    }

    const token = req.nextauth.token;

    // Dacă nu există token, redirect la login cu parametru expired
    if (!token) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('expired', 'true');
      loginUrl.searchParams.set('callbackUrl', req.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Verifică dacă token-ul are data de expirare și a expirat
    if (token.exp && typeof token.exp === 'number') {
      const now = Math.floor(Date.now() / 1000);
      if (token.exp < now) {
        const loginUrl = new URL('/login', req.url);
        loginUrl.searchParams.set('expired', 'true');
        loginUrl.searchParams.set('callbackUrl', req.nextUrl.pathname);
        return NextResponse.redirect(loginUrl);
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Permite accesul doar dacă există un token valid
        if (!token) {
          return false;
        }
        return true;
      },
    },
    pages: {
      signIn: '/login',
    },
  }
);

// Protejează toate rutele din dashboard
// NOTA: /customers/embed NU este inclus - accesibil fara auth
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/orders/:path*",
    "/products/:path*",
    "/categories/:path*",
    "/inventory/:path*",
    "/trendyol/:path*",
    "/invoices/:path*",
    "/tracking/:path*",
    "/picking/:path*",
    "/handover/:path*",
    "/sync-history/:path*",
    "/activity/:path*",
    "/settings/:path*",
    "/stores/:path*",
    "/ads/:path*",
    "/docs/:path*",
    "/profile/:path*",
    "/preferences/:path*",
    "/notifications/:path*",
    "/processing-errors/:path*",
    "/tasks/:path*",
  ],
};
