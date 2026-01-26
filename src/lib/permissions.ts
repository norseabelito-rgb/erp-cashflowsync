import prisma from "@/lib/db";

// ==========================================
// DEFINIREA PERMISIUNILOR
// ==========================================

export interface PermissionDefinition {
  code: string;
  name: string;
  description: string;
  category: string;
  sortOrder: number;
}

// Lista completă de permisiuni
export const PERMISSIONS: PermissionDefinition[] = [
  // ==================== COMENZI ====================
  { code: "orders.view", name: "Vizualizare comenzi", description: "Poate vedea lista și detaliile comenzilor", category: "orders", sortOrder: 100 },
  { code: "orders.create", name: "Creare comenzi", description: "Poate crea comenzi manuale", category: "orders", sortOrder: 101 },
  { code: "orders.edit", name: "Editare comenzi", description: "Poate modifica comenzile existente", category: "orders", sortOrder: 102 },
  { code: "orders.delete", name: "Ștergere comenzi", description: "Poate șterge comenzi", category: "orders", sortOrder: 103 },
  { code: "orders.process", name: "Procesare comenzi", description: "Poate procesa comenzi (factură + AWB)", category: "orders", sortOrder: 104 },
  { code: "orders.export", name: "Export comenzi", description: "Poate exporta comenzile în diverse formate", category: "orders", sortOrder: 105 },
  { code: "orders.sync", name: "Sincronizare comenzi", description: "Poate sincroniza comenzile din Shopify", category: "orders", sortOrder: 106 },

  // ==================== PRODUSE ====================
  { code: "products.view", name: "Vizualizare produse", description: "Poate vedea lista și detaliile produselor", category: "products", sortOrder: 200 },
  { code: "products.create", name: "Adăugare produse", description: "Poate adăuga produse noi", category: "products", sortOrder: 201 },
  { code: "products.edit", name: "Editare produse", description: "Poate modifica produsele existente", category: "products", sortOrder: 202 },
  { code: "products.delete", name: "Ștergere produse", description: "Poate șterge produse", category: "products", sortOrder: 203 },
  { code: "products.sync", name: "Sincronizare produse", description: "Poate sincroniza produsele cu Shopify", category: "products", sortOrder: 204 },
  { code: "products.stock", name: "Modificare stoc", description: "Poate modifica stocul produselor", category: "products", sortOrder: 205 },
  { code: "products.prices", name: "Modificare prețuri", description: "Poate modifica prețurile produselor", category: "products", sortOrder: 206 },

  // ==================== CATEGORII ====================
  { code: "categories.view", name: "Vizualizare categorii", description: "Poate vedea categoriile", category: "categories", sortOrder: 250 },
  { code: "categories.manage", name: "Gestiune categorii", description: "Poate crea, edita și șterge categorii", category: "categories", sortOrder: 251 },

  // ==================== FACTURI ====================
  { code: "invoices.view", name: "Vizualizare facturi", description: "Poate vedea lista și detaliile facturilor", category: "invoices", sortOrder: 300 },
  { code: "invoices.create", name: "Emitere facturi", description: "Poate emite facturi noi", category: "invoices", sortOrder: 301 },
  { code: "invoices.cancel", name: "Anulare facturi", description: "Poate anula/storona facturi", category: "invoices", sortOrder: 302 },
  { code: "invoices.download", name: "Download facturi", description: "Poate descărca PDF-urile facturilor", category: "invoices", sortOrder: 303 },
  { code: "invoices.payment", name: "Înregistrare plăți", description: "Poate înregistra plățile pe facturi", category: "invoices", sortOrder: 304 },
  { code: "invoices.series", name: "Gestiune serii facturare", description: "Poate configura seriile de facturare pentru magazine", category: "invoices", sortOrder: 305 },

  // ==================== AWB ====================
  { code: "awb.view", name: "Vizualizare AWB", description: "Poate vedea lista și detaliile AWB-urilor", category: "awb", sortOrder: 400 },
  { code: "awb.create", name: "Generare AWB", description: "Poate genera AWB-uri noi", category: "awb", sortOrder: 401 },
  { code: "awb.print", name: "Printare AWB", description: "Poate printa AWB-uri", category: "awb", sortOrder: 402 },
  { code: "awb.delete", name: "Ștergere AWB", description: "Poate șterge AWB-uri", category: "awb", sortOrder: 403 },
  { code: "awb.track", name: "Tracking AWB", description: "Poate actualiza statusul AWB-urilor", category: "awb", sortOrder: 404 },

  // ==================== IMPRIMANTE ====================
  { code: "printers.view", name: "Vizualizare imprimante", description: "Poate vedea lista imprimantelor configurate", category: "printers", sortOrder: 450 },
  { code: "printers.create", name: "Adăugare imprimante", description: "Poate adăuga imprimante noi", category: "printers", sortOrder: 451 },
  { code: "printers.edit", name: "Editare imprimante", description: "Poate modifica setările imprimantelor", category: "printers", sortOrder: 452 },
  { code: "printers.delete", name: "Ștergere imprimante", description: "Poate șterge imprimante", category: "printers", sortOrder: 453 },

  // ==================== PICKING ====================
  { code: "picking.view", name: "Vizualizare picking", description: "Poate vedea listele de picking", category: "picking", sortOrder: 500 },
  { code: "picking.create", name: "Creare picking", description: "Poate crea liste de picking noi", category: "picking", sortOrder: 501 },
  { code: "picking.process", name: "Procesare picking", description: "Poate prelua și procesa picking", category: "picking", sortOrder: 502 },
  { code: "picking.complete", name: "Finalizare picking", description: "Poate finaliza listele de picking", category: "picking", sortOrder: 503 },
  { code: "picking.print", name: "Printare picking", description: "Poate printa listele de picking", category: "picking", sortOrder: 504 },
  { code: "picking.logs", name: "Vizualizare log-uri picking", description: "Poate vedea log-urile de activitate picking", category: "picking", sortOrder: 505 },

  // ==================== PREDARE CURIER (HANDOVER) ====================
  { code: "handover.view", name: "Vizualizare predare", description: "Poate vedea Lista 1 (Predare Azi) și Lista 2 (Nepredate)", category: "handover", sortOrder: 520 },
  { code: "handover.scan", name: "Scanare AWB", description: "Poate scana AWB-uri pentru predare către curier", category: "handover", sortOrder: 521 },
  { code: "handover.finalize", name: "Finalizare predare", description: "Poate finaliza și redeschide manual predarea zilei", category: "handover", sortOrder: 522 },
  { code: "handover.report", name: "Rapoarte predare", description: "Poate genera și exporta rapoarte de predare (PDF/Excel)", category: "handover", sortOrder: 523 },
  { code: "settings.handover", name: "Setări predare", description: "Poate modifica ora de finalizare automată a predării", category: "settings", sortOrder: 904 },

  // ==================== ERORI PROCESARE ====================
  { code: "processing.errors.view", name: "Vizualizare erori procesare", description: "Poate vedea erorile de procesare comenzi", category: "processing", sortOrder: 550 },
  { code: "processing.errors.retry", name: "Reîncercare procesare", description: "Poate reîncerca procesarea comenzilor cu erori", category: "processing", sortOrder: 551 },
  { code: "processing.errors.skip", name: "Sări erori", description: "Poate marca erorile ca sărite", category: "processing", sortOrder: 552 },

  // ==================== INVENTAR ====================
  { code: "inventory.view", name: "Vizualizare inventar", description: "Poate vedea stocurile", category: "inventory", sortOrder: 600 },
  { code: "inventory.adjust", name: "Ajustare stoc", description: "Poate face ajustări manuale de stoc", category: "inventory", sortOrder: 601 },
  { code: "inventory.sync", name: "Sincronizare stoc", description: "Poate sincroniza stocul cu sisteme externe", category: "inventory", sortOrder: 602 },

  // ==================== DEPOZITE ====================
  { code: "warehouses.view", name: "Vizualizare depozite", description: "Poate vedea lista depozitelor și stocurile per depozit", category: "warehouses", sortOrder: 620 },
  { code: "warehouses.create", name: "Creare depozite", description: "Poate crea depozite noi", category: "warehouses", sortOrder: 621 },
  { code: "warehouses.edit", name: "Editare depozite", description: "Poate modifica depozitele existente", category: "warehouses", sortOrder: 622 },
  { code: "warehouses.delete", name: "Ștergere depozite", description: "Poate șterge depozite goale", category: "warehouses", sortOrder: 623 },
  { code: "warehouses.set_primary", name: "Setare depozit principal", description: "Poate seta depozitul principal pentru comenzi", category: "warehouses", sortOrder: 624 },

  // ==================== TRANSFERURI ====================
  { code: "transfers.view", name: "Vizualizare transferuri", description: "Poate vedea transferurile între depozite", category: "transfers", sortOrder: 630 },
  { code: "transfers.create", name: "Creare transferuri", description: "Poate crea transferuri noi între depozite", category: "transfers", sortOrder: 631 },
  { code: "transfers.execute", name: "Execuție transferuri", description: "Poate executa/finaliza transferurile", category: "transfers", sortOrder: 632 },
  { code: "transfers.cancel", name: "Anulare transferuri", description: "Poate anula transferuri", category: "transfers", sortOrder: 633 },

  // ==================== MARKETPLACE ====================
  { code: "marketplace.view", name: "Vizualizare marketplace", description: "Poate vedea integrările marketplace", category: "marketplace", sortOrder: 700 },
  { code: "marketplace.manage", name: "Gestiune marketplace", description: "Poate configura și sincroniza marketplace-uri", category: "marketplace", sortOrder: 701 },
  { code: "marketplace.publish", name: "Publicare produse", description: "Poate publica produse pe marketplace-uri", category: "marketplace", sortOrder: 702 },

  // ==================== ADS (ADVERTISING) ====================
  { code: "ads.view", name: "Vizualizare ads", description: "Poate vedea campaniile și statisticile de advertising", category: "ads", sortOrder: 750 },
  { code: "ads.manage", name: "Gestiune campanii", description: "Poate porni/opri campanii și modifica bugete", category: "ads", sortOrder: 751 },
  { code: "ads.create", name: "Creare campanii", description: "Poate crea campanii noi în platformele de ads", category: "ads", sortOrder: 752 },
  { code: "ads.alerts", name: "Gestiune alerte", description: "Poate crea și modifica regulile de alertă automată", category: "ads", sortOrder: 753 },
  { code: "ads.accounts", name: "Gestiune conturi", description: "Poate conecta/deconecta conturi de advertising", category: "ads", sortOrder: 754 },

  // ==================== RAPOARTE ====================
  { code: "reports.view", name: "Vizualizare rapoarte", description: "Poate vedea rapoartele și statisticile", category: "reports", sortOrder: 800 },
  { code: "reports.export", name: "Export rapoarte", description: "Poate exporta rapoartele", category: "reports", sortOrder: 801 },

  // ==================== SETĂRI ====================
  { code: "settings.view", name: "Vizualizare setări", description: "Poate vedea setările sistemului", category: "settings", sortOrder: 900 },
  { code: "settings.edit", name: "Modificare setări", description: "Poate modifica setările sistemului", category: "settings", sortOrder: 901 },
  { code: "settings.integrations", name: "Gestiune integrări", description: "Poate configura integrările externe", category: "settings", sortOrder: 902 },
  { code: "settings.stores", name: "Gestiune magazine", description: "Poate adăuga și configura magazine Shopify", category: "settings", sortOrder: 903 },

  // ==================== UTILIZATORI ====================
  { code: "users.view", name: "Vizualizare utilizatori", description: "Poate vedea lista utilizatorilor", category: "users", sortOrder: 1000 },
  { code: "users.invite", name: "Invitare utilizatori", description: "Poate invita utilizatori noi", category: "users", sortOrder: 1001 },
  { code: "users.edit", name: "Editare utilizatori", description: "Poate modifica datele utilizatorilor", category: "users", sortOrder: 1002 },
  { code: "users.deactivate", name: "Dezactivare utilizatori", description: "Poate dezactiva utilizatori", category: "users", sortOrder: 1003 },
  { code: "users.roles", name: "Asignare roluri", description: "Poate asigna roluri utilizatorilor", category: "users", sortOrder: 1004 },
  { code: "users.groups", name: "Gestiune grupuri", description: "Poate adăuga/elimina utilizatori din grupuri", category: "users", sortOrder: 1005 },

  // ==================== ADMINISTRARE ====================
  { code: "admin.roles", name: "Gestiune roluri", description: "Poate crea și modifica roluri", category: "admin", sortOrder: 1100 },
  { code: "admin.groups", name: "Gestiune grupuri", description: "Poate crea și modifica grupuri", category: "admin", sortOrder: 1101 },
  { code: "admin.permissions", name: "Vizualizare permisiuni", description: "Poate vedea matricea de permisiuni", category: "admin", sortOrder: 1102 },
  { code: "admin.audit", name: "Vizualizare audit", description: "Poate vedea log-urile de audit", category: "admin", sortOrder: 1103 },

  // ==================== LOGURI ====================
  { code: "logs.sync", name: "Vizualizare istoric sync", description: "Poate vedea istoricul sincronizărilor", category: "logs", sortOrder: 1200 },
  { code: "logs.activity", name: "Vizualizare activitate", description: "Poate vedea log-urile de activitate", category: "logs", sortOrder: 1201 },

  // ==================== TASK-URI ====================
  { code: "tasks.view", name: "Vizualizare task-uri", description: "Poate vedea lista și detaliile task-urilor", category: "tasks", sortOrder: 1250 },
  { code: "tasks.create", name: "Creare task-uri", description: "Poate crea task-uri noi", category: "tasks", sortOrder: 1251 },
  { code: "tasks.edit", name: "Editare task-uri", description: "Poate modifica task-urile existente", category: "tasks", sortOrder: 1252 },
  { code: "tasks.delete", name: "Ștergere task-uri", description: "Poate șterge task-uri", category: "tasks", sortOrder: 1253 },

  // ==================== FIRME (COMPANIES) ====================
  { code: "companies.view", name: "Vizualizare firme", description: "Poate vedea lista firmelor și detaliile lor", category: "companies", sortOrder: 1300 },
  { code: "companies.manage", name: "Gestiune firme", description: "Poate crea, modifica și șterge firme", category: "companies", sortOrder: 1301 },

  // ==================== DECONTARE INTERCOMPANY ====================
  { code: "intercompany.view", name: "Vizualizare decontări", description: "Poate vedea decontările intercompany", category: "intercompany", sortOrder: 1400 },
  { code: "intercompany.generate", name: "Generare decontări", description: "Poate genera facturi intercompany", category: "intercompany", sortOrder: 1401 },
  { code: "intercompany.mark_paid", name: "Marcare plată", description: "Poate marca facturile intercompany ca plătite", category: "intercompany", sortOrder: 1402 },
];

