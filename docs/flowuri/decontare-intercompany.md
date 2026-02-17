# Decontare Intercompany

Fluxul de decontare intre firma primara (proprietara stocului) si firmele secundare.

## Surse relevante

- `src/lib/intercompany-service.ts` - serviciul complet (~700 linii)
- `src/app/api/intercompany/eligible-orders/route.ts` - comenzi eligibile
- `src/app/api/intercompany/` - endpoint-uri API

## Prezentare generala

Firma primara (ex: Aquaterra) detine stocul si proceseza comenzile. Firmele secundare au magazine proprii dar folosesc stocul firmei primare. Decontarea asigura ca firma primara factureaza firmele secundare la **pret de achizitie** (cost price) + adaos (markup).

```
Comanda pe magazin firma secundara
    ↓
Factura emisa pe firma secundara (catre client)
    ↓
AWB creat + livrat + incasat (ramburs) SAU platit online
    ↓
Comanda devine eligibila pentru decontare
    ↓
Preview decontare (calcul la pret achizitie + adaos)
    ↓
Generare factura intercompany
    ↓
Marcare comenzi ca decontate
```

## Concepte cheie

### Firma primara vs secundara

- **Firma primara** (`company.isPrimary = true`): detine stocul, proceseaza comenzile
- **Firme secundare** (`company.isPrimary = false`): au magazine proprii, vand sub brand propriu
- Fiecare comanda facturata pe o firma secundara (`billingCompanyId`) necesita decontare

### Pret de achizitie (costPrice)

**IMPORTANT:** Decontarea se calculeaza la **pretul de achizitie** din `InventoryItem.costPrice`, NU la pretul clientului (`lineItem.price`). Aceasta este logica centrala a serviciului.

### Adaos (markup)

Adaosul se configureaza per firma secundara: `company.intercompanyMarkup` (default 10%).
Se aplica la subtotalul agregat, NU per linie.

## Pasi detaliati

### Pas 1: Identificare comenzi eligibile

`getEligibleOrdersForSettlement(companyId, periodStart?, periodEnd?)`

Conditii de eligibilitate:
1. `billingCompanyId = companyId` (facturata pe firma secundara)
2. `intercompanyStatus = "pending"` (nedecontata inca)
3. Una din:
   - `awb.isCollected = true` (comanda ramburs, banii au fost incasati de curier)
   - `financialStatus = "paid"` (comanda platita online)

Optional se filtreaza pe perioada (dupa `invoice.issuedAt`).

**Fiser sursa:** `src/lib/intercompany-service.ts`, liniile ~134-214

### Pas 2: Obtinere preturi de achizitie

`getCostPricesForSkus(skus[])`

1. Colecteaza toate SKU-urile unice din comenzile eligibile
2. Cauta in `InventoryItem` pretul de achizitie (`costPrice`) pentru fiecare SKU
3. Returneaza Map<sku, costPrice | null>
4. SKU-urile fara pret de achizitie genereaza **warnings** (dar sunt incluse cu valoare 0)

**Fiser sursa:** `src/lib/intercompany-service.ts`, liniile ~97-106

### Pas 3: Calcul preview decontare

`calculateSettlementFromOrders(companyId, orderIds[])` sau
`generateSettlementPreview(companyId, periodStart?, periodEnd?)`

```
Pentru fiecare comanda:
    |
    v
  Pentru fiecare produs (lineItem):
    |
    v
  costPrice = InventoryItem.costPrice[sku]
    |
    v
  lineTotal = costPrice * quantity
    |
    v
  Agreg pe SKU: totalCostPrice, unitCostPrice
    |
    v
Calcul final:
  subtotal = SUM(totalCostPrice)                    // Total la pret achizitie
  markup = company.intercompanyMarkup (default 10%)
  markupAmount = subtotal * markup / 100
  total = subtotal + markupAmount
```

