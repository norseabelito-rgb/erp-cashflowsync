# TO DO LIST - Sincronizări și Îmbunătățiri

## 📋 TOATE BUTOANELE DE SINCRONIZARE DIN PLATFORMĂ

### 1. COMENZI (`/orders`)
| Buton | Locație | API | Descriere |
|-------|---------|-----|-----------|
| Sincronizează Comenzi | Header pagină | `/api/orders/sync` | Sync toate comenzile din Shopify |
| Sincronizează Status | Dialog comandă individuală | `/api/orders/sync` | Sync status pt o comandă |
| Procesează Toate | Toolbar selecție | `/api/awb/generate` | Generează AWB bulk |
| Re-procesează | Row comandă | `/api/awb/generate` | Regenerează AWB |

### 2. PRODUSE (`/products`)
| Buton | Locație | API | Descriere |
|-------|---------|-----|-----------|
| Sync Stocuri | Header pagină | `/api/products/sync-stock` | Trage stocuri din SmartBill → MasterProduct |
| Sync Shopify | Header pagină | `/api/products/sync-shopify` | Push produse la Shopify |
| Adaugă pe canal | Tab "Adaugă pe canal" din detalii produs | `/api/products/[id]/channels` POST | Creează produs în Shopify |

### 3. INVENTAR (`/inventory`)
| Buton | Locație | API | Descriere |
|-------|---------|-----|-----------|
| Sincronizează Stoc | Header pagină | `/api/stock/sync` | Trage stocuri din SmartBill → Product |
| Sincronizează Stoc | Empty state | `/api/stock/sync` | Same as above |

### 4. MAGAZINE (`/stores`)
| Buton | Locație | API | Descriere |
|-------|---------|-----|-----------|
| Sync | Row per store | `/api/stores/[id]/sync` | Sync comenzi din Shopify pentru un store |

### 5. SETĂRI (`/settings`)
| Buton | Locație | API | Descriere |
|-------|---------|-----|-----------|
| Testează conexiunea SmartBill | Card SmartBill | `/api/settings/smartbill-data` | Verifică credențiale SmartBill |
| Testează conexiunea FanCourier | Card FanCourier | `/api/settings/test-fancourier` | Verifică credențiale FanCourier |
| Testează conexiunea Trendyol | Card Trendyol | `/api/settings/test-trendyol` | Verifică credențiale Trendyol |
| Testează conexiunea Google Drive | Card Google Drive | `/api/google-drive/test` | Verifică conexiune Drive |
| Scanează Produse (Drive) | Card Google Drive | `/api/products/sync-images` GET | Scanează foldere pt imagini |
| Sincronizează Imagini (Drive) | Card Google Drive | `/api/products/sync-images` POST | Descarcă imagini din Drive |

### 6. SERII FACTURI (`/settings/invoice-series`)
| Buton | Locație | API | Descriere |
|-------|---------|-----|-----------|
| Sincronizează din SmartBill | Header pagină | `/api/invoice-series/sync` | Trage seriile din SmartBill |

### 7. ADS - CONTURI (`/ads/accounts`)
| Buton | Locație | API | Descriere |
|-------|---------|-----|-----------|
| Sync Campaigns | Row per cont | `/api/ads/accounts/[id]/sync` | Sync campanii din Meta/TikTok |

### 8. ADS - PIXELI (`/ads/pixels`)
| Buton | Locație | API | Descriere |
|-------|---------|-----|-----------|
| Sync Pixels | Row per cont | `/api/ads/pixels/sync` | Sync pixeli din Meta/TikTok |

### 9. ADS - CAMPANII DETALII (`/ads/campaigns/[id]`)
| Buton | Locație | API | Descriere |
|-------|---------|-----|-----------|
| Refresh Stats | Header pagină | `/api/ads/campaigns/[id]` | Refresh statistici campanie |

---

## 🐛 BUGURI DE REZOLVAT