// Categoriile de permisiuni pentru UI
export const PERMISSION_CATEGORIES = [
  { code: "orders", name: "Comenzi", icon: "ShoppingCart" },
  { code: "products", name: "Produse", icon: "Package" },
  { code: "categories", name: "Categorii", icon: "Tags" },
  { code: "invoices", name: "Facturi", icon: "FileText" },
  { code: "awb", name: "AWB & Livrări", icon: "Truck" },
  { code: "printers", name: "Imprimante", icon: "Printer" },
  { code: "picking", name: "Picking", icon: "ClipboardList" },
  { code: "handover", name: "Predare Curier", icon: "PackageCheck" },
  { code: "processing", name: "Procesare", icon: "RefreshCw" },
  { code: "inventory", name: "Inventar", icon: "Warehouse" },
  { code: "warehouses", name: "Depozite", icon: "Building2" },
  { code: "transfers", name: "Transferuri", icon: "ArrowLeftRight" },
  { code: "marketplace", name: "Marketplace", icon: "Globe" },
  { code: "ads", name: "Advertising", icon: "Megaphone" },
  { code: "reports", name: "Rapoarte", icon: "BarChart" },
  { code: "settings", name: "Setări", icon: "Settings" },
  { code: "users", name: "Utilizatori", icon: "Users" },
  { code: "admin", name: "Administrare", icon: "Shield" },
  { code: "logs", name: "Loguri", icon: "ScrollText" },
  { code: "tasks", name: "Task-uri", icon: "CheckSquare" },
  { code: "companies", name: "Firme", icon: "Building" },
  { code: "intercompany", name: "Decontări Intercompany", icon: "ArrowRightLeft" },
];

