# Trendyol Integration - TODO List

## ✅ Implementat

### 1. Conexiune API
- [x] TrendyolClient cu Basic Auth
- [x] Browser headers pentru bypass Cloudflare
- [x] Auto-detectare storeFrontCode (RO, DE, BG, etc.)
- [x] Salvare automată credențiale la test conexiune
- [x] Endpoint-uri International (apigw.trendyol.com)

### 2. Setări UI (`/settings` - tab Trendyol)
- [x] ID Comerciant (Supplier ID)
- [x] Cheie API / Secret API
- [x] Mod Test toggle
- [x] Dropdown StoreFront Code (țară)
- [x] Curs valutar RON → EUR
- [x] Buton testare conexiune

### 3. Listare Produse Trendyol (`/trendyol`)
- [x] Tabel cu produse din cont Trendyol
- [x] Afișare: imagine, titlu, barcode, SKU, stoc, preț EUR, status
- [x] Filtrare după barcode și status
- [x] Paginare
- [x] Statistici (total, active, în așteptare)

### 4. Mapare Categorii (`/trendyol/mapping`)
- [x] Listare categorii ERP cu status mapare
- [x] Dialog căutare categorii Trendyol
- [x] Traducere automată TR → RO (dicționar ~80 termeni)
- [x] Căutare bilingvă (română + turcă)
- [x] Salvare mapping în DB (trendyolCategoryId, trendyolCategoryName)
- [x] Fetch atribute obligatorii per categorie

### 5. Publicare Produse (`/trendyol/publish`)
- [x] UI listare produse cu categorii mapate
- [x] Selecție multiplă produse
- [x] Selecție brand (căutare)
- [x] Endpoint API pentru push produse
- [x] Generare barcode automat din SKU
- [x] Conversie preț RON → EUR

---

## 🔲 De Implementat

### C. Sincronizare Stoc & Preț (Prioritate: MEDIE)

**Ce face:**
Când se modifică stocul (din SmartBill) sau prețul (din ERP) pentru un produs care există pe Trendyol, trimite automat update-ul către Trendyol.

**Pași implementare:**

1. **Creare endpoint API pentru sync**
   ```
   POST /api/trendyol?action=syncInventory
   Body: { productIds: string[] } sau { all: true }
   ```

2. **Funcție în TrendyolClient**
   - Folosește `updatePriceAndInventory()` existent
   - Input: array de `{ barcode, quantity, salePrice, listPrice }`

3. **Logică de sync**
   ```javascript
   // Pentru fiecare produs cu trendyolBarcode setat:
   // 1. Ia stocul curent din MasterProduct.stock
   // 2. Calculează prețul EUR: price / currencyRate
   // 3. Trimite către Trendyol API
   ```

4. **UI în pagina /trendyol**
   - Buton "Sincronizează Stoc & Prețuri"
   - Opțional: checkbox pentru sync automat

5. **Automatizare (opțional)**
   - Cron job sau trigger la modificare stoc
   - WebSocket sau polling pentru SmartBill changes

**Fișiere de modificat:**
- `/src/app/api/trendyol/route.ts` - adaugă action `syncInventory`
- `/src/app/(dashboard)/trendyol/page.tsx` - adaugă buton sync
- `/src/lib/trendyol.ts` - folosește `updatePriceAndInventory()` existent

**Timp estimat:** 1-2 ore

---

### D. Import Comenzi Trendyol (Prioritate: ÎNALTĂ)

**Ce face:**
Aduce comenzile noi din Trendyol în ERP, creează înregistrări Order, permite emitere factură SmartBill și generare AWB.

**Pași implementare:**

1. **Extindere Schema Prisma**
   ```prisma
   model Order {
     // Câmpuri existente...
     
     // Trendyol specific
     trendyolOrderId       String?   // ID comanda Trendyol
     trendyolPackageId     String?   // ID pachet
     trendyolCargoProvider String?   // Firma curierat Trendyol
     trendyolTrackingNumber String?  // AWB Trendyol (dacă ei generează)
     source                String    @default("shopify") // "shopify" | "trendyol" | "manual"
   }
   ```

