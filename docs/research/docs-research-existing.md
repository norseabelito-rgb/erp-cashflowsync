# Existing Documentation Page Research
## File: src/app/(dashboard)/docs/page.tsx (2319 lines)

---

## 1. PAGE STRUCTURE & NAVIGATION

### Layout Pattern: Sidebar + Content Area
- **Overall**: `flex h-[calc(100vh-4rem)]` - full height minus header
- **Sidebar**: Fixed 72px width (`w-72`), left side, with border-right
- **Content**: `flex-1 overflow-auto` - fills remaining space, scrollable
- **Max content width**: `max-w-4xl mx-auto p-8`

### Sidebar Structure:
```tsx
<div className="w-72 border-r bg-muted/30 flex flex-col no-print">
  {/* Header: Logo + Title + Version */}
  <div className="p-4 border-b">
    <BookOpen icon /> "Documentatie ERP"
    <p>v{DOC_VERSION} • {LAST_UPDATED}</p>
    {/* Search input */}
    <Input placeholder="Cauta..." />
  </div>

  {/* Navigation: ScrollArea with grouped modules */}
  <ScrollArea className="flex-1 p-4">
    {/* 4 categories: overview, business, technical, reference */}
    {/* Each module is a button that sets activeModule state */}
  </ScrollArea>

  {/* Footer: Download PDF button */}
  <div className="p-4 border-t">
    <Button onClick={handlePrint}><Download /> Download PDF</Button>
  </div>
</div>
```

### Navigation is STATE-BASED (not URL-based):
```tsx
const [activeModule, setActiveModule] = useState("overview");
// Switch statement renders different Content components
const renderContent = () => {
  switch (activeModule) {
    case "overview": return <OverviewContent />;
    case "quickstart": return <QuickstartContent />;
    // ... etc
  }
};
```

### Module Categories & IDs:
```tsx
const modules: Module[] = [
  // Overview (category: "overview")
  { id: "overview", name: "Prezentare Generala", icon: Book },
  { id: "quickstart", name: "Ghid Rapid Start", icon: Zap },

  // Business Flows (category: "business")
  { id: "business-flow", name: "Flux Business E2E", icon: Workflow },
  { id: "orders", name: "Comenzi si Procesare", icon: ShoppingCart },
  { id: "invoices", name: "Facturare Oblio", icon: FileText },
  { id: "shipping", name: "Livrare AWB", icon: Truck },
  { id: "picking", name: "Picking Warehouse", icon: ClipboardList },
  { id: "handover", name: "Predare Curier", icon: Hand },
  { id: "products", name: "Produse si Stoc", icon: Package },
  { id: "advertising", name: "Advertising", icon: Megaphone },
  { id: "trendyol", name: "Trendyol Marketplace", icon: Globe },

  // Technical (category: "technical")
  { id: "architecture", name: "Arhitectura Sistem", icon: Server },
  { id: "database", name: "Baza de Date", icon: Database },
  { id: "integrations", name: "Integrari Externe", icon: GitBranch },
  { id: "rbac", name: "Permisiuni RBAC", icon: Shield },
  { id: "cron", name: "CRON Jobs", icon: Timer },

  // Reference (category: "reference")
  { id: "api", name: "API Reference", icon: Code },
  { id: "env", name: "Variabile Mediu", icon: Key },
  { id: "changelog", name: "Istoric Versiuni", icon: History },
];
```

### Sidebar Category Labels:
```tsx
{category === "overview" && "Introducere"}
{category === "business" && "Fluxuri Business"}
{category === "technical" && "Tehnic"}
{category === "reference" && "Referinta"}
```

---

## 2. ALL SECTIONS/MODULES DOCUMENTED

### Overview Category:
1. **OverviewContent** - Platform description, stat cards (12+ modules, 8 integrations, 80+ DB tables, 124 RBAC perms), feature cards, integrations grid, target audience
2. **QuickstartContent** - Setup checklist (6 steps), first order processing guide, FAQ

### Business Category:
3. **BusinessFlowContent** - E2E flow ASCII diagram, financial flow (online vs COD), 14 order statuses, processing times
4. **OrdersContent** - Order sources (Shopify/Trendyol/Manual), validation details, API endpoints
5. **InvoicesContent** - Invoice flow, payment types, PF/PJ clients, invoice series, e-Factura SPV, API endpoints
6. **ShippingContent** - AWB generation flow, COD logic, tracking mapping (FanCourier → ERP statuses), API endpoints
7. **PickingContent** - Picking flow, aggregated list example, barcode scanning, API endpoints
8. **HandoverContent** - Handover flow, C0 report details, undelivered alerts, API endpoints
9. **ProductsContent** - Dual stock architecture (MasterProduct + InventoryItem), composite recipes, API endpoints
10. **AdvertisingContent** - Meta/TikTok OAuth, tracked metrics, alert system, auto actions, API endpoints
11. **TrendyolContent** - Order sync, product publishing, API endpoints

