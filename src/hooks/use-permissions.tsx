"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useSession } from "next-auth/react";

interface PermissionsContextType {
  permissions: Set<string>;
  isSuperAdmin: boolean;
  isLoading: boolean;
  hasPermission: (code: string) => boolean;
  hasAnyPermission: (...codes: string[]) => boolean;
  hasAllPermissions: (...codes: string[]) => boolean;
  refetch: () => Promise<void>;
}

const PermissionsContext = createContext<PermissionsContextType>({
  permissions: new Set(),
  isSuperAdmin: false,
  isLoading: true,
  hasPermission: () => false,
  hasAnyPermission: () => false,
  hasAllPermissions: () => false,
  refetch: async () => {},
});

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPermissions = async () => {
    if (!session?.user?.id) {
      setPermissions(new Set());
      setIsSuperAdmin(false);
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/rbac/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "getMyPermissions" }),
      });

      if (res.ok) {
        const data = await res.json();
        setPermissions(new Set(data.permissions));
        setIsSuperAdmin(data.isSuperAdmin);
      }
    } catch (error) {
      console.error("Error fetching permissions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      fetchPermissions();
    } else if (status === "unauthenticated") {
      setPermissions(new Set());
      setIsSuperAdmin(false);
      setIsLoading(false);
    }
  }, [session, status]);

  const hasPermission = (code: string): boolean => {
    if (isSuperAdmin) return true;
    return permissions.has(code);
  };

  const hasAnyPermission = (...codes: string[]): boolean => {
    if (isSuperAdmin) return true;
    return codes.some((code) => permissions.has(code));
  };

  const hasAllPermissions = (...codes: string[]): boolean => {
    if (isSuperAdmin) return true;
    return codes.every((code) => permissions.has(code));
  };

  return (
    <PermissionsContext.Provider
      value={{
        permissions,
        isSuperAdmin,
        isLoading,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        refetch: fetchPermissions,
      }}
    >
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  return useContext(PermissionsContext);
}

// Component pentru a afișa conținut condiționat
interface RequirePermissionProps {
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  fallback?: ReactNode;
  children: ReactNode;
}

export function RequirePermission({
  permission,
  permissions,
  requireAll = false,
  fallback = null,
  children,
}: RequirePermissionProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, isLoading, isSuperAdmin } =
    usePermissions();

  if (isLoading) {
    return null;
  }

  if (isSuperAdmin) {
    return <>{children}</>;
  }

  if (permission) {
    return hasPermission(permission) ? <>{children}</> : <>{fallback}</>;
  }

  if (permissions) {
    const hasAccess = requireAll
      ? hasAllPermissions(...permissions)
      : hasAnyPermission(...permissions);
    return hasAccess ? <>{children}</> : <>{fallback}</>;
  }

  return <>{children}</>;
}

// Mapare rute -> permisiuni necesare
export const ROUTE_PERMISSIONS: Record<string, string[]> = {
  // Dashboard - toți au acces
  "/": [],
  "/dashboard": [],
  
  // Comenzi
  "/orders": ["orders.view"],
  
  // Produse
  "/products": ["products.view"],
  "/products/categories": ["categories.view"],
  
  // Facturi
  "/invoices": ["invoices.view"],
  
  // AWB
  "/awb": ["awb.view"],
  
  // Picking
  "/picking": ["picking.view"],
  "/picking/create": ["picking.create"],
  
  // Inventar
  "/inventory": ["inventory.view"],
  
  // Marketplace
  "/marketplace": ["marketplace.view"],
  "/marketplace/trendyol": ["marketplace.view"],
  
  // Rapoarte
  "/reports": ["reports.view"],
  
  // Setări
  "/settings": ["settings.view"],
  "/settings/invoice-series": ["invoices.series"],
  "/settings/printers": ["printers.view"],
  "/settings/users": ["users.view"],
  "/settings/roles": ["admin.roles"],
  "/settings/groups": ["admin.groups"],
  "/settings/audit": ["admin.audit"],
  
  // Erori procesare
  "/processing-errors": ["processing.errors.view"],
  
  // Picking logs
  "/picking/logs": ["picking.logs"],
  
  // Preferințe și profil - toți au acces
  "/preferences": [],
  "/profile": [],
};

// Funcție pentru a găsi permisiunile necesare pentru o rută
export function getRequiredPermissions(pathname: string): string[] {
  // Verificare exactă
  if (ROUTE_PERMISSIONS[pathname]) {
    return ROUTE_PERMISSIONS[pathname];
  }
  
  // Verificare cu wildcard (ex: /picking/[id] -> /picking)
  const segments = pathname.split("/").filter(Boolean);
  while (segments.length > 0) {
    const partialPath = "/" + segments.join("/");
    if (ROUTE_PERMISSIONS[partialPath]) {
      return ROUTE_PERMISSIONS[partialPath];
    }
    segments.pop();
  }
  
  // Default: nicio permisiune necesară
  return [];
}