2. **Endpoint API pentru fetch comenzi**
   ```
   GET /api/trendyol?action=orders&status=Created&startDate=...&endDate=...
   POST /api/trendyol?action=importOrders
   ```

3. **Funcție în TrendyolClient**
   - Folosește `getOrders()` existent
   - Statusuri: Created, Picking, Invoiced, Shipped, Delivered, Cancelled, Returned

4. **Mapare Trendyol Order → ERP Order**
   ```javascript
   // Trendyol returnează:
   {
     orderNumber: "123456789",
     lines: [{
       productName, barcode, quantity, 
       price, vatBaseAmount, discount
     }],
     shipmentAddress: {
       firstName, lastName, address1, city, 
       district, postalCode, phone
     },
     invoiceAddress: {...},
     cargoProviderName,
     cargoTrackingNumber
   }
   
   // Mapare la Order ERP:
   {
     shopifyOrderId: trendyolOrderNumber, // refolosim câmpul
     source: "trendyol",
     customerFirstName, customerLastName,
     shippingAddress1, shippingCity, etc.
     totalPrice, subtotalPrice
     // + OrderItem pentru fiecare line
   }
   ```

5. **UI pagină comenzi Trendyol**
   - Opțiune 1: Tab nou în `/orders` cu filtru source="trendyol"
   - Opțiune 2: Pagină separată `/trendyol/orders`
   - Buton "Import comenzi noi"
   - Afișare comenzi cu status, permite emitere factură/AWB

6. **Integrare cu flow-ul existent**
   - Comenzile Trendyol pot folosi același flow de validare
   - SmartBill: emite factură normal
   - AWB: generează și apoi trimite tracking înapoi la Trendyol (vezi F)

**Fișiere de creat/modificat:**
- `prisma/schema.prisma` - câmpuri noi în Order
- `/src/app/api/trendyol/route.ts` - action `orders`, `importOrders`
- `/src/app/(dashboard)/trendyol/orders/page.tsx` - pagină nouă
- `/src/lib/trendyol.ts` - folosește `getOrders()` existent

**Timp estimat:** 2-3 ore

---

### E. Verificare Status Batch Request (Prioritate: MEDIE)

**Ce face:**
După ce publici produse pe Trendyol, poți verifica dacă au fost aprobate sau respinse, și vezi motivul respingerii.

**Pași implementare:**

1. **Endpoint API**
   ```
   GET /api/trendyol?action=checkBatch&batchRequestId=xxx
   ```
   - Returnează status per produs
   - Statusuri: SUCCESS, FAILED, PROCESSING

2. **Actualizare status în DB**
   ```javascript
   // Pentru fiecare produs din batch:
   await prisma.masterProduct.update({
     where: { trendyolBarcode: item.barcode },
     data: {
       trendyolStatus: item.status === 'SUCCESS' ? 'approved' : 'rejected',
       trendyolError: item.failureReasons?.join(', '),
       trendyolProductId: item.productId // dacă aprobat
     }
   });
   ```

3. **UI în pagina /trendyol/publish sau /trendyol**
   - Coloană status cu badge-uri colorate
   - Buton "Verifică status" per produs sau global
   - Modal cu detalii eroare pentru produse respinse

4. **Automatizare (opțional)**
   - Poll automat la fiecare 5 minute pentru batch-uri pending
   - Notificare când se schimbă statusul

**Fișiere de modificat:**
- `/src/app/api/trendyol/route.ts` - extinde action `checkBatch`
- `/src/app/(dashboard)/trendyol/page.tsx` sau `/publish/page.tsx` - UI status

**Timp estimat:** 30-60 minute

---

### F. Update AWB în Trendyol (Prioritate: MEDIE)

**Ce face:**
După ce generezi AWB-ul (FanCourier/Sameday) pentru o comandă Trendyol, trimite numărul de tracking înapoi la Trendyol pentru ca clientul să poată urmări coletul.

**Pași implementare:**

1. **Endpoint API**
   ```
   POST /api/trendyol?action=updateShipment
   Body: { 
     shipmentPackageId: "xxx",
     trackingNumber: "AWB123456",
     cargoCompanyId: 17 // sau lookup după nume
   }
   ```

