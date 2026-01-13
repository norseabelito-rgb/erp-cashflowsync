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

const DOC_VERSION = "3.0.0";
const LAST_UPDATED = "2026-01-13";

const modules = [
  { id: "overview", name: "Prezentare Generala", icon: Book },
  { id: "architecture", name: "Arhitectura Sistem", icon: Server },
  { id: "orders", name: "Comenzi si Procesare", icon: ShoppingCart },
  { id: "products", name: "Produse si Inventar", icon: Package },
  { id: "invoices", name: "Facturare SmartBill", icon: FileText },
  { id: "shipping", name: "Livrare si AWB", icon: Truck },
  { id: "picking", name: "Picking si Predare", icon: ClipboardList },
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
          ERP CashFlowSync este o platforma completa pentru gestionarea comenzilor,
          inventarului, facturarii si livrarilor pentru magazine online.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Module" value="12+" description="Complet integrate" icon={<Layers className="h-5 w-5" />} />
        <StatCard label="Integrari" value="8" description="Servicii externe" icon={<GitBranch className="h-5 w-5" />} />
        <StatCard label="Tabele DB" value="80+" description="Schema complexa" icon={<Database className="h-5 w-5" />} />
        <StatCard label="API Routes" value="50+" description="Endpoints REST" icon={<Code className="h-5 w-5" />} />
      </div>

      <SectionTitle icon={<Zap className="h-6 w-6" />}>Capabilitati Principale</SectionTitle>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FeatureCard
          icon={<ShoppingCart className="h-5 w-5" />}
          title="Gestionare Comenzi"
          description="Import automat din Shopify si Trendyol, validare date, procesare in flux"
          badges={["Shopify", "Trendyol", "Webhook", "CRON"]}
        />
        <FeatureCard
          icon={<FileText className="h-5 w-5" />}
          title="Facturare Automata"
          description="Integrare completa cu SmartBill pentru emitere facturi automate"
          badges={["SmartBill", "PDF", "Serii", "TVA"]}
        />
        <FeatureCard
          icon={<Truck className="h-5 w-5" />}
          title="AWB si Livrare"
          description="Generare AWB-uri FanCourier, tracking automat, gestionare ramburs"
          badges={["FanCourier", "AWB", "Tracking", "Ramburs"]}
        />
        <FeatureCard
          icon={<Package className="h-5 w-5" />}
          title="Inventar Avansat"
          description="Stoc multi-locatie, produse compuse (retete), alerte stoc scazut"
          badges={["Multi-locatie", "Retete", "Alerte", "Sincronizare"]}
        />
      </div>

      <SectionTitle icon={<Workflow className="h-6 w-6" />}>Fluxul Principal</SectionTitle>

      <div className="flex flex-wrap items-center gap-2 p-4 bg-muted rounded-lg">
        {[
          "Comanda Noua",
          "Validare",
          "Facturare",
          "AWB",
          "Picking",
          "Expediere",
          "Livrare"
        ].map((step, i, arr) => (
          <span key={i} className="flex items-center gap-2">
            <Badge variant="outline" className="px-3 py-1">{step}</Badge>
            {i < arr.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
          </span>
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
│   │   ├── smartbill.ts        # Facturare
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
          Modulul de comenzi este inima sistemului ERP. Gestioneaza importul comenzilor
          din multiple surse, validarea, procesarea si urmarirea lor pana la livrare.
        </p>
      </div>

      <SectionTitle icon={<GitMerge className="h-6 w-6" />}>Surse de Comenzi</SectionTitle>

      <div className="grid grid-cols-3 gap-4">
        <Card className="border-success/30 bg-success/5">
          <CardContent className="pt-6 text-center">
            <Store className="h-8 w-8 text-success mx-auto mb-2" />
            <h3 className="font-semibold text-foreground">Shopify</h3>
            <p className="text-sm text-muted-foreground">Webhook + API sync</p>
          </CardContent>
        </Card>
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="pt-6 text-center">
            <Globe className="h-8 w-8 text-warning mx-auto mb-2" />
            <h3 className="font-semibold text-foreground">Trendyol</h3>
            <p className="text-sm text-muted-foreground">CRON sync periodic</p>
          </CardContent>
        </Card>
        <Card className="border-muted-foreground/30 bg-muted/50">
          <CardContent className="pt-6 text-center">
            <Plus className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <h3 className="font-semibold text-foreground">Manual</h3>
            <p className="text-sm text-muted-foreground">Creare din ERP</p>
          </CardContent>
        </Card>
      </div>

      <SectionTitle icon={<Workflow className="h-6 w-6" />}>Ciclul de Viata al unei Comenzi</SectionTitle>

      <div className="space-y-2">
        {[
          { status: "PENDING", color: "bg-muted border-border", desc: "Comanda noua, nevalidata" },
          { status: "VALIDATED", color: "bg-primary/10 border-primary/30", desc: "Date validate, pregatita pentru procesare" },
          { status: "VALIDATION_FAILED", color: "bg-destructive/10 border-destructive/30", desc: "Date invalide (telefon, adresa)" },
          { status: "INVOICE_PENDING", color: "bg-warning/10 border-warning/30", desc: "In curs de facturare" },
          { status: "INVOICED", color: "bg-accent border-accent-foreground/20", desc: "Factura emisa cu succes" },
          { status: "AWB_PENDING", color: "bg-warning/10 border-warning/30", desc: "In curs de generare AWB" },
          { status: "PICKING", color: "bg-primary/10 border-primary/30", desc: "In picking, pregatire colet" },
          { status: "PACKED", color: "bg-success/10 border-success/30", desc: "Colet pregatit" },
          { status: "SHIPPED", color: "bg-warning/10 border-warning/30", desc: "Predat curier, in tranzit" },
          { status: "DELIVERED", color: "bg-success/10 border-success/30", desc: "Livrat cu succes" },
          { status: "RETURNED", color: "bg-destructive/10 border-destructive/30", desc: "Returnat" },
          { status: "CANCELLED", color: "bg-muted border-border", desc: "Anulat" },
        ].map((item, i) => (
          <div key={i} className={cn("flex items-center justify-between p-3 rounded-lg border", item.color)}>
            <Badge variant="outline">{item.status}</Badge>
            <span className="text-sm text-muted-foreground">{item.desc}</span>
          </div>
        ))}
      </div>

      <SectionTitle icon={<Zap className="h-6 w-6" />}>Validarea Comenzilor</SectionTitle>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-success">
              <CheckCircle2 className="h-5 w-5" />
              Validari Aplicate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span><strong className="text-foreground">Telefon:</strong> Format 07XXXXXXXX (10 cifre)</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span><strong className="text-foreground">Adresa:</strong> Minimum strada si numarul</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Building2 className="h-4 w-4" />
                <span><strong className="text-foreground">Judet:</strong> Nomenclator FanCourier valid</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              Erori Frecvente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2 text-muted-foreground">
                <XCircle className="h-4 w-4 text-destructive mt-0.5" />
                <span><strong className="text-foreground">Telefon invalid:</strong> Format gresit sau numar inexistent</span>
              </li>
              <li className="flex items-start gap-2 text-muted-foreground">
                <XCircle className="h-4 w-4 text-destructive mt-0.5" />
                <span><strong className="text-foreground">Adresa incompleta:</strong> Lipseste strada sau numarul</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ProductsContent() {
  return (
    <div className="space-y-8">
      <div className="prose max-w-none">
        <p className="text-lg text-muted-foreground">
          Sistemul de produse si inventar gestioneaza catalogul complet de articole,
          stocul multi-locatie si produsele compuse (retete).
        </p>
      </div>

      <SectionTitle icon={<Layers3 className="h-6 w-6" />}>Structura Produselor</SectionTitle>

      <InfoBox variant="info" title="Sistem Dual de Stoc">
        ERP-ul foloseste doua sisteme de stoc paralele: <strong>Product</strong> (legacy, simplu)
        si <strong>InventoryItem</strong> (nou, cu suport pentru loturi si retete).
        Ambele sunt sincronizate la vanzare.
      </InfoBox>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>MasterProduct</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>SKU si Barcode unice</li>
              <li>Titlu si descriere</li>
              <li>Pret si stoc</li>
              <li>Mapare catre InventoryItem</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>InventoryItem</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>Suport pentru retete</li>
              <li>Istoric miscari stoc</li>
              <li>Alerte stoc scazut</li>
              <li>Furnizori asociati</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <SectionTitle icon={<RefreshCw className="h-6 w-6" />}>Sincronizare Stoc</SectionTitle>

      <InfoBox variant="tip" title="Sincronizare Automata">
        La fiecare vanzare, sistemul actualizeaza automat stocul in ambele sisteme
        si trimite notificari daca stocul scade sub pragul de alerta.
      </InfoBox>
    </div>
  );
}

function InvoicesContent() {
  return (
    <div className="space-y-8">
      <div className="prose max-w-none">
        <p className="text-lg text-muted-foreground">
          Sistemul de facturare este integrat complet cu SmartBill pentru emiterea
          automata a facturilor fiscale.
        </p>
      </div>

      <SectionTitle icon={<FileText className="h-6 w-6" />}>Procesul de Facturare</SectionTitle>

      <div className="flex flex-wrap items-center gap-2 p-4 bg-muted rounded-lg">
        {[
          "Comanda Validata",
          "Generare Date Factura",
          "Apel SmartBill API",
          "Salvare PDF",
          "Update Status"
        ].map((step, i, arr) => (
          <span key={i} className="flex items-center gap-2">
            <Badge variant="outline" className="px-3 py-1">{step}</Badge>
            {i < arr.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
          </span>
        ))}
      </div>

      <InfoBox variant="info" title="Serii de Facturi">
        Sistemul suporta multiple serii de facturi (ex: FCT, PRF) configurabile
        din setari. Fiecare serie are propriul numar curent si prefix.
      </InfoBox>
    </div>
  );
}

function ShippingContent() {
  return (
    <div className="space-y-8">
      <div className="prose max-w-none">
        <p className="text-lg text-muted-foreground">
          Modulul de livrare gestioneaza generarea AWB-urilor prin FanCourier,
          tracking-ul expeditiilor si gestionarea rambursului.
        </p>
      </div>

      <SectionTitle icon={<Truck className="h-6 w-6" />}>Generare AWB</SectionTitle>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-2 text-foreground">Date Expeditor</h3>
            <p className="text-sm text-muted-foreground">Configurate din setari, preluate automat</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-2 text-foreground">Date Destinatar</h3>
            <p className="text-sm text-muted-foreground">Preluate din comanda, validate anterior</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-2 text-foreground">Optiuni Livrare</h3>
            <p className="text-sm text-muted-foreground">Ramburs, asigurare, deschidere colet</p>
          </CardContent>
        </Card>
      </div>

      <InfoBox variant="warning" title="Tracking Automat">
        Statusurile AWB sunt actualizate automat prin CRON job la fiecare 30 minute.
      </InfoBox>
    </div>
  );
}

function PickingContent() {
  return (
    <div className="space-y-8">
      <div className="prose max-w-none">
        <p className="text-lg text-muted-foreground">
          Sistemul de picking permite crearea listelor de pregatire si urmarirea
          procesului de coletare pana la predarea catre curier.
        </p>
      </div>

      <SectionTitle icon={<ClipboardList className="h-6 w-6" />}>Procesul de Picking</SectionTitle>

      <div className="flex flex-wrap items-center gap-2 p-4 bg-muted rounded-lg">
        {[
          "Selectie Comenzi",
          "Generare Lista",
          "Scanare Produse",
          "Validare Colet",
          "Predare Curier"
        ].map((step, i, arr) => (
          <span key={i} className="flex items-center gap-2">
            <Badge variant="outline" className="px-3 py-1">{step}</Badge>
            {i < arr.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scan className="h-5 w-5" />
              Scanare Produse
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Fiecare produs este scanat pentru confirmare. Sistemul valideaza
              ca toate produsele din comanda sunt in colet.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hand className="h-5 w-5" />
              Predare Curier
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              La predare se genereaza raport C0 cu toate AWB-urile predate
              si se actualizeaza statusul comenzilor.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AdvertisingContent() {
  return (
    <div className="space-y-8">
      <div className="prose max-w-none">
        <p className="text-lg text-muted-foreground">
          Modulul de advertising integreaza Meta Ads si TikTok Ads pentru
          monitorizarea campaniilor si calcularea ROAS.
        </p>
      </div>

      <SectionTitle icon={<Target className="h-6 w-6" />}>Platforme Integrate</SectionTitle>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle>Meta Ads</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>Sincronizare campanii si ad sets</li>
              <li>Metrici: spend, impressions, clicks</li>
              <li>Calcul ROAS per produs</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle>TikTok Ads</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>Sincronizare campanii</li>
              <li>Metrici similare cu Meta</li>
              <li>Alerte ROAS scazut</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <SectionTitle icon={<TrendingUp className="h-6 w-6" />}>Alerte ROAS</SectionTitle>

      <InfoBox variant="warning" title="Monitorizare Automata">
        Sistemul trimite alerte cand ROAS scade sub pragul configurat (default 2.0).
        Alertele pot fi trimise pe email sau in dashboard.
      </InfoBox>
    </div>
  );
}

function RBACContent() {
  return (
    <div className="space-y-8">
      <div className="prose max-w-none">
        <p className="text-lg text-muted-foreground">
          Sistemul RBAC (Role-Based Access Control) ofera control granular asupra
          accesului utilizatorilor la diferite functionalitati.
        </p>
      </div>

      <SectionTitle icon={<Users className="h-6 w-6" />}>Structura RBAC</SectionTitle>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Utilizatori
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Conturi individuale cu email si parola. Pot avea multiple roluri.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Roluri
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Grupuri de permisiuni (ex: Admin, Operator, Viewer).
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Permisiuni
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Actiuni specifice (ex: orders.view, orders.edit, orders.delete).
            </p>
          </CardContent>
        </Card>
      </div>

      <SectionTitle icon={<Lock className="h-6 w-6" />}>Exemple Permisiuni</SectionTitle>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          "orders.view", "orders.edit", "orders.process", "orders.delete",
          "products.view", "products.edit", "inventory.manage", "invoices.issue",
          "awb.create", "picking.manage", "settings.view", "users.manage"
        ].map((perm, i) => (
          <Badge key={i} variant="outline" className="justify-center py-2">{perm}</Badge>
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
          { name: "SmartBill", desc: "Facturare electronica - emitere, storno", color: "border-primary/30" },
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
