/**
 * Script pentru generarea planului de testare Excel
 * Generează un fișier Excel cu multiple foi pentru testarea completă a platformei ERP
 */

const XLSX = require('xlsx');
const path = require('path');

// Stiluri pentru Excel
const headerStyle = {
  font: { bold: true, color: { rgb: "FFFFFF" } },
  fill: { fgColor: { rgb: "4F81BD" } },
  alignment: { horizontal: "center" }
};

// Date pentru foaia SUMMARY
const summaryData = [
  ["ERP CASHFLOWSYNC - PLAN DE TESTARE COMPLET"],
  [""],
  ["Generat la:", new Date().toLocaleString('ro-RO')],
  ["Versiune:", "1.0.0"],
  [""],
  ["STATISTICI TESTE"],
  ["Modul", "Total Teste", "Critical", "High", "Medium", "Low"],
  ["Authentication", 10, 4, 4, 1, 1],
  ["Dashboard", 4, 1, 1, 2, 0],
  ["Orders", 20, 5, 10, 5, 0],
  ["Invoices", 14, 4, 6, 4, 0],
  ["AWB", 15, 4, 8, 2, 1],
  ["Handover", 11, 2, 6, 2, 1],
  ["Picking", 8, 0, 5, 3, 0],
  ["Inventory Items", 8, 0, 4, 4, 0],
  ["Stock Movements", 5, 1, 2, 2, 0],
  ["Stock Transfers", 5, 0, 3, 2, 0],
  ["Goods Receipts", 3, 0, 2, 1, 0],
  ["Warehouses", 5, 0, 3, 2, 0],
  ["Products", 10, 2, 4, 4, 0],
  ["Companies", 8, 1, 5, 2, 0],
  ["Intercompany", 6, 2, 2, 2, 0],
  ["Stores", 4, 0, 3, 1, 0],
  ["Cron Jobs", 7, 2, 3, 2, 0],
  ["RBAC", 6, 1, 4, 1, 0],
  ["Ads", 8, 0, 4, 4, 0],
  ["AI Insights", 3, 0, 0, 3, 0],
  ["Trendyol", 4, 0, 2, 2, 0],
  ["Printing", 3, 0, 0, 3, 0],
  ["Notifications", 3, 0, 0, 1, 2],
  ["Backup", 3, 0, 1, 2, 0],
  ["Upload", 3, 0, 1, 2, 0],
  ["Performance", 5, 0, 1, 4, 0],
  ["Security", 8, 4, 2, 2, 0],
  ["Integration", 8, 2, 4, 2, 0],
  ["E2E", 5, 1, 3, 1, 0],
  [""],
  ["TOTAL", "200+", 36, 93, 65, 6],
  [""],
  ["LEGENDĂ PRIORITĂȚI"],
  ["Critical", "Funcționalitate core fără de care sistemul nu poate funcționa"],
  ["High", "Funcționalitate importantă care afectează semnificativ utilizarea"],
  ["Medium", "Funcționalitate standard, poate fi workaround-uită temporar"],
  ["Low", "Funcționalitate minoră, UX improvements"],
  [""],
  ["LEGENDĂ STATUS"],
  ["Pending", "Test nepornit încă"],
  ["In Progress", "Test în curs de execuție"],
  ["Passed", "Test trecut cu succes"],
  ["Failed", "Test eșuat - necesită fix"],
  ["Blocked", "Test blocat de altă problemă"],
  ["Skipped", "Test omis (motivat)"],
];

