"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { usePermissions, getRequiredPermissions } from "@/hooks/use-permissions";
import { Loader2 } from "lucide-react";

interface RouteGuardProps {
  children: React.ReactNode;
}

export function RouteGuard({ children }: RouteGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const { hasAnyPermission, isLoading, isSuperAdmin, permissions } = usePermissions();
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Verifică mai întâi sesiunea
    if (sessionStatus === "loading") {
      setChecking(true);
      return;
    }

    // Dacă nu există sesiune, redirect la login
    if (sessionStatus === "unauthenticated" || !session) {
      router.replace("/login?expired=true");
      return;
    }

    // Așteptăm să se încarce permisiunile
    if (isLoading) {
      setChecking(true);
      return;
    }

    // SuperAdmin are acces la tot
    if (isSuperAdmin) {
      setAuthorized(true);
      setChecking(false);
      return;
    }

    // Verificăm permisiunile pentru ruta curentă
    const requiredPermissions = getRequiredPermissions(pathname);
    
    // Dacă nu sunt necesare permisiuni, permite accesul
    if (requiredPermissions.length === 0) {
      setAuthorized(true);
      setChecking(false);
      return;
    }

    // Verificăm dacă are cel puțin una din permisiunile necesare
    const hasAccess = hasAnyPermission(...requiredPermissions);
    
    if (!hasAccess) {
      // Redirect la 403
      router.replace("/403");
      return;
    }

    setAuthorized(true);
    setChecking(false);
  }, [pathname, sessionStatus, session, isLoading, isSuperAdmin, permissions, hasAnyPermission, router]);

  // Afișăm loading în timp ce verificăm
  if (sessionStatus === "loading" || isLoading || checking) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Dacă nu e autorizat, nu afișăm nimic (se va face redirect)
  if (!authorized) {
    return null;
  }

  return <>{children}</>;
}
