"use client";

import { useState, useRef, useCallback } from "react";
import {
  Book, ShoppingCart, Truck, FileText, Package, Megaphone, Shield, Database, Zap, GitBranch,
  Code, ChevronRight, Search, CheckCircle2, ArrowRight, Layers, Globe, Store, Plus, Phone,
  MapPin, Building2, XCircle, AlertTriangle, Info, Lightbulb, Check, Copy, GitMerge, Workflow,
  FolderTree, Cog, Timer, Layers3, RefreshCw, Users, Eye, Lock, History, ClipboardList, Scan,
  Hand, Target, TrendingUp, Key, Table2, Server, Terminal, Download, Printer, ChevronDown,
  ChevronUp, ExternalLink, CreditCard, Banknote, Receipt, BarChart3, PieChart, Activity,
  Settings, HelpCircle, BookOpen, FileCode, Network, Boxes, Factory, Warehouse,
  CircleDollarSign, CalendarDays, Clock, Bell, Mail, Smartphone, Laptop, Cloud, ShieldCheck,
  UserCheck, FileCheck, ListChecks, PackageCheck, Gauge, LayoutDashboard, RotateCcw, ScanLine,
  FileDown, MapPinned, Tag, Milestone,
} from "lucide-react";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const DOC_VERSION = "5.0.0";
const LAST_UPDATED = "2026-02-09";

// ============================================================================
// TYPES & DATA
// ============================================================================

interface Module {
  id: string;
  name: string;
  icon: React.ElementType;
  category: "overview" | "business" | "technical" | "reference";
}

const modules: Module[] = [
  { id: "overview", name: "Prezentare Generala", icon: Book, category: "overview" },
  { id: "quickstart", name: "Ghid Rapid Start", icon: Zap, category: "overview" },
  { id: "business-flow", name: "Flux Business E2E", icon: Workflow, category: "business" },
  { id: "orders", name: "Comenzi si Procesare", icon: ShoppingCart, category: "business" },
  { id: "invoices", name: "Facturare Oblio", icon: FileText, category: "business" },
  { id: "shipping", name: "Livrare AWB", icon: Truck, category: "business" },
  { id: "returns", name: "Retururi", icon: RotateCcw, category: "business" },
  { id: "picking", name: "Picking Warehouse", icon: ClipboardList, category: "business" },
  { id: "handover", name: "Predare Curier", icon: Hand, category: "business" },
  { id: "tracking", name: "Tracking Livrari", icon: MapPinned, category: "business" },
  { id: "manifests", name: "Manifeste", icon: FileCheck, category: "business" },
  { id: "products", name: "Produse PIM", icon: Package, category: "business" },
  { id: "inventory", name: "Inventar si Stoc", icon: Warehouse, category: "business" },
  { id: "suppliers", name: "Furnizori si Achizitii", icon: Factory, category: "business" },
  { id: "advertising", name: "Advertising", icon: Megaphone, category: "business" },
  { id: "trendyol", name: "Trendyol Marketplace", icon: Globe, category: "business" },
  { id: "temu", name: "Temu Marketplace", icon: Globe, category: "business" },
  { id: "architecture", name: "Arhitectura Sistem", icon: Server, category: "technical" },
  { id: "database", name: "Baza de Date", icon: Database, category: "technical" },
  { id: "integrations", name: "Integrari Externe", icon: GitBranch, category: "technical" },
  { id: "rbac", name: "Permisiuni RBAC", icon: Shield, category: "technical" },
  { id: "settings-detail", name: "Setari Sistem", icon: Settings, category: "technical" },
  { id: "cron", name: "CRON Jobs", icon: Timer, category: "technical" },
  { id: "api", name: "API Reference", icon: Code, category: "reference" },
  { id: "env", name: "Variabile Mediu", icon: Key, category: "reference" },
  { id: "changelog", name: "Istoric Versiuni", icon: History, category: "reference" },
];

// ============================================================================
// UI COMPONENTS
// ============================================================================

function SectionTitle({ icon, children, id }: { icon: React.ReactNode; children: React.ReactNode; id?: string }) {
  return (
    <h2 id={id} className="flex items-center gap-3 text-xl font-semibold text-foreground mt-8 mb-4 print:mt-4 print:text-lg">
      <span className="text-primary print:text-black">{icon}</span>
      {children}
    </h2>
  );
}

function SubSectionTitle({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <h3 id={id} className="text-lg font-semibold text-foreground mt-6 mb-3 print:mt-3 print:text-base">
      {children}
    </h3>
  );
}

function InfoBox({ variant = "info", title, children }: { variant?: "info" | "warning" | "success" | "tip"; title: string; children: React.ReactNode; }) {
  const styles = {
    info: { bg: "bg-primary/10", border: "border-primary/30", icon: <Info className="h-5 w-5 text-primary" /> },
    warning: { bg: "bg-warning/10", border: "border-warning/30", icon: <AlertTriangle className="h-5 w-5 text-warning" /> },
    success: { bg: "bg-success/10", border: "border-success/30", icon: <CheckCircle2 className="h-5 w-5 text-success" /> },
    tip: { bg: "bg-accent", border: "border-accent-foreground/20", icon: <Lightbulb className="h-5 w-5 text-accent-foreground" /> },
  };
  const style = styles[variant];
  return (
    <div className={cn("rounded-lg border p-4 print:border-gray-300 print:bg-gray-50", style.bg, style.border)}>
      <div className="flex items-center gap-2 font-medium mb-2 text-foreground">{style.icon}{title}</div>
      <div className="text-sm text-muted-foreground print:text-gray-700">{children}</div>
    </div>
  );
}

function CodeBlock({ code, title }: { code: string; title?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div className="relative rounded-lg border border-border bg-muted overflow-hidden print:bg-gray-100 print:border-gray-300">
      {title && <div className="px-4 py-2 bg-muted/80 border-b border-border text-sm text-muted-foreground print:bg-gray-200">{title}</div>}
      <Button variant="ghost" size="sm" className="absolute top-2 right-2 text-muted-foreground hover:text-foreground print:hidden" onClick={handleCopy}>
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </Button>
      <pre className="p-4 text-sm text-foreground overflow-x-auto print:text-xs"><code>{code}</code></pre>
    </div>
  );
}