// Date pentru foaia API ENDPOINTS
const apiEndpointsData = [
  ["Endpoint", "Method", "Module", "Description", "Auth Required", "Permission", "Test Priority"],
  // Authentication
  ["/api/auth/signup", "POST", "Auth", "User registration", "No", "-", "High"],
  ["/api/auth/[...nextauth]", "GET/POST", "Auth", "NextAuth provider", "No", "-", "Critical"],
  ["/api/user/profile", "GET/POST", "User", "User profile", "Yes", "profile.view", "High"],
  ["/api/user/preferences", "GET/POST", "User", "User preferences", "Yes", "profile.edit", "Medium"],
  // Orders
  ["/api/orders", "GET", "Orders", "List orders", "Yes", "orders.view", "Critical"],
  ["/api/orders", "POST", "Orders", "Create order", "Yes", "orders.create", "High"],
  ["/api/orders/[id]", "GET", "Orders", "Get order details", "Yes", "orders.view", "Critical"],
  ["/api/orders/[id]", "PUT", "Orders", "Update order", "Yes", "orders.edit", "High"],
  ["/api/orders/[id]", "DELETE", "Orders", "Delete order", "Yes", "orders.delete", "High"],
  ["/api/orders/process", "POST", "Orders", "Process single order", "Yes", "orders.process", "Critical"],
  ["/api/orders/process-all", "POST", "Orders", "Batch process orders", "Yes", "orders.process", "Critical"],
  ["/api/orders/export", "POST", "Orders", "Export orders", "Yes", "orders.view", "Medium"],
  // Invoices
  ["/api/invoices", "GET", "Invoices", "List invoices", "Yes", "invoices.view", "High"],
  ["/api/invoices/issue", "POST", "Invoices", "Issue invoice", "Yes", "invoices.issue", "Critical"],
  ["/api/invoices/[id]/pay", "PUT", "Invoices", "Mark invoice paid", "Yes", "invoices.edit", "Medium"],
  ["/api/invoices/[id]/cancel", "DELETE", "Invoices", "Cancel invoice", "Yes", "invoices.cancel", "High"],
  ["/api/invoice-series", "GET/POST", "Invoices", "Manage invoice series", "Yes", "settings.manage", "High"],
  // AWB
  ["/api/awb", "GET", "AWB", "List AWBs", "Yes", "awb.view", "High"],
  ["/api/awb/create", "POST", "AWB", "Create AWB", "Yes", "awb.create", "Critical"],
  ["/api/awb/[id]", "GET", "AWB", "Get AWB details", "Yes", "awb.view", "High"],
  ["/api/awb/[id]/comments", "POST", "AWB", "Add AWB comment", "Yes", "awb.edit", "Medium"],
  ["/api/awb/refresh", "POST", "AWB", "Refresh AWB status", "Yes", "awb.view", "High"],
  // Handover
  ["/api/handover/scan", "POST", "Handover", "Scan AWB for handover", "Yes", "handover.scan", "Critical"],
  ["/api/handover/today", "GET", "Handover", "Today's handover list", "Yes", "handover.view", "Critical"],
  ["/api/handover/not-handed", "GET", "Handover", "Not handed over list", "Yes", "handover.view", "High"],
  ["/api/handover/finalize", "POST", "Handover", "Finalize handover", "Yes", "handover.finalize", "Critical"],
  ["/api/handover/reopen", "POST", "Handover", "Reopen handover", "Yes", "handover.manage", "Medium"],
  ["/api/handover/report", "GET", "Handover", "Get handover report", "Yes", "handover.view", "High"],
  // Inventory
  ["/api/inventory", "GET", "Inventory", "List inventory items", "Yes", "inventory.view", "High"],
  ["/api/inventory-items/[id]", "GET/PUT/DELETE", "Inventory", "Item CRUD", "Yes", "inventory.*", "High"],
  ["/api/inventory-items/import", "POST", "Inventory", "Bulk import", "Yes", "inventory.import", "High"],
  ["/api/inventory-items/export", "POST", "Inventory", "Bulk export", "Yes", "inventory.view", "Medium"],
  ["/api/inventory-items/stock-adjustment", "POST", "Inventory", "Adjust stock", "Yes", "inventory.adjust", "High"],
  // Transfers
  ["/api/transfers", "GET/POST", "Transfers", "List/create transfers", "Yes", "transfers.*", "High"],
  ["/api/transfers/[id]/execute", "POST", "Transfers", "Execute transfer", "Yes", "transfers.execute", "High"],
  ["/api/transfers/[id]/cancel", "POST", "Transfers", "Cancel transfer", "Yes", "transfers.manage", "Medium"],
  // Products
  ["/api/products", "GET", "Products", "List products", "Yes", "products.view", "High"],
  ["/api/products", "POST", "Products", "Create product", "Yes", "products.create", "High"],
  ["/api/products/[id]", "PUT", "Products", "Update product", "Yes", "products.edit", "High"],
  ["/api/products/[id]", "DELETE", "Products", "Delete product", "Yes", "products.delete", "High"],
  // Companies
  ["/api/companies", "GET/POST", "Companies", "Company CRUD", "Yes", "settings.companies", "High"],
  ["/api/companies/[id]/test-facturis", "POST", "Companies", "Test Facturis", "Yes", "settings.companies", "High"],
  ["/api/companies/[id]/test-fancourier", "POST", "Companies", "Test FanCourier", "Yes", "settings.companies", "High"],
  ["/api/companies/lookup-cui", "POST", "Companies", "ANAF CUI lookup", "Yes", "settings.companies", "Medium"],
  // Warehouses
  ["/api/warehouses", "GET/POST", "Warehouses", "Warehouse CRUD", "Yes", "settings.warehouses", "High"],
  ["/api/warehouses/[id]/set-primary", "POST", "Warehouses", "Set primary warehouse", "Yes", "settings.warehouses", "High"],
  // Intercompany
  ["/api/intercompany/preview", "GET", "Intercompany", "Settlement preview", "Yes", "intercompany.view", "High"],
  ["/api/intercompany/generate", "POST", "Intercompany", "Generate invoice", "Yes", "intercompany.generate", "Critical"],
  ["/api/intercompany/invoices/[id]/mark-paid", "POST", "Intercompany", "Mark paid", "Yes", "intercompany.manage", "Medium"],
  // Stores
  ["/api/stores", "GET/POST", "Stores", "Store CRUD", "Yes", "settings.stores", "High"],
  ["/api/stores/[id]/sync", "POST", "Stores", "Sync store", "Yes", "stores.sync", "High"],
  // Cron Jobs
  ["/api/cron/sync-orders", "POST", "Cron", "Sync orders", "Yes", "CRON_SECRET", "High"],
  ["/api/cron/sync-awb", "POST", "Cron", "Sync AWB statuses", "Yes", "CRON_SECRET", "High"],
  ["/api/cron/backup", "POST", "Cron", "Database backup", "Yes", "CRON_SECRET", "Medium"],
  ["/api/cron/intercompany-settlement", "POST", "Cron", "Run settlement", "Yes", "CRON_SECRET", "High"],
  // RBAC
  ["/api/rbac/users", "GET/POST", "RBAC", "User management", "Yes", "users.manage", "High"],
  ["/api/rbac/roles", "GET/POST", "RBAC", "Role management", "Yes", "roles.manage", "High"],
  ["/api/rbac/invitations", "POST", "RBAC", "Send invitation", "Yes", "users.invite", "High"],
  // Ads
  ["/api/ads/campaigns", "GET/POST", "Ads", "Campaign management", "Yes", "ads.view", "High"],
  ["/api/ads/accounts/connect", "POST", "Ads", "Connect ad account", "Yes", "ads.manage", "High"],
  ["/api/ads/pixels", "GET/POST", "Ads", "Pixel management", "Yes", "ads.manage", "Medium"],
  // AI
  ["/api/ai/analyze", "POST", "AI", "Run AI analysis", "Yes", "ai.analyze", "Medium"],
  // Backup
  ["/api/backup", "POST", "Backup", "Create backup", "Yes", "admin.backup", "High"],
  ["/api/backup/restore", "POST", "Backup", "Restore backup", "Yes", "admin.restore", "Critical"],
  // Upload
  ["/api/upload", "POST", "Upload", "Upload file", "Yes", "files.upload", "Medium"],
];