### BUG 1: Sync Images - Unique Constraint Error
- **Fișier:** `/api/products/sync-images/route.ts`
- **Problemă:** Când se încearcă sync pentru produse care au deja imagini, eroare `Unique constraint failed on (productId, position)`
- **Soluție propusă:** 
  - Șterge imaginile existente înainte de a adăuga cele noi
  - SAU folosește upsert în loc de create
  - SAU verifică dacă imaginea există deja și skip
- **Loguri necesare:** Adaugă log cu ce imagini există deja și ce încearcă să adauge

### BUG 2: SKU-uri duplicate în dropdown creare produs
- **Fișier:** `/app/(dashboard)/products/page.tsx`
- **Problemă:** În pop-up-ul de creare produs, dropdown-ul cu produse din inventar arată și SKU-uri care sunt deja în MasterProduct
- **Soluție propusă:** Filtrează din `inventoryProducts` toate SKU-urile care există deja în `MasterProduct`
- **Locație cod:** 
  - Query `inventoryProducts` - trebuie să excludă SKU-urile existente
  - SAU filtrare în frontend înainte de afișare

---

## 🆕 FUNCȚIONALITĂȚI NOI DE IMPLEMENTAT

### FEATURE 1: Produse în pop-up-ul detalii comandă
- **Fișier:** `/app/(dashboard)/orders/page.tsx`
- **Problemă:** În dialogul cu detaliile unei comenzi nu se afișează produsele
- **Soluție propusă:** Adaugă o secțiune în dialog care să afișeze `lineItems` cu:
  - Titlu produs
  - SKU
  - Cantitate
  - Preț unitar
  - Preț total (cantitate × preț)
- **Design:** Tabel simplu sau listă cu carduri

### FEATURE 2: Tooltip-uri descriptive pe butoanele de sync/refresh/test
- **Fișiere afectate:** Toate paginile cu butoane de sync (vezi lista de mai sus)
- **Ce trebuie făcut:**
  - Adaugă `<Tooltip>` pe FIECARE buton de sync/refresh/testează conexiune
  - Tooltip-ul trebuie să explice EXACT ce face butonul
  - Exemplu: "Sincronizează stocurile din SmartBill în pagina de Produse. Durează ~30 secunde."
  - Exemplu: "Trimite toate produsele cu canale Shopify active către Shopify. Creează produse noi și actualizează cele existente."
  - Exemplu: "Verifică dacă credențialele SmartBill sunt valide și conexiunea funcționează."

### FEATURE 3: Overlay cu blur și progress tracking pentru acțiuni
- **Fișiere afectate:** Toate paginile cu butoane de sync
- **Ce trebuie făcut:**
  - Când se apasă un buton de sync/refresh/test:
    1. Apare overlay cu blur pe fundal (întreaga pagină sau secțiunea relevantă)
    2. Modal/card central cu:
       - Titlul acțiunii (ex: "Sincronizare Shopify în curs...")
       - Progress bar sau spinner
       - Mesaje de status în timp real (ex: "Procesez produsul 5/23...")
       - Buton de anulare (dacă e posibil)
    3. La final: rezultat sumarizat (X reușite, Y erori)
- **Componente necesare:**
  - `<SyncOverlay>` - componentă reutilizabilă
  - Props: `isOpen`, `title`, `progress`, `status`, `onClose`
- **Design:** Similar cu dialogurile existente, dar full-screen cu backdrop blur

---

## 🔍 AUDIT BUTOANE SYNC - VERIFICARE FUNCȚIONALITATE

### Checklist pentru fiecare buton de sync:

| # | Buton | Pagină | Tooltip | Responsive | Status |
|---|-------|--------|---------|------------|--------|
| 1 | Sincronizează Comenzi | Comenzi | ✅ | ✅ | Funcțional |
| 2 | Sincronizează Status (individual) | Comenzi | ⬜ | ✅ | De verificat |
| 3 | Procesează Toate | Comenzi | ⬜ | ✅ | De verificat |
| 4 | Sync Stocuri | Produse | ✅ | ✅ | Funcțional |
| 5 | Sync Shopify | Produse | ✅ | ✅ | Funcțional |
| 6 | Adaugă pe canal | Produse/[id] | ⬜ | ✅ | De verificat |
| 7 | Sincronizează Stoc | Inventar | ✅ | ✅ | Funcțional |
| 8 | Sync (per store) | Magazine | ✅ | ✅ | Funcțional |
| 9 | Testează conexiunea SmartBill | Setări | ✅ | ✅ | Funcțional |
| 10 | Testează conexiunea FanCourier | Setări | ✅ | ✅ | Funcțional |
| 11 | Testează conexiunea Trendyol | Setări | ⬜ | ✅ | De adăugat |
| 12 | Testează conexiunea Google Drive | Setări | ⬜ | ✅ | De adăugat |
| 13 | Scanează Produse (Drive) | Setări | ⬜ | ✅ | De adăugat |
| 14 | Sincronizează Imagini (Drive) | Setări | ⬜ | ✅ | ✅ Bug fix v15 |
| 15 | Sincronizează din SmartBill | Serii Facturi | ✅ | ✅ | Funcțional |
| 16 | Sync Campaigns | Ads Conturi | ✅ | ✅ | Funcțional |
| 17 | Sync Pixels | Ads Pixeli | ⬜ | ⬜ | De verificat |
| 18 | Refresh Stats | Ads Campanii | ⬜ | ⬜ | De verificat |
| 19 | Sincronizează | Trendyol Orders | ✅ | ✅ | Funcțional |
| 20 | Reîncarcă | Trendyol Products | ✅ | ✅ | Funcțional |

### Ce trebuie verificat pentru fiecare buton:
1. ✅ Butonul apare și e vizibil
2. ✅ Loading state funcționează (spinner/disabled)
3. ✅ API-ul e apelat corect
4. ✅ Răspunsul API-ului e procesat corect
5. ✅ Toast/notificare la succes
6. ✅ Toast/notificare la eroare cu mesaj relevant
7. ✅ Datele se actualizează în UI după sync
8. ✅ Nu sunt erori în consolă
9. ✅ Funcționează și pe mobile

---

## 📝 ÎMBUNĂTĂȚIRI LOGURI

### 1. Sync Images - Loguri mai specifice
```
Adaugă loguri pentru:
- Ce produs se procesează
- Ce imagini există deja în DB pentru acel produs
- Ce imagini noi încearcă să adauge
- Care sunt conflictele de poziție
- Decizia luată (skip/overwrite/error)
```

### 2. Sync Stock - Loguri pentru debugging
```
Adaugă loguri pentru:
- SKU-uri care NU se găsesc în inventar (deja există, dar să fie mai vizibile)
- Diferențe de casing între MasterProduct.sku și Product.sku
```

### 3. Sync Shopify - Loguri pentru erori imagine
```
Adaugă loguri pentru:
- URL-urile imaginilor trimise la Shopify
- Răspunsul Shopify pentru fiecare imagine
- Care imagini au fost acceptate/respinse
```

---

## 🔄 FLUXURI DE SINCRONIZARE

### A. Flux complet creare produs nou:
```
1. User selectează SKU din dropdown inventar
   → Se copiază: titlu, descriere, preț, STOC
   
2. User selectează canale (ex: Shopify Store 1)

3. User apasă "Creează"
   → POST /api/products (creează MasterProduct)
   → POST /api/products/[id]/channels (pentru fiecare canal)
   → Shopify API: createProduct
   → Salvează shopifyProductId în externalId
```

### B. Flux sincronizare stoc:
```
1. SmartBill → Product (inventar): /api/stock/sync
2. Product (inventar) → Afișare în Produse: la citire (JOIN pe SKU)
3. La emitere factură → decrementare în ambele tabele
```

### C. Flux sincronizare imagini:
```
1. Google Drive folder scanare: /api/products/sync-images GET
2. Google Drive → MasterProductImage: /api/products/sync-images POST
3. MasterProductImage → Shopify: la /api/products/sync-shopify sau la add channel
```

---

## ✅ TASKURI PRIORITARE