**Raspuns preview:**
```typescript
{
  companyId, companyName, companyCode,
  periodStart, periodEnd,
  orders: [{
    id, orderNumber,
    totalPrice,        // Ce a platit clientul
    costTotal,         // Pret achizitie total
    paymentType,       // "cod" sau "online"
    selected: true     // Pre-selectat pentru UI
  }],
  lineItems: [{
    sku, title, quantity,
    unitCost,          // Pret achizitie unitar
    markup,            // Adaos %
    lineTotal          // Total cu adaos
  }],
  warnings: ["SKU123: Pret achizitie lipsa"],
  totals: {
    orderCount,
    subtotal,          // Fara adaos
    markupPercent,
    markupAmount,
    total              // Cu adaos
  }
}
```

**Fiser sursa:** `src/lib/intercompany-service.ts`, liniile ~224-384

### Pas 4: Generare factura intercompany

`generateIntercompanyInvoice(companyId, orderIds?, periodStart?, periodEnd?)`

1. Calculeaza preview-ul (din `orderIds` specifice sau toate eligibile)
2. Obtine firma primara (`isPrimary: true`)
3. Intr-o **tranzactie atomica**:
   a. Genereaza numar unic: `IC-{year}-{count+1}` (ex: `IC-2026-00001`)
   b. Creeaza `IntercompanyInvoice`:
      - `issuedByCompanyId` = firma primara
      - `receivedByCompanyId` = firma secundara
      - `totalValue` = total cu markup
      - `totalVat` = 0 (intre firme, TVA 0)
      - `markupPercent` = adaosul aplicat
      - `lineItems` = JSON cu detalii produse
      - `status` = "pending"
   c. Leaga comenzile de factura (`IntercompanyOrderLink`)
   d. Marcheaza fiecare comanda: `intercompanyStatus = "settled"`

**IMPORTANT:** Tranzactia asigura atomicitate - nu se pot marca comenzi ca decontate fara a crea factura.

**Fiser sursa:** `src/lib/intercompany-service.ts`, liniile ~528-623

### Pas 5: Marcare ca platita

`markIntercompanyInvoiceAsPaid(invoiceId)`

Actualizeaza factura intercompany: `status = "paid"`, `paidAt = now`.

**Fiser sursa:** `src/lib/intercompany-service.ts`, liniile ~628-657

## Statusuri intercompany pe comanda

```
(factura emisa pe firma secundara)
    ↓
intercompanyStatus = "pending"
    ↓
(decontare generata)
    ↓
intercompanyStatus = "settled"
```

## Statusuri factura intercompany

```
pending → paid
```

## Diagrama flux complet

```
Comanda #58537 pe magazin "BrandX" (firma secundara)
    |
    v
Factura CFG000123 emisa pe firma "BrandX SRL"
    |  → order.billingCompanyId = brandx_id
    |  → order.intercompanyStatus = "pending"
    |
    v
AWB creat + livrat + curier incaseaza rambursul
    |  → awb.isCollected = true
    |
    v
Comanda devine eligibila pentru decontare
    |
    v
Manager deschide pagina Decontare Intercompany
    |  → getEligibleOrdersForSettlement(brandx_id)
    |  → afiseaza 50 comenzi eligibile
    |
    v
Manager selecteaza 30 comenzi si apasa "Preview"
    |  → calculateSettlementFromOrders(brandx_id, [30 ids])
    |  → Subtotal (pret achizitie): 15.000 RON
    |  → Adaos 10%: 1.500 RON
    |  → Total: 16.500 RON
    |  → Warnings: "SKU999: Pret achizitie lipsa"
    |
    v
Manager apasa "Genereaza Factura"
    |  → generateIntercompanyInvoice(brandx_id, [30 ids])
    |  → IntercompanyInvoice IC-2026-00015 creata
    |  → 30 comenzi marcate ca "settled"
    |
    v
Contabilitate transfera banii
    |  → markIntercompanyInvoiceAsPaid(invoice_id)
    |
    v
Factura intercompany: status = "paid"
```

## Lista facturi intercompany

`getIntercompanyInvoices(filters?)` permite filtrare dupa:
- `companyId` - firma secundara
- `status` - "pending" / "paid"
- Paginare: `limit`, `offset`

Include relatii: `issuedByCompany`, `receivedByCompany`, `_count.includedOrders`.

**Fiser sursa:** `src/lib/intercompany-service.ts`, liniile ~662-699