// Date pentru foaia WORKFLOWS
const workflowsData = [
  ["Workflow ID", "Workflow Name", "Description", "Steps", "Expected Outcome", "Priority"],
  ["WF-001", "Procesare Comandă Completă", "Flux complet de la comandă nouă la livrare",
   "1. Comandă nouă (Shopify/Trendyol)\n2. Sincronizare automată\n3. Verificare stoc\n4. Transfer stoc (dacă e cazul)\n5. Creare AWB\n6. Emitere factură\n7. Picking & packing\n8. Predare curier\n9. Urmărire livrare\n10. Confirmare livrare",
   "Comanda ajunge la client, banii încasați, toate documentele emise", "Critical"],
  ["WF-002", "Emitere Factură", "Flux de emitere factură prin Facturis",
   "1. Verifică prerechiziții\n2. Obține număr factură (atomic)\n3. Construiește datele facturii\n4. Trimite la Facturis API\n5. Salvează factură în DB\n6. Descarcă PDF\n7. Actualizează status comandă\n8. Loghează activitate",
   "Factură emisă în Facturis, PDF disponibil, status actualizat", "Critical"],
  ["WF-003", "Creare AWB", "Flux de creare AWB prin FanCourier",
   "1. Verifică prerechiziții\n2. Determină tip plată (ramburs/expeditor)\n3. Construiește datele AWB\n4. Validează local\n5. Trimite la FanCourier API\n6. Salvează AWB în DB\n7. Actualizează status comandă",
   "AWB creat în FanCourier, număr AWB salvat, gata de predare", "Critical"],
  ["WF-004", "Predare Curier (Handover)", "Flux de predare zilnică la curier",
   "1. Lista AWB-uri pentru azi\n2. Scanare fiecare AWB\n3. Verificare C0 alerts\n4. Finalizare predare\n5. Generare raport\n6. Auto-finalizare seara (cron)",
   "Toate AWB-urile predate, raport generat, istoric salvat", "Critical"],
  ["WF-005", "Transfer Stoc", "Flux de transfer între depozite",
   "1. Identifică necesarul de stoc\n2. Verifică disponibilitate în alte depozite\n3. Propune transfer\n4. Creează document transfer\n5. Execută transfer\n6. Actualizează stocuri\n7. Loghează mișcarea",
   "Stocul mutat corect, mișcări înregistrate", "High"],
  ["WF-006", "Decontare Intercompany", "Flux de decontare între firme",
   "1. Identifică comenzi eligibile (isCollected=true)\n2. Grupează pe companie secundară\n3. Calculează markup\n4. Generează preview\n5. Creează factură intercompany\n6. Marchează comenzile ca settled\n7. Urmărește plata",
   "Facturi intercompany emise, decontare completă", "High"],
  ["WF-007", "Picking & Packing", "Flux de pregătire comenzi",
   "1. Generare listă de picking\n2. Agregare produse\n3. Printare bon picking\n4. Ridicare produse\n5. Scanare/marcare\n6. Împachetare\n7. Verificare calitate\n8. Pregătit pentru curier",
   "Comenzile pregătite corect, toate produsele ridicate", "High"],
  ["WF-008", "Sincronizare Automată", "Flux de sincronizare programată",
   "1. Cron job pornit\n2. Verificare lock (prevenire overlap)\n3. Sync comenzi Shopify\n4. Sync statusuri AWB\n5. Actualizare date\n6. Raportare rezultate",
   "Date actualizate, fără duplicate sau conflicte", "High"],
  ["WF-009", "Onboarding Utilizator Nou", "Flux de adăugare utilizator",
   "1. Admin trimite invitație\n2. User primește email\n3. User accesează link\n4. Completează înregistrarea\n5. Se autentifică\n6. Are rolurile atribuite",
   "Utilizator activ cu permisiunile corecte", "Medium"],
  ["WF-010", "Gestionare Campanii Ads", "Flux de management campanii publicitare",
   "1. Conectare cont Meta/TikTok\n2. Creare campanie\n3. Configurare tracking pixel\n4. Rulare campanie\n5. Sincronizare insights\n6. Verificare alerte\n7. Analiză AI\n8. Optimizare",
   "Campanii gestionate, insights actualizate, alerte funcționale", "Medium"],
];

