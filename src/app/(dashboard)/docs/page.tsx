"use client";

import { useState } from "react";
import {
  Book,
  ShoppingCart,
  Truck,
  FileText,
  Package,
  Megaphone,
  Settings,
  Shield,
  Database,
  Zap,
  GitBranch,
  Clock,
  Server,
  Users,
  Bell,
  BarChart3,
  Layers,
  Code,
  ChevronRight,
  Search,
  ExternalLink,
  Copy,
  Check,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  FlowDiagram,
  BoxDiagram,
  ArchitectureDiagram,
  StatusBadge,
  EntityDiagram,
  Timeline,
} from "@/components/docs/diagrams";
import { cn } from "@/lib/utils";

// Versiune documentație - actualizați la fiecare modificare majoră
const DOC_VERSION = "2.1.0";
const LAST_UPDATED = "2026-01-06";

// Module list
const modules = [
  { id: "overview", name: "Prezentare Generală", icon: Book },
  { id: "architecture", name: "Arhitectură", icon: Layers },
  { id: "orders", name: "Comenzi", icon: ShoppingCart },
  { id: "products", name: "Produse", icon: Package },
  { id: "shipping", name: "Livrare & AWB", icon: Truck },
  { id: "invoices", name: "Facturare", icon: FileText },
  { id: "handover", name: "Predare Curier", icon: Clock },
  { id: "advertising", name: "Advertising", icon: Megaphone },
  { id: "rbac", name: "Permisiuni", icon: Shield },
  { id: "integrations", name: "Integrări", icon: GitBranch },
  { id: "api", name: "API Reference", icon: Code },
  { id: "changelog", name: "Changelog", icon: Clock },
];

function CodeBlock({ code, language = "typescript" }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
        <code>{code}</code>
      </pre>
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={copyToClipboard}
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  );
}

function SectionTitle({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <h2 id={id} className="text-xl font-bold mt-8 mb-4 flex items-center gap-2 scroll-mt-20">
      {children}
    </h2>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold mb-3">{title}</h3>
      {children}
    </div>
  );
}

// ==================== MODULE CONTENT ====================