### P0 - Critice
- [x] **🎨 RESPONSIVE DESIGN - Optimizare pentru toate rezoluțiile** (PARȚIAL - produse, comenzi)
- [x] **🟠 INTEGRARE TRENDYOL - Comenzi, Campanii, Mapare produse** (EXISTA DEJA - comenzi, mapping, publicare)
- [x] Fix sync images unique constraint error ✅ REZOLVAT
- [x] Ascunde SKU-uri deja adăugate din dropdown creare produs ✅ REZOLVAT
- [ ] Audit complet al tuturor butoanelor de sync (verificare funcționalitate)

### P1 - Importante  
- [x] Afișare produse în pop-up-ul detalii comandă (titlu, SKU, cantitate, preț) ✅ DEJA EXISTA
- [x] Tooltip-uri descriptive pe TOATE butoanele de sync/refresh/test (PARȚIAL - produse, comenzi)
- [x] Overlay cu blur + progress tracking pentru acțiuni de sync ✅ COMPONENTA EXISTA (SyncOverlay)
- [ ] Loguri mai specifice pentru sync images
- [ ] Loguri pentru debugging stock lookup (case sensitivity)
- [ ] Fix Google Drive image URLs pentru Shopify (verificare dacă funcționează `lh3.googleusercontent.com`)

### P2 - Nice to have
- [ ] Progress indicator pentru sync bulk (Shopify, Stock)
- [ ] Retry mecanism pentru sync Shopify când imaginile fail
- [ ] Notificări pentru sync completat/erori
- [x] Componentă `<SyncOverlay>` reutilizabilă pentru toate sync-urile ✅ EXISTA

---

## 🎨 RESPONSIVE DESIGN - PRIORITATE MAXIMĂ

### Breakpoints țintă:
| Dispozitiv | Lățime | Orientare |
|------------|--------|-----------|
| Desktop Large | 1920px+ | Landscape |
| Desktop | 1280px - 1919px | Landscape |
| Laptop | 1024px - 1279px | Landscape |
| Tablet | 768px - 1023px | Landscape/Portrait |
| Mobile Landscape | 568px - 767px | Landscape |
| Mobile Portrait | 320px - 567px | Portrait |

### Pagini de optimizat:

| # | Pagină | Probleme potențiale | Status |
|---|--------|---------------------|--------|
| 1 | Dashboard (`/`) | Grafice, carduri statistici | ✅ Header responsive |
| 2 | Comenzi (`/orders`) | Tabel larg, filtre, dialog detalii | ✅ Complet |
| 3 | Produse (`/products`) | Tabel cu multe coloane, imagini | ✅ Complet |
| 4 | Produs detalii (`/products/[id]`) | Tabs, imagini, canale | ⬜ |
| 5 | Inventar (`/inventory`) | Tabel, filtre | ✅ Complet |
| 6 | Rețete (`/products/recipes`) | Tabel compus/componente | ⬜ Nu există |
| 7 | Magazine (`/stores`) | Carduri, setări | ✅ Complet |
| 8 | Handover (`/handover`) | Scanner, liste | ✅ Complet |
| 9 | Picking (`/picking`) | Scanner, liste produse | ✅ Complet |
| 10 | Ads Dashboard (`/ads`) | Grafice, statistici | ⬜ |
| 11 | Ads Campanii (`/ads/campaigns`) | Tabel, filtre | ⬜ |
| 12 | Ads Conturi (`/ads/accounts`) | Carduri, liste | ✅ Complet |
| 13 | Setări (`/settings`) | Formulare lungi, tabs | ✅ Complet |
| 14 | Categorii (`/categories`) | Tabel simplu | ✅ Complet |
| 15 | Facturi (`/invoices`) | Tabel, PDF viewer | ✅ Header responsive |
| 16 | Sidebar/Navigation | Menu, collapse pe mobile | ✅ Deja existent |
| 17 | Tracking (`/tracking`) | Carduri statistici | ✅ Header responsive |
| 18 | Trendyol (`/trendyol`) | Tabel produse | ✅ Complet |
| 19 | Trendyol Orders | Tabel comenzi | ✅ Complet |
| 20 | Serii Facturi | Tabel serii | ✅ Complet |

