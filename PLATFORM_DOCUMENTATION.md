# ERP CashFlowSync - Documentație Completă a Platformei

**Versiune:** 1.0.0
**Data:** Februarie 2026
**Status:** Documentație Tehnică Completă

---

## Cuprins

1. [Prezentare Generală](#1-prezentare-generală)
2. [Arhitectură și Stack Tehnologic](#2-arhitectură-și-stack-tehnologic)
3. [Modulul de Autentificare și Autorizare](#3-modulul-de-autentificare-și-autorizare)
4. [Modulul de Gestiune Comenzi](#4-modulul-de-gestiune-comenzi)
5. [Modulul de Facturare](#5-modulul-de-facturare)
6. [Modulul de Expediere (AWB)](#6-modulul-de-expediere-awb)
7. [Modulul de Inventar și Stocuri](#7-modulul-de-inventar-și-stocuri)
8. [Modulul de Depozite](#8-modulul-de-depozite)
9. [Modulul PIM (Product Information Management)](#9-modulul-pim-product-information-management)
10. [Modulul de Picking](#10-modulul-de-picking)
11. [Modulul Handover](#11-modulul-handover)
12. [Integrarea Shopify](#12-integrarea-shopify)
13. [Integrarea Trendyol](#13-integrarea-trendyol)
14. [Modulul de Advertising (ADS)](#14-modulul-de-advertising-ads)
15. [Modulul AI Insights](#15-modulul-ai-insights)
16. [Suport Multi-Companie](#16-suport-multi-companie)
17. [Modulul de Task-uri](#17-modulul-de-task-uri)
18. [Modulul de Raportare](#18-modulul-de-raportare)
19. [Sistemul de Notificări](#19-sistemul-de-notificări)
20. [Sistemul de Printare](#20-sistemul-de-printare)
21. [Cron Jobs și Automatizări](#21-cron-jobs-și-automatizări)
22. [Schema Bazei de Date](#22-schema-bazei-de-date)
23. [API Endpoints](#23-api-endpoints)
24. [Fluxuri End-to-End](#24-fluxuri-end-to-end)

---

## 1. Prezentare Generală

### 1.1 Ce este ERP CashFlowSync?

ERP CashFlowSync este o platformă enterprise de tip ERP (Enterprise Resource Planning) dezvoltată pentru centralizarea și automatizarea operațiunilor de e-commerce. Platforma integrează multiple canale de vânzare (Shopify, Trendyol), servicii de facturare (Oblio), servicii de curierat (FanCourier), și oferă capabilități avansate de gestiune a stocurilor, picking, și analiză bazată pe AI.

### 1.2 Obiectivele Platformei

- **Centralizare**: Toate comenzile din multiple canale într-un singur loc
- **Automatizare**: Procesare automată a comenzilor, facturilor și AWB-urilor
- **Eficiență**: Sistem de picking optimizat pentru depozit
- **Vizibilitate**: Dashboard-uri și rapoarte în timp real
- **Scalabilitate**: Suport pentru multiple companii și magazine
- **Inteligență**: Insights bazate pe AI pentru decizii de business

### 1.3 Utilizatori Țintă

- **Administratori**: Configurare completă a sistemului
- **Manageri**: Rapoarte și analize
- **Operatori Depozit**: Picking și expediere
- **Contabili**: Facturare și reconciliere
- **Marketing**: Gestiune campanii publicitare

---

## 2. Arhitectură și Stack Tehnologic

### 2.1 Stack Tehnologic

| Categorie | Tehnologie | Versiune |
|-----------|------------|----------|
| **Frontend** | Next.js | 14.1.3 |
| **UI Framework** | React | 18.2.0 |
| **Limbaj** | TypeScript | 5.3.3 |
| **Stilizare** | TailwindCSS | 3.4.1 |
| **Componente UI** | Radix UI | Latest |
| **State Management** | TanStack Query | 5.28.0 |
| **Tabele** | TanStack Table | 8.13.2 |
| **Bază de Date** | PostgreSQL | 14+ |
| **ORM** | Prisma | 5.10.2 |
| **Autentificare** | NextAuth.js | 4.24.7 |
| **Charts** | Recharts | 2.12.0 |
| **AI** | Anthropic Claude | claude-sonnet-4-20250514 |

### 2.2 Arhitectura Aplicației

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  Dashboard  │  │   Orders    │  │  Products   │  ...         │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     NEXT.JS APPLICATION                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    API Routes (/api/)                    │    │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐           │    │
│  │  │ Orders │ │Invoice │ │  AWB   │ │Products│  ...      │    │
│  │  └────────┘ └────────┘ └────────┘ └────────┘           │    │
│  └─────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    Services (/lib/)                      │    │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐           │    │
│  │  │Shopify │ │ Oblio  │ │FanCour.│ │Trendyol│  ...      │    │
│  │  └────────┘ └────────┘ └────────┘ └────────┘           │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      POSTGRESQL DATABASE                         │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐        │
│  │ Orders │ │Invoice │ │  AWB   │ │Products│ │ Users  │  ...   │
│  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                             │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐        │
│  │Shopify │ │Trendyol│ │ Oblio  │ │FanCour.│ │ Claude │        │
│  │  API   │ │  API   │ │  API   │ │  API   │ │   AI   │        │
│  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 Structura Proiectului

```
erp-cashflowsync/
├── prisma/
│   ├── schema.prisma          # Schema DB (91+ modele)
│   └── migrations/            # Migrații DB
├── src/
│   ├── app/
│   │   ├── (dashboard)/       # Pagini dashboard (27 rute)
│   │   ├── api/               # API endpoints (191 endpoints)
│   │   ├── layout.tsx         # Layout principal
│   │   └── providers.tsx      # Provideri React
│   ├── components/
│   │   ├── ui/                # Componente UI (42+)
│   │   ├── sidebar.tsx        # Navigare
│   │   └── [features]/        # Componente funcționale
│   ├── lib/
│   │   ├── shopify.ts         # Client Shopify
│   │   ├── trendyol.ts        # Client Trendyol
│   │   ├── oblio.ts           # Client Oblio
│   │   ├── fancourier.ts      # Client FanCourier
│   │   ├── ai.ts              # Integrare Claude AI
│   │   └── [40+ servicii]     # Alte servicii
│   ├── hooks/                 # React hooks custom
│   └── types/                 # Definiții TypeScript
├── public/                    # Assets statice
└── docs/                      # Documentație
```

---

## 3. Modulul de Autentificare și Autorizare

### 3.1 Sistem de Autentificare

Platforma folosește **NextAuth.js** pentru autentificare cu suport pentru:

- **Email/Parolă**: Autentificare clasică cu hashing bcrypt
- **OAuth Shopify**: Pentru conectarea magazinelor
- **Sesiuni JWT**: Token-uri cu expirare configurabilă

#### Flow de Autentificare

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Login   │────▶│ Validate │────▶│  Create  │────▶│ Redirect │
│   Page   │     │  Creds   │     │  Session │     │Dashboard │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
```

### 3.2 Sistem RBAC (Role-Based Access Control)

#### 3.2.1 Permisiuni

Sistemul oferă **permisiuni granulare** organizate pe categorii:

| Categorie | Permisiuni |
|-----------|------------|
| **Orders** | `orders.view`, `orders.create`, `orders.edit`, `orders.delete`, `orders.process` |
| **Products** | `products.view`, `products.create`, `products.edit`, `products.delete`, `products.publish` |
| **Inventory** | `inventory.view`, `inventory.adjust`, `inventory.transfer` |
| **Invoices** | `invoices.view`, `invoices.create`, `invoices.cancel` |
| **AWB** | `awb.view`, `awb.create`, `awb.cancel` |
| **Settings** | `settings.view`, `settings.manage` |
| **Users** | `users.view`, `users.create`, `users.edit`, `users.delete` |
| **Reports** | `reports.view`, `reports.export` |

#### 3.2.2 Roluri

Rolurile sunt colecții de permisiuni:

- **Administrator**: Toate permisiunile
- **Manager**: Vizualizare + editare fără setări sistem
- **Operator Depozit**: Picking, AWB, vizualizare comenzi
- **Contabil**: Facturi, rapoarte financiare
- **Vizualizator**: Doar vizualizare

#### 3.2.3 Grupuri

Utilizatorii pot fi organizați în grupuri:
- Grupurile moștenesc roluri
- Un utilizator poate fi în mai multe grupuri
- Permisiunile se cumulează

#### 3.2.4 Restricții pe Magazine

Fiecare utilizator poate avea acces restricționat la:
- Anumite magazine Shopify
- Anumite magazine Trendyol
- Anumite depozite

### 3.3 Sistem de Invitații

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Admin   │────▶│  Create  │────▶│  Email   │────▶│  Accept  │
│ Invites  │     │Invitation│     │  Sent    │     │& Register│
└──────────┘     └──────────┘     └──────────┘     └──────────┘
```

Invitațiile includ:
- Roluri pre-asignate
- Grupuri pre-asignate
- Acces la magazine pre-configurat
- Token de expirare (24h default)

### 3.4 Audit Log

Toate acțiunile utilizatorilor sunt loggate:

```typescript
interface AuditLog {
  id: string;
  userId: string;
  action: string;        // "CREATE", "UPDATE", "DELETE"
  entityType: string;    // "Order", "Invoice", "AWB"
  entityId: string;
  changes: JSON;         // Diff-ul modificărilor
  ipAddress: string;
  userAgent: string;
  createdAt: DateTime;
}
```

---

## 4. Modulul de Gestiune Comenzi

### 4.1 Prezentare Generală

Modulul de comenzi este **centrul operațional** al platformei, agregând comenzi din:
- Shopify (multiple magazine)
- Trendyol (multiple magazine)
- Intrare manuală

### 4.2 Modelul de Date - Order

```typescript
interface Order {
  // Identificare
  id: string;
  orderNumber: string;
  shopifyId: string | null;
  trendyolOrderId: string | null;

  // Magazin & Companie
  storeId: string;
  companyId: string;

  // Client
  customerEmail: string;
  customerPhone: string;
  customerName: string;

  // Adresă livrare
  shippingAddress: string;
  shippingCity: string;
  shippingCounty: string;
  shippingPostalCode: string;
  shippingCountry: string;

  // Financiar
  totalPrice: Decimal;
  subtotalPrice: Decimal;
  totalTax: Decimal;
  totalShipping: Decimal;
  totalDiscount: Decimal;
  currency: string;
  paymentMethod: string;

  // Status & Validări
  status: OrderStatus;
  phoneValidation: ValidationStatus;
  addressValidation: ValidationStatus;

  // Operațional
  warehouseId: string;
  requiresTransfer: boolean;

  // Relații
  lineItems: LineItem[];
  invoice: Invoice | null;
  awb: AWB | null;
  tasks: Task[];

  // Timestamps
  orderDate: DateTime;
  createdAt: DateTime;
  updatedAt: DateTime;
}
```

### 4.3 Statusuri Comandă

| Status | Descriere | Acțiune Următoare |
|--------|-----------|-------------------|
| `PENDING` | Comandă nouă, nevalidată | Validare automată |
| `VALIDATED` | Validare reușită | Procesare |
| `VALIDATION_FAILED` | Validare eșuată | Corecție manuală |
| `WAIT_TRANSFER` | Așteaptă transfer depozit | Transfer stoc |
| `INVOICE_PENDING` | În curs de facturare | - |
| `INVOICE_ERROR` | Eroare facturare | Retry/Fix |
| `INVOICED` | Facturată | Creare AWB |
| `PICKING` | În curs de picking | Completare picking |
| `PACKED` | Împachetată | Creare AWB |
| `AWB_PENDING` | AWB în procesare | - |
| `AWB_CREATED` | AWB creat | Predare curier |
| `AWB_ERROR` | Eroare AWB | Retry/Fix |
| `SHIPPED` | Expediată | Tracking |
| `DELIVERED` | Livrată | Arhivare |
| `RETURNED` | Returnată | Procesare retur |
| `CANCELLED` | Anulată | - |

### 4.4 Flow Procesare Comandă

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLOW PROCESARE COMANDĂ                        │
└─────────────────────────────────────────────────────────────────┘

     ┌──────────┐
     │  Sync    │ ◄── Shopify/Trendyol webhook sau cron
     │ Comandă  │
     └────┬─────┘
          │
          ▼
     ┌──────────┐
     │ Validare │ ◄── Telefon (format RO), Adresă
     │Automată  │
     └────┬─────┘
          │
     ┌────┴────┐
     │         │
     ▼         ▼
┌────────┐ ┌────────┐
│VALIDATED│ │FAILED  │──▶ Corecție manuală
└────┬───┘ └────────┘
     │
     ▼
┌──────────┐
│ Check    │ ◄── Verifică stoc în depozitul operațional
│  Stoc    │
└────┬─────┘
     │
┌────┴────┐
│         │
▼         ▼
┌────┐ ┌──────────┐
│ OK │ │WAIT_TRANS│──▶ Transfer inter-depozit
└──┬─┘ └──────────┘
   │
   ▼
┌──────────┐
│ Emitere  │ ◄── Via Oblio API
│ Factură  │
└────┬─────┘
     │
     ▼
┌──────────┐
│ Picking  │ ◄── Listă de picking în depozit
│  List    │
└────┬─────┘
     │
     ▼
┌──────────┐
│ Creare   │ ◄── Via FanCourier API
│   AWB    │
└────┬─────┘
     │
     ▼
┌──────────┐
│ Handover │ ◄── Predare la curier
│          │
└────┬─────┘
     │
     ▼
┌──────────┐
│ Tracking │ ◄── Status updates automate
│          │
└────┬─────┘
     │
     ▼
┌──────────┐
│DELIVERED │
│          │
└──────────┘
```

### 4.5 Validări Automate

#### Validare Telefon (România)
```typescript
// Formate acceptate:
// 07XXXXXXXX, +407XXXXXXXX, 00407XXXXXXXX
// 02XXXXXXXX, 03XXXXXXXX (fix)

function validateRomanianPhone(phone: string): ValidationResult {
  // Normalizare și validare
  // Returnează: VALID, INVALID, sau NEEDS_REVIEW
}
```

#### Validare Adresă
```typescript
function validateAddress(address: ShippingAddress): ValidationResult {
  // Verifică:
  // - Completitudine (toate câmpurile necesare)
  // - Cod poștal valid
  // - Oraș valid în județul specificat
}
```

### 4.6 Funcționalități UI

- **Filtrare avansată**: Status, magazin, dată, metodă plată
- **Căutare**: După număr comandă, email, telefon, nume
- **Acțiuni bulk**: Procesare, export, anulare
- **Vizualizare detalii**: Modal cu toate informațiile
- **Export Excel**: Cu toate câmpurile selectate

---

## 5. Modulul de Facturare

### 5.1 Prezentare Generală

Modulul de facturare gestionează emiterea automată de facturi prin integrarea cu **Oblio** (platformă de facturare românească).

### 5.2 Modelul de Date - Invoice

```typescript
interface Invoice {
  id: string;
  orderId: string;

  // Identificare Oblio
  oblioId: string;
  invoiceNumber: string;
  series: string;

  // Financiar
  totalAmount: Decimal;
  vatAmount: Decimal;
  currency: string;

  // Status
  status: InvoiceStatus;  // DRAFT, ISSUED, CANCELLED, STORNO
  paymentStatus: PaymentStatus;

  // Dată scadență
  issueDate: DateTime;
  dueDate: DateTime;

  // PDF
  pdfUrl: string | null;

  // Timestamps
  createdAt: DateTime;
  updatedAt: DateTime;
}
```

### 5.3 Serii de Facturare

Fiecare companie poate avea multiple serii de facturare:

```typescript
interface InvoiceSeries {
  id: string;
  companyId: string;
  name: string;           // Ex: "FCASH"
  prefix: string;         // Ex: "FCASH"
  currentNumber: number;  // Număr curent
  padding: number;        // Zero-padding (ex: 5 → 00001)
  isDefault: boolean;
}
```

### 5.4 Flow Emitere Factură

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Order   │────▶│ Prepare  │────▶│  Oblio   │────▶│  Store   │
│ Trigger  │     │  Data    │     │   API    │     │ Invoice  │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
                                        │
                                        ▼
                                  ┌──────────┐
                                  │   PDF    │
                                  │ Generate │
                                  └──────────┘
```

### 5.5 Gestionare Erori

Sistemul include retry logic pentru facturi eșuate:

```typescript
interface FailedInvoiceAttempt {
  id: string;
  orderId: string;
  errorMessage: string;
  errorCode: string;
  attemptNumber: number;
  nextRetryAt: DateTime | null;
  resolvedAt: DateTime | null;
}
```

### 5.6 Facturi Intercompany

Pentru configurații multi-companie, sistemul generează automat facturi de decontare:

```
┌──────────────┐                    ┌──────────────┐
│   Compania   │  Factură Decontare │   Compania   │
│   Primară    │◄───────────────────│  Secundară   │
│ (Aquaterra)  │    + Markup %      │              │
└──────────────┘                    └──────────────┘
```

---

## 6. Modulul de Expediere (AWB)

### 6.1 Prezentare Generală

Modulul AWB gestionează crearea și tracking-ul coletelor prin integrarea cu **FanCourier**.

### 6.2 Modelul de Date - AWB

```typescript
interface AWB {
  id: string;
  orderId: string;

  // Identificare FanCourier
  awbNumber: string;

  // Configurare
  serviceType: string;      // "Standard", "Express", etc.
  paymentType: string;      // "Expeditor", "Destinatar"
  weight: Decimal;
  packages: number;

  // Cash on Delivery
  cashOnDelivery: Decimal;

  // Status
  status: AWBStatus;

  // Tracking
  currentLocation: string | null;
  estimatedDelivery: DateTime | null;
  deliveredAt: DateTime | null;

  // Handover
  handoverSessionId: string | null;
  handedOverAt: DateTime | null;

  // Timestamps
  createdAt: DateTime;
  updatedAt: DateTime;
}
```

### 6.3 Statusuri AWB

| Status | Descriere |
|--------|-----------|
| `pending` | AWB creat, nepredat |
| `created` | Creat în sistem FanCourier |
| `handed_over` | Predat curierului |
| `in_transit` | În tranzit |
| `out_for_delivery` | În livrare |
| `delivered` | Livrat |
| `returned` | Returnat |
| `cancelled` | Anulat |

### 6.4 Flow Creare AWB

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Order   │────▶│ Validate │────▶│FanCourier│────▶│  Store   │
│ Invoiced │     │  Data    │     │   API    │     │   AWB    │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
                                        │
                                        ▼
                                  ┌──────────┐
                                  │  Print   │
                                  │  Label   │
                                  └──────────┘
```

### 6.5 Comentarii și Atașamente

Fiecare AWB poate avea comentarii cu imagini atașate:

```typescript
interface AWBComment {
  id: string;
  awbId: string;
  userId: string;
  content: string;
  imageUrl: string | null;
  createdAt: DateTime;
}
```

### 6.6 Tracking Automat

Sistemul sincronizează automat statusurile AWB-urilor prin cron job:

```typescript
// Rulează la fiecare 30 minute
async function syncAWBStatuses() {
  const activeAWBs = await getActiveAWBs();
  for (const awb of activeAWBs) {
    const status = await fanCourier.getStatus(awb.awbNumber);
    await updateAWBStatus(awb.id, status);
  }
}
```

---

## 7. Modulul de Inventar și Stocuri

### 7.1 Prezentare Generală

Modulul de inventar oferă:
- Gestiune stocuri pe multiple depozite
- Mișcări de stoc cu trasabilitate completă
- Transferuri inter-depozite
- Produse compuse (kituri)
- Alerte stoc minim

### 7.2 Modelul de Date - InventoryItem

```typescript
interface InventoryItem {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  description: string;

  // Categorizare
  categoryId: string;
  supplierId: string | null;

  // Financiar
  costPrice: Decimal;
  salePrice: Decimal;

  // Stoc
  totalStock: number;        // Calculat din WarehouseStock
  lowStockThreshold: number;

  // Composite
  isComposite: boolean;
  components: InventoryRecipeComponent[];

  // Status
  isActive: boolean;

  // Timestamps
  createdAt: DateTime;
  updatedAt: DateTime;
}
```

### 7.3 Stocuri pe Depozit

```typescript
interface WarehouseStock {
  id: string;
  warehouseId: string;
  inventoryItemId: string;
  quantity: number;
  location: string;          // Locație fizică în depozit
  lastCountedAt: DateTime;
}
```

### 7.4 Mișcări de Stoc

```typescript
interface InventoryStockMovement {
  id: string;
  inventoryItemId: string;
  warehouseId: string;

  type: StockMovementType;
  // IN - Intrare (recepție, retur)
  // OUT - Ieșire (vânzare, transfer out)
  // ADJUSTMENT - Ajustare inventar
  // TRANSFER - Transfer între depozite
  // RETURN - Retur client

  quantity: number;
  previousQuantity: number;
  newQuantity: number;

  reason: string;
  referenceId: string;       // ID comandă, transfer, etc.
  referenceType: string;

  userId: string;
  createdAt: DateTime;
}
```

### 7.5 Flow Transfer Inter-Depozit

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Create  │────▶│ Reserve  │────▶│ Transit  │────▶│ Receive  │
│ Transfer │     │  Stock   │     │          │     │  Stock   │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
    │                                                    │
    ▼                                                    ▼
┌──────────┐                                      ┌──────────┐
│Source WH │                                      │ Dest WH  │
│  -Qty    │                                      │   +Qty   │
└──────────┘                                      └──────────┘
```

### 7.6 Produse Compuse (Kituri)

```typescript
interface InventoryRecipeComponent {
  id: string;
  parentId: string;         // Produsul compus
  componentId: string;      // Componenta
  quantity: number;         // Cantitate per kit
}

// Exemplu: Kit "Starter Pack"
// - 1x Produs A
// - 2x Produs B
// - 1x Produs C
```

La vânzarea unui kit, sistemul:
1. Verifică stocul tuturor componentelor
2. Scade stocul fiecărei componente
3. Înregistrează mișcările individual

---

## 8. Modulul de Depozite

### 8.1 Prezentare Generală

Modulul de depozite permite configurarea și gestionarea multiplelor locații fizice de stocare.

### 8.2 Modelul de Date - Warehouse

```typescript
interface Warehouse {
  id: string;
  name: string;
  code: string;              // Cod scurt (ex: "WH-BUC")

  // Locație
  address: string;
  city: string;
  county: string;
  postalCode: string;
  country: string;

  // Configurare
  type: WarehouseType;       // PRIMARY, SECONDARY, TRANSIT
  capacity: number | null;

  // Status
  isActive: boolean;
  isDefault: boolean;

  // Timestamps
  createdAt: DateTime;
  updatedAt: DateTime;
}
```

### 8.3 Control Acces Depozit

```typescript
interface UserWarehouseAccess {
  id: string;
  userId: string;
  warehouseId: string;
  accessLevel: string;       // VIEW, OPERATE, MANAGE
}
```

### 8.4 Funcționalități

- **Dashboard per depozit**: Stocuri, mișcări, activitate
- **Locații fizice**: Rafturi, zone, bins
- **Inventariere**: Numărare și reconciliere
- **Rapoarte**: Stocuri, mișcări, performanță

---

## 9. Modulul PIM (Product Information Management)

### 9.1 Prezentare Generală

PIM-ul centralizează toate informațiile despre produse și permite publicarea pe multiple canale.

### 9.2 Modelul de Date - MasterProduct

```typescript
interface MasterProduct {
  id: string;

  // Identificare
  sku: string;
  barcode: string;

  // Informații produs
  title: string;
  description: string;

  // Categorizare
  categoryId: string;

  // Financiar
  price: Decimal;
  costPrice: Decimal;
  compareAtPrice: Decimal | null;

  // Fizic
  weight: Decimal;
  weightUnit: string;

  // Stoc
  stockQuantity: number;

  // Trendyol specific
  trendyolBarcode: string | null;
  trendyolBrandId: string | null;
  trendyolCategoryId: string | null;
  trendyolProductId: string | null;
  trendyolStatus: string | null;
  trendyolAttributes: JSON | null;

  // Imagini
  images: MasterProductImage[];
  googleDriveFolderId: string | null;

  // Canale
  channels: MasterProductChannel[];

  // Composite
  isComposite: boolean;
  recipes: ProductRecipe[];

  // Status
  status: ProductStatus;     // PENDING, APPROVED, REJECTED

  // Timestamps
  createdAt: DateTime;
  updatedAt: DateTime;
}
```

### 9.3 Publicare Multi-Canal

```typescript
interface MasterProductChannel {
  id: string;
  masterProductId: string;
  channelId: string;         // SHOPIFY, TRENDYOL, EMAG, TEMU

  // Override-uri per canal
  titleOverride: string | null;
  descriptionOverride: string | null;
  priceOverride: Decimal | null;

  // Status
  isPublished: boolean;
  publishedAt: DateTime | null;
  externalId: string | null;

  // Sync
  lastSyncAt: DateTime | null;
  syncStatus: string;
}
```

### 9.4 Flow Publicare Produs

```
┌──────────────────────────────────────────────────────────────┐
│                    MASTER PRODUCT                             │
│  SKU: PRD-001 | Title: "Produs X" | Price: 100 RON           │
└──────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
         ▼                    ▼                    ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   SHOPIFY    │    │   TRENDYOL   │    │    EMAG      │
│              │    │              │    │              │
│ Title: orig  │    │ Title: TR    │    │ Title: orig  │
│ Price: 100   │    │ Price: 95    │    │ Price: 105   │
│ Status: Live │    │ Status: Pend │    │ Status: -    │
└──────────────┘    └──────────────┘    └──────────────┘
```

### 9.5 Sincronizare Imagini Google Drive

Sistemul sincronizează automat imaginile din Google Drive:

```
Google Drive Folder
└── products/
    └── PRD-001/
        ├── main.jpg      → Imagine principală
        ├── 01.jpg        → Imagine 1
        ├── 02.jpg        → Imagine 2
        └── 03.jpg        → Imagine 3
```

### 9.6 Sugestii Categorii AI (Trendyol)

Pentru Trendyol, sistemul folosește AI pentru a sugera categoria potrivită:

```typescript
async function suggestTrendyolCategory(product: MasterProduct) {
  const prompt = `
    Analizează produsul: ${product.title}
    Descriere: ${product.description}

    Sugerează categoria Trendyol potrivită din lista...
  `;

  const suggestion = await claude.analyze(prompt);
  return suggestion;
}
```

---

## 10. Modulul de Picking

### 10.1 Prezentare Generală

Modulul de picking optimizează procesul de colectare a produselor din depozit pentru comenzi.

### 10.2 Modelul de Date - PickingList

```typescript
interface PickingList {
  id: string;
  code: string;              // Ex: "PL-2024-0001"
  name: string;

  // Depozit
  warehouseId: string;

  // Status
  status: PickingListStatus;
  // PENDING - Creată, neîncepută
  // IN_PROGRESS - În curs de picking
  // COMPLETED - Finalizată
  // CANCELLED - Anulată

  // Operatori
  createdBy: string;
  startedBy: string | null;
  startedAt: DateTime | null;
  completedBy: string | null;
  completedAt: DateTime | null;

  // Items
  items: PickingListItem[];
  awbs: PickingListAWB[];

  // PDF
  pdfUrl: string | null;

  // Statistici
  totalItems: number;
  pickedItems: number;

  // Timestamps
  createdAt: DateTime;
  updatedAt: DateTime;
}
```

### 10.3 Flow Picking

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Select  │────▶│ Generate │────▶│  Print   │────▶│  Start   │
│  Orders  │     │   List   │     │   PDF    │     │ Picking  │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
                                                        │
                                                        ▼
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ Complete │◄────│  Pack    │◄────│  Scan    │◄────│  Locate  │
│   List   │     │  Items   │     │ Barcode  │     │  Items   │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
```

### 10.4 Picking Log

Toate acțiunile de picking sunt logate:

```typescript
interface PickingLog {
  id: string;
  pickingListId: string;
  userId: string;

  action: PickingLogAction;
  // ITEM_PICKED - Produs scanat/colectat
  // ITEM_UNDO - Anulare picking produs
  // SURPLUS_ATTEMPT - Încercare de picking peste cantitate
  // LIST_STARTED - Listă începută
  // LIST_COMPLETED - Listă finalizată
  // QUANTITY_CHANGED - Cantitate modificată

  itemId: string | null;
  details: JSON;

  createdAt: DateTime;
}
```

### 10.5 Picking cu Barcode Scanner

Interfața suportă scanare barcode:

1. Operator scanează barcode produs
2. Sistemul verifică dacă produsul e în listă
3. Marchează cantitatea ca picked
4. Alertă dacă produsul nu e în listă sau cantitate depășită

---

## 11. Modulul Handover

### 11.1 Prezentare Generală

Modulul Handover gestionează predarea coletelor către curier la sfârșitul zilei.

### 11.2 Modelul de Date - HandoverSession

```typescript
interface HandoverSession {
  id: string;

  // Identificare
  date: DateTime;
  warehouseId: string;

  // Status
  status: HandoverSessionStatus;
  // OPEN - Sesiune activă
  // CLOSED - Sesiune închisă manual
  // AUTO_CLOSED - Închisă automat la miezul nopții

  // Operator
  createdBy: string;
  closedBy: string | null;
  closedAt: DateTime | null;

  // AWB-uri
  awbs: AWB[];

  // Statistici
  totalAwbs: number;
  handedOverAwbs: number;
  notHandedOverAwbs: number;

  // Timestamps
  createdAt: DateTime;
  updatedAt: DateTime;
}
```

### 11.3 Flow Handover

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│   Open   │────▶│  Scan    │────▶│ Confirm  │────▶│  Close   │
│ Session  │     │   AWBs   │     │ Handover │     │ Session  │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
```

### 11.4 Funcționalități

- **Scanare AWB**: Marcare rapidă ca predat
- **Bulk select**: Selectare multiplă pentru predare
- **Not handed over**: Marcare AWB-uri nepredate (cu motiv)
- **Auto-close**: Închidere automată la ora configurată
- **Raport zilnic**: Statistici predare

---

## 12. Integrarea Shopify

### 12.1 Prezentare Generală

Platforma se integrează cu Shopify pentru:
- Sincronizare comenzi
- Gestiune produse
- Actualizare stocuri

### 12.2 Modelul de Date - Store

```typescript
interface Store {
  id: string;
  name: string;
  domain: string;            // mystore.myshopify.com

  // Credențiale
  accessToken: string;

  // Configurare
  companyId: string;
  invoiceSeries: string;
  defaultWarehouseId: string;

  // Status
  isActive: boolean;

  // Sync
  lastSyncAt: DateTime | null;

  // Timestamps
  createdAt: DateTime;
  updatedAt: DateTime;
}
```

### 12.3 Sincronizare Comenzi

```typescript
async function syncShopifyOrders(store: Store) {
  // 1. Fetch orders from Shopify
  const orders = await shopify.getOrders({
    status: 'any',
    created_at_min: lastSyncAt
  });

  // 2. Process each order
  for (const order of orders) {
    // Check if exists
    const existing = await findOrderByShopifyId(order.id);

    if (existing) {
      await updateOrder(existing, order);
    } else {
      await createOrder(store, order);
    }
  }

  // 3. Update lastSyncAt
  await updateStoreLastSync(store.id);
}
```

### 12.4 Webhooks Shopify

Platforma ascultă următoarele webhooks:
- `orders/create` - Comandă nouă
- `orders/updated` - Comandă actualizată
- `orders/cancelled` - Comandă anulată
- `products/update` - Produs actualizat

### 12.5 Push Produse către Shopify

```typescript
async function pushProductToShopify(product: MasterProduct, store: Store) {
  const shopifyProduct = {
    title: product.title,
    body_html: product.description,
    variants: [{
      sku: product.sku,
      price: product.price,
      inventory_quantity: product.stockQuantity
    }],
    images: product.images.map(img => ({ src: img.url }))
  };

  await shopify.createProduct(store, shopifyProduct);
}
```

---

## 13. Integrarea Trendyol

### 13.1 Prezentare Generală

Trendyol este un marketplace turcesc. Integrarea include:
- Sincronizare comenzi
- Publicare produse cu atribute
- Mapping categorii cu AI
- Gestiune branduri

### 13.2 Modelul de Date - TrendyolStore

```typescript
interface TrendyolStore {
  id: string;
  companyId: string;

  // Identificare
  name: string;
  supplierId: string;

  // Credențiale
  apiKey: string;
  apiSecret: string;

  // Configurare
  storeFrontCode: string | null;
  webhookSecret: string | null;

  // Status
  isActive: boolean;

  // Sync
  lastOrderSyncAt: DateTime | null;
  lastProductSyncAt: DateTime | null;

  // Timestamps
  createdAt: DateTime;
  updatedAt: DateTime;
}
```

### 13.3 Sincronizare Comenzi Trendyol

```typescript
async function syncTrendyolOrders(store: TrendyolStore) {
  // 1. Fetch orders from Trendyol
  const orders = await trendyol.getOrders(store, {
    status: ['Created', 'Picking', 'Shipped'],
    startDate: lastSyncAt
  });

  // 2. Process and create local orders
  for (const order of orders) {
    await createOrderFromTrendyol(store, order);
  }
}
```

### 13.4 Publicare Produse pe Trendyol

Trendyol necesită:
- **Brand ID**: Mapare la brand-uri Trendyol
- **Category ID**: Categorie din arborele Trendyol
- **Attributes**: Atribute specifice categoriei (mărime, culoare, etc.)

```typescript
interface TrendyolProductSubmission {
  barcode: string;
  title: string;
  productMainId: string;
  brandId: number;
  categoryId: number;
  quantity: number;
  stockCode: string;
  dimensionalWeight: number;
  description: string;
  currencyType: string;
  listPrice: number;
  salePrice: number;
  vatRate: number;
  cargoCompanyId: number;
  images: { url: string }[];
  attributes: {
    attributeId: number;
    attributeValueId?: number;
    customAttributeValue?: string;
  }[];
}
```

### 13.5 Mapping Produse

```typescript
interface TrendyolProductMapping {
  id: string;
  trendyolStoreId: string;
  trendyolBarcode: string;
  localSku: string;
  mappingType: 'AUTO' | 'MANUAL';
  confidence: number | null;
  createdAt: DateTime;
}
```

### 13.6 AI Category Suggestion

Sistemul folosește Claude AI pentru a sugera categorii Trendyol:

```typescript
async function suggestCategory(product: MasterProduct) {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    messages: [{
      role: 'user',
      content: `
        Analizează produsul și sugerează categoria Trendyol potrivită:

        Titlu: ${product.title}
        Descriere: ${product.description}
        Categorie locală: ${product.category?.name}

        Returnează JSON cu:
        - categoryId: ID-ul categoriei Trendyol
        - categoryPath: Calea completă
        - confidence: 0-100
        - reasoning: Explicație
      `
    }]
  });

  return JSON.parse(response.content);
}
```

---

## 14. Modulul de Advertising (ADS)

### 14.1 Prezentare Generală

Modulul ADS permite monitorizarea și gestionarea campaniilor publicitare pe:
- **Meta (Facebook/Instagram)**
- **TikTok Ads**
- **Google Ads**

### 14.2 Modele de Date

#### AdsAccount
```typescript
interface AdsAccount {
  id: string;
  platform: AdsPlatform;     // META, TIKTOK, GOOGLE
  accountId: string;
  accountName: string;

  // Credențiale
  accessToken: string;
  refreshToken: string | null;
  tokenExpiresAt: DateTime | null;

  // Status
  status: AdsAccountStatus;

  // Timestamps
  createdAt: DateTime;
  updatedAt: DateTime;
}
```

#### AdsCampaign
```typescript
interface AdsCampaign {
  id: string;
  accountId: string;
  externalId: string;

  // Informații
  name: string;
  objective: string;
  status: AdsCampaignStatus;

  // Budget
  dailyBudget: Decimal | null;
  lifetimeBudget: Decimal | null;

  // Metrici
  spend: Decimal;
  impressions: number;
  reach: number;
  clicks: number;
  conversions: number;
  revenue: Decimal;

  // KPIs calculați
  ctr: Decimal;              // Click-through rate
  cpc: Decimal;              // Cost per click
  cpa: Decimal;              // Cost per acquisition
  roas: Decimal;             // Return on ad spend

  // Timestamps
  startDate: DateTime | null;
  endDate: DateTime | null;
  createdAt: DateTime;
  updatedAt: DateTime;
}
```

### 14.3 Conectare Conturi (OAuth)

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Select  │────▶│ Redirect │────▶│  Grant   │────▶│  Store   │
│ Platform │     │ to OAuth │     │  Access  │     │  Tokens  │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
```

### 14.4 Sincronizare Campanii

Sistemul sincronizează periodic campaniile și metricile:

```typescript
async function syncCampaigns(account: AdsAccount) {
  // 1. Fetch campaigns from platform
  const campaigns = await getRemoteCampaigns(account);

  // 2. Sync each campaign
  for (const campaign of campaigns) {
    await upsertCampaign(account, campaign);

    // 3. Fetch and store daily metrics
    const insights = await getCampaignInsights(account, campaign);
    await storeDailyStats(campaign, insights);
  }
}
```

### 14.5 Mapping Campanii-Produse

Sistemul mapează automat campaniile la SKU-uri bazat pe convenții de denumire:

```typescript
// Convenție: Campaign name include SKU
// Ex: "PRD-001 - Promo Vara 2024"

async function mapCampaignToProducts(campaign: AdsCampaign) {
  const skuPattern = /([A-Z]{2,4}-\d{3,6})/g;
  const matches = campaign.name.match(skuPattern);

  for (const sku of matches) {
    await createCampaignProductMapping(campaign.id, sku);
  }
}
```

### 14.6 Alerte Automate

```typescript
interface AdsAlertRule {
  id: string;
  accountId: string | null;  // null = toate conturile

  // Condiție
  metric: string;            // "roas", "cpa", "spend", etc.
  operator: string;          // "lt", "gt", "eq"
  threshold: Decimal;

  // Acțiune
  action: AdsAlertAction;    // NOTIFY, PAUSE, AUTO_ROLLBACK

  // Status
  isActive: boolean;
}

// Exemplu: Alertă când ROAS < 2
{
  metric: "roas",
  operator: "lt",
  threshold: 2.0,
  action: "NOTIFY"
}
```

### 14.7 Dashboard ADS

Funcționalități:
- **Overview**: Spend total, ROAS mediu, conversii
- **Per campanie**: Detalii și trending
- **Comparații**: Perioadă vs perioadă anterioară
- **Alerte active**: Listă alerte nerezolvate
- **AI Insights**: Recomandări optimizare

---

## 15. Modulul AI Insights

### 15.1 Prezentare Generală

Modulul AI folosește Claude (Anthropic) pentru a genera insights și recomandări de business.

### 15.2 Tipuri de Insights

```typescript
enum AIInsightType {
  PRODUCT_PRICE = 'PRODUCT_PRICE',     // Recomandări preț
  PRODUCT_STOCK = 'PRODUCT_STOCK',     // Alertă stoc
  AD_BUDGET = 'AD_BUDGET',             // Optimizare buget
  AD_STATUS = 'AD_STATUS',             // Status campanie
  AD_BID = 'AD_BID',                   // Ajustare bid
  AD_TARGETING = 'AD_TARGETING',       // Optimizare targeting
  GENERAL = 'GENERAL'                  // Insight general
}
```

### 15.3 Modelul de Date - AIInsight

```typescript
interface AIInsight {
  id: string;

  // Tip și sursă
  type: AIInsightType;
  source: string;            // "daily_analysis", "manual", etc.

  // Conținut
  title: string;
  description: string;
  recommendation: string;

  // Entitate referită
  entityType: string | null; // "product", "campaign", etc.
  entityId: string | null;

  // Evaluare
  confidence: number;        // 0-100
  impact: string;            // "LOW", "MEDIUM", "HIGH"

  // Status
  status: AIInsightStatus;
  // PENDING - Neacționat
  // APPLIED - Aplicat
  // DISMISSED - Respins
  // EXPIRED - Expirat

  // Timestamps
  createdAt: DateTime;
  expiresAt: DateTime | null;
}
```

### 15.4 Analiză Zilnică Automată

```typescript
// Cron job zilnic la 06:00
async function runDailyAIAnalysis() {
  // 1. Gather data
  const salesData = await getDailySalesData();
  const inventoryData = await getLowStockItems();
  const adsData = await getAdsPerformance();

  // 2. Prepare prompt
  const prompt = `
    Analizează datele de business și generează insights:

    VÂNZĂRI (ultimele 7 zile):
    ${JSON.stringify(salesData)}

    INVENTAR CRITIC:
    ${JSON.stringify(inventoryData)}

    PERFORMANȚĂ ADS:
    ${JSON.stringify(adsData)}

    Generează maximum 10 insights prioritizate.
  `;

  // 3. Call Claude API
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    messages: [{ role: 'user', content: prompt }]
  });

  // 4. Parse and store insights
  const insights = parseInsights(response.content);
  await storeInsights(insights);
}
```

### 15.5 Action Log

Toate acțiunile pe insights sunt logate:

```typescript
interface AIActionLog {
  id: string;
  insightId: string;
  userId: string;

  action: string;            // "apply", "dismiss", "modify"
  previousValue: JSON | null;
  newValue: JSON | null;

  createdAt: DateTime;
}
```

---

## 16. Suport Multi-Companie

### 16.1 Prezentare Generală

Platforma suportă multiple companii (entități juridice) cu:
- Facturare separată
- Credențiale separate pentru servicii
- Decontare inter-companii

### 16.2 Modelul de Date - Company

```typescript
interface Company {
  id: string;

  // Identificare
  name: string;
  cif: string;               // Cod fiscal
  regCom: string;            // Nr. Registrul Comerțului

  // Adresă
  address: string;
  city: string;
  county: string;
  postalCode: string;
  country: string;

  // Contact
  email: string;
  phone: string;

  // Credențiale Oblio
  oblioEmail: string | null;
  oblioApiKey: string | null;

  // Credențiale FanCourier
  fanCourierClientId: string | null;
  fanCourierUsername: string | null;
  fanCourierPassword: string | null;

  // Configurare
  isPrimary: boolean;
  intercompanyMarkup: Decimal;  // % markup pentru decontare
  defaultVatRate: number;

  // Timestamps
  createdAt: DateTime;
  updatedAt: DateTime;
}
```

### 16.3 Flow Decontare Inter-Companii

```
┌───────────────────────────────────────────────────────────────┐
│                     COMANDĂ CLIENT                             │
│              (facturată de Compania Secundară)                 │
└───────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌───────────────────────────────────────────────────────────────┐
│                  FACTURĂ CĂTRE CLIENT                          │
│              Compania Secundară → Client                       │
│              Valoare: 100 RON                                  │
└───────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌───────────────────────────────────────────────────────────────┐
│              FACTURĂ DECONTARE (automată)                      │
│         Compania Primară → Compania Secundară                  │
│         Valoare: 100 RON + 5% markup = 105 RON                 │
└───────────────────────────────────────────────────────────────┘
```

### 16.4 Facturi Inter-Companii

```typescript
interface IntercompanyInvoice {
  id: string;

  // Părți
  sourceCompanyId: string;   // Compania primară
  targetCompanyId: string;   // Compania secundară

  // Identificare
  invoiceNumber: string;
  series: string;

  // Financiar
  subtotal: Decimal;
  markup: Decimal;
  total: Decimal;
  vatAmount: Decimal;

  // Comenzi incluse
  orders: IntercompanyOrderLink[];

  // Status
  status: string;

  // Timestamps
  periodStart: DateTime;
  periodEnd: DateTime;
  createdAt: DateTime;
}
```

---

## 17. Modulul de Task-uri

### 17.1 Prezentare Generală

Sistemul de task-uri permite crearea și urmărirea sarcinilor interne.

### 17.2 Modelul de Date - Task

```typescript
interface Task {
  id: string;

  // Conținut
  title: string;
  description: string;

  // Clasificare
  type: TaskType;
  // PICKING, VERIFICARE, EXPEDIERE, MEETING,
  // DEADLINE, FOLLOW_UP, BUSINESS, OTHER

  priority: TaskPriority;    // LOW, MEDIUM, HIGH, URGENT

  // Asignare
  assigneeId: string | null;
  createdById: string;

  // Status
  status: TaskStatus;        // PENDING, IN_PROGRESS, COMPLETED, CANCELLED

  // Deadline
  dueDate: DateTime | null;
  completedAt: DateTime | null;

  // Legătură cu entități
  linkedEntityType: string | null;  // "Order", "Product", "Invoice"
  linkedEntityId: string | null;

  // Atașamente
  attachments: TaskAttachment[];

  // Timestamps
  createdAt: DateTime;
  updatedAt: DateTime;
}
```

### 17.3 Funcționalități

- **Creare task**: Din orice pagină cu context
- **Asignare**: Către orice utilizator
- **Notificări**: La asignare și deadline
- **Linking**: Legătură cu comenzi, produse, facturi
- **Atașamente**: Fișiere și imagini
- **Filtrare**: După status, prioritate, asignat

---

## 18. Modulul de Raportare

### 18.1 Dashboard Principal

KPI-uri afișate:
- **Vânzări totale** (zi, săptămână, lună)
- **Număr comenzi**
- **Valoare medie comandă**
- **Rata de conversie**
- **Top produse vândute**
- **Stocuri critice**

### 18.2 Daily Sales Aggregation

```typescript
interface DailySales {
  id: string;
  date: DateTime;

  // Vânzări
  totalSales: Decimal;
  totalOrders: number;
  totalItems: number;

  // Facturare
  totalInvoices: number;
  totalInvoiceValue: Decimal;

  // Expediere
  totalAwbs: number;
  deliveredAwbs: number;
  returnedAwbs: number;

  // Costuri
  totalCosts: Decimal;
  shippingCosts: Decimal;

  // Profit
  grossProfit: Decimal;

  // Per magazin
  storeBreakdown: JSON;
}
```

### 18.3 Activity Log

```typescript
interface ActivityLog {
  id: string;

  // Actor
  userId: string;

  // Acțiune
  action: ActionType;        // CREATE, UPDATE, DELETE, VIEW
  entityType: EntityType;
  entityId: string;

  // Detalii
  description: string;
  changes: JSON | null;      // Diff pentru UPDATE

  // Context
  ipAddress: string;
  userAgent: string;

  // Timestamp
  createdAt: DateTime;
}
```

### 18.4 Export Rapoarte

Formate suportate:
- **Excel** (XLSX) - via ExcelJS
- **CSV**
- **PDF** - pentru liste picking, facturi

---

## 19. Sistemul de Notificări

### 19.1 Tipuri de Notificări

```typescript
enum NotificationType {
  NEW_USER = 'new_user',
  INVITATION_ACCEPTED = 'invitation_accepted',
  PICKING_LIST_CREATED = 'picking_list_created',
  ORDER_PROCESSING_ERROR = 'order_processing_error',
  LOW_STOCK_ALERT = 'low_stock_alert',
  AWB_DELIVERED = 'awb_delivered',
  AWB_RETURNED = 'awb_returned',
  TASK_ASSIGNED = 'task_assigned',
  TASK_DUE = 'task_due',
  AI_INSIGHT = 'ai_insight'
}
```

### 19.2 Modelul de Date - Notification

```typescript
interface Notification {
  id: string;
  userId: string;

  type: NotificationType;
  title: string;
  message: string;

  // Link către entitate
  linkUrl: string | null;

  // Status
  isRead: boolean;
  readAt: DateTime | null;

  // Timestamps
  createdAt: DateTime;
}
```

### 19.3 Delivery Channels

- **In-app**: Indicator în header + pagină notificări
- **Email**: Pentru notificări critice (opțional, configurabil)

---

## 20. Sistemul de Printare

### 20.1 Prezentare Generală

Sistemul suportă printare directă către imprimante locale prin client desktop.

### 20.2 Modelul de Date - Printer

```typescript
interface Printer {
  id: string;

  // Identificare
  name: string;

  // Conectare
  appToken: string;
  printerToken: string;

  // Configurare
  paperSize: string;         // "A4", "A5", "LABEL_100x150"
  outputFormat: string;      // "PDF", "ZPL"

  // Status
  isOnline: boolean;
  lastSeenAt: DateTime | null;
}
```

### 20.3 Print Jobs

```typescript
interface PrintJob {
  id: string;
  printerId: string;

  // Document
  documentType: string;      // "AWB", "INVOICE", "PICKING_LIST"
  documentId: string;
  documentUrl: string;

  // Status
  status: PrintJobStatus;
  // PENDING, PRINTING, COMPLETED, FAILED, CANCELLED

  // Error
  errorMessage: string | null;

  // Timestamps
  createdAt: DateTime;
  completedAt: DateTime | null;
}
```

### 20.4 Flow Printare

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Create  │────▶│  Queue   │────▶│  Client  │────▶│  Print   │
│   Job    │     │   Job    │     │  Polls   │     │ Complete │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
```

---

## 21. Cron Jobs și Automatizări

### 21.1 Lista Cron Jobs

| Job | Frecvență | Descriere |
|-----|-----------|-----------|
| `sync-orders` | La 15 min | Sincronizare comenzi Shopify |
| `trendyol-sync` | La 15 min | Sincronizare comenzi Trendyol |
| `sync-awb` | La 30 min | Actualizare statusuri AWB |
| `handover-finalize` | Zilnic 23:59 | Auto-închidere sesiuni handover |
| `ads-sync` | La 6 ore | Sincronizare campanii ads |
| `ads-alerts` | La 1 oră | Verificare condiții alerte |
| `ai-analysis` | Zilnic 06:00 | Analiză AI zilnică |
| `intercompany-settlement` | Săptămânal | Generare facturi decontare |
| `backup` | Zilnic 03:00 | Backup bază de date |

### 21.2 Implementare Cron

Cron jobs sunt implementate ca API routes apelate de servicii externe (ex: Vercel Cron, Railway Cron):

```typescript
// /api/cron/sync-orders/route.ts
export async function GET(request: Request) {
  // Verificare secret pentru securitate
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Executare sync
  const result = await syncAllStoreOrders();

  return Response.json(result);
}
```

---

## 22. Schema Bazei de Date

### 22.1 Statistici

- **Total modele Prisma**: 91+
- **Total enum-uri**: 30+
- **Relații**: 150+ foreign keys
- **Indecși**: 50+ pentru optimizare

### 22.2 Diagrama Relații Principale

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           SCHEMA SIMPLIFICATĂ                            │
└─────────────────────────────────────────────────────────────────────────┘

                              ┌─────────┐
                              │  User   │
                              └────┬────┘
                                   │
        ┌──────────────────────────┼──────────────────────────┐
        │                          │                          │
        ▼                          ▼                          ▼
   ┌─────────┐              ┌──────────┐              ┌─────────────┐
   │  Role   │              │  Group   │              │  AuditLog   │
   └─────────┘              └──────────┘              └─────────────┘


   ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
   │ Company │────▶│  Store  │────▶│  Order  │────▶│LineItem │
   └─────────┘     └─────────┘     └────┬────┘     └─────────┘
                                        │
                   ┌────────────────────┼────────────────────┐
                   │                    │                    │
                   ▼                    ▼                    ▼
              ┌─────────┐         ┌─────────┐         ┌─────────┐
              │ Invoice │         │   AWB   │         │  Task   │
              └─────────┘         └────┬────┘         └─────────┘
                                       │
                                       ▼
                                ┌──────────────┐
                                │HandoverSession│
                                └──────────────┘


   ┌───────────┐     ┌─────────────────┐     ┌──────────────┐
   │ Warehouse │────▶│ WarehouseStock  │◄────│InventoryItem│
   └───────────┘     └─────────────────┘     └──────────────┘
                                                    │
                                                    ▼
                                             ┌──────────────┐
                                             │MasterProduct │
                                             └──────────────┘


   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
   │TrendyolStore│────▶│TrendyolOrder│────▶│  Order      │
   └─────────────┘     └─────────────┘     └─────────────┘


   ┌──────────┐     ┌─────────────┐     ┌─────────────┐
   │AdsAccount│────▶│ AdsCampaign │────▶│AdsDailyStats│
   └──────────┘     └─────────────┘     └─────────────┘
```

---

## 23. API Endpoints

### 23.1 Statistici API

- **Total endpoints**: 191
- **Module API**: 47

### 23.2 Lista Completă Endpoints

#### Autentificare & Utilizatori
```
POST   /api/auth/signup
POST   /api/auth/[...nextauth]
GET    /api/user
PUT    /api/user
GET    /api/user/list
DELETE /api/user/[id]
```

#### RBAC
```
GET    /api/rbac/permissions
GET    /api/rbac/roles
POST   /api/rbac/roles
PUT    /api/rbac/roles/[id]
DELETE /api/rbac/roles/[id]
GET    /api/rbac/groups
POST   /api/rbac/groups
PUT    /api/rbac/groups/[id]
DELETE /api/rbac/groups/[id]
POST   /api/rbac/users/[id]/roles
POST   /api/rbac/users/[id]/groups
```

#### Comenzi
```
GET    /api/orders
GET    /api/orders/[id]
PUT    /api/orders/[id]
DELETE /api/orders/[id]
POST   /api/orders/process
POST   /api/orders/process-all
GET    /api/orders/[id]/activity
GET    /api/orders/[id]/check-transfer
POST   /api/orders/check-transfers
GET    /api/orders/export
```

#### Facturi
```
GET    /api/invoices
GET    /api/invoices/[id]
POST   /api/invoices
POST   /api/invoices/bulk
GET    /api/invoices/[id]/pdf
DELETE /api/invoices/[id]
```

#### AWB
```
GET    /api/awb
GET    /api/awb/[id]
POST   /api/awb
POST   /api/awb/bulk
DELETE /api/awb/[id]
GET    /api/awb/[id]/track
POST   /api/awb/[id]/comments
GET    /api/awb/[id]/comments
```

#### Picking
```
GET    /api/picking
GET    /api/picking/[id]
POST   /api/picking
PUT    /api/picking/[id]
POST   /api/picking/[id]/start
POST   /api/picking/[id]/complete
POST   /api/picking/[id]/items/[itemId]/pick
GET    /api/picking/[id]/pdf
```

#### Handover
```
GET    /api/handover
GET    /api/handover/[id]
POST   /api/handover
PUT    /api/handover/[id]
POST   /api/handover/[id]/scan
POST   /api/handover/[id]/close
```

#### Produse
```
GET    /api/products
GET    /api/products/[id]
POST   /api/products
PUT    /api/products/[id]
DELETE /api/products/[id]
POST   /api/products/[id]/publish
POST   /api/products/bulk-publish
GET    /api/products/[id]/images
POST   /api/products/[id]/images/sync
```

#### Inventar
```
GET    /api/inventory-items
GET    /api/inventory-items/[id]
POST   /api/inventory-items
PUT    /api/inventory-items/[id]
DELETE /api/inventory-items/[id]
POST   /api/inventory-items/[id]/adjust
GET    /api/inventory-items/[id]/movements
GET    /api/inventory-items/export
```

#### Depozite
```
GET    /api/warehouses
GET    /api/warehouses/[id]
POST   /api/warehouses
PUT    /api/warehouses/[id]
DELETE /api/warehouses/[id]
GET    /api/warehouses/[id]/stock
POST   /api/warehouses/transfers
GET    /api/warehouses/transfers/[id]
PUT    /api/warehouses/transfers/[id]
```

#### Magazine
```
GET    /api/stores
GET    /api/stores/[id]
POST   /api/stores
PUT    /api/stores/[id]
DELETE /api/stores/[id]
POST   /api/stores/[id]/test
```

#### Trendyol
```
GET    /api/trendyol
POST   /api/trendyol
GET    /api/trendyol/orders
GET    /api/trendyol/stores
POST   /api/trendyol/stores
GET    /api/trendyol/stores/[id]
PUT    /api/trendyol/stores/[id]
POST   /api/trendyol/stores/[id]/test
GET    /api/trendyol/attributes
POST   /api/trendyol/category-suggest
POST   /api/trendyol/mapping
GET    /api/trendyol/batch-status
POST   /api/trendyol/webhook/[storeId]
```

#### Advertising
```
GET    /api/ads/accounts
POST   /api/ads/accounts
GET    /api/ads/accounts/[id]
DELETE /api/ads/accounts/[id]
POST   /api/ads/accounts/[id]/sync
GET    /api/ads/campaigns
GET    /api/ads/campaigns/[id]
GET    /api/ads/campaigns/[id]/insights
POST   /api/ads/campaigns/refresh
GET    /api/ads/alerts
POST   /api/ads/alerts/rules
PUT    /api/ads/alerts/rules/[id]
DELETE /api/ads/alerts/rules/[id]
PUT    /api/ads/alerts/[id]
GET    /api/ads/settings
PUT    /api/ads/settings
```

#### AI
```
GET    /api/ai/insights
POST   /api/ai/insights/[id]/apply
POST   /api/ai/insights/[id]/dismiss
POST   /api/ai/analyze
GET    /api/ai/runs
```

#### Companii
```
GET    /api/companies
GET    /api/companies/[id]
POST   /api/companies
PUT    /api/companies/[id]
DELETE /api/companies/[id]
GET    /api/intercompany/invoices
POST   /api/intercompany/generate
```

#### Setări
```
GET    /api/settings
PUT    /api/settings
POST   /api/settings/test-oblio
POST   /api/settings/test-fancourier
POST   /api/settings/test-drive
```

#### Sync & Cron
```
POST   /api/sync
GET    /api/sync/history
GET    /api/cron/sync-orders
GET    /api/cron/sync-awb
GET    /api/cron/trendyol-sync
GET    /api/cron/handover-finalize
GET    /api/cron/ads-sync
GET    /api/cron/ads-alerts
GET    /api/cron/ai-analysis
GET    /api/cron/intercompany-settlement
GET    /api/cron/backup
```

#### Utilitare
```
GET    /api/health
POST   /api/upload
GET    /api/notifications
PUT    /api/notifications/[id]
GET    /api/activity
GET    /api/stats
GET    /api/processing-errors
POST   /api/processing-errors/[id]/retry
POST   /api/processing-errors/[id]/skip
```

---

## 24. Fluxuri End-to-End

### 24.1 Flow Complet: Comandă Nouă → Livrare

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    FLOW COMPLET PROCESARE COMANDĂ                        │
└─────────────────────────────────────────────────────────────────────────┘

[1] PRIMIRE COMANDĂ
    │
    ├── Shopify Webhook (orders/create)
    │   └── POST /api/webhooks/shopify
    │
    └── Trendyol Sync (cron)
        └── GET /api/cron/trendyol-sync
    │
    ▼
[2] CREARE ORDER LOCAL
    │
    ├── Parsare date comandă
    ├── Identificare magazin și companie
    ├── Creare înregistrare Order + LineItems
    └── Status: PENDING
    │
    ▼
[3] VALIDARE AUTOMATĂ
    │
    ├── Validare telefon (format românesc)
    ├── Validare adresă (completitudine)
    │
    ├── Toate OK → Status: VALIDATED
    └── Erori → Status: VALIDATION_FAILED
              └── Necesită intervenție manuală
    │
    ▼
[4] VERIFICARE STOC
    │
    ├── Verificare stoc în depozitul operațional
    │
    ├── Stoc disponibil → Continuă
    └── Stoc insuficient → Status: WAIT_TRANSFER
                        └── Creare transfer inter-depozit
    │
    ▼
[5] EMITERE FACTURĂ
    │
    ├── Pregătire date factură
    ├── Apel Oblio API
    │
    ├── Succes → Status: INVOICED
    │          └── Salvare PDF și număr factură
    │
    └── Eroare → Status: INVOICE_ERROR
              └── Creare FailedInvoiceAttempt
              └── Retry automat sau manual
    │
    ▼
[6] ADĂUGARE LA PICKING LIST
    │
    ├── Grupare comenzi pe depozit
    ├── Creare/extindere PickingList
    └── Status: PICKING
    │
    ▼
[7] PROCESARE PICKING (în depozit)
    │
    ├── Operator deschide lista
    ├── Scanare produse cu barcode
    ├── Marcare cantități colectate
    └── Finalizare picking → Status: PACKED
    │
    ▼
[8] CREARE AWB
    │
    ├── Pregătire date expediere
    ├── Apel FanCourier API
    │
    ├── Succes → Status: AWB_CREATED
    │          └── Printare etichetă
    │
    └── Eroare → Status: AWB_ERROR
              └── Retry manual
    │
    ▼
[9] HANDOVER CURIER
    │
    ├── Deschidere sesiune handover (dacă nu există)
    ├── Scanare AWB pentru predare
    └── Marcare ca predat → awb.handedOverAt
    │
    ▼
[10] TRACKING & LIVRARE
    │
    ├── Sync periodic status FanCourier
    ├── Actualizare AWBStatusHistory
    │
    ├── Livrat → Status: DELIVERED
    │          └── awb.deliveredAt
    │
    └── Returnat → Status: RETURNED
               └── Creare ReturnAWB
               └── Procesare retur stoc

┌─────────────────────────────────────────────────────────────────────────┐
│                              FINALIZAT                                   │
└─────────────────────────────────────────────────────────────────────────┘
```

### 24.2 Flow: Publicare Produs pe Trendyol

```
[1] PREGĂTIRE PRODUS
    │
    ├── Creare/editare MasterProduct
    ├── Upload imagini în Google Drive
    └── Sync imagini → MasterProductImage
    │
    ▼
[2] CONFIGURARE TRENDYOL
    │
    ├── Selectare magazin Trendyol
    ├── AI Category Suggestion
    │   └── POST /api/trendyol/category-suggest
    ├── Selectare/confirmare categorie
    ├── Completare atribute obligatorii
    └── Selectare brand
    │
    ▼
[3] SUBMIT PRODUS
    │
    ├── Construire payload Trendyol
    ├── Apel Trendyol Products API
    └── Creare batch job
    │
    ▼
[4] MONITORIZARE STATUS
    │
    ├── Poll batch status
    │   └── GET /api/trendyol/batch-status
    │
    ├── APPROVED → Produs live
    │            └── Salvare trendyolProductId
    │
    └── REJECTED → Afișare erori
               └── Corecție și resubmit
```

### 24.3 Flow: Decontare Inter-Companii

```
[1] TRIGGER (săptămânal sau manual)
    │
    └── GET /api/cron/intercompany-settlement
    │
    ▼
[2] COLECTARE DATE
    │
    ├── Identificare companii secundare
    ├── Colectare comenzi facturate în perioadă
    └── Grupare pe companie secundară
    │
    ▼
[3] CALCUL DECONTARE
    │
    ├── Pentru fiecare companie secundară:
    │   ├── Sum(valoare comenzi)
    │   ├── Aplicare markup %
    │   └── Calcul TVA
    │
    ▼
[4] EMITERE FACTURI
    │
    ├── Generare factură prin Oblio
    │   (Compania Primară → Compania Secundară)
    ├── Creare IntercompanyInvoice
    └── Link comenzi → IntercompanyOrderLink
    │
    ▼
[5] NOTIFICARE
    │
    └── Email către compania secundară
```

### 24.4 Flow: Alertă ADS și Auto-Rollback

```
[1] CHECK PERIODIC (cron hourly)
    │
    └── GET /api/cron/ads-alerts
    │
    ▼
[2] EVALUARE REGULI
    │
    ├── Pentru fiecare AdsAlertRule activ:
    │   ├── Fetch metrici curente
    │   ├── Evaluare condiție (metric operator threshold)
    │   │
    │   ├── Condiție FALSE → Skip
    │   └── Condiție TRUE → Trigger alertă
    │
    ▼
[3] ACȚIUNE ALERTĂ
    │
    ├── action = NOTIFY
    │   └── Creare AdsAlert + Notificare
    │
    ├── action = PAUSE
    │   └── Apel API platformă pentru pause
    │
    └── action = AUTO_ROLLBACK
        ├── Salvare stare curentă
        ├── Revert la starea anterioară
        └── Creare alert cu detalii rollback
    │
    ▼
[4] REZOLVARE (manuală)
    │
    ├── Review alertă în dashboard
    ├── Analiză cauză
    └── Mark as RESOLVED sau DISMISSED
```

---

## Anexe

### A. Variabile de Mediu Necesare

```env
# Database
DATABASE_URL="postgresql://user:pass@host:5432/db"

# NextAuth
NEXTAUTH_SECRET="your-secret"
NEXTAUTH_URL="https://your-domain.com"

# Shopify
SHOPIFY_API_KEY="..."
SHOPIFY_API_SECRET="..."

# Oblio
OBLIO_EMAIL="..."
OBLIO_API_KEY="..."

# FanCourier
FANCOURIER_CLIENT_ID="..."
FANCOURIER_USERNAME="..."
FANCOURIER_PASSWORD="..."

# Trendyol
TRENDYOL_API_BASE_URL="https://api.trendyol.com"

# Google
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
GOOGLE_DRIVE_FOLDER_ID="..."

# Meta Ads
META_APP_ID="..."
META_APP_SECRET="..."

# TikTok Ads
TIKTOK_APP_ID="..."
TIKTOK_APP_SECRET="..."

# Anthropic AI
ANTHROPIC_API_KEY="..."

# Cron Security
CRON_SECRET="..."
```

### B. Comenzi Utile

```bash
# Dezvoltare
npm run dev

# Build producție
npm run build

# Migrare bază de date
npm run db:migrate

# Push schema (fără migrare)
npm run db:push

# Vizualizare DB
npm run db:studio

# Seed date test
npm run db:seed

# Rulare teste
npm test

# Lint
npm run lint
```

### C. Tehnologii și Licențe

| Tehnologie | Licență |
|------------|---------|
| Next.js | MIT |
| React | MIT |
| Prisma | Apache 2.0 |
| TailwindCSS | MIT |
| Radix UI | MIT |
| NextAuth.js | ISC |
| Recharts | MIT |

---

**Document generat automat**
**Ultima actualizare:** Februarie 2026
**Versiune platformă:** 1.0.0
