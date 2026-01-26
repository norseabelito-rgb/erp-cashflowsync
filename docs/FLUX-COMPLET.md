# ERP CashflowSync - Documentatie Flux Complet

## Cuprins
1. [Arhitectura Generala](#1-arhitectura-generala)
2. [Fluxul Principal al Comenzilor](#2-fluxul-principal-al-comenzilor)
3. [Modulul Orders (Comenzi)](#3-modulul-orders-comenzi)
4. [Modulul Invoices (Facturi)](#4-modulul-invoices-facturi)
5. [Modulul AWB (Expediere)](#5-modulul-awb-expediere)
6. [Modulul Picking (Pregatire Comenzi)](#6-modulul-picking-pregatire-comenzi)
7. [Modulul Handover (Predare Curier)](#7-modulul-handover-predare-curier)
8. [Modulul Products (Produse)](#8-modulul-products-produse)
9. [Modulul Inventory (Stocuri)](#9-modulul-inventory-stocuri)
10. [Modulul Ads (Publicitate)](#10-modulul-ads-publicitate)
11. [Modulul Trendyol (Marketplace)](#11-modulul-trendyol-marketplace)
12. [Modulul Intercompany (Multi-Companie)](#12-modulul-intercompany-multi-companie)
13. [Modulul RBAC (Utilizatori si Permisiuni)](#13-modulul-rbac-utilizatori-si-permisiuni)
14. [Integrari Externe](#14-integrari-externe)
15. [Cron Jobs (Taskuri Automate)](#15-cron-jobs-taskuri-automate)
16. [Schema Bazei de Date](#16-schema-bazei-de-date)

---

## 1. Arhitectura Generala

### Stack Tehnologic
```
Frontend: Next.js 14 + React 18 + TypeScript + Tailwind CSS + Radix UI
Backend:  Next.js API Routes + Prisma ORM
Database: PostgreSQL 14+
Auth:     NextAuth.js (Email/Password + Google OAuth)
```

### Arhitectura pe Straturi
```
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND (Next.js App Router)               │
│   Dashboard | Orders | Invoices | AWB | Picking | Products      │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                     API Routes (REST)                           │
│   /api/orders | /api/invoices | /api/awb | /api/products        │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                     Service Layer                               │
│   invoice-service | awb-service | sync-service | stock          │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                     Database (Prisma ORM)                       │
│                        PostgreSQL                               │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                   Integrari Externe                             │
│   Shopify | Oblio | FanCourier | Meta Ads | TikTok | Trendyol   │
└─────────────────────────────────────────────────────────────────┘
```

### Structura Proiect
```
/erp-cashflowsync/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (dashboard)/        # Pagini protejate
│   │   │   ├── orders/         # Comenzi
│   │   │   ├── invoices/       # Facturi
│   │   │   ├── awb/            # Expedieri
│   │   │   ├── products/       # Produse
│   │   │   ├── inventory/      # Stocuri
│   │   │   ├── picking/        # Picking lists
│   │   │   ├── handover/       # Predare curier
│   │   │   ├── ads/            # Publicitate
│   │   │   ├── trendyol/       # Marketplace
│   │   │   ├── settings/       # Setari
│   │   │   └── dashboard/      # Analytics
│   │   └── api/                # REST API
│   │
│   ├── components/             # Componente React
│   │   ├── ui/                 # Componente de baza
│   │   └── layout/             # Layout components
│   │
│   └── lib/                    # Servicii si utilitare
│       ├── auth.ts             # Autentificare
│       ├── db.ts               # Prisma client
│       ├── oblio.ts            # Client Oblio API
│       ├── fancourier.ts       # Client FanCourier
│       ├── invoice-service.ts  # Serviciu facturare
│       ├── awb-service.ts      # Serviciu expediere
│       └── ...
│
└── prisma/
    └── schema.prisma           # Schema DB (65+ modele)
```

---

## 2. Fluxul Principal al Comenzilor

### Diagrama Flux Complet
```
┌──────────────┐
│   SHOPIFY    │ ─────── Webhook/Sync ───────▶ ┌──────────────┐
│   STORE      │                               │   COMANDA    │
└──────────────┘                               │   PENDING    │
                                               └──────┬───────┘
                                                      │
                                                      ▼
                                               ┌──────────────┐
                                               │  VALIDARE    │
                                               │ Telefon/Adresa│
                                               └──────┬───────┘
                                                      │
                                                      ▼
                                               ┌──────────────┐
                                               │  VALIDATED   │
                                               └──────┬───────┘
                                                      │
                                                      ▼
                         ┌──────────────┐      ┌──────────────┐
                         │    OBLIO     │◀─────│ EMITERE      │
                         │   (Factura)  │      │ FACTURA      │
                         └──────────────┘      └──────┬───────┘
                                                      │
                                                      ▼
                                               ┌──────────────┐
                                               │  INVOICED    │
                                               └──────┬───────┘
                                                      │
                                                      ▼
                         ┌──────────────┐      ┌──────────────┐
                         │  FANCOURIER  │◀─────│  CREARE AWB  │
                         │    (AWB)     │      │              │
                         └──────────────┘      └──────┬───────┘
                                                      │
                                                      ▼
                                               ┌──────────────┐
                                               │ AWB_CREATED  │
                                               └──────┬───────┘
                                                      │
                                                      ▼
                                               ┌──────────────┐
                                               │   PICKING    │
                                               │ (Pregatire)  │
                                               └──────┬───────┘
                                                      │
                                                      ▼
                                               ┌──────────────┐
                                               │  HANDOVER    │
                                               │(Predare curier)│
                                               └──────┬───────┘
                                                      │
                                                      ▼
                                               ┌──────────────┐
                                               │   SHIPPED    │
                                               └──────┬───────┘
                                                      │
                                                      ▼ (Auto via Cron)
                                               ┌──────────────┐
                                               │  DELIVERED   │
                                               └──────────────┘
```

### Statusuri Comanda
```
PENDING          → Comanda noua, nevalidata
VALIDATED        → Telefon si adresa validate
INVOICE_PENDING  → In curs de facturare
INVOICED         → Factura emisa
PICKING          → In pregatire
PACKED           → Pregatita pentru expediere
AWB_PENDING      → In curs de creare AWB
AWB_CREATED      → AWB creat
SHIPPED          → Predata la curier
DELIVERED        → Livrata
CANCELLED        → Anulata
RETURNED         → Returnata
```

---

## 3. Modulul Orders (Comenzi)

### Pagini Frontend
- `/orders` - Lista comenzi cu filtre si cautare
- `/orders/[id]` - Detalii comanda

### Endpoint-uri API
```
GET    /api/orders              # Lista comenzi (paginata, filtrabila)
GET    /api/orders/[id]         # Detalii comanda
POST   /api/orders/process      # Proceseaza comanda singura
POST   /api/orders/process-all  # Proceseaza toate comenzile
GET    /api/orders/[id]/activity # Log activitate
GET    /api/orders/export       # Export Excel
```

### Parametri Query (GET /api/orders)
```
status       - Filtru dupa status
storeId      - Filtru dupa magazin
search       - Cautare (nume, email, nr comanda)
startDate    - Data inceput
endDate      - Data sfarsit
containsSku  - Contine SKU specific
hasAwb       - Are/nu are AWB
page         - Pagina curenta
limit        - Limite per pagina
```

### Flux Procesare Comanda
```
1. Primire comanda din Shopify (webhook sau sync manual)
2. Creare inregistrare Order in DB
3. Validare telefon si adresa
4. Actualizare status: VALIDATED
5. Emitere factura → INVOICED
6. Creare AWB → AWB_CREATED
7. Picking → SHIPPED
8. Tracking automat → DELIVERED
```

### Model Date Order
```typescript
Order {
  id: string
  shopifyOrderId: string
  orderNumber: string
  email: string
  phone: string
  customerName: string
  shippingAddress: JSON
  billingAddress: JSON
  totalPrice: Decimal
  currency: string
  status: OrderStatus
  validationStatus: ValidationStatus
  lineItems: LineItem[]
  invoice?: Invoice
  awb?: AWB
  storeId: string
  companyId: string
  createdAt: DateTime
  updatedAt: DateTime
}
```

---

## 4. Modulul Invoices (Facturi)

### Pagini Frontend
- `/invoices` - Lista facturi
- `/invoices/failed` - Facturi esuate (retry)

### Endpoint-uri API
```
GET    /api/invoices            # Lista facturi
GET    /api/invoices/[id]       # Detalii factura
POST   /api/invoices/issue      # Emite facturi pentru comenzi
GET    /api/invoices/failed     # Lista tentative esuate
POST   /api/invoices/[id]/cancel # Anuleaza factura
POST   /api/invoices/[id]/pay   # Marcheaza platita
```

### Flux Emitere Factura
```
┌─────────────────────────────────────────────────────────────────┐
│                    issueInvoiceForOrder(orderId)                │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  1. Verificare prerequisite (comanda validata, fara factura)    │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. Obtine Company + InvoiceSeries                              │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. Incrementeaza numar factura (atomic)                        │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. Construieste payload Oblio (client, produse, TVA)           │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. Apel API Oblio                                              │
├─────────────────────────────────────────────────────────────────┤
│  SUCCESS                              │  FAILURE                │
│    ↓                                  │    ↓                    │
│  Salveaza Invoice in DB               │  Salveaza in            │
│  Log activitate                       │  FailedInvoiceAttempt   │
│  Actualizeaza status comanda          │  (pentru retry)         │
└─────────────────────────────────────────────────────────────────┘
```

### Integrare Oblio
```typescript
// Client Oblio (src/lib/oblio.ts)
OblioInvoiceData {
  cif: string               // CUI companie
  seriesName: string        // Serie factura (ex: "SP")
  client: {
    name: string            // Nume client
    cif?: string            // CUI client (optional)
    rc?: string             // Nr. Reg. Com.
    address: string
    city: string
    state: string           // Judet
    country: string
  }
  products: [{
    name: string
    code: string            // SKU
    quantity: number
    price: number           // Pret fara TVA
    vatName: string         // "Normala", "Redusa", "SDD"
  }]
  issueDate: string
  dueDate: string
  language: "RO" | "EN"
  currency: "RON" | "EUR"
  sendEInvoice?: boolean    // Trimite la SPV
}
```

### Model Date Invoice
```typescript
Invoice {
  id: string
  invoiceNumber: string     // Ex: "SP0001234"
  seriesName: string
  oblioId: string           // ID returnat de Oblio
  totalAmount: Decimal
  currency: string
  status: InvoiceStatus     // ISSUED, PAID, CANCELLED
  pdfUrl?: string
  orderId: string
  companyId: string
  issuedAt: DateTime
}
```

---

## 5. Modulul AWB (Expediere)

### Pagini Frontend
- `/awb` - Lista AWB-uri
- `/awb/[id]` - Detalii AWB
- `/tracking` - Tracking status

### Endpoint-uri API
```
GET    /api/awb                 # Lista AWB-uri
GET    /api/awb/[id]            # Detalii AWB
POST   /api/awb/create          # Creeaza AWB din comanda
GET    /api/awb/refresh         # Actualizeaza status (FanCourier)
POST   /api/awb/[id]/comments   # Adauga comentarii
GET    /api/awb/[id]/label      # Descarca eticheta PDF
```

### Flux Creare AWB
```
┌─────────────────────────────────────────────────────────────────┐
│                    createAWBForOrder(orderId)                   │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  1. Obtine comanda cu relatii (Order + Company)                 │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. Row-level lock pentru prevenire duplicate                   │
│     SELECT ... FOR UPDATE                                       │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. Creeaza client FanCourier cu credentiale companie           │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. Apel API FanCourier - generare AWB                          │
│     - Tip serviciu (Standard/Express)                           │
│     - Ramburs (COD)                                             │
│     - Greutate, dimensiuni                                      │
│     - Observatii                                                │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. Salveaza AWB in DB + Genereaza eticheta PDF                 │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  6. Actualizeaza status comanda: AWB_CREATED                    │
└─────────────────────────────────────────────────────────────────┘
```

### Integrare FanCourier
```typescript
// Client FanCourier (src/lib/fancourier.ts)
FanCourierAWBData {
  awbNumber: string
  serviceType: "Standard" | "Express" | "Collector"
  recipient: {
    name: string
    phone: string
    address: string
    city: string
    county: string
    postalCode: string
  }
  parcel: {
    weight: number
    width?: number
    height?: number
    length?: number
  }
  payment: {
    cashOnDelivery: number      // Ramburs
    declaredValue: number       // Valoare declarata
  }
  observations?: string
}
```

### Statusuri AWB FanCourier
```
C0 - Acceptat
S2 - In tranzit
H4 - Livrat
R1 - Returnat
```

### Model Date AWB
```typescript
AWB {
  id: string
  awbNumber: string
  status: AWBStatus
  trackingUrl: string
  labelPdf?: Buffer
  estimatedDelivery?: DateTime
  deliveredAt?: DateTime
  orderId: string
  companyId: string
  handoverSessionId?: string
  statusHistory: AWBStatusHistory[]
  comments: AWBComment[]
  createdAt: DateTime
}
```

---

## 6. Modulul Picking (Pregatire Comenzi)

### Pagini Frontend
- `/picking` - Lista picking lists
- `/picking/[id]` - Detalii picking list
- `/picking/aggregate` - Agregare produse

### Endpoint-uri API
```
GET    /api/picking             # Lista picking lists
POST   /api/picking/create      # Creeaza picking list
GET    /api/picking/[id]        # Detalii picking list
PUT    /api/picking/[id]        # Actualizeaza picking
POST   /api/picking/[id]/print  # Printeaza etichete
GET    /api/picking/logs        # Log activitate picking
POST   /api/picking/aggregate   # Agregheaza comenzi
```

### Flux Picking
```
┌─────────────────────────────────────────────────────────────────┐
│              Selecteaza comenzi pentru picking                   │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              Creeaza Picking List                                │
│  - Grupeaza produse pe locatii                                  │
│  - Calculeaza cantitati totale                                  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              Printeaza Lista de Picking                          │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              Picking Manual                                      │
│  - Scaneaza produse                                             │
│  - Verifica cantitati                                           │
│  - Marcheaza ca preluate                                        │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              Impachetare + Etichetare                            │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              Gata pentru Handover                                │
└─────────────────────────────────────────────────────────────────┘
```

### Model Date PickingList
```typescript
PickingList {
  id: string
  status: PickingStatus       // PENDING, IN_PROGRESS, COMPLETED
  items: PickingListItem[]
  awbs: PickingListAWB[]
  warehouseId: string
  createdById: string
  completedAt?: DateTime
  createdAt: DateTime
}

PickingListItem {
  id: string
  productSku: string
  productName: string
  quantity: number
  pickedQuantity: number
  location?: string
  pickingListId: string
}
```

---

## 7. Modulul Handover (Predare Curier)

### Pagini Frontend
- `/handover` - Sesiune handover zilnica
- `/handover/report` - Raport predari
- `/handover/not-handed` - AWB-uri nepredate

### Endpoint-uri API
```
GET    /api/handover/today      # Sesiunea de azi
POST   /api/handover/scan       # Scaneaza AWB
GET    /api/handover/report     # Raport handover
POST   /api/handover/report/export # Export raport
POST   /api/handover/finalize   # Finalizeaza sesiune
POST   /api/handover/reopen     # Redeschide sesiune
GET    /api/handover/not-handed # AWB-uri nepredate
GET    /api/handover/c0-alerts  # Alerte status C0
```

### Flux Handover
```
┌─────────────────────────────────────────────────────────────────┐
│              Deschide Sesiune Handover (automata)                │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              Scaneaza AWB-uri                                    │
│  - Barcode scanner / manual                                     │
│  - Verifica status valid                                        │
│  - Marcheaza ca predat                                          │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              Genereaza Manifest                                  │
│  - Lista AWB-uri predate                                        │
│  - Semnatura curier                                             │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              Finalizeaza Sesiune                                 │
│  - Calculeaza statistici                                        │
│  - Actualizeaza status comenzi: SHIPPED                         │
└─────────────────────────────────────────────────────────────────┘
```

### Model Date HandoverSession
```typescript
HandoverSession {
  id: string
  date: DateTime
  status: HandoverSessionStatus  // OPEN, CLOSED
  awbs: AWB[]
  totalAwbs: number
  totalValue: Decimal
  warehouseId: string
  closedAt?: DateTime
  closedById?: string
  createdAt: DateTime
}
```

---

## 8. Modulul Products (Produse)

### Pagini Frontend
- `/products` - Catalog produse
- `/products/[id]` - Detalii produs
- `/products/recipes` - Retete produse compuse
- `/products/import` - Import Excel

### Endpoint-uri API
```
GET    /api/products                    # Lista produse
GET    /api/products/[id]               # Detalii produs
POST   /api/products                    # Creeaza produs
PUT    /api/products/[id]               # Actualizeaza produs
DELETE /api/products/[id]               # Sterge produs
POST   /api/products/import             # Import din Excel
GET    /api/products/export             # Export in Excel
POST   /api/products/sync-stock         # Sincronizeaza stoc
POST   /api/products/sync-images        # Sincronizeaza imagini
POST   /api/products/sync-shopify       # Sincronizeaza cu Shopify
POST   /api/products/bulk               # Operatii bulk
GET    /api/products/inventory-mapping  # Mapare SKU-uri
POST   /api/products/recipes            # Gestionare retete
POST   /api/products/[id]/channels      # Asignare canale
```

### Tipuri Produse
```
1. Produse Simple
   - Stoc direct (1 SKU = 1 produs)

2. Produse Compuse (Composite)
   - Formate din componente (ProductComponent)
   - Stoc calculat din componente

3. Produse cu Reteta (Recipe)
   - Formate din materii prime (InventoryItem)
   - Stoc calculat din ingrediente
```

### Model Date Product
```typescript
MasterProduct {
  id: string
  name: string
  description: string
  images: MasterProductImage[]
  channels: MasterProductChannel[]
  variants: Product[]
  category?: Category
  createdAt: DateTime
}

Product {
  id: string
  sku: string
  barcode?: string
  name: string
  price: Decimal
  compareAtPrice?: Decimal
  weight?: number
  stockQuantity: number
  lowStockThreshold?: number
  isComposite: boolean
  components?: ProductComponent[]
  masterProductId: string
  warehouseStock: WarehouseStock[]
}

ProductComponent {
  id: string
  compositeProductId: string
  componentProductId: string
  quantity: number
}
```

---

## 9. Modulul Inventory (Stocuri)

### Pagini Frontend
- `/inventory` - Stocuri pe depozit
- `/inventory/movements` - Miscari stoc
- `/inventory/receipts` - NIR-uri
- `/inventory/transfers` - Transferuri inter-depozit
- `/inventory/suppliers` - Furnizori

### Endpoint-uri API
```
GET    /api/inventory-items                    # Lista articole
POST   /api/inventory-items                    # Creeaza articol
GET    /api/inventory-items/[id]               # Detalii articol
PUT    /api/inventory-items/[id]               # Actualizeaza articol
DELETE /api/inventory-items/[id]               # Sterge articol
GET    /api/inventory-items/[id]/warehouse-stock  # Stoc pe depozit
POST   /api/inventory-items/stock-adjustment   # Ajustare stoc
GET    /api/inventory-items/stock-check        # Verificare disponibilitate
GET    /api/inventory-items/stock-report       # Raport stoc
POST   /api/inventory-items/recipes            # Gestionare retete
POST   /api/inventory-items/low-stock-alerts   # Configurare alerte
GET    /api/inventory-items/import             # Import articole
GET    /api/inventory-items/export             # Export articole
```

### Flux Stoc
```
┌─────────────────────────────────────────────────────────────────┐
│                     INTRARI (IN)                                │
├─────────────────────────────────────────────────────────────────┤
│  - NIR (Nota de Intrare Receptie)                              │
│  - Transfer intre depozite                                      │
│  - Ajustare manuala (+)                                         │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     STOC CURENT                                 │
│              WarehouseStock per Depozit                         │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     IESIRI (OUT)                                │
├─────────────────────────────────────────────────────────────────┤
│  - Vanzare (la facturare sau expediere)                        │
│  - Transfer intre depozite                                      │
│  - Ajustare manuala (-)                                         │
│  - Pierderi / Casare                                            │
└─────────────────────────────────────────────────────────────────┘
```

### Model Date Inventory
```typescript
InventoryItem {
  id: string
  sku: string
  barcode?: string
  name: string
  description?: string
  unit: string                    // "buc", "kg", "l"
  cost?: Decimal
  supplierId?: string
  lowStockThreshold?: number
  warehouseStock: WarehouseStock[]
  movements: InventoryStockMovement[]
  recipeComponents: InventoryRecipeComponent[]
}

WarehouseStock {
  id: string
  inventoryItemId: string
  warehouseId: string
  quantity: number
  reservedQuantity: number        // Rezervat pentru comenzi
  availableQuantity: number       // Disponibil = quantity - reserved
}

InventoryStockMovement {
  id: string
  type: StockMovementType         // IN, OUT, ADJUSTMENT, TRANSFER
  quantity: number
  reason: string
  reference?: string              // Nr comanda, NIR, etc.
  inventoryItemId: string
  warehouseId: string
  createdById: string
  createdAt: DateTime
}
```

### Tipuri Miscari Stoc
```
IN          - Intrare (NIR, receptie marfa)
OUT         - Iesire (vanzare, consum)
ADJUSTMENT  - Ajustare (inventar, corectie)
TRANSFER    - Transfer intre depozite
```

---

## 10. Modulul Ads (Publicitate)

### Pagini Frontend
- `/ads` - Overview campanii
- `/ads/accounts` - Conturi conectate
- `/ads/campaigns` - Lista campanii
- `/ads/campaigns/[id]` - Detalii campanie
- `/ads/alerts` - Reguli de alertare
- `/ads/pixels` - Pixeli tracking
- `/ads/settings` - Setari ads

### Endpoint-uri API
```
GET    /api/ads/accounts                     # Lista conturi
POST   /api/ads/accounts                     # Conecteaza cont
POST   /api/ads/accounts/[id]/sync-status    # Sincronizeaza status
GET    /api/ads/campaigns                    # Lista campanii
POST   /api/ads/campaigns/create             # Creeaza campanie
GET    /api/ads/campaigns/[id]               # Detalii campanie
GET    /api/ads/campaigns/[id]/insights      # Performanta
POST   /api/ads/campaigns/[id]/refresh       # Actualizeaza date
GET    /api/ads/campaigns/[id]/compare       # Compara metrici
GET    /api/ads/pixels                       # Lista pixeli
POST   /api/ads/settings                     # Actualizeaza setari
GET    /api/ads/products                     # Mapare produse
GET    /api/ads/stats                        # Statistici generale
POST   /api/ads/alerts/rules                 # Creeaza regula alerta
GET    /api/ads/webhooks                     # Gestionare webhooks
```

### Platforme Suportate
```
┌─────────────────────────────────────────────────────────────────┐
│                      META ADS                                   │
│                (Facebook + Instagram)                           │
├─────────────────────────────────────────────────────────────────┤
│  Autentificare: OAuth 2.0                                       │
│  Scopes: ads_management, ads_read, business_management          │
│                                                                 │
│  Features:                                                      │
│  - Campaign management                                          │
│  - Ad set configuration                                         │
│  - Creative management                                          │
│  - Performance insights                                         │
│  - Budget control                                               │
│  - Pixel tracking                                               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      TIKTOK ADS                                 │
├─────────────────────────────────────────────────────────────────┤
│  Autentificare: OAuth 2.0                                       │
│                                                                 │
│  Features:                                                      │
│  - Campaign sync                                                │
│  - Performance metrics                                          │
│  - Budget management                                            │
│  - Status tracking                                              │
└─────────────────────────────────────────────────────────────────┘
```

### Flux Sincronizare Ads
```
┌─────────────────────────────────────────────────────────────────┐
│              Cron Job: /api/cron/ads-sync (orar)                │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              Pentru fiecare AdsAccount activ:                    │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ├──► Meta Ads API → Fetch campaigns, insights
                            │
                            ├──► TikTok Ads API → Fetch campaigns, metrics
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              Salveaza in DB:                                     │
│  - AdsCampaign, AdsAdSet, AdsAd                                 │
│  - AdsDailyStats (metrici zilnice)                              │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              Verifica AdsAlertRule                               │
│              Genereaza AdsAlert daca sunt probleme               │
└─────────────────────────────────────────────────────────────────┘
```

### Model Date Ads
```typescript
AdsAccount {
  id: string
  platform: AdsPlatform       // META, TIKTOK
  accountId: string           // ID extern
  accountName: string
  accessToken: string         // Encrypted
  refreshToken?: string
  status: AdsAccountStatus
  lastSyncAt?: DateTime
  campaigns: AdsCampaign[]
}

AdsCampaign {
  id: string
  externalId: string
  name: string
  status: string              // ACTIVE, PAUSED, etc.
  objective: string
  dailyBudget?: Decimal
  lifetimeBudget?: Decimal
  startDate?: DateTime
  endDate?: DateTime
  adSets: AdsAdSet[]
  dailyStats: AdsDailyStats[]
  adsAccountId: string
}

AdsDailyStats {
  id: string
  date: DateTime
  impressions: number
  clicks: number
  spend: Decimal
  conversions: number
  revenue: Decimal
  ctr: Decimal
  cpc: Decimal
  cpm: Decimal
  roas: Decimal
  campaignId: string
}
```

### Integrare AI (Claude)
```typescript
// Analiza automata cu Claude AI (src/lib/ai.ts)
analyzeAdsPerformance(campaignsData) → {
  insights: AIInsight[]       // Observatii
  recommendations: [{
    type: "AD_BUDGET" | "AD_STATUS" | "PRODUCT_PRICE" | ...
    action: string
    confidence: number        // 0-100
    reasoning: string
  }]
}

// Cron Job: /api/cron/ai-analysis (zilnic)
```

---

## 11. Modulul Trendyol (Marketplace)

### Pagini Frontend
- `/trendyol` - Dashboard Trendyol
- `/trendyol/orders` - Comenzi Trendyol
- `/trendyol/products` - Produse listate
- `/trendyol/mapping` - Mapare SKU-uri

### Endpoint-uri API
```
GET    /api/trendyol/orders          # Lista comenzi
POST   /api/trendyol/orders/sync     # Sincronizeaza comenzi
GET    /api/trendyol/products        # Lista produse
POST   /api/trendyol/products/sync   # Sincronizeaza produse
POST   /api/trendyol/products/publish # Publica produse
GET    /api/trendyol/mapping         # Mapare SKU-uri
POST   /api/trendyol/mapping         # Actualizeaza mapare
```

### Integrare Trendyol
```typescript
// Client Trendyol (src/lib/trendyol.ts)
TrendyolConfig {
  supplierId: string
  apiKey: string
  apiSecret: string
  baseUrl: string             // Staging vs Production
}

// Features:
- Publicare produse cu categorii si atribute
- Sincronizare comenzi
- Actualizare status comenzi
- Sincronizare stoc
```

### Model Date Trendyol
```typescript
TrendyolOrder {
  id: string
  trendyolOrderId: string
  orderNumber: string
  status: string
  customerName: string
  shippingAddress: JSON
  items: TrendyolOrderItem[]
  totalPrice: Decimal
  cargoTrackingNumber?: string
  createdAt: DateTime
}

TrendyolProduct {
  id: string
  trendyolProductId: string
  barcode: string
  title: string
  description: string
  categoryId: number
  brand: string
  price: Decimal
  quantity: number
  images: string[]
  attributes: JSON
  status: string
}

TrendyolProductMapping {
  id: string
  localSku: string
  trendyolBarcode: string
  productId: string
}
```

---

## 12. Modulul Intercompany (Multi-Companie)

### Pagini Frontend
- `/intercompany` - Dashboard intercompany
- `/intercompany/invoices` - Facturi intercompany
- `/intercompany/settings` - Configurare

### Endpoint-uri API
```
GET    /api/intercompany/eligible-orders     # Comenzi eligibile
POST   /api/intercompany/generate-invoice    # Genereaza factura
GET    /api/intercompany/invoices            # Lista facturi
GET    /api/intercompany/settings            # Setari
POST   /api/intercompany/settings            # Actualizeaza setari
```

### Flux Intercompany
```
┌─────────────────────────────────────────────────────────────────┐
│                    COMPANIE PRIMARA                             │
│              (Proprietar stoc, fulfillment)                     │
└───────────────────────────┬─────────────────────────────────────┘
                            │
        Proceseaza comenzile │ pentru toate companiile secundare
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                  COMPANII SECUNDARE                              │
│              (Magazine separate, facturare proprie)              │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              Settlement (Saptamanal)                             │
│  - Calculeaza comenzile procesate                               │
│  - Aplica markup/comision                                       │
│  - Genereaza factura intercompany                               │
└─────────────────────────────────────────────────────────────────┘
```

### Model Date Intercompany
```typescript
Company {
  id: string
  name: string
  cui: string                 // CUI/CIF
  regCom: string              // Nr. Reg. Com.
  address: string
  city: string
  county: string
  country: string
  isPrimary: boolean          // Companie principala
  oblioEmail?: string
  oblioToken?: string
  fancourierId?: string
  fancourierUser?: string
  fancourierPass?: string
  stores: Store[]
  invoiceSeries: InvoiceSeries[]
}

IntercompanyInvoice {
  id: string
  invoiceNumber: string
  fromCompanyId: string       // Companie primara
  toCompanyId: string         // Companie secundara
  periodStart: DateTime
  periodEnd: DateTime
  totalAmount: Decimal
  orders: IntercompanyOrderLink[]
  status: IntercompanyInvoiceStatus
  oblioInvoiceId?: string
  createdAt: DateTime
}
```

---

## 13. Modulul RBAC (Utilizatori si Permisiuni)

### Pagini Frontend
- `/settings/users` - Gestionare utilizatori
- `/settings/roles` - Gestionare roluri
- `/settings/groups` - Gestionare grupuri
- `/settings/invitations` - Invitatii
- `/settings/audit` - Log de audit

### Endpoint-uri API
```
# Utilizatori
GET    /api/rbac/users                  # Lista utilizatori
POST   /api/rbac/users                  # Creeaza utilizator
PUT    /api/rbac/users/[id]             # Actualizeaza utilizator
DELETE /api/rbac/users/[id]             # Sterge utilizator

# Roluri
GET    /api/rbac/roles                  # Lista roluri
POST   /api/rbac/roles                  # Creeaza rol
PUT    /api/rbac/roles/[id]             # Actualizeaza rol
DELETE /api/rbac/roles/[id]             # Sterge rol

# Permisiuni
GET    /api/rbac/permissions            # Lista permisiuni

# Grupuri
GET    /api/rbac/groups                 # Lista grupuri
POST   /api/rbac/groups                 # Creeaza grup

# Invitatii
GET    /api/rbac/invitations            # Lista invitatii
POST   /api/rbac/invitations            # Trimite invitatie
POST   /api/rbac/invitations/accept     # Accepta invitatie

# Audit
GET    /api/rbac/audit                  # Log de audit
```

### Sistemul de Permisiuni
```
┌─────────────────────────────────────────────────────────────────┐
│                        PERMISIUNI                               │
│              (46+ permisiuni granulare)                         │
├─────────────────────────────────────────────────────────────────┤
│  orders.view      │ orders.edit      │ orders.process          │
│  products.view    │ products.edit    │ products.delete         │
│  inventory.view   │ inventory.edit   │ inventory.adjust        │
│  invoices.view    │ invoices.issue   │ invoices.cancel         │
│  awb.view         │ awb.create       │ awb.cancel              │
│  picking.view     │ picking.create   │ picking.complete        │
│  handover.view    │ handover.scan    │ handover.finalize       │
│  settings.view    │ settings.edit    │                         │
│  users.view       │ users.manage     │ users.invite            │
│  roles.view       │ roles.manage     │                         │
│  stores.view      │ stores.manage    │                         │
│  sync.execute     │ reports.view     │ ads.manage              │
│  activity.view    │                  │                         │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                          ROLURI                                 │
│              (Colectii de permisiuni)                           │
├─────────────────────────────────────────────────────────────────┤
│  Admin         │ Toate permisiunile                            │
│  Manager       │ orders.*, products.*, inventory.*, reports.*  │
│  Operator      │ orders.view, picking.*, handover.*            │
│  Viewer        │ *.view only                                   │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                         GRUPURI                                 │
│              (Colectii de utilizatori)                          │
├─────────────────────────────────────────────────────────────────┤
│  Warehouse Team   │ Operator role                              │
│  Sales Team       │ Manager role                               │
│  Administrators   │ Admin role                                 │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                       UTILIZATORI                               │
├─────────────────────────────────────────────────────────────────┤
│  - Roluri directe (UserRoleAssignment)                         │
│  - Roluri prin grupuri (GroupRoleAssignment)                   │
│  - Acces per magazin (UserStoreAccess)                         │
│  - Acces per depozit (UserWarehouseAccess)                     │
└─────────────────────────────────────────────────────────────────┘
```

### Model Date RBAC
```typescript
User {
  id: string
  email: string
  name: string
  password?: string           // Hashed cu bcrypt
  image?: string
  emailVerified?: DateTime
  roles: UserRoleAssignment[]
  groups: UserGroupMembership[]
  storeAccess: UserStoreAccess[]
  warehouseAccess: UserWarehouseAccess[]
}

Role {
  id: string
  name: string
  description?: string
  color?: string              // Pentru UI
  permissions: RolePermission[]
  users: UserRoleAssignment[]
  groups: GroupRoleAssignment[]
}

Permission {
  code: string                // Ex: "orders.view"
  name: string
  description?: string
  category: string            // Ex: "orders"
  roles: RolePermission[]
}

// Verificare permisiune
hasPermission(userId, "orders.view") → boolean
```

---

## 14. Integrari Externe

### 14.1 Shopify
```
┌─────────────────────────────────────────────────────────────────┐
│                        SHOPIFY                                  │
├─────────────────────────────────────────────────────────────────┤
│  Tip: Admin API (REST)                                          │
│  Autentificare: Access Token per magazin                        │
│                                                                 │
│  Functionalitati:                                               │
│  ├─ Sincronizare comenzi (orders.json)                         │
│  ├─ Actualizare status comenzi                                 │
│  ├─ Sincronizare produse                                       │
│  ├─ Actualizare stoc (inventory_levels)                        │
│  └─ Webhook callbacks                                          │
│                                                                 │
│  Webhooks:                                                      │
│  ├─ orders/create                                              │
│  ├─ orders/updated                                             │
│  └─ orders/cancelled                                           │
└─────────────────────────────────────────────────────────────────┘
```

### 14.2 Oblio (Facturare)
```
┌─────────────────────────────────────────────────────────────────┐
│                         OBLIO                                   │
├─────────────────────────────────────────────────────────────────┤
│  Tip: REST API                                                  │
│  Autentificare: OAuth 2.0 (email + secret token)                │
│  Client: src/lib/oblio.ts                                       │
│                                                                 │
│  Functionalitati:                                               │
│  ├─ Emitere facturi                                            │
│  ├─ Gestionare serii facturi                                   │
│  ├─ Generare PDF factura                                       │
│  ├─ Integrare e-Factura (SPV)                                  │
│  ├─ Suport multi-moneda (RON, EUR)                             │
│  └─ Nomenclator clienti                                        │
│                                                                 │
│  Mapare TVA:                                                    │
│  ├─ 19% → "Normala"                                            │
│  ├─ 9%  → "Redusa"                                             │
│  ├─ 5%  → "Redusa2"                                            │
│  └─ 0%  → "SDD" (Scutit cu drept deducere)                     │
└─────────────────────────────────────────────────────────────────┘
```

### 14.3 FanCourier (Expediere)
```
┌─────────────────────────────────────────────────────────────────┐
│                       FANCOURIER                                │
├─────────────────────────────────────────────────────────────────┤
│  Tip: REST API                                                  │
│  Autentificare: Token (username + password)                     │
│  Client: src/lib/fancourier.ts                                  │
│                                                                 │
│  Functionalitati:                                               │
│  ├─ Generare AWB                                               │
│  ├─ Tipuri servicii (Standard, Express, Collector)             │
│  ├─ Ramburs (Cash on Delivery)                                 │
│  ├─ Tracking status detaliat                                   │
│  ├─ Generare etichete PDF                                      │
│  └─ Integrare handover/pickup                                  │
│                                                                 │
│  Coduri Status:                                                 │
│  ├─ C0 - Acceptat                                              │
│  ├─ S2 - In tranzit                                            │
│  ├─ H4 - Livrat                                                │
│  └─ R1 - Returnat                                              │
│                                                                 │
│  Token Caching:                                                 │
│  └─ Cache per companie pentru a preveni data leakage           │
└─────────────────────────────────────────────────────────────────┘
```

### 14.4 Meta Ads (Facebook/Instagram)
```
┌─────────────────────────────────────────────────────────────────┐
│                       META ADS                                  │
├─────────────────────────────────────────────────────────────────┤
│  Tip: Graph API                                                 │
│  Autentificare: OAuth 2.0                                       │
│  Client: src/lib/meta-ads.ts                                    │
│                                                                 │
│  Scopes:                                                        │
│  ├─ ads_management                                             │
│  ├─ ads_read                                                   │
│  └─ business_management                                        │
│                                                                 │
│  Functionalitati:                                               │
│  ├─ Gestionare campanii                                        │
│  ├─ Configurare ad sets                                        │
│  ├─ Gestionare creatives                                       │
│  ├─ Fetch performance insights                                 │
│  ├─ Control buget                                              │
│  └─ Tracking pixeli                                            │
└─────────────────────────────────────────────────────────────────┘
```

### 14.5 TikTok Ads
```
┌─────────────────────────────────────────────────────────────────┐
│                      TIKTOK ADS                                 │
├─────────────────────────────────────────────────────────────────┤
│  Tip: Business API                                              │
│  Autentificare: OAuth 2.0                                       │
│  Client: src/lib/tiktok-ads.ts                                  │
│                                                                 │
│  Functionalitati:                                               │
│  ├─ Sincronizare campanii                                      │
│  ├─ Metrici performanta                                        │
│  ├─ Gestionare buget                                           │
│  └─ Tracking status                                            │
└─────────────────────────────────────────────────────────────────┘
```

### 14.6 Trendyol (Marketplace)
```
┌─────────────────────────────────────────────────────────────────┐
│                       TRENDYOL                                  │
├─────────────────────────────────────────────────────────────────┤
│  Tip: REST API                                                  │
│  Autentificare: Basic Auth (API Key + Secret)                   │
│  Client: src/lib/trendyol.ts                                    │
│                                                                 │
│  Functionalitati:                                               │
│  ├─ Listare produse                                            │
│  ├─ Sincronizare comenzi                                       │
│  ├─ Actualizare status comenzi                                 │
│  ├─ Sincronizare stoc                                          │
│  └─ Mapare categorii si atribute                               │
│                                                                 │
│  Environment:                                                   │
│  ├─ Staging (test)                                             │
│  └─ Production                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 14.7 Claude AI (Anthropic)
```
┌─────────────────────────────────────────────────────────────────┐
│                       CLAUDE AI                                 │
├─────────────────────────────────────────────────────────────────┤
│  Tip: Anthropic API                                             │
│  Client: src/lib/ai.ts                                          │
│                                                                 │
│  Functionalitati:                                               │
│  ├─ Analiza performanta ads                                    │
│  ├─ Generare recomandari optimizare                            │
│  └─ Insights actionabile cu confidence score                   │
│                                                                 │
│  Tipuri Actiuni:                                                │
│  ├─ AD_BUDGET - Ajustare buget                                 │
│  ├─ AD_STATUS - Oprire/pornire campanii                        │
│  ├─ AD_BID - Modificare licitatii                              │
│  ├─ AD_TARGETING - Ajustare targetare                          │
│  ├─ PRODUCT_PRICE - Sugestii pret                              │
│  └─ PRODUCT_STOCK - Alerte stoc                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 15. Cron Jobs (Taskuri Automate)

Toate endpoint-urile cron necesita header `Authorization: Bearer CRON_SECRET`.

| Endpoint | Frecventa | Descriere |
|----------|-----------|-----------|
| `/api/cron/sync-orders` | 15 min | Sincronizeaza comenzi noi din Shopify |
| `/api/cron/sync-awb` | Orar | Actualizeaza status AWB din FanCourier |
| `/api/cron/ads-sync` | Orar | Fetch metrici campanii Meta/TikTok |
| `/api/cron/ads-alerts` | Orar | Verifica reguli de alertare |
| `/api/cron/ai-analysis` | Zilnic | Genereaza insights AI |
| `/api/cron/handover-finalize` | EOD | Auto-finalizeaza sesiuni handover |
| `/api/cron/intercompany-settlement` | Saptamanal | Genereaza facturi intercompany |
| `/api/cron/backup` | Zilnic | Backup baza de date |
| `/api/cron/run-all` | - | Ruleaza toate taskurile |

### Control Concurenta
```typescript
// Prevenire executii paralele (src/lib/cron-lock.ts)
withCronLock("sync-orders", async () => {
  // Doar o instanta ruleaza la un moment dat
});
```

---

## 16. Schema Bazei de Date

### Diagrama Relatii Principale
```
Company (1) ────────────────────── (N) Store
            ├─ (1) ────────── (N) Invoice
            ├─ (1) ────────── (N) AWB
            ├─ (1) ────────── (N) Warehouse
            └─ (1) ────────── (N) InvoiceSeries

Store (1) ──────────────────── (N) Order
          └─ (1) ────────── (1) Channel

Order (1) ────────────────────── (N) LineItem
      ├─ (1) ────────────── (1) Invoice
      ├─ (1) ────────────── (1) AWB
      └─ (N) ────────────── (N) ProcessingError

AWB (1) ────────────────────── (N) AWBStatusHistory
    ├─ (1) ────────────── (1) HandoverSession
    └─ (N) ────────────── (N) AWBComment

User (1) ─────────────────── (N) Role
     ├─ (N) ────────────── (N) Group
     ├─ (N) ────────────── (N) UserStoreAccess
     └─ (N) ────────────── (N) UserWarehouseAccess

Product (1) ─────────────── (N) ProductComponent
        ├─ (1) ────────── (1) MasterProduct
        └─ (N) ────────── (N) WarehouseStock

InventoryItem (1) ────────── (N) WarehouseStock
              ├─ (N) ────── (N) InventoryStockMovement
              └─ (N) ────── (N) InventoryRecipeComponent

AdsAccount (1) ────────────── (N) AdsCampaign
           └─ (N) ────────── (N) AdsPixel

AdsCampaign (1) ────────────── (N) AdsAdSet
            ├─ (N) ────────── (N) AdsDailyStats
            └─ (N) ────────── (N) AdsCampaignProduct
```

### Numar Total Modele: 65+

**Categorii:**
- Autentificare & RBAC: 11 modele
- Business Core: 16 modele
- Inventory: 12 modele
- Picking & Logistics: 4 modele
- Sales & Channels: 8 modele
- Advertising: 15 modele
- AI & Automation: 3 modele
- Trendyol: 6 modele
- Intercompany: 2 modele
- Operational: 7 modele

---

## Variabile de Mediu Necesare

```env
# Database
DATABASE_URL=postgresql://user:password@host/dbname

# Auth
NEXTAUTH_SECRET=jwt-signing-secret
NEXTAUTH_URL=https://yourdomain.com

# Cron
CRON_SECRET=secret-for-cron-jobs

# Oblio
OBLIO_API_KEY=...
OBLIO_EMAIL=...
OBLIO_CIFS=["CUI1","CUI2"]

# FanCourier
FANCOURIER_CLIENT_ID=...
FANCOURIER_USERNAME=...
FANCOURIER_PASSWORD=...

# OAuth Providers
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Ads
META_APP_ID=...
META_APP_SECRET=...
TIKTOK_APP_ID=...
TIKTOK_APP_SECRET=...

# AI
ANTHROPIC_API_KEY=...

# Trendyol
TRENDYOL_SUPPLIER_ID=...
TRENDYOL_API_KEY=...
TRENDYOL_API_SECRET=...
```

---

*Documentatie generata automat - Ultima actualizare: Ianuarie 2026*