// Roluri default de sistem
export const DEFAULT_ROLES = [
  {
    name: "Administrator",
    description: "Acces complet la toate funcționalitățile (fără gestiune roluri)",
    color: "#ef4444",
    isSystem: true,
    permissions: PERMISSIONS.filter(p => !p.code.startsWith("admin.")).map(p => p.code),
  },
  {
    name: "Manager",
    description: "Acces la comenzi, produse, facturi, AWB și rapoarte",
    color: "#f59e0b",
    isSystem: true,
    permissions: [
      "orders.view", "orders.edit", "orders.process", "orders.export", "orders.sync",
      "products.view", "products.edit", "products.sync", "products.stock",
      "categories.view",
      "invoices.view", "invoices.create", "invoices.download", "invoices.payment",
      "awb.view", "awb.create", "awb.print", "awb.track",
      "printers.view",
      "picking.view", "picking.create", "picking.process", "picking.complete", "picking.print",
      "handover.view", "handover.scan", "handover.finalize", "handover.report",
      "inventory.view", "inventory.sync",
      "warehouses.view", "warehouses.edit",
      "transfers.view", "transfers.create", "transfers.execute",
      "ads.view", "ads.manage",
      "reports.view", "reports.export",
      "logs.sync", "logs.activity",
      "tasks.view", "tasks.create", "tasks.edit", "tasks.delete",
    ],
  },
  {
    name: "Operator Comenzi",
    description: "Procesare comenzi, facturi și AWB",
    color: "#3b82f6",
    isSystem: true,
    permissions: [
      "orders.view", "orders.process",
      "invoices.view", "invoices.create", "invoices.download",
      "awb.view", "awb.create", "awb.print",
      "printers.view",
      "products.view",
      "handover.view", "handover.scan",
    ],
  },
  {
    name: "Picker",
    description: "Procesare liste de picking",
    color: "#22c55e",
    isSystem: true,
    permissions: [
      "picking.view", "picking.process", "picking.complete", "picking.print",
      "handover.view", "handover.scan",
      "products.view",
      "orders.view",
    ],
  },
  {
    name: "Operator Predare",
    description: "Scanare și predare colete către curier",
    color: "#8b5cf6",
    isSystem: true,
    permissions: [
      "handover.view", "handover.scan", "handover.finalize", "handover.report",
      "awb.view",
      "orders.view",
    ],
  },
  {
    name: "Vizualizare",
    description: "Doar vizualizare, fără modificări",
    color: "#6b7280",
    isSystem: true,
    permissions: [
      "orders.view",
      "products.view",
      "categories.view",
      "invoices.view",
      "awb.view",
      "picking.view",
      "handover.view",
      "inventory.view",
      "warehouses.view",
      "transfers.view",
      "reports.view",
      "tasks.view",
    ],
  },
];

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Verifică dacă un utilizator are o permisiune specifică
 */
