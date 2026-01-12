import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
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
  ],
};