### Technical Category:
12. **ArchitectureContent** - Tech stack grid, project structure tree, layered architecture diagram
13. **DatabaseContent** - Stats, entity relations ASCII diagram, Prisma model example
14. **IntegrationsContent** - 6 integrations detailed (Shopify, Oblio, FanCourier, Meta, TikTok, Trendyol)
15. **RBACContent** - Stats, 6 predefined roles, 10 permission categories
16. **CronContent** - 8 CRON jobs listed with frequencies

### Reference Category:
17. **ApiReferenceContent** - Grouped API endpoints (Orders, Invoices, AWB, Picking, Handover)
18. **EnvContent** - Full .env.example with all environment variables
19. **ChangelogContent** - Version history v3.0.0 to v4.0.0 (7 versions)

---

## 3. UI COMPONENTS DEFINED (all inline in page.tsx)

### SectionTitle
```tsx
function SectionTitle({ icon, children, id }: { icon: React.ReactNode; children: React.ReactNode; id?: string }) {
  return (
    <h2 id={id} className="flex items-center gap-3 text-xl font-semibold text-foreground mt-8 mb-4 print:mt-4 print:text-lg">
      <span className="text-primary print:text-black">{icon}</span>
      {children}
    </h2>
  );
}
```

### SubSectionTitle
```tsx
function SubSectionTitle({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <h3 id={id} className="text-lg font-semibold text-foreground mt-6 mb-3 print:mt-3 print:text-base">
      {children}
    </h3>
  );
}
```

### InfoBox (4 variants: info, warning, success, tip)
```tsx
function InfoBox({
  variant = "info",
  title,
  children
}: {
  variant?: "info" | "warning" | "success" | "tip";
  title: string;
  children: React.ReactNode;
}) {
  const styles = {
    info: { bg: "bg-primary/10", border: "border-primary/30", icon: <Info /> },
    warning: { bg: "bg-warning/10", border: "border-warning/30", icon: <AlertTriangle /> },
    success: { bg: "bg-success/10", border: "border-success/30", icon: <CheckCircle2 /> },
    tip: { bg: "bg-accent", border: "border-accent-foreground/20", icon: <Lightbulb /> },
  };
  // Renders: rounded-lg border p-4 with icon + title + children
}
```

### CodeBlock (with copy button)
```tsx
function CodeBlock({ code, title }: { code: string; title?: string }) {
  const [copied, setCopied] = useState(false);
  // Has copy-to-clipboard button, optional title header, <pre><code> display
  // Styling: border border-border bg-muted, with print:bg-gray-100
}
```

### StatCard
```tsx
function StatCard({ label, value, description, icon }: {
  label: string; value: string; description: string; icon: React.ReactNode;
}) {
  // Card with icon right-aligned, label/value/description stacked left
}
```

### FeatureCard
```tsx
function FeatureCard({ icon, title, description, badges }: {
  icon: React.ReactNode; title: string; description: string; badges: string[];
}) {
  // Card with icon + title header, description text, badge list
}
```

### FlowStep (horizontal flow diagram with arrows)
```tsx
function FlowStep({ steps }: { steps: { step: string; desc: string }[] }) {
  // Horizontal flow: Badge boxes connected by ArrowRight icons
  // Wraps on small screens with flex-wrap
}
```

### ApiEndpoint
```tsx
function ApiEndpoint({ method, path, desc }: { method: string; path: string; desc: string }) {
  // Horizontal row: colored method badge + monospace path + description
  // Method colors: GET=secondary, DELETE=destructive, others=default
}
```

### DiagramBox
```tsx
function DiagramBox({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  // Border box with title header in muted bg, content area below
}
```

---

## 4. DOWNLOAD FUNCTIONALITY

### Current: Browser Print (window.print())
```tsx
const handlePrint = () => {
  window.print();
};

// Button in sidebar footer:
<Button onClick={handlePrint} className="w-full" variant="outline">
  <Download className="h-4 w-4 mr-2" />
  Download PDF
</Button>
```

### Print Styles (global CSS):
```css
@media print {
  body * { visibility: hidden; }
  .print-content, .print-content * { visibility: visible; }
  .print-content { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; }
  .no-print { display: none !important; }
  @page { margin: 1cm; size: A4; }
}
```