// Date pentru foaia SECURITY TESTS
const securityData = [
  ["Test ID", "Category", "Test Name", "Attack Vector", "Test Steps", "Expected Defense", "OWASP Category"],
  ["SEC-001", "XSS", "Stored XSS în date client", "Injection payload în câmp text", "1. Introdu <script>alert(1)</script> în nume\n2. Salvează\n3. Vizualizează datele", "Payload escaped, nu se execută", "A7:2017-XSS"],
  ["SEC-002", "XSS", "Reflected XSS în căutare", "Injection în parametru URL", "1. Accesează ?search=<script>alert(1)</script>\n2. Verifică răspunsul", "Parametru sanitizat/escaped", "A7:2017-XSS"],
  ["SEC-003", "SQLi", "SQL Injection în search", "Injection în câmp căutare", "1. Introdu ' OR 1=1 --\n2. Verifică query-ul", "Query parametrizat, eroare/escape", "A1:2017-Injection"],
  ["SEC-004", "SQLi", "SQL Injection în ID", "Injection în path param", "1. GET /api/orders/'; DROP TABLE orders;--\n2. Verifică DB", "ID validat, query parametrizat", "A1:2017-Injection"],
  ["SEC-005", "Auth", "Bypass autentificare", "Request fără token", "1. DELETE /api/products/123 fără header Auth\n2. Verifică răspuns", "401 Unauthorized returnat", "A2:2017-Broken Auth"],
  ["SEC-006", "Auth", "JWT token expirat", "Token expirat", "1. Folosește JWT expirat\n2. Încearcă request", "401 Unauthorized, mesaj clar", "A2:2017-Broken Auth"],
  ["SEC-007", "Auth", "JWT token manipulat", "Modificare payload JWT", "1. Decodează JWT\n2. Modifică user ID\n3. Re-encodează\n4. Trimite request", "Signature invalid, request refuzat", "A2:2017-Broken Auth"],
  ["SEC-008", "Authz", "IDOR - acces date alt user", "Modificare ID în request", "1. GET /api/orders/123 (al altcuiva)\n2. Verifică răspuns", "403 Forbidden sau date filtrate", "A5:2017-Broken Access Control"],
  ["SEC-009", "Authz", "Privilege escalation", "Acces funcție admin", "1. User normal accesează /api/admin/*\n2. Verifică răspuns", "403 Forbidden", "A5:2017-Broken Access Control"],
  ["SEC-010", "CSRF", "Cross-Site Request Forgery", "Form de pe alt site", "1. Creează form pe site extern\n2. Submit la API", "CSRF token invalid, request refuzat", "A8:2017-CSRF"],
  ["SEC-011", "File", "Path Traversal în upload", "Filename cu ../", "1. Upload fișier cu nume ../../etc/passwd\n2. Verifică locația salvării", "Path sanitizat, salvat în director permis", "A5:2017-Broken Access Control"],
  ["SEC-012", "File", "Upload fișier malițios", "Executabil deghizat", "1. Upload malware.exe.jpg\n2. Verifică extensia salvată", "Extensie sanitizată sau refuzată", "A8:2017-Insecure Deserialization"],
  ["SEC-013", "Rate", "Brute force login", "Multiple încercări de login", "1. Încearcă 100 parole în 1 minut\n2. Verifică răspunsul", "Rate limiting activ, cont/IP blocat", "A2:2017-Broken Auth"],
  ["SEC-014", "Rate", "API abuse", "Flood de requesturi", "1. Trimite 1000 req/sec\n2. Verifică răspunsul", "429 Too Many Requests", "A6:2017-Security Misconfiguration"],
  ["SEC-015", "Headers", "Missing security headers", "Inspectare răspuns", "1. Verifică X-Frame-Options\n2. Verifică CSP\n3. Verifică HSTS", "Toate headerele prezente", "A6:2017-Security Misconfiguration"],
  ["SEC-016", "Secrets", "Expunere variabile env", "Inspectare răspuns/bundle", "1. Verifică răspunsurile API\n2. Verifică JS bundle", "Nicio variabilă sensibilă expusă", "A3:2017-Sensitive Data Exposure"],
  ["SEC-017", "Cron", "Acces cron fără secret", "Request fără CRON_SECRET", "1. POST /api/cron/sync-orders\n2. Fără header Authorization", "401 sau 500 (secret not set)", "A2:2017-Broken Auth"],
  ["SEC-018", "Multi-tenant", "Izolare date între companii", "Acces date altă companie", "1. User compania A accesează date compania B\n2. Verifică răspunsul", "Date filtrate per tenant", "A5:2017-Broken Access Control"],
];

