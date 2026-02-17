# Facturare

Fluxul complet de emitere a unei facturi prin Oblio API.

## Surse relevante

- `src/lib/invoice-service.ts` - serviciul principal de facturare (~815 linii)
- `src/lib/oblio.ts` - client API Oblio (~738 linii)
- `src/lib/invoice-series.ts` - gestionare serii de facturare
- `src/lib/invoice-helpers.ts` - utilitati (getActiveInvoice, hasIssuedInvoice)
- `src/lib/invoice-errors.ts` - mesaje de eroare localizate

## Prezentare generala

```
issueInvoiceForOrder(orderId)
    |
    v
Pre-flight checks (15 validari)
    |
    v
Determinare firma de facturare
    |
    v
Determinare serie facturare (4 nivele de prioritate)
    |
    v
Construire date factura (client, produse, TVA)
    |
    v
Apel Oblio API → createInvoice()
    |
    v
Salvare in DB + Actualizare status comanda
    |
    v
Post-processing (PDF, stoc, Trendyol, ActivityLog)
```

## Pasi detaliati

### Pas 1: Incarcare comanda cu relatii

Se incarca comanda cu toate relatiile necesare:
- `lineItems` - produsele din comanda
- `store` → `company`, `invoiceSeries` - firma si seria magazinului
- `invoices` - facturile existente
- `billingCompany` - firma de facturare B2B (daca exista)
- `requiredTransfer` - transferul necesar (daca exista)

**Fiser sursa:** `src/lib/invoice-service.ts`, liniile ~275-290

### Pas 2: Pre-flight checks

Verificarile se fac secvential. La prima eroare, se returneaza imediat:

1. **Comanda exista?** → errorCode: `ORDER_NOT_FOUND`
2. **Factura deja emisa?** → `hasIssuedInvoice(order.invoices)` → `ALREADY_ISSUED`
3. **Transfer nefinalizat?** → Daca `requiredTransfer.status !== "COMPLETED"`:
   - Fara confirmare: returneaza `needsConfirmation: true` cu warning
   - Cu confirmare (`options.acknowledgeTransferWarning`): logeaza override si continua
4. **Firma exista?** → `billingCompany || store.company` → `NO_COMPANY`
5. **Credentiale Oblio?** → `hasOblioCredentials(company)` → `NO_CREDENTIALS`
6. **CIF Oblio?** → `company.oblioCif || company.cif` → `NO_OBLIO_CIF`
7. **Comanda are produse?** → `lineItems.length === 0` → `NO_LINE_ITEMS`
8. **Cantitate valida?** → `item.quantity <= 0` → `INVALID_ITEM_QUANTITY`
9. **Pret valid?** → `item.price < 0` → `INVALID_ITEM_PRICE`

**Fiser sursa:** `src/lib/invoice-service.ts`, liniile ~295-409

### Pas 3: Determinare firma de facturare

Prioritate:
1. `order.billingCompany` - firma B2B setata explicit la sincronizare
2. `order.store.company` - firma asociata magazinului

**IMPORTANT:** `billingCompanyId` pe Order NU se mai seteaza la facturare (a fost eliminat). Se seteaza doar la sincronizare pentru comenzi B2B reale.

**Fiser sursa:** `src/lib/invoice-service.ts`, liniile ~354-363

### Pas 4: Determinare serie de facturare

Ierarhia de prioritate (4 nivele):

```
[Comanda Temu?] → TemuStore.invoiceSeriesName → seriesSource: "temu_store"
    |                                              useOblioNumbering: true
    v
[Comanda Trendyol?] → TrendyolStore.invoiceSeriesName → seriesSource: "trendyol_store"
    |                                                      useOblioNumbering: true
    v
[Store are oblioSeriesName?] → store.oblioSeriesName → seriesSource: "oblio_direct"
    |                                                    useOblioNumbering: true
    v
[Store are invoiceSeries?] → store.invoiceSeries → seriesSource: "store"
    |                                                useOblioNumbering: false
    v
[Company default] → getInvoiceSeriesForCompany() → seriesSource: "company_default"
                                                     useOblioNumbering: false
```

Diferenta intre moduri:
- **`useOblioNumbering: true`** - Oblio genereaza numarul automat
- **`useOblioNumbering: false`** - numar local din `InvoiceSeries.currentNumber` (cu atomic increment)

**Fiser sursa:** `src/lib/invoice-service.ts`, liniile ~416-494

### Pas 5: Generare numar factura (doar serie locala)

Daca `useOblioNumbering === false`:

1. `getNextInvoiceNumber(seriesId)` - tranzactie atomica:
   - Corecteaza numar negativ/zero
   - Corecteaza sub `startNumber`
   - Detecteaza gap-uri (compara cu ultima factura emisa)
   - Incrementeaza counter atomic
2. Salveaza `previousNumber` pentru rollback in caz de eroare
3. Formateaza: `${prefix}${number.padStart(padding, '0')}` (ex: `CFG000123`)

**Fiser sursa:** `src/lib/invoice-series.ts`, liniile ~33-100

### Pas 6: Detectie B2B real (isRealB2B)

```
isRealB2B = order.billingCompany existe
            SI
            order.billingCompany.id !== order.store?.companyId
```

Aceasta verificare previne tratarea companiei proprii a magazinului ca si client B2B. Cand compania de facturare este aceeasi cu cea a magazinului, clientul este tratat ca persoana fizica.

