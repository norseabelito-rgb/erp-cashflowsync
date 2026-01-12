# Analiză Tehnică și Logică - ERP Shopify

## Sumar Executiv

Sistemul ERP actual este funcțional pentru flow-ul de bază (Shopify → Factură → AWB), dar are lacune semnificative pentru implementarea funcționalității de picking cerute. Mai jos prezint o analiză detaliată.

---

## 1. ARHITECTURA ACTUALĂ

### 1.1 Modele de Date (Schema Prisma)

| Model | Scop | Relații |
|-------|------|---------|
| `Store` | Magazine Shopify | → Orders, Channel |
| `Order` | Comenzi sincronizate | → Store, LineItems, Invoice, AWB |
| `LineItem` | Produsele din comandă | → Order |
| `Invoice` | Facturi SmartBill | → Order (1:1) |
| `AWB` | AWB-uri FanCourier | → Order (1:1), StatusHistory |
| `MasterProduct` | Catalog produse PIM | → Category, Images, Channels |
| `Printer` | Imprimante configurate | → PrintJobs |
| `PrintJob` | Joburi de printare | → Printer |

### 1.2 Flow-ul Actual

```
Shopify API → Sync → Order + LineItems
                          ↓
                    Validare (telefon, adresă)
                          ↓
                    Emitere Factură SmartBill
                          ↓
                    Generare AWB FanCourier
                          ↓
                    Print AWB (automat/manual)
                          ↓
                    Tracking status AWB
```

---

## 2. LACUNE IDENTIFICATE

### 2.1 🔴 BUG CRITIC: LineItems nu se actualizează la Update

**Locație:** `/src/lib/shopify.ts`, liniile 290-375

**Problemă:**
```javascript
// CREATE - LineItems sunt create
await prisma.order.upsert({
  create: {
    lineItems: {
      create: shopifyOrder.line_items.map(...) // ✅ OK
    }
  },
  update: {
    // ❌ LIPSĂ! LineItems NU sunt actualizate
  }
});
```

**Impact:**
- Dacă o comandă Shopify e modificată (produs adăugat/eliminat), ERP-ul păstrează LineItems-urile vechi
- Factura va fi emisă cu produse greșite
- Picking list va fi incorect

**Remediere necesară:**
```javascript
update: {
  // ... alte câmpuri ...
  lineItems: {
    deleteMany: {}, // Șterge toate
    create: shopifyOrder.line_items.map(...) // Recreează
  }
}
```

---

### 2.2 🔴 LineItem - Lipsă câmpuri esențiale

**Problemă actuală:**
```prisma
model LineItem {
  id              String
  orderId         String
  shopifyLineItemId String
  title           String
  variantTitle    String?
  sku             String?      // ← Poate fi NULL!
  quantity        Int
  price           Decimal
}
```

**Câmpuri lipsă pentru picking:**
- `barcode` - Codul de bare al produsului (esențial pentru scanare)
- `weight` - Greutatea (pentru verificare pachet)
- `location` - Locația în depozit (raft, poziție)
- `imageUrl` - Pentru identificare vizuală

**Impact:** 
- Nu poți face picking cu scanner dacă nu ai barcode
- SKU poate fi null, deci nu ai identificator garantat

---

### 2.3 🟠 AWB - Lipsă relație cu LineItems

**Problemă:**
API-ul de AWB (`/api/awb/route.ts`) nu include LineItems în query:

```javascript
const awbs = await prisma.aWB.findMany({
  select: {
    order: {
      select: {
        // ... date client ...
        // ❌ LIPSĂ: lineItems
      }
    }
  }
});
```

**Impact:**
- Nu poți filtra AWB-uri după produs conținut
- Nu poți genera picking list direct din AWB-uri

---

### 2.4 🟠 Lipsă Model PickingList

**Pentru funcționalitatea cerută, ai nevoie de:**

```prisma
enum PickingListStatus {
  PENDING      // Creat, neînceput
  IN_PROGRESS  // Picker-ul lucrează
  COMPLETED    // Toate produsele scanate
  CANCELLED    // Anulat
}

model PickingList {
  id              String              @id @default(cuid())
  
  // Referințe
  createdBy       String?             // Cine l-a creat
  assignedTo      String?             // Picker-ul asignat
  
  // Status
  status          PickingListStatus   @default(PENDING)
  startedAt       DateTime?
  completedAt     DateTime?
  
  // Metadata
  notes           String?
  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt
  
  // Relații
  items           PickingListItem[]
  awbs            PickingListAWB[]    // AWB-urile incluse
}

model PickingListItem {
  id              String       @id @default(cuid())
  pickingListId   String
  pickingList     PickingList  @relation(...)
  
  // Produs
  sku             String
  barcode         String?
  title           String
  variantTitle    String?
  location        String?       // Raft/poziție
  
  // Cantități
  quantityRequired Int          // Câte trebuie luate
  quantityPicked   Int          @default(0)  // Câte au fost scanate
  
  // Status per item
  isComplete      Boolean      @default(false)
  pickedAt        DateTime?
}

model PickingListAWB {
  id              String       @id @default(cuid())
  pickingListId   String
  pickingList     PickingList  @relation(...)
  awbId           String
  awb             AWB          @relation(...)
  
  // Status print
  isPrinted       Boolean      @default(false)
  printedAt       DateTime?
}
```