// Date pentru foaia PAGES
const pagesData = [
  ["Page Path", "Page Name", "Module", "Auth Required", "Key Features", "Test Priority"],
  ["/login", "Login", "Auth", "No", "Email/password login, forgot password", "Critical"],
  ["/signup", "Signup", "Auth", "No", "User registration", "High"],
  ["/invite/[token]", "Invitation", "Auth", "No", "Accept invitation, create account", "High"],
  ["/(dashboard)/dashboard", "Dashboard", "Main", "Yes", "Statistics, charts, overview", "Critical"],
  ["/(dashboard)/orders", "Orders List", "Orders", "Yes", "List, search, filter, bulk actions", "Critical"],
  ["/(dashboard)/orders/[id]", "Order Details", "Orders", "Yes", "Full order info, actions, history", "Critical"],
  ["/(dashboard)/invoices", "Invoices", "Invoices", "Yes", "Invoice list, PDF view, management", "High"],
  ["/(dashboard)/awb", "AWB List", "AWB", "Yes", "AWB list, status, tracking", "High"],
  ["/(dashboard)/awb/[id]", "AWB Details", "AWB", "Yes", "Full AWB info, events, comments", "High"],
  ["/(dashboard)/handover", "Handover", "Handover", "Yes", "Today's list, scan, finalize", "Critical"],
  ["/(dashboard)/handover/not-handed", "Not Handed", "Handover", "Yes", "Previous days not picked up", "High"],
  ["/(dashboard)/handover/report", "Handover Report", "Handover", "Yes", "Daily report, export", "Medium"],
  ["/(dashboard)/picking", "Picking Lists", "Picking", "Yes", "Picking lists management", "High"],
  ["/(dashboard)/picking/create", "Create Picking", "Picking", "Yes", "Create new picking list", "High"],
  ["/(dashboard)/picking/[id]", "Picking Details", "Picking", "Yes", "List items, scan, complete", "High"],
  ["/(dashboard)/inventory", "Inventory", "Inventory", "Yes", "Items list, stock levels", "High"],
  ["/(dashboard)/inventory/[id]", "Item Details", "Inventory", "Yes", "Item info, warehouse stock", "Medium"],
  ["/(dashboard)/inventory/movements", "Stock Movements", "Inventory", "Yes", "Movement history", "Medium"],
  ["/(dashboard)/inventory/receipts", "Goods Receipts", "Inventory", "Yes", "Receipt management", "Medium"],
  ["/(dashboard)/inventory/transfers", "Stock Transfers", "Inventory", "Yes", "Transfer management", "High"],
  ["/(dashboard)/products", "Products", "Products", "Yes", "Product management", "High"],
  ["/(dashboard)/intercompany", "Intercompany", "Intercompany", "Yes", "Settlement management", "High"],
  ["/(dashboard)/stores", "Stores", "Stores", "Yes", "Store management", "High"],
  ["/(dashboard)/settings/companies", "Companies", "Settings", "Yes", "Company management", "High"],
  ["/(dashboard)/settings/warehouses", "Warehouses", "Settings", "Yes", "Warehouse management", "High"],
  ["/(dashboard)/settings/users", "Users", "Settings", "Yes", "User management", "High"],
  ["/(dashboard)/settings/roles", "Roles", "Settings", "Yes", "Role management", "High"],
  ["/(dashboard)/settings/invoice-series", "Invoice Series", "Settings", "Yes", "Series management", "High"],
  ["/(dashboard)/settings/backup", "Backup", "Settings", "Yes", "Backup/restore", "Medium"],
  ["/(dashboard)/settings/audit", "Audit Log", "Settings", "Yes", "Activity history", "Medium"],
  ["/(dashboard)/ads", "Ads Dashboard", "Ads", "Yes", "Ad performance overview", "Medium"],
  ["/(dashboard)/ads/campaigns", "Campaigns", "Ads", "Yes", "Campaign management", "Medium"],
  ["/(dashboard)/ads/accounts", "Ad Accounts", "Ads", "Yes", "Meta/TikTok connections", "Medium"],
  ["/(dashboard)/trendyol", "Trendyol", "Trendyol", "Yes", "Trendyol integration", "Medium"],
  ["/(dashboard)/trendyol/orders", "Trendyol Orders", "Trendyol", "Yes", "Trendyol order sync", "Medium"],
];