function StatCard({ label, value, description, icon }: { label: string; value: string; description: string; icon: React.ReactNode; }) {
  return (
    <Card className="print:border-gray-300">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold text-foreground print:text-xl">{value}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          <div className="text-primary print:text-gray-600">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function FeatureCard({ icon, title, description, badges }: { icon: React.ReactNode; title: string; description: string; badges: string[]; }) {
  return (
    <Card className="print:break-inside-avoid">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <span className="text-primary print:text-gray-600">{icon}</span>{title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-3">{description}</p>
        <div className="flex flex-wrap gap-1">
          {badges.map((badge, i) => (<Badge key={i} variant="secondary" className="text-xs print:bg-gray-200">{badge}</Badge>))}
        </div>
      </CardContent>
    </Card>
  );
}

function FlowStep({ steps }: { steps: { step: string; desc: string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2 p-4 bg-muted rounded-lg print:bg-gray-100">
      {steps.map((item, i, arr) => (
        <span key={i} className="flex items-center gap-2">
          <div className="text-center">
            <Badge variant="outline" className="px-3 py-1 print:border-gray-400">{item.step}</Badge>
            <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
          </div>
          {i < arr.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
        </span>
      ))}
    </div>
  );
}

function ApiEndpoint({ method, path, desc }: { method: string; path: string; desc: string }) {
  return (
    <div className="flex items-center gap-4 p-3 bg-muted rounded-lg print:bg-gray-100 print:break-inside-avoid">
      <Badge variant={method === "GET" ? "secondary" : method === "DELETE" ? "destructive" : "default"} className="w-16 justify-center print:bg-gray-300">{method}</Badge>
      <code className="text-sm font-mono text-foreground flex-1">{path}</code>
      <span className="text-xs text-muted-foreground hidden md:block">{desc}</span>
    </div>
  );
}

function DiagramBox({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("border rounded-lg overflow-hidden print:break-inside-avoid", className)}>
      <div className="px-4 py-2 bg-muted font-medium text-sm border-b print:bg-gray-200">{title}</div>
      <div className="p-4">{children}</div>
    </div>
  );
}

// ============================================================================
// CONTENT SECTIONS
// ============================================================================

function OverviewContent() {
  return (
    <div className="space-y-8">
      <div className="prose max-w-none">
        <p className="text-lg text-muted-foreground">
          <strong>ERP CashFlowSync</strong> este o platforma enterprise completa pentru gestionarea
          operatiunilor e-commerce end-to-end: import comenzi multi-canal (Shopify, Trendyol, Temu),
          facturare automata Oblio cu e-Factura SPV, AWB FanCourier, picking warehouse,
          inventar multi-depozit, advertising Meta/TikTok cu AI insights, si sistem RBAC cu 124+ permisiuni.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Module Active" value="15+" description="Functionalitati complete" icon={<Layers className="h-5 w-5" />} />
        <StatCard label="Integrari" value="10" description="Shopify, Oblio, FanCourier..." icon={<GitBranch className="h-5 w-5" />} />
        <StatCard label="Tabele DB" value="80+" description="PostgreSQL + Prisma ORM" icon={<Database className="h-5 w-5" />} />
        <StatCard label="Permisiuni RBAC" value="124" description="23 categorii granulare" icon={<Shield className="h-5 w-5" />} />
      </div>

      <SectionTitle icon={<Zap className="h-6 w-6" />}>Capabilitati Principale</SectionTitle>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <FeatureCard icon={<ShoppingCart className="h-5 w-5" />} title="Comenzi Multi-Canal"
          description="Import automat din Shopify (webhook real-time), Trendyol (CRON multi-store), Temu (sync EU/US/Global) si manual. 16 statusuri cu tranzitii automate."
          badges={["Shopify Webhook", "Trendyol", "Temu", "16 Statusuri"]} />
        <FeatureCard icon={<FileText className="h-5 w-5" />} title="Facturare Oblio"
          description="Emitere facturi automate cu serii configurabile per companie. Suport PF/PJ, e-Factura SPV, PDF storage, storno prin manifest sau PIN."
          badges={["Multi-Companie", "e-Factura", "Storno Automat"]} />
        <FeatureCard icon={<Truck className="h-5 w-5" />} title="AWB FanCourier"
          description="Generare AWB cu ramburs automat (0 pentru platite). Tracking CRON, 8 categorii status, comentarii cu imagini, duplicate prevention."
          badges={["Ramburs Auto", "Tracking", "Multi-Companie"]} />
        <FeatureCard icon={<Warehouse className="h-5 w-5" />} title="Inventar Multi-Depozit"
          description="Dual-layer stock (per-depozit + agregat). Retete BOM, transferuri inter-depozite, NIR cu verificare office, alerte stoc."
          badges={["Multi-Warehouse", "BOM/Retete", "Transferuri"]} />
        <FeatureCard icon={<ClipboardList className="h-5 w-5" />} title="Picking & Handover"
          description="Liste picking agregate, scanare barcode cu haptic feedback, sesiuni predare curier, C0 alerts, auto-finalize."
          badges={["Barcode Scan", "C0 Alerts", "Auto-Finalize"]} />
        <FeatureCard icon={<Megaphone className="h-5 w-5" />} title="Advertising Analytics"
          description="Meta Ads si TikTok Ads OAuth. Three-tier sync, ROAS per produs, alerte automate, AI insights cu Claude."
          badges={["Meta/TikTok", "AI Insights", "Auto-Alerts"]} />
        <FeatureCard icon={<RotateCcw className="h-5 w-5" />} title="Retururi & Manifeste"
          description="Scanare barcode retururi, manifest retur cu storno bulk, manifest livrare cu incasare automata, PIN security."
          badges={["Scan Retur", "Manifest Bulk", "PIN Security"]} />
        <FeatureCard icon={<Globe className="h-5 w-5" />} title="Marketplace Multi-Canal"
          description="Trendyol multi-store (RO/DE/BG/TR) cu publicare produse si AI categories. Temu (EU/US/Global) cu MD5 auth."
          badges={["Trendyol Multi-Store", "Temu", "Auto-Mapping"]} />
      </div>

      <SectionTitle icon={<Globe className="h-6 w-6" />}>Integrari Externe</SectionTitle>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { name: "Shopify", type: "E-commerce", desc: "Webhook real-time" },
          { name: "Trendyol", type: "Marketplace", desc: "Multi-store sync" },
          { name: "Temu", type: "Marketplace", desc: "EU/US/Global" },
          { name: "Oblio", type: "Facturare", desc: "e-Factura SPV" },
          { name: "FanCourier", type: "Curierat", desc: "AWB + tracking" },
          { name: "Meta Ads", type: "Advertising", desc: "FB/Instagram OAuth" },
          { name: "TikTok Ads", type: "Advertising", desc: "Marketing API" },
          { name: "Google Drive", type: "Storage", desc: "Images + backup" },
          { name: "Claude AI", type: "AI Analysis", desc: "Insights automate" },
          { name: "ANAF SPV", type: "Fiscal", desc: "e-Factura via Oblio" },
        ].map((svc, i) => (
          <Card key={i} className="text-center print:break-inside-avoid">
            <CardContent className="pt-4 pb-3">
              <p className="font-semibold text-foreground">{svc.name}</p>
              <p className="text-xs text-primary">{svc.type}</p>
              <p className="text-xs text-muted-foreground mt-1">{svc.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function QuickstartContent() {
  return (
    <div className="space-y-8">
      <div className="prose max-w-none">
        <p className="text-lg text-muted-foreground">
          Ghid pas cu pas pentru a incepe sa folosesti ERP CashFlowSync in productie.
        </p>
      </div>

      <SectionTitle icon={<ListChecks className="h-6 w-6" />}>Checklist Initial</SectionTitle>

      <div className="space-y-4">
        {[
          { step: "1", title: "Configurare Companie", desc: "Settings > Companies - CUI, adresa, date fiscale, credentiale Oblio si FanCourier per companie", status: "required" },
          { step: "2", title: "Conectare Shopify", desc: "Settings > Magazine - domain, access token, webhook secret. Comenzile vin automat prin webhook", status: "required" },
          { step: "3", title: "Configurare Oblio", desc: "Settings > Contabilitate - Credentiale API per companie, serii facturi, CIF Oblio", status: "required" },
          { step: "4", title: "Configurare FanCourier", desc: "Settings > Curieri - Client ID, username, password. Date expeditor si setari AWB default", status: "required" },
          { step: "5", title: "Configurare Depozit", desc: "Settings > Warehouses - Creare depozit primar (isPrimary). Comenzile deduc stoc din depozitul primar", status: "required" },
          { step: "6", title: "Import Produse", desc: "Products > Sync Shopify sau Import Excel. Mapare la InventoryItems pentru stock tracking", status: "optional" },
          { step: "7", title: "Configurare Utilizatori", desc: "Settings > Users - Invitatie cu roluri pre-asignate, grupuri, acces per magazin/depozit", status: "optional" },
          { step: "8", title: "Conectare Trendyol", desc: "Settings > Trendyol - Multi-store: supplierId, API key/secret, storeFrontCode", status: "optional" },
          { step: "9", title: "Conectare Temu", desc: "Settings > Temu - appKey, appSecret, accessToken, region (EU/US/Global)", status: "optional" },
        ].map((item, i) => (
          <div key={i} className="flex items-start gap-4 p-4 border rounded-lg">
            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center font-bold text-white", item.status === "required" ? "bg-primary" : "bg-muted-foreground")}>{item.step}</div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold">{item.title}</h4>
                <Badge variant={item.status === "required" ? "default" : "secondary"}>{item.status === "required" ? "Obligatoriu" : "Optional"}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <SectionTitle icon={<ShoppingCart className="h-6 w-6" />}>Prima Comanda</SectionTitle>

      <InfoBox variant="info" title="Flux Automat">
        Odata configurate integrarile, comenzile din Shopify ajung automat in sistem prin webhook.
        Poti procesa manual sau automat: validare telefon, emitere factura, generare AWB.
      </InfoBox>

      <FlowStep steps={[
        { step: "1. Verifica", desc: "Orders > vezi comanda" },
        { step: "2. Valideaza", desc: "Click Validate" },
        { step: "3. Factureaza", desc: "Click Issue Invoice" },
        { step: "4. AWB", desc: "Click Create AWB" },
        { step: "5. Picking", desc: "Adauga in lista" },
        { step: "6. Handover", desc: "Predare curier" },
      ]} />

      <SubSectionTitle>Procesare Automata (1-click)</SubSectionTitle>
      <p className="text-sm text-muted-foreground">
        Butonul <strong>Proceseaza Tot</strong> executa automat: validare + factura + AWB + creare lista picking.
        Pentru procesare batch, selecteaza comenzile si click <strong>Process Selected</strong>.
      </p>

      <SectionTitle icon={<HelpCircle className="h-6 w-6" />}>Probleme Frecvente</SectionTitle>

      <div className="space-y-3">
        {[
          { q: "Comanda ramane in PENDING", a: "Verifica telefonul - trebuie format RO valid (07XXXXXXXX)" },
          { q: "Eroare la facturare", a: "Verifica credentials Oblio si seria de facturi configurata per companie" },
          { q: "AWB nu se genereaza", a: "Verifica adresa completa si judetul sa fie valid FanCourier" },
          { q: "Stocul nu se actualizeaza", a: "Verifica maparea MasterProduct → InventoryItem in Products > Inventory Mapping" },
          { q: "Comanda in WAIT_TRANSFER", a: "Stocul nu e in depozitul primar. Creaza un transfer sau confirma manual" },
        ].map((item, i) => (
          <Card key={i}><CardContent className="pt-4 pb-3">
            <p className="font-medium text-foreground">{item.q}</p>
            <p className="text-sm text-muted-foreground">{item.a}</p>
          </CardContent></Card>
        ))}
      </div>
    </div>
  );
}

function BusinessFlowContent() {
  return (
    <div className="space-y-8">
      <div className="prose max-w-none">
        <p className="text-lg text-muted-foreground">
          Documentatie completa a fluxului de business end-to-end: de la primirea comenzii
          pana la livrarea catre client si incasarea banilor.
        </p>
      </div>

      <SectionTitle icon={<Workflow className="h-6 w-6" />}>Fluxul Principal E2E</SectionTitle>

      <DiagramBox title="Diagrama Flux Complet Comanda" className="print:break-inside-avoid">
        <div className="font-mono text-xs whitespace-pre overflow-x-auto">
{`┌──────────────┐
│   SHOPIFY    │ ─── Webhook ────▶ ┌──────────────┐
│   STORE      │                   │   COMANDA    │
└──────────────┘                   │   PENDING    │
┌──────────────┐                   └──────┬───────┘
│   TRENDYOL   │ ─── CRON Sync ──▶       │
│  MARKETPLACE │                          │
└──────────────┘                          │
┌──────────────┐                          │
│     TEMU     │ ─── CRON Sync ──▶       │
│  MARKETPLACE │                          ▼
└──────────────┘                   ┌──────────────┐
                                   │  VALIDARE    │
                                   │ Tel/Adresa   │
                                   └──────┬───────┘
                                          │
                  ┌──────────────┐        │
                  │    OBLIO     │◀───────┤
                  │  (Factura)   │        ▼
                  └──────────────┘ ┌──────────────┐
                                   │   INVOICED   │
                  ┌──────────────┐ └──────┬───────┘
                  │  FANCOURIER  │◀───────┤
                  │    (AWB)     │        ▼
                  └──────────────┘ ┌──────────────┐
                                   │ AWB_CREATED  │
                                   └──────┬───────┘
                                          ▼
                                   ┌──────────────┐
                                   │   PICKING    │
                                   └──────┬───────┘
                                          ▼
                                   ┌──────────────┐
                                   │   HANDOVER   │
                                   └──────┬───────┘
                                          ▼
                                   ┌──────────────┐
                                   │   SHIPPED    │
                                   └──────┬───────┘
                                     ┌────┴────┐
                                     ▼         ▼
                              ┌──────────┐ ┌──────────┐
                              │DELIVERED │ │ RETURNED │
                              └────┬─────┘ └────┬─────┘
                                   ▼              ▼
                              Manifest       Manifest
                              Livrare        Retur
                              (Incasare)     (Storno)`}
        </div>
      </DiagramBox>

      <SectionTitle icon={<CreditCard className="h-6 w-6" />}>Flux Financiar</SectionTitle>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-success"><CreditCard className="h-5 w-5" />Plata Online (Card)</CardTitle></CardHeader>
          <CardContent>
            <ul className="text-sm space-y-2 text-muted-foreground">
              <li><strong>financialStatus:</strong> paid</li>
              <li><strong>Factura:</strong> Emisa cu status PLATITA</li>
              <li><strong>AWB:</strong> Ramburs = 0 RON, paymentType = expeditor</li>
              <li><strong>Serviciu:</strong> Standard/Express (nu Cont Colector)</li>
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-warning"><Banknote className="h-5 w-5" />Ramburs (COD)</CardTitle></CardHeader>
          <CardContent>
            <ul className="text-sm space-y-2 text-muted-foreground">
              <li><strong>financialStatus:</strong> pending</li>
              <li><strong>Factura:</strong> Emisa cu status NEPLATITA</li>
              <li><strong>AWB:</strong> Ramburs = totalPrice, paymentType = destinatar</li>
              <li><strong>Serviciu:</strong> Auto-switch la Cont Colector</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <SectionTitle icon={<Receipt className="h-6 w-6" />}>Cele 16 Statusuri ale Comenzii</SectionTitle>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {[
          { status: "PENDING", color: "bg-muted", desc: "Comanda noua, nevalidata" },
          { status: "VALIDATED", color: "bg-primary/10", desc: "Date validate OK" },
          { status: "VALIDATION_FAILED", color: "bg-destructive/10", desc: "Date invalide (tel/adresa)" },
          { status: "WAIT_TRANSFER", color: "bg-warning/10", desc: "Asteapta transfer stoc inter-depozite" },
          { status: "INVOICE_PENDING", color: "bg-warning/10", desc: "In curs de facturare" },
          { status: "INVOICE_ERROR", color: "bg-destructive/10", desc: "Eroare Oblio API" },
          { status: "INVOICED", color: "bg-success/10", desc: "Factura emisa in Oblio" },
          { status: "AWB_PENDING", color: "bg-warning/10", desc: "In curs de generare AWB" },
          { status: "AWB_CREATED", color: "bg-success/10", desc: "AWB generat FanCourier" },
          { status: "AWB_ERROR", color: "bg-destructive/10", desc: "Eroare FanCourier API" },
          { status: "PICKING", color: "bg-primary/10", desc: "In picking warehouse" },
          { status: "PACKED", color: "bg-success/10", desc: "Colet pregatit expediere" },
          { status: "SHIPPED", color: "bg-warning/10", desc: "Predat curier, in tranzit" },
          { status: "DELIVERED", color: "bg-success/10", desc: "Livrat cu succes" },
          { status: "RETURNED", color: "bg-destructive/10", desc: "Returnat la expeditor" },
          { status: "CANCELLED", color: "bg-muted", desc: "Comanda anulata" },
        ].map((item, i) => (
          <div key={i} className={cn("flex items-center justify-between p-3 rounded-lg border print:break-inside-avoid", item.color)}>
            <div><Badge variant="outline">{item.status}</Badge><p className="text-xs text-muted-foreground mt-1">{item.desc}</p></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OrdersContent() {
  return (
    <div className="space-y-8">
      <div className="prose max-w-none">
        <p className="text-lg text-muted-foreground">
          Modulul central de comenzi gestioneaza importul multi-canal, validarea datelor,
          procesare batch (factura + AWB + picking), si urmarirea prin toate statusurile.
        </p>
      </div>

      <SectionTitle icon={<GitMerge className="h-6 w-6" />}>Surse de Comenzi</SectionTitle>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { name: "Shopify", icon: <Store className="h-8 w-8 text-success" />, type: "Webhook real-time", details: "HMAC verified, orders/create + orders/updated + orders/cancelled" },
          { name: "Trendyol", icon: <Globe className="h-8 w-8 text-warning" />, type: "CRON sync multi-store", details: "API per store, paginated, last 7 days, auto-mapping products" },
          { name: "Temu", icon: <Globe className="h-8 w-8 text-primary" />, type: "CRON sync multi-region", details: "MD5 signature auth, EU/US/Global endpoints" },
          { name: "Manual", icon: <Plus className="h-8 w-8 text-muted-foreground" />, type: "Creare din ERP", details: "Dialog cu date client, produse, adresa. source = manual" },
        ].map((src, i) => (
          <Card key={i}><CardContent className="pt-6 text-center">
            <div className="mx-auto mb-2">{src.icon}</div>
            <h3 className="font-semibold">{src.name}</h3>
            <p className="text-sm text-primary">{src.type}</p>
            <p className="text-xs text-muted-foreground mt-2">{src.details}</p>
          </CardContent></Card>
        ))}
      </div>

      <SectionTitle icon={<Layers className="h-6 w-6" />}>Functionalitati UI</SectionTitle>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card><CardContent className="pt-4">
          <h4 className="font-semibold mb-2">Actiuni Bulk</h4>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>Emite Factura - Issue invoices via Oblio API</li>
            <li>Creaza AWB - Create shipping labels via FanCourier</li>
            <li>Proceseaza Tot - Invoice + AWB + Picking list in one action</li>
            <li>Export Excel - Download orders filtered</li>
          </ul>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <h4 className="font-semibold mb-2">Per-Order Actions</h4>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>View/Edit customer data (syncs back to Shopify)</li>
            <li>Set internal custom status (user-defined nomenclator)</li>
            <li>Stock tooltips on SKU hover</li>
            <li>Transfer warning modal for pending stock transfers</li>
          </ul>
        </CardContent></Card>
      </div>

      <InfoBox variant="info" title="Multi-Companie">
        Fiecare comanda mosteneste billingCompanyId de la Store. Compania determina credentialele
        Oblio (factura) si FanCourier (AWB) care se folosesc. Intercompany settlements se trackeaza automat.
      </InfoBox>

      <SectionTitle icon={<Terminal className="h-6 w-6" />}>API Endpoints</SectionTitle>
      <div className="space-y-2">
        {[
          { method: "GET", path: "/api/orders", desc: "Lista comenzi cu paginare, filtre, sortare" },
          { method: "GET", path: "/api/orders/[id]", desc: "Detalii comanda cu LineItems, Invoice, AWB" },
          { method: "PUT", path: "/api/orders/[id]", desc: "Update date client/adresa (sync Shopify)" },
          { method: "PATCH", path: "/api/orders/[id]/status", desc: "Update internal workflow status" },
          { method: "POST", path: "/api/orders/manual", desc: "Creare comanda manuala" },
          { method: "POST", path: "/api/orders/process", desc: "Procesare: factura + AWB" },
          { method: "POST", path: "/api/orders/process-all", desc: "Batch: factura + AWB + picking list" },
          { method: "GET", path: "/api/orders/export", desc: "Export Excel cu filtre" },
          { method: "POST", path: "/api/webhooks/shopify", desc: "Webhook receiver (HMAC verified)" },
        ].map((ep, i) => <ApiEndpoint key={i} {...ep} />)}
      </div>
    </div>
  );
}

function InvoicesContent() {
  return (
    <div className="space-y-8">
      <div className="prose max-w-none">
        <p className="text-lg text-muted-foreground">
          Integrare completa cu Oblio.eu: facturare per companie cu OAuth 2.0, serii configurabile,
          e-Factura SPV, PDF storage, storno prin manifest retur sau PIN approval.
        </p>
      </div>

      <SectionTitle icon={<FileText className="h-6 w-6" />}>Flux Emitere Factura</SectionTitle>
      <FlowStep steps={[
        { step: "1. Company Resolution", desc: "Order → Store → Company" },
        { step: "2. Series Selection", desc: "Store → Company default" },
        { step: "3. Oblio API", desc: "POST create invoice" },
        { step: "4. PDF Download", desc: "GET invoice PDF" },
        { step: "5. Stock Deduction", desc: "Primary warehouse" },
        { step: "6. Activity Log", desc: "Audit trail" },
      ]} />

      <SectionTitle icon={<AlertTriangle className="h-6 w-6" />}>Coduri Eroare Facturare</SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {[
          { code: "NO_COMPANY", desc: "Store-ul nu are companie asociata" },
          { code: "NO_CREDENTIALS", desc: "Credentiale Oblio neconfigurate" },
          { code: "NO_SERIES", desc: "Nicio serie de facturi configurata" },
          { code: "TRANSFER_PENDING", desc: "Transfer stoc in curs" },
          { code: "ALREADY_ISSUED", desc: "Factura deja emisa" },
          { code: "OBLIO_ERROR", desc: "Eroare comunicare API Oblio" },
        ].map((err, i) => (
          <div key={i} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <Badge variant="destructive" className="font-mono text-xs">{err.code}</Badge>
            <span className="text-sm text-muted-foreground">{err.desc}</span>
          </div>
        ))}
      </div>

      <InfoBox variant="success" title="Logica Plata Automata">
        <ul className="text-sm space-y-1">
          <li><strong>Comanda platita online:</strong> factura emisa cu paymentStatus: paid, paidAmount: totalPrice</li>
          <li><strong>Comanda ramburs:</strong> factura cu paymentStatus: unpaid. Se marcheaza platita prin Manifest Livrare</li>
          <li><strong>Storno:</strong> prin Manifest Retur (bulk) sau PIN Approval (individual, 6-digit, 5min session)</li>
        </ul>
      </InfoBox>

      <SectionTitle icon={<Terminal className="h-6 w-6" />}>API Endpoints</SectionTitle>
      <div className="space-y-2">
        {[
          { method: "GET", path: "/api/invoices", desc: "Lista facturi cu filtre" },
          { method: "POST", path: "/api/invoices/issue", desc: "Emitere batch" },
          { method: "POST", path: "/api/invoices/[id]/cancel", desc: "Stornare in Oblio" },
          { method: "POST", path: "/api/invoices/[id]/pay", desc: "Marcare platita" },
          { method: "POST", path: "/api/invoices/[id]/collect", desc: "Incasare Oblio (Ramburs)" },
          { method: "GET", path: "/api/invoices/failed", desc: "Facturi esuate" },
          { method: "POST", path: "/api/invoices/failed", desc: "Retry factura esuata" },
        ].map((ep, i) => <ApiEndpoint key={i} {...ep} />)}
      </div>
    </div>
  );
}

function ShippingContent() {
  return (
    <div className="space-y-8">
      <div className="prose max-w-none">
        <p className="text-lg text-muted-foreground">
          Integrare completa FanCourier API v2: generare AWB per companie, ramburs automat,
          tracking CRON, comentarii cu imagini, duplicate prevention cu row-level lock.
        </p>
      </div>

      <SectionTitle icon={<Truck className="h-6 w-6" />}>Logica AWB Service</SectionTitle>
      <div className="space-y-3">
        {[
          { title: "Company Resolution", desc: "billingCompany first, fallback to store company for FanCourier credentials" },
          { title: "Duplicate Prevention", desc: "SELECT FOR UPDATE row lock prevents concurrent AWB creation for same order" },
          { title: "COD Logic", desc: "Paid → COD=0, expeditor, Standard. COD → auto-switch to Cont Colector" },
          { title: "Observations", desc: "Auto-include product list from line items in observations field" },
          { title: "Mismatch Warning", desc: "Warns if billingCompany differs from store company (needs user confirmation)" },
          { title: "Marketplace Sync", desc: "After creation, sends tracking number to Trendyol/Temu platforms" },
        ].map((item, i) => (
          <Card key={i}><CardContent className="pt-3 pb-3">
            <p className="font-semibold text-sm">{item.title}</p>
            <p className="text-xs text-muted-foreground">{item.desc}</p>
          </CardContent></Card>
        ))}
      </div>

      <SectionTitle icon={<Target className="h-6 w-6" />}>FanCourier Status Categories</SectionTitle>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {[
          { cat: "pending", codes: "Initial, Avizat", color: "bg-warning/10" },
          { cat: "in_transit", codes: "C0, C1, H0-H12, S1", color: "bg-primary/10" },
          { cat: "delivered", codes: "S2", color: "bg-success/10" },
          { cat: "returned", codes: "S6, S7, S15, S16, S33, S43", color: "bg-destructive/10" },
          { cat: "cancelled", codes: "A0-A4", color: "bg-muted" },
          { cat: "error", codes: "Address problems", color: "bg-destructive/10" },
        ].map((item, i) => (
          <div key={i} className={cn("p-3 rounded-lg border", item.color)}>
            <p className="font-semibold text-sm">{item.cat}</p>
            <p className="text-xs text-muted-foreground font-mono">{item.codes}</p>
          </div>
        ))}
      </div>

      <SectionTitle icon={<Terminal className="h-6 w-6" />}>API Endpoints</SectionTitle>
      <div className="space-y-2">
        {[
          { method: "GET", path: "/api/awb", desc: "Lista AWB-uri cu stats" },
          { method: "POST", path: "/api/awb/create", desc: "Generare batch AWB" },
          { method: "GET", path: "/api/awb/[id]", desc: "Detalii cu status history" },
          { method: "PATCH", path: "/api/awb/[id]", desc: "Refresh status FanCourier" },
          { method: "DELETE", path: "/api/awb/[id]", desc: "Anulare AWB" },
          { method: "POST", path: "/api/awb/[id]/comments", desc: "Adaugare comentarii cu imagini" },
          { method: "POST", path: "/api/awb/refresh", desc: "Bulk refresh statusuri" },
        ].map((ep, i) => <ApiEndpoint key={i} {...ep} />)}
      </div>
    </div>
  );
}

function ReturnsContent() {
  return (
    <div className="space-y-8">
      <div className="prose max-w-none">
        <p className="text-lg text-muted-foreground">
          Gestionarea retururilor: scanare barcode la depozit, mapare automata la comanda originala,
          re-adaugare stoc, manifest retur cu storno bulk al facturilor.
        </p>
      </div>

      <SectionTitle icon={<ScanLine className="h-6 w-6" />}>Flux Scanare Retur</SectionTitle>
      <FlowStep steps={[
        { step: "1. Scan AWB", desc: "Barcode 5+ chars" },
        { step: "2. Match Comanda", desc: "AWB in status retur" },
        { step: "3. Re-add Stock", desc: "Automat la depozit" },
        { step: "4. Manifest", desc: "Generare din scanate" },
        { step: "5. Storno Bulk", desc: "Cancel facturi Oblio" },
      ]} />

      <InfoBox variant="info" title="Barcode Scanner">
        Input auto-focused, auto-submit dupa 100ms idle si 5+ caractere.
        FanCourier barcodes sunt 21 chars, sistemul incearca match pe 13-char prefix.
        Feedback vizual: green=succes, red=eroare, yellow=warning.
      </InfoBox>

      <SectionTitle icon={<FileCheck className="h-6 w-6" />}>Statusuri Retur</SectionTitle>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          { status: "received", desc: "Scanat la depozit" },
          { status: "processed", desc: "Procesare inceputa" },
          { status: "stock_returned", desc: "Stoc re-adaugat" },
          { status: "invoice_reversed", desc: "Factura stornata" },
        ].map((s, i) => (
          <div key={i} className="p-3 bg-muted rounded-lg text-center">
            <Badge variant="outline">{s.status}</Badge>
            <p className="text-xs text-muted-foreground mt-1">{s.desc}</p>
          </div>
        ))}
      </div>

      <SectionTitle icon={<Terminal className="h-6 w-6" />}>API Endpoints</SectionTitle>
      <div className="space-y-2">
        {[
          { method: "GET", path: "/api/returns", desc: "Lista retururi" },
          { method: "POST", path: "/api/returns/scan", desc: "Scanare AWB retur" },
          { method: "POST", path: "/api/returns/link", desc: "Link manual retur → comanda" },
          { method: "GET", path: "/api/returns/export", desc: "Export Excel retururi" },
          { method: "POST", path: "/api/manifests/returns", desc: "Generare manifest retur" },
          { method: "POST", path: "/api/manifests/returns/[id]/process", desc: "Procesare (storno bulk)" },
        ].map((ep, i) => <ApiEndpoint key={i} {...ep} />)}
      </div>
    </div>
  );
}

function PickingContent() {
  return (
    <div className="space-y-8">
      <div className="prose max-w-none">
        <p className="text-lg text-muted-foreground">
          Liste picking agregate: grupeaza multiple AWBs intr-o singura lista pentru eficienta.
          Scanare barcode, deducere stoc non-blocking, PDF automat, notificari admin.
        </p>
      </div>

      <SectionTitle icon={<ClipboardList className="h-6 w-6" />}>Flux Picking</SectionTitle>
      <FlowStep steps={[
        { step: "1. Selectare AWBs", desc: "/picking/create" },
        { step: "2. Preview Agregate", desc: "Produse unique" },
        { step: "3. Start Picking", desc: "Claim lista" },
        { step: "4. Scan/Pick", desc: "Barcode + manual" },
        { step: "5. Finalizare", desc: "PDF + notificari" },
      ]} />

      <SectionTitle icon={<ScanLine className="h-6 w-6" />}>Scanner Barcode</SectionTitle>
      <InfoBox variant="tip" title="Caracteristici Scanner">
        <ul className="text-sm space-y-1">
          <li>Auto-submit dupa 100ms idle, match by barcode OR SKU</li>
          <li>Haptic feedback via navigator.vibrate()</li>
          <li>Deducere stoc NON-BLOCKING (erori stock nu opresc picking)</li>
          <li>5s auto-refresh pentru colaborare in timp real</li>
          <li>Produse composite: parent informational, componente pickable</li>
          <li>Quantity modal cu butoane rapide: 1, 5, 10, All</li>
        </ul>
      </InfoBox>

      <SectionTitle icon={<Terminal className="h-6 w-6" />}>API Endpoints</SectionTitle>
      <div className="space-y-2">
        {[
          { method: "GET", path: "/api/picking", desc: "Lista cu stats per status" },
          { method: "POST", path: "/api/picking", desc: "Creare din AWB IDs" },
          { method: "PATCH", path: "/api/picking/[id]", desc: "Actions: scan, pickItem, start, complete, cancel, resetItem" },
          { method: "POST", path: "/api/picking/aggregate", desc: "Preview produse agregate" },
          { method: "GET", path: "/api/picking/logs", desc: "Audit log picking" },
          { method: "GET", path: "/api/picking/[id]/print", desc: "Generare/download PDF" },
        ].map((ep, i) => <ApiEndpoint key={i} {...ep} />)}
      </div>
    </div>
  );
}


function HandoverContent() {
  return (
    <div className="space-y-8">
      <div className="prose max-w-none">
        <p className="text-lg text-muted-foreground">
          Modulul de Predare Curier gestioneaza sesiunile zilnice de predare a coletelor catre curier.
          Operatorii scaneaza fiecare AWB la momentul predarii, iar sistemul monitorizeaza discrepantele
          intre scanarile interne si confirmarile FanCourier (alerte C0). La finalul zilei, coletele
          nescanate sunt marcate automat ca NEPREDAT pentru investigare.
        </p>
      </div>

      <SectionTitle icon={<Hand className="h-6 w-6" />} id="handover-flow">Flux Predare Curier</SectionTitle>

      <FlowStep steps={[
        { step: "1. Start Sesiune", desc: "Auto-creare OPEN" },
        { step: "2. Scanare AWB", desc: "Barcode scanner" },
        { step: "3. Monitorizare", desc: "Progress bar live" },
        { step: "4. Rezolvare C0", desc: "Alerte discrepanta" },
        { step: "5. Finalizare", desc: "Manual sau CRON 20:00" },
        { step: "6. Raport", desc: "Export Excel" },
      ]} />

      <SectionTitle icon={<Timer className="h-6 w-6" />} id="handover-session">Gestiune Sesiuni</SectionTitle>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="print:break-inside-avoid">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              O Sesiune pe Zi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>Unica pe data calendaristica</li>
              <li>Auto-creare la prima accesare</li>
              <li>Upsert atomic (previne race conditions)</li>
              <li>Camp <code>date</code> unic in DB</li>
            </ul>
          </CardContent>
        </Card>
        <Card className="print:break-inside-avoid">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-blue-500" />
              Status Sesiune
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li><Badge variant="outline" className="text-green-600">OPEN</Badge> - Scanare activa</li>
              <li><Badge variant="outline" className="text-red-600">CLOSED</Badge> - Finalizata</li>
              <li>Tip inchidere: <code>auto</code> sau <code>manual</code></li>
              <li>Statistici salvate la inchidere</li>
            </ul>
          </CardContent>
        </Card>
        <Card className="print:break-inside-avoid">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-orange-500" />
              Redeschidere
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>Sesiunile CLOSED pot fi redeschise</li>
              <li>Se salveaza: <code>reopenedBy</code>, timestamp</li>
              <li>Permite scanari suplimentare</li>
              <li>AWB-urile NEPREDAT pot fi scanate</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <SectionTitle icon={<ScanLine className="h-6 w-6" />} id="handover-scanner">Scanner si Scanare AWB</SectionTitle>

      <Card className="print:break-inside-avoid">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-sm mb-3">Comportament Scanner</h4>
              <ul className="text-xs text-muted-foreground space-y-2">
                <li><strong>Auto-submit:</strong> La 100ms dupa ultima tasta (optimizat pentru scanner fizic)</li>
                <li><strong>Auto-focus:</strong> Input-ul preia focusul automat la incarcare</li>
                <li><strong>Auto-clear:</strong> Curatare automata dupa scanare</li>
                <li><strong>Feedback vizual:</strong> Flash verde (succes) sau rosu cu shake (eroare)</li>
                <li><strong>Haptic:</strong> <code>navigator.vibrate()</code> pe scan</li>
                <li><strong>Refresh:</strong> Auto-refresh la 30 secunde</li>
                <li><strong>Dezactivat:</strong> Cand sesiunea este CLOSED</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3">Logica Scanare Atomica</h4>
              <ul className="text-xs text-muted-foreground space-y-2">
                <li><strong>updateMany:</strong> Foloseste <code>updateMany</code> cu conditii WHERE pentru a preveni double-scan</li>
                <li><strong>Validari:</strong> Min 5 caractere, nu anulat, nu livrat, nu returnat</li>
                <li><strong>Re-scanare:</strong> AWB-uri din zile anterioare pot fi scanate</li>
                <li><strong>NEPREDAT:</strong> AWB-uri marcate anterior sunt actualizate automat</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <InfoBox variant="info" title="Format Barcode FanCourier">
        Barcode-urile FanCourier au 21 de caractere, dar numarul AWB stocat in baza de date
        are doar 13 caractere. Sistemul incearca mai intai match exact, apoi match pe prefix
        (primele 13 caractere din barcode-ul scanat). Aceasta logica permite scanarea directa
        a etichetelor FanCourier fara conversie manuala.
      </InfoBox>

      <SectionTitle icon={<AlertTriangle className="h-6 w-6" />} id="handover-c0">Sistem Alerte C0</SectionTitle>

      <Card className="print:break-inside-avoid border-orange-200">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground mb-4">
            Alertele C0 identifica discrepante intre confirmarile FanCourier si scanarile interne.
            Cand FanCourier confirma preluarea unui AWB (status C0) dar acesta nu a fost scanat
            intern, sistemul genereaza o alerta.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-orange-50 dark:bg-orange-950/20 p-4 rounded-lg">
              <h4 className="font-semibold text-sm mb-2 text-orange-700 dark:text-orange-400">Detectare</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>Camp <code>hasC0WithoutScan = true</code></li>
                <li>Setat la sync FanCourier via <code>markC0WithoutScan()</code></li>
                <li>Afisare banner pe pagina handover</li>
                <li>Numar C0 in statistici</li>
              </ul>
            </div>
            <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
              <h4 className="font-semibold text-sm mb-2 text-blue-700 dark:text-blue-400">Rezolvare</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li><strong>Per AWB:</strong> Marcare ca predat sau ignorare</li>
                <li><strong>Bulk:</strong> Rezolvare toate alertele simultan</li>
                <li>Actiuni: <code>resolveC0Alert()</code></li>
                <li>Filtru per magazin disponibil</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <SectionTitle icon={<Clock className="h-6 w-6" />} id="handover-autofinalize">Auto-Finalizare si NEPREDAT</SectionTitle>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="print:break-inside-avoid">
          <CardHeader>
            <CardTitle className="text-sm">CRON Auto-Finalizare</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-xs text-muted-foreground space-y-2">
              <li><strong>Ora default:</strong> 20:00 (configurabil)</li>
              <li><strong>Countdown:</strong> Timer vizibil pe pagina principala</li>
              <li><strong>Functie:</strong> <code>checkAutoFinalize()</code></li>
              <li><strong>Tip inchidere:</strong> <code>closeType = &quot;auto&quot;</code></li>
              <li><strong>Cleanup:</strong> Ruleaza si <code>markOldUnscannedAsNotHandedOver()</code></li>
              <li>AWB-urile nescanate din zilele anterioare sunt marcate NEPREDAT</li>
            </ul>
          </CardContent>
        </Card>
        <Card className="print:break-inside-avoid border-red-200">
          <CardHeader>
            <CardTitle className="text-sm">Tracker Colete Nepredate</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-xs text-muted-foreground space-y-2">
              <li><strong>Pagina:</strong> <code>/handover/not-handed</code></li>
              <li><strong>Sursa:</strong> AWB-uri cu <code>notHandedOver = true</code></li>
              <li><strong>Badge zile:</strong></li>
              <li className="ml-4"><Badge className="bg-red-100 text-red-800 text-[10px]">3+ zile</Badge> Rosu - urgente</li>
              <li className="ml-4"><Badge className="bg-orange-100 text-orange-800 text-[10px]">2 zile</Badge> Portocaliu - atentie</li>
              <li><strong>Actiune:</strong> Buton &quot;Scaneaza acum&quot; per AWB</li>
              <li><strong>Link FanCourier:</strong> Status cod cu tooltip</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <SectionTitle icon={<BarChart3 className="h-6 w-6" />} id="handover-reports">Rapoarte si Export</SectionTitle>

      <Card className="print:break-inside-avoid">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground mb-3">
            Pagina <code>/handover/report</code> permite vizualizarea rapoartelor istorice
            de predare pe orice data, cu filtrare per magazin.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <h4 className="font-semibold text-xs mb-2">Tab &quot;Predate&quot;</h4>
              <p className="text-xs text-muted-foreground">AWB-uri predate cu succes: AWB, comanda, magazin, destinatar, ora scanare, confirmare C0</p>
            </div>
            <div>
              <h4 className="font-semibold text-xs mb-2">Tab &quot;Nepredate&quot;</h4>
              <p className="text-xs text-muted-foreground">AWB-uri nescanate cu badge &quot;Nescanat&quot;, motiv nepredare</p>
            </div>
            <div>
              <h4 className="font-semibold text-xs mb-2">Tab &quot;Zile anterioare&quot;</h4>
              <p className="text-xs text-muted-foreground">AWB-uri din zile anterioare scanate in ziua raportului</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <InfoBox variant="tip" title="Filtru Multi-Magazin">
        Toate vizualizarile suporta filtrare per magazin (storeId). Statisticile,
        lista AWB-urilor si rapoartele pot fi filtrate individual pe fiecare magazin.
      </InfoBox>

      <SectionTitle icon={<Terminal className="h-6 w-6" />} id="handover-api">API Endpoints</SectionTitle>

      <div className="space-y-2">
        {[
          { method: "GET" as const, path: "/api/handover/today", desc: "AWB-uri azi, statistici, status sesiune" },
          { method: "POST" as const, path: "/api/handover/scan", desc: "Scanare AWB (validare sesiune OPEN)" },
          { method: "POST" as const, path: "/api/handover/finalize", desc: "Finalizare manuala sesiune" },
          { method: "POST" as const, path: "/api/handover/reopen", desc: "Redeschidere sesiune CLOSED" },
          { method: "GET" as const, path: "/api/handover/not-handed", desc: "Lista AWB-uri nepredate (toate zilele)" },
          { method: "GET" as const, path: "/api/handover/c0-alerts", desc: "Alerte C0 curente" },
          { method: "POST" as const, path: "/api/handover/c0-alerts", desc: "Rezolvare alerte C0 (per-AWB sau bulk)" },
          { method: "GET" as const, path: "/api/handover/report", desc: "Raport istoric pentru o data" },
          { method: "GET" as const, path: "/api/handover/report/export", desc: "Export Excel raport handover" },
        ].map((ep, i) => (
          <ApiEndpoint key={i} {...ep} />
        ))}
      </div>
    </div>
  );
}

function TrackingContent() {
  return (
    <div className="space-y-8">
      <div className="prose max-w-none">
        <p className="text-lg text-muted-foreground">
          Dashboard unificat de monitorizare AWB-uri cu statusuri FanCourier in timp real.
          Ofera vizualizare per status, explicatii detaliate pentru fiecare cod de status,
          istoric complet al tranzitiei si cautare avansata.
        </p>
      </div>

      <SectionTitle icon={<BarChart3 className="h-6 w-6" />} id="tracking-stats">Grid Statistici Dinamice</SectionTitle>

      <Card className="print:break-inside-avoid">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground mb-4">
            Grid-ul de statistici genereaza automat cate un card pentru fiecare cod de status
            FanCourier prezent in baza de date. Click pe un card filtreaza lista AWB-urilor.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Total", color: "bg-gray-100 dark:bg-gray-800" },
              { label: "In Tranzit", color: "bg-blue-100 dark:bg-blue-900/30" },
              { label: "Livrate", color: "bg-green-100 dark:bg-green-900/30" },
              { label: "Returnate", color: "bg-orange-100 dark:bg-orange-900/30" },
            ].map((s, i) => (
              <div key={i} className={cn("p-3 rounded-lg text-center", s.color)}>
                <p className="text-xs font-medium">{s.label}</p>
                <p className="text-lg font-bold">--</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Fiecare card are buton info care deschide modal-ul de explicare status.
            Suma cardurilor este verificata contra totalului.
          </p>
        </CardContent>
      </Card>

      <SectionTitle icon={<Search className="h-6 w-6" />} id="tracking-search">Cautare si Filtrare</SectionTitle>

      <InfoBox variant="info" title="Cautare Multi-Camp">
        Cautarea functioneaza simultan pe: numar AWB, numar comanda, nume client si adresa de livrare.
        Rezultatele sunt afisate ca si carduri colapsabile cu detalii complete.
      </InfoBox>

      <SectionTitle icon={<Layers className="h-6 w-6" />} id="tracking-categories">Categorii Status si Stilizare</SectionTitle>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { category: "pending", label: "In Asteptare", color: "border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20", icon: "Clock" },
          { category: "in_transit", label: "In Tranzit", color: "border-blue-300 bg-blue-50 dark:bg-blue-950/20", icon: "Truck" },
          { category: "delivered", label: "Livrat", color: "border-green-300 bg-green-50 dark:bg-green-950/20", icon: "CheckCircle2" },
          { category: "returned", label: "Returnat", color: "border-orange-300 bg-orange-50 dark:bg-orange-950/20", icon: "RotateCcw" },
          { category: "cancelled", label: "Anulat", color: "border-red-300 bg-red-50 dark:bg-red-950/20", icon: "XCircle" },
          { category: "error", label: "Eroare", color: "border-red-300 bg-red-50 dark:bg-red-950/20", icon: "AlertTriangle" },
        ].map((cat, i) => (
          <Card key={i} className={cn("print:break-inside-avoid", cat.color)}>
            <CardContent className="pt-4 pb-3">
              <p className="font-semibold text-sm">{cat.label}</p>
              <p className="text-xs text-muted-foreground font-mono">{cat.category}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <SectionTitle icon={<HelpCircle className="h-6 w-6" />} id="tracking-status-modal">Modal Explicare Status</SectionTitle>

      <Card className="print:break-inside-avoid">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground mb-4">
            Fiecare cod de status FanCourier are un modal dedicat cu doua sectiuni:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
              <h4 className="font-semibold text-sm mb-2">&quot;Ce inseamna?&quot;</h4>
              <p className="text-xs text-muted-foreground">
                Explicatie detaliata a statusului: ce s-a intamplat cu coletul,
                daca este un status final sau tranzitoriu, si contextul general.
              </p>
            </div>
            <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg">
              <h4 className="font-semibold text-sm mb-2">&quot;Ce trebuie sa faci?&quot;</h4>
              <p className="text-xs text-muted-foreground">
                Actiuni recomandate pentru operator: ce pasi trebuie urmati,
                daca trebuie contactat clientul sau curierul, etc.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <SectionTitle icon={<Table2 className="h-6 w-6" />} id="tracking-codes">Coduri Status FanCourier</SectionTitle>

      <Card className="print:break-inside-avoid">
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2 font-semibold">Cod</th>
                  <th className="text-left py-2 px-2 font-semibold">Categorie</th>
                  <th className="text-left py-2 px-2 font-semibold">Semnificatie</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                {[
                  { code: "C0", cat: "Preluare", desc: "Colet preluat de curier" },
                  { code: "C1", cat: "Preluare", desc: "Colet inregistrat in sistem" },
                  { code: "H0-H12", cat: "Tranzit", desc: "In hub / sortare / transfer intre depozite" },
                  { code: "S1", cat: "Livrare", desc: "Colet in livrare (la curier)" },
                  { code: "S2", cat: "Livrat", desc: "Livrat cu succes (status final)" },
                  { code: "S6", cat: "Retur", desc: "Retur in curs" },
                  { code: "S7", cat: "Retur", desc: "Returnat la expeditor (status final)" },
                  { code: "S15", cat: "Refuz", desc: "Refuzat de destinatar" },
                  { code: "S16", cat: "Redirectare", desc: "Redirectat la alta adresa" },
                  { code: "S33", cat: "Retur partial", desc: "Retur partial" },
                  { code: "A0-A4", cat: "Anulare", desc: "Anulat / sters din manifest" },
                ].map((row, i) => (
                  <tr key={i} className="border-b border-dashed">
                    <td className="py-2 px-2 font-mono font-semibold">{row.code}</td>
                    <td className="py-2 px-2">{row.cat}</td>
                    <td className="py-2 px-2">{row.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <SectionTitle icon={<History className="h-6 w-6" />} id="tracking-timeline">Istoric Status Timeline</SectionTitle>

      <InfoBox variant="tip" title="Timeline Complet">
        Fiecare AWB are un istoric complet al tuturor schimbarilor de status. Expandarea
        cardului AWB afiseaza un timeline vertical cu puncte colorate, timestamp-uri,
        locatii si descrieri. Detaliile includ: destinatar, telefon, adresa, oras, serviciu,
        tip plata, valoare ramburs si link catre comanda.
      </InfoBox>

      <SectionTitle icon={<Terminal className="h-6 w-6" />} id="tracking-api">API Endpoints</SectionTitle>

      <div className="space-y-2">
        {[
          { method: "GET" as const, path: "/api/tracking", desc: "AWB-uri cu detalii comanda si istoric statusuri" },
          { method: "POST" as const, path: "/api/tracking/refresh", desc: "Trigger sincronizare statusuri FanCourier" },
        ].map((ep, i) => (
          <ApiEndpoint key={i} {...ep} />
        ))}
      </div>
    </div>
  );
}

function ManifestsContent() {
  return (
    <div className="space-y-8">
      <div className="prose max-w-none">
        <p className="text-lg text-muted-foreground">
          Sistemul de manifeste gestioneaza doua fluxuri financiare critice: manifestul de livrare
          (incasare facturi pentru coletele livrate) si manifestul de retur (stornare facturi pentru
          coletele returnate). Include si monitorizarea expeditiilor blocate.
        </p>
      </div>

      <SectionTitle icon={<Receipt className="h-6 w-6" />} id="manifest-delivery">Manifest Livrare</SectionTitle>

      <FlowStep steps={[
        { step: "1. Selectare Data", desc: "Companie + data livrare" },
        { step: "2. Preluare AWB", desc: "Status S2 (livrat)" },
        { step: "3. DRAFT", desc: "Revizuire manifest" },
        { step: "4. CONFIRMED", desc: "Confirmare continut" },
        { step: "5. PROCESSED", desc: "Facturi incasate in Oblio" },
      ]} />

      <Card className="print:break-inside-avoid">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-sm mb-3">Cum functioneaza</h4>
              <ul className="text-xs text-muted-foreground space-y-2">
                <li>Preia AWB-uri livrate (cod S2) pentru o data specifica din DB-ul local (sincronizat de auto-sync)</li>
                <li>Leaga fiecare AWB de factura aferenta</li>
                <li>Creaza manifest cu status DRAFT</li>
                <li>Dupa confirmare, procesarea marcheaza facturile ca platite in Oblio</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3">Procesare Plata</h4>
              <ul className="text-xs text-muted-foreground space-y-2">
                <li><strong>API Oblio:</strong> <code>collectInvoice()</code></li>
                <li><strong>Tip plata:</strong> &quot;Ramburs&quot; (cash on delivery)</li>
                <li><strong>Tracking:</strong> <code>paymentSource = MANIFEST_DELIVERY</code></li>
                <li><strong>Procesare:</strong> Individual per item (erorile nu opresc batch-ul)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <SectionTitle icon={<RotateCcw className="h-6 w-6" />} id="manifest-return">Manifest Retur</SectionTitle>

      <FlowStep steps={[
        { step: "1. Scanare Retururi", desc: "ReturnAWB-uri primite" },
        { step: "2. Generare", desc: "Colecteaza nesortate" },
        { step: "3. DRAFT", desc: "Revizuire manifest" },
        { step: "4. CONFIRMED", desc: "Verificare office" },
        { step: "5. PROCESSED", desc: "Stornare facturi in Oblio" },
      ]} />

      <Card className="print:break-inside-avoid">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-sm mb-3">Cum functioneaza</h4>
              <ul className="text-xs text-muted-foreground space-y-2">
                <li>Generat din ReturnAWB-uri scanate cu status &quot;received&quot; sau &quot;processed&quot;</li>
                <li>Leaga returnul de AWB-ul original si factura asociata</li>
                <li>Filtreaza returnurile deja incluse in alt manifest neprocesat</li>
                <li>Stocul este readaugat automat la scanarea returnului</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3">Procesare Stornare</h4>
              <ul className="text-xs text-muted-foreground space-y-2">
                <li><strong>Bulk stornare:</strong> Anuleaza toate facturile asociate in Oblio</li>
                <li><strong>Tracking:</strong> <code>cancellationSource = MANIFEST_RETURN</code></li>
                <li><strong>Procesare:</strong> Individual per item (erorile nu opresc batch-ul)</li>
                <li><strong>Rezultat:</strong> Status per item (succes/eroare cu mesaj)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InfoBox variant="success" title="Manifest Livrare">
          Marcheaza facturile ca platite prin Oblio API cu tipul de plata &quot;Ramburs&quot;.
          Folosit zilnic pentru reconcilierea incasarilor din livrari cash-on-delivery.
        </InfoBox>
        <InfoBox variant="warning" title="Manifest Retur">
          Anuleaza (storneaza) facturile aferente returnurilor prin Oblio API.
          Stocul este readaugat automat la momentul scanarii returnului, nu la procesarea manifestului.
        </InfoBox>
      </div>

      <SectionTitle icon={<AlertTriangle className="h-6 w-6" />} id="manifest-stuck">Expeditii Blocate</SectionTitle>

      <Card className="print:break-inside-avoid">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground mb-4">
            Pagina <code>/reports/stuck-shipments</code> afiseaza AWB-urile mai vechi de N zile
            (default 3) care nu au fost inca livrate sau returnate.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <StatCard
              label="Total Blocate"
              value="--"
              description="AWB-uri fara rezolutie"
              icon={<Package className="h-4 w-4" />}
            />
            <StatCard
              label="> 7 Zile"
              value="--"
              description="Urgente (badge rosu)"
              icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
            />
            <StatCard
              label="5-7 Zile"
              value="--"
              description="Atentie (badge portocaliu)"
              icon={<Clock className="h-4 w-4 text-orange-500" />}
            />
          </div>
          <div className="mt-4">
            <ul className="text-xs text-muted-foreground space-y-1">
              <li><strong>Filtru:</strong> Minim zile ajustabil (1-30)</li>
              <li><strong>Badge varsta:</strong> Colorat pe baza numarului de zile (rosu, portocaliu)</li>
              <li><strong>Telefon:</strong> Link clickable <code>tel:</code> pentru contactare client</li>
              <li><strong>Export:</strong> CSV cu toate datele</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <SectionTitle icon={<Terminal className="h-6 w-6" />} id="manifest-api">API Endpoints</SectionTitle>

      <div className="space-y-2">
        {[
          { method: "GET" as const, path: "/api/manifests/deliveries", desc: "Lista manifeste livrare" },
          { method: "POST" as const, path: "/api/manifests/deliveries", desc: "Generare manifest livrare (data + companie)" },
          { method: "GET" as const, path: "/api/manifests/deliveries/[id]", desc: "Detalii manifest livrare" },
          { method: "POST" as const, path: "/api/manifests/deliveries/[id]/process", desc: "Procesare incasare (bulk Oblio)" },
          { method: "GET" as const, path: "/api/manifests/returns", desc: "Lista manifeste retur" },
          { method: "POST" as const, path: "/api/manifests/returns", desc: "Generare manifest retur (din scanari)" },
          { method: "GET" as const, path: "/api/manifests/returns/[id]", desc: "Detalii manifest retur" },
          { method: "PATCH" as const, path: "/api/manifests/returns/[id]", desc: "Confirmare manifest retur" },
          { method: "POST" as const, path: "/api/manifests/returns/[id]/process", desc: "Procesare stornare (bulk Oblio)" },
          { method: "GET" as const, path: "/api/reports/stuck-shipments", desc: "Expeditii blocate (>N zile)" },
        ].map((ep, i) => (
          <ApiEndpoint key={i} {...ep} />
        ))}
      </div>
    </div>
  );
}

function ProductsContent() {
  return (
    <div className="space-y-8">
      <div className="prose max-w-none">
        <p className="text-lg text-muted-foreground">
          Sistemul PIM (Product Information Management) gestioneaza catalogul central de produse
          prin modelul MasterProduct - sursa unica de adevar pentru toate canalele de vanzare.
          Suporta publicare multi-canal, sincronizare imagini Google Drive, retete/BOM,
          mapare inventar si operatiuni bulk.
        </p>
      </div>

      <SectionTitle icon={<Database className="h-6 w-6" />} id="pim-masterproduct">MasterProduct - Sursa Unica de Adevar</SectionTitle>

      <Card className="print:break-inside-avoid">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-sm mb-3">Campuri Principale</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li><strong>SKU:</strong> Cod unic, imutabil dupa creare</li>
                <li><strong>Barcode:</strong> EAN-13 pentru scanare</li>
                <li><strong>Titlu / Descriere:</strong> Rich text</li>
                <li><strong>Pret / Compare At Price:</strong> Pret vanzare si pret vechi</li>
                <li><strong>Tags:</strong> Etichete multiple</li>
                <li><strong>Greutate:</strong> Pentru transport</li>
                <li><strong>Locatie depozit:</strong> Ex: &quot;A-12-3&quot;</li>
                <li><strong>Categorie:</strong> FK la Category</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3">Campuri Trendyol</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li><code>trendyolBarcode</code> - Barcode Trendyol</li>
                <li><code>trendyolBrandId/Name</code> - Brand marketplace</li>
                <li><code>trendyolProductId</code> - ID extern</li>
                <li><code>trendyolStatus</code> - Status publicare</li>
                <li><code>trendyolCategoryId</code> - Categorie marketplace</li>
                <li><code>trendyolAttributes</code> - JSON atribute</li>
                <li><code>trendyolAttributeValues</code> - Valori atribute</li>
                <li><code>trendyolError</code> - Erori publicare</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <SectionTitle icon={<Globe className="h-6 w-6" />} id="pim-multichannel">Publicare Multi-Canal</SectionTitle>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FeatureCard
          icon={<Store className="h-5 w-5" />}
          title="Shopify"
          description="Sincronizare bidirectionala produse, preturi si stoc. Handle-uri backfill. Collection mapping per magazin."
          badges={["externalId", "sync", "overrides"]}
        />
        <FeatureCard
          icon={<Globe className="h-5 w-5" />}
          title="Trendyol"
          description="Publicare cu categorii, brand-uri si atribute specifice. Batch request tracking. EAN-13 barcode."
          badges={["batch", "categories", "attributes"]}
        />
        <FeatureCard
          icon={<ShoppingCart className="h-5 w-5" />}
          title="eMAG"
          description="Canal disponibil in sistem. Override-uri per-canal pentru titlu si pret diferentiat."
          badges={["channel", "overrides"]}
        />
      </div>

      <Card className="print:break-inside-avoid">
        <CardContent className="pt-6">
          <h4 className="font-semibold text-sm mb-3">MasterProductChannel - Override-uri Per Canal</h4>
          <p className="text-xs text-muted-foreground mb-3">
            Fiecare produs poate avea setari diferite pe fiecare canal de vanzare prin
            tabelul de legatura MasterProductChannel:
          </p>
          <div className="bg-muted p-4 rounded-lg font-mono text-xs">
{`MasterProduct (SKU: PROD-001, Pret: 99 RON)
├── Shopify Canal 1:  isPublished=true,  externalId="8234567890"
│   └── overrides: { title: "Produs Premium", price: 109 }
├── Trendyol RO:      isPublished=true,  externalId="ty-12345"
│   └── overrides: { price: 89 }  (pret competitiv)
└── eMAG:             isPublished=false  (nepublicat inca)`}
          </div>
        </CardContent>
      </Card>

      <SectionTitle icon={<Cloud className="h-6 w-6" />} id="pim-images">Sincronizare Imagini Google Drive</SectionTitle>

      <InfoBox variant="info" title="Imagini din Google Drive">
        Fiecare produs are un <code>driveFolderUrl</code> de unde imaginile sunt sincronizate automat.
        Pozitia 0 este imaginea principala. Imaginile sunt tracked prin <code>driveFileId</code> si
        <code>driveModified</code> pentru a detecta schimbarile. Sincronizarea se face prin
        endpoint-ul <code>POST /api/products/sync-images</code>.
      </InfoBox>

      <SectionTitle icon={<Workflow className="h-6 w-6" />} id="pim-recipes">Sistem Retete / BOM</SectionTitle>

      <Card className="print:break-inside-avoid">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground mb-4">
            Produsele compuse (<code>isComposite = true</code>) au o lista de componente
            definita prin modelul ProductRecipe. La vanzare, stocul se scade automat
            din fiecare componenta.
          </p>
          <div className="bg-muted p-4 rounded-lg font-mono text-xs">
{`ProductRecipe (parentProductId → componentProductId)
├── quantity: Decimal(10,3) - cantitate per unitate parinte
├── unit: string - unitate masura
├── sortOrder: int - ordine afisare
└── Unic pe [parentProductId, componentProductId]`}
          </div>
        </CardContent>
      </Card>

      <SectionTitle icon={<Layers className="h-6 w-6" />} id="pim-inventory">Mapare Inventar</SectionTitle>

      <Card className="print:break-inside-avoid">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground mb-3">
            Pagina <code>/products/inventory-mapping</code> permite legarea unui MasterProduct
            de un InventoryItem pentru sincronizarea stocului:
          </p>
          <div className="bg-muted p-3 rounded-lg font-mono text-xs">
{`MasterProduct.inventoryItemId → InventoryItem
    └── Sync stoc via POST /api/products/sync-stock
    └── warehouseLocation folosit pentru picking`}
          </div>
        </CardContent>
      </Card>

      <SectionTitle icon={<Boxes className="h-6 w-6" />} id="pim-bulk">Operatiuni Bulk</SectionTitle>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { op: "Import", desc: "CSV/Excel bulk", icon: <FileInput className="h-4 w-4" /> },
          { op: "Export", desc: "CSV download", icon: <FileDown className="h-4 w-4" /> },
          { op: "Bulk Publish", desc: "Publicare multi-canal", icon: <Globe className="h-4 w-4" /> },
          { op: "Bulk Delete", desc: "Stergere in masa", icon: <XCircle className="h-4 w-4" /> },
        ].map((item, i) => (
          <Card key={i} className="print:break-inside-avoid text-center">
            <CardContent className="pt-4 pb-3">
              <div className="flex justify-center mb-2">{item.icon}</div>
              <p className="font-semibold text-sm">{item.op}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <SectionTitle icon={<LayoutDashboard className="h-6 w-6" />} id="pim-pages">Pagini Modul</SectionTitle>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[
          { path: "/products", name: "Catalog Produse", desc: "Lista principala cu status publicare multi-canal, cautare, filtre" },
          { path: "/products/[id]", name: "Detaliu Produs", desc: "Editor complet: info, imagini, canale, atribute Trendyol" },
          { path: "/products/recipes", name: "Retete / BOM", desc: "Gestiune produse compuse cu componente" },
          { path: "/products/inventory-mapping", name: "Mapare Inventar", desc: "Legare MasterProduct la InventoryItem" },
        ].map((page, i) => (
          <Card key={i} className="print:break-inside-avoid">
            <CardContent className="pt-4 pb-3">
              <p className="font-mono text-xs text-primary">{page.path}</p>
              <p className="font-semibold text-sm">{page.name}</p>
              <p className="text-xs text-muted-foreground">{page.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <SectionTitle icon={<Terminal className="h-6 w-6" />} id="pim-api">API Endpoints</SectionTitle>

      <div className="space-y-2">
        {[
          { method: "GET" as const, path: "/api/products", desc: "Lista MasterProducts cu filtre" },
          { method: "POST" as const, path: "/api/products", desc: "Creare produs nou" },
          { method: "GET" as const, path: "/api/products/[id]", desc: "Detalii produs" },
          { method: "PUT" as const, path: "/api/products/[id]", desc: "Actualizare produs" },
          { method: "DELETE" as const, path: "/api/products/[id]", desc: "Stergere produs" },
          { method: "GET" as const, path: "/api/products/[id]/channels", desc: "Canale produs" },
          { method: "PUT" as const, path: "/api/products/[id]/channels", desc: "Actualizare canale" },
          { method: "GET" as const, path: "/api/products/recipes", desc: "Lista retete/BOM" },
          { method: "POST" as const, path: "/api/products/recipes", desc: "Creare/actualizare reteta" },
          { method: "GET" as const, path: "/api/products/inventory-mapping", desc: "Mapari inventar" },
          { method: "POST" as const, path: "/api/products/inventory-mapping", desc: "Creare mapare" },
          { method: "POST" as const, path: "/api/products/import", desc: "Import bulk produse" },
          { method: "GET" as const, path: "/api/products/export", desc: "Export CSV produse" },
          { method: "POST" as const, path: "/api/products/bulk-publish", desc: "Publicare bulk pe canale" },
          { method: "POST" as const, path: "/api/products/sync-images", desc: "Sync imagini Google Drive" },
        ].map((ep, i) => (
          <ApiEndpoint key={i} {...ep} />
        ))}
      </div>
    </div>
  );
}

function InventoryContent() {
  return (
    <div className="space-y-8">
      <div className="prose max-w-none">
        <p className="text-lg text-muted-foreground">
          Sistem complet de gestiune inventar multi-depozit cu tracking stoc dual-layer,
          miscari de stoc auditabile, transferuri inter-depozit, ajustari manuale si
          rapoarte istorice. Suporta atat articole individuale cat si produse compuse (BOM/retete).
        </p>
      </div>

      <SectionTitle icon={<Layers3 className="h-6 w-6" />} id="inv-dual-layer">Sistem Dual-Layer Stoc</SectionTitle>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="print:break-inside-avoid border-blue-200">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Database className="h-4 w-4 text-blue-500" />
              InventoryItem.currentStock
            </CardTitle>
            <CardDescription>Stoc agregat total</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>Suma automata din toate depozitele</li>
              <li>Decimal(10,3) pentru unitati fractionare</li>
              <li>Actualizat in tranzactie la fiecare miscare</li>
              <li>Folosit pentru afisare si alerte rapide</li>
            </ul>
          </CardContent>
        </Card>
        <Card className="print:break-inside-avoid border-green-200">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Warehouse className="h-4 w-4 text-green-500" />
              WarehouseStock.currentStock
            </CardTitle>
            <CardDescription>Stoc per depozit (sursa de adevar)</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>Cheie compusa unica: [warehouseId, itemId]</li>
              <li>Decimal(10,3) per depozit</li>
              <li>MinStock per depozit (optional)</li>
              <li>Sursa de adevar pentru operatiuni</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card className="print:break-inside-avoid">
        <CardContent className="pt-6">
          <h4 className="font-semibold text-sm mb-3">Mecanism Sincronizare in Tranzactie</h4>
          <div className="bg-muted p-4 rounded-lg font-mono text-xs">
{`prisma.$transaction(async (tx) => {
  // 1. Update WarehouseStock (depozit specific)
  await tx.warehouseStock.update({ currentStock -= qty })

  // 2. Recalculeaza total din toate depozitele
  const total = await tx.warehouseStock.aggregate({
    _sum: { currentStock: true },
    where: { itemId }
  })

  // 3. Update InventoryItem.currentStock cu noul total
  await tx.inventoryItem.update({ currentStock: total })

  // 4. Creeaza InventoryStockMovement (audit trail)
})`}
          </div>
        </CardContent>
      </Card>

      <SectionTitle icon={<GitBranch className="h-6 w-6" />} id="inv-movement-types">Tipuri Miscari de Stoc</SectionTitle>

      <Card className="print:break-inside-avoid">
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2 font-semibold">Tip</th>
                  <th className="text-left py-2 px-2 font-semibold">Directie</th>
                  <th className="text-left py-2 px-2 font-semibold">Declansat de</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                {[
                  { type: "RECEIPT", dir: "+ (intrare)", trigger: "Finalizare receptie marfa (NIR)" },
                  { type: "SALE", dir: "- (iesire)", trigger: "Facturare comanda / fulfillment" },
                  { type: "ADJUSTMENT_PLUS", dir: "+ (intrare)", trigger: "Ajustare manuala pozitiva" },
                  { type: "ADJUSTMENT_MINUS", dir: "- (iesire)", trigger: "Ajustare manuala negativa" },
                  { type: "RECIPE_OUT", dir: "- (iesire)", trigger: "Productie articol compus" },
                  { type: "RETURN", dir: "+ (intrare)", trigger: "Retur client" },
                  { type: "TRANSFER", dir: "+/- (pereche)", trigger: "Transfer inter-depozit" },
                ].map((row, i) => (
                  <tr key={i} className="border-b border-dashed">
                    <td className="py-2 px-2 font-mono font-semibold">{row.type}</td>
                    <td className="py-2 px-2">
                      <Badge variant="outline" className={row.dir.includes("+") && !row.dir.includes("-") ? "text-green-600" : row.dir.includes("-") && !row.dir.includes("+") ? "text-red-600" : "text-blue-600"}>
                        {row.dir}
                      </Badge>
                    </td>
                    <td className="py-2 px-2">{row.trigger}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <SectionTitle icon={<Warehouse className="h-6 w-6" />} id="inv-multi-warehouse">Multi-Depozit</SectionTitle>

      <Card className="print:break-inside-avoid">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-sm mb-3">Model Warehouse</h4>
              <ul className="text-xs text-muted-foreground space-y-2">
                <li><strong>code:</strong> Unic (ex: &quot;DEP-01&quot;, &quot;DEP-CENTRAL&quot;)</li>
                <li><strong>isPrimary:</strong> Un singur depozit principal (pentru vanzari)</li>
                <li><strong>isOperational:</strong> Depozitul din care se expediaza</li>
                <li><strong>isActive:</strong> Toggle activ/inactiv</li>
                <li><strong>sortOrder:</strong> Ordine afisare</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3">Reguli Cheie</h4>
              <ul className="text-xs text-muted-foreground space-y-2">
                <li>Comenzile scad stocul din depozitul <strong>primar</strong></li>
                <li>Un singur depozit poate fi primar</li>
                <li>Depozitele inactive nu pot primi transferuri</li>
                <li>Stergere doar daca nu are stoc sau miscari</li>
                <li>Acces per utilizator via <code>UserWarehouseAccess</code></li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <SubSectionTitle id="inv-transfers">Transferuri Inter-Depozit</SubSectionTitle>

      <FlowStep steps={[
        { step: "1. Creare DRAFT", desc: "Selectare sursa/destinatie" },
        { step: "2. Adaugare Articole", desc: "Cantitati de transferat" },
        { step: "3. Preview", desc: "Verificare stoc sursa" },
        { step: "4. Executare", desc: "Miscare atomica stoc" },
      ]} />

      <Card className="print:break-inside-avoid">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-sm mb-2">Detalii Transfer</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li><strong>Numar:</strong> <code>TRF-YYYYMMDD-NNN</code></li>
                <li><strong>Status:</strong> DRAFT &rarr; COMPLETED sau CANCELLED</li>
                <li><strong>Snapshot:</strong> Stoc inainte/dupa salvat per item</li>
                <li><strong>Pereche miscari:</strong> Negativ in sursa, pozitiv in destinatie</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2">Restrictii</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li className="text-red-600 font-medium">Nu se pot transfera articole compuse</li>
                <li>Utilizatorul trebuie sa aiba acces la ambele depozite</li>
                <li>Ambele depozite trebuie sa fie active</li>
                <li>Validare stoc suficient in depozitul sursa</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <SectionTitle icon={<Settings className="h-6 w-6" />} id="inv-adjustments">Ajustari Manuale Stoc</SectionTitle>

      <Card className="print:break-inside-avoid">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground mb-3">
            Ajustarile sunt constiente de depozit si ofera motive predefinite:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-xs mb-2 text-green-600">Motive Plus (+)</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>Surplus inventar</li>
                <li>Retur</li>
                <li>Corectie eroare</li>
                <li>Stoc initial</li>
                <li>Primire transfer</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-xs mb-2 text-red-600">Motive Minus (-)</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>Lipsa inventar</li>
                <li>Deteriorat / expirat</li>
                <li>Corectie eroare</li>
                <li>Pierdere / furt</li>
                <li>Consum intern</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <SectionTitle icon={<BarChart3 className="h-6 w-6" />} id="inv-reports">Rapoarte Stoc</SectionTitle>

      <Card className="print:break-inside-avoid">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground mb-3">
            Pagina <code>/inventory/reports/stock</code> ofera raportare istorica bazata pe data:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {[
              { label: "Total articole", desc: "In raport" },
              { label: "Valoare la data", desc: "Cost * cantitate" },
              { label: "Valoare curenta", desc: "Comparatie live" },
              { label: "Sub minim", desc: "Alerta stoc" },
              { label: "Epuizat", desc: "Stoc = 0" },
            ].map((s, i) => (
              <div key={i} className="bg-muted p-2 rounded text-center">
                <p className="text-xs font-semibold">{s.label}</p>
                <p className="text-[10px] text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
          <ul className="text-xs text-muted-foreground space-y-1 mt-3">
            <li><strong>Filtre:</strong> Data raport, cautare SKU/nume, furnizor, tip articol, toggle &quot;Doar alerte&quot;</li>
            <li><strong>Tabel:</strong> SKU, articol, furnizor, stoc la data, stoc curent, diferenta cu trend, cost, valoare, status</li>
            <li><strong>Status:</strong> <Badge variant="outline" className="text-green-600 text-[10px]">OK</Badge> <Badge variant="outline" className="text-orange-600 text-[10px]">Minimum</Badge> <Badge variant="outline" className="text-red-600 text-[10px]">Lipsa</Badge></li>
            <li><strong>Export:</strong> CSV download cu totaluri</li>
          </ul>
        </CardContent>
      </Card>

      <SectionTitle icon={<PackageSearch className="h-6 w-6" />} id="inv-items-features">Functionalitati Articole</SectionTitle>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="print:break-inside-avoid">
          <CardHeader>
            <CardTitle className="text-sm">Dashboard si Filtre</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>Carduri statistici: Total, Individual, Compus, Stoc scazut</li>
              <li>Cautare: SKU sau nume</li>
              <li>Filtre: tip (individual/compus), status stoc, depozit</li>
              <li>Coloane dinamice per depozit activ</li>
              <li>Indicator mapare e-commerce (Link2 icon)</li>
              <li>Paginare: 25/50/100/250/All</li>
            </ul>
          </CardContent>
        </Card>
        <Card className="print:break-inside-avoid">
          <CardHeader>
            <CardTitle className="text-sm">Import / Export</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li><strong>Import Excel:</strong> 4 moduri: upsert, create, update, stock_only</li>
              <li>Flag optional: &quot;sterge articolele nelistate&quot;</li>
              <li><strong>Export CSV:</strong> Download complet catalog</li>
              <li>Selectie multipla + operatiuni bulk (stergere)</li>
              <li>Stergere cu confirmare (afiseaza produse mapate)</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <SectionTitle icon={<Terminal className="h-6 w-6" />} id="inv-api">API Endpoints Principale</SectionTitle>

      <div className="space-y-2">
        {[
          { method: "GET" as const, path: "/api/inventory-items", desc: "Lista articole inventar cu stoc per depozit" },
          { method: "POST" as const, path: "/api/inventory-items", desc: "Creare articol nou" },
          { method: "PUT" as const, path: "/api/inventory-items", desc: "Actualizare articol" },
          { method: "DELETE" as const, path: "/api/inventory-items", desc: "Stergere articol" },
          { method: "GET" as const, path: "/api/inventory-items/[id]/warehouse-stock", desc: "Stoc per depozit pentru articol" },
          { method: "POST" as const, path: "/api/inventory-items/stock-adjustment", desc: "Ajustare manuala stoc (depozit-aware)" },
          { method: "GET" as const, path: "/api/inventory-items/stock-report", desc: "Raport stoc istoric" },
          { method: "GET" as const, path: "/api/inventory-items/low-stock-alerts", desc: "Articole sub stoc minim" },
          { method: "POST" as const, path: "/api/inventory-items/import", desc: "Import Excel articole" },
          { method: "GET" as const, path: "/api/inventory-items/export", desc: "Export CSV articole" },
          { method: "GET" as const, path: "/api/transfers", desc: "Lista transferuri inter-depozit" },
          { method: "POST" as const, path: "/api/transfers", desc: "Creare transfer nou" },
          { method: "POST" as const, path: "/api/transfers/[id]/execute", desc: "Executare transfer (atomic)" },
          { method: "POST" as const, path: "/api/transfers/[id]/cancel", desc: "Anulare transfer DRAFT" },
          { method: "GET" as const, path: "/api/warehouses", desc: "Lista depozite" },
          { method: "POST" as const, path: "/api/warehouses/[id]/set-primary", desc: "Setare depozit primar" },
        ].map((ep, i) => (
          <ApiEndpoint key={i} {...ep} />
        ))}
      </div>
    </div>
  );
}

function SuppliersContent() {
  return (
    <div className="space-y-8">
      <div className="prose max-w-none">
        <p className="text-lg text-muted-foreground">
          Modulul de furnizori si aprovizionare acopera intregul ciclu de achizitie:
          gestiunea furnizorilor, comenzi de aprovizionare (PO), receptia marfii in depozit
          cu verificare office, facturi furnizor si sistemul de retete/BOM pentru articole compuse.
        </p>
      </div>

      <SectionTitle icon={<Building2 className="h-6 w-6" />} id="suppliers-mgmt">Gestiune Furnizori</SectionTitle>

      <Card className="print:break-inside-avoid">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-sm mb-3">Date Furnizor</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li><strong>Identificare:</strong> Nume (unic), Cod intern</li>
                <li><strong>Contact:</strong> Persoana, email, telefon</li>
                <li><strong>Adresa:</strong> Strada, oras, judet, cod postal, tara</li>
                <li><strong>Date fiscale:</strong> CIF/CUI, Reg. Com., IBAN, banca</li>
                <li><strong>Note:</strong> Text liber observatii</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3">Operatiuni</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li><strong>CRUD:</strong> Dialog inline creare/editare</li>
                <li><strong>Soft-delete:</strong> Dezactivare daca are relatii</li>
                <li><strong>Hard-delete:</strong> Stergere completa daca nu are relatii</li>
                <li><strong>Cautare:</strong> Dupa nume, CIF sau email</li>
                <li><strong>Statistici:</strong> Total, activi, inactivi</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <SectionTitle icon={<ClipboardList className="h-6 w-6" />} id="suppliers-po">Comenzi Aprovizionare (Purchase Orders)</SectionTitle>

      <FlowStep steps={[
        { step: "DRAFT", desc: "Editare continut" },
        { step: "APROBATA", desc: "Manager aproba" },
        { step: "IN_RECEPTIE", desc: "Depozit primeste" },
        { step: "RECEPTIONATA", desc: "Complet primita" },
      ]} />

      <InfoBox variant="warning" title="Anulare">
        O comanda de aprovizionare poate fi anulata (ANULATA) din orice status.
        Anularea nu afecteaza stocul - doar impiedica procesarea ulterioara.
      </InfoBox>

      <Card className="print:break-inside-avoid">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-sm mb-3">Structura PO</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li><strong>Document:</strong> <code>PC-DD/MM/YYYY-NNNN</code></li>
                <li><strong>Furnizor:</strong> FK la Supplier</li>
                <li><strong>Data estimata:</strong> Livrare asteptata</li>
                <li><strong>Items:</strong> InventoryItem + cantitate + pret unitar</li>
                <li><strong>Totaluri:</strong> Articole, cantitate, valoare</li>
                <li><strong>Aprobare:</strong> User, timestamp</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3">Etichete PO (Labels)</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>Generate dupa aprobarea PO</li>
                <li>Cod unic scanabil (barcode/QR)</li>
                <li>Printabile pentru depozit</li>
                <li>Tracking: printed flag + timestamp</li>
                <li>Folosite la receptia fizica</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <SectionTitle icon={<PackageCheck className="h-6 w-6" />} id="suppliers-reception">Flux Receptie Marfa (7 Pasi)</SectionTitle>

      <div className="space-y-3">
        {[
          { step: "1", title: "Creare PO si Aprobare", desc: "Se creeaza comanda de aprovizionare, managerul o aproba (DRAFT -> APROBATA). Se pot genera etichete pentru depozit.", color: "bg-blue-50 dark:bg-blue-950/20" },
          { step: "2", title: "Dashboard Depozit", desc: "Pagina /inventory/reception afiseaza: PO-uri in asteptare (cu avertisment intarziere), receptii active si receptii completate azi.", color: "bg-indigo-50 dark:bg-indigo-950/20" },
          { step: "3", title: "Start Receptie", desc: "Depozitarul apasa 'Incepe receptia' -> se creeaza Proces Verbal (PV) cu numar PV-DD/MM/YYYY-NNNN. Redirectare la pagina de completare.", color: "bg-violet-50 dark:bg-violet-950/20" },
          { step: "4", title: "Completare PV", desc: "Se compara cantitati asteptate vs primite per articol. Diferentele sunt marcate cu observatii obligatorii. Se incarca fotografii (4 categorii: panorama, etichete, deteriorari, factura).", color: "bg-purple-50 dark:bg-purple-950/20" },
          { step: "5", title: "Verificare Office", desc: "NIR-ul generat automat apare in /inventory/receipts/office cu status TRIMIS_OFFICE. Staff-ul office verifica si schimba statusul la VERIFICAT.", color: "bg-fuchsia-50 dark:bg-fuchsia-950/20" },
          { step: "6", title: "Aprobare Diferente", desc: "Daca exista diferente, NIR-ul apare in /inventory/receipts/pending-approval. Managerul aproba (APROBAT) sau respinge (RESPINS) diferentele.", color: "bg-pink-50 dark:bg-pink-950/20" },
          { step: "7", title: "Transfer in Stoc", desc: "NIR-ul aprobat este transferat in stoc: cantitatile primite sunt adaugate in depozit, se creeaza miscari RECEIPT si statusul devine IN_STOC.", color: "bg-rose-50 dark:bg-rose-950/20" },
        ].map((item, i) => (
          <Card key={i} className={cn("print:break-inside-avoid", item.color)}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                  {item.step}
                </div>
                <div>
                  <p className="font-semibold text-sm">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="print:break-inside-avoid">
        <CardContent className="pt-6">
          <h4 className="font-semibold text-sm mb-3">Statusuri NIR (Goods Receipt)</h4>
          <div className="bg-muted p-4 rounded-lg font-mono text-xs">
{`DRAFT → GENERAT → TRIMIS_OFFICE → VERIFICAT → APROBAT → IN_STOC
                                              ↓
                                           RESPINS`}
          </div>
          <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { status: "GENERAT", desc: "Auto-creat din PV" },
              { status: "TRIMIS_OFFICE", desc: "Trimis spre verificare" },
              { status: "VERIFICAT", desc: "Office a confirmat" },
              { status: "APROBAT", desc: "Diferente acceptate" },
              { status: "IN_STOC", desc: "Stoc actualizat" },
              { status: "RESPINS", desc: "Diferente respinse" },
            ].map((s, i) => (
              <div key={i} className="text-center p-2 bg-background rounded border">
                <Badge variant="outline" className="text-[10px]">{s.status}</Badge>
                <p className="text-[10px] text-muted-foreground mt-1">{s.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <SectionTitle icon={<CreditCard className="h-6 w-6" />} id="suppliers-invoices">Facturi Furnizor</SectionTitle>

      <Card className="print:break-inside-avoid">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-sm mb-3">Campuri Factura</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>Serie + numar factura (unic per furnizor)</li>
                <li>Data factura, valoare neta, TVA, total brut</li>
                <li>Data scadenta plata</li>
                <li>Link optional la PO</li>
                <li>Document scanat (cale fisier)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3">Status Plata</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li><Badge variant="outline" className="text-red-600 text-[10px]">NEPLATITA</Badge> - Neplata</li>
                <li><Badge variant="outline" className="text-orange-600 text-[10px]">PARTIAL_PLATITA</Badge> - Plata partiala</li>
                <li><Badge variant="outline" className="text-green-600 text-[10px]">PLATITA</Badge> - Platita integral</li>
                <li className="text-red-600 font-medium mt-2">Facturile restante sunt evidentiate cu rosu</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <SectionTitle icon={<Workflow className="h-6 w-6" />} id="suppliers-recipes">Retete / BOM (Articole Compuse)</SectionTitle>

      <Card className="print:break-inside-avoid">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-sm mb-3">Model Reteta</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li><strong>compositeItemId:</strong> Articolul parinte</li>
                <li><strong>componentItemId:</strong> Ingredientul</li>
                <li><strong>quantity:</strong> Decimal(10,3) per unitate parinte</li>
                <li><strong>Unic:</strong> [compositeItemId, componentItemId]</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3">Capacitate Productie</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>Calcul: <code>min(stocComponent / cantitateNecesara)</code></li>
                <li>Identifica <strong>componenta limitanta</strong> (bottleneck)</li>
                <li>Status: Definita / Stoc insuficient / Fara reteta</li>
                <li>Cost reteta calculat din componentele</li>
              </ul>
            </div>
          </div>
          <div className="mt-4 bg-muted p-3 rounded-lg font-mono text-xs">
{`Vanzare 1x Articol Compus:
  checkInventoryItemStock() → verifica TOATE componentele
  deductInventoryStock()    → scade din FIECARE componenta
  Miscare stoc per componenta: "Vanzare - Component pentru {nume}"`}
          </div>
        </CardContent>
      </Card>

      <SectionTitle icon={<Terminal className="h-6 w-6" />} id="suppliers-api">API Endpoints</SectionTitle>

      <div className="space-y-2">
        {[
          { method: "GET" as const, path: "/api/suppliers", desc: "Lista furnizori (cautare, filtru activi)" },
          { method: "POST" as const, path: "/api/suppliers", desc: "Creare furnizor" },
          { method: "PUT" as const, path: "/api/suppliers", desc: "Actualizare furnizor" },
          { method: "DELETE" as const, path: "/api/suppliers?id=", desc: "Stergere/dezactivare furnizor" },
          { method: "GET" as const, path: "/api/purchase-orders", desc: "Lista comenzi aprovizionare" },
          { method: "POST" as const, path: "/api/purchase-orders", desc: "Creare PO" },
          { method: "POST" as const, path: "/api/purchase-orders/[id]/approve", desc: "Aprobare PO" },
          { method: "GET" as const, path: "/api/purchase-orders/[id]/labels", desc: "Etichete PO" },
          { method: "GET" as const, path: "/api/goods-receipts", desc: "Lista NIR-uri" },
          { method: "POST" as const, path: "/api/goods-receipts", desc: "Creare NIR manual" },
          { method: "POST" as const, path: "/api/goods-receipts/[id]/send-office", desc: "Trimite la office" },
          { method: "POST" as const, path: "/api/goods-receipts/[id]/verify", desc: "Verificare office" },
          { method: "POST" as const, path: "/api/goods-receipts/[id]/approve-differences", desc: "Aprobare diferente" },
          { method: "POST" as const, path: "/api/goods-receipts/[id]/reject", desc: "Respingere NIR" },
          { method: "POST" as const, path: "/api/goods-receipts/[id]/transfer-stock", desc: "Transfer in stoc" },
        ].map((ep, i) => (
          <ApiEndpoint key={i} {...ep} />
        ))}
      </div>
    </div>
  );
}

function AdvertisingContent() {
  return (
    <div className="space-y-8">
      <div className="prose max-w-none">
        <p className="text-lg text-muted-foreground">
          Sistem centralizat de management publicitar pentru Meta (Facebook/Instagram) si TikTok.
          Include conectare OAuth, sincronizare campanii pe 3 niveluri, tracking KPI-uri,
          alerte automate cu actiuni, AI insights si creare campanii directa din ERP.
        </p>
      </div>

      <SectionTitle icon={<Key className="h-6 w-6" />} id="ads-oauth">Autentificare OAuth</SectionTitle>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="print:break-inside-avoid border-blue-200">
          <CardHeader>
            <CardTitle className="text-sm text-blue-600">Meta Ads (Facebook/Instagram)</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-xs text-muted-foreground space-y-2">
              <li><strong>API:</strong> Facebook Graph API v21.0</li>
              <li><strong>Scopes:</strong> ads_read, ads_management</li>
              <li><strong>Token:</strong> Long-lived (60 zile)</li>
              <li><strong>Refresh:</strong> Automat inainte de expirare</li>
              <li><strong>Multi-app:</strong> Suport pentru mai multi Business Managers</li>
            </ul>
          </CardContent>
        </Card>
        <Card className="print:break-inside-avoid border-red-200">
          <CardHeader>
            <CardTitle className="text-sm text-red-600">TikTok Ads</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-xs text-muted-foreground space-y-2">
              <li><strong>API:</strong> TikTok Business API v1.3</li>
              <li><strong>Scopes:</strong> ad.read, ad.write</li>
              <li><strong>Token:</strong> Short-lived + refresh token</li>
              <li><strong>Auth header:</strong> Access-Token</li>
              <li><strong>Multi-advertiser:</strong> Mai multi advertisers per cont</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <SectionTitle icon={<TrendingUp className="h-6 w-6" />} id="ads-metrics">KPI-uri Tracked</SectionTitle>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { metric: "Spend", desc: "Cost total campanie" },
          { metric: "Impressions", desc: "Numar afisari" },
          { metric: "Reach", desc: "Utilizatori unici" },
          { metric: "Clicks", desc: "Click-uri pe reclama" },
          { metric: "CTR", desc: "Click-through rate" },
          { metric: "CPC", desc: "Cost per click" },
          { metric: "CPM", desc: "Cost per 1000 afisari" },
          { metric: "CPA", desc: "Cost per achizitie" },
          { metric: "Conversions", desc: "Numar achizitii" },
          { metric: "Revenue", desc: "Venituri generate" },
          { metric: "ROAS", desc: "Return on ad spend" },
          { metric: "Frequency", desc: "Frecventa afisare" },
        ].map((item, i) => (
          <Card key={i} className="print:break-inside-avoid text-center">
            <CardContent className="pt-3 pb-2">
              <p className="font-semibold text-sm">{item.metric}</p>
              <p className="text-[10px] text-muted-foreground">{item.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <SectionTitle icon={<Tag className="h-6 w-6" />} id="ads-naming">Conventie Denumire Campanii</SectionTitle>

      <Card className="print:break-inside-avoid">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground mb-3">
            Sistemul parseaza numele campaniilor pentru a extrage automat obiectivul,
            tipul, produsele asociate si audienta.
          </p>
          <CodeBlock
            title="Format Denumire"
            code={`[OBJECTIVE]_[TYPE]_[CODE]_[AUDIENCE]_[DATE]

Exemplu: CONV_SKU_PAT001-PAT002_BROAD_2024Q1

Parsat automat:
  Objective: CONV (Conversions)
  Type:      SKU (Product-specific)
  Codes:     PAT001, PAT002 → auto-map la MasterProducts
  Audience:  BROAD
  Date:      2024Q1

Obiective: CONV / TRAFFIC / AWARE / CATALOG
Tipuri:    SKU / CAT / ALL
namingValid: boolean - indica daca conventia este respectata`}
          />
        </CardContent>
      </Card>

      <SectionTitle icon={<RefreshCw className="h-6 w-6" />} id="ads-sync">Strategie Sincronizare 3-Tier</SectionTitle>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="print:break-inside-avoid border-green-200">
          <CardHeader>
            <CardTitle className="text-sm text-green-600">Light Sync</CardTitle>
            <CardDescription>CRON la 30 minute</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>Doar campanii + insights agregate</li>
              <li>Rapid, consum API minim</li>
              <li>Actualizeaza spend, impressions, clicks</li>
              <li>Functie: <code>syncMetaAccountLight()</code></li>
            </ul>
          </CardContent>
        </Card>
        <Card className="print:break-inside-avoid border-blue-200">
          <CardHeader>
            <CardTitle className="text-sm text-blue-600">Full Sync</CardTitle>
            <CardDescription>La cerere / periodic</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>Campanii + Ad Sets + Ads</li>
              <li>Progress tracking cu resume</li>
              <li>Salvare stare in AdsSyncJob</li>
              <li>Functie: <code>syncMetaAccount()</code></li>
            </ul>
          </CardContent>
        </Card>
        <Card className="print:break-inside-avoid border-purple-200">
          <CardHeader>
            <CardTitle className="text-sm text-purple-600">Detail Sync</CardTitle>
            <CardDescription>Lazy loading</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>Detalii campanie specifica</li>
              <li>Incarcare la vizualizare</li>
              <li>Insights istorice cu date range</li>
              <li>Functie: <code>syncCampaignDetails()</code></li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <InfoBox variant="info" title="Rate Limit Handling">
        Sistemul implementeaza exponential backoff la rate limit: 5min, 15min, 30min, 1h, 2h.
        Sync job-urile sunt pauzte cu <code>retryAt</code> timestamp si pot fi reluate automat
        din ultima pozitie procesata prin starea salvata in <code>AdsSyncJob</code>.
      </InfoBox>

      <SectionTitle icon={<Bell className="h-6 w-6" />} id="ads-alerts">Sistem Alerte Avansate</SectionTitle>

      <Card className="print:break-inside-avoid">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-sm mb-3">Scope Alerte</h4>
              <ul className="text-xs text-muted-foreground space-y-2">
                <li><Badge variant="outline" className="text-[10px]">ALL</Badge> Toate campaniile</li>
                <li><Badge variant="outline" className="text-[10px]">PLATFORM</Badge> Per platforma (Meta/TikTok)</li>
                <li><Badge variant="outline" className="text-[10px]">SKU</Badge> Per produs specific</li>
                <li><Badge variant="outline" className="text-[10px]">CAMPAIGNS</Badge> Campanii selectate manual</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3">Actiuni Automate</h4>
              <ul className="text-xs text-muted-foreground space-y-2">
                <li><strong>NOTIFY:</strong> Notificare (email, in-app)</li>
                <li><strong>PAUSE:</strong> Oprire automata campanie</li>
                <li><strong>REDUCE_BUDGET:</strong> Reducere budget cu procent</li>
                <li><strong>Auto-rollback:</strong> Restaurare stare originala dupa X ore</li>
                <li><strong>Cooldown:</strong> Previne re-declansare pe aceeasi campanie</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <SectionTitle icon={<Lightbulb className="h-6 w-6" />} id="ads-ai">AI Insights</SectionTitle>

      <Card className="print:break-inside-avoid">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground mb-4">
            Sistemul genereaza sugestii bazate pe AI pentru optimizarea performantei.
            Fiecare insight are un scor de incredere si impact estimat.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-sm mb-2">Tipuri Insight</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li><code>PRODUCT_PRICE</code> - Sugestie modificare pret</li>
                <li><code>PRODUCT_STOCK</code> - Alerta stoc pentru produse promovate</li>
                <li><code>AD_BUDGET</code> - Optimizare budget campanie</li>
                <li><code>AD_STATUS</code> - Sugestie pornire/oprire</li>
                <li><code>AD_BID</code> - Ajustare bid</li>
                <li><code>AD_TARGETING</code> - Optimizare targeting</li>
                <li><code>GENERAL</code> - Observatii generale</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2">Lifecycle Insight</h4>
              <div className="bg-muted p-3 rounded-lg font-mono text-xs">
{`AIAnalysisRun → AIInsight (PENDING)
  ├── User aplica → APPLIED + AIActionLog
  ├── User respinge → DISMISSED + AIActionLog
  └── Expira → EXPIRED

Tracking:
  confidence: 0-100%
  estimatedImpact: text
  outcomeMetrics: masurare rezultat`}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <SectionTitle icon={<Plus className="h-6 w-6" />} id="ads-creation">Creare Campanii</SectionTitle>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="print:break-inside-avoid">
          <CardHeader>
            <CardTitle className="text-sm">Meta Objectives</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>Awareness</li>
              <li>Engagement</li>
              <li>Traffic</li>
              <li>Leads</li>
              <li>Sales</li>
              <li>App Promotion</li>
            </ul>
            <p className="text-[10px] text-muted-foreground mt-2">Ierarhie: Campaign &rarr; Ad Set (targeting, budget) &rarr; Ad (creative)</p>
          </CardContent>
        </Card>
        <Card className="print:break-inside-avoid">
          <CardHeader>
            <CardTitle className="text-sm">TikTok Objectives</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>Reach</li>
              <li>Traffic</li>
              <li>Video Views</li>
              <li>Lead Generation</li>
              <li>Conversions</li>
              <li>Product Sales</li>
            </ul>
            <p className="text-[10px] text-muted-foreground mt-2">Ierarhie: Campaign &rarr; Ad Group (targeting, budget) &rarr; Ad (creative)</p>
          </CardContent>
        </Card>
      </div>

      <SectionTitle icon={<Terminal className="h-6 w-6" />} id="ads-api">API Endpoints</SectionTitle>

      <div className="space-y-2">
        {[
          { method: "GET" as const, path: "/api/ads/settings", desc: "Setari platforma (OAuth credentials)" },
          { method: "PUT" as const, path: "/api/ads/settings", desc: "Actualizare setari" },
          { method: "GET" as const, path: "/api/ads/apps", desc: "Lista OAuth apps per platforma" },
          { method: "POST" as const, path: "/api/ads/apps", desc: "Adaugare OAuth app" },
          { method: "GET" as const, path: "/api/ads/accounts", desc: "Lista conturi conectate" },
          { method: "POST" as const, path: "/api/ads/accounts/connect", desc: "Initiere OAuth connect" },
          { method: "GET" as const, path: "/api/ads/accounts/callback/meta", desc: "Meta OAuth callback" },
          { method: "GET" as const, path: "/api/ads/accounts/callback/tiktok", desc: "TikTok OAuth callback" },
          { method: "GET" as const, path: "/api/ads/accounts/[id]/sync-status", desc: "Status sync job" },
          { method: "GET" as const, path: "/api/ads/campaigns", desc: "Lista campanii cu filtre" },
          { method: "POST" as const, path: "/api/ads/campaigns/create", desc: "Creare campanie noua" },
          { method: "GET" as const, path: "/api/ads/campaigns/[id]", desc: "Detalii campanie" },
          { method: "GET" as const, path: "/api/ads/campaigns/[id]/insights", desc: "Insights istorice cu date range" },
          { method: "POST" as const, path: "/api/ads/campaigns/[id]/refresh", desc: "Refresh metrici campanie" },
          { method: "GET" as const, path: "/api/ads/campaigns/[id]/compare", desc: "Comparare doua perioade" },
          { method: "GET" as const, path: "/api/ads/products", desc: "Mapari campanie-produs" },
          { method: "POST" as const, path: "/api/ads/products", desc: "Creare mapare produs" },
          { method: "GET" as const, path: "/api/ads/stats", desc: "Statistici agregate dashboard" },
          { method: "GET" as const, path: "/api/ads/alerts/rules", desc: "Reguli alerte configurate" },
        ].map((ep, i) => (
          <ApiEndpoint key={i} {...ep} />
        ))}
      </div>
    </div>
  );
}

function TrendyolContent() {
  return (
    <div className="space-y-8">
      <div className="prose max-w-none">
        <p className="text-lg text-muted-foreground">
          Integrare completa cu marketplace-ul Trendyol pentru Romania, Germania, Bulgaria si Turcia.
          Suporta multi-store cu credentiale separate, sincronizare comenzi, publicare produse
          cu categorii si atribute, sync facturi si AWB-uri inapoi la Trendyol.
        </p>
      </div>

      <SectionTitle icon={<Store className="h-6 w-6" />} id="trendyol-multistore">Multi-Store Support</SectionTitle>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { code: "RO", label: "Romania", flag: "🇷🇴" },
          { code: "DE", label: "Germania", flag: "🇩🇪" },
          { code: "BG", label: "Bulgaria", flag: "🇧🇬" },
          { code: "TR", label: "Turcia", flag: "🇹🇷" },
        ].map((store, i) => (
          <Card key={i} className="print:break-inside-avoid text-center">
            <CardContent className="pt-4 pb-3">
              <p className="text-2xl mb-1">{store.flag}</p>
              <p className="font-semibold text-sm">{store.label}</p>
              <Badge variant="outline" className="text-[10px] mt-1">{store.code}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="print:break-inside-avoid">
        <CardContent className="pt-6">
          <h4 className="font-semibold text-sm mb-3">TrendyolStore Model</h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li><strong>Credentiale:</strong> supplierId, apiKey, apiSecret per magazin</li>
            <li><strong>storeFrontCode:</strong> RO / DE / BG / TR (determina endpoint-ul API)</li>
            <li><strong>Configurare:</strong> isTestMode, defaultBrandId, currencyRate, invoiceSeriesName</li>
            <li><strong>Webhook:</strong> webhookSecret per magazin pentru validare HMAC</li>
            <li><strong>Multi-entity:</strong> FK la Company pentru suport multi-companie</li>
          </ul>
        </CardContent>
      </Card>

      <SectionTitle icon={<Lock className="h-6 w-6" />} id="trendyol-auth">Autentificare si Client API</SectionTitle>

      <Card className="print:break-inside-avoid">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-sm mb-3">TrendyolClient</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li><strong>Auth:</strong> Basic Auth (Base64 API_KEY:API_SECRET)</li>
                <li><strong>Bypass:</strong> Cloudflare headers (User-Agent spoofing)</li>
                <li><strong>Metode:</strong> Categories, Brands, Products CRUD, Orders, Webhooks</li>
                <li><strong>Connection test:</strong> Incearca mai multe storeFrontCodes</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3">Functionalitati Speciale</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li><strong>Dictionar TR &rarr; RO:</strong> 100+ perechi traducere categorii</li>
                <li><strong>EAN-13:</strong> <code>generateBarcode(sku)</code> pentru listare</li>
                <li><strong>Batch tracking:</strong> <code>getBatchRequestResult()</code></li>
                <li><strong>AI categorie:</strong> Sugestie categorie automata</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <SectionTitle icon={<RefreshCw className="h-6 w-6" />} id="trendyol-ordersync">Sincronizare Comenzi</SectionTitle>

      <FlowStep steps={[
        { step: "1. Multi-Store", desc: "Fetch stores active" },
        { step: "2. TrendyolClient", desc: "Creare per magazin" },
        { step: "3. Paginare", desc: "Ultimele 7 zile" },
        { step: "4. Upsert", desc: "TrendyolOrder + Items" },
        { step: "5. Auto-Map", desc: "Barcode/SKU matching" },
      ]} />

      <Card className="print:break-inside-avoid">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground mb-3">
            Fluxul de sincronizare proceseaza fiecare magazin activ separat:
          </p>
          <ul className="text-xs text-muted-foreground space-y-2">
            <li><strong>Deduplicare:</strong> Upsert pe <code>trendyolOrderId</code> (unic)</li>
            <li><strong>Date client:</strong> Nume, email, telefon, adresa completa</li>
            <li><strong>Financiar:</strong> totalPrice, currency (default TRY)</li>
            <li><strong>Auto-mapping produse:</strong> barcode &rarr; trendyolBarcode &rarr; SKU</li>
            <li><strong>TrendyolProductMapping:</strong> Creat automat la match reusit</li>
          </ul>
        </CardContent>
      </Card>

      <SectionTitle icon={<Globe className="h-6 w-6" />} id="trendyol-publish">Publicare Produse</SectionTitle>

      <Card className="print:break-inside-avoid">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-sm mb-3">Flux Publicare</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>Selectare categorie Trendyol (cu traducere automata)</li>
                <li>Selectare brand (cautare publica)</li>
                <li>Completare atribute obligatorii per categorie</li>
                <li>Upload imagini</li>
                <li>Setare pret si stoc</li>
                <li>Submit ca batch request</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3">Sync Inapoi la Trendyol</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li><strong>Factura:</strong> Link Oblio trimis via <code>sendInvoiceLink()</code></li>
                <li><strong>AWB:</strong> Numar tracking local via <code>updateTrackingNumber()</code></li>
                <li><strong>Stoc:</strong> <code>updatePriceAndInventory()</code> periodic</li>
                <li><strong>Status comanda:</strong> Normalizare Trendyol &rarr; local</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <SectionTitle icon={<LayoutDashboard className="h-6 w-6" />} id="trendyol-pages">Pagini Modul</SectionTitle>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[
          { path: "/trendyol", name: "Dashboard", desc: "Lista produse Trendyol cu multi-store, cautare barcode, filtre aprobare" },
          { path: "/trendyol/orders", name: "Comenzi", desc: "Lista comenzi Trendyol cu filtre status" },
          { path: "/trendyol/mapping", name: "Mapare Produse", desc: "Mapare manuala barcode Trendyol la SKU local" },
          { path: "/trendyol/publish", name: "Publicare", desc: "Publicare MasterProducts cu categorie/brand/atribute" },
        ].map((page, i) => (
          <Card key={i} className="print:break-inside-avoid">
            <CardContent className="pt-4 pb-3">
              <p className="font-mono text-xs text-primary">{page.path}</p>
              <p className="font-semibold text-sm">{page.name}</p>
              <p className="text-xs text-muted-foreground">{page.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <SectionTitle icon={<Terminal className="h-6 w-6" />} id="trendyol-api">API Endpoints</SectionTitle>

      <div className="space-y-2">
        {[
          { method: "GET" as const, path: "/api/trendyol", desc: "Date generale Trendyol" },
          { method: "GET" as const, path: "/api/trendyol/stores", desc: "Lista magazine Trendyol" },
          { method: "POST" as const, path: "/api/trendyol/stores", desc: "Creare magazin nou" },
          { method: "PUT" as const, path: "/api/trendyol/stores/[id]", desc: "Editare magazin" },
          { method: "POST" as const, path: "/api/trendyol/stores/[id]/test", desc: "Test conexiune magazin" },
          { method: "GET" as const, path: "/api/trendyol/orders", desc: "Lista comenzi Trendyol" },
          { method: "GET" as const, path: "/api/trendyol/mapping", desc: "Lista mapari produse" },
          { method: "POST" as const, path: "/api/trendyol/mapping", desc: "Creare mapare produs" },
          { method: "GET" as const, path: "/api/trendyol/stats", desc: "Statistici dashboard" },
          { method: "GET" as const, path: "/api/trendyol/attributes", desc: "Atribute categorie Trendyol" },
          { method: "POST" as const, path: "/api/trendyol/category-suggest", desc: "Sugestie categorie AI" },
          { method: "POST" as const, path: "/api/trendyol/webhook/[storeId]", desc: "Webhook per magazin (HMAC)" },
        ].map((ep, i) => (
          <ApiEndpoint key={i} {...ep} />
        ))}
      </div>
    </div>
  );
}

function TemuContent() {
  return (
    <div className="space-y-8">
      <div className="prose max-w-none">
        <p className="text-lg text-muted-foreground">
          Integrare cu marketplace-ul Temu pentru regiunile EU, US si Global.
          Gestioneaza sincronizarea comenzilor, actualizarea stocului si preturilor,
          si trimiterea informatiilor de tracking (AWB) inapoi catre Temu.
        </p>
      </div>

      <SectionTitle icon={<Globe className="h-6 w-6" />} id="temu-multistore">Multi-Store si Regiuni</SectionTitle>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { region: "EU", endpoint: "openapi-b-eu.temu.com", desc: "Europa (default EUR)" },
          { region: "US", endpoint: "openapi-b-us.temu.com", desc: "Statele Unite (USD)" },
          { region: "GLOBAL", endpoint: "openapi-b.temu.com", desc: "Global (multi-currency)" },
        ].map((r, i) => (
          <Card key={i} className="print:break-inside-avoid">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <MapPinned className="h-4 w-4" />
                {r.region}
              </CardTitle>
              <CardDescription className="font-mono text-[10px]">{r.endpoint}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{r.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <SectionTitle icon={<Fingerprint className="h-6 w-6" />} id="temu-auth">Autentificare MD5 Signature</SectionTitle>

      <Card className="print:break-inside-avoid">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground mb-3">
            TemuClient foloseste un mecanism de autentificare bazat pe semnatura MD5:
          </p>
          <CodeBlock
            title="Flux Semnatura MD5"
            code={`1. Sorteaza parametrii request-ului alfabetic
2. Concateneaza ca key=value pairs
3. Inconjoara cu appSecret: appSecret + params + appSecret
4. Calculeaza MD5 hash uppercase
5. Adauga ca parametru "sign" la request

Credentiale per TemuStore:
  appKey       - Identificator aplicatie
  appSecret    - Secret pentru semnatura
  accessToken  - Token acces (expira la 3 luni)
  region       - EU / US / GLOBAL`}
          />
        </CardContent>
      </Card>

      <SectionTitle icon={<RefreshCw className="h-6 w-6" />} id="temu-ordersync">Sincronizare Comenzi</SectionTitle>

      <Card className="print:break-inside-avoid">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-sm mb-3">Flux Sync</h4>
              <ul className="text-xs text-muted-foreground space-y-2">
                <li>Fetch magazine Temu active</li>
                <li>Creare TemuClient per magazin (cu region)</li>
                <li>Paginare prin comenzi API</li>
                <li>Upsert TemuOrder + TemuOrderItem</li>
                <li>Mapare automata produse la MasterProduct</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3">Date Comanda</h4>
              <ul className="text-xs text-muted-foreground space-y-2">
                <li><strong>Identificare:</strong> temuOrderId (unic), temuOrderNumber</li>
                <li><strong>Client:</strong> Nume, email, telefon, adresa</li>
                <li><strong>Financiar:</strong> totalPrice, currency (EUR default)</li>
                <li><strong>Local:</strong> orderId FK catre Order principal</li>
                <li><strong>Multi-store:</strong> temuStoreId FK</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <SectionTitle icon={<Package className="h-6 w-6" />} id="temu-sync">Sync Stoc, Pret si AWB</SectionTitle>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FeatureCard
          icon={<Boxes className="h-5 w-5" />}
          title="Sync Stoc"
          description="Actualizare cantitati disponibile pe Temu din inventarul local via updateStock()."
          badges={["temu-stock-sync.ts"]}
        />
        <FeatureCard
          icon={<CircleDollarSign className="h-5 w-5" />}
          title="Sync Pret"
          description="Actualizare preturi pe Temu din MasterProduct via updatePrice()."
          badges={["temu-stock-sync.ts"]}
        />
        <FeatureCard
          icon={<Truck className="h-5 w-5" />}
          title="Sync AWB"
          description="Trimitere numar tracking si carrier inapoi la Temu via updateTracking()."
          badges={["temu-awb.ts"]}
        />
      </div>

      <Card className="print:break-inside-avoid">
        <CardContent className="pt-6">
          <h4 className="font-semibold text-sm mb-3">Tracking Sync Factura si AWB</h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li><strong>Factura:</strong> <code>invoiceSentToTemu</code>, <code>invoiceSentAt</code>, <code>invoiceSendError</code></li>
            <li><strong>AWB:</strong> <code>trackingSentToTemu</code>, <code>trackingSentAt</code>, <code>trackingSendError</code></li>
            <li>Erorile sunt salvate per comanda pentru retry</li>
          </ul>
        </CardContent>
      </Card>

      <SectionTitle icon={<LayoutDashboard className="h-6 w-6" />} id="temu-pages">Pagini Modul</SectionTitle>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[
          { path: "/temu", name: "Dashboard", desc: "Statistici comenzi (azi/saptamana/luna), venituri, functionalitate sync" },
          { path: "/temu/orders", name: "Comenzi", desc: "Lista comenzi Temu cu filtre status si cautare" },
        ].map((page, i) => (
          <Card key={i} className="print:break-inside-avoid">
            <CardContent className="pt-4 pb-3">
              <p className="font-mono text-xs text-primary">{page.path}</p>
              <p className="font-semibold text-sm">{page.name}</p>
              <p className="text-xs text-muted-foreground">{page.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <SectionTitle icon={<Terminal className="h-6 w-6" />} id="temu-api">API Endpoints</SectionTitle>

      <div className="space-y-2">
        {[
          { method: "GET" as const, path: "/api/temu/stores", desc: "Lista magazine Temu" },
          { method: "POST" as const, path: "/api/temu/stores", desc: "Creare magazin nou" },
          { method: "PUT" as const, path: "/api/temu/stores/[id]", desc: "Editare magazin" },
          { method: "POST" as const, path: "/api/temu/sync", desc: "Trigger sincronizare comenzi" },
          { method: "GET" as const, path: "/api/temu/stats", desc: "Statistici dashboard" },
          { method: "GET" as const, path: "/api/temu/orders", desc: "Lista comenzi Temu" },
        ].map((ep, i) => (
          <ApiEndpoint key={i} {...ep} />
        ))}
      </div>
    </div>
  );
}// ============================================================================
// PART 3: Architecture through Changelog + Main DocsPage Component
// ============================================================================

function ArchitectureContent() {
  return (
    <div className="space-y-8">
      <div className="prose max-w-none">
        <p className="text-lg text-muted-foreground">
          Arhitectura tehnica a platformei ERP CashFlowSync: stack tehnologic,
          structura proiect, pattern-uri folosite si dependinte principale.
        </p>
      </div>

      <SectionTitle icon={<Server className="h-6 w-6" />}>Stack Tehnologic</SectionTitle>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { name: "Next.js 14", type: "Framework", desc: "App Router + RSC + Server Actions" },
          { name: "React 18", type: "UI Library", desc: "Server Components + Suspense" },
          { name: "TypeScript", type: "Language", desc: "Strict type safety" },
          { name: "Tailwind CSS", type: "Styling", desc: "Utility-first CSS" },
          { name: "Prisma", type: "ORM", desc: "Type-safe DB queries" },
          { name: "PostgreSQL", type: "Database", desc: "Primary data store" },
          { name: "NextAuth.js", type: "Auth", desc: "OAuth + Credentials + JWT" },
          { name: "shadcn/ui", type: "Components", desc: "Radix UI primitives" },
        ].map((item, i) => (
          <Card key={i} className="text-center">
            <CardContent className="pt-4 pb-3">
              <p className="font-semibold">{item.name}</p>
              <p className="text-xs text-primary">{item.type}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <InfoBox variant="tip" title="TanStack Query">
        Platforma foloseste TanStack Query (React Query) pentru data fetching pe client-side,
        cu cache management, background refetch, optimistic updates si invalidare automata.
        Combinat cu React Server Components pentru server-side rendering initial.
      </InfoBox>

      <SectionTitle icon={<FolderTree className="h-6 w-6" />}>Structura Proiect</SectionTitle>

      <CodeBlock
        title="Directoare Principale"
        code={`erp-cashflowsync/
├── src/
│   ├── app/                    # Next.js 14 App Router
│   │   ├── (dashboard)/        # Pagini protejate (layout cu sidebar)
│   │   │   ├── dashboard/      # Pagina principala
│   │   │   ├── orders/         # Modul comenzi
│   │   │   ├── products/       # Modul produse
│   │   │   ├── inventory/      # Modul inventar
│   │   │   ├── invoices/       # Modul facturi
│   │   │   ├── picking/        # Modul picking
│   │   │   ├── handover/       # Modul predare curier
│   │   │   ├── tracking/       # Modul tracking AWB
│   │   │   ├── returns/        # Modul retururi
│   │   │   ├── manifests/      # Manifeste livrare/retur
│   │   │   ├── temu/           # Modul Temu marketplace
│   │   │   ├── ads/            # Modul advertising
│   │   │   ├── trendyol/       # Modul Trendyol
│   │   │   ├── settings/       # Configurari (14+ sub-pagini)
│   │   │   └── docs/           # Documentatie (aceasta pagina)
│   │   ├── api/                # API Routes (80+ endpoints)
│   │   │   ├── orders/         # CRUD comenzi
│   │   │   ├── invoices/       # Facturare Oblio
│   │   │   ├── awb/            # AWB FanCourier
│   │   │   ├── returns/        # Procesare retururi
│   │   │   ├── manifests/      # Manifeste livrare/retur
│   │   │   ├── tracking/       # Tracking AWB status
│   │   │   ├── temu/           # Temu API
│   │   │   ├── transfers/      # Transferuri stoc
│   │   │   ├── suppliers/      # Furnizori si PO
│   │   │   ├── webhooks/       # Shopify webhooks
│   │   │   ├── rbac/           # Roluri, permisiuni, utilizatori
│   │   │   └── cron/           # Scheduled jobs
│   │   └── auth/               # NextAuth pages
│   ├── components/             # Componente React reutilizabile
│   │   ├── ui/                 # shadcn/ui components
│   │   └── layout/             # Layout components
│   ├── lib/                    # Business logic & utilities
│   │   ├── auth.ts             # NextAuth config
│   │   ├── db.ts               # Prisma client singleton
│   │   ├── shopify.ts          # Shopify Admin API client
│   │   ├── oblio.ts            # Oblio facturare client
│   │   ├── fancourier.ts       # FanCourier AWB client
│   │   ├── trendyol.ts         # Trendyol marketplace client
│   │   ├── temu.ts             # Temu marketplace client
│   │   ├── google-drive.ts     # Google Drive storage client
│   │   ├── invoice-service.ts  # Invoice business logic
│   │   ├── awb-service.ts      # AWB business logic
│   │   ├── pin-service.ts      # PIN security service
│   │   ├── permissions.ts      # RBAC utilities + audit
│   │   ├── notification-service.ts # Notification system
│   │   └── activity-log.ts     # Activity logging
│   └── hooks/                  # Custom React hooks
│       ├── use-permissions.tsx  # RBAC hook + provider
│       └── ...
├── prisma/
│   └── schema.prisma           # Database schema (80+ models)
└── public/                     # Static assets`}
      />

      <SectionTitle icon={<Layers className="h-6 w-6" />}>Arhitectura pe Straturi</SectionTitle>

      <DiagramBox title="Diagrama Arhitectura" className="print:break-inside-avoid">
        <div className="font-mono text-xs whitespace-pre overflow-x-auto">
{`┌─────────────────────────────────────────────────────────────────┐
│                     PRESENTATION LAYER                          │
│   Next.js 14 App Router + React Server Components + shadcn/ui  │
│   TanStack Query (client) + Server Actions (mutations)          │
│   Dashboard | Orders | Invoices | AWB | Picking | Returns       │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTP/REST
┌───────────────────────────▼─────────────────────────────────────┐
│                        API LAYER                                │
│   Next.js API Routes with validation (Zod) + auth middleware    │
│   RBAC permission checks on every endpoint                      │
│   /api/orders | /api/invoices | /api/awb | /api/returns         │
└───────────────────────────┬─────────────────────────────────────┘
                            │ Function calls
┌───────────────────────────▼─────────────────────────────────────┐
│                     SERVICE LAYER                               │
│   Business logic services with dependency injection             │
│   invoice-service | awb-service | sync-service | permissions    │
│   pin-service | notification-service | activity-log             │
└───────────────────────────┬─────────────────────────────────────┘
                            │ Prisma queries
┌───────────────────────────▼─────────────────────────────────────┐
│                      DATA LAYER                                 │
│   Prisma ORM with PostgreSQL                                    │
│   80+ models | Relations | Transactions | Migrations            │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTP/REST
┌───────────────────────────▼─────────────────────────────────────┐
│                  EXTERNAL INTEGRATIONS                          │
│   Shopify | Oblio | FanCourier | Meta | TikTok | Trendyol      │
│   Temu | Google Drive | Google OAuth                            │
└─────────────────────────────────────────────────────────────────┘`}
        </div>
      </DiagramBox>
    </div>
  );
}

function DatabaseContent() {
  return (
    <div className="space-y-8">
      <div className="prose max-w-none">
        <p className="text-lg text-muted-foreground">
          Schema bazei de date PostgreSQL cu 80+ modele Prisma,
          relatii complexe, constrangeri de integritate si indexuri de performanta.
        </p>
      </div>

      <SectionTitle icon={<Database className="h-6 w-6" />}>Statistici</SectionTitle>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Modele Prisma" value="80+" description="Tabele principale" icon={<Table2 className="h-5 w-5" />} />
        <StatCard label="Relatii" value="150+" description="Foreign keys" icon={<Network className="h-5 w-5" />} />
        <StatCard label="Enum-uri" value="25+" description="Status types" icon={<Layers className="h-5 w-5" />} />
        <StatCard label="Indexuri" value="40+" description="Query optimization" icon={<Zap className="h-5 w-5" />} />
      </div>

      <SectionTitle icon={<Table2 className="h-6 w-6" />}>Modele Principale</SectionTitle>

      <DiagramBox title="Diagrama Relatii" className="print:break-inside-avoid">
        <div className="font-mono text-xs whitespace-pre overflow-x-auto">
{`Company (1) ─────────────────── (N) Store
        ├── (1) ─────────── (N) Invoice
        ├── (1) ─────────── (N) AWB
        ├── (1) ─────────── (N) Warehouse
        └── (1) ─────────── (N) InvoiceSeries

Store (1) ───────────────────── (N) Order
      └── (1) ─────────── (1) Channel

TrendyolStore (1) ───────────── (N) Order (source: TRENDYOL)
TemuStore (1) ───────────────── (N) Order (source: TEMU)

Order (1) ───────────────────── (N) LineItem
      ├── (1) ─────────── (1) Invoice
      ├── (1) ─────────── (1) AWB
      └── (N) ─────────── (N) ProcessingError

AWB (1) ─────────────────────── (N) AWBStatusHistory
    ├── (1) ─────────── (1) HandoverSession
    └── (1) ─────────── (N) ReturnAWB

ReturnAWB (N) ───────────────── (N) ManifestItem
ManifestItem (N) ────────────── (1) Manifest (delivery/return)

User (1) ────────────────────── (N) UserRoleAssignment
     ├── (N) ─────────── (N) UserGroupMembership
     ├── (N) ─────────── (N) UserStoreAccess
     ├── (N) ─────────── (N) UserWarehouseAccess
     ├── (1) ─────────── (N) AuditLog
     └── (1) ─────────── (N) Notification

MasterProduct (1) ───────────── (N) Product (variants)
              └── (N) ─────── (N) MasterProductChannel

InventoryItem (1) ───────────── (N) WarehouseStock
              ├── (N) ─────── (N) InventoryStockMovement
              └── (N) ─────── (N) InventoryRecipeComponent

Supplier (1) ────────────────── (N) PurchaseOrder
PurchaseOrder (1) ───────────── (N) PurchaseOrderItem
              └── (1) ─────── (1) GoodsReceipt (NIR)

WarehouseTransfer (1) ──────── (N) TransferItem
                  ├── from ── (1) Warehouse
                  └── to ──── (1) Warehouse`}
        </div>
      </DiagramBox>

      <SectionTitle icon={<Code className="h-6 w-6" />}>Exemple Modele Prisma</SectionTitle>

      <CodeBlock
        title="Order Model (simplificat)"
        code={`model Order {
  id                String        @id @default(cuid())
  shopifyOrderId    String?       @unique
  orderNumber       String
  email             String?
  phone             String?
  customerName      String
  shippingAddress   Json
  billingAddress    Json?
  totalPrice        Decimal       @db.Decimal(10, 2)
  currency          String        @default("RON")
  financialStatus   String        @default("pending")
  status            OrderStatus   @default(PENDING)
  validationStatus  ValidationStatus @default(PENDING)
  source            OrderSource   @default(SHOPIFY)

  // Relations
  lineItems         LineItem[]
  invoice           Invoice?
  awb               AWB?
  store             Store         @relation(...)
  company           Company       @relation(...)

  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt
}`}
      />
    </div>
  );
}

function IntegrationsContent() {
  return (
    <div className="space-y-8">
      <div className="prose max-w-none">
        <p className="text-lg text-muted-foreground">
          Detalii tehnice despre toate integrarile externe: autentificare,
          endpoints, rate limits, error handling.
        </p>
      </div>

      {[
        {
          name: "Shopify",
          type: "E-commerce Platform",
          auth: "Admin API Access Token",
          file: "src/lib/shopify.ts",
          features: ["Orders webhook", "Products sync", "Inventory levels", "Fulfillment"],
          endpoints: ["orders.json", "products.json", "inventory_levels.json"],
        },
        {
          name: "Oblio",
          type: "Facturare Electronica",
          auth: "OAuth 2.0 (email + secret)",
          file: "src/lib/oblio.ts",
          features: ["Emitere facturi", "e-Factura SPV", "PDF download", "Serii facturi"],
          endpoints: ["/api/docs/invoice", "/api/docs/invoice/pdf"],
        },
        {
          name: "FanCourier",
          type: "Curierat",
          auth: "Token (user + pass)",
          file: "src/lib/fancourier.ts",
          features: ["Generare AWB", "Tracking status", "PDF eticheta", "Servicii (Standard/Collector)"],
          endpoints: ["/order", "/tracking", "/label"],
        },
        {
          name: "Meta Ads",
          type: "Advertising",
          auth: "OAuth 2.0",
          file: "src/lib/meta-ads.ts",
          features: ["Campaigns", "Ad Sets", "Insights", "Budget control"],
          endpoints: ["Graph API v18.0"],
        },
        {
          name: "TikTok Ads",
          type: "Advertising",
          auth: "OAuth 2.0",
          file: "src/lib/tiktok-ads.ts",
          features: ["Campaigns sync", "Performance metrics", "Budget management"],
          endpoints: ["Business API"],
        },
        {
          name: "Trendyol",
          type: "Marketplace",
          auth: "Basic Auth (API Key + Secret)",
          file: "src/lib/trendyol.ts",
          features: ["Orders sync", "Products publish", "Stock update", "Category mapping"],
          endpoints: ["/suppliers/{id}/orders", "/suppliers/{id}/products"],
        },
        {
          name: "Temu",
          type: "Marketplace",
          auth: "MD5 Signature Auth (App Key + Secret)",
          file: "src/lib/temu.ts",
          features: ["Orders sync", "Stock sync", "Price updates", "Multi-region (EU/US/Global)"],
          endpoints: ["/bg/goods/stocks/update", "/bg/order/query"],
        },
        {
          name: "Google Drive",
          type: "Storage",
          auth: "Service Account JSON",
          file: "src/lib/google-drive.ts",
          features: ["Product images", "Database backups", "Document storage", "Auto-backup"],
          endpoints: ["Drive API v3", "Files: list/create/get"],
        },
      ].map((integration, i) => (
        <Card key={i} className="print:break-inside-avoid">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{integration.name}</span>
              <Badge variant="secondary">{integration.type}</Badge>
            </CardTitle>
            <CardDescription>
              Auth: {integration.auth} | File: <code>{integration.file}</code>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-sm mb-2">Features:</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {integration.features.map((f, j) => (
                    <li key={j}>• {f}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-2">Endpoints:</h4>
                <ul className="text-xs text-muted-foreground font-mono space-y-1">
                  {integration.endpoints.map((e, j) => (
                    <li key={j}>{e}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function RBACContent() {
  const permissionCategories = [
    { category: "orders", count: 7, permissions: ["view", "create", "edit", "delete", "process", "export", "sync"] },
    { category: "products", count: 7, permissions: ["view", "create", "edit", "delete", "sync", "stock", "prices"] },
    { category: "categories", count: 2, permissions: ["view", "manage"] },
    { category: "invoices", count: 6, permissions: ["view", "create", "cancel", "download", "payment", "series"] },
    { category: "awb", count: 5, permissions: ["view", "create", "print", "delete", "track"] },
    { category: "printers", count: 4, permissions: ["view", "create", "edit", "delete"] },
    { category: "picking", count: 6, permissions: ["view", "create", "process", "complete", "print", "logs"] },
    { category: "handover", count: 4, permissions: ["view", "scan", "finalize", "report"] },
    { category: "processing", count: 3, permissions: ["errors.view", "errors.retry", "errors.skip"] },
    { category: "inventory", count: 4, permissions: ["view", "adjust", "sync", "edit"] },
    { category: "reception", count: 3, permissions: ["view", "verify", "approve_differences"] },
    { category: "warehouses", count: 5, permissions: ["view", "create", "edit", "delete", "set_primary"] },
    { category: "transfers", count: 4, permissions: ["view", "create", "execute", "cancel"] },
    { category: "marketplace", count: 3, permissions: ["view", "manage", "publish"] },
    { category: "ads", count: 5, permissions: ["view", "manage", "create", "alerts", "accounts"] },
    { category: "reports", count: 2, permissions: ["view", "export"] },
    { category: "settings", count: 6, permissions: ["view", "edit", "integrations", "stores", "handover", "security"] },
    { category: "users", count: 6, permissions: ["view", "invite", "edit", "deactivate", "roles", "groups"] },
    { category: "admin", count: 4, permissions: ["roles", "groups", "permissions", "audit"] },
    { category: "logs", count: 2, permissions: ["sync", "activity"] },
    { category: "tasks", count: 4, permissions: ["view", "create", "edit", "delete"] },
    { category: "companies", count: 2, permissions: ["view", "manage"] },
    { category: "intercompany", count: 3, permissions: ["view", "generate", "mark_paid"] },
  ];

  return (
    <div className="space-y-8">
      <div className="prose max-w-none">
        <p className="text-lg text-muted-foreground">
          Sistem RBAC complet cu 124 permisiuni granulare, 6 roluri predefinite,
          grupuri de utilizatori, acces per magazin/depozit si audit logging integral.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Permisiuni" value="124" description="Granulare per actiune" icon={<Key className="h-5 w-5" />} />
        <StatCard label="Roluri Default" value="6" description="Predefinite in sistem" icon={<Shield className="h-5 w-5" />} />
        <StatCard label="Categorii" value="23" description="Module functionale" icon={<Layers className="h-5 w-5" />} />
        <StatCard label="Audit Log" value="100%" description="Toate actiunile logate" icon={<History className="h-5 w-5" />} />
      </div>

      <SectionTitle icon={<Shield className="h-6 w-6" />}>Roluri Predefinite</SectionTitle>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {[
          { name: "Administrator", color: "bg-red-100 text-red-800 border-red-300", desc: "Toate permisiunile exceptand admin.* - rol de sistem", badge: "red" },
          { name: "Manager", color: "bg-amber-100 text-amber-800 border-amber-300", desc: "Comenzi, produse, facturi, AWB, picking, handover, inventar, rapoarte, taskuri", badge: "amber" },
          { name: "Operator Comenzi", color: "bg-blue-100 text-blue-800 border-blue-300", desc: "Procesare comenzi, facturi, AWB, vizualizare produse, scanare handover", badge: "blue" },
          { name: "Picker", color: "bg-green-100 text-green-800 border-green-300", desc: "Workflow picking, scanare handover, vizualizare produse si comenzi", badge: "green" },
          { name: "Operator Predare", color: "bg-purple-100 text-purple-800 border-purple-300", desc: "Scanare/finalizare/raport handover, vizualizare AWB si comenzi", badge: "purple" },
          { name: "Vizualizare", color: "bg-gray-100 text-gray-800 border-gray-300", desc: "Doar vizualizare in toate modulele - fara actiuni de scriere", badge: "gray" },
        ].map((role, i) => (
          <Card key={i} className="print:break-inside-avoid">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center justify-between mb-2">
                <span className={cn("px-2 py-1 rounded text-xs font-semibold border", role.color)}>
                  {role.name}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{role.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <SectionTitle icon={<Key className="h-6 w-6" />}>Categorii Permisiuni (23)</SectionTitle>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {permissionCategories.map((cat, i) => (
          <Card key={i} className="text-center">
            <CardContent className="pt-3 pb-2">
              <p className="font-semibold text-sm">{cat.category}</p>
              <p className="text-xs text-muted-foreground">{cat.count} permisiuni</p>
              <p className="text-[10px] text-muted-foreground/70 mt-1 truncate" title={cat.permissions.join(", ")}>
                {cat.permissions.join(", ")}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <SectionTitle icon={<Workflow className="h-6 w-6" />}>Rezolutie Permisiuni</SectionTitle>

      <DiagramBox title="Cum se rezolva permisiunile" className="print:break-inside-avoid">
        <div className="font-mono text-xs whitespace-pre overflow-x-auto">
{`Verificare Permisiune
│
├─ SuperAdmin? (isSuperAdmin: true)
│  └─ DA → ACCES TOTAL (bypass toate verificarile)
│
├─ Roluri Directe:
│  User → UserRoleAssignment → Role → RolePermission → Permission
│
└─ Roluri din Grupuri:
   User → UserGroupMembership → Group → GroupRoleAssignment → Role → Permission

Acces Magazine:
├─ User NU are UserStoreAccess records → ACCES LA TOATE MAGAZINELE
└─ User ARE UserStoreAccess records → DOAR magazinele listate

Acces Depozite (acelasi pattern):
├─ User NU are UserWarehouseAccess records → ACCES LA TOATE DEPOZITELE
└─ User ARE UserWarehouseAccess records → DOAR depozitele listate`}
        </div>
      </DiagramBox>

      <SectionTitle icon={<Mail className="h-6 w-6" />}>Sistem Invitatii</SectionTitle>

      <FlowStep steps={[
        { step: "Creare Invitatie", desc: "Admin selecteaza email + roluri + grupuri + acces magazine" },
        { step: "Trimitere Link", desc: "Token unic generat: /invite/[token] (expira in 7 zile)" },
        { step: "Acceptare", desc: "Utilizatorul acceseaza link-ul si creeaza cont" },
        { step: "Auto-Assign", desc: "Roluri, grupuri si acces magazine atribuite automat" },
      ]} />

      <SectionTitle icon={<Code className="h-6 w-6" />}>Implementare Client-Side</SectionTitle>

      <CodeBlock
        title="Hooks si Componente RBAC"
        code={`// PermissionsProvider - context React ce incarca permisiunile la auth
<PermissionsProvider>
  <App />
</PermissionsProvider>

// usePermissions() hook
const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermissions();

if (hasPermission("orders.create")) {
  // Afiseaza buton creare comanda
}

// RequirePermission component - render conditionat
<RequirePermission permission="invoices.issue">
  <Button>Emite Factura</Button>
</RequirePermission>

// ROUTE_PERMISSIONS - guard pe navigatie
// Rute publice: /dashboard, /profile, /preferences (fara permisiuni necesare)
// Rute protejate: /orders -> "orders.view", /settings -> "settings.view"`}
      />
    </div>
  );
}

function SettingsDetailContent() {
  return (
    <div className="space-y-8">
      <div className="prose max-w-none">
        <p className="text-lg text-muted-foreground">
          Documentatie detaliata a tuturor paginilor de configurare: 8 taburi principale
          si 14+ sub-pagini specializate pentru administrare completa a platformei.
        </p>
      </div>

      <SectionTitle icon={<Settings className="h-6 w-6" />}>Taburi Principale (/settings)</SectionTitle>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[
          {
            name: "Magazine (Stores)",
            icon: <Store className="h-4 w-4" />,
            desc: "Management magazine Shopify: domeniu, access token, webhook secret, asociere companie si serie facturi, status sincronizare",
          },
          {
            name: "Trendyol",
            icon: <Globe className="h-4 w-4" />,
            desc: "Configurare magazine Trendyol: API Key, API Secret, Supplier ID, seller mapping, status sincronizare comenzi",
          },
          {
            name: "Temu",
            icon: <Globe className="h-4 w-4" />,
            desc: "Configurare magazine Temu: App Key, App Secret, regiune (EU/US/Global), mapare produse, status sync",
          },
          {
            name: "Produse",
            icon: <Package className="h-4 w-4" />,
            desc: "Integrare Google Drive pentru imagini produse: credentiale Service Account (JSON), folder URL, test conexiune si sincronizare",
          },
          {
            name: "Contabilitate",
            icon: <CircleDollarSign className="h-4 w-4" />,
            desc: "Linkuri catre configurare companii (/settings/companies) si serii facturi (/settings/invoice-series), credentiale Oblio per companie",
          },
          {
            name: "Curieri",
            icon: <Truck className="h-4 w-4" />,
            desc: "Credentiale FanCourier API (Client ID, username, password), test conexiune, setari AWB default (greutate, serviciu, plata), info expeditor",
          },
          {
            name: "AI",
            icon: <Lightbulb className="h-4 w-4" />,
            desc: "Integrare Claude AI: cheie API Anthropic, selectie model (Sonnet 4/Opus 4/Haiku 4), analiza zilnica toggle cu ora configurabila",
          },
          {
            name: "Backup",
            icon: <Cloud className="h-4 w-4" />,
            desc: "Backup baza de date pe Google Drive: folder URL, auto-backup toggle cu programare, creare backup manual, link catre lista backup-uri",
          },
        ].map((tab, i) => (
          <Card key={i} className="print:break-inside-avoid">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-primary">{tab.icon}</span>
                <span className="font-semibold text-sm">{tab.name}</span>
              </div>
              <p className="text-xs text-muted-foreground">{tab.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <SectionTitle icon={<FolderTree className="h-6 w-6" />}>Sub-Pagini Configurari (14+)</SectionTitle>

      <div className="space-y-3">
        {[
          {
            path: "/settings/roles",
            name: "Management Roluri",
            desc: "CRUD complet pentru roluri cu matrice permisiuni. Categorii expandabile cu checkbox-uri. Color picker pentru badge-uri roluri. Rolurile de sistem pot avea permisiuni modificate dar nu pot fi redenumite/sterse.",
            icon: <Shield className="h-4 w-4" />,
          },
          {
            path: "/settings/users",
            name: "Management Utilizatori",
            desc: "Lista utilizatori cu search/filtrare dupa rol/grup. Actiuni per utilizator: atribuire roluri, grupuri, acces magazine, activare/dezactivare, promovare/retrogradare SuperAdmin. Sistem invitatii cu generare URL.",
            icon: <Users className="h-4 w-4" />,
          },
          {
            path: "/settings/groups",
            name: "Management Grupuri",
            desc: "CRUD pentru grupuri de utilizatori. Grupurile pot avea roluri atribuite (mostenite de toti membrii). Adaugare/eliminare membri. Badge-uri colorate pentru grupuri.",
            icon: <Users className="h-4 w-4" />,
          },
          {
            path: "/settings/companies",
            name: "Management Companii",
            desc: "Suport multi-companie cu: date fiscale (CIF, RegCom, adresa), banking (IBAN), contact, credentiale Oblio per companie, credentiale FanCourier per companie, info expeditor per companie, markup inter-companie.",
            icon: <Building2 className="h-4 w-4" />,
          },
          {
            path: "/settings/warehouses",
            name: "Management Depozite",
            desc: "CRUD depozite cu: cod, nume, descriere, adresa. Desemnare depozit primar (pentru comenzi). Status activ/inactiv. Afisare niveluri stoc si numar miscari.",
            icon: <Warehouse className="h-4 w-4" />,
          },
          {
            path: "/settings/printers",
            name: "Management Imprimante",
            desc: "Sistem imprimante bazat pe token-uri: nume, app token, printer token (auto-generat). Dimensiune hartie (A4, A6, 10x15), orientare, copii, auto-print toggle, format output (PDF/ZPL pentru imprimante termice).",
            icon: <Printer className="h-4 w-4" />,
          },
          {
            path: "/settings/backup",
            name: "Lista Backup-uri",
            desc: "Lista backup-uri din Google Drive. Creare backup nou, vizualizare in Drive, restaurare (cu dialog confirmare). Afisare dimensiune fisier, data creare.",
            icon: <Cloud className="h-4 w-4" />,
          },
          {
            path: "/settings/audit",
            name: "Jurnal Audit",
            desc: "Vizualizator jurnal audit cu cautare/filtrare: tip entitate (User, Role, Group, Invitation, Order, Product, Invoice), interval date, cautare text. Paginat cu descrieri actiuni formatate.",
            icon: <ClipboardCheck className="h-4 w-4" />,
          },
          {
            path: "/settings/security",
            name: "Securitate (PIN)",
            desc: "Configurare PIN 6 cifre pentru aprobari exceptii. Necesita PIN curent pentru modificare (daca este deja setat). Folosit pentru operatiuni manuale stornare/incasare.",
            icon: <Fingerprint className="h-4 w-4" />,
          },
          {
            path: "/settings/handover",
            name: "Setari Handover",
            desc: "Configurare ora auto-inchidere sesiuni predare (format HH:mm). Selectie fus orar (default: Europe/Bucharest). Wrapper RequirePermission pentru settings.handover.",
            icon: <Clock className="h-4 w-4" />,
          },
          {
            path: "/settings/invoice-series",
            name: "Serii Facturi",
            desc: "Gestionare serii numerotare facturi per companie. Prefix configurabil, numar start, padding, tip (factura/proforma/chitanta). Serie default per companie. Toggle sincronizare Oblio.",
            icon: <ScrollText className="h-4 w-4" />,
          },
          {
            path: "/settings/awb-statuses",
            name: "Mapare Status AWB",
            desc: "Mapare coduri status FanCourier necunoscute la categorii interne. Afisare first/last seen, numar, AWB exemplu. Categorii: pickup, tranzit, livrare, avizare, problema, retur, anulare, altele.",
            icon: <Tag className="h-4 w-4" />,
          },
          {
            path: "/settings/order-statuses",
            name: "Statusuri Comenzi Custom",
            desc: "Etichete status comenzi interne personalizate cu culori. CRUD cu ordine sortabila. Toggle activ/inactiv.",
            icon: <ListChecks className="h-4 w-4" />,
          },
          {
            path: "/settings/awb-repair",
            name: "Reparare AWB",
            desc: "Instrument pentru gasirea numerelor AWB potential trunchiate si repararea lor. Cautare, selectie si corectare in lot.",
            icon: <Settings className="h-4 w-4" />,
          },
        ].map((page, i) => (
          <Card key={i} className="print:break-inside-avoid">
            <CardContent className="pt-3 pb-3">
              <div className="flex items-start gap-3">
                <span className="text-primary mt-0.5">{page.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">{page.name}</span>
                    <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{page.path}</code>
                  </div>
                  <p className="text-xs text-muted-foreground">{page.desc}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <SectionTitle icon={<Lock className="h-6 w-6" />}>Autentificare si Securitate</SectionTitle>

      <InfoBox variant="info" title="NextAuth.js cu JWT">
        Autentificarea foloseste NextAuth.js cu strategie JWT (nu sesiuni in baza de date).
        Suporta Google OAuth si email/parola (bcrypt 12 runde). Timeout sesiune configurabil
        prin <code>SESSION_TIMEOUT_MINUTES</code> (default: 30 minute). Primul utilizator devine automat SuperAdmin.
      </InfoBox>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <Fingerprint className="h-4 w-4 text-primary" />
              Securitate PIN
            </h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• PIN 6 cifre stocat ca hash bcrypt (10 runde)</li>
              <li>• Sesiune verificare: token UUID valid 5 minute</li>
              <li>• Incercari esuate logate in audit (pin.failed_attempt)</li>
              <li>• Tipuri PIN: STORNARE, INCASARE</li>
              <li>• Status: PENDING, APPROVED, REJECTED, EXPIRED</li>
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              Sistem Notificari
            </h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Targetare bazata pe permisiuni</li>
              <li>• new_user - utilizator nou inregistrat</li>
              <li>• invitation_accepted - invitatie acceptata</li>
              <li>• nir_ready_verification - NIR pregatit verificare</li>
              <li>• nir_differences_approval - diferente NIR</li>
              <li>• role_changed, group_changed - modificari RBAC</li>
              <li>• SuperAdmin primeste TOATE notificarile</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <InfoBox variant="warning" title="Email Allowlist">
        Variabila <code>ALLOWED_EMAILS</code> (comma-separated) restrictioneaza accesul.
        Daca este setata, doar email-urile listate SAU utilizatorii cu cont/invitatie existenta pot accesa platforma.
        Daca este goala, oricine se poate inregistra.
      </InfoBox>
    </div>
  );
}

function CronContent() {
  return (
    <div className="space-y-8">
      <div className="prose max-w-none">
        <p className="text-lg text-muted-foreground">
          Taskuri automate programate: sincronizare date, tracking AWB,
          alerte, cleanup, backup. Toate necesita header <code>Authorization: Bearer CRON_SECRET</code>.
        </p>
      </div>

      <SectionTitle icon={<Timer className="h-6 w-6" />}>Lista CRON Jobs</SectionTitle>

      <div className="space-y-2">
        {[
          { endpoint: "/api/cron/sync-orders", freq: "15 min", desc: "Sincronizeaza comenzi noi din Shopify" },
          { endpoint: "/api/cron/trendyol-orders", freq: "15 min", desc: "Sincronizeaza comenzi Trendyol" },
          { endpoint: "/api/cron/temu-orders", freq: "15 min", desc: "Sincronizeaza comenzi Temu" },
          { endpoint: "/api/cron/sync-awb", freq: "30 min", desc: "Actualizeaza status AWB din FanCourier" },
          { endpoint: "/api/cron/trendyol-stock", freq: "30 min", desc: "Sincronizeaza stoc catre Trendyol" },
          { endpoint: "/api/cron/temu-stock", freq: "30 min", desc: "Sincronizeaza stoc catre Temu" },
          { endpoint: "/api/cron/ads-sync", freq: "1 ora", desc: "Fetch metrici campanii Meta/TikTok" },
          { endpoint: "/api/cron/ads-alerts", freq: "1 ora", desc: "Verifica reguli de alertare ads" },
          { endpoint: "/api/cron/handover-autoclose", freq: "Zilnic 20:00", desc: "Auto-finalizare sesiune predare curier" },
          { endpoint: "/api/cron/backup", freq: "Zilnic (config)", desc: "Auto-backup baza de date pe Google Drive" },
          { endpoint: "/api/cron/ai-analysis", freq: "Zilnic", desc: "Genereaza insights AI pentru ads" },
          { endpoint: "/api/cron/handover-alerts", freq: "Zilnic", desc: "Alerte colete nepredate" },
          { endpoint: "/api/cron/stock-alerts", freq: "Zilnic", desc: "Alerte stoc scazut" },
        ].map((job, i) => (
          <div key={i} className="flex items-center gap-4 p-3 bg-muted rounded-lg">
            <Badge variant="secondary" className="min-w-[100px] justify-center">{job.freq}</Badge>
            <code className="text-sm font-mono flex-1">{job.endpoint}</code>
            <span className="text-xs text-muted-foreground hidden md:block">{job.desc}</span>
          </div>
        ))}
      </div>

      <InfoBox variant="info" title="Configurare Vercel Cron">
        CRON jobs sunt configurate in <code>vercel.json</code> si ruleaza pe Vercel serverless.
        Fiecare job are un lock pentru a preveni executii paralele. Backup-ul are ora configurabila
        din Settings (format HH:mm, timezone Europe/Bucharest).
      </InfoBox>
    </div>
  );
}

function ApiReferenceContent() {
  const apiGroups = [
    {
      name: "Orders",
      endpoints: [
        { method: "GET", path: "/api/orders", desc: "Lista comenzi cu filtre si paginare" },
        { method: "GET", path: "/api/orders/[id]", desc: "Detalii comanda" },
        { method: "POST", path: "/api/orders", desc: "Creare comanda manuala" },
        { method: "PUT", path: "/api/orders/[id]", desc: "Update comanda" },
        { method: "POST", path: "/api/orders/process", desc: "Procesare completa (factura + AWB)" },
        { method: "POST", path: "/api/orders/validate", desc: "Validare batch comenzi" },
      ]
    },
    {
      name: "Invoices",
      endpoints: [
        { method: "GET", path: "/api/invoices", desc: "Lista facturi" },
        { method: "POST", path: "/api/invoices/issue", desc: "Emitere factura via Oblio" },
        { method: "GET", path: "/api/invoices/[id]/pdf", desc: "Download PDF factura" },
        { method: "POST", path: "/api/invoices/[id]/cancel", desc: "Storno factura" },
      ]
    },
    {
      name: "AWB",
      endpoints: [
        { method: "GET", path: "/api/awb", desc: "Lista AWB-uri" },
        { method: "POST", path: "/api/awb/create", desc: "Generare AWB FanCourier" },
        { method: "GET", path: "/api/awb/[id]/label", desc: "Download eticheta PDF" },
        { method: "POST", path: "/api/awb/refresh", desc: "Refresh tracking status" },
      ]
    },
    {
      name: "Picking",
      endpoints: [
        { method: "GET", path: "/api/picking", desc: "Lista liste picking" },
        { method: "POST", path: "/api/picking/create", desc: "Creare lista picking" },
        { method: "POST", path: "/api/picking/[id]/scan", desc: "Scanare produs barcode" },
      ]
    },
    {
      name: "Handover",
      endpoints: [
        { method: "GET", path: "/api/handover/today", desc: "Sesiune predare azi" },
        { method: "POST", path: "/api/handover/scan", desc: "Scanare AWB predare" },
        { method: "POST", path: "/api/handover/finalize", desc: "Finalizare sesiune" },
      ]
    },
    {
      name: "Returns",
      endpoints: [
        { method: "GET", path: "/api/returns", desc: "Lista retururi cu filtre" },
        { method: "POST", path: "/api/returns/scan", desc: "Scanare barcode retur" },
        { method: "POST", path: "/api/returns/link", desc: "Legare retur la comanda" },
        { method: "GET", path: "/api/returns/export", desc: "Export retururi CSV/Excel" },
      ]
    },
    {
      name: "Manifests",
      endpoints: [
        { method: "GET", path: "/api/manifests/returns", desc: "Lista manifeste retururi" },
        { method: "POST", path: "/api/manifests/returns", desc: "Creare manifest retururi" },
        { method: "GET", path: "/api/manifests/deliveries", desc: "Lista manifeste livrari" },
        { method: "POST", path: "/api/manifests/deliveries", desc: "Creare manifest livrari" },
        { method: "POST", path: "/api/manifests/[id]/process", desc: "Procesare manifest" },
      ]
    },
    {
      name: "Inventory",
      endpoints: [
        { method: "GET", path: "/api/inventory-items", desc: "Lista articole inventar" },
        { method: "POST", path: "/api/inventory-items", desc: "Creare articol inventar" },
        { method: "GET", path: "/api/inventory-items/stock-report", desc: "Raport stocuri pe depozite" },
        { method: "POST", path: "/api/inventory-items/stock-adjustment", desc: "Ajustare stoc manuala" },
      ]
    },
    {
      name: "Transfers",
      endpoints: [
        { method: "GET", path: "/api/transfers", desc: "Lista transferuri intre depozite" },
        { method: "POST", path: "/api/transfers", desc: "Creare transfer stoc" },
        { method: "POST", path: "/api/transfers/[id]/execute", desc: "Executare transfer" },
      ]
    },
    {
      name: "Suppliers",
      endpoints: [
        { method: "GET", path: "/api/suppliers", desc: "Lista furnizori" },
        { method: "POST", path: "/api/suppliers", desc: "Creare furnizor" },
        { method: "GET", path: "/api/purchase-orders", desc: "Lista comenzi achizitie" },
        { method: "POST", path: "/api/purchase-orders", desc: "Creare comanda achizitie" },
      ]
    },
    {
      name: "Tracking",
      endpoints: [
        { method: "GET", path: "/api/tracking", desc: "Dashboard tracking AWB-uri" },
        { method: "POST", path: "/api/tracking/refresh", desc: "Refresh status FanCourier" },
      ]
    },
    {
      name: "Trendyol",
      endpoints: [
        { method: "GET", path: "/api/trendyol/orders", desc: "Lista comenzi Trendyol" },
        { method: "POST", path: "/api/trendyol/mapping", desc: "Mapare produse/categorii Trendyol" },
      ]
    },
    {
      name: "Temu",
      endpoints: [
        { method: "GET", path: "/api/temu/orders", desc: "Lista comenzi Temu" },
        { method: "POST", path: "/api/temu/sync", desc: "Sincronizare stoc/preturi Temu" },
      ]
    },
  ];

  return (
    <div className="space-y-8">
      <div className="prose max-w-none">
        <p className="text-lg text-muted-foreground">
          Referinta completa API-uri disponibile (80+ endpoints). Toate endpoint-urile necesita
          autentificare (NextAuth session) si verificare permisiuni RBAC.
        </p>
      </div>

      <InfoBox variant="info" title="Pattern Securitate API">
        Toate rutele API urmeaza acelasi pattern: 1) Verificare sesiune NextAuth (401 daca lipseste),
        2) Verificare permisiune specifica via <code>hasPermission(userId, code)</code> (403 daca refuzat),
        3) SuperAdmin bypass ca fallback, 4) Logare actiune in audit/activity log.
      </InfoBox>

      {apiGroups.map((group, i) => (
        <div key={i}>
          <SectionTitle icon={<Code className="h-6 w-6" />}>{group.name} API</SectionTitle>
          <div className="space-y-2">
            {group.endpoints.map((ep, j) => (
              <ApiEndpoint key={j} {...ep} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function EnvContent() {
  return (
    <div className="space-y-8">
      <div className="prose max-w-none">
        <p className="text-lg text-muted-foreground">
          Lista completa a variabilelor de mediu necesare pentru rularea platformei.
          Variabilele marcate cu (optional) nu sunt necesare pentru functionarea de baza.
        </p>
      </div>

      <CodeBlock
        title=".env.example"
        code={`# Database
DATABASE_URL="postgresql://user:password@localhost:5432/erp_cashflowsync"

# NextAuth
NEXTAUTH_SECRET="your-secret-key-min-32-chars"
NEXTAUTH_URL="https://your-domain.com"

# Session
SESSION_TIMEOUT_MINUTES="30"

# Email Allowlist (optional - comma-separated)
ALLOWED_EMAILS="admin@company.com,manager@company.com"

# Google OAuth
GOOGLE_CLIENT_ID="xxxxx.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-xxxxx"

# Shopify
SHOPIFY_STORE_DOMAIN="your-store.myshopify.com"
SHOPIFY_ACCESS_TOKEN="shpat_xxxxx"
SHOPIFY_WEBHOOK_SECRET="whsec_xxxxx"

# Oblio
OBLIO_EMAIL="your-email@example.com"
OBLIO_API_SECRET="your-oblio-secret"

# FanCourier
FANCOURIER_CLIENT_ID="your-client-id"
FANCOURIER_USERNAME="your-username"
FANCOURIER_PASSWORD="your-password"

# Meta Ads (optional)
META_APP_ID="your-app-id"
META_APP_SECRET="your-app-secret"

# TikTok Ads (optional)
TIKTOK_APP_ID="your-tiktok-app-id"
TIKTOK_APP_SECRET="your-tiktok-secret"

# Trendyol
TRENDYOL_SUPPLIER_ID="your-supplier-id"
TRENDYOL_API_KEY="your-api-key"
TRENDYOL_API_SECRET="your-api-secret"

# Temu
TEMU_APP_KEY="your-temu-app-key"
TEMU_APP_SECRET="your-temu-app-secret"

# Google Drive (imagini produse + backup)
GOOGLE_DRIVE_SERVICE_ACCOUNT="{ ... service account JSON ... }"
GOOGLE_DRIVE_FOLDER_URL="https://drive.google.com/drive/folders/xxxxx"

# Claude AI (optional)
ANTHROPIC_API_KEY="sk-ant-xxxxx"

# CRON
CRON_SECRET="your-cron-secret"`}
      />

      <InfoBox variant="warning" title="Securitate">
        Nu comiteti niciodata fisierul <code>.env</code> in repository. Folositi <code>.env.example</code> ca template.
        In productie, configurati variabilele direct in Vercel Environment Variables.
        Credentialele per companie (Oblio, FanCourier) sunt stocate criptat in baza de date, nu in .env.
      </InfoBox>
    </div>
  );
}

function ChangelogContent() {
  const versions = [
    {
      version: "5.0.0",
      date: "2026-02-09",
      changes: [
        "ADD: Integrare marketplace Temu (EU/US/Global) cu sincronizare comenzi si stoc",
        "ADD: Modul retururi cu scanare barcode si legare la comenzi",
        "ADD: Manifeste livrare si retur cu procesare din baza de date",
        "ADD: Dashboard tracking cu explicatii statusuri FanCourier",
        "ADD: Inventar multi-depozit cu transferuri intre depozite",
        "ADD: Furnizori, Comenzi Achizitie, flux receptie NIR",
        "ADD: Documentatie detaliata setari (14+ sub-pagini)",
        "ADD: Download format MD pentru documentatie",
        "EXPAND: Toate modulele existente actualizate cu date cercetare comprehensive",
        "EXPAND: 26 module documentate (anterior 19)",
      ]
    },
    {
      version: "4.0.0",
      date: "2026-02-02",
      changes: [
        "FIX: Ramburs automat 0 pentru comenzi platite online",
        "ADD: Documentatie completa cu download PDF",
        "ADD: Diagrame flux business end-to-end",
      ]
    },
    {
      version: "3.5.0",
      date: "2026-01-28",
      changes: [
        "ADD: Suport multi-store Trendyol",
        "ADD: Campuri produs noi pentru Trendyol",
        "FIX: Dashboard stats per store",
      ]
    },
    {
      version: "3.4.0",
      date: "2026-01-20",
      changes: [
        "ADD: AI category suggestion pentru Trendyol",
        "ADD: Bulk product publishing",
        "FIX: Trendyol attribute mapping",
      ]
    },
    {
      version: "3.3.0",
      date: "2026-01-15",
      changes: [
        "ADD: Sistem alerte stoc scazut",
        "ADD: Rapoarte avansate inventory",
        "FIX: Stock sync cu Shopify",
      ]
    },
    {
      version: "3.2.0",
      date: "2026-01-10",
      changes: [
        "ADD: TikTok Ads integration",
        "ADD: ROAS per product tracking",
        "ADD: Ads performance alerts",
      ]
    },
    {
      version: "3.1.0",
      date: "2026-01-05",
      changes: [
        "ADD: Picking lists agregate",
        "ADD: Barcode scanning",
        "ADD: Handover sessions cu raport C0",
      ]
    },
    {
      version: "3.0.0",
      date: "2025-12-20",
      changes: [
        "MAJOR: Refactorizare completa RBAC",
        "ADD: 124 permisiuni granulare",
        "ADD: Grupuri utilizatori",
        "ADD: Audit logging complet",
      ]
    },
  ];

  return (
    <div className="space-y-8">
      <div className="prose max-w-none">
        <p className="text-lg text-muted-foreground">
          Istoricul versiunilor platformei ERP CashFlowSync.
        </p>
      </div>

      <div className="space-y-4">
        {versions.map((v, i) => (
          <Card key={i} className="print:break-inside-avoid">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between">
                <span>v{v.version}</span>
                <Badge variant={i === 0 ? "default" : "outline"}>{v.date}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-1">
                {v.changes.map((change, j) => (
                  <li key={j}>• {change}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function DocsPage() {
  const [activeModule, setActiveModule] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const contentRef = useRef<HTMLDivElement>(null);

  const filteredModules = modules.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadMD = () => {
    const markdown = `# ERP CashFlowSync - Documentatie\n\nVersiune ${DOC_VERSION} • ${LAST_UPDATED}\n\n> Aceasta documentatie acopera toate modulele platformei ERP CashFlowSync.\n> Pentru versiunea completa interactiva, accesati pagina /docs din aplicatie.\n\n## Module Documentate\n\n${modules.map(m => `- **${m.name}** (${m.category})`).join('\n')}\n\n---\n\n*Documentatie generata automat din ERP CashFlowSync v${DOC_VERSION}*`;
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ERP-CashFlowSync-Docs-v${DOC_VERSION}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderContent = () => {
    switch (activeModule) {
      case "overview": return <OverviewContent />;
      case "quickstart": return <QuickstartContent />;
      case "business-flow": return <BusinessFlowContent />;
      case "orders": return <OrdersContent />;
      case "invoices": return <InvoicesContent />;
      case "shipping": return <ShippingContent />;
      case "returns": return <ReturnsContent />;
      case "picking": return <PickingContent />;
      case "handover": return <HandoverContent />;
      case "tracking": return <TrackingContent />;
      case "manifests": return <ManifestsContent />;
      case "products": return <ProductsContent />;
      case "inventory": return <InventoryContent />;
      case "suppliers": return <SuppliersContent />;
      case "advertising": return <AdvertisingContent />;
      case "trendyol": return <TrendyolContent />;
      case "temu": return <TemuContent />;
      case "architecture": return <ArchitectureContent />;
      case "database": return <DatabaseContent />;
      case "integrations": return <IntegrationsContent />;
      case "rbac": return <RBACContent />;
      case "settings-detail": return <SettingsDetailContent />;
      case "cron": return <CronContent />;
      case "api": return <ApiReferenceContent />;
      case "env": return <EnvContent />;
      case "changelog": return <ChangelogContent />;
      default: return <OverviewContent />;
    }
  };

  const groupedModules = {
    overview: filteredModules.filter(m => m.category === "overview"),
    business: filteredModules.filter(m => m.category === "business"),
    technical: filteredModules.filter(m => m.category === "technical"),
    reference: filteredModules.filter(m => m.category === "reference"),
  };

  return (
    <>
      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-content, .print-content * {
            visibility: visible;
          }
          .print-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
          }
          .no-print {
            display: none !important;
          }
          @page {
            margin: 1cm;
            size: A4;
          }
        }
      `}</style>

      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar */}
        <div className="w-72 border-r bg-muted/30 flex flex-col no-print">
          <div className="p-4 border-b">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="h-6 w-6 text-primary" />
              <div>
                <h1 className="font-bold text-lg">Documentatie ERP</h1>
                <p className="text-xs text-muted-foreground">v{DOC_VERSION} • {LAST_UPDATED}</p>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cauta..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <ScrollArea className="flex-1 p-4">
            <div className="space-y-6">
              {Object.entries(groupedModules).map(([category, mods]) => (
                mods.length > 0 && (
                  <div key={category}>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      {category === "overview" && "Introducere"}
                      {category === "business" && "Fluxuri Business"}
                      {category === "technical" && "Tehnic"}
                      {category === "reference" && "Referinta"}
                    </h3>
                    <div className="space-y-1">
                      {mods.map((module) => {
                        const Icon = module.icon;
                        return (
                          <button
                            key={module.id}
                            onClick={() => setActiveModule(module.id)}
                            className={cn(
                              "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left",
                              activeModule === module.id
                                ? "bg-primary text-primary-foreground"
                                : "hover:bg-muted"
                            )}
                          >
                            <Icon className="h-4 w-4" />
                            {module.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )
              ))}
            </div>
          </ScrollArea>

          <div className="p-4 border-t space-y-2">
            <Button onClick={handlePrint} className="w-full" variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
            <Button onClick={handleDownloadMD} className="w-full" variant="outline">
              <FileDown className="h-4 w-4 mr-2" />
              Download MD
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <div ref={contentRef} className="print-content max-w-4xl mx-auto p-8">
            {/* Print header - only visible when printing */}
            <div className="hidden print:block mb-8 pb-4 border-b">
              <h1 className="text-2xl font-bold">ERP CashFlowSync - Documentatie</h1>
              <p className="text-sm text-gray-600">
                Versiune {DOC_VERSION} • Generat {new Date().toLocaleDateString("ro-RO")}
              </p>
            </div>

            {renderContent()}

            {/* Print footer */}
            <div className="hidden print:block mt-8 pt-4 border-t text-center text-xs text-gray-500">
              ERP CashFlowSync • Documentatie Tehnica si Business • Pagina generata automat
            </div>
          </div>
        </div>
      </div>
    </>
  );
}