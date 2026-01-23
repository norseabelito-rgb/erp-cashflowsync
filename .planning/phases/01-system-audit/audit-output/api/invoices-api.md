# API: Invoices - Audit

**Auditat:** 2026-01-23
**Base Path:** /api/invoices
**Status:** OK

## Rezumat

Invoices API gestioneaza facturile emise prin Facturis. Contine endpoint-uri pentru listare, emitere batch, anulare si inregistrare plati. Facturile sunt legate de comenzi si sincronizate cu serviciul extern Facturis.

## Endpoints

### GET /api/invoices

| Aspect | Detalii |
|--------|---------|
| Scop | Returneaza lista de facturi cu filtrare |
| Auth | Da - sesiune NextAuth |
| Permisiune | `invoices.view` |
| Parametri Query | `status`, `paymentStatus`, `search` |
| Response | `{ invoices: Invoice[] }` |
| Paginare | Nu - returneaza toate facturile |
| Validare | Manual (parsing din searchParams) |
| Include | order.store, order.shopifyOrderNumber, order.customer* |
| Status | **Potentiala problema: fara paginare** |

**Filtre disponibile:**
- `status`: draft, pending, issued, error, cancelled, deleted
- `paymentStatus`: unpaid, partial, paid
- `search`: cauta in invoiceNumber, invoiceSeriesName, order.shopifyOrderNumber, customer name

**Note:**
- Lipsa paginare poate cauza probleme de performanta pentru volume mari de facturi

**Fisier sursa:** `src/app/api/invoices/route.ts`

---

### POST /api/invoices/issue

| Aspect | Detalii |
|--------|---------|
| Scop | Emite facturi pentru comenzile selectate prin Facturis |
| Auth | Da - sesiune NextAuth |
| Permisiune | `invoices.create` |
| Body | `{ orderIds: string[] }` |
| Response | `{ success, issued, errors?, error? }` |
| Validare | Manual - verifica array non-gol |
| Side Effects | Creare factura in Facturis, actualizare status comanda |
| Status | OK |

**Flux emitere:**
1. Itereaza prin orderIds
2. Apeleaza `issueInvoiceForOrder(orderId)` pentru fiecare
3. Colecteaza rezultatele (issued count, errors)
4. Returneaza success partial daca cel putin o factura a fost emisa

**Comportament erori:**
- Returneaza primul error ca mesaj principal
- Lista completa de erori in `errors[]`
- Status 200 chiar daca unele facturi au esuat (partial success)

**Fisier sursa:** `src/app/api/invoices/issue/route.ts`

---

### POST /api/invoices/[id]/cancel

| Aspect | Detalii |
|--------|---------|
| Scop | Anuleaza o factura emisa in Facturis si local |
| Auth | Nu explicit (doar NextAuth implicit) |
| Permisiune | **Lipsa verificare permisiune!** |
| Parametri Path | `id` - UUID factura |
| Body | `{ reason?: string }` |
| Response | `{ success, message, invoice }` |
| Validare | Manual - verifica existenta factura, status, facturisId |
| Side Effects | Anulare in Facturis, update status local, log activitate, update status comanda -> INVOICE_PENDING |
| Status | **Problema: lipsa verificare permisiune** |

**Flux anulare:**
1. Gaseste factura cu order.store.company
2. Verifica: factura exista, nu e deja anulata, are invoiceNumber
3. Obtine credentiale Facturis din company
4. Apeleaza `facturisClient.cancelInvoice(facturisId)` daca exista facturisId
5. Daca nu exista facturisId, anuleaza doar local
6. Actualizeaza status factura -> cancelled
7. Actualizeaza status comanda -> INVOICE_PENDING
8. Logheaza activitatea

**PROBLEMA SECURITATE:**
> Endpoint-ul nu verifica permisiuni! Orice user autentificat poate anula orice factura.

**Fisier sursa:** `src/app/api/invoices/[id]/cancel/route.ts`

---

### POST /api/invoices/[id]/pay

| Aspect | Detalii |
|--------|---------|
| Scop | Inregistreaza o plata pentru o factura |
| Auth | Nu explicit (doar NextAuth implicit) |
| Permisiune | **Lipsa verificare permisiune!** |
| Parametri Path | `id` - UUID factura |
| Body | `{ amount: number, method?: string }` |
| Response | `{ success, message, invoice }` |
| Validare | Manual - verifica amount > 0 |
| Side Effects | Update paymentStatus, paidAmount, paidAt; log activitate |
| Status | **Problema: lipsa verificare permisiune** |

**Flux inregistrare plata:**
1. Gaseste factura cu order
2. Verifica: amount > 0, status = 'issued', are invoiceNumber
3. Calculeaza nou status plata:
   - unpaid: paidAmount = 0
   - partial: 0 < paidAmount < totalPrice
   - paid: paidAmount >= totalPrice
4. Actualizeaza factura
5. Logheaza activitatea

**PROBLEMA SECURITATE:**
> Endpoint-ul nu verifica permisiuni! Orice user autentificat poate inregistra plati.

**Fisier sursa:** `src/app/api/invoices/[id]/pay/route.ts`

---

## Integrare Facturis

Facturis este serviciul extern pentru facturare. API-ul invoices interactioneaza cu:

| Operatie | Metoda Facturis | Endpoint Local |
|----------|-----------------|----------------|
| Emitere factura | `issueInvoiceForOrder()` | POST /issue |
| Anulare factura | `facturisClient.cancelInvoice()` | POST /[id]/cancel |

**Configuratie necesara:**
- `company.facturisApiKey`
- `company.facturisUsername`
- `company.facturisPassword`

**Vezi:** `src/lib/facturis.ts`, `src/lib/invoice-service.ts`

---

## Observatii de Securitate

1. **Lipsa verificare permisiuni:**
   - `/[id]/cancel` - poate fi apelat de orice user autentificat
   - `/[id]/pay` - poate fi apelat de orice user autentificat
   - Necesita adaugare `hasPermission(session.user.id, "invoices.cancel")` si `invoices.pay`

2. **Validare input:**
   - Validare manuala in loc de Zod schema
   - Nu se valideaza format UUID pentru parametri path

3. **Autorizare store-level:**
   - Nu exista verificare daca user-ul are acces la store-ul facturii

## Probleme de Performanta

1. **Lipsa paginare in GET /invoices:**
   - Returneaza toate facturile fara limit
   - Pentru 10,000+ facturi va cauza probleme de memorie si latenta

## Model de Date

```typescript
Invoice {
  id: string
  orderId: string
  companyId: string
  invoiceNumber: string | null
  invoiceSeriesName: string | null
  facturisId: string | null
  status: 'draft' | 'pending' | 'issued' | 'error' | 'cancelled' | 'deleted'
  errorMessage: string | null
  dueDate: Date | null
  paymentStatus: 'unpaid' | 'partial' | 'paid'
  paidAmount: Decimal | null
  paidAt: Date | null
  cancelledAt: Date | null
  cancelReason: string | null
  stornoNumber: string | null
  stornoSeries: string | null
  pdfUrl: string | null
  issuedAt: Date | null
  createdAt: Date
  updatedAt: Date
}
```

---

## Referinte CONCERNS.md

| Concern | Endpoint Afectat | Severitate |
|---------|-----------------|------------|
| Missing Input Validation in API Routes | Toate | MEDIE |
| RBAC Permission Checks Incomplete | /[id]/cancel, /[id]/pay | CRITICA |

---

*Auditat: 2026-01-23*