function OverviewContent() {
  return (
    <div className="space-y-6">
      <div className="prose max-w-none">
        <p className="text-lg text-muted-foreground">
          ERP Shopify este o platformă completă pentru gestionarea unui business e-commerce, 
          integrând comenzi din multiple canale, livrare, facturare și advertising.
        </p>
      </div>

      <SectionTitle>Capabilități Principale</SectionTitle>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { icon: ShoppingCart, title: "Multi-Channel", desc: "Shopify, Trendyol, extensibil" },
          { icon: Truck, title: "Livrare Automată", desc: "FanCourier AWB & tracking" },
          { icon: FileText, title: "Facturare", desc: "SmartBill integrare completă" },
          { icon: Package, title: "Inventar", desc: "Stoc sincronizat cross-platform" },
          { icon: Megaphone, title: "Advertising", desc: "Meta & TikTok Ads" },
          { icon: Shield, title: "RBAC", desc: "Permisiuni granulare" },
        ].map((item, i) => (
          <Card key={i} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <item.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">{item.title}</p>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <SectionTitle>Flux Principal - Comandă până la Livrare</SectionTitle>
      
      <FlowDiagram
        steps={[
          { id: "1", label: "Comandă Nouă", description: "Shopify/Trendyol", color: "bg-blue-50 border-blue-300" },
          { id: "2", label: "Sync ERP", description: "Webhook/CRON", color: "bg-purple-50 border-purple-300" },
          { id: "3", label: "Procesare", description: "Verificare stoc", color: "bg-yellow-50 border-yellow-300" },
          { id: "4", label: "AWB", description: "FanCourier", color: "bg-orange-50 border-orange-300" },
          { id: "5", label: "Factură", description: "SmartBill", color: "bg-green-50 border-green-300" },
          { id: "6", label: "Livrare", description: "Tracking", color: "bg-teal-50 border-teal-300" },
        ]}
      />

      <SectionTitle>Stack Tehnologic</SectionTitle>
      
      <ArchitectureDiagram
        layers={[
          {
            name: "Frontend",
            color: "bg-blue-50 border-blue-300",
            items: ["Next.js 14", "React 18", "TailwindCSS", "shadcn/ui", "TanStack Query"],
          },
          {
            name: "Backend",
            color: "bg-green-50 border-green-300",
            items: ["Next.js API Routes", "Prisma ORM", "NextAuth.js", "Node.js"],
          },
          {
            name: "Database",
            color: "bg-purple-50 border-purple-300",
            items: ["PostgreSQL", "Prisma Migrations", "JSON Fields"],
          },
          {
            name: "Integrări Externe",
            color: "bg-orange-50 border-orange-300",
            items: ["Shopify API", "Trendyol API", "FanCourier API", "SmartBill API", "Meta Ads API", "TikTok Ads API"],
          },
        ]}
      />
    </div>
  );
}

function ArchitectureContent() {
  return (
    <div className="space-y-6">
      <SectionTitle>Structura Proiectului</SectionTitle>
      
      <CodeBlock code={`erp-shopify/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (dashboard)/        # Pagini protejate
│   │   │   ├── orders/         # Modul comenzi
│   │   │   ├── products/       # Modul produse
│   │   │   ├── ads/            # Modul advertising
│   │   │   └── ...
│   │   ├── api/                # API Routes
│   │   │   ├── orders/
│   │   │   ├── ads/
│   │   │   ├── cron/           # Jobs programate
│   │   │   └── ...
│   │   └── login/              # Autentificare
│   ├── components/             # Componente React
│   │   ├── ui/                 # shadcn/ui
│   │   └── docs/               # Componente documentație
│   ├── lib/                    # Utilitare & servicii
│   │   ├── shopify.ts          # Shopify client
│   │   ├── fancourier.ts       # FanCourier client
│   │   ├── smartbill.ts        # SmartBill client
│   │   ├── meta-ads.ts         # Meta Ads client
│   │   └── ...
│   └── hooks/                  # React hooks custom
├── prisma/
│   └── schema.prisma           # Schema DB
└── public/                     # Fișiere statice`} />

      <SectionTitle>Modele de Date Principale</SectionTitle>
      
      <EntityDiagram
        entities={[
          {
            name: "Order",
            fields: ["id", "orderNumber", "channel", "status", "customer", "items[]", "awbId?", "invoiceId?"],
            color: "border-blue-300",
          },
          {
            name: "MasterProduct",
            fields: ["id", "sku", "title", "price", "stock", "channels[]", "variants[]"],
            color: "border-green-300",
          },
          {
            name: "AWB",
            fields: ["id", "awbNumber", "status", "trackingUrl", "orderId", "events[]"],
            color: "border-orange-300",
          },
          {
            name: "Invoice",
            fields: ["id", "series", "number", "total", "status", "orderId", "pdfUrl"],
            color: "border-purple-300",
          },
          {
            name: "AdsAccount",
            fields: ["id", "platform", "name", "accessToken", "campaigns[]", "pixels[]"],
            color: "border-pink-300",
          },
          {
            name: "AdsCampaign",
            fields: ["id", "name", "status", "spend", "roas", "adSets[]", "alerts[]"],
            color: "border-red-300",
          },
          {
            name: "User",
            fields: ["id", "email", "name", "role", "groups[]", "permissions[]"],
            color: "border-teal-300",
          },
          {
            name: "AdsAlertRule",
            fields: ["id", "name", "conditions", "action", "autoRollback", "alerts[]"],
            color: "border-yellow-300",
          },
        ]}
      />

      <SectionTitle>Pattern-uri Utilizate</SectionTitle>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Repository Pattern</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Prisma ORM oferă un layer de abstracție pentru operațiile DB. 
            Queries complexe sunt encapsulate în funcții din <code>/lib</code>.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Service Layer</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Fiecare integrare externă are un serviciu dedicat 
            (shopify.ts, fancourier.ts, etc.) cu funcții pure.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">API Routes</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            RESTful endpoints cu validare, autorizare și error handling standardizat.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">CRON Jobs</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Tasks programate pentru sincronizare, alerte și cleanup. 
            Protejate cu CRON_SECRET.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function OrdersContent() {
  return (
    <div className="space-y-6">
      <SectionTitle>Fluxul Comenzilor</SectionTitle>
      
      <FlowDiagram
        steps={[
          { id: "1", label: "PENDING", description: "Comandă nouă", color: "bg-gray-50 border-gray-300" },
          { id: "2", label: "PROCESSING", description: "În procesare", color: "bg-blue-50 border-blue-300" },
          { id: "3", label: "AWB_GENERATED", description: "AWB creat", color: "bg-yellow-50 border-yellow-300" },
          { id: "4", label: "INVOICED", description: "Facturat", color: "bg-purple-50 border-purple-300" },
          { id: "5", label: "SHIPPED", description: "Expediat", color: "bg-orange-50 border-orange-300" },
          { id: "6", label: "DELIVERED", description: "Livrat", color: "bg-green-50 border-green-300" },
        ]}
      />

      <SubSection title="Statusuri Disponibile">
        <div className="flex flex-wrap gap-2">
          {[
            { status: "PENDING", color: "bg-gray-100" },
            { status: "PROCESSING", color: "bg-blue-100" },
            { status: "AWB_GENERATED", color: "bg-yellow-100" },
            { status: "INVOICED", color: "bg-purple-100" },
            { status: "SHIPPED", color: "bg-orange-100" },
            { status: "IN_TRANSIT", color: "bg-cyan-100" },
            { status: "DELIVERED", color: "bg-green-100" },
            { status: "CANCELLED", color: "bg-red-100" },
            { status: "RETURNED", color: "bg-pink-100" },
          ].map((s) => (
            <Badge key={s.status} className={s.color}>{s.status}</Badge>
          ))}
        </div>
      </SubSection>

      <SubSection title="Canale Suportate">
        <BoxDiagram
          title="Surse Comenzi"
          items={[
            { label: "Shopify", description: "Via Webhook + API", color: "bg-green-50 border-green-200" },
            { label: "Trendyol", description: "Via CRON sync", color: "bg-orange-50 border-orange-200" },
            { label: "Manual", description: "Creare din ERP", color: "bg-gray-50 border-gray-200" },
          ]}
        />
      </SubSection>

      <SubSection title="API Endpoints">
        <div className="space-y-2">
          {[
            { method: "GET", path: "/api/orders", desc: "Lista comenzi cu filtre și paginare" },
            { method: "GET", path: "/api/orders/[id]", desc: "Detalii comandă" },
            { method: "POST", path: "/api/orders/process", desc: "Procesare comandă (AWB + factură)" },
            { method: "POST", path: "/api/orders/process-all", desc: "Procesare bulk" },
          ].map((api, i) => (
            <div key={i} className="flex items-center gap-3 p-2 bg-muted rounded">
              <Badge variant={api.method === "GET" ? "secondary" : "default"}>{api.method}</Badge>
              <code className="text-sm font-mono">{api.path}</code>
              <span className="text-sm text-muted-foreground">- {api.desc}</span>
            </div>
          ))}
        </div>
      </SubSection>

      <SubSection title="Procesare Automată">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="font-medium mb-2">Când se apasă "Procesează":</p>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Se verifică stocul pentru toate produsele</li>
            <li>Se generează AWB în FanCourier</li>
            <li>Se emite factura în SmartBill</li>
            <li>Se actualizează statusul în Shopify/Trendyol</li>
            <li>Se decrementează stocul</li>
            <li>Se trimite email cu tracking către client</li>
          </ol>
        </div>
      </SubSection>
    </div>
  );
}

function ProductsContent() {
  return (
    <div className="space-y-6">
      <SectionTitle>Structura Produselor</SectionTitle>
      
      <ArchitectureDiagram
        layers={[
          {
            name: "MasterProduct (Produs Unic)",
            color: "bg-blue-50 border-blue-300",
            items: ["SKU unic", "Titlu", "Descriere", "Preț bază", "Imagine", "Categorie"],
          },
          {
            name: "ProductVariant (Variante)",
            color: "bg-green-50 border-green-300",
            items: ["SKU variantă", "Atribute (culoare, mărime)", "Preț specific", "Stoc"],
          },
          {
            name: "ChannelProduct (Per Canal)",
            color: "bg-orange-50 border-orange-300",
            items: ["Shopify ID", "Trendyol ID", "Preț canal", "Status publicare"],
          },
        ]}
      />

      <SubSection title="Sincronizare Multi-Canal">
        <FlowDiagram
          steps={[
            { id: "1", label: "MasterProduct", description: "Sursă unică", color: "bg-blue-50 border-blue-300" },
            { id: "2", label: "Sync Engine", description: "Mapare", color: "bg-purple-50 border-purple-300" },
            { id: "3", label: "Shopify", description: "Push/Pull", color: "bg-green-50 border-green-300" },
          ]}
        />
        <FlowDiagram
          steps={[
            { id: "1", label: "MasterProduct", description: "Sursă unică", color: "bg-blue-50 border-blue-300" },
            { id: "2", label: "Sync Engine", description: "Mapare", color: "bg-purple-50 border-purple-300" },
            { id: "3", label: "Trendyol", description: "Push/Pull", color: "bg-orange-50 border-orange-300" },
          ]}
          className="mt-2"
        />
      </SubSection>

      <SubSection title="Stoc & Inventar">
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Stoc Fizic</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              Cantitatea reală din depozit. Se actualizează la:
              <ul className="list-disc list-inside mt-2">
                <li>Recepție marfă</li>
                <li>Inventar manual</li>
                <li>Sync SmartBill</li>
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Stoc Rezervat</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              Cantitate în comenzi neprocesate. Se eliberează la:
              <ul className="list-disc list-inside mt-2">
                <li>Procesare comandă</li>
                <li>Anulare comandă</li>
                <li>Timeout rezervare</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </SubSection>

      <SubSection title="Rețete (Bundle Products)">
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="font-medium mb-2">Produse Compuse</p>
          <p className="text-sm mb-3">
            Un produs poate fi format din mai multe componente. La vânzare, 
            stocul se decrementează pentru fiecare componentă.
          </p>
          <CodeBlock code={`// Exemplu rețetă
{
  "sku": "SET-DORMITOR",
  "components": [
    { "sku": "PAT-001", "quantity": 1 },
    { "sku": "NOPTIERA-001", "quantity": 2 },
    { "sku": "DULAP-001", "quantity": 1 }
  ]
}`} />
        </div>
      </SubSection>
    </div>
  );
}

function ShippingContent() {
  return (
    <div className="space-y-6">
      <SectionTitle>Generare AWB</SectionTitle>
      
      <FlowDiagram
        steps={[
          { id: "1", label: "Comandă", description: "Date client", color: "bg-blue-50 border-blue-300" },
          { id: "2", label: "FanCourier API", description: "Creare AWB", color: "bg-orange-50 border-orange-300" },
          { id: "3", label: "AWB Number", description: "Salvare DB", color: "bg-green-50 border-green-300" },
          { id: "4", label: "PDF Label", description: "Print A6", color: "bg-purple-50 border-purple-300" },
        ]}
      />

      <SubSection title="Statusuri AWB">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { status: "Comanda introdusa", color: "bg-gray-100" },
            { status: "Preluata de curier", color: "bg-blue-100" },
            { status: "In tranzit", color: "bg-yellow-100" },
            { status: "In livrare", color: "bg-orange-100" },
            { status: "Livrata", color: "bg-green-100" },
            { status: "Refuzata", color: "bg-red-100" },
            { status: "Retur", color: "bg-pink-100" },
            { status: "Ramburs incasat", color: "bg-teal-100" },
          ].map((s) => (
            <Badge key={s.status} className={cn("justify-center", s.color)}>{s.status}</Badge>
          ))}
        </div>
      </SubSection>

      <SubSection title="Configurare FanCourier">
        <CodeBlock code={`# .env
FANCOURIER_CLIENT_ID=your_client_id
FANCOURIER_USERNAME=your_username  
FANCOURIER_PASSWORD=your_password
FANCOURIER_SENDER_NAME="Aquaterra Mobili"
FANCOURIER_SENDER_PHONE=0700000000
FANCOURIER_SENDER_COUNTY=Bucuresti
FANCOURIER_SENDER_CITY=Sector 1
FANCOURIER_SENDER_ADDRESS="Str. Example nr. 1"`} />
      </SubSection>

      <SubSection title="Predare Curier (Handover)">
        <FlowDiagram
          steps={[
            { id: "1", label: "Scanare AWB", description: "Cu scanner", color: "bg-blue-50 border-blue-300" },
            { id: "2", label: "Lista Predare", description: "Confirmare", color: "bg-yellow-50 border-yellow-300" },
            { id: "3", label: "Finalizare", description: "PDF raport", color: "bg-green-50 border-green-300" },
          ]}
        />
        <div className="mt-4 p-4 bg-muted rounded-lg">
          <p className="font-medium mb-2">Statusuri Handover:</p>
          <div className="flex gap-2 flex-wrap">
            <Badge className="bg-gray-100">AWB_EMIS</Badge>
            <Badge className="bg-blue-100">COLETAT</Badge>
            <Badge className="bg-green-100">PREDAT_CURIER</Badge>
            <Badge className="bg-red-100">NEPREDAT</Badge>
          </div>
        </div>
      </SubSection>
    </div>
  );
}

function InvoicesContent() {
  return (
    <div className="space-y-6">
      <SectionTitle>Flux Facturare</SectionTitle>
      
      <FlowDiagram
        steps={[
          { id: "1", label: "Comandă Procesată", color: "bg-blue-50 border-blue-300" },
          { id: "2", label: "SmartBill API", description: "Emitere", color: "bg-purple-50 border-purple-300" },
          { id: "3", label: "Număr Factură", description: "Serie+Nr", color: "bg-green-50 border-green-300" },
          { id: "4", label: "PDF", description: "Descărcare", color: "bg-orange-50 border-orange-300" },
        ]}
      />

      <SubSection title="Serii de Facturi">
        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm mb-3">
            Fiecare canal de vânzare poate avea o serie distinctă de facturare.
          </p>
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2 bg-green-50 rounded text-center">
              <p className="font-mono font-bold">SHOP</p>
              <p className="text-xs text-muted-foreground">Shopify</p>
            </div>
            <div className="p-2 bg-orange-50 rounded text-center">
              <p className="font-mono font-bold">TRND</p>
              <p className="text-xs text-muted-foreground">Trendyol</p>
            </div>
            <div className="p-2 bg-blue-50 rounded text-center">
              <p className="font-mono font-bold">ERP</p>
              <p className="text-xs text-muted-foreground">Manual</p>
            </div>
          </div>
        </div>
      </SubSection>

      <SubSection title="Tipuri de Documente">
        <BoxDiagram
          title="SmartBill Documents"
          items={[
            { label: "Factură", description: "Standard", color: "bg-blue-50 border-blue-200" },
            { label: "Factură Proformă", description: "Plată în avans", color: "bg-yellow-50 border-yellow-200" },
            { label: "Chitanță", description: "Cash", color: "bg-green-50 border-green-200" },
            { label: "Storno", description: "Anulare", color: "bg-red-50 border-red-200" },
          ]}
        />
      </SubSection>

      <SubSection title="Configurare SmartBill">
        <CodeBlock code={`# .env
SMARTBILL_API_TOKEN=your_api_token
SMARTBILL_COMPANY_CIF=RO12345678
SMARTBILL_WAREHOUSE=Depozit Principal`} />
      </SubSection>
    </div>
  );
}

function HandoverContent() {
  return (
    <div className="space-y-6">
      <SectionTitle>Sistemul de Predare Curier</SectionTitle>
      
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm">
          Modulul Handover permite scanarea și confirmarea coletelor 
          care sunt predate curierului, generând rapoarte și prevenind 
          pierderea pachetelor.
        </p>
      </div>

      <SubSection title="Flux de Lucru">
        <FlowDiagram
          direction="vertical"
          steps={[
            { id: "1", label: "1. Deschide Sesiune", description: "Pagina /handover", color: "bg-blue-50 border-blue-300" },
            { id: "2", label: "2. Scanează Colete", description: "Scanner sau manual", color: "bg-yellow-50 border-yellow-300" },
            { id: "3", label: "3. Verifică Lista", description: "Confirmă toate", color: "bg-orange-50 border-orange-300" },
            { id: "4", label: "4. Finalizează", description: "Generează raport", color: "bg-green-50 border-green-300" },
          ]}
        />
      </SubSection>

      <SubSection title="Statusuri Colet">
        <div className="space-y-2">
          {[
            { status: "AWB_EMIS", desc: "AWB generat, colet nepregătit", color: "bg-gray-100" },
            { status: "COLETAT", desc: "Colet pregătit, nescanat", color: "bg-yellow-100" },
            { status: "PREDAT_CURIER", desc: "Scanat și predat", color: "bg-green-100" },
            { status: "NEPREDAT", desc: "Nu a fost predat în ziua respectivă", color: "bg-red-100" },
          ].map((s) => (
            <div key={s.status} className="flex items-center gap-3">
              <Badge className={s.color}>{s.status}</Badge>
              <span className="text-sm text-muted-foreground">{s.desc}</span>
            </div>
          ))}
        </div>
      </SubSection>

      <SubSection title="Raport Zilnic">
        <div className="p-4 bg-muted rounded-lg">
          <p className="font-medium mb-2">Conținut raport:</p>
          <ul className="list-disc list-inside text-sm space-y-1">
            <li>Total colete predate</li>
            <li>Valoare ramburs colectată</li>
            <li>Colete nepredrate (dacă există)</li>
            <li>Timestamp-uri scanări</li>
            <li>Export Excel disponibil</li>
          </ul>
        </div>
      </SubSection>

      <SubSection title="Finalizare Automată">
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="font-medium mb-2">CRON Job: Finalizare la Miezul Nopții</p>
          <p className="text-sm">
            La ora 00:00, toate sesiunile de handover deschise sunt finalizate automat.
            Coletele nescanate primesc statusul NEPREDAT și apar în raportul de excepții.
          </p>
          <CodeBlock code={`// /api/cron/handover-finalize
// Schedule: 0 0 * * * (daily at midnight)`} />
        </div>
      </SubSection>
    </div>
  );
}

function AdvertisingContent() {
  return (
    <div className="space-y-6">
      <div className="flex gap-2 mb-4">
        <StatusBadge status="active">Meta Ads</StatusBadge>
        <StatusBadge status="active">TikTok Ads</StatusBadge>
        <StatusBadge status="planned">Google Ads</StatusBadge>
      </div>

      <SectionTitle>Arhitectură Modul Advertising</SectionTitle>
      
      <ArchitectureDiagram
        layers={[
          {
            name: "Platforme",
            color: "bg-blue-50 border-blue-300",
            items: ["Meta (Facebook/Instagram)", "TikTok Ads", "Google Ads (planned)"],
          },
          {
            name: "Conturi & OAuth",
            color: "bg-green-50 border-green-300",
            items: ["AdsAccount", "OAuth Flow", "Token Refresh", "Setări DB"],
          },
          {
            name: "Campanii & Structură",
            color: "bg-yellow-50 border-yellow-300",
            items: ["AdsCampaign", "AdsAdSet", "AdsAd", "Daily Stats"],
          },
          {
            name: "Alerte & Automatizări",
            color: "bg-red-50 border-red-300",
            items: ["AdsAlertRule", "AdsAlert", "Auto-Pause", "Auto-Rollback"],
          },
          {
            name: "Tracking",
            color: "bg-purple-50 border-purple-300",
            items: ["AdsPixel", "Product Mapping", "ROAS Tracking"],
          },
        ]}
      />

      <SubSection title="Flux OAuth">
        <FlowDiagram
          steps={[
            { id: "1", label: "Setări", description: "App ID/Secret", color: "bg-gray-50 border-gray-300" },
            { id: "2", label: "Connect", description: "Redirect OAuth", color: "bg-blue-50 border-blue-300" },
            { id: "3", label: "Callback", description: "Exchange code", color: "bg-yellow-50 border-yellow-300" },
            { id: "4", label: "Token", description: "Salvare DB", color: "bg-green-50 border-green-300" },
          ]}
        />
      </SubSection>

      <SubSection title="Convenție Denumire Campanii">
        <div className="p-4 bg-muted rounded-lg">
          <p className="font-mono text-center text-lg mb-3">
            CONV_SKU_[COD1]_[COD2]_BROAD_2026Q1
          </p>
          <div className="grid grid-cols-4 gap-2 text-sm">
            <div className="p-2 bg-blue-50 rounded text-center">
              <p className="font-bold">CONV</p>
              <p className="text-xs">Obiectiv</p>
            </div>
            <div className="p-2 bg-green-50 rounded text-center">
              <p className="font-bold">SKU</p>
              <p className="text-xs">Tip</p>
            </div>
            <div className="p-2 bg-yellow-50 rounded text-center">
              <p className="font-bold">[COD]</p>
              <p className="text-xs">Produs</p>
            </div>
            <div className="p-2 bg-purple-50 rounded text-center">
              <p className="font-bold">2026Q1</p>
              <p className="text-xs">Perioadă</p>
            </div>
          </div>
        </div>
      </SubSection>

      <SubSection title="Engine Alerte">
        <FlowDiagram
          steps={[
            { id: "1", label: "CRON 15min", description: "Verificare", color: "bg-gray-50 border-gray-300" },
            { id: "2", label: "Evaluare Reguli", description: "CPA > 50?", color: "bg-yellow-50 border-yellow-300" },
            { id: "3", label: "Acțiune", description: "Pause/Reduce", color: "bg-red-50 border-red-300" },
            { id: "4", label: "Rollback", description: "După X ore", color: "bg-green-50 border-green-300" },
          ]}
        />
        
        <div className="mt-4 p-4 bg-muted rounded-lg">
          <p className="font-medium mb-2">Metrici Suportate:</p>
          <div className="flex flex-wrap gap-2">
            {["spend", "cpa", "roas", "ctr", "cpm", "cpc", "frequency", "conversions"].map((m) => (
              <Badge key={m} variant="outline">{m}</Badge>
            ))}
          </div>
          <p className="font-medium mt-4 mb-2">Acțiuni Disponibile:</p>
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-blue-100">NOTIFY</Badge>
            <Badge className="bg-yellow-100">PAUSE</Badge>
            <Badge className="bg-red-100">REDUCE_BUDGET</Badge>
          </div>
        </div>
      </SubSection>

      <SubSection title="CRON Jobs">
        <div className="space-y-2">
          {[
            { path: "/api/cron/ads-sync", schedule: "*/30 * * * *", desc: "Sincronizare date campanii" },
            { path: "/api/cron/ads-alerts", schedule: "*/15 * * * *", desc: "Verificare reguli alertă" },
            { path: "/api/cron/ads-rollback", schedule: "0 * * * *", desc: "Rollback automat" },
          ].map((job, i) => (
            <div key={i} className="flex items-center gap-3 p-2 bg-muted rounded">
              <code className="text-sm font-mono">{job.path}</code>
              <Badge variant="secondary">{job.schedule}</Badge>
              <span className="text-sm text-muted-foreground">{job.desc}</span>
            </div>
          ))}
        </div>
      </SubSection>
    </div>
  );
}

function RBACContent() {
  return (
    <div className="space-y-6">
      <SectionTitle>Sistem de Permisiuni</SectionTitle>
      
      <ArchitectureDiagram
        layers={[
          {
            name: "Users",
            color: "bg-blue-50 border-blue-300",
            items: ["email", "password (hashed)", "name", "isActive"],
          },
          {
            name: "Roles",
            color: "bg-green-50 border-green-300",
            items: ["admin", "manager", "operator", "viewer"],
          },
          {
            name: "Groups",
            color: "bg-yellow-50 border-yellow-300",
            items: ["Warehouse", "Sales", "Marketing", "Finance"],
          },
          {
            name: "Permissions",
            color: "bg-red-50 border-red-300",
            items: ["orders.view", "orders.process", "ads.manage", "settings.admin"],
          },
        ]}
      />

      <SubSection title="Categorii Permisiuni">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { name: "Orders", perms: ["orders.view", "orders.process", "orders.cancel"] },
            { name: "Products", perms: ["products.view", "products.edit", "products.create"] },
            { name: "Shipping", perms: ["shipping.view", "shipping.create", "handover.scan"] },
            { name: "Invoices", perms: ["invoices.view", "invoices.issue", "invoices.cancel"] },
            { name: "Advertising", perms: ["ads.view", "ads.manage", "ads.alerts"] },
            { name: "Settings", perms: ["settings.view", "settings.edit", "settings.admin"] },
          ].map((cat) => (
            <Card key={cat.name}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{cat.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {cat.perms.map((p) => (
                    <code key={p} className="block text-xs text-muted-foreground">{p}</code>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </SubSection>

      <SubSection title="Verificare Permisiuni">
        <CodeBlock code={`// Server-side (API routes)
import { hasPermission } from "@/lib/permissions";

const canProcess = await hasPermission(userId, "orders.process");
if (!canProcess) {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// Client-side (React components)
import { usePermissions, RequirePermission } from "@/hooks/use-permissions";

// Hook
const { hasPermission, isLoading } = usePermissions();
if (hasPermission("orders.process")) { /* ... */ }

// Component wrapper
<RequirePermission permission="orders.process">
  <ProcessButton />
</RequirePermission>`} />
      </SubSection>
    </div>
  );
}

function IntegrationsContent() {
  return (
    <div className="space-y-6">
      <SectionTitle>Integrări Active</SectionTitle>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          {
            name: "Shopify",
            status: "active",
            desc: "E-commerce platform",
            features: ["Orders sync", "Products sync", "Inventory sync", "Webhooks"],
          },
          {
            name: "Trendyol",
            status: "active",
            desc: "Marketplace Turkey",
            features: ["Orders sync", "Products publish", "Stock sync"],
          },
          {
            name: "FanCourier",
            status: "active",
            desc: "Courier Romania",
            features: ["AWB generation", "Tracking", "Label printing"],
          },
          {
            name: "SmartBill",
            status: "active",
            desc: "Invoicing Romania",
            features: ["Invoice issue", "Stock sync", "Receipts"],
          },
          {
            name: "Meta Ads",
            status: "active",
            desc: "Facebook/Instagram Ads",
            features: ["OAuth", "Campaigns sync", "Pixels", "Alerts"],
          },
          {
            name: "TikTok Ads",
            status: "active",
            desc: "TikTok for Business",
            features: ["OAuth", "Campaigns sync", "Pixels", "Alerts"],
          },
          {
            name: "Google Ads",
            status: "planned",
            desc: "Google Advertising",
            features: ["OAuth", "Campaigns sync"],
          },
          {
            name: "Google Drive",
            status: "active",
            desc: "File storage",
            features: ["Product images", "Document storage"],
          },
        ].map((int) => (
          <Card key={int.name}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{int.name}</CardTitle>
                <StatusBadge status={int.status as any}>
                  {int.status === "active" ? "Activ" : "Planificat"}
                </StatusBadge>
              </div>
              <CardDescription>{int.desc}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1">
                {int.features.map((f) => (
                  <Badge key={f} variant="secondary" className="text-xs">{f}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <SubSection title="Configurare .env">
        <CodeBlock code={`# Database
DATABASE_URL="postgresql://..."

# Auth
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="https://erp.example.com"

# Shopify
SHOPIFY_STORE_DOMAIN="store.myshopify.com"
SHOPIFY_ACCESS_TOKEN="shpat_..."
SHOPIFY_WEBHOOK_SECRET="..."

# FanCourier
FANCOURIER_CLIENT_ID="..."
FANCOURIER_USERNAME="..."
FANCOURIER_PASSWORD="..."

# SmartBill
SMARTBILL_API_TOKEN="..."
SMARTBILL_COMPANY_CIF="RO..."

# Trendyol
TRENDYOL_SELLER_ID="..."
TRENDYOL_API_KEY="..."
TRENDYOL_API_SECRET="..."

# CRON Protection
CRON_SECRET="..."

# Google Drive (optional)
GOOGLE_DRIVE_FOLDER_ID="..."`} />
      </SubSection>
    </div>
  );
}

function APIReferenceContent() {
  const endpoints = [
    { category: "Orders", routes: [
      { method: "GET", path: "/api/orders", desc: "List orders" },
      { method: "GET", path: "/api/orders/[id]", desc: "Get order details" },
      { method: "POST", path: "/api/orders/process", desc: "Process order" },
    ]},
    { category: "Products", routes: [
      { method: "GET", path: "/api/products", desc: "List products" },
      { method: "GET", path: "/api/products/[id]", desc: "Get product" },
      { method: "PATCH", path: "/api/products/[id]", desc: "Update product" },
    ]},
    { category: "Shipping", routes: [
      { method: "GET", path: "/api/awb", desc: "List AWBs" },
      { method: "POST", path: "/api/awb/create", desc: "Create AWB" },
      { method: "GET", path: "/api/tracking", desc: "Get tracking" },
    ]},
    { category: "Invoices", routes: [
      { method: "GET", path: "/api/invoices", desc: "List invoices" },
      { method: "POST", path: "/api/invoices/issue", desc: "Issue invoice" },
    ]},
    { category: "Advertising", routes: [
      { method: "GET", path: "/api/ads/accounts", desc: "List accounts" },
      { method: "GET", path: "/api/ads/campaigns", desc: "List campaigns" },
      { method: "GET", path: "/api/ads/stats", desc: "Get statistics" },
      { method: "POST", path: "/api/ads/alerts/rules", desc: "Create alert rule" },
    ]},
  ];

  return (
    <div className="space-y-6">
      <SectionTitle>API Endpoints</SectionTitle>
      
      {endpoints.map((cat) => (
        <SubSection key={cat.category} title={cat.category}>
          <div className="space-y-2">
            {cat.routes.map((route, i) => (
              <div key={i} className="flex items-center gap-3 p-2 bg-muted rounded">
                <Badge variant={route.method === "GET" ? "secondary" : route.method === "POST" ? "default" : "outline"}>
                  {route.method}
                </Badge>
                <code className="text-sm font-mono flex-1">{route.path}</code>
                <span className="text-sm text-muted-foreground">{route.desc}</span>
              </div>
            ))}
          </div>
        </SubSection>
      ))}

      <SubSection title="Autentificare">
        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm mb-3">
            Toate endpoint-urile sunt protejate cu NextAuth.js. 
            Sesiunea este verificată server-side folosind <code>getServerSession()</code>.
          </p>
          <CodeBlock code={`// Verificare sesiune în API route
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // ...
}`} />
        </div>
      </SubSection>

      <SubSection title="Răspunsuri Standard">
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-green-600">Succes</CardTitle>
            </CardHeader>
            <CardContent>
              <CodeBlock code={`{
  "success": true,
  "data": { ... },
  "message": "Operație reușită"
}`} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-red-600">Eroare</CardTitle>
            </CardHeader>
            <CardContent>
              <CodeBlock code={`{
  "error": "Descriere eroare",
  "code": "ERROR_CODE"
}`} />
            </CardContent>
          </Card>
        </div>
      </SubSection>
    </div>
  );
}

function ChangelogContent() {
  const changes = [
    {
      date: "2026-01-06",
      title: "v2.1.0 - Modul Advertising Complet",
      description: "Toate cele 6 faze implementate",
      status: "completed" as const,
    },
    {
      date: "2026-01-05",
      title: "v2.0.0 - Predare Curier (Handover)",
      description: "Sistem complet de scanare și predare",
      status: "completed" as const,
    },
    {
      date: "2026-01-04",
      title: "v1.9.0 - FanCourier AWB Fix",
      description: "Rezolvare printing A6 și parametri API",
      status: "completed" as const,
    },
    {
      date: "2026-01-03",
      title: "v1.8.0 - RBAC System",
      description: "Sistem complet de permisiuni",
      status: "completed" as const,
    },
    {
      date: "Planned",
      title: "v2.2.0 - Google Ads Integration",
      description: "OAuth și sync campanii Google",
      status: "upcoming" as const,
    },
    {
      date: "Planned",
      title: "v2.3.0 - Reports Dashboard",
      description: "Dashboard avansat cu grafice",
      status: "upcoming" as const,
    },
  ];

  return (
    <div className="space-y-6">
      <SectionTitle>Istoric Versiuni</SectionTitle>
      <Timeline events={changes} />
    </div>
  );
}

// ==================== MAIN COMPONENT ====================

export default function DocumentationPage() {
  const [activeModule, setActiveModule] = useState("overview");
  const [search, setSearch] = useState("");

  const filteredModules = modules.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  const renderContent = () => {
    switch (activeModule) {
      case "overview": return <OverviewContent />;
      case "architecture": return <ArchitectureContent />;
      case "orders": return <OrdersContent />;
      case "products": return <ProductsContent />;
      case "shipping": return <ShippingContent />;
      case "invoices": return <InvoicesContent />;
      case "handover": return <HandoverContent />;
      case "advertising": return <AdvertisingContent />;
      case "rbac": return <RBACContent />;
      case "integrations": return <IntegrationsContent />;
      case "api": return <APIReferenceContent />;
      case "changelog": return <ChangelogContent />;
      default: return <OverviewContent />;
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      <div className="w-64 border-r bg-muted/30 flex flex-col">
        <div className="p-4 border-b">
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Book className="h-5 w-5" />
            Documentație
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            v{DOC_VERSION} • {LAST_UPDATED}
          </p>
        </div>
        
        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Caută..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {filteredModules.map((module) => {
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
        </ScrollArea>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