### Ce trebuie verificat/implementat pentru fiecare pagină:

#### Layout general:
- [ ] Sidebar se transformă în hamburger menu pe mobile
- [ ] Header-ul se adaptează (butoane -> dropdown pe mobile)
- [ ] Conținutul nu iese din ecran (no horizontal scroll)
- [ ] Spațiere consistentă (padding/margin responsive)

#### Tabele:
- [ ] Tabelele devin carduri pe mobile SAU
- [ ] Tabelele au scroll horizontal pe mobile SAU
- [ ] Coloanele secundare se ascund pe mobile
- [ ] Acțiunile rămân accesibile (dropdown menu)

#### Formulare/Dialoguri:
- [ ] Dialogurile ocupă full-screen pe mobile
- [ ] Input-urile au dimensiune adecvată pentru touch
- [ ] Butoanele sunt suficient de mari pentru touch (min 44px)
- [ ] Tastatura virtuală nu ascunde input-urile

#### Grafice/Vizualizări:
- [ ] Graficele se redimensionează corect
- [ ] Legendele nu se suprapun
- [ ] Touch events funcționează pentru tooltips

#### Imagini:
- [ ] Imaginile se scalează corect
- [ ] Nu se distorsionează (aspect ratio păstrat)
- [ ] Galerii/carusele funcționează pe touch

### Componente UI de verificat:
- [ ] `<Sidebar>` - collapse/hamburger pe mobile
- [ ] `<Table>` - responsive behavior
- [ ] `<Dialog>` - full-screen pe mobile
- [ ] `<Select>` - touch-friendly
- [ ] `<Tabs>` - scroll horizontal pe mobile dacă sunt multe
- [ ] `<Card>` - stack vertical pe mobile
- [ ] `<Button>` - dimensiune touch (44px minim)
- [ ] `<DropdownMenu>` - poziționare corectă pe mobile
- [ ] `<DatePicker>` - touch-friendly
- [ ] `<Toast>` - poziție și dimensiune pe mobile

### Teste necesare:
1. **Chrome DevTools** - toate breakpoints
2. **Safari (iOS)** - iPhone SE, iPhone 14, iPad
3. **Chrome (Android)** - telefoane diverse
4. **Rotire ecran** - landscape ↔ portrait
5. **Zoom browser** - 100%, 125%, 150%

---

## 🟠 INTEGRARE TRENDYOL - PRIORITATE MARE

### Obiectiv general:
Integrare completă cu platforma Trendyol pentru:
- Sincronizare comenzi
- Management campanii
- Mapare produse la SKU-uri locale

### A. SINCRONIZARE COMENZI TRENDYOL

#### Ce trebuie implementat:
- [ ] API endpoint `/api/trendyol/orders/sync` - trage comenzile din Trendyol
- [ ] Salvare comenzi în tabelul `Order` cu `source: "TRENDYOL"`
- [ ] Mapare automată produse Trendyol → SKU-uri locale
- [ ] Suport pentru statusuri Trendyol (Created, Picking, Shipped, Delivered, Cancelled)
- [ ] Webhook pentru comenzi noi (dacă Trendyol suportă)

#### Mapare produse Trendyol → SKU local:
```
Opțiuni de mapare:
1. Barcode Trendyol = SKU local
2. Tabel intermediar TrendyolProductMapping:
   - trendyolProductId
   - trendyolBarcode
   - localSku
   - localProductId (MasterProduct)
3. Mapare manuală din UI pentru produse care nu se potrivesc automat
```

#### Schema nouă necesară:
```prisma
model TrendyolOrder {
  id                    String   @id @default(cuid())
  trendyolOrderId       String   @unique
  trendyolOrderNumber   String
  orderDate             DateTime
  status                String
  // Customer
  customerName          String
  customerAddress       String
  customerCity          String
  customerDistrict      String
  // Financiar
  totalPrice            Decimal
  // Legătură cu Order local (opțional)
  orderId               String?  @unique
  order                 Order?   @relation(fields: [orderId], references: [id])
  // Line items
  lineItems             TrendyolOrderItem[]
  // Timestamps
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}

model TrendyolOrderItem {
  id                    String   @id @default(cuid())
  trendyolOrderId       String
  order                 TrendyolOrder @relation(fields: [trendyolOrderId], references: [id])
  trendyolProductId     String
  barcode               String
  title                 String
  quantity              Int
  price                 Decimal
  // Mapare la produs local
  localSku              String?
  masterProductId       String?
  masterProduct         MasterProduct? @relation(fields: [masterProductId], references: [id])
}

model TrendyolProductMapping {
  id                    String   @id @default(cuid())
  trendyolProductId     String   @unique
  trendyolBarcode       String
  trendyolTitle         String
  localSku              String
  masterProductId       String?
  masterProduct         MasterProduct? @relation(fields: [masterProductId], references: [id])
  isAutoMapped          Boolean  @default(false)
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}
```

### B. MANAGEMENT CAMPANII TRENDYOL

#### Ce trebuie implementat:
- [ ] API endpoint `/api/trendyol/campaigns` - listare campanii active
- [ ] API endpoint `/api/trendyol/campaigns/[id]/products` - produse într-o campanie
- [ ] Vizualizare în UI: ce campanii are fiecare produs
- [ ] Sugestii: în ce campanii ar putea fi adăugat un produs

#### Informații campanii de afișat pentru fiecare produs:
```
MasterProduct / Produs Trendyol:
├── Campanii active:
│   ├── "Black Friday 2026" - discount 20%, ends: 15 Jan
│   ├── "Lichidare Iarnă" - discount 15%, ends: 28 Feb
│   └── "Super Deal" - featured, ends: 10 Jan
├── Campanii disponibile (unde poate fi adăugat):
│   ├── "Valentine's Day" - starts: 1 Feb
│   ├── "Reduceri Primăvară" - starts: 1 Mar
│   └── "Flash Sale Weekend" - starts: 12 Jan
└── Istoric campanii:
    ├── "Crăciun 2025" - discount 25%, sold: 45 units
    └── "11.11 Singles Day" - discount 30%, sold: 120 units
```

#### Schema pentru campanii:
```prisma
model TrendyolCampaign {
  id                    String   @id @default(cuid())
  trendyolCampaignId    String   @unique
  name                  String
  type                  String   // DISCOUNT, FLASH_SALE, FEATURED, etc.
  discountType          String?  // PERCENTAGE, FIXED
  discountValue         Decimal?
  startDate             DateTime
  endDate               DateTime
  status                String   // ACTIVE, UPCOMING, ENDED
  // Produse în campanie
  products              TrendyolCampaignProduct[]
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}

model TrendyolCampaignProduct {
  id                    String   @id @default(cuid())
  campaignId            String
  campaign              TrendyolCampaign @relation(fields: [campaignId], references: [id])
  trendyolProductId     String
  barcode               String
  // Mapare locală
  localSku              String?
  masterProductId       String?
  // Performance în campanie
  unitsSold             Int      @default(0)
  revenue               Decimal  @default(0)
  
  @@unique([campaignId, trendyolProductId])
}
```

### C. UI PENTRU TRENDYOL

#### Pagini noi necesare:
1. **`/trendyol`** - Dashboard Trendyol
   - Sumar comenzi azi/săptămâna/luna
   - Campanii active
   - Produse de mapat

2. **`/trendyol/orders`** - Lista comenzi Trendyol
   - Filtre: status, dată, produs
   - Buton sync
   - Vizualizare mapare produse

3. **`/trendyol/products`** - Produse Trendyol
   - Lista produse din Trendyol
   - Status mapare (mapat/nemapat)
   - Campanii per produs
   - Buton mapare manuală

4. **`/trendyol/campaigns`** - Campanii Trendyol
   - Lista campanii (active, upcoming, ended)
   - Produse per campanie
   - Performance metrics

5. **`/trendyol/mapping`** - Mapare produse
   - Produse nemapate
   - Sugestii de mapare (by barcode, by title similarity)
   - Mapare manuală (dropdown cu SKU-uri locale)