---

### 2.5 🟠 Lipsă Conexiune MasterProduct ↔ LineItem

**Problemă:**
LineItem-urile din comenzi NU sunt legate de MasterProduct din PIM.

```prisma
model LineItem {
  sku String?  // E doar un string, nu referință!
}

model MasterProduct {
  sku String @unique
  // Dar nu are relație cu LineItem
}
```

**Impact:**
- Nu poți lua `barcode`, `location`, `imageUrl` din catalog pentru picking
- Trebuie să faci JOIN manual pe SKU (poate să nu existe match)

**Remediere:**
```prisma
model LineItem {
  // ... câmpuri existente ...
  
  // Legătură cu PIM (opțional, pentru produse cunoscute)
  masterProductId String?
  masterProduct   MasterProduct? @relation(...)
}
```

---

### 2.6 🟡 Lipsă barcode în MasterProduct

**Problemă actuală:**
```prisma
model MasterProduct {
  sku String @unique
  trendyolBarcode String?  // Doar pentru Trendyol!
  // ❌ LIPSĂ: barcode general
}
```

**Impact:**
- Ai barcode doar pentru produse Trendyol
- Produsele Shopify nu au barcode în sistem

**Remediere:**
```prisma
model MasterProduct {
  sku     String  @unique
  barcode String? @unique  // EAN-13 sau alt format
  // ...
}
```

---

### 2.7 🟡 Lipsă API pentru filtrare comenzi/AWB după produs

**Problema:**
Nu există endpoint care să returneze "toate comenzile/AWB-urile care conțin produsul X".

**Necesită:**
```
GET /api/orders?containsSku=SKU-001
GET /api/awb?containsSku=SKU-001

// Sau endpoint dedicat
GET /api/picking/orders-by-product?sku=SKU-001
```

---

### 2.8 🟡 Bulk Operations - Parțial Implementat

**Ce există:**
- Bulk emitere facturi ✅
- Bulk generare AWB ✅
- Bulk print AWB ✅

**Ce lipsește:**
- Bulk selecție cu filtru avansat (după produs, după status AWB, etc.)
- Agregare produse din selecție
- Generare picking list din selecție

---

### 2.9 🟡 PrintJob - Lipsă tip "picking_list"

**Actuală:**
```prisma
model PrintJob {
  documentType    String    // "awb", "invoice", "label"
}
```

**Necesită:**
```prisma
documentType    String    // "awb", "invoice", "label", "picking_list"
```

---

## 3. PROBLEME DE LOGICĂ

### 3.1 Flow Status Order - Potențial Dezordonat

**Status-uri definite:**
```
PENDING → VALIDATED → INVOICED → SHIPPED → DELIVERED
              ↘ VALIDATION_FAILED
                        ↘ INVOICE_ERROR
                                  ↘ AWB_ERROR
```

**Problemă:**
Nu există status pentru "în picking" sau "pregătit pentru expediere".

**Soluție:**
```prisma
enum OrderStatus {
  PENDING
  VALIDATED
  VALIDATION_FAILED
  INVOICE_PENDING
  INVOICE_ERROR
  INVOICED
  PICKING         // ← NOU: În picking
  PACKED          // ← NOU: Împachetat, gata de expediere
  AWB_PENDING
  AWB_ERROR
  SHIPPED
  DELIVERED
  RETURNED
  CANCELLED
}
```

---

### 3.2 Sincronizare Stoc - Unidirecțională

**Actuală:**
- Stocul din SmartBill → MasterProduct.stock (sincronizare periodică)
- NU se scade stocul la emitere factură (opțional în SmartBill)

**Problemă pentru picking:**
- Dacă picker-ul ia un produs, stocul nu se actualizează în timp real
- Risc de a face picking pentru produse care nu mai sunt în stoc

---

### 3.3 Lipsă Webhook pentru Status AWB

**Actuală:**
- Polling periodic pentru status AWB (cron sau manual)
- Delay între schimbarea reală și actualizarea în sistem

**Ideal:**
- Webhook de la FanCourier când se schimbă statusul
- Update instant în sistem

---

