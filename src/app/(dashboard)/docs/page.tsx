"use client";

import { useState, useRef } from "react";
import {
  Book,
  ShoppingCart,
  Truck,
  FileText,
  Package,
  Megaphone,
  Shield,
  Database,
  Zap,
  GitBranch,
  Code,
  ChevronRight,
  Search,
  CheckCircle2,
  ArrowRight,
  Layers,
  Globe,
  Store,
  Plus,
  Phone,
  MapPin,
  Building2,
  XCircle,
  AlertTriangle,
  Info,
  Lightbulb,
  Check,
  Copy,
  GitMerge,
  Workflow,
  FolderTree,
  Cog,
  Timer,
  Layers3,
  RefreshCw,
  Users,
  Eye,
  Lock,
  History,
  ClipboardList,
  Scan,
  Hand,
  Target,
  TrendingUp,
  Key,
  Table2,
  Server,
  Terminal,
  Download,
  Printer,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  CreditCard,
  Banknote,
  Receipt,
  BarChart3,
  PieChart,
  Activity,
  Settings,
  HelpCircle,
  BookOpen,
  FileCode,
  Network,
  Boxes,
  Factory,
  Warehouse,
  CircleDollarSign,
  CalendarDays,
  Clock,
  Bell,
  Mail,
  Smartphone,
  Laptop,
  Cloud,
  ShieldCheck,
  UserCheck,
  FileCheck,
  ListChecks,
  PackageCheck,
  Gauge,
  LayoutDashboard,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const DOC_VERSION = "4.0.0";
const LAST_UPDATED = "2026-02-02";

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
  // Overview
  { id: "overview", name: "Prezentare Generala", icon: Book, category: "overview" },
  { id: "quickstart", name: "Ghid Rapid Start", icon: Zap, category: "overview" },

  // Business Flows
  { id: "business-flow", name: "Flux Business E2E", icon: Workflow, category: "business" },
  { id: "orders", name: "Comenzi si Procesare", icon: ShoppingCart, category: "business" },
  { id: "invoices", name: "Facturare Oblio", icon: FileText, category: "business" },
  { id: "shipping", name: "Livrare AWB", icon: Truck, category: "business" },
  { id: "picking", name: "Picking Warehouse", icon: ClipboardList, category: "business" },
  { id: "handover", name: "Predare Curier", icon: Hand, category: "business" },
  { id: "products", name: "Produse si Stoc", icon: Package, category: "business" },
  { id: "advertising", name: "Advertising", icon: Megaphone, category: "business" },
  { id: "trendyol", name: "Trendyol Marketplace", icon: Globe, category: "business" },

  // Technical
  { id: "architecture", name: "Arhitectura Sistem", icon: Server, category: "technical" },
  { id: "database", name: "Baza de Date", icon: Database, category: "technical" },
  { id: "integrations", name: "Integrari Externe", icon: GitBranch, category: "technical" },
  { id: "rbac", name: "Permisiuni RBAC", icon: Shield, category: "technical" },
  { id: "cron", name: "CRON Jobs", icon: Timer, category: "technical" },

  // Reference
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
    info: { bg: "bg-primary/10", border: "border-primary/30", icon: <Info className="h-5 w-5 text-primary" /> },
    warning: { bg: "bg-warning/10", border: "border-warning/30", icon: <AlertTriangle className="h-5 w-5 text-warning" /> },
    success: { bg: "bg-success/10", border: "border-success/30", icon: <CheckCircle2 className="h-5 w-5 text-success" /> },
    tip: { bg: "bg-accent", border: "border-accent-foreground/20", icon: <Lightbulb className="h-5 w-5 text-accent-foreground" /> },
  };
  const style = styles[variant];

  return (
    <div className={cn("rounded-lg border p-4 print:border-gray-300 print:bg-gray-50", style.bg, style.border)}>
      <div className="flex items-center gap-2 font-medium mb-2 text-foreground">
        {style.icon}
        {title}
      </div>
      <div className="text-sm text-muted-foreground print:text-gray-700">{children}</div>
    </div>
  );
}

