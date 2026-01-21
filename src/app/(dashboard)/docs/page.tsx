"use client";

import { useState } from "react";
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
} from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const DOC_VERSION = "3.1.0";
const LAST_UPDATED = "2026-01-13";

const modules = [
  { id: "overview", name: "Prezentare Generala", icon: Book },
  { id: "architecture", name: "Arhitectura Sistem", icon: Server },
  { id: "orders", name: "Comenzi si Procesare", icon: ShoppingCart },
  { id: "products", name: "Produse si Inventar", icon: Package },
  { id: "invoices", name: "Facturare Facturis", icon: FileText },
  { id: "shipping", name: "Livrare si AWB", icon: Truck },
  { id: "picking", name: "Picking si Predare", icon: ClipboardList },
  { id: "handover", name: "Predare Curier", icon: Hand },
  { id: "advertising", name: "Advertising", icon: Megaphone },
  { id: "rbac", name: "Permisiuni si Roluri", icon: Shield },
  { id: "database", name: "Baza de Date", icon: Database },
  { id: "integrations", name: "Integrari Externe", icon: Globe },
  { id: "api", name: "API Reference", icon: Code },
  { id: "changelog", name: "Istoric Versiuni", icon: History },
];

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-3 text-xl font-semibold text-foreground mt-8 mb-4">
      <span className="text-primary">{icon}</span>
      {children}
    </h2>
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
    <div className={cn("rounded-lg border p-4", style.bg, style.border)}>
      <div className="flex items-center gap-2 font-medium mb-2 text-foreground">
        {style.icon}
        {title}
      </div>
      <div className="text-sm text-muted-foreground">{children}</div>
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
    <div className="relative rounded-lg border border-border bg-muted overflow-hidden">
      {title && (
        <div className="px-4 py-2 bg-muted/80 border-b border-border text-sm text-muted-foreground">
          {title}
        </div>
      )}
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
        onClick={handleCopy}
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </Button>
      <pre className="p-4 text-sm text-foreground overflow-x-auto">
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
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          <div className="text-primary">{icon}</div>
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <span className="text-primary">{icon}</span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-3">{description}</p>
        <div className="flex flex-wrap gap-1">
          {badges.map((badge, i) => (
            <Badge key={i} variant="secondary" className="text-xs">{badge}</Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function OverviewContent() {
  return (
    <div className="space-y-8">
      <div className="prose max-w-none">
        <p className="text-lg text-muted-foreground">
          ERP CashFlowSync este o platforma enterprise pentru gestionarea completa a operatiunilor
          e-commerce: comenzi multi-canal, inventar cu sistem dual de stoc, facturare automata Facturis,
          livrare FanCourier, picking warehouse si advertising Meta/TikTok.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Permisiuni RBAC" value="124" description="Control granular acces" icon={<Shield className="h-5 w-5" />} />
        <StatCard label="Integrari" value="8" description="Shopify, Facturis, FanCourier..." icon={<GitBranch className="h-5 w-5" />} />
        <StatCard label="Tabele DB" value="80+" description="PostgreSQL + Prisma ORM" icon={<Database className="h-5 w-5" />} />
        <StatCard label="Statusuri Comanda" value="14" description="Flux complet de viata" icon={<Workflow className="h-5 w-5" />} />
      </div>

      <SectionTitle icon={<Zap className="h-6 w-6" />}>Capabilitati Principale</SectionTitle>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FeatureCard
          icon={<ShoppingCart className="h-5 w-5" />}
          title="Gestionare Comenzi Multi-Canal"
          description="Import automat din Shopify (webhook real-time) si Trendyol (CRON sync). Validare telefon RO, adresa, judet. 14 statusuri cu tranzitii automate."
          badges={["Shopify Webhook", "Trendyol CRON", "Validare libphonenumber", "14 Statusuri"]}
        />
        <FeatureCard
          icon={<FileText className="h-5 w-5" />}
          title="Facturare Facturis"
          description="Emitere facturi automate cu serii configurabile (FCT, PRF). Suport persoana fizica/juridica, calcul TVA, PDF storage, storno facturi."
          badges={["Facturis API", "Serii Multiple", "PDF Auto", "Storno"]}
        />
        <FeatureCard
          icon={<Truck className="h-5 w-5" />}
          title="AWB FanCourier"
          description="Generare AWB-uri cu toate optiunile: ramburs, asigurare, deschidere colet. Tracking automat CRON, mapare 8 statusuri curier la ERP."
          badges={["FanCourier API", "Ramburs COD", "Tracking Auto", "Status Mapping"]}
        />
        <FeatureCard
          icon={<Package className="h-5 w-5" />}
          title="Inventar Dual System"
          description="Sistem dual: MasterProduct (catalog) + InventoryItem (stoc avansat). Suport retete/composite, sincronizare Facturis, alerte stoc scazut."
          badges={["Dual Stock", "Retete", "Facturis Sync", "Alerte"]}
        />
        <FeatureCard
          icon={<ClipboardList className="h-5 w-5" />}
          title="Picking & Handover"
          description="Liste picking agregate per produs, scanare barcode, sesiuni predare curier cu raport C0, alerte colete nepredate."
          badges={["Agregare Produse", "Barcode Scan", "Raport C0", "Alerte"]}
        />
        <FeatureCard
          icon={<Megaphone className="h-5 w-5" />}
          title="Advertising Analytics"
          description="Integrare Meta Ads si TikTok Ads cu OAuth. Sincronizare campanii, calcul ROAS per produs, alerte performanta, actiuni automate."
          badges={["Meta OAuth", "TikTok OAuth", "ROAS Alerts", "Auto Actions"]}
        />
      </div>

      <SectionTitle icon={<Workflow className="h-6 w-6" />}>Fluxul Principal al Comenzii</SectionTitle>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 p-4 bg-muted rounded-lg">
          {[
            { step: "Import", desc: "Shopify/Trendyol" },
            { step: "Validare", desc: "Tel/Adresa/Judet" },
            { step: "Facturare", desc: "Facturis API" },
            { step: "AWB", desc: "FanCourier API" },
            { step: "Picking", desc: "Lista + Scanare" },
            { step: "Handover", desc: "Predare C0" },
            { step: "Tracking", desc: "Status Auto" },
            { step: "Livrare", desc: "Finalizare" }
          ].map((item, i, arr) => (
            <span key={i} className="flex items-center gap-2">
              <div className="text-center">
                <Badge variant="outline" className="px-3 py-1">{item.step}</Badge>
                <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
              </div>
              {i < arr.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
            </span>
          ))}
        </div>

        <InfoBox variant="info" title="Procesare Automata">
          Comenzile pot fi procesate automat: validare, facturare si AWB intr-un singur click
          prin endpoint-ul <code>/api/orders/process</code>. Fiecare pas actualizeaza statusul
          si trimite notificari in caz de eroare.
        </InfoBox>
      </div>

      <SectionTitle icon={<Globe className="h-6 w-6" />}>Integrari Externe</SectionTitle>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { name: "Shopify", type: "E-commerce", color: "text-success" },
          { name: "Trendyol", type: "Marketplace", color: "text-warning" },
          { name: "Facturis", type: "Facturare", color: "text-primary" },
          { name: "FanCourier", type: "Curierat", color: "text-accent-foreground" },
          { name: "Meta Ads", type: "Advertising", color: "text-primary" },
          { name: "TikTok Ads", type: "Advertising", color: "text-destructive" },
          { name: "Google Drive", type: "Storage", color: "text-warning" },
          { name: "NextAuth", type: "Auth", color: "text-muted-foreground" },
        ].map((svc, i) => (
          <Card key={i} className="text-center">
            <CardContent className="pt-4 pb-3">
              <p className={cn("font-semibold", svc.color)}>{svc.name}</p>
              <p className="text-xs text-muted-foreground">{svc.type}</p>
            </CardContent>
          </Card>
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
          Arhitectura ERP CashFlowSync este construita pe principii moderne de dezvoltare,
          cu separare clara intre UI, business logic si persistenta.
        </p>
      </div>

      <SectionTitle icon={<FolderTree className="h-6 w-6" />}>Structura Proiectului</SectionTitle>

      <CodeBlock
        title="Structura Detaliata"
        code={`erp-cashflowsync/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (dashboard)/        # Pagini protejate
│   │   │   ├── dashboard/      # Pagina principala
│   │   │   ├── orders/         # Modul comenzi
│   │   │   ├── products/       # Modul produse
│   │   │   ├── inventory/      # Modul inventar
│   │   │   ├── invoices/       # Modul facturi
│   │   │   ├── picking/        # Modul picking
│   │   │   ├── ads/            # Modul advertising
│   │   │   └── settings/       # Configurari
│   │   └── api/                # API Routes (50+)
│   ├── components/             # Componente React
│   │   └── ui/                 # shadcn/ui
│   ├── lib/                    # Business logic
│   │   ├── shopify.ts          # Client Shopify
│   │   ├── facturis.ts         # Facturare
│   │   ├── fancourier.ts       # AWB/Livrare
│   │   └── permissions.ts      # RBAC
│   └── hooks/                  # React hooks
└── prisma/schema.prisma        # Database schema`}
      />

      <SectionTitle icon={<Layers className="h-6 w-6" />}>Arhitectura pe Straturi</SectionTitle>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Eye className="h-5 w-5" />
              Presentation Layer
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            <p>React components cu Next.js App Router. Shadcn/ui pentru UI consistency.</p>
          </CardContent>
        </Card>

        <Card className="border-success/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-success">
              <Cog className="h-5 w-5" />
              Service Layer
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            <p>Fiecare integrare externa are un serviciu dedicat cu functii pure.</p>
          </CardContent>
        </Card>

        <Card className="border-accent-foreground/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-accent-foreground">
              <Code className="h-5 w-5" />
              API Routes
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            <p>Toate endpoint-urile urmeaza conventii REST cu validare si autorizare.</p>
          </CardContent>
        </Card>

        <Card className="border-warning/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-warning">
              <Timer className="h-5 w-5" />
              CRON Jobs
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            <p>Task-uri programate pentru sincronizare automata si cleanup.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function OrdersContent() {
  return (
    <div className="space-y-8">
      <div className="prose max-w-none">
        <p className="text-lg text-muted-foreground">
          Modulul de comenzi este inima sistemului ERP. Gestioneaza importul din Shopify (webhook real-time)
          si Trendyol (CRON periodic), validarea cu libphonenumber-js, procesarea automata si urmarirea
          prin 14 statusuri distincte pana la livrare.
        </p>
      </div>

      <SectionTitle icon={<GitMerge className="h-6 w-6" />}>Surse de Comenzi si Flux Date</SectionTitle>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-success/30 bg-success/5">
          <CardContent className="pt-6">
            <Store className="h-8 w-8 text-success mx-auto mb-2" />
            <h3 className="font-semibold text-foreground text-center">Shopify</h3>
            <p className="text-sm text-muted-foreground text-center mb-3">Webhook real-time</p>
            <div className="text-xs space-y-1 text-muted-foreground">
              <p><strong>Endpoint:</strong> /api/webhooks/shopify/orders</p>
              <p><strong>Events:</strong> orders/create, orders/updated</p>
              <p><strong>Mapare:</strong> shopifyOrderId, shopifyCustomerId</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="pt-6">
            <Globe className="h-8 w-8 text-warning mx-auto mb-2" />
            <h3 className="font-semibold text-foreground text-center">Trendyol</h3>
            <p className="text-sm text-muted-foreground text-center mb-3">CRON sync periodic</p>
            <div className="text-xs space-y-1 text-muted-foreground">
              <p><strong>Endpoint:</strong> /api/cron/trendyol-orders</p>
              <p><strong>Frecventa:</strong> La fiecare 15 minute</p>
              <p><strong>Mapare:</strong> trendyolOrderNumber</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-muted-foreground/30 bg-muted/50">
          <CardContent className="pt-6">
            <Plus className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <h3 className="font-semibold text-foreground text-center">Manual</h3>
            <p className="text-sm text-muted-foreground text-center mb-3">Creare din ERP</p>
            <div className="text-xs space-y-1 text-muted-foreground">
              <p><strong>Endpoint:</strong> POST /api/orders</p>
              <p><strong>Sursa:</strong> source = MANUAL</p>
              <p><strong>Validare:</strong> Zod schema + libphonenumber</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <SectionTitle icon={<Workflow className="h-6 w-6" />}>Cele 14 Statusuri ale Comenzii</SectionTitle>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {[
          { status: "PENDING", color: "bg-muted border-border", desc: "Comanda noua, nevalidata", next: "VALIDATED / VALIDATION_FAILED" },
          { status: "VALIDATED", color: "bg-primary/10 border-primary/30", desc: "Date validate OK", next: "INVOICE_PENDING" },
          { status: "VALIDATION_FAILED", color: "bg-destructive/10 border-destructive/30", desc: "Date invalide", next: "PENDING (dupa corectie)" },
          { status: "INVOICE_PENDING", color: "bg-warning/10 border-warning/30", desc: "In curs de facturare", next: "INVOICED / INVOICE_FAILED" },
          { status: "INVOICED", color: "bg-success/10 border-success/30", desc: "Factura emisa", next: "AWB_PENDING" },
          { status: "INVOICE_FAILED", color: "bg-destructive/10 border-destructive/30", desc: "Eroare Facturis", next: "INVOICE_PENDING (retry)" },
          { status: "AWB_PENDING", color: "bg-warning/10 border-warning/30", desc: "In curs de generare AWB", next: "AWB_CREATED / AWB_FAILED" },
          { status: "AWB_CREATED", color: "bg-success/10 border-success/30", desc: "AWB generat", next: "PICKING" },
          { status: "AWB_FAILED", color: "bg-destructive/10 border-destructive/30", desc: "Eroare FanCourier", next: "AWB_PENDING (retry)" },
          { status: "PICKING", color: "bg-primary/10 border-primary/30", desc: "In picking warehouse", next: "PACKED" },
          { status: "PACKED", color: "bg-success/10 border-success/30", desc: "Colet pregatit", next: "SHIPPED" },
          { status: "SHIPPED", color: "bg-warning/10 border-warning/30", desc: "Predat curier, in tranzit", next: "DELIVERED / RETURNED" },
          { status: "DELIVERED", color: "bg-success/10 border-success/30", desc: "Livrat cu succes", next: "Final" },
          { status: "RETURNED", color: "bg-destructive/10 border-destructive/30", desc: "Returnat", next: "Final" },
        ].map((item, i) => (
          <div key={i} className={cn("flex items-center justify-between p-3 rounded-lg border", item.color)}>
            <div>
              <Badge variant="outline">{item.status}</Badge>
              <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-muted-foreground">Next: {item.next}</span>
            </div>
          </div>
        ))}
      </div>

      <SectionTitle icon={<Zap className="h-6 w-6" />}>Validarea Comenzilor</SectionTitle>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-success">
              <CheckCircle2 className="h-5 w-5" />
              Validari Aplicate (libphonenumber-js)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4 mt-0.5" />
                <div>
                  <strong className="text-foreground">Telefon Romania:</strong>
                  <p className="text-xs">Format: 07XXXXXXXX sau +407XXXXXXXX</p>
                  <p className="text-xs">Validare: parsePhoneNumber cu countryCode RO</p>
                </div>
              </li>
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 mt-0.5" />
                <div>
                  <strong className="text-foreground">Adresa completa:</strong>
                  <p className="text-xs">Obligatoriu: strada, numar, oras</p>
                  <p className="text-xs">Optional: bloc, scara, etaj, apartament</p>
                </div>
              </li>
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <Building2 className="h-4 w-4 mt-0.5" />
                <div>
                  <strong className="text-foreground">Judet valid FanCourier:</strong>
                  <p className="text-xs">Mapare automata la nomenclator curier</p>
                  <p className="text-xs">Corectie automata diacritice</p>
                </div>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              Erori si Rezolvare
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2 text-muted-foreground">
                <XCircle className="h-4 w-4 text-destructive mt-0.5" />
                <div>
                  <strong className="text-foreground">PHONE_INVALID:</strong>
                  <p className="text-xs">Numar prea scurt/lung sau format gresit</p>
                  <p className="text-xs text-success">Fix: Editare manuala din UI orders</p>
                </div>
              </li>
              <li className="flex items-start gap-2 text-muted-foreground">
                <XCircle className="h-4 w-4 text-destructive mt-0.5" />
                <div>
                  <strong className="text-foreground">ADDRESS_INCOMPLETE:</strong>
                  <p className="text-xs">Lipseste strada sau numarul</p>
                  <p className="text-xs text-success">Fix: Completare din detalii comanda</p>
                </div>
              </li>
              <li className="flex items-start gap-2 text-muted-foreground">
                <XCircle className="h-4 w-4 text-destructive mt-0.5" />
                <div>
                  <strong className="text-foreground">COUNTY_INVALID:</strong>
                  <p className="text-xs">Judet necunoscut in nomenclator</p>
                  <p className="text-xs text-success">Fix: Selectare din dropdown valid</p>
                </div>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <SectionTitle icon={<Code className="h-6 w-6" />}>API Endpoints Orders</SectionTitle>

      <div className="space-y-2">
        {[
          { method: "GET", path: "/api/orders", desc: "Lista comenzi cu filtrare, sortare, paginare" },
          { method: "GET", path: "/api/orders/[id]", desc: "Detalii comanda cu LineItems si AWB" },
          { method: "POST", path: "/api/orders", desc: "Creare comanda manuala" },
          { method: "PUT", path: "/api/orders/[id]", desc: "Update date comanda (adresa, telefon)" },
          { method: "POST", path: "/api/orders/validate", desc: "Validare batch comenzi selectate" },
          { method: "POST", path: "/api/orders/process", desc: "Procesare completa: validare + factura + AWB" },
          { method: "POST", path: "/api/orders/[id]/cancel", desc: "Anulare comanda cu storno factura" },
          { method: "DELETE", path: "/api/orders/[id]", desc: "Stergere comanda (doar PENDING)" },
        ].map((ep, i) => (
          <div key={i} className="flex items-center gap-4 p-3 bg-muted rounded-lg">
            <Badge variant={ep.method === "GET" ? "secondary" : ep.method === "DELETE" ? "destructive" : "default"} className="w-16 justify-center">
              {ep.method}
            </Badge>
            <code className="text-sm font-mono text-foreground flex-1">{ep.path}</code>
            <span className="text-xs text-muted-foreground">{ep.desc}</span>
          </div>
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
          Sistemul dual de inventar combina MasterProduct (catalog produse cu SKU/barcode)
          cu InventoryItem (stoc avansat cu retete si loturi). Sincronizare bidirectionala
          cu Facturis pentru stoc si preturi.
        </p>
      </div>

      <SectionTitle icon={<Layers3 className="h-6 w-6" />}>Arhitectura Dual Stock System</SectionTitle>

      <InfoBox variant="info" title="De ce doua sisteme?">
        <strong>MasterProduct</strong> este sistemul original pentru catalog cu SKU si barcode.
        <strong>InventoryItem</strong> a fost adaugat pentru features avansate: retete/composite,
        loturi cu expirare, sincronizare Facturis. Relatia este 1:1 prin <code>inventoryItemId</code>.
      </InfoBox>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="text-primary">MasterProduct (Catalog)</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-2 text-muted-foreground">
              <li><strong className="text-foreground">SKU:</strong> Cod unic intern (ex: PROD-001)</li>
              <li><strong className="text-foreground">Barcode:</strong> EAN13/UPC pentru scanare</li>
              <li><strong className="text-foreground">Titlu/Descriere:</strong> Date produs</li>
              <li><strong className="text-foreground">Pret vanzare:</strong> RON cu TVA</li>
              <li><strong className="text-foreground">Stoc:</strong> Cantitate curenta simpla</li>
              <li><strong className="text-foreground">Imagini:</strong> URL-uri Shopify CDN</li>
              <li><strong className="text-foreground">shopifyProductId:</strong> Link la Shopify</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-success/30">
          <CardHeader>
            <CardTitle className="text-success">InventoryItem (Stoc Avansat)</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-2 text-muted-foreground">
              <li><strong className="text-foreground">facturisCode:</strong> Cod Facturis sync</li>
              <li><strong className="text-foreground">isComposite:</strong> Flag produs compus</li>
              <li><strong className="text-foreground">recipeItems:</strong> Lista componente reteta</li>
              <li><strong className="text-foreground">costPrice:</strong> Pret achizitie furnizor</li>
              <li><strong className="text-foreground">minStock:</strong> Prag alerta stoc scazut</li>
              <li><strong className="text-foreground">supplier:</strong> Furnizor principal</li>
              <li><strong className="text-foreground">StockMovement:</strong> Istoric complet</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <SectionTitle icon={<Workflow className="h-6 w-6" />}>Retete / Produse Compuse</SectionTitle>

      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground mb-4">
            Un produs compus (isComposite=true) are o lista de componente cu cantitati.
            La vanzare, stocul se scade automat din fiecare componenta.
          </p>
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm font-mono text-foreground mb-2">Exemplu: Kit Cadou (SKU: KIT-001)</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>- 1x Cutie Cadou (CUTIE-001) - scade 1 din stoc</li>
              <li>- 2x Sapun Natural (SAPUN-001) - scade 2 din stoc</li>
              <li>- 1x Lumanare (LUMANARE-001) - scade 1 din stoc</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <SectionTitle icon={<RefreshCw className="h-6 w-6" />}>Sincronizare Facturis</SectionTitle>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRight className="h-5 w-5" />
              Import din Facturis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li><strong>Endpoint:</strong> /api/inventory/sync-facturis</li>
              <li><strong>Date importate:</strong> Stoc, pret achizitie, TVA</li>
              <li><strong>Mapare:</strong> facturisCode = cod produs Facturis</li>
              <li><strong>Frecventa:</strong> Manual sau CRON zilnic</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Actualizare Automata
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li><strong>La vanzare:</strong> Scade stoc in ambele sisteme</li>
              <li><strong>Retete:</strong> Expandeaza si scade componente</li>
              <li><strong>Alerte:</strong> Notificare la stoc sub minStock</li>
              <li><strong>Istoric:</strong> StockMovement cu reason</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <SectionTitle icon={<Code className="h-6 w-6" />}>API Endpoints Products/Inventory</SectionTitle>

      <div className="space-y-2">
        {[
          { method: "GET", path: "/api/products", desc: "Lista MasterProducts cu filtrare" },
          { method: "GET", path: "/api/inventory-items", desc: "Lista InventoryItems cu stoc" },
          { method: "POST", path: "/api/inventory-items", desc: "Creare articol inventar nou" },
          { method: "PUT", path: "/api/inventory-items/[id]", desc: "Update stoc, pret, reteta" },
          { method: "POST", path: "/api/inventory/sync-facturis", desc: "Sincronizare stoc Facturis" },
          { method: "POST", path: "/api/inventory/adjust", desc: "Ajustare manuala stoc cu motiv" },
          { method: "GET", path: "/api/inventory/movements", desc: "Istoric miscari stoc" },
          { method: "GET", path: "/api/inventory/alerts", desc: "Produse sub stoc minim" },
        ].map((ep, i) => (
          <div key={i} className="flex items-center gap-4 p-3 bg-muted rounded-lg">
            <Badge variant={ep.method === "GET" ? "secondary" : "default"} className="w-16 justify-center">
              {ep.method}
            </Badge>
            <code className="text-sm font-mono text-foreground flex-1">{ep.path}</code>
            <span className="text-xs text-muted-foreground">{ep.desc}</span>
          </div>
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
          Integrare completa cu Facturis Cloud pentru facturare electronica. Suport pentru
          persoane fizice si juridice, multiple serii de facturi, TVA diferentiat,
          PDF automat si stornare facturi.
        </p>
      </div>

      <SectionTitle icon={<FileText className="h-6 w-6" />}>Fluxul Complet de Facturare</SectionTitle>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 p-4 bg-muted rounded-lg">
          {[
            { step: "1. Comanda Validata", desc: "Status VALIDATED" },
            { step: "2. Pregatire Date", desc: "Client + Produse" },
            { step: "3. Facturis API", desc: "POST /invoice" },
            { step: "4. PDF Download", desc: "GET /invoice/pdf" },
            { step: "5. Salvare Local", desc: "Storage + DB" },
            { step: "6. Update Status", desc: "INVOICED" }
          ].map((item, i, arr) => (
            <span key={i} className="flex items-center gap-2">
              <div className="text-center">
                <Badge variant="outline" className="px-3 py-1">{item.step}</Badge>
                <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
              </div>
              {i < arr.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
            </span>
          ))}
        </div>
      </div>

      <SectionTitle icon={<Layers className="h-6 w-6" />}>Serii de Facturi</SectionTitle>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Configurare Serii</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-2 text-muted-foreground">
              <li><strong className="text-foreground">Prefix:</strong> FCT, PRF, AVZ etc.</li>
              <li><strong className="text-foreground">Numar curent:</strong> Auto-increment</li>
              <li><strong className="text-foreground">Format:</strong> PREFIX-NNNNN (ex: FCT-00123)</li>
              <li><strong className="text-foreground">Setare:</strong> /settings/invoices</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tipuri de Documente</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-2 text-muted-foreground">
              <li><strong className="text-foreground">Factura:</strong> Document fiscal standard</li>
              <li><strong className="text-foreground">Proforma:</strong> Oferta/anticipat</li>
              <li><strong className="text-foreground">Storno:</strong> Anulare factura emisa</li>
              <li><strong className="text-foreground">Aviz:</strong> Document transport</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <SectionTitle icon={<Users className="h-6 w-6" />}>Tipuri de Clienti</SectionTitle>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle>Persoana Fizica (PF)</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li><strong>Nume complet:</strong> Din comanda</li>
              <li><strong>CNP:</strong> Optional</li>
              <li><strong>Adresa:</strong> Validata anterior</li>
              <li><strong>Telefon:</strong> Format RO validat</li>
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
              <li><strong>CUI/CIF:</strong> Validat ANAF</li>
              <li><strong>Nr. Reg. Com:</strong> J00/000/0000</li>
              <li><strong>Adresa sediu:</strong> Din ANAF sau manual</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <SectionTitle icon={<Code className="h-6 w-6" />}>Facturis API Integration</SectionTitle>

      <CodeBlock
        title="Configurare Facturis (lib/facturis.ts)"
        code={`// Autentificare
const FACTURIS_API_URL = "https://api.facturis-online.ro/api/"
const headers = {
  "Authorization": "Basic " + base64(email:token),
  "Content-Type": "application/json"
}

// Emitere factura
POST /invoice
Body: { companyVatCode, client, products, seriesName, ... }

// Download PDF
GET /invoice/pdf?cif=XXX&seriesname=FCT&number=123`}
      />

      <SectionTitle icon={<Terminal className="h-6 w-6" />}>API Endpoints Invoices</SectionTitle>

      <div className="space-y-2">
        {[
          { method: "GET", path: "/api/invoices", desc: "Lista facturi cu filtrare" },
          { method: "POST", path: "/api/invoices/issue", desc: "Emite factura pentru comanda" },
          { method: "POST", path: "/api/invoices/batch", desc: "Emite facturi batch (multiple)" },
          { method: "GET", path: "/api/invoices/[id]/pdf", desc: "Download PDF factura" },
          { method: "POST", path: "/api/invoices/[id]/cancel", desc: "Storno factura emisa" },
          { method: "GET", path: "/api/invoices/series", desc: "Lista serii configurate" },
          { method: "PUT", path: "/api/invoices/series/[id]", desc: "Update serie facturi" },
        ].map((ep, i) => (
          <div key={i} className="flex items-center gap-4 p-3 bg-muted rounded-lg">
            <Badge variant={ep.method === "GET" ? "secondary" : "default"} className="w-16 justify-center">
              {ep.method}
            </Badge>
            <code className="text-sm font-mono text-foreground flex-1">{ep.path}</code>
            <span className="text-xs text-muted-foreground">{ep.desc}</span>
          </div>
        ))}
      </div>

      <InfoBox variant="warning" title="Stornare Facturi">
        Facturile emise nu pot fi sterse, doar stornate. Stornarea creeaza o factura
        negativa care anuleaza originalul. Statusul comenzii revine la VALIDATED
        pentru re-facturare.
      </InfoBox>
    </div>
  );
}

function ShippingContent() {
  return (
    <div className="space-y-8">
      <div className="prose max-w-none">
        <p className="text-lg text-muted-foreground">
          Integrare completa FanCourier pentru generare AWB, tracking automat si gestionare ramburs.
          Mapare automata a 8 statusuri curier la statusurile ERP cu actualizare CRON.
        </p>
      </div>

      <SectionTitle icon={<Truck className="h-6 w-6" />}>Fluxul Generare AWB</SectionTitle>

      <div className="flex flex-wrap items-center gap-2 p-4 bg-muted rounded-lg">
        {[
          { step: "1. Comanda INVOICED", desc: "Factura emisa" },
          { step: "2. Pregatire Date", desc: "Expeditor + Destinatar" },
          { step: "3. FanCourier API", desc: "POST /order" },
          { step: "4. Primire AWB", desc: "Numar + PDF" },
          { step: "5. Salvare DB", desc: "Tabel AWB" },
          { step: "6. Update Status", desc: "AWB_CREATED" }
        ].map((item, i, arr) => (
          <span key={i} className="flex items-center gap-2">
            <div className="text-center">
              <Badge variant="outline" className="px-3 py-1">{item.step}</Badge>
              <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
            </div>
            {i < arr.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
          </span>
        ))}
      </div>

      <SectionTitle icon={<Layers className="h-6 w-6" />}>Date AWB</SectionTitle>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Expeditor (din Settings)</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-xs space-y-1 text-muted-foreground">
              <li><strong>Nume firma:</strong> Configurat global</li>
              <li><strong>Adresa ridicare:</strong> Sediu/depozit</li>
              <li><strong>Telefon contact:</strong> Pentru curier</li>
              <li><strong>Cont client FC:</strong> ID FanCourier</li>
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Destinatar (din Comanda)</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-xs space-y-1 text-muted-foreground">
              <li><strong>Nume:</strong> firstName + lastName</li>
              <li><strong>Telefon:</strong> Validat libphonenumber</li>
              <li><strong>Adresa:</strong> Strada, nr, bloc...</li>
              <li><strong>Judet/Oras:</strong> Mapate FC</li>
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Optiuni Livrare</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-xs space-y-1 text-muted-foreground">
              <li><strong>Ramburs:</strong> COD = total comanda</li>
              <li><strong>Greutate:</strong> Calculata/default</li>
              <li><strong>Colete:</strong> Default 1</li>
              <li><strong>Deschidere colet:</strong> Optional</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <SectionTitle icon={<RefreshCw className="h-6 w-6" />}>Mapare Statusuri FanCourier - ERP</SectionTitle>

      <div className="space-y-2">
        {[
          { fc: "Comanda preluata", erp: "AWB_CREATED", color: "bg-primary/10 border-primary/30", desc: "AWB generat, asteapta ridicare" },
          { fc: "In curs de ridicare", erp: "PICKING", color: "bg-warning/10 border-warning/30", desc: "Curierul vine sa ridice" },
          { fc: "Ridicat de curier", erp: "SHIPPED", color: "bg-warning/10 border-warning/30", desc: "Colet predat curier" },
          { fc: "In tranzit", erp: "SHIPPED", color: "bg-warning/10 border-warning/30", desc: "In drumul catre destinatar" },
          { fc: "In livrare", erp: "SHIPPED", color: "bg-warning/10 border-warning/30", desc: "Ultima etapa, azi ajunge" },
          { fc: "Livrat", erp: "DELIVERED", color: "bg-success/10 border-success/30", desc: "Confirmat livrat" },
          { fc: "Returnat expeditor", erp: "RETURNED", color: "bg-destructive/10 border-destructive/30", desc: "Refuzat sau nereusit" },
          { fc: "Anulat", erp: "CANCELLED", color: "bg-muted border-border", desc: "AWB anulat" },
        ].map((item, i) => (
          <div key={i} className={cn("flex items-center justify-between p-3 rounded-lg border", item.color)}>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="min-w-[140px]">{item.fc}</Badge>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <Badge variant="secondary">{item.erp}</Badge>
            </div>
            <span className="text-xs text-muted-foreground">{item.desc}</span>
          </div>
        ))}
      </div>

      <SectionTitle icon={<Timer className="h-6 w-6" />}>Tracking Automat CRON</SectionTitle>

      <InfoBox variant="info" title="Sincronizare Automata">
        Un CRON job ruleaza la fiecare 30 minute si verifica statusul tuturor AWB-urilor active
        (status != DELIVERED, RETURNED, CANCELLED). Statusul din FanCourier este mapat automat
        la statusul ERP si se salveaza in <code>AWBStatusHistory</code> pentru audit.
      </InfoBox>

      <SectionTitle icon={<Terminal className="h-6 w-6" />}>API Endpoints AWB</SectionTitle>

      <div className="space-y-2">
        {[
          { method: "GET", path: "/api/awb", desc: "Lista AWB-uri cu filtrare status" },
          { method: "POST", path: "/api/awb/create", desc: "Generare AWB pentru comanda" },
          { method: "POST", path: "/api/awb/batch", desc: "Generare AWB-uri multiple" },
          { method: "GET", path: "/api/awb/[id]", desc: "Detalii AWB cu istoric status" },
          { method: "GET", path: "/api/awb/[id]/pdf", desc: "Download PDF AWB" },
          { method: "POST", path: "/api/awb/[id]/cancel", desc: "Anulare AWB" },
          { method: "GET", path: "/api/awb/[id]/track", desc: "Tracking manual (force refresh)" },
          { method: "POST", path: "/api/cron/awb-tracking", desc: "CRON: Update statusuri" },
        ].map((ep, i) => (
          <div key={i} className="flex items-center gap-4 p-3 bg-muted rounded-lg">
            <Badge variant={ep.method === "GET" ? "secondary" : "default"} className="w-16 justify-center">
              {ep.method}
            </Badge>
            <code className="text-sm font-mono text-foreground flex-1">{ep.path}</code>
            <span className="text-xs text-muted-foreground">{ep.desc}</span>
          </div>
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
          Sistemul de picking permite crearea listelor agregate per produs, scanare barcode
          pentru validare si urmarirea progresului pana la finalizare. Optimizat pentru
          eficienta in warehouse.
        </p>
      </div>

      <SectionTitle icon={<ClipboardList className="h-6 w-6" />}>Fluxul de Picking</SectionTitle>

      <div className="flex flex-wrap items-center gap-2 p-4 bg-muted rounded-lg">
        {[
          { step: "1. Selectie Comenzi", desc: "Status AWB_CREATED" },
          { step: "2. Creare Lista", desc: "Agregare produse" },
          { step: "3. Print Lista", desc: "PDF pentru warehouse" },
          { step: "4. Scanare", desc: "Barcode validare" },
          { step: "5. Finalizare", desc: "Status PACKED" }
        ].map((item, i, arr) => (
          <span key={i} className="flex items-center gap-2">
            <div className="text-center">
              <Badge variant="outline" className="px-3 py-1">{item.step}</Badge>
              <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
            </div>
            {i < arr.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
          </span>
        ))}
      </div>

      <SectionTitle icon={<Layers className="h-6 w-6" />}>Structura Picking List</SectionTitle>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Lista Agregata per Produs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Produsele din toate comenzile selectate sunt agregate intr-o singura lista
              pentru eficienta in warehouse.
            </p>
            <div className="bg-muted p-3 rounded text-xs font-mono">
              <p>SKU: PROD-001 - Sapun Natural</p>
              <p>Cantitate totala: 15 buc</p>
              <p>Comenzi: #1001, #1002, #1005, #1008</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Statusuri Picking List</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {[
                { status: "DRAFT", desc: "Lista creata, neinceputa" },
                { status: "IN_PROGRESS", desc: "Scanare in curs" },
                { status: "COMPLETED", desc: "Toate produsele scanate" },
                { status: "CANCELLED", desc: "Lista anulata" },
              ].map((item, i) => (
                <li key={i} className="flex items-center justify-between text-sm">
                  <Badge variant="outline">{item.status}</Badge>
                  <span className="text-muted-foreground text-xs">{item.desc}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <SectionTitle icon={<Scan className="h-6 w-6" />}>Scanare Barcode</SectionTitle>

      <InfoBox variant="info" title="Validare Produse">
        La scanarea fiecarui produs, sistemul verifica: (1) produsul exista in lista,
        (2) cantitatea nu depaseste cerinta, (3) barcode-ul corespunde SKU-ului.
        Scanarile invalide sunt respinse cu mesaj de eroare.
      </InfoBox>

      <SectionTitle icon={<Terminal className="h-6 w-6" />}>API Endpoints Picking</SectionTitle>

      <div className="space-y-2">
        {[
          { method: "GET", path: "/api/picking", desc: "Lista picking lists cu filtrare" },
          { method: "POST", path: "/api/picking", desc: "Creare picking list din comenzi" },
          { method: "GET", path: "/api/picking/[id]", desc: "Detalii lista cu progres" },
          { method: "POST", path: "/api/picking/[id]/scan", desc: "Scanare produs (barcode)" },
          { method: "POST", path: "/api/picking/[id]/complete", desc: "Finalizare picking" },
          { method: "GET", path: "/api/picking/[id]/pdf", desc: "Download PDF lista" },
          { method: "DELETE", path: "/api/picking/[id]", desc: "Anulare picking list" },
        ].map((ep, i) => (
          <div key={i} className="flex items-center gap-4 p-3 bg-muted rounded-lg">
            <Badge variant={ep.method === "GET" ? "secondary" : ep.method === "DELETE" ? "destructive" : "default"} className="w-16 justify-center">
              {ep.method}
            </Badge>
            <code className="text-sm font-mono text-foreground flex-1">{ep.path}</code>
            <span className="text-xs text-muted-foreground">{ep.desc}</span>
          </div>
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
          Modulul Handover gestioneaza predarea coletelor catre curier. Include sesiuni
          de predare, raport C0 pentru FanCourier si alerte pentru colete nepredate.
        </p>
      </div>

      <SectionTitle icon={<Hand className="h-6 w-6" />}>Fluxul de Predare</SectionTitle>

      <div className="flex flex-wrap items-center gap-2 p-4 bg-muted rounded-lg">
        {[
          { step: "1. Start Sesiune", desc: "Operator deschide" },
          { step: "2. Scanare AWB", desc: "Fiecare colet" },
          { step: "3. Validare", desc: "Status PACKED" },
          { step: "4. Finalizare", desc: "Generare C0" },
          { step: "5. Update Status", desc: "SHIPPED" }
        ].map((item, i, arr) => (
          <span key={i} className="flex items-center gap-2">
            <div className="text-center">
              <Badge variant="outline" className="px-3 py-1">{item.step}</Badge>
              <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
            </div>
            {i < arr.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
          </span>
        ))}
      </div>

      <SectionTitle icon={<FileText className="h-6 w-6" />}>Raport C0 FanCourier</SectionTitle>

      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground mb-4">
            Raportul C0 este documentul de predare catre FanCourier. Contine lista
            tuturor AWB-urilor predate intr-o sesiune, semnat de operator si curier.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-sm mb-2 text-foreground">Continut Raport:</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>- Lista AWB-uri predate</li>
                <li>- Data si ora predare</li>
                <li>- Numar total colete</li>
                <li>- Valoare totala ramburs</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2 text-foreground">Semnaturi:</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>- Operator depozit</li>
                <li>- Curier FanCourier</li>
                <li>- Timestamp generare</li>
                <li>- ID sesiune handover</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <SectionTitle icon={<AlertTriangle className="h-6 w-6" />}>Alerte Colete Nepredate</SectionTitle>

      <InfoBox variant="warning" title="Sistem de Alerte">
        Sistemul genereaza alerte automate pentru comenzile cu status PACKED care nu au fost
        predate in termen de 24h. Alertele apar in dashboard si pot fi trimise pe email
        catre responsabilii de warehouse.
      </InfoBox>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-warning/30">
          <CardHeader>
            <CardTitle className="text-warning text-sm">Conditii Alerta</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>- Status = PACKED mai mult de 24h</li>
              <li>- AWB generat dar nepredat</li>
              <li>- Sesiune handover nefinalizata</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-success/30">
          <CardHeader>
            <CardTitle className="text-success text-sm">Actiuni Disponibile</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>- Adaugare la sesiune handover</li>
              <li>- Reprogramare ridicare</li>
              <li>- Anulare AWB si regenerare</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <SectionTitle icon={<Terminal className="h-6 w-6" />}>API Endpoints Handover</SectionTitle>

      <div className="space-y-2">
        {[
          { method: "GET", path: "/api/handover", desc: "Lista sesiuni handover" },
          { method: "POST", path: "/api/handover", desc: "Start sesiune noua" },
          { method: "GET", path: "/api/handover/[id]", desc: "Detalii sesiune cu AWB-uri" },
          { method: "POST", path: "/api/handover/[id]/scan", desc: "Scanare AWB in sesiune" },
          { method: "POST", path: "/api/handover/[id]/finalize", desc: "Finalizare + generare C0" },
          { method: "GET", path: "/api/handover/[id]/c0", desc: "Download PDF raport C0" },
          { method: "GET", path: "/api/handover/alerts", desc: "Colete nepredate (alerte)" },
        ].map((ep, i) => (
          <div key={i} className="flex items-center gap-4 p-3 bg-muted rounded-lg">
            <Badge variant={ep.method === "GET" ? "secondary" : "default"} className="w-16 justify-center">
              {ep.method}
            </Badge>
            <code className="text-sm font-mono text-foreground flex-1">{ep.path}</code>
            <span className="text-xs text-muted-foreground">{ep.desc}</span>
          </div>
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
          Integrare completa cu Meta Ads (Facebook/Instagram) si TikTok Ads prin OAuth.
          Sincronizare automata campanii, calcul ROAS per produs, alerte performanta
          si actiuni automate (pause/resume campanii).
        </p>
      </div>

      <SectionTitle icon={<Key className="h-6 w-6" />}>Autentificare OAuth</SectionTitle>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="text-primary">Meta Ads OAuth</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-2 text-muted-foreground">
              <li><strong className="text-foreground">Endpoint:</strong> /api/ads/meta/auth</li>
              <li><strong className="text-foreground">Scopes:</strong> ads_read, ads_management</li>
              <li><strong className="text-foreground">Token:</strong> Long-lived (60 zile)</li>
              <li><strong className="text-foreground">Refresh:</strong> Automat inainte de expirare</li>
              <li><strong className="text-foreground">Stocare:</strong> AdsAccount.accessToken</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-destructive">TikTok Ads OAuth</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-2 text-muted-foreground">
              <li><strong className="text-foreground">Endpoint:</strong> /api/ads/tiktok/auth</li>
              <li><strong className="text-foreground">Scopes:</strong> ad.read, ad.write</li>
              <li><strong className="text-foreground">Token:</strong> Short-lived + refresh</li>
              <li><strong className="text-foreground">Refresh:</strong> La fiecare request</li>
              <li><strong className="text-foreground">Stocare:</strong> AdsAccount encrypted</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <SectionTitle icon={<RefreshCw className="h-6 w-6" />}>Sincronizare Campanii</SectionTitle>

      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground mb-4">
            Campaniile sunt sincronizate automat prin CRON zilnic. Se importa:
          </p>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 bg-muted rounded-lg">
              <p className="font-semibold text-foreground">Campaigns</p>
              <p className="text-xs text-muted-foreground">Nume, status, budget</p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="font-semibold text-foreground">Ad Sets</p>
              <p className="text-xs text-muted-foreground">Targeting, schedule</p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="font-semibold text-foreground">Ads</p>
              <p className="text-xs text-muted-foreground">Creative, metrici</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <SectionTitle icon={<TrendingUp className="h-6 w-6" />}>Metrici si ROAS</SectionTitle>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { metric: "Spend", desc: "Cost total campanie" },
          { metric: "Impressions", desc: "Afisari reclama" },
          { metric: "Clicks", desc: "Click-uri pe ad" },
          { metric: "CTR", desc: "Click-through rate" },
          { metric: "Conversions", desc: "Achizitii atribuite" },
          { metric: "CPA", desc: "Cost per achizitie" },
          { metric: "Revenue", desc: "Venituri generate" },
          { metric: "ROAS", desc: "Return on ad spend" },
        ].map((item, i) => (
          <Card key={i}>
            <CardContent className="pt-4 pb-3 text-center">
              <p className="font-semibold text-foreground">{item.metric}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <SectionTitle icon={<AlertTriangle className="h-6 w-6" />}>Sistem de Alerte</SectionTitle>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-warning/30">
          <CardHeader>
            <CardTitle className="text-warning text-sm">Tipuri de Alerte</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-xs text-muted-foreground space-y-2">
              <li><strong className="text-foreground">ROAS_LOW:</strong> ROAS sub prag (default 2.0)</li>
              <li><strong className="text-foreground">SPEND_HIGH:</strong> Spend depaseste budget zilnic</li>
              <li><strong className="text-foreground">CTR_LOW:</strong> CTR sub 1% (ad fatigue)</li>
              <li><strong className="text-foreground">NO_CONVERSIONS:</strong> 0 conversii in 24h</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-success/30">
          <CardHeader>
            <CardTitle className="text-success text-sm">Actiuni Automate</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-xs text-muted-foreground space-y-2">
              <li><strong className="text-foreground">PAUSE_CAMPAIGN:</strong> Oprire automata campanie</li>
              <li><strong className="text-foreground">REDUCE_BUDGET:</strong> Scadere budget 20%</li>
              <li><strong className="text-foreground">NOTIFY_EMAIL:</strong> Email catre responsabil</li>
              <li><strong className="text-foreground">NOTIFY_SLACK:</strong> Mesaj canal Slack</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <InfoBox variant="tip" title="Configurare Praguri">
        Pragurile pentru alerte si actiunile automate sunt configurabile per cont
        din Settings - Ads. Fiecare campanie poate avea reguli personalizate.
      </InfoBox>

      <SectionTitle icon={<Terminal className="h-6 w-6" />}>API Endpoints Ads</SectionTitle>

      <div className="space-y-2">
        {[
          { method: "GET", path: "/api/ads/accounts", desc: "Lista conturi conectate" },
          { method: "POST", path: "/api/ads/meta/auth", desc: "Initiere OAuth Meta" },
          { method: "POST", path: "/api/ads/tiktok/auth", desc: "Initiere OAuth TikTok" },
          { method: "GET", path: "/api/ads/campaigns", desc: "Lista campanii toate platformele" },
          { method: "GET", path: "/api/ads/campaigns/[id]", desc: "Detalii campanie cu metrici" },
          { method: "POST", path: "/api/ads/campaigns/[id]/pause", desc: "Pause campanie" },
          { method: "POST", path: "/api/ads/campaigns/[id]/resume", desc: "Resume campanie" },
          { method: "GET", path: "/api/ads/alerts", desc: "Lista alerte active" },
          { method: "POST", path: "/api/ads/alerts/[id]/dismiss", desc: "Dismiss alerta" },
          { method: "POST", path: "/api/cron/ads-sync", desc: "CRON: Sync campanii" },
        ].map((ep, i) => (
          <div key={i} className="flex items-center gap-4 p-3 bg-muted rounded-lg">
            <Badge variant={ep.method === "GET" ? "secondary" : "default"} className="w-16 justify-center">
              {ep.method}
            </Badge>
            <code className="text-sm font-mono text-foreground flex-1">{ep.path}</code>
            <span className="text-xs text-muted-foreground">{ep.desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RBACContent() {
  const permissionCategories = [
    {
      category: "Orders",
      permissions: ["orders.view", "orders.create", "orders.edit", "orders.delete", "orders.process", "orders.validate", "orders.cancel", "orders.export"]
    },
    {
      category: "Products",
      permissions: ["products.view", "products.create", "products.edit", "products.delete", "products.import", "products.export", "products.sync"]
    },
    {
      category: "Inventory",
      permissions: ["inventory.view", "inventory.adjust", "inventory.transfer", "inventory.alerts", "inventory.sync", "inventory.recipes"]
    },
    {
      category: "Invoices",
      permissions: ["invoices.view", "invoices.issue", "invoices.cancel", "invoices.download", "invoices.series.manage"]
    },
    {
      category: "AWB",
      permissions: ["awb.view", "awb.create", "awb.cancel", "awb.download", "awb.track", "awb.batch"]
    },
    {
      category: "Picking",
      permissions: ["picking.view", "picking.create", "picking.scan", "picking.complete", "picking.cancel", "picking.print"]
    },
    {
      category: "Handover",
      permissions: ["handover.view", "handover.create", "handover.scan", "handover.finalize", "handover.c0.download"]
    },
    {
      category: "Ads",
      permissions: ["ads.view", "ads.accounts.manage", "ads.campaigns.view", "ads.campaigns.control", "ads.alerts.view", "ads.alerts.dismiss", "ads.settings"]
    },
    {
      category: "Users",
      permissions: ["users.view", "users.create", "users.edit", "users.delete", "users.roles.assign"]
    },
    {
      category: "Roles",
      permissions: ["roles.view", "roles.create", "roles.edit", "roles.delete", "roles.permissions.assign"]
    },
    {
      category: "Settings",
      permissions: ["settings.view", "settings.edit", "settings.integrations", "settings.company", "settings.notifications"]
    },
    {
      category: "Reports",
      permissions: ["reports.view", "reports.sales", "reports.inventory", "reports.ads", "reports.export"]
    },
    {
      category: "Audit",
      permissions: ["audit.view", "audit.export"]
    },
    {
      category: "System",
      permissions: ["system.admin", "system.debug", "system.cron.trigger"]
    }
  ];

  const defaultRoles = [
    { name: "Super Admin", desc: "Acces complet la toate functionalitatile", perms: "124/124" },
    { name: "Admin", desc: "Gestionare utilizatori, setari, rapoarte", perms: "98/124" },
    { name: "Manager", desc: "Operatiuni complete fara setari sistem", perms: "72/124" },
    { name: "Operator", desc: "Procesare comenzi, picking, handover", perms: "45/124" },
    { name: "Warehouse", desc: "Doar picking si handover", perms: "18/124" },
    { name: "Viewer", desc: "Doar vizualizare, fara actiuni", perms: "15/124" },
  ];

  return (
    <div className="space-y-8">
      <div className="prose max-w-none">
        <p className="text-lg text-muted-foreground">
          Sistem RBAC complet cu 124 permisiuni granulare, 6 roluri predefinite si suport
          pentru grupuri de utilizatori. Audit logging pentru toate actiunile.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Permisiuni" value="124" description="Granulare per actiune" icon={<Key className="h-5 w-5" />} />
        <StatCard label="Roluri Default" value="6" description="Predefinite + custom" icon={<Shield className="h-5 w-5" />} />
        <StatCard label="Categorii" value="14" description="Module sistem" icon={<Layers className="h-5 w-5" />} />
        <StatCard label="Audit Log" value="100%" description="Toate actiunile" icon={<History className="h-5 w-5" />} />
      </div>

      <SectionTitle icon={<Users className="h-6 w-6" />}>Structura RBAC</SectionTitle>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">User</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Cont individual cu email, parola, status activ/inactiv.
              Poate avea multiple roluri.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Role</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Colectie de permisiuni. Roluri predefinite + custom.
              Prioritate ierarhica.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Permission</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Actiune specifica: modul.actiune
              (ex: orders.process)
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Group</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Organizare utilizatori (echipe, departamente).
              Roluri la nivel de grup.
            </p>
          </CardContent>
        </Card>
      </div>

      <SectionTitle icon={<Shield className="h-6 w-6" />}>Roluri Predefinite</SectionTitle>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {defaultRoles.map((role, i) => (
          <Card key={i}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-foreground">{role.name}</h4>
                <Badge variant="outline" className="text-xs">{role.perms}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{role.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <SectionTitle icon={<Key className="h-6 w-6" />}>Toate Permisiunile (124)</SectionTitle>

      <div className="space-y-4">
        {permissionCategories.map((cat, i) => (
          <Card key={i}>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">{cat.category} ({cat.permissions.length})</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-1">
                {cat.permissions.map((perm, j) => (
                  <Badge key={j} variant="secondary" className="text-xs">{perm}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <SectionTitle icon={<History className="h-6 w-6" />}>Audit Logging</SectionTitle>

      <InfoBox variant="info" title="Audit Trail Complet">
        Toate actiunile sunt inregistrate in tabelul AuditLog cu: userId, action, targetType,
        targetId, oldValue, newValue, ipAddress, userAgent, timestamp. Retentie 90 zile default.
      </InfoBox>

      <SectionTitle icon={<Terminal className="h-6 w-6" />}>API Endpoints RBAC</SectionTitle>

      <div className="space-y-2">
        {[
          { method: "GET", path: "/api/users", desc: "Lista utilizatori cu roluri" },
          { method: "POST", path: "/api/users", desc: "Creare utilizator nou" },
          { method: "PUT", path: "/api/users/[id]", desc: "Update utilizator" },
          { method: "PUT", path: "/api/users/[id]/roles", desc: "Assign roluri" },
          { method: "GET", path: "/api/roles", desc: "Lista roluri cu permisiuni" },
          { method: "POST", path: "/api/roles", desc: "Creare rol custom" },
          { method: "PUT", path: "/api/roles/[id]/permissions", desc: "Update permisiuni rol" },
          { method: "GET", path: "/api/permissions", desc: "Lista toate permisiunile" },
          { method: "GET", path: "/api/audit", desc: "Audit log cu filtrare" },
        ].map((ep, i) => (
          <div key={i} className="flex items-center gap-4 p-3 bg-muted rounded-lg">
            <Badge variant={ep.method === "GET" ? "secondary" : "default"} className="w-16 justify-center">
              {ep.method}
            </Badge>
            <code className="text-sm font-mono text-foreground flex-1">{ep.path}</code>
            <span className="text-xs text-muted-foreground">{ep.desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DatabaseContent() {
  return (
    <div className="space-y-8">
      <div className="prose max-w-none">
        <p className="text-lg text-muted-foreground">
          Baza de date PostgreSQL contine peste 80 de tabele organizate
          pe categorii functionale.
        </p>
      </div>

      <SectionTitle icon={<Table2 className="h-6 w-6" />}>Categorii Principale</SectionTitle>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { title: "Autentificare", tables: "User, Account, Session, Role, Permission" },
          { title: "Comenzi", tables: "Order, LineItem, DailySales" },
          { title: "Facturare", tables: "Invoice, InvoiceSeries" },
          { title: "Logistica", tables: "AWB, AWBStatusHistory, HandoverSession" },
          { title: "Inventar", tables: "Product, InventoryItem, StockMovement" },
          { title: "Advertising", tables: "AdsCampaign, AdsAccount, AdsAlert" },
        ].map((cat, i) => (
          <Card key={i}>
            <CardHeader>
              <CardTitle className="text-base">{cat.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{cat.tables}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function IntegrationsContent() {
  return (
    <div className="space-y-8">
      <div className="prose max-w-none">
        <p className="text-lg text-muted-foreground">
          ERP-ul se integreaza cu multiple servicii externe pentru a automatiza
          procesele de business.
        </p>
      </div>

      <SectionTitle icon={<Globe className="h-6 w-6" />}>Servicii Integrate</SectionTitle>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { name: "Shopify", desc: "E-commerce platform - comenzi, produse, stoc", color: "border-success/30" },
          { name: "Trendyol", desc: "Marketplace turcesc - comenzi, produse", color: "border-warning/30" },
          { name: "Facturis", desc: "Facturare electronica - emitere, storno", color: "border-primary/30" },
          { name: "FanCourier", desc: "Curierat - AWB, tracking, ramburs", color: "border-accent-foreground/30" },
          { name: "Meta Ads", desc: "Advertising - campanii, metrici, ROAS", color: "border-primary/30" },
          { name: "TikTok Ads", desc: "Advertising - campanii, metrici", color: "border-destructive/30" },
          { name: "Google Drive", desc: "Storage - backup documente", color: "border-warning/30" },
          { name: "NextAuth", desc: "Autentificare - OAuth, sessions", color: "border-border" },
        ].map((svc, i) => (
          <Card key={i} className={cn("border-2", svc.color)}>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-1 text-foreground">{svc.name}</h3>
              <p className="text-sm text-muted-foreground">{svc.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function APIReferenceContent() {
  return (
    <div className="space-y-8">
      <div className="prose max-w-none">
        <p className="text-lg text-muted-foreground">
          API-ul REST expune peste 50 de endpoints pentru toate operatiunile CRUD
          si actiunile de business.
        </p>
      </div>

      <SectionTitle icon={<Terminal className="h-6 w-6" />}>Endpoints Principale</SectionTitle>

      <div className="space-y-4">
        {[
          { method: "GET", path: "/api/orders", desc: "Lista comenzi cu filtrare si paginare" },
          { method: "POST", path: "/api/orders/process", desc: "Proceseaza o comanda (factura + AWB)" },
          { method: "GET", path: "/api/products", desc: "Lista produse" },
          { method: "POST", path: "/api/invoices/issue", desc: "Emite factura pentru comanda" },
          { method: "POST", path: "/api/awb/create", desc: "Genereaza AWB pentru comanda" },
          { method: "GET", path: "/api/inventory-items", desc: "Lista articole inventar" },
        ].map((ep, i) => (
          <div key={i} className="flex items-center gap-4 p-3 bg-muted rounded-lg">
            <Badge variant={ep.method === "GET" ? "secondary" : "default"} className="w-16 justify-center">
              {ep.method}
            </Badge>
            <code className="text-sm font-mono text-foreground">{ep.path}</code>
            <span className="text-sm text-muted-foreground ml-auto">{ep.desc}</span>
          </div>
        ))}
      </div>

      <SectionTitle icon={<Shield className="h-6 w-6" />}>Autentificare</SectionTitle>

      <InfoBox variant="info" title="NextAuth Sessions">
        Toate endpoint-urile sunt protejate cu NextAuth. Sesiunea este verificata
        automat si permisiunile sunt validate pentru fiecare actiune.
      </InfoBox>
    </div>
  );
}

function ChangelogContent() {
  return (
    <div className="space-y-8">
      <div className="prose max-w-none">
        <p className="text-lg text-muted-foreground">
          Istoricul modificarilor si imbunatatirilor aduse platformei.
        </p>
      </div>

      <div className="space-y-6">
        {[
          {
            version: "3.0.0",
            date: "2026-01-13",
            title: "Module Advertising si RBAC",
            changes: [
              "Integrare Meta Ads si TikTok Ads",
              "Sistem RBAC complet cu roluri si permisiuni",
              "Pagina de documentatie interactiva",
            ]
          },
          {
            version: "2.5.0",
            date: "2025-12-01",
            title: "Inventar Avansat",
            changes: [
              "Suport pentru produse compuse (retete)",
              "Alerte stoc scazut",
              "Import/export inventar",
            ]
          },
          {
            version: "2.0.0",
            date: "2025-10-15",
            title: "Integrare Trendyol",
            changes: [
              "Sincronizare comenzi Trendyol",
              "Mapare produse intre platforme",
              "Dashboard unificat",
            ]
          },
        ].map((release, i) => (
          <Card key={i}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>v{release.version} - {release.title}</span>
                <Badge variant="outline">{release.date}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1">
                {release.changes.map((change, j) => (
                  <li key={j} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    {change}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function renderContent(moduleId: string) {
  switch (moduleId) {
    case "overview": return <OverviewContent />;
    case "architecture": return <ArchitectureContent />;
    case "orders": return <OrdersContent />;
    case "products": return <ProductsContent />;
    case "invoices": return <InvoicesContent />;
    case "shipping": return <ShippingContent />;
    case "picking": return <PickingContent />;
    case "handover": return <HandoverContent />;
    case "advertising": return <AdvertisingContent />;
    case "rbac": return <RBACContent />;
    case "database": return <DatabaseContent />;
    case "integrations": return <IntegrationsContent />;
    case "api": return <APIReferenceContent />;
    case "changelog": return <ChangelogContent />;
    default: return <OverviewContent />;
  }
}

export default function DocumentationPage() {
  const [activeModule, setActiveModule] = useState("overview");
  const [search, setSearch] = useState("");

  const filteredModules = modules.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  const currentModule = modules.find(m => m.id === activeModule);

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <div className="w-64 border-r border-border bg-card flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cauta..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2">
            {filteredModules.map((module) => {
              const Icon = module.icon;
              return (
                <button
                  key={module.id}
                  onClick={() => setActiveModule(module.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors",
                    activeModule === module.id
                      ? "bg-primary/20 text-primary"
                      : "hover:bg-muted text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-sm font-medium">{module.name}</span>
                </button>
              );
            })}
          </div>
        </ScrollArea>
        <div className="p-4 border-t border-border text-xs text-muted-foreground">
          <div>v{DOC_VERSION}</div>
          <div>Actualizat: {LAST_UPDATED}</div>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-background">
        <div className="sticky top-0 z-10 bg-background border-b border-border px-8 py-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Book className="h-4 w-4" />
            <span>Documentatie</span>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground font-medium">{currentModule?.name}</span>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-8 py-8">
          {renderContent(activeModule)}
        </div>

        <div className="border-t border-border bg-muted px-8 py-6 mt-8">
          <div className="max-w-4xl mx-auto text-center text-sm text-muted-foreground">
            <p>ERP CashFlowSync - Documentatie Tehnica v{DOC_VERSION}</p>
            <p className="mt-1">Ultima actualizare: {LAST_UPDATED}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