## 4. SECURITATE

### 4.1 🟠 Token-uri API în Settings

**Problemă:**
- Token-uri SmartBill, FanCourier, Trendyol sunt stocate în tabel `Settings`
- Sunt returnate în API-ul `/api/settings`

**Observație:**
- La GET, secretele sunt mascate (implementat corect)
- La POST, sunt salvate în clar (normal)

---

### 4.2 🟡 Lipsă Rate Limiting

**Problemă:**
- Nu există rate limiting pe API-uri
- Risc de abuse sau accidental overload

---

## 5. PERFORMANȚĂ

### 5.1 🟡 Paginare Inconsistentă

| API | Paginare |
|-----|----------|
| `/api/orders` | ✅ Da (page, limit) |
| `/api/awb` | ❌ Nu - returnează toate |
| `/api/products` | ✅ Da |

**Impact:** Pentru multe AWB-uri, răspunsul poate fi foarte mare.

---

### 5.2 🟡 Lipsă Index pe Câmpuri Frecvent Căutate

**Recomandări:**
```prisma
model LineItem {
  @@index([sku])      // Pentru filtrare după produs
  @@index([orderId])  // Există deja implicit
}

model AWB {
  @@index([currentStatus])
  @@index([createdAt])
}
```

---

## 6. CE LIPSEȘTE PENTRU PICKING

### 6.1 Modele de Date

| Model | Status | Necesar pentru |
|-------|--------|----------------|
| `PickingList` | ❌ LIPSĂ | Lista centralizată de picking |
| `PickingListItem` | ❌ LIPSĂ | Itemii din picking list |
| `PickingListAWB` | ❌ LIPSĂ | Legătura picking ↔ AWB |

### 6.2 API-uri

| Endpoint | Status | Scop |
|----------|--------|------|
| `GET /api/orders?containsSku=X` | ❌ LIPSĂ | Filtrare după produs |
| `GET /api/awb?containsSku=X` | ❌ LIPSĂ | Filtrare după produs |
| `POST /api/picking/create` | ❌ LIPSĂ | Creare picking list din AWB-uri |
| `GET /api/picking/:id` | ❌ LIPSĂ | Detalii picking list |
| `POST /api/picking/:id/scan` | ❌ LIPSĂ | Înregistrare scanare produs |
| `POST /api/picking/:id/complete` | ❌ LIPSĂ | Finalizare picking |

### 6.3 UI

| Pagină | Status | Scop |
|--------|--------|------|
| `/picking` | ❌ LIPSĂ | Lista picking lists |
| `/picking/create` | ❌ LIPSĂ | Creare picking din AWB-uri filtrate |
| `/picking/:id` | ❌ LIPSĂ | Interfață scanner pentru picker |
| `/picking/:id/print` | ❌ LIPSĂ | Print picking list + AWB-uri |

### 6.4 Funcționalități

| Feature | Status |
|---------|--------|
| Filtrare AWB după produs | ❌ |
| Selecție multiplă AWB-uri | ✅ Există pentru alte operații |
| Agregare produse din selecție | ❌ |
| Generare picking list | ❌ |
| Scanare produse (web) | ❌ |
| Validare completitudine | ❌ |
| Print picking list | ❌ |
| Print bulk AWB-uri | ✅ Există |

---

## 7. RECOMANDĂRI PRIORITIZATE

### Prioritate 1 - Bug-uri Critice
1. **FIX:** LineItems să se actualizeze la sync Order
2. **ADD:** Barcode în LineItem și MasterProduct
3. **ADD:** Legătură LineItem ↔ MasterProduct

### Prioritate 2 - Fundament Picking
4. **ADD:** Modele PickingList, PickingListItem, PickingListAWB
5. **ADD:** API filtrare comenzi/AWB după SKU
6. **ADD:** API creare picking list

### Prioritate 3 - UI Picking
7. **ADD:** Pagină creare picking list
8. **ADD:** Pagină scanare pentru picker
9. **ADD:** Print picking list

### Prioritate 4 - Optimizări
10. Paginare pe `/api/awb`
11. Index-uri adiționale
12. Status-uri noi pentru Order (PICKING, PACKED)

---

## 8. ESTIMARE TIMP IMPLEMENTARE PICKING

| Componentă | Timp Estimat |
|------------|--------------|
| Fix bug LineItems | 30 min |
| Adăugare barcode + legături | 1 oră |
| Modele Prisma Picking | 1 oră |
| API-uri Picking | 3-4 ore |
| UI Creare Picking | 2-3 ore |
| UI Scanare (web) | 3-4 ore |
| Print picking list | 1-2 ore |
| **TOTAL** | **12-16 ore** |

---

*Analiză efectuată: Ianuarie 2025*