function CodeBlock({ code, title }: { code: string; title?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative rounded-lg border border-border bg-muted overflow-hidden print:bg-gray-100 print:border-gray-300">
      {title && (
        <div className="px-4 py-2 bg-muted/80 border-b border-border text-sm text-muted-foreground print:bg-gray-200">
          {title}
        </div>
      )}
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-2 right-2 text-muted-foreground hover:text-foreground print:hidden"
        onClick={handleCopy}
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </Button>
      <pre className="p-4 text-sm text-foreground overflow-x-auto print:text-xs">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function StatCard({
  label,
  value,
  description,
  icon
}: {
  label: string;
  value: string;
  description: string;
  icon: React.ReactNode;
}) {
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

function FeatureCard({
  icon,
  title,
  description,
  badges
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  badges: string[];
}) {
  return (
    <Card className="print:break-inside-avoid">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <span className="text-primary print:text-gray-600">{icon}</span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-3">{description}</p>
        <div className="flex flex-wrap gap-1">
          {badges.map((badge, i) => (
            <Badge key={i} variant="secondary" className="text-xs print:bg-gray-200">{badge}</Badge>
          ))}
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
      <Badge
        variant={method === "GET" ? "secondary" : method === "DELETE" ? "destructive" : "default"}
        className="w-16 justify-center print:bg-gray-300"
      >
        {method}
      </Badge>
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
          operatiunilor e-commerce end-to-end: import comenzi multi-canal (Shopify, Trendyol),
          facturare automata Oblio cu e-Factura, AWB FanCourier, picking warehouse,
          advertising Meta/TikTok, si sistem RBAC cu 124+ permisiuni.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Module Active" value="12+" description="Functionalitati complete" icon={<Layers className="h-5 w-5" />} />
        <StatCard label="Integrari" value="8" description="Shopify, Oblio, FanCourier..." icon={<GitBranch className="h-5 w-5" />} />
        <StatCard label="Tabele DB" value="80+" description="PostgreSQL + Prisma ORM" icon={<Database className="h-5 w-5" />} />
        <StatCard label="Permisiuni RBAC" value="124" description="Control granular acces" icon={<Shield className="h-5 w-5" />} />
      </div>

      <SectionTitle icon={<Zap className="h-6 w-6" />}>Capabilitati Principale</SectionTitle>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <FeatureCard
          icon={<ShoppingCart className="h-5 w-5" />}
          title="Comenzi Multi-Canal"
          description="Import automat din Shopify (webhook real-time) si Trendyol (CRON sync). Validare telefon RO, 14 statusuri cu tranzitii automate."
          badges={["Shopify Webhook", "Trendyol CRON", "14 Statusuri"]}
        />
        <FeatureCard
          icon={<FileText className="h-5 w-5" />}
          title="Facturare Oblio"
          description="Emitere facturi automate cu serii configurabile. Suport PF/PJ, e-Factura SPV, PDF storage, storno."
          badges={["Oblio API", "e-Factura", "Multi-serie"]}
        />
        <FeatureCard
          icon={<Truck className="h-5 w-5" />}
          title="AWB FanCourier"
          description="Generare AWB cu ramburs automat (0 pentru comenzi platite). Tracking CRON, 8 statusuri mapate."
          badges={["Ramburs Auto", "Tracking", "PDF Label"]}
        />
        <FeatureCard
          icon={<Package className="h-5 w-5" />}
          title="Inventar Dual System"
          description="MasterProduct (catalog) + InventoryItem (stoc avansat). Retete composite, sincronizare, alerte stoc."
          badges={["Dual Stock", "Retete", "Alerte"]}
        />
        <FeatureCard
          icon={<ClipboardList className="h-5 w-5" />}
          title="Picking & Handover"
          description="Liste picking agregate, scanare barcode, sesiuni predare curier cu raport, alerte colete nepredate."
          badges={["Agregare", "Barcode", "Raport C0"]}
        />
        <FeatureCard
          icon={<Megaphone className="h-5 w-5" />}
          title="Advertising Analytics"
          description="Integrare Meta Ads si TikTok Ads OAuth. Sincronizare campanii, ROAS per produs, alerte automate."
          badges={["Meta OAuth", "TikTok", "ROAS Alerts"]}
        />
      </div>

      <SectionTitle icon={<Globe className="h-6 w-6" />}>Integrari Externe</SectionTitle>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { name: "Shopify", type: "E-commerce", desc: "Webhook real-time comenzi" },
          { name: "Trendyol", type: "Marketplace", desc: "Sync comenzi si produse" },
          { name: "Oblio", type: "Facturare", desc: "Facturi + e-Factura SPV" },
          { name: "FanCourier", type: "Curierat", desc: "AWB + tracking automat" },
          { name: "Meta Ads", type: "Advertising", desc: "Campanii FB/Instagram" },
          { name: "TikTok Ads", type: "Advertising", desc: "Campanii TikTok" },
          { name: "Google Drive", type: "Storage", desc: "Backup documente" },
          { name: "Claude AI", type: "AI Analysis", desc: "Insights advertising" },
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

      <SectionTitle icon={<Users className="h-6 w-6" />}>Pentru Cine Este</SectionTitle>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5 text-primary" />
              Magazine Online
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Gestionare completa comenzi de la import pana la livrare. Automatizare facturare si AWB.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Warehouse className="h-5 w-5 text-primary" />
              Echipe Warehouse
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Picking lists agregate, scanare barcode, sesiuni handover, rapoarte predare curier.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Marketing Teams
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Analytics campanii Meta/TikTok, ROAS per produs, alerte performanta, actiuni automate.
          </CardContent>
        </Card>
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
          De la configurarea initiala pana la procesarea primei comenzi.
        </p>
      </div>

      <SectionTitle icon={<ListChecks className="h-6 w-6" />}>Checklist Initial</SectionTitle>

      <div className="space-y-4">
        {[
          { step: "1", title: "Configurare Companie", desc: "Settings > Company - CUI, adresa, date fiscale", status: "required" },
          { step: "2", title: "Conectare Shopify", desc: "Settings > Integrations - API key magazin", status: "required" },
          { step: "3", title: "Configurare Oblio", desc: "Settings > Invoices - Credentiale API, serie facturi", status: "required" },
          { step: "4", title: "Configurare FanCourier", desc: "Settings > Shipping - Cont client, date expeditor", status: "required" },
          { step: "5", title: "Import Produse", desc: "Products > Sync Shopify sau Import Excel", status: "optional" },
          { step: "6", title: "Configurare Utilizatori", desc: "Settings > Users - Roluri si permisiuni echipa", status: "optional" },
        ].map((item, i) => (
          <div key={i} className="flex items-start gap-4 p-4 border rounded-lg">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center font-bold text-white",
              item.status === "required" ? "bg-primary" : "bg-muted-foreground"
            )}>
              {item.step}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold">{item.title}</h4>
                <Badge variant={item.status === "required" ? "default" : "secondary"}>
                  {item.status === "required" ? "Obligatoriu" : "Optional"}
                </Badge>
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

      <div className="space-y-4">
        <SubSectionTitle>Procesare Manuala (pas cu pas)</SubSectionTitle>
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
          Butonul <strong>Process</strong> executa automat: validare + factura + AWB.
          Pentru procesare batch, selecteaza comenzile si click <strong>Process Selected</strong>.
        </p>
      </div>

      <SectionTitle icon={<HelpCircle className="h-6 w-6" />}>Probleme Frecvente</SectionTitle>

      <div className="space-y-3">
        {[
          { q: "Comanda ramane in PENDING", a: "Verifica telefonul - trebuie format RO valid (07XXXXXXXX)" },
          { q: "Eroare la facturare", a: "Verifica credentials Oblio si seria de facturi configurata" },
          { q: "AWB nu se genereaza", a: "Verifica adresa completa si judetul sa fie valid FanCourier" },
          { q: "Stocul nu se actualizeaza", a: "Verifica maparea SKU intre Shopify si inventar local" },
        ].map((item, i) => (
          <Card key={i}>
            <CardContent className="pt-4 pb-3">
              <p className="font-medium text-foreground">{item.q}</p>
              <p className="text-sm text-muted-foreground">{item.a}</p>
            </CardContent>
          </Card>
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
│   SHOPIFY    │ ─────── Webhook ───────▶ ┌──────────────┐
│   STORE      │                          │   COMANDA    │
└──────────────┘                          │   PENDING    │
                                          └──────┬───────┘
┌──────────────┐                                 │
│   TRENDYOL   │ ─────── CRON Sync ─────▶       │
│  MARKETPLACE │                                 │
└──────────────┘                                 ▼
                                          ┌──────────────┐
                                          │  VALIDARE    │
                                          │ Tel/Adresa   │
                                          └──────┬───────┘
                                                 │
                                                 ▼
                                          ┌──────────────┐
                                          │  VALIDATED   │
                                          └──────┬───────┘
                                                 │
                    ┌──────────────┐             │
                    │    OBLIO     │◀────────────┤
                    │  (Factura)   │             │
                    └──────────────┘             ▼
                                          ┌──────────────┐
                                          │   INVOICED   │
                                          └──────┬───────┘
                                                 │
                    ┌──────────────┐             │
                    │  FANCOURIER  │◀────────────┤
                    │    (AWB)     │             │
                    └──────────────┘             ▼
                                          ┌──────────────┐
                                          │ AWB_CREATED  │
                                          └──────┬───────┘
                                                 │
                                                 ▼
                                          ┌──────────────┐
                                          │   PICKING    │
                                          │  (Warehouse) │
                                          └──────┬───────┘
                                                 │
                                                 ▼
                                          ┌──────────────┐
                                          │   HANDOVER   │
                                          │(Predare C0)  │
                                          └──────┬───────┘
                                                 │
                                                 ▼
                                          ┌──────────────┐
                                          │   SHIPPED    │
                                          └──────┬───────┘
                                                 │ (Tracking CRON)
                                                 ▼
                                          ┌──────────────┐
                                          │  DELIVERED   │
                                          └──────────────┘`}
        </div>
      </DiagramBox>

      <SectionTitle icon={<CreditCard className="h-6 w-6" />}>Flux Financiar</SectionTitle>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-success">
              <CreditCard className="h-5 w-5" />
              Plata Online (Card)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-2 text-muted-foreground">
              <li><strong>financialStatus:</strong> paid</li>
              <li><strong>Factura:</strong> Emisa cu status PLATITA</li>
              <li><strong>AWB:</strong> Ramburs = 0 RON (automat)</li>
              <li><strong>Bani:</strong> Deja incasati prin Stripe/PayPal</li>
            </ul>
            <InfoBox variant="success" title="Automat din v4.0">
              Sistemul detecteaza automat comenzile platite si seteaza COD=0
            </InfoBox>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-warning">
              <Banknote className="h-5 w-5" />
              Ramburs (COD)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-2 text-muted-foreground">
              <li><strong>financialStatus:</strong> pending</li>
              <li><strong>Factura:</strong> Emisa cu status NEPLATITA</li>
              <li><strong>AWB:</strong> Ramburs = Total comanda</li>
              <li><strong>Bani:</strong> Incasati de curier la livrare</li>
            </ul>
            <InfoBox variant="info" title="Serviciu Cont Colector">
              Pentru ramburs se foloseste serviciul Cont Colector FanCourier
            </InfoBox>
          </CardContent>
        </Card>
      </div>

      <SectionTitle icon={<Receipt className="h-6 w-6" />}>Cele 14 Statusuri ale Comenzii</SectionTitle>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {[
          { status: "PENDING", color: "bg-muted", desc: "Comanda noua, nevalidata", next: "VALIDATED / VALIDATION_FAILED" },
          { status: "VALIDATED", color: "bg-primary/10", desc: "Date validate OK", next: "INVOICE_PENDING" },
          { status: "VALIDATION_FAILED", color: "bg-destructive/10", desc: "Date invalide (tel/adresa)", next: "PENDING (dupa corectie)" },
          { status: "INVOICE_PENDING", color: "bg-warning/10", desc: "In curs de facturare", next: "INVOICED / INVOICE_FAILED" },
          { status: "INVOICED", color: "bg-success/10", desc: "Factura emisa in Oblio", next: "AWB_PENDING" },
          { status: "INVOICE_FAILED", color: "bg-destructive/10", desc: "Eroare Oblio API", next: "INVOICE_PENDING (retry)" },
          { status: "AWB_PENDING", color: "bg-warning/10", desc: "In curs de generare AWB", next: "AWB_CREATED / AWB_FAILED" },
          { status: "AWB_CREATED", color: "bg-success/10", desc: "AWB generat FanCourier", next: "PICKING" },
          { status: "AWB_FAILED", color: "bg-destructive/10", desc: "Eroare FanCourier API", next: "AWB_PENDING (retry)" },
          { status: "PICKING", color: "bg-primary/10", desc: "In picking warehouse", next: "PACKED" },
          { status: "PACKED", color: "bg-success/10", desc: "Colet pregatit expediere", next: "SHIPPED" },
          { status: "SHIPPED", color: "bg-warning/10", desc: "Predat curier, in tranzit", next: "DELIVERED / RETURNED" },
          { status: "DELIVERED", color: "bg-success/10", desc: "Livrat cu succes", next: "Final" },
          { status: "RETURNED", color: "bg-destructive/10", desc: "Returnat la expeditor", next: "Final" },
        ].map((item, i) => (
          <div key={i} className={cn("flex items-center justify-between p-3 rounded-lg border print:break-inside-avoid", item.color)}>
            <div>
              <Badge variant="outline">{item.status}</Badge>
              <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-muted-foreground">→ {item.next}</span>
            </div>
          </div>
        ))}
      </div>

      <SectionTitle icon={<Clock className="h-6 w-6" />}>Timpi de Procesare</SectionTitle>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { etapa: "Webhook Import", timp: "< 1s", desc: "Shopify → ERP" },
          { etapa: "Validare Date", timp: "< 2s", desc: "Tel + Adresa" },
          { etapa: "Emitere Factura", timp: "2-5s", desc: "Oblio API call" },
          { etapa: "Generare AWB", timp: "3-8s", desc: "FanCourier API" },
          { etapa: "Tracking Update", timp: "30 min", desc: "CRON periodic" },
          { etapa: "Picking List", timp: "< 1s", desc: "Agregare produse" },
          { etapa: "Handover Scan", timp: "< 1s", desc: "Per AWB scanat" },
          { etapa: "Raport C0", timp: "< 2s", desc: "Generare PDF" },
        ].map((item, i) => (
          <Card key={i} className="text-center print:break-inside-avoid">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">{item.etapa}</p>
              <p className="text-xl font-bold text-primary">{item.timp}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </CardContent>
          </Card>
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
          Modulul de comenzi gestioneaza importul din Shopify (webhook real-time) si Trendyol (CRON),
          validarea datelor, si urmarirea prin toate statusurile pana la livrare.
        </p>
      </div>

      <SectionTitle icon={<GitMerge className="h-6 w-6" />}>Surse de Comenzi</SectionTitle>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-success/30">
          <CardContent className="pt-6">
            <Store className="h-8 w-8 text-success mx-auto mb-2" />
            <h3 className="font-semibold text-center">Shopify</h3>
            <p className="text-sm text-muted-foreground text-center mb-3">Webhook real-time</p>
            <ul className="text-xs space-y-1 text-muted-foreground">
              <li><strong>Endpoint:</strong> /api/webhooks/shopify/orders</li>
              <li><strong>Events:</strong> orders/create, orders/updated</li>
              <li><strong>Verificare:</strong> HMAC signature</li>
            </ul>
          </CardContent>
        </Card>
        <Card className="border-warning/30">
          <CardContent className="pt-6">
            <Globe className="h-8 w-8 text-warning mx-auto mb-2" />
            <h3 className="font-semibold text-center">Trendyol</h3>
            <p className="text-sm text-muted-foreground text-center mb-3">CRON sync 15 min</p>
            <ul className="text-xs space-y-1 text-muted-foreground">
              <li><strong>Endpoint:</strong> /api/cron/trendyol-orders</li>
              <li><strong>Status filter:</strong> Created, Picking</li>
              <li><strong>Deduplicare:</strong> trendyolOrderId</li>
            </ul>
          </CardContent>
        </Card>
        <Card className="border-muted-foreground/30">
          <CardContent className="pt-6">
            <Plus className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <h3 className="font-semibold text-center">Manual</h3>
            <p className="text-sm text-muted-foreground text-center mb-3">Creare din ERP</p>
            <ul className="text-xs space-y-1 text-muted-foreground">
              <li><strong>Pagina:</strong> Orders → New Order</li>
              <li><strong>Sursa:</strong> source = MANUAL</li>
              <li><strong>Validare:</strong> La submit form</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <SectionTitle icon={<CheckCircle2 className="h-6 w-6" />}>Validare Comenzi</SectionTitle>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-success">Validari Aplicate</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-sm">
                <Phone className="h-4 w-4 mt-0.5 text-success" />
                <div>
                  <strong>Telefon Romania:</strong>
                  <p className="text-xs text-muted-foreground">Format: 07XXXXXXXX sau +407XXXXXXXX</p>
                  <p className="text-xs text-muted-foreground">Validare: libphonenumber-js cu countryCode RO</p>
                </div>
              </li>
              <li className="flex items-start gap-2 text-sm">
                <MapPin className="h-4 w-4 mt-0.5 text-success" />
                <div>
                  <strong>Adresa Completa:</strong>
                  <p className="text-xs text-muted-foreground">Obligatoriu: strada, numar, oras</p>
                  <p className="text-xs text-muted-foreground">Optional: bloc, scara, etaj, apartament</p>
                </div>
              </li>
              <li className="flex items-start gap-2 text-sm">
                <Building2 className="h-4 w-4 mt-0.5 text-success" />
                <div>
                  <strong>Judet Valid FanCourier:</strong>
                  <p className="text-xs text-muted-foreground">Mapare la nomenclator curier</p>
                  <p className="text-xs text-muted-foreground">Corectie automata diacritice</p>
                </div>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">Erori Frecvente</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <XCircle className="h-4 w-4 text-destructive mt-0.5" />
                <div>
                  <strong>PHONE_INVALID:</strong>
                  <p className="text-xs text-muted-foreground">Numar prea scurt/lung sau format gresit</p>
                  <p className="text-xs text-success">Fix: Editare manuala din Orders</p>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <XCircle className="h-4 w-4 text-destructive mt-0.5" />
                <div>
                  <strong>ADDRESS_INCOMPLETE:</strong>
                  <p className="text-xs text-muted-foreground">Lipseste strada sau numarul</p>
                  <p className="text-xs text-success">Fix: Completare din detalii comanda</p>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <XCircle className="h-4 w-4 text-destructive mt-0.5" />
                <div>
                  <strong>COUNTY_INVALID:</strong>
                  <p className="text-xs text-muted-foreground">Judet necunoscut in nomenclator</p>
                  <p className="text-xs text-success">Fix: Selectare din dropdown valid</p>
                </div>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <SectionTitle icon={<Terminal className="h-6 w-6" />}>API Endpoints</SectionTitle>

      <div className="space-y-2">
        {[
          { method: "GET", path: "/api/orders", desc: "Lista comenzi cu filtrare, sortare, paginare" },
          { method: "GET", path: "/api/orders/[id]", desc: "Detalii comanda cu LineItems, Invoice, AWB" },
          { method: "POST", path: "/api/orders", desc: "Creare comanda manuala" },
          { method: "PUT", path: "/api/orders/[id]", desc: "Update date comanda (adresa, telefon)" },
          { method: "POST", path: "/api/orders/validate", desc: "Validare batch comenzi selectate" },
          { method: "POST", path: "/api/orders/process", desc: "Procesare completa: validare + factura + AWB" },
          { method: "POST", path: "/api/orders/process-all", desc: "Procesare toate comenzile PENDING" },
          { method: "POST", path: "/api/orders/[id]/cancel", desc: "Anulare comanda cu storno factura" },
          { method: "GET", path: "/api/orders/export", desc: "Export Excel comenzi filtrate" },
        ].map((ep, i) => (
          <ApiEndpoint key={i} {...ep} />
        ))}
      </div>
    </div>
  );
}

function InvoicesContent() {
  return (
    <div className="space-y-8">
      <div className="prose max-w-none">
        <p className="text-lg text-muted-foreground">
          Integrare completa cu Oblio pentru facturare electronica. Suport PF/PJ,
          e-Factura SPV, multiple serii, PDF automat si stornare.
        </p>
      </div>

      <SectionTitle icon={<FileText className="h-6 w-6" />}>Flux Emitere Factura</SectionTitle>

      <FlowStep steps={[
        { step: "1. Comanda VALIDATED", desc: "Date verificate" },
        { step: "2. Pregatire Payload", desc: "Client + Produse" },
        { step: "3. Oblio API", desc: "POST /invoice" },
        { step: "4. Download PDF", desc: "GET /invoice/pdf" },
        { step: "5. Salvare Local", desc: "DB + Storage" },
        { step: "6. Update Status", desc: "INVOICED" },
      ]} />

      <SectionTitle icon={<CreditCard className="h-6 w-6" />}>Tipuri Plata si Status Factura</SectionTitle>

      <InfoBox variant="success" title="Logica Automata (din v4.0)">
        <ul className="text-sm space-y-1">
          <li><strong>Comanda platita online (financialStatus = paid):</strong></li>
          <li className="ml-4">→ Factura emisa cu <code>paymentStatus: paid</code></li>
          <li className="ml-4">→ <code>paidAmount: totalPrice</code>, <code>paidAt: now()</code></li>
          <li className="mt-2"><strong>Comanda ramburs (financialStatus = pending):</strong></li>
          <li className="ml-4">→ Factura emisa cu <code>paymentStatus: unpaid</code></li>
          <li className="ml-4">→ Se marcheaza platita la livrare (manual sau CRON)</li>
        </ul>
      </InfoBox>

      <SectionTitle icon={<Users className="h-6 w-6" />}>Tipuri de Clienti</SectionTitle>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle>Persoana Fizica (PF)</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li><strong>Nume complet:</strong> Din comanda Shopify</li>
              <li><strong>CNP:</strong> Optional (poate fi lasat gol)</li>
              <li><strong>Adresa:</strong> Validata la pasul anterior</li>
              <li><strong>Telefon:</strong> Format RO validat</li>
              <li><strong>Email:</strong> Pentru trimitere factura</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-success/30">
          <CardHeader>
            <CardTitle>Persoana Juridica (PJ)</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li><strong>Denumire firma:</strong> Obligatoriu</li>
              <li><strong>CUI/CIF:</strong> Validat (cu/fara RO prefix)</li>
              <li><strong>Nr. Reg. Com:</strong> J00/000/0000</li>
              <li><strong>Adresa sediu:</strong> Din ANAF sau manual</li>
              <li><strong>IBAN:</strong> Optional pentru plati bancare</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <SectionTitle icon={<Layers className="h-6 w-6" />}>Serii de Facturi</SectionTitle>

      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground mb-4">
            Fiecare companie poate avea multiple serii de facturi. Seria activa se selecteaza
            din Settings sau se poate specifica per comanda.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { prefix: "FCT", desc: "Facturi standard", example: "FCT-00001" },
              { prefix: "PRF", desc: "Proforma", example: "PRF-00001" },
              { prefix: "AVZ", desc: "Avize", example: "AVZ-00001" },
              { prefix: "STR", desc: "Storno", example: "STR-00001" },
            ].map((serie, i) => (
              <div key={i} className="p-3 bg-muted rounded-lg text-center">
                <p className="font-mono font-bold text-primary">{serie.prefix}</p>
                <p className="text-xs text-muted-foreground">{serie.desc}</p>
                <p className="text-xs font-mono mt-1">{serie.example}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <SectionTitle icon={<FileCheck className="h-6 w-6" />}>e-Factura SPV</SectionTitle>

      <InfoBox variant="info" title="Integrare e-Factura">
        Oblio suporta trimiterea automata a facturilor catre SPV (Sistemul Patria Virtuala).
        Configurare din Oblio dashboard, nu din ERP. Statusul e-Factura se sincronizeaza automat.
      </InfoBox>

      <SectionTitle icon={<Terminal className="h-6 w-6" />}>API Endpoints</SectionTitle>

      <div className="space-y-2">
        {[
          { method: "GET", path: "/api/invoices", desc: "Lista facturi cu filtrare" },
          { method: "POST", path: "/api/invoices/issue", desc: "Emite factura pentru comanda" },
          { method: "POST", path: "/api/invoices/batch", desc: "Emite facturi batch (multiple comenzi)" },
          { method: "GET", path: "/api/invoices/[id]", desc: "Detalii factura" },
          { method: "GET", path: "/api/invoices/[id]/pdf", desc: "Download PDF factura" },
          { method: "POST", path: "/api/invoices/[id]/cancel", desc: "Storno factura emisa" },
          { method: "POST", path: "/api/invoices/[id]/mark-paid", desc: "Marcheaza factura platita" },
          { method: "GET", path: "/api/invoices/series", desc: "Lista serii configurate" },
        ].map((ep, i) => (
          <ApiEndpoint key={i} {...ep} />
        ))}
      </div>
    </div>
  );
}

function ShippingContent() {
  return (
    <div className="space-y-8">
      <div className="prose max-w-none">
        <p className="text-lg text-muted-foreground">
          Integrare completa FanCourier: generare AWB, tracking automat CRON,
          ramburs inteligent (0 pentru comenzi platite), etichete PDF.
        </p>
      </div>

      <SectionTitle icon={<Truck className="h-6 w-6" />}>Flux Generare AWB</SectionTitle>

      <FlowStep steps={[
        { step: "1. Comanda INVOICED", desc: "Factura emisa" },
        { step: "2. Check financialStatus", desc: "paid vs pending" },
        { step: "3. Set Ramburs", desc: "0 sau totalPrice" },
        { step: "4. FanCourier API", desc: "POST /order" },
        { step: "5. Salvare AWB", desc: "Numar + PDF label" },
        { step: "6. Status AWB_CREATED", desc: "Ready for picking" },
      ]} />

      <SectionTitle icon={<Banknote className="h-6 w-6" />}>Logica Ramburs Automat</SectionTitle>

      <InfoBox variant="success" title="Comportament v4.0+">
        <div className="font-mono text-xs bg-muted p-3 rounded mt-2">
{`// awb-service.ts - Logica automata ramburs
const isPaidOrder = order.financialStatus === "paid";

if (isPaidOrder) {
  cod = 0;                    // Fara ramburs
  paymentType = "expeditor";  // Expeditorul plateste transportul
} else {
  cod = order.totalPrice;     // Ramburs = valoare comanda
  paymentType = "destinatar"; // Destinatarul plateste
}`}
        </div>
      </InfoBox>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-success/30">
          <CardHeader>
            <CardTitle className="text-success">Comanda Platita Online</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li><strong>financialStatus:</strong> paid</li>
              <li><strong>Ramburs (COD):</strong> 0 RON</li>
              <li><strong>Payment Type:</strong> expeditor</li>
              <li><strong>Serviciu:</strong> Standard/Express</li>
            </ul>
          </CardContent>
        </Card>
        <Card className="border-warning/30">
          <CardHeader>
            <CardTitle className="text-warning">Comanda Ramburs</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li><strong>financialStatus:</strong> pending</li>
              <li><strong>Ramburs (COD):</strong> totalPrice RON</li>
              <li><strong>Payment Type:</strong> destinatar</li>
              <li><strong>Serviciu:</strong> Cont Colector</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <SectionTitle icon={<RefreshCw className="h-6 w-6" />}>Tracking Automat</SectionTitle>

      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground mb-4">
            Un CRON job ruleaza la fiecare 30 minute si actualizeaza statusul tuturor AWB-urilor active.
          </p>
          <div className="space-y-2">
            {[
              { fc: "Comanda preluata", erp: "AWB_CREATED", color: "bg-primary/10" },
              { fc: "In curs de ridicare", erp: "PICKING", color: "bg-warning/10" },
              { fc: "Ridicat de curier", erp: "SHIPPED", color: "bg-warning/10" },
              { fc: "In tranzit", erp: "SHIPPED", color: "bg-warning/10" },
              { fc: "In livrare", erp: "SHIPPED", color: "bg-warning/10" },
              { fc: "Livrat", erp: "DELIVERED", color: "bg-success/10" },
              { fc: "Returnat expeditor", erp: "RETURNED", color: "bg-destructive/10" },
            ].map((item, i) => (
              <div key={i} className={cn("flex items-center justify-between p-2 rounded", item.color)}>
                <Badge variant="outline" className="min-w-[140px]">{item.fc}</Badge>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <Badge variant="secondary">{item.erp}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <SectionTitle icon={<Terminal className="h-6 w-6" />}>API Endpoints</SectionTitle>

      <div className="space-y-2">
        {[
          { method: "GET", path: "/api/awb", desc: "Lista AWB-uri cu filtrare status" },
          { method: "POST", path: "/api/awb/create", desc: "Generare AWB pentru comanda" },
          { method: "POST", path: "/api/awb/batch", desc: "Generare AWB-uri multiple" },
          { method: "GET", path: "/api/awb/[id]", desc: "Detalii AWB cu istoric status" },
          { method: "GET", path: "/api/awb/[id]/label", desc: "Download PDF eticheta" },
          { method: "POST", path: "/api/awb/[id]/cancel", desc: "Anulare AWB" },
          { method: "POST", path: "/api/awb/refresh", desc: "Force refresh tracking" },
        ].map((ep, i) => (
          <ApiEndpoint key={i} {...ep} />
        ))}
      </div>
    </div>
  );
}

function PickingContent() {
  return (
    <div className="space-y-8">
      <div className="prose max-w-none">
        <p className="text-lg text-muted-foreground">
          Sistemul de picking permite crearea listelor agregate per produs,
          scanare barcode pentru validare si urmarirea progresului.
        </p>
      </div>

      <SectionTitle icon={<ClipboardList className="h-6 w-6" />}>Flux Picking</SectionTitle>

      <FlowStep steps={[
        { step: "1. Selectie Comenzi", desc: "Status AWB_CREATED" },
        { step: "2. Creare Lista", desc: "Agregare produse" },
        { step: "3. Print Lista", desc: "PDF pentru warehouse" },
        { step: "4. Scanare", desc: "Barcode validare" },
        { step: "5. Finalizare", desc: "Status PACKED" },
      ]} />

      <SectionTitle icon={<Boxes className="h-6 w-6" />}>Lista Agregata</SectionTitle>

      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground mb-4">
            Produsele din toate comenzile selectate sunt agregate intr-o singura lista
            pentru eficienta maxima in warehouse.
          </p>
          <div className="bg-muted p-4 rounded-lg font-mono text-xs">
{`┌────────────────────────────────────────────────────┐
│           PICKING LIST #PL-2026-0042               │
│           Data: 02.02.2026 10:30                   │
├────────────────────────────────────────────────────┤
│ SKU          │ Produs              │ Qty │ Comenzi │
├──────────────┼─────────────────────┼─────┼─────────┤
│ SAPUN-001    │ Sapun Natural 100g  │ 15  │ 8       │
│ CREMA-002    │ Crema Hidratanta    │ 8   │ 6       │
│ KIT-003      │ Kit Cadou Premium   │ 3   │ 3       │
│ LUMANARE-004 │ Lumanare Parfumata  │ 12  │ 7       │
└────────────────────────────────────────────────────┘`}
          </div>
        </CardContent>
      </Card>

      <SectionTitle icon={<Scan className="h-6 w-6" />}>Scanare Barcode</SectionTitle>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-success/30">
          <CardHeader>
            <CardTitle className="text-success text-sm">Scanare Valida</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>✓ Barcode exista in lista</li>
              <li>✓ Cantitate nu depaseste cerinta</li>
              <li>✓ Produs nu e deja complet</li>
              <li>→ Incrementeaza pickedQuantity</li>
            </ul>
          </CardContent>
        </Card>
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-destructive text-sm">Scanare Invalida</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>✗ Barcode necunoscut</li>
              <li>✗ Produs nu e in lista</li>
              <li>✗ Cantitate deja completa</li>
              <li>→ Eroare + sunet alerta</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <SectionTitle icon={<Terminal className="h-6 w-6" />}>API Endpoints</SectionTitle>

      <div className="space-y-2">
        {[
          { method: "GET", path: "/api/picking", desc: "Lista picking lists" },
          { method: "POST", path: "/api/picking/create", desc: "Creare picking list din comenzi" },
          { method: "GET", path: "/api/picking/[id]", desc: "Detalii lista cu progres" },
          { method: "POST", path: "/api/picking/[id]/scan", desc: "Scanare produs (barcode)" },
          { method: "POST", path: "/api/picking/[id]/complete", desc: "Finalizare picking" },
          { method: "GET", path: "/api/picking/[id]/pdf", desc: "Download PDF lista" },
        ].map((ep, i) => (
          <ApiEndpoint key={i} {...ep} />
        ))}
      </div>
    </div>
  );
}

function HandoverContent() {
  return (
    <div className="space-y-8">
      <div className="prose max-w-none">
        <p className="text-lg text-muted-foreground">
          Modulul Handover gestioneaza predarea coletelor catre curier cu sesiuni,
          scanare AWB, raport C0 si alerte pentru colete nepredate.
        </p>
      </div>

      <SectionTitle icon={<Hand className="h-6 w-6" />}>Flux Predare</SectionTitle>

      <FlowStep steps={[
        { step: "1. Start Sesiune", desc: "Operator deschide" },
        { step: "2. Scanare AWB", desc: "Fiecare colet" },
        { step: "3. Validare", desc: "Status PACKED" },
        { step: "4. Finalizare", desc: "Generare C0" },
        { step: "5. Update", desc: "Status SHIPPED" },
      ]} />

      <SectionTitle icon={<FileText className="h-6 w-6" />}>Raport C0</SectionTitle>

      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground mb-4">
            Raportul C0 este documentul oficial de predare catre FanCourier.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-sm mb-2">Continut Raport:</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Lista AWB-uri predate</li>
                <li>• Data si ora predare</li>
                <li>• Numar total colete</li>
                <li>• Valoare totala ramburs</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2">Semnaturi:</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Operator depozit</li>
                <li>• Curier FanCourier</li>
                <li>• Timestamp generare</li>
                <li>• ID sesiune handover</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <SectionTitle icon={<AlertTriangle className="h-6 w-6" />}>Alerte Colete Nepredate</SectionTitle>

      <InfoBox variant="warning" title="Sistem Alerte">
        Sistemul genereaza alerte automate pentru comenzile cu status PACKED
        care nu au fost predate in termen de 24h. Alertele apar in dashboard.
      </InfoBox>

      <SectionTitle icon={<Terminal className="h-6 w-6" />}>API Endpoints</SectionTitle>

      <div className="space-y-2">
        {[
          { method: "GET", path: "/api/handover/today", desc: "Sesiunea de azi" },
          { method: "POST", path: "/api/handover/scan", desc: "Scanare AWB in sesiune" },
          { method: "POST", path: "/api/handover/finalize", desc: "Finalizare + generare C0" },
          { method: "GET", path: "/api/handover/report", desc: "Raport handover" },
          { method: "GET", path: "/api/handover/not-handed", desc: "AWB-uri nepredate (alerte)" },
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
          Sistem dual de inventar: MasterProduct (catalog cu SKU/barcode) +
          InventoryItem (stoc avansat cu retete si loturi).
        </p>
      </div>

      <SectionTitle icon={<Layers3 className="h-6 w-6" />}>Arhitectura Dual Stock</SectionTitle>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="text-primary">MasterProduct (Catalog)</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-2 text-muted-foreground">
              <li><strong>SKU:</strong> Cod unic intern (ex: PROD-001)</li>
              <li><strong>Barcode:</strong> EAN13/UPC pentru scanare</li>
              <li><strong>Titlu/Descriere:</strong> Date produs</li>
              <li><strong>Pret vanzare:</strong> RON cu TVA</li>
              <li><strong>Stoc simplu:</strong> Cantitate curenta</li>
              <li><strong>shopifyProductId:</strong> Link Shopify</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-success/30">
          <CardHeader>
            <CardTitle className="text-success">InventoryItem (Stoc Avansat)</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-2 text-muted-foreground">
              <li><strong>oblioCode:</strong> Cod sync Oblio</li>
              <li><strong>isComposite:</strong> Flag produs compus</li>
              <li><strong>recipeItems:</strong> Lista componente reteta</li>
              <li><strong>costPrice:</strong> Pret achizitie furnizor</li>
              <li><strong>minStock:</strong> Prag alerta stoc scazut</li>
              <li><strong>StockMovement:</strong> Istoric complet</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <SectionTitle icon={<Workflow className="h-6 w-6" />}>Produse Compuse (Retete)</SectionTitle>

      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground mb-4">
            Un produs compus are o lista de componente. La vanzare, stocul se scade
            automat din fiecare componenta.
          </p>
          <div className="bg-muted p-4 rounded-lg font-mono text-xs">
{`Exemplu: Kit Cadou (SKU: KIT-001)
├── 1x Cutie Cadou (CUTIE-001)    → scade 1 din stoc
├── 2x Sapun Natural (SAPUN-001)  → scade 2 din stoc
└── 1x Lumanare (LUMANARE-001)    → scade 1 din stoc

La vanzare 1x KIT-001:
- Stoc KIT-001 ramas constant (produs virtual)
- Stoc CUTIE-001: -1
- Stoc SAPUN-001: -2
- Stoc LUMANARE-001: -1`}
          </div>
        </CardContent>
      </Card>

      <SectionTitle icon={<Terminal className="h-6 w-6" />}>API Endpoints</SectionTitle>

      <div className="space-y-2">
        {[
          { method: "GET", path: "/api/products", desc: "Lista MasterProducts" },
          { method: "GET", path: "/api/inventory-items", desc: "Lista InventoryItems cu stoc" },
          { method: "POST", path: "/api/inventory-items", desc: "Creare articol inventar" },
          { method: "PUT", path: "/api/inventory-items/[id]", desc: "Update stoc, pret, reteta" },
          { method: "POST", path: "/api/inventory/adjust", desc: "Ajustare manuala stoc" },
          { method: "GET", path: "/api/inventory/movements", desc: "Istoric miscari stoc" },
          { method: "GET", path: "/api/inventory/alerts", desc: "Produse sub stoc minim" },
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
          Integrare completa Meta Ads si TikTok Ads prin OAuth. Sincronizare campanii,
          calcul ROAS per produs, alerte performanta, actiuni automate.
        </p>
      </div>

      <SectionTitle icon={<Key className="h-6 w-6" />}>Autentificare OAuth</SectionTitle>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="text-primary">Meta Ads</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-2 text-muted-foreground">
              <li><strong>Scopes:</strong> ads_read, ads_management</li>
              <li><strong>Token:</strong> Long-lived (60 zile)</li>
              <li><strong>Refresh:</strong> Automat inainte expirare</li>
              <li><strong>Platforme:</strong> Facebook + Instagram</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-destructive">TikTok Ads</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-2 text-muted-foreground">
              <li><strong>Scopes:</strong> ad.read, ad.write</li>
              <li><strong>Token:</strong> Short-lived + refresh</li>
              <li><strong>Refresh:</strong> La fiecare request</li>
              <li><strong>API:</strong> TikTok Business API</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <SectionTitle icon={<TrendingUp className="h-6 w-6" />}>Metrici Tracked</SectionTitle>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { metric: "Spend", desc: "Cost total" },
          { metric: "Impressions", desc: "Afisari" },
          { metric: "Clicks", desc: "Click-uri" },
          { metric: "CTR", desc: "Click rate" },
          { metric: "Conversions", desc: "Achizitii" },
          { metric: "CPA", desc: "Cost/achizitie" },
          { metric: "Revenue", desc: "Venituri" },
          { metric: "ROAS", desc: "Return on spend" },
        ].map((item, i) => (
          <Card key={i} className="text-center">
            <CardContent className="pt-4 pb-3">
              <p className="font-semibold">{item.metric}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <SectionTitle icon={<Bell className="h-6 w-6" />}>Sistem Alerte</SectionTitle>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Tipuri Alerte</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-xs text-muted-foreground space-y-2">
              <li><strong>ROAS_LOW:</strong> ROAS sub 2.0</li>
              <li><strong>SPEND_HIGH:</strong> Peste budget zilnic</li>
              <li><strong>CTR_LOW:</strong> CTR sub 1%</li>
              <li><strong>NO_CONVERSIONS:</strong> 0 in 24h</li>
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Actiuni Automate</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-xs text-muted-foreground space-y-2">
              <li><strong>PAUSE_CAMPAIGN:</strong> Oprire automata</li>
              <li><strong>REDUCE_BUDGET:</strong> Scadere 20%</li>
              <li><strong>NOTIFY_EMAIL:</strong> Email alert</li>
              <li><strong>NOTIFY_SLACK:</strong> Slack message</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <SectionTitle icon={<Terminal className="h-6 w-6" />}>API Endpoints</SectionTitle>

      <div className="space-y-2">
        {[
          { method: "GET", path: "/api/ads/accounts", desc: "Lista conturi conectate" },
          { method: "GET", path: "/api/ads/campaigns", desc: "Lista campanii" },
          { method: "GET", path: "/api/ads/campaigns/[id]/insights", desc: "Metrici campanie" },
          { method: "POST", path: "/api/ads/campaigns/[id]/pause", desc: "Pause campanie" },
          { method: "GET", path: "/api/ads/alerts", desc: "Lista alerte active" },
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
          Integrare completa Trendyol marketplace: sincronizare comenzi si produse,
          publicare catalog, actualizare stoc, mapare SKU-uri.
        </p>
      </div>

      <SectionTitle icon={<Globe className="h-6 w-6" />}>Capabilitati</SectionTitle>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Sincronizare Comenzi</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-2 text-muted-foreground">
              <li><strong>Frecventa:</strong> CRON la 15 minute</li>
              <li><strong>Status filter:</strong> Created, Picking</li>
              <li><strong>Deduplicare:</strong> trendyolOrderId</li>
              <li><strong>Mapare:</strong> Adresa, produse, preturi</li>
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Publicare Produse</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-2 text-muted-foreground">
              <li><strong>Categorii:</strong> Mapare la taxonomie Trendyol</li>
              <li><strong>Atribute:</strong> Brand, culoare, marime</li>
              <li><strong>Imagini:</strong> Upload automat</li>
              <li><strong>Stoc:</strong> Sync bidirectional</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <SectionTitle icon={<Terminal className="h-6 w-6" />}>API Endpoints</SectionTitle>

      <div className="space-y-2">
        {[
          { method: "GET", path: "/api/trendyol/orders", desc: "Lista comenzi Trendyol" },
          { method: "POST", path: "/api/trendyol/orders/sync", desc: "Sincronizare comenzi" },
          { method: "GET", path: "/api/trendyol/products", desc: "Produse listate" },
          { method: "POST", path: "/api/trendyol/products/publish", desc: "Publicare produs" },
          { method: "GET", path: "/api/trendyol/mapping", desc: "Mapare SKU-uri" },
        ].map((ep, i) => (
          <ApiEndpoint key={i} {...ep} />
        ))}
      </div>
    </div>
  );
}

function ArchitectureContent() {
  return (
    <div className="space-y-8">
      <div className="prose max-w-none">
        <p className="text-lg text-muted-foreground">
          Arhitectura tehnica a platformei ERP CashFlowSync: stack tehnologic,
          structura proiect, pattern-uri folosite.
        </p>
      </div>

      <SectionTitle icon={<Server className="h-6 w-6" />}>Stack Tehnologic</SectionTitle>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { name: "Next.js 14", type: "Framework", desc: "App Router + RSC" },
          { name: "React 18", type: "UI Library", desc: "Server Components" },
          { name: "TypeScript", type: "Language", desc: "Type safety" },
          { name: "Tailwind CSS", type: "Styling", desc: "Utility-first" },
          { name: "Prisma", type: "ORM", desc: "Type-safe queries" },
          { name: "PostgreSQL", type: "Database", desc: "Primary store" },
          { name: "NextAuth.js", type: "Auth", desc: "OAuth + Credentials" },
          { name: "shadcn/ui", type: "Components", desc: "Radix primitives" },
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

      <SectionTitle icon={<FolderTree className="h-6 w-6" />}>Structura Proiect</SectionTitle>

      <CodeBlock
        title="Directoare Principale"
        code={`erp-cashflowsync/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (dashboard)/        # Pagini protejate (layout cu sidebar)
│   │   │   ├── dashboard/      # Pagina principala
│   │   │   ├── orders/         # Modul comenzi
│   │   │   ├── products/       # Modul produse
│   │   │   ├── inventory/      # Modul inventar
│   │   │   ├── invoices/       # Modul facturi
│   │   │   ├── picking/        # Modul picking
│   │   │   ├── handover/       # Modul predare
│   │   │   ├── ads/            # Modul advertising
│   │   │   ├── trendyol/       # Modul Trendyol
│   │   │   ├── settings/       # Configurari
│   │   │   └── docs/           # Documentatie (aceasta pagina)
│   │   ├── api/                # API Routes (50+ endpoints)
│   │   │   ├── orders/         # CRUD comenzi
│   │   │   ├── invoices/       # Facturare Oblio
│   │   │   ├── awb/            # AWB FanCourier
│   │   │   ├── webhooks/       # Shopify webhooks
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
│   │   ├── invoice-service.ts  # Invoice business logic
│   │   ├── awb-service.ts      # AWB business logic
│   │   └── permissions.ts      # RBAC utilities
│   └── hooks/                  # Custom React hooks
├── prisma/
│   └── schema.prisma           # Database schema (80+ models)
└── public/                     # Static assets`}
      />

      <SectionTitle icon={<Layers className="h-6 w-6" />}>Arhitectura pe Straturi</SectionTitle>

      <DiagramBox title="Diagrama Arhitectura" className="print:break-inside-avoid">
        <div className="font-mono text-xs whitespace-pre overflow-x-auto">
{`┌─────────────────────────────────────────────────────────────────┐
│                     PRESENTATION LAYER                          │
│   Next.js App Router + React Server Components + shadcn/ui      │
│   Dashboard | Orders | Invoices | AWB | Picking | Products      │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTP/REST
┌───────────────────────────▼─────────────────────────────────────┐
│                        API LAYER                                │
│   Next.js API Routes with validation (Zod) + auth middleware    │
│   /api/orders | /api/invoices | /api/awb | /api/products        │
└───────────────────────────┬─────────────────────────────────────┘
                            │ Function calls
┌───────────────────────────▼─────────────────────────────────────┐
│                     SERVICE LAYER                               │
│   Business logic services with dependency injection             │
│   invoice-service | awb-service | sync-service | permissions    │
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
│   Shopify | Oblio | FanCourier | Meta Ads | TikTok | Trendyol   │
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
          relatii complexe si constrangeri de integritate.
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

Order (1) ───────────────────── (N) LineItem
      ├── (1) ─────────── (1) Invoice
      ├── (1) ─────────── (1) AWB
      └── (N) ─────────── (N) ProcessingError

AWB (1) ─────────────────────── (N) AWBStatusHistory
    └── (1) ─────────── (1) HandoverSession

User (1) ────────────────────── (N) UserRoleAssignment
     ├── (N) ─────────── (N) UserGroupMembership
     └── (N) ─────────── (N) UserStoreAccess

MasterProduct (1) ───────────── (N) Product (variants)
              └── (N) ─────── (N) MasterProductChannel

InventoryItem (1) ───────────── (N) WarehouseStock
              ├── (N) ─────── (N) InventoryStockMovement
              └── (N) ─────── (N) InventoryRecipeComponent`}
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
    { category: "Orders", count: 9, permissions: ["view", "create", "edit", "delete", "process", "validate", "cancel", "export", "import"] },
    { category: "Products", count: 7, permissions: ["view", "create", "edit", "delete", "import", "export", "sync"] },
    { category: "Inventory", count: 6, permissions: ["view", "adjust", "transfer", "alerts", "sync", "recipes"] },
    { category: "Invoices", count: 5, permissions: ["view", "issue", "cancel", "download", "series.manage"] },
    { category: "AWB", count: 6, permissions: ["view", "create", "cancel", "download", "track", "batch"] },
    { category: "Picking", count: 6, permissions: ["view", "create", "scan", "complete", "cancel", "print"] },
    { category: "Handover", count: 5, permissions: ["view", "create", "scan", "finalize", "c0.download"] },
    { category: "Ads", count: 7, permissions: ["view", "accounts.manage", "campaigns.view", "campaigns.control", "alerts.view", "alerts.dismiss", "settings"] },
    { category: "Users", count: 5, permissions: ["view", "create", "edit", "delete", "roles.assign"] },
    { category: "Settings", count: 5, permissions: ["view", "edit", "integrations", "company", "notifications"] },
  ];

  return (
    <div className="space-y-8">
      <div className="prose max-w-none">
        <p className="text-lg text-muted-foreground">
          Sistem RBAC complet cu 124 permisiuni granulare, 6 roluri predefinite,
          grupuri de utilizatori si audit logging.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Permisiuni" value="124" description="Granulare per actiune" icon={<Key className="h-5 w-5" />} />
        <StatCard label="Roluri Default" value="6" description="Predefinite" icon={<Shield className="h-5 w-5" />} />
        <StatCard label="Categorii" value="14" description="Module sistem" icon={<Layers className="h-5 w-5" />} />
        <StatCard label="Audit Log" value="100%" description="Toate actiunile" icon={<History className="h-5 w-5" />} />
      </div>

      <SectionTitle icon={<Shield className="h-6 w-6" />}>Roluri Predefinite</SectionTitle>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {[
          { name: "Super Admin", perms: "124/124", desc: "Acces complet" },
          { name: "Admin", perms: "98/124", desc: "Fara system settings" },
          { name: "Manager", perms: "72/124", desc: "Operatiuni complete" },
          { name: "Operator", perms: "45/124", desc: "Procesare comenzi" },
          { name: "Warehouse", perms: "18/124", desc: "Picking + Handover" },
          { name: "Viewer", perms: "15/124", desc: "Doar vizualizare" },
        ].map((role, i) => (
          <Card key={i}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{role.name}</span>
                <Badge variant="outline">{role.perms}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{role.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <SectionTitle icon={<Key className="h-6 w-6" />}>Categorii Permisiuni</SectionTitle>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
        {permissionCategories.map((cat, i) => (
          <Card key={i} className="text-center">
            <CardContent className="pt-3 pb-2">
              <p className="font-semibold text-sm">{cat.category}</p>
              <p className="text-xs text-muted-foreground">{cat.count} permisiuni</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function CronContent() {
  return (
    <div className="space-y-8">
      <div className="prose max-w-none">
        <p className="text-lg text-muted-foreground">
          Taskuri automate programate: sincronizare date, tracking AWB,
          alerte, cleanup. Toate necesita header <code>Authorization: Bearer CRON_SECRET</code>.
        </p>
      </div>

      <SectionTitle icon={<Timer className="h-6 w-6" />}>Lista CRON Jobs</SectionTitle>

      <div className="space-y-2">
        {[
          { endpoint: "/api/cron/sync-orders", freq: "15 min", desc: "Sincronizeaza comenzi noi din Shopify" },
          { endpoint: "/api/cron/trendyol-orders", freq: "15 min", desc: "Sincronizeaza comenzi Trendyol" },
          { endpoint: "/api/cron/sync-awb", freq: "30 min", desc: "Actualizeaza status AWB din FanCourier" },
          { endpoint: "/api/cron/ads-sync", freq: "1 ora", desc: "Fetch metrici campanii Meta/TikTok" },
          { endpoint: "/api/cron/ads-alerts", freq: "1 ora", desc: "Verifica reguli de alertare ads" },
          { endpoint: "/api/cron/ai-analysis", freq: "Zilnic", desc: "Genereaza insights AI pentru ads" },
          { endpoint: "/api/cron/handover-alerts", freq: "Zilnic", desc: "Alerte colete nepredate" },
          { endpoint: "/api/cron/stock-alerts", freq: "Zilnic", desc: "Alerte stoc scazut" },
        ].map((job, i) => (
          <div key={i} className="flex items-center gap-4 p-3 bg-muted rounded-lg">
            <Badge variant="secondary" className="min-w-[80px] justify-center">{job.freq}</Badge>
            <code className="text-sm font-mono flex-1">{job.endpoint}</code>
            <span className="text-xs text-muted-foreground hidden md:block">{job.desc}</span>
          </div>
        ))}
      </div>

      <InfoBox variant="info" title="Configurare Vercel Cron">
        CRON jobs sunt configurate in <code>vercel.json</code> si ruleaza pe Vercel serverless.
        Fiecare job are un lock pentru a preveni executii paralele.
      </InfoBox>
    </div>
  );
}

function ApiReferenceContent() {
  const apiGroups = [
    {
      name: "Orders",
      endpoints: [
        { method: "GET", path: "/api/orders", desc: "Lista comenzi" },
        { method: "GET", path: "/api/orders/[id]", desc: "Detalii comanda" },
        { method: "POST", path: "/api/orders", desc: "Creare comanda" },
        { method: "PUT", path: "/api/orders/[id]", desc: "Update comanda" },
        { method: "POST", path: "/api/orders/process", desc: "Procesare completa" },
        { method: "POST", path: "/api/orders/validate", desc: "Validare batch" },
      ]
    },
    {
      name: "Invoices",
      endpoints: [
        { method: "GET", path: "/api/invoices", desc: "Lista facturi" },
        { method: "POST", path: "/api/invoices/issue", desc: "Emitere factura" },
        { method: "GET", path: "/api/invoices/[id]/pdf", desc: "Download PDF" },
        { method: "POST", path: "/api/invoices/[id]/cancel", desc: "Storno" },
      ]
    },
    {
      name: "AWB",
      endpoints: [
        { method: "GET", path: "/api/awb", desc: "Lista AWB-uri" },
        { method: "POST", path: "/api/awb/create", desc: "Generare AWB" },
        { method: "GET", path: "/api/awb/[id]/label", desc: "Download eticheta" },
        { method: "POST", path: "/api/awb/refresh", desc: "Refresh tracking" },
      ]
    },
    {
      name: "Picking",
      endpoints: [
        { method: "GET", path: "/api/picking", desc: "Lista picking" },
        { method: "POST", path: "/api/picking/create", desc: "Creare lista" },
        { method: "POST", path: "/api/picking/[id]/scan", desc: "Scanare produs" },
      ]
    },
    {
      name: "Handover",
      endpoints: [
        { method: "GET", path: "/api/handover/today", desc: "Sesiune azi" },
        { method: "POST", path: "/api/handover/scan", desc: "Scanare AWB" },
        { method: "POST", path: "/api/handover/finalize", desc: "Finalizare" },
      ]
    },
  ];

  return (
    <div className="space-y-8">
      <div className="prose max-w-none">
        <p className="text-lg text-muted-foreground">
          Referinta completa API-uri disponibile. Toate endpoint-urile necesita
          autentificare (NextAuth session sau API key).
        </p>
      </div>

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
        </p>
      </div>

      <CodeBlock
        title=".env.example"
        code={`# Database
DATABASE_URL="postgresql://user:password@localhost:5432/erp_cashflowsync"

# NextAuth
NEXTAUTH_SECRET="your-secret-key-min-32-chars"
NEXTAUTH_URL="https://your-domain.com"

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

# Meta Ads
META_APP_ID="your-app-id"
META_APP_SECRET="your-app-secret"

# TikTok Ads
TIKTOK_APP_ID="your-tiktok-app-id"
TIKTOK_APP_SECRET="your-tiktok-secret"

# Trendyol
TRENDYOL_SUPPLIER_ID="your-supplier-id"
TRENDYOL_API_KEY="your-api-key"
TRENDYOL_API_SECRET="your-api-secret"

# Claude AI (optional)
ANTHROPIC_API_KEY="sk-ant-xxxxx"

# CRON
CRON_SECRET="your-cron-secret"

# Google OAuth (optional)
GOOGLE_CLIENT_ID="xxxxx.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-xxxxx"`}
      />
    </div>
  );
}

function ChangelogContent() {
  const versions = [
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
                <Badge variant="outline">{v.date}</Badge>
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

  const renderContent = () => {
    switch (activeModule) {
      case "overview": return <OverviewContent />;
      case "quickstart": return <QuickstartContent />;
      case "business-flow": return <BusinessFlowContent />;
      case "orders": return <OrdersContent />;
      case "invoices": return <InvoicesContent />;
      case "shipping": return <ShippingContent />;
      case "picking": return <PickingContent />;
      case "handover": return <HandoverContent />;
      case "products": return <ProductsContent />;
      case "advertising": return <AdvertisingContent />;
      case "trendyol": return <TrendyolContent />;
      case "architecture": return <ArchitectureContent />;
      case "database": return <DatabaseContent />;
      case "integrations": return <IntegrationsContent />;
      case "rbac": return <RBACContent />;
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

          <div className="p-4 border-t">
            <Button onClick={handlePrint} className="w-full" variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Download PDF
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