#### Integrare în pagini existente:
- **Produse (`/products`)** - adaugă coloană/badge "Trendyol" cu status
- **Produs detalii (`/products/[id]`)** - tab "Trendyol" cu campanii și performance
- **Dashboard (`/`)** - widget comenzi Trendyol

### D. FLUXURI DE LUCRU

#### Flux 1: Sincronizare comenzi
```
1. Cron job sau buton manual → /api/trendyol/orders/sync
2. Trage comenzi noi din Trendyol API
3. Pentru fiecare comandă:
   a. Creează TrendyolOrder
   b. Pentru fiecare produs:
      - Caută în TrendyolProductMapping după barcode
      - Dacă găsește → setează localSku și masterProductId
      - Dacă nu → marchează ca "de mapat"
   c. Opțional: creează Order local pentru procesare AWB
4. Notificare: "X comenzi noi, Y produse de mapat"
```

#### Flux 2: Mapare produs nou
```
1. Produs nou apare în comandă Trendyol
2. Sistem încearcă auto-mapare:
   a. Barcode Trendyol === SKU local? → mapare automată
   b. Barcode Trendyol === Barcode MasterProduct? → mapare automată
   c. Title similarity > 90%? → sugestie de mapare
3. Dacă nu se poate auto-mapa → apare în lista "De mapat"
4. User mapează manual din UI
5. Maparea se salvează în TrendyolProductMapping
6. Comenzile viitoare folosesc maparea
```

#### Flux 3: Campanii
```
1. Sync campanii: /api/trendyol/campaigns/sync
2. Pentru fiecare campanie:
   a. Salvează detalii campanie
   b. Trage produsele din campanie
   c. Mapează la produse locale
3. UI afișează:
   - Pe produs: "În 3 campanii active"
   - Pe campanie: "45 produse, €12,500 revenue"
```

### E. TRENDYOL API ENDPOINTS NECESARE

```
Comenzi:
- GET /suppliers/{supplierId}/orders - lista comenzi
- GET /suppliers/{supplierId}/orders/{orderId} - detalii comandă
- PUT /suppliers/{supplierId}/orders/{orderId}/status - update status

Produse:
- GET /suppliers/{supplierId}/products - lista produse
- GET /suppliers/{supplierId}/products/{productId} - detalii produs

Campanii (de verificat dacă există):
- GET /suppliers/{supplierId}/campaigns - lista campanii
- GET /suppliers/{supplierId}/campaigns/{campaignId}/products - produse în campanie
```

### F. PRIORITĂȚI IMPLEMENTARE TRENDYOL

| Fază | Ce implementăm | Efort estimat |
|------|----------------|---------------|
| **Faza 1** | Sync comenzi + mapare manuală | 3-4 zile |
| **Faza 2** | Auto-mapare + UI mapare | 2-3 zile |
| **Faza 3** | Campanii (dacă API permite) | 2-3 zile |
| **Faza 4** | Dashboard + analytics | 2-3 zile |

---

## 📊 STATISTICI BUTOANE SYNC

| Pagină | Nr. butoane sync |
|--------|-----------------|
| Comenzi | 4 |
| Produse | 3 |
| Inventar | 2 |
| Magazine | 1 per store |
| Setări | 6 |
| Serii Facturi | 1 |
| Ads Conturi | 1 per cont |
| Ads Pixeli | 1 per cont |
| Ads Campanii | 1 |
| **Trendyol (nou)** | ~5 (comenzi, produse, campanii, mapări) |
| **TOTAL** | ~25+ butoane |

---

## 📅 TIMELINE ESTIMAT

| Săptămâna | Focus |
|-----------|-------|
| S1 | Responsive Design (toate paginile) |
| S2 | Trendyol Faza 1 (sync comenzi + mapare) |
| S3 | Trendyol Faza 2-3 (auto-mapare + campanii) |
| S4 | Audit butoane sync + tooltips + overlay progress |
| S5 | Bug fixes + polish |

---

*Ultima actualizare: 9 Ianuarie 2026*