Impactul `isRealB2B`:
- **true**: client.name = billingCompany.name, client.cif = billingCompany.cif, isTaxPayer = true
- **false**: client.name = customerFirstName + customerLastName, fara CIF

**Fiser sursa:** `src/lib/invoice-service.ts`, linia ~560

### Pas 7: Construire date factura Oblio

Structura `OblioInvoiceData`:
- **cif**: CIF-ul firmei emitente (`company.oblioCif || company.cif`)
- **seriesName**: seria de facturare Oblio
- **client**: datele clientului (PF sau PJ, in functie de isRealB2B)
- **issueDate**: data curenta formatata YYYY-MM-DD
- **currency**: din comanda (default RON)
- **mentions**: `"Comanda online: {orderNumber}"` - IMPORTANT pentru reconciliere
- **products**: mapate cu `createOblioInvoiceItem()`:
  - Pret cu TVA inclus (`vatIncluded: true`)
  - Cota TVA din `company.defaultVatRate` (default 19%)
  - Unitate masura: "buc"
  - Tip produs: "Piese"

**Fiser sursa:** `src/lib/invoice-service.ts`, liniile ~559-618

### Pas 8: Apel Oblio API

```
oblio.createInvoice(invoiceData)
    |
    v
POST /api/docs/invoice
    |
    v
[Succes?]
    |       |
    DA      NU
    |       |
    v       v
  response.data    Rollback numar local
  → invoiceNumber    + saveFailedInvoiceAttempt()
  → invoiceSeries     → returneaza eroare
  → link
```

Retry logic in clientul Oblio (`src/lib/oblio.ts`, linia ~246):
- MAX_RETRIES = 2 (3 incercari total)
- NU se fac retry-uri pentru erori de autentificare (401) sau validare (400)
- Delay progresiv intre retry-uri: 1s, 2s

**Fiser sursa:** `src/lib/oblio.ts`, liniile ~371-417

### Pas 9: Salvare in DB (tranzactie atomica)

Intr-o singura tranzactie Prisma:

1. **Salvare/actualizare factura** (`saveInvoiceToDatabase`):
   - Daca exista factura anterioara (pending/error/cancelled) → update
   - Altfel → create
   - Campuri: companyId, invoiceNumber, invoiceSeriesName, oblioId, status="issued", pdfData, paymentStatus
2. **Actualizare status comanda** → `status: "INVOICED"`
3. **Marcare intercompany** → daca firma NU e primara: `intercompanyStatus: "pending"`

**IMPORTANT:** `billingCompanyId` NU se mai suprascrie la facturare (linia ~701-702).

**Fiser sursa:** `src/lib/invoice-service.ts`, liniile ~685-716

### Pas 10: Post-processing (non-blocking)

Dupa tranzactia atomica, urmatoarele operatii ruleaza independent:

1. **ActivityLog** - logeaza emiterea facturii
2. **Descarcare stoc** - `processInventoryStockForOrderFromPrimary(orderId, invoiceId)`
3. **Trendyol** - pentru comenzi Trendyol: trimite link factura la Trendyol API
4. **PDF** - descarcare optionala PDF de la Oblio (salvat in DB)

Erorile la post-processing NU afecteaza succesul facturarii.

**Fiser sursa:** `src/lib/invoice-service.ts`, liniile ~718-776

## Stornare vs Cancel vs Delete in Oblio

| Operatie | Metoda API | Endpoint | Efect |
|----------|-----------|----------|-------|
| **Storno** | `stornoInvoice()` | POST `/docs/invoice` cu `referenceDocument.refund=1` | Emite factura inversa (credit note). **Folosita in aplicatie.** |
| **Cancel** | `cancelInvoice()` | PUT `/docs/invoice/cancel` | Marcheaza ca anulata. Fara document invers. |
| **Delete** | - | DELETE `/docs/invoice` | Sterge fizic. Doar ultima din serie. |

**IMPORTANT:** Aplicatia foloseste `stornoInvoice()` peste tot (inclusiv in bulk-stornare din manifeste de retur). Cancel-ul simplu nu genereaza document contabil invers.

**Fiser sursa:** `src/lib/oblio.ts`, liniile ~461-529

## Anulare factura (cancelInvoice din invoice-service)

1. Gaseste factura cu status "issued" pentru comanda
2. Apeleaza `oblio.stornoInvoice()` (NU cancelInvoice!) → emite factura inversa
3. Actualizeaza factura: `status: "cancelled"`, `stornoNumber`, `stornoSeries`
4. Reverteste statusul comenzii la `INVOICE_PENDING`

**Fiser sursa:** `src/lib/invoice-service.ts`, liniile ~1007-1065

## Gestionare erori si rollback

- **Rollback numar factura**: daca emiterea esueaza si s-a folosit serie locala, se face rollback la `previousNumber`
- **Failed Invoice Attempt**: la erori Oblio, se salveaza in `FailedInvoiceAttempt` cu `errorCode`, `attemptNumber` pentru retry ulterior
- **Tipuri erori**: `OblioValidationError` (400), `OblioAuthError` (401), `OblioApiError` (alte coduri)

## Verificare canIssueInvoice

Functie separata care verifica pre-conditiile fara a emite factura. Utila pentru UI (buton activ/inactiv).

Verificari: comanda exista, factura neemisa, transfer finalizat, produse existente, firma asociata, credentiale Oblio, CIF configurat, serie de facturare.

**Fiser sursa:** `src/lib/invoice-service.ts`, liniile ~821-890