### Print Header (hidden on screen, visible on print):
```tsx
<div className="hidden print:block mb-8 pb-4 border-b">
  <h1 className="text-2xl font-bold">ERP CashFlowSync - Documentatie</h1>
  <p>Versiune {DOC_VERSION} • Generat {new Date().toLocaleDateString("ro-RO")}</p>
</div>
```

### Print Footer:
```tsx
<div className="hidden print:block mt-8 pt-4 border-t text-center text-xs text-gray-500">
  ERP CashFlowSync • Documentatie Tehnica si Business • Pagina generata automat
</div>
```

**LIMITATION**: Current print only prints the ACTIVE section, not all sections at once.

---

## 5. MERMAID DIAGRAMS

### Current Status: NO MERMAID DIAGRAMS in use
- Package `mermaid` v11.4.0 IS installed in package.json
- **No MermaidDiagram component exists** anywhere in src/components/
- No files in src/ reference mermaid
- All diagrams currently use **ASCII art** in `<pre>` blocks or the custom DiagramBox component

### Existing Diagram Components (in src/components/docs/diagrams.tsx):
The file exports these components (NOT currently used in docs page.tsx):
1. **FlowDiagram** - horizontal/vertical flow with SVG arrows
2. **BoxDiagram** - titled box with grid of colored items
3. **ArchitectureDiagram** - layered architecture view
4. **StatusBadge** - colored status indicators (active/planned/deprecated/beta)
5. **EntityDiagram** - entity cards with field lists
6. **Timeline** - vertical timeline with dots
7. **CodeBlock** - dark-themed code block (different from the inline one in page.tsx)
8. **InfoBox** - simpler version (default/warning/info variants only, no title prop)

**IMPORTANT**: These diagram components in diagrams.tsx are NOT used by the current docs page.tsx. The docs page defines its own inline versions of CodeBlock, InfoBox, FlowStep, etc.

### ASCII Art Diagrams Currently Used:
1. **E2E Order Flow** (BusinessFlowContent) - Large vertical ASCII flowchart showing Shopify/Trendyol → PENDING → VALIDATED → INVOICED → AWB_CREATED → PICKING → HANDOVER → SHIPPED → DELIVERED
2. **Picking List Example** (PickingContent) - ASCII table showing SKU/Produs/Qty/Comenzi
3. **Architecture Layers** (ArchitectureContent) - 5-layer horizontal diagram (Presentation → API → Service → Data → External)
4. **Database Relations** (DatabaseContent) - Entity relationship ASCII diagram

---

## 6. OVERALL LAYOUT PATTERN

```
┌─────────────────────────────────────────────────────────────┐
│ Dashboard Header (from parent layout - 4rem height)         │
├──────────┬──────────────────────────────────────────────────┤
│          │                                                   │
│ Sidebar  │  Content Area                                     │
│ (w-72)   │  (flex-1, max-w-4xl centered)                    │
│          │                                                   │
│ ┌──────┐ │  ┌─────────────────────────────────────────┐     │
│ │Logo  │ │  │ [Print header - hidden on screen]        │     │
│ │Title │ │  │                                          │     │
│ │Search│ │  │ {renderContent()} - one section at time  │     │
│ └──────┘ │  │                                          │     │
│          │  │                                          │     │
│ ┌──────┐ │  │                                          │     │
│ │Intro │ │  │                                          │     │
│ │Biz   │ │  │                                          │     │
│ │Tech  │ │  │                                          │     │
│ │Ref   │ │  └─────────────────────────────────────────┘     │
│ └──────┘ │                                                   │
│          │                                                   │
│ ┌──────┐ │                                                   │
│ │PDF   │ │                                                   │
│ │Button│ │                                                   │
│ └──────┘ │                                                   │
├──────────┴──────────────────────────────────────────────────┤
```

---

## 7. CONTENT ACCURACY ASSESSMENT

### ACCURATE (matches codebase):
- Order statuses (14 statuses)
- Shopify webhook integration
- Oblio invoice integration
- FanCourier AWB integration
- RBAC with 124 permissions
- COD/ramburs logic (paid = 0, pending = totalPrice)
- Dual stock system (MasterProduct + InventoryItem)
- Tech stack (Next.js 14, Prisma, PostgreSQL, shadcn/ui)

### LIKELY OUTDATED:
- Version numbers (DOC_VERSION = "4.0.0", LAST_UPDATED = "2026-02-02")
- Changelog stops at v4.0.0 - missing recent changes (current commit shows delivery manifest rewrite, etc.)
- API endpoints may have changed since documentation was written