export async function hasPermission(userId: string, permissionCode: string): Promise<boolean> {
  // Verifică dacă e SuperAdmin
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isSuperAdmin: true, isActive: true },
  });

  if (!user || !user.isActive) return false;
  if (user.isSuperAdmin) return true;

  // Verifică permisiunile din rolurile directe
  const directRolePermission = await prisma.userRoleAssignment.findFirst({
    where: {
      userId,
      role: {
        permissions: {
          some: {
            permission: { code: permissionCode },
          },
        },
      },
    },
  });

  if (directRolePermission) return true;

  // Verifică permisiunile din grupuri
  const groupPermission = await prisma.userGroupMembership.findFirst({
    where: {
      userId,
      group: {
        roles: {
          some: {
            role: {
              permissions: {
                some: {
                  permission: { code: permissionCode },
                },
              },
            },
          },
        },
      },
    },
  });

  return !!groupPermission;
}

/**
 * Verifică dacă un utilizator are acces la un store specific
 */
export async function hasStoreAccess(userId: string, storeId: string): Promise<boolean> {
  // Verifică dacă e SuperAdmin
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isSuperAdmin: true, isActive: true },
  });

  if (!user || !user.isActive) return false;
  if (user.isSuperAdmin) return true;

  // Verifică dacă are acces explicit la store
  const storeAccess = await prisma.userStoreAccess.findFirst({
    where: { userId, storeId },
  });

  // Dacă nu există niciun store access definit pentru user, are acces la toate
  const hasAnyStoreRestriction = await prisma.userStoreAccess.findFirst({
    where: { userId },
  });

  if (!hasAnyStoreRestriction) return true;

  return !!storeAccess;
}

