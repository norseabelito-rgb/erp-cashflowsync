"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  FileText,
  Truck,
  Settings,
  DollarSign,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Package,
  History,
  Activity,
  ChevronUp,
  Zap,
  FolderTree,
  Warehouse,
  ShoppingBag,
  ClipboardList,
  Globe,
  ScrollText,
  BoxesIcon,
  Shield,
  Users,
  UserCog,
  Key,
  Printer,
  AlertTriangle,
  Beaker,
  ChefHat,
  PackageCheck,
  PackageX,
  Megaphone,
  BarChart3,
  Bell,
  Plug,
  BookOpen,
  Menu,
  X,
  Building2,
  FileBarChart,
  Wrench,
  ArrowDownUp,
  Link2,
  ArrowLeftRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useState, useEffect, useMemo } from "react";
import { toast } from "@/hooks/use-toast";
import { UserMenu } from "@/components/user-menu";
import { usePermissions } from "@/hooks/use-permissions";

// Tip pentru item de navigație
interface NavItem {
  name: string;
  href?: string;
  icon: React.ElementType;
  permissions?: string[]; // Permisiuni necesare (OR - oricare e suficientă)
  children?: {
    name: string;
    href: string;
    icon: React.ElementType;
    permissions?: string[];
  }[];
}

// =====================================================
// MENIU ORGANIZAT PE FLUX OPERAȚIONAL
// Vânzări → Catalog & Inventar → Logistică →
// Marketplace & Ads → Monitorizare → Sistem
// =====================================================