2. **Funcție în TrendyolClient**
   ```javascript
   async updateShipmentInfo(shipmentPackageId: string, trackingNumber: string, cargoCompanyId?: number) {
     return this.request(`/integration/order/sellers/${this.config.supplierId}/shipment-packages/${shipmentPackageId}`, {
       method: 'PUT',
       body: JSON.stringify({
         trackingNumber,
         status: 'Shipped',
         cargoCompanyId
       })
     });
   }
   ```

3. **Trigger automat la generare AWB**
   - În API-ul de generare AWB (`/api/awb/route.ts`)
   - După succes, dacă order.source === 'trendyol', apelează updateShipment

4. **Mapare curieri ERP → Trendyol**
   ```javascript
   const courierMap = {
     'fancourier': 17,  // Verifica ID-ul corect în Trendyol
     'sameday': 18,     // Sau alt ID
     'dpd': 19,
     // etc.
   };
   ```

**Fișiere de modificat:**
- `/src/lib/trendyol.ts` - adaugă `updateShipmentInfo()`
- `/src/app/api/trendyol/route.ts` - action `updateShipment`
- `/src/app/api/awb/route.ts` - trigger automat după generare AWB

**Timp estimat:** 1-2 ore

---

### G. Traduceri Complete Categorii (Prioritate: SCĂZUTĂ)

**Ce face:**
Extinde dicționarul de traduceri TR → RO pentru a acoperi mai multe categorii.

**Pași:**
1. Exportă toate categoriile Trendyol într-un CSV
2. Identifică termenii netranduși
3. Adaugă în dicționarul din `/src/lib/trendyol.ts`
4. Sau: integrează Google Translate API pentru traducere automată

**Timp estimat:** 1-2 ore (manual) sau 2-3 ore (cu Google Translate)

---

### H. Dashboard & Rapoarte Trendyol (Prioritate: SCĂZUTĂ)

**Ce face:**
Pagină cu statistici și rapoarte pentru vânzările Trendyol.

**Funcționalități:**
- Vânzări pe zi/săptămână/lună
- Top produse vândute
- Comenzi pe status
- Grafice comparative Shopify vs Trendyol

**Timp estimat:** 3-4 ore

---

## 📋 Ordinea Recomandată de Implementare

1. **D - Import Comenzi** (CRITIC pentru business)
   - Fără asta nu poți procesa vânzările de pe Trendyol

2. **F - Update AWB** (IMPORTANT)
   - Clienții trebuie să poată urmări coletele

3. **E - Verificare Status Batch** (UTIL)
   - Să știi dacă produsele au fost aprobate

4. **C - Sync Stoc & Preț** (AUTOMATIZARE)
   - Reduce munca manuală

5. **G - Traduceri** (NICE TO HAVE)
6. **H - Dashboard** (NICE TO HAVE)

---

## 🔧 Configurare Necesară în Trendyol Partner Panel

Pentru funcționare completă, asigură-te că ai configurat în panoul Trendyol:

1. **API Credentials** - din Settings > API > Integration Information
2. **Cargo Companies** - verifică lista de curieri disponibili
3. **Return Address** - adresa pentru retururi
4. **Warehouse** - depozitul/depozitele tale

---

## 📚 Resurse Utile

- [Trendyol International API Docs](https://developers.trendyol.com/int/docs/intro)
- [Product Integration](https://developers.trendyol.com/int/docs/international-marketplace/int-product-api-endpoints)
- [Order Integration](https://developers.trendyol.com/int/docs/international-marketplace/int-order-api-endpoints)

---

## 🗂️ Structura Fișierelor Trendyol

```
src/
├── lib/
│   └── trendyol.ts              # Client API + tipuri + traduceri
├── app/
│   ├── api/
│   │   └── trendyol/
│   │       └── route.ts         # Toate endpoint-urile API
│   └── (dashboard)/
│       └── trendyol/
│           ├── page.tsx         # Listare produse Trendyol
│           ├── mapping/
│           │   └── page.tsx     # Mapare categorii
│           ├── publish/
│           │   └── page.tsx     # Publicare produse noi
│           └── orders/          # TODO: comenzi Trendyol
│               └── page.tsx
```

---

*Ultima actualizare: Ianuarie 2025*