/**
 * Obține toate permisiunile unui utilizator
 */
export async function getUserPermissions(userId: string): Promise<string[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isSuperAdmin: true, isActive: true },
  });

  if (!user || !user.isActive) return [];
  if (user.isSuperAdmin) return PERMISSIONS.map(p => p.code);

  // Permisiuni din roluri directe
  const directRoles = await prisma.userRoleAssignment.findMany({
    where: { userId },
    include: {
      role: {
        include: {
          permissions: {
            include: { permission: true },
          },
        },
      },
    },
  });

  // Permisiuni din grupuri
  const groupMemberships = await prisma.userGroupMembership.findMany({
    where: { userId },
    include: {
      group: {
        include: {
          roles: {
            include: {
              role: {
                include: {
                  permissions: {
                    include: { permission: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const permissions = new Set<string>();

  // Adaugă permisiunile din roluri directe
  for (const assignment of directRoles) {
    for (const rp of assignment.role.permissions) {
      permissions.add(rp.permission.code);
    }
  }

  // Adaugă permisiunile din grupuri
  for (const membership of groupMemberships) {
    for (const groupRole of membership.group.roles) {
      for (const rp of groupRole.role.permissions) {
        permissions.add(rp.permission.code);
      }
    }
  }

  return Array.from(permissions);
}

/**
 * Obține store-urile la care are acces un utilizator
 */
export async function getUserStores(userId: string): Promise<string[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isSuperAdmin: true },
  });

  // SuperAdmin are acces la toate
  if (user?.isSuperAdmin) {
    const allStores = await prisma.store.findMany({ select: { id: true } });
    return allStores.map(s => s.id);
  }

  // Verifică dacă are restricții de store
  const storeAccess = await prisma.userStoreAccess.findMany({
    where: { userId },
    select: { storeId: true },
  });

  // Dacă nu are nicio restricție, are acces la toate
  if (storeAccess.length === 0) {
    const allStores = await prisma.store.findMany({ select: { id: true } });
    return allStores.map(s => s.id);
  }

  return storeAccess.map(sa => sa.storeId);
}

/**
 * Verifică dacă un utilizator are acces la un depozit specific
 */
export async function hasWarehouseAccess(userId: string, warehouseId: string): Promise<boolean> {
  // Verifică dacă e SuperAdmin
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isSuperAdmin: true, isActive: true },
  });

  if (!user || !user.isActive) return false;
  if (user.isSuperAdmin) return true;

  // Verifică dacă are acces explicit la depozit
  const warehouseAccess = await prisma.userWarehouseAccess.findFirst({
    where: { userId, warehouseId },
  });

  // Dacă nu există nicio restricție de depozit pentru user, are acces la toate
  const hasAnyWarehouseRestriction = await prisma.userWarehouseAccess.findFirst({
    where: { userId },
  });

  if (!hasAnyWarehouseRestriction) return true;

  return !!warehouseAccess;
}

/**
 * Obține depozitele la care are acces un utilizator
 */
export async function getUserWarehouses(userId: string): Promise<string[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isSuperAdmin: true },
  });

  // SuperAdmin are acces la toate
  if (user?.isSuperAdmin) {
    const allWarehouses = await prisma.warehouse.findMany({
      where: { isActive: true },
      select: { id: true }
    });
    return allWarehouses.map(w => w.id);
  }

  // Verifică dacă are restricții de depozit
  const warehouseAccess = await prisma.userWarehouseAccess.findMany({
    where: { userId },
    select: { warehouseId: true },
  });

  // Dacă nu are nicio restricție, are acces la toate
  if (warehouseAccess.length === 0) {
    const allWarehouses = await prisma.warehouse.findMany({
      where: { isActive: true },
      select: { id: true }
    });
    return allWarehouses.map(w => w.id);
  }

  return warehouseAccess.map(wa => wa.warehouseId);
}

/**
 * Obține depozitul principal (pentru comenzi)
 */
export async function getPrimaryWarehouse(): Promise<{ id: string; code: string; name: string } | null> {
  return prisma.warehouse.findFirst({
    where: { isPrimary: true, isActive: true },
    select: { id: true, code: true, name: true },
  });
}

/**
 * Loghează o acțiune în audit log
 */
export async function logAuditAction(params: {
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldValue?: any;
  newValue?: any;
  metadata?: any;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      oldValue: params.oldValue,
      newValue: params.newValue,
      metadata: params.metadata,
    },
  });
}

/**
 * Seed permisiunile în baza de date
 */
export async function seedPermissions(): Promise<void> {
  for (const permission of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: permission.code },
      update: {
        name: permission.name,
        description: permission.description,
        category: permission.category,
        sortOrder: permission.sortOrder,
      },
      create: permission,
    });
  }
}

/**
 * Seed rolurile default în baza de date
 */
export async function seedDefaultRoles(): Promise<void> {
  for (const roleData of DEFAULT_ROLES) {
    const existingRole = await prisma.role.findUnique({
      where: { name: roleData.name },
    });

    if (!existingRole) {
      const role = await prisma.role.create({
        data: {
          name: roleData.name,
          description: roleData.description,
          color: roleData.color,
          isSystem: roleData.isSystem,
        },
      });

      // Adaugă permisiunile
      for (const permCode of roleData.permissions) {
        const permission = await prisma.permission.findUnique({
          where: { code: permCode },
        });
        if (permission) {
          await prisma.rolePermission.create({
            data: {
              roleId: role.id,
              permissionId: permission.id,
            },
          });
        }
      }
    }
  }
}