const navigation: NavItem[] = [
  // ─────────────────────────────────────────────────────
  // 📊 VÂNZĂRI - Procesul principal de vânzare
  // ─────────────────────────────────────────────────────
  {
    name: "Vânzări",
    icon: ShoppingCart,
    permissions: ["orders.view", "invoices.view", "tasks.view"],
    children: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { name: "Comenzi", href: "/orders", icon: ShoppingCart, permissions: ["orders.view"] },
      { name: "Facturi", href: "/invoices", icon: FileText, permissions: ["invoices.view"] },
      { name: "Facturi Eșuate", href: "/invoices/failed", icon: AlertTriangle, permissions: ["invoices.view"] },
      { name: "Task-uri", href: "/tasks", icon: ClipboardList, permissions: ["tasks.view"] },
    ],
  },

  // ─────────────────────────────────────────────────────
  // 📦 CATALOG & INVENTAR - Produse și stocuri
  // ─────────────────────────────────────────────────────
  {
    name: "Catalog",
    icon: Package,
    permissions: ["products.view", "categories.view"],
    children: [
      { name: "Produse", href: "/products", icon: Package, permissions: ["products.view"] },
      { name: "Categorii", href: "/categories", icon: FolderTree, permissions: ["categories.view"] },
      { name: "Mapare Stocuri", href: "/products/inventory-mapping", icon: Link2, permissions: ["products.edit"] },
    ],
  },
  {
    name: "Inventar",
    icon: Warehouse,
    permissions: ["inventory.view", "transfers.view"],
    children: [
      { name: "Stocuri", href: "/inventory", icon: Package, permissions: ["inventory.view"] },
      { name: "Transferuri", href: "/inventory/transfers", icon: ArrowLeftRight, permissions: ["transfers.view"] },
      { name: "Recepții (NIR)", href: "/inventory/receipts", icon: ClipboardList, permissions: ["inventory.view"] },
      { name: "Mișcări", href: "/inventory/movements", icon: ArrowDownUp, permissions: ["inventory.view"] },
      { name: "Ajustări", href: "/inventory/movements/adjustments", icon: Wrench, permissions: ["inventory.edit"] },
      { name: "Raport stoc", href: "/inventory/reports/stock", icon: FileBarChart, permissions: ["inventory.view"] },
    ],
  },
  {
    name: "Producție",
    icon: Beaker,
    permissions: ["inventory.view"],
    children: [
      { name: "Rețetar", href: "/inventory/recipes", icon: ChefHat, permissions: ["inventory.view"] },
      { name: "Furnizori", href: "/inventory/suppliers", icon: Building2, permissions: ["inventory.view"] },
    ],
  },

  // ─────────────────────────────────────────────────────
  // 📮 LOGISTICĂ - Livrări și expediție
  // ─────────────────────────────────────────────────────
  {
    name: "Logistică",
    icon: Truck,
    permissions: ["awb.view", "picking.view", "handover.view"],
    children: [
      { name: "AWB-uri", href: "/tracking", icon: Truck, permissions: ["awb.view"] },
      { name: "Picking Lists", href: "/picking", icon: ClipboardList, permissions: ["picking.view"] },
      { name: "Predare Curier", href: "/handover", icon: PackageCheck, permissions: ["handover.view"] },
      { name: "Scanare Retururi", href: "/returns", icon: PackageX, permissions: ["handover.scan"] },
    ],
  },

  // ─────────────────────────────────────────────────────
  // 🌐 MARKETPLACE & ADS - Canale externe și publicitate
  // ─────────────────────────────────────────────────────
  {
    name: "Trendyol",
    icon: ShoppingBag,
    permissions: ["marketplace.view"],
    children: [
      { name: "Produse", href: "/trendyol", icon: Package, permissions: ["marketplace.view"] },
      { name: "Mapare Categorii", href: "/trendyol/mapping", icon: FolderTree, permissions: ["marketplace.view"] },
      { name: "Publicare", href: "/trendyol/publish", icon: Globe, permissions: ["marketplace.edit"] },
      { name: "Comenzi Detalii", href: "/trendyol/orders", icon: ShoppingCart, permissions: ["marketplace.view"] },
    ],
  },
  {
    name: "Marketing",
    icon: Megaphone,
    permissions: ["ads.view"],
    children: [
      { name: "Ads Dashboard", href: "/ads", icon: BarChart3, permissions: ["ads.view"] },
      { name: "Campanii", href: "/ads/campaigns", icon: Megaphone, permissions: ["ads.view"] },
      { name: "Per SKU", href: "/ads/products", icon: Package, permissions: ["ads.view"] },
      { name: "Pixeli", href: "/ads/pixels", icon: Zap, permissions: ["ads.view"] },
      { name: "Conturi Ads", href: "/ads/accounts", icon: Plug, permissions: ["ads.view"] },
      { name: "Alerte", href: "/ads/alerts", icon: Bell, permissions: ["ads.alerts"] },
    ],
  },

  // ─────────────────────────────────────────────────────
  // 📋 MONITORIZARE - Erori, log-uri și rapoarte
  // ─────────────────────────────────────────────────────
  {
    name: "Monitorizare",
    icon: Activity,
    permissions: ["processing.errors.view", "logs.sync", "logs.activity", "picking.logs", "intercompany.view"],
    children: [
      { name: "Erori Procesare", href: "/processing-errors", icon: AlertTriangle, permissions: ["processing.errors.view"] },
      { name: "Log Activitate", href: "/activity", icon: Activity, permissions: ["logs.activity"] },
      { name: "Istoric Sync", href: "/sync-history", icon: History, permissions: ["logs.sync"] },
      { name: "Log Picking", href: "/picking/logs", icon: ClipboardList, permissions: ["picking.logs"] },
      { name: "Decontări", href: "/intercompany", icon: ArrowLeftRight, permissions: ["intercompany.view"] },
    ],
  },

  // ─────────────────────────────────────────────────────
  // ⚙️ SISTEM - Configurare și administrare
  // ─────────────────────────────────────────────────────
  {
    name: "Sistem",
    icon: Settings,
    permissions: ["settings.view", "companies.view", "warehouses.view", "invoices.series", "printers.view", "users.view", "admin.roles", "admin.groups", "admin.audit"],
    children: [
      // Configurare
      { name: "Setări Generale", href: "/settings", icon: Settings, permissions: ["settings.view"] },
      { name: "Firme", href: "/settings/companies", icon: Building2, permissions: ["companies.view"] },
      { name: "Depozite", href: "/settings/warehouses", icon: Warehouse, permissions: ["warehouses.view"] },
      { name: "Serii Facturi", href: "/settings/invoice-series", icon: FileText, permissions: ["invoices.series"] },
      { name: "Imprimante", href: "/settings/printers", icon: Printer, permissions: ["printers.view"] },
      // Acces
      { name: "Utilizatori", href: "/settings/users", icon: Users, permissions: ["users.view"] },
      { name: "Roluri", href: "/settings/roles", icon: Shield, permissions: ["admin.roles"] },
      { name: "Grupuri", href: "/settings/groups", icon: UserCog, permissions: ["admin.groups"] },
      { name: "Audit Log", href: "/settings/audit", icon: ScrollText, permissions: ["admin.audit"] },
      // Documentație
      { name: "Documentație", href: "/docs", icon: BookOpen },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [openMenus, setOpenMenus] = useState<Set<string>>(new Set());
  const { hasAnyPermission, isSuperAdmin, isLoading } = usePermissions();

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Filtrăm navigația pe baza permisiunilor
  const filteredNavigation = useMemo(() => {
    if (isLoading) return [];
    
    return navigation
      .map((item) => {
        // Verificăm dacă utilizatorul are acces la item
        const hasItemAccess = isSuperAdmin || 
          !item.permissions || 
          item.permissions.length === 0 || 
          hasAnyPermission(...item.permissions);

        if (!hasItemAccess) return null;

        // Dacă are copii, filtrăm și copiii
        if (item.children) {
          const filteredChildren = item.children.filter((child) => {
            return isSuperAdmin || 
              !child.permissions || 
              child.permissions.length === 0 || 
              hasAnyPermission(...child.permissions);
          });

          // Dacă nu mai are copii după filtrare, nu afișăm item-ul
          if (filteredChildren.length === 0) return null;

          return { ...item, children: filteredChildren };
        }

        return item;
      })
      .filter((item): item is NavItem => item !== null);
  }, [isLoading, isSuperAdmin, hasAnyPermission]);

  // Auto-expand menu-ul care conține pagina curentă
  useEffect(() => {
    filteredNavigation.forEach((item) => {
      if (item.children) {
        const isChildActive = item.children.some((child) =>
          pathname.startsWith(child.href)
        );
        if (isChildActive) {
          setOpenMenus((prev) => new Set([...prev, item.name]));
        }
      }
    });
  }, [pathname, filteredNavigation]);

  const toggleMenu = (name: string) => {
    setOpenMenus((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(name)) {
        newSet.delete(name);
      } else {
        newSet.add(name);
      }
      return newSet;
    });
  };

  const handleFullSync = async () => {
    setSyncing("full");
    try {
      const response = await fetch("/api/sync/full", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = await response.json();

      if (data.success !== false) {
        toast({
          title: "✅ Sincronizare completă",
          description: `${data.stats?.ordersProcessed || 0} comenzi, ${data.stats?.awbsUpdated || 0} AWB-uri actualizate`,
        });
        router.push(`/sync-history`);
      } else {
        toast({
          title: "Eroare",
          description: data.error || "Sincronizarea a eșuat",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Eroare",
        description: error.message || "Eroare la sincronizare",
        variant: "destructive",
      });
    } finally {
      setSyncing(null);
    }
  };

  const handleAWBRefresh = async () => {
    setSyncing("awb");
    try {
      const response = await fetch("/api/awb/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        toast({
          title: "✅ Statusuri AWB actualizate",
          description: `${data.checked} verificate, ${data.statusChanges || 0} schimbări`,
        });
      } else {
        toast({
          title: "Eroare",
          description: data.error || "Actualizarea a eșuat",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Eroare",
        description: error.message || "Eroare la actualizare AWB",
        variant: "destructive",
      });
    } finally {
      setSyncing(null);
    }
  };

  const handleStockSync = async () => {
    setSyncing("stock");
    try {
      const response = await fetch("/api/stock/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        toast({
          title: "✅ Stocuri sincronizate",
          description: `${data.synced || 0} produse actualizate`,
        });
      } else {
        toast({
          title: "Eroare",
          description: data.error || "Sincronizarea stocurilor a eșuat",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Eroare",
        description: error.message || "Eroare la sincronizare stocuri",
        variant: "destructive",
      });
    } finally {
      setSyncing(null);
    }
  };

  // Render item simplu (fără submeniu)
  const renderSimpleItem = (item: NavItem) => {
    const isActive = item.href && pathname.startsWith(item.href);
    return (
      <Link
        key={item.name}
        href={item.href!}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
          isActive
            ? "bg-primary/10 text-primary shadow-sm"
            : "text-muted-foreground hover:bg-accent hover:text-foreground",
          collapsed && "justify-center px-2"
        )}
      >
        <item.icon className={cn("h-5 w-5 shrink-0", isActive && "text-primary")} />
        {!collapsed && <span>{item.name}</span>}
      </Link>
    );
  };

  // Render item cu submeniu
  const renderCollapsibleItem = (item: NavItem) => {
    const isOpen = openMenus.has(item.name);
    const hasActiveChild = item.children?.some((child) =>
      pathname.startsWith(child.href)
    );

    if (collapsed) {
      // În mod collapsed, arătăm dropdown
      return (
        <DropdownMenu key={item.name}>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "flex w-full items-center justify-center rounded-lg px-2 py-2.5 text-sm font-medium transition-all duration-200",
                hasActiveChild
                  ? "bg-primary/10 text-primary shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5", hasActiveChild && "text-primary")} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="start" className="w-48">
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
              {item.name}
            </div>
            <DropdownMenuSeparator />
            {item.children?.map((child) => {
              const isChildActive = pathname.startsWith(child.href);
              return (
                <DropdownMenuItem key={child.href} asChild>
                  <Link
                    href={child.href}
                    className={cn(
                      "flex items-center gap-2",
                      isChildActive && "bg-accent"
                    )}
                  >
                    <child.icon className="h-4 w-4" />
                    {child.name}
                  </Link>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    // În mod expanded, arătăm collapsible
    return (
      <Collapsible
        key={item.name}
        open={isOpen}
        onOpenChange={() => toggleMenu(item.name)}
      >
        <CollapsibleTrigger asChild>
          <button
            className={cn(
              "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
              hasActiveChild
                ? "bg-primary/10 text-primary shadow-sm"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <span className="flex items-center gap-3">
              <item.icon className={cn("h-5 w-5 shrink-0", hasActiveChild && "text-primary")} />
              <span>{item.name}</span>
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform duration-200",
                isOpen && "rotate-180"
              )}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
          <div className="ml-4 mt-1 space-y-1 border-l border-border/50 pl-4">
            {item.children?.map((child) => {
              const isChildActive = pathname.startsWith(child.href);
              return (
                <Link
                  key={child.href}
                  href={child.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                    isChildActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <child.icon className={cn("h-4 w-4 shrink-0", isChildActive && "text-primary")} />
                  <span>{child.name}</span>
                </Link>
              );
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <>
      {/* Mobile Header Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-4 bg-card/95 backdrop-blur-xl border-b border-border/50">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80">
            <DollarSign className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-semibold text-gradient">Cash Flow</span>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="lg:hidden"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-border/50 bg-card/95 backdrop-blur-xl transition-all duration-300",
          // Desktop
          "hidden lg:flex",
          collapsed ? "lg:w-[70px]" : "lg:w-[260px]"
        )}
      >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-border/50 px-4">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80">
              <DollarSign className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-semibold text-gradient">Cash Flow Grup</span>
          </Link>
        )}
        {collapsed && (
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80 mx-auto">
            <DollarSign className="h-5 w-5 text-white" />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {filteredNavigation.map((item) =>
          item.children ? renderCollapsibleItem(item) : renderSimpleItem(item)
        )}
      </nav>

      {/* User Menu */}
      <div className="border-t border-border/50 p-3">
        <UserMenu collapsed={collapsed} />
      </div>

      {/* Sync Buttons */}
      <div className="border-t border-border/50 p-3 space-y-2">
        {collapsed ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className={cn("w-full", syncing && "animate-pulse bg-status-info/10")}
                disabled={syncing !== null}
              >
                <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="end">
              <DropdownMenuItem onClick={handleFullSync} disabled={syncing !== null}>
                <Zap className="h-4 w-4 mr-2" />
                Sincronizare completă
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleAWBRefresh} disabled={syncing !== null}>
                <Truck className="h-4 w-4 mr-2" />
                Actualizează AWB-uri
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleStockSync} disabled={syncing !== null}>
                <Package className="h-4 w-4 mr-2" />
                Sincronizează stocuri
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className={cn("w-full justify-between", syncing && "animate-pulse bg-status-info/10")}
                disabled={syncing !== null}
              >
                <span className="flex items-center gap-2">
                  <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
                  {syncing === "full"
                    ? "Sincronizare..."
                    : syncing === "awb"
                      ? "Actualizare AWB..."
                      : syncing === "stock"
                        ? "Sincronizare stocuri..."
                        : "Sincronizare"}
                </span>
                <ChevronUp className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[236px]" align="start">
              <DropdownMenuItem onClick={handleFullSync} disabled={syncing !== null}>
                <Zap className="h-4 w-4 mr-2 text-status-info" />
                <div className="flex flex-col">
                  <span className="font-medium">Sincronizare completă</span>
                  <span className="text-xs text-muted-foreground">Comenzi + AWB + Facturi</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleAWBRefresh} disabled={syncing !== null}>
                <Truck className="h-4 w-4 mr-2 text-status-warning" />
                <div className="flex flex-col">
                  <span className="font-medium">Actualizează AWB-uri</span>
                  <span className="text-xs text-muted-foreground">Statusuri din FanCourier</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleStockSync} disabled={syncing !== null}>
                <Package className="h-4 w-4 mr-2 text-status-success" />
                <div className="flex flex-col">
                  <span className="font-medium">Sincronizează stocuri</span>
                  <span className="text-xs text-muted-foreground">Din inventar local</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Collapse Button - Desktop only */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 hidden lg:flex h-6 w-6 items-center justify-center rounded-full border bg-background shadow-sm hover:bg-accent transition-colors"
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </button>
    </aside>

    {/* Mobile Sidebar */}
    <aside
      className={cn(
        "lg:hidden fixed left-0 top-16 z-50 flex h-[calc(100vh-4rem)] flex-col border-r border-border/50 bg-card/95 backdrop-blur-xl transition-all duration-300 w-[280px]",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}
    >
      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {filteredNavigation.map((item) =>
          item.children ? renderCollapsibleItem(item) : renderSimpleItem(item)
        )}
      </nav>

      {/* User & Actions */}
      <div className="border-t border-border/50 p-4 space-y-3">
        <UserMenu collapsed={false} />
        
        {/* Quick Sync */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className={cn("w-full justify-between", syncing && "animate-pulse bg-status-info/10")}
              disabled={syncing !== null}
            >
              <span className="flex items-center gap-2">
                <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
                {syncing ? "Sincronizare..." : "Sincronizare"}
              </span>
              <ChevronUp className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[250px]" align="start">
            <DropdownMenuItem onClick={handleFullSync} disabled={syncing !== null}>
              <Zap className="h-4 w-4 mr-2 text-status-info" />
              Sincronizare completă
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleAWBRefresh} disabled={syncing !== null}>
              <Truck className="h-4 w-4 mr-2 text-status-warning" />
              Actualizează AWB-uri
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleStockSync} disabled={syncing !== null}>
              <Package className="h-4 w-4 mr-2 text-status-success" />
              Sincronizează stocuri
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
    </>
  );
}