// Creare workbook
const wb = XLSX.utils.book_new();

// Foaia 1: Summary
const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
wsSummary['!cols'] = [{ wch: 40 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

// Foaia 2: Test Cases (din CSV)
const fs = require('fs');
const csvPath = path.join(__dirname, '..', 'docs', 'TEST_PLAN_ERP_CASHFLOWSYNC.csv');
const csvContent = fs.readFileSync(csvPath, 'utf-8');
const wsTestCases = XLSX.utils.sheet_add_aoa(XLSX.utils.aoa_to_sheet([]), []);
const lines = csvContent.split('\n');
const testData = lines.map(line => {
  // Parse CSV properly handling quoted strings
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
});
const wsTests = XLSX.utils.aoa_to_sheet(testData);
wsTests['!cols'] = [
  { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 30 },
  { wch: 40 }, { wch: 25 }, { wch: 50 }, { wch: 40 }, { wch: 10 },
  { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 30 }
];
XLSX.utils.book_append_sheet(wb, wsTests, "Test Cases");

// Foaia 3: API Endpoints
const wsAPI = XLSX.utils.aoa_to_sheet(apiEndpointsData);
wsAPI['!cols'] = [{ wch: 45 }, { wch: 12 }, { wch: 15 }, { wch: 35 }, { wch: 12 }, { wch: 20 }, { wch: 12 }];
XLSX.utils.book_append_sheet(wb, wsAPI, "API Endpoints");

// Foaia 4: Workflows
const wsWorkflows = XLSX.utils.aoa_to_sheet(workflowsData);
wsWorkflows['!cols'] = [{ wch: 10 }, { wch: 30 }, { wch: 40 }, { wch: 80 }, { wch: 50 }, { wch: 10 }];
XLSX.utils.book_append_sheet(wb, wsWorkflows, "Workflows");

// Foaia 5: Security Tests
const wsSecurity = XLSX.utils.aoa_to_sheet(securityData);
wsSecurity['!cols'] = [{ wch: 10 }, { wch: 12 }, { wch: 30 }, { wch: 25 }, { wch: 50 }, { wch: 35 }, { wch: 25 }];
XLSX.utils.book_append_sheet(wb, wsSecurity, "Security Tests");

// Foaia 6: Pages
const wsPages = XLSX.utils.aoa_to_sheet(pagesData);
wsPages['!cols'] = [{ wch: 40 }, { wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 45 }, { wch: 12 }];
XLSX.utils.book_append_sheet(wb, wsPages, "Pages");

// Salvare fișier
const outputPath = path.join(__dirname, '..', 'docs', 'ERP_CASHFLOWSYNC_TEST_PLAN.xlsx');
XLSX.writeFile(wb, outputPath);

console.log(`✅ Excel file generated: ${outputPath}`);
console.log(`
📊 Fișierul conține următoarele foi:
   1. Summary - Statistici și legendă
   2. Test Cases - Toate cazurile de test (150+)
   3. API Endpoints - Lista completă API (70+)
   4. Workflows - Fluxuri de business (10)
   5. Security Tests - Teste de securitate (18)
   6. Pages - Paginile aplicației (35+)
`);