### MISSING from current docs:
- **Temu marketplace** integration (components exist: temu-placeholder.tsx, TemuStoresTab.tsx, temu-orders-list.tsx)
- **Delivery manifest** module (components exist: ReturnManifestTable.tsx)
- **Suppliers / Purchase Orders** (components exist: PurchaseOrderForm.tsx, SupplierInvoiceForm.tsx)
- **NIR / Reception** workflow (components exist: NIRWorkflowActions.tsx, ReceptionItemsTable.tsx, ReceptionPhotoUpload.tsx)
- **Warehouse management** details (WarehouseStock model referenced)
- **Notifications** system (NotificationBell.tsx component exists)
- **PIN security** (PINDialog.tsx exists)
- **Customer management** (customer-detail-modal.tsx exists)
- **Tasks/Todo** system (task-filters.tsx, task-form-dialog.tsx exist)
- **AI Insights** component details (ai-insights.tsx exists)
- **Transfer warnings** for orders (transfer-warning-modal.tsx exists)
- **Invoice action guards** (InvoiceActionGuard.tsx exists)
- **Onboarding checklist** component (checklist.tsx exists)
- **Multi-store** architecture details
- **Session monitoring** (session-monitor.tsx exists)

---

## 8. SEARCH FUNCTIONALITY

### Current: Client-side module name filter only
```tsx
const [searchQuery, setSearchQuery] = useState("");

const filteredModules = modules.filter(m =>
  m.name.toLowerCase().includes(searchQuery.toLowerCase())
);
```

- Search only filters the sidebar navigation items by module NAME
- Does NOT search content within sections
- No full-text search
- No search results highlighting
- No keyboard shortcuts (Ctrl+K, etc.)
- No search history or suggestions

---

## 9. CONSTANTS & METADATA

```tsx
const DOC_VERSION = "4.0.0";
const LAST_UPDATED = "2026-02-02";
```

---

## 10. EXTERNAL DEPENDENCIES USED

### From lucide-react (87 icons imported):
Book, ShoppingCart, Truck, FileText, Package, Megaphone, Shield, Database, Zap, GitBranch, Code, ChevronRight, Search, CheckCircle2, ArrowRight, Layers, Globe, Store, Plus, Phone, MapPin, Building2, XCircle, AlertTriangle, Info, Lightbulb, Check, Copy, GitMerge, Workflow, FolderTree, Cog, Timer, Layers3, RefreshCw, Users, Eye, Lock, History, ClipboardList, Scan, Hand, Target, TrendingUp, Key, Table2, Server, Terminal, Download, Printer, ChevronDown, ChevronUp, ExternalLink, CreditCard, Banknote, Receipt, BarChart3, PieChart, Activity, Settings, HelpCircle, BookOpen, FileCode, Network, Boxes, Factory, Warehouse, CircleDollarSign, CalendarDays, Clock, Bell, Mail, Smartphone, Laptop, Cloud, ShieldCheck, UserCheck, FileCheck, ListChecks, PackageCheck, Gauge, LayoutDashboard

### From shadcn/ui:
- Card, CardContent, CardHeader, CardTitle, CardDescription
- Badge
- Button
- Input
- ScrollArea
- Tabs, TabsContent, TabsList, TabsTrigger (imported but NOT USED in current code)
- Separator (imported but NOT USED in current code)

### From lib:
- cn (classnames utility)

---

## 11. COMPONENT THAT EXISTS BUT ISN'T USED

### src/components/docs/diagrams.tsx
Contains reusable diagram components that are NOT imported by the docs page:
- FlowDiagram, BoxDiagram, ArchitectureDiagram, StatusBadge, EntityDiagram, Timeline, CodeBlock, InfoBox
- These use inline styles (not Tailwind theme) for colors - may have been created for a different context

### Mermaid package
- `"mermaid": "^11.4.0"` is in package.json
- Not used anywhere in the codebase currently
- Could be leveraged for dynamic diagrams in the new docs

---

## 12. KEY PATTERNS TO PRESERVE

1. **Romanian language** for all section titles and descriptions
2. **Print support** with `print:` Tailwind classes throughout
3. **Category-based sidebar** grouping (Introducere, Fluxuri Business, Tehnic, Referinta)
4. **Consistent section pattern**: SectionTitle → content → API Endpoints
5. **InfoBox usage** for important notes/warnings
6. **FlowStep** for step-by-step processes
7. **StatCard grids** for numerical summaries
8. **ApiEndpoint** rows for endpoint documentation
9. **DiagramBox** for visual/ASCII diagrams
10. **CodeBlock** with copy functionality for code examples
