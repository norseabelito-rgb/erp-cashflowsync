# Procesare Comanda

Fluxul complet de procesare a unei comenzi: de la selectie pana la livrare.

## Surse relevante

- `src/app/api/orders/process/route.ts` - procesare individuala (1 comanda)
- `src/app/api/orders/process-all/route.ts` - procesare bulk (mai multe comenzi)
- `src/lib/invoice-service.ts` - emitere factura
- `src/lib/awb-service.ts` - creare AWB
- `src/lib/daktela.ts` - sincronizare contact call center

## Prezentare generala

Procesarea unei comenzi parcurge 5 pasi secventiali:

```
Comanda selectata
    |
    v
1. Emitere factura (Oblio)
    |
    v
2. Creare AWB (FanCourier)
    |
    v
3. Creare Picking List + Notificare Pickeri
    |
    v
4. Trimitere AWB la printare
    |
    v
5. Sync contact Daktela (fire-and-forget)
```

## Pasi detaliati

### Pas 0: Autentificare si validare

1. Se verifica sesiunea utilizatorului (`getServerSession`)
2. Se verifica permisiunea `orders.process` (`hasPermission`)
3. Se valideaza ca `orderIds` este un array nevid
4. Se genereaza un `batchId` unic (UUID v4) pentru gruparea erorilor

**Fiser sursa:** `src/app/api/orders/process-all/route.ts`, liniile ~24-70

### Pas 1: Emitere factura

Pentru fiecare comanda, se verifica daca exista deja o factura activa:

```
[Comanda are factura activa?]
    |               |
    DA              NU
    |               |
    v               v
  Skip           issueInvoiceForOrder(orderId)
  (invoice
   existent)        [Factura emisa cu succes?]
                       |            |
                       DA           NU
                       |            |
                       v            v
                    Continua     Salvare ProcessingError
                    la pas 2     (tip: INVOICE, batchId)
```

Verificarea `needsInvoice` (linia ~117-119 in process-all):
- Nu exista factura activa, SAU
- Factura existenta are status `error` sau `deleted`

Detalii complete despre emitere factura: vezi [facturare.md](./facturare.md)

**Fiser sursa:** `src/app/api/orders/process-all/route.ts`, liniile ~115-172

### Pas 2: Creare AWB

AWB-ul se creeaza DOAR daca factura a reusit:

```
[Factura OK?]
    |           |
    DA          NU
    |           |
    v           v
  [AWB existent?]   Stop (nu se creeaza AWB)
    |       |
    DA      NU
    |       |
    v       v
  [AWB valid?]    createAWBForOrder(orderId, awbOptions)
    |       |
    DA      NU (sters/anulat)
    |       |
    v       v
  Skip    Sterge AWB vechi din DB
          apoi creeaza AWB nou
```

Verificarea `needsAwb` (linia ~177-181 in process-all):
- Nu exista AWB, SAU
- AWB-ul nu are `awbNumber`, SAU
- AWB-ul are `errorMessage`, SAU
- Statusul AWB contine "sters" sau "anulat"

Detalii complete despre creare AWB: vezi [creare-awb.md](./creare-awb.md)

**Fiser sursa:** `src/app/api/orders/process-all/route.ts`, liniile ~174-262

### Pas 3: Creare Picking List

Dupa procesarea tuturor comenzilor, se creeaza un Picking List din AWB-urile procesate:

1. Se colecteaza toate `awbIds` cu succes (deduplicate)
2. Se filtreaza AWB-urile care nu sunt deja intr-un picking list existent (`PickingListAWB`)
3. Se incarca line items-urile comenzilor aferente
4. Se agreg produsele pe `sku|variantTitle` (se cumuleaza cantitatile)
5. Se expandeaza retetele (produse compuse din `MasterProduct.recipeAsParent`)
6. Se genereaza cod unic: `PL-{timestamp_base36}`
7. Se creeaza `PickingList` cu items si AWB links intr-o tranzactie

**Structura Picking List:**
- `items` - lista produse de ridicat (cu `isRecipeParent` pentru produse compuse)
- `awbs` - link-uri catre AWB-urile incluse
- `totalItems` / `totalQuantity` - doar produse pickabile (exclude parintii de reteta)

**Fiser sursa:** `src/app/api/orders/process-all/route.ts`, liniile ~305-507

### Pas 4: Notificare Pickeri

1. Se cauta rolul "Picker" in baza de date
2. Se creeaza notificari pentru toti utilizatorii cu acest rol
3. Notificarea contine link direct catre picking list: `/picking/{pickingListId}`

**Fiser sursa:** `src/app/api/orders/process-all/route.ts`, liniile ~562-600

### Pas 5: Trimitere AWB-uri la printare

1. Se cauta o imprimanta cu `autoPrint: true`
2. Se filtreaza AWB-urile cu `awbNumber` valid
3. Se verifica daca exista deja print jobs PENDING pentru aceste AWB-uri
4. Se creeaza `PrintJob` cu `status: PENDING` doar pentru AWB-urile noi

**Fiser sursa:** `src/app/api/orders/process-all/route.ts`, liniile ~603-664

### Pas 6: Sync Daktela (fire-and-forget)

Dupa procesare completa (factura + AWB OK), se sincronizeaza contactul clientului in Daktela:

1. `buildDaktelaContactFromOrder(orderId)` - construieste datele contactului:
   - Agreg numarul de comenzi, total cheltuit, ultimele 5 comenzi
   - Include note client din `CustomerNote`
   - Include magazinele de unde a comandat
2. `syncContactToDaktela(data)` - trimite la API-ul Daktela

Aceasta operatie este **fire-and-forget** - erori nu afecteaza procesarea.

**Fiser sursa:** `src/app/api/orders/process-all/route.ts`, liniile ~274-285; `src/lib/daktela.ts`

## Diferente intre process si process-all

| Aspect | `/orders/process` | `/orders/process-all` |
|--------|-------------------|----------------------|
| Import AWB | `createAWBForOrder` din `fancourier.ts` | `createAWBForOrder` din `awb-service.ts` |
| Picking List | Helper inline | Helper inline (extins) |
| Retete | Expandare recursiva | Expandare din MasterProduct |
| Activity Log | Nu | Da (`logActivity`) |
| Surse order | Fara detectie | Grupeaza pe sursa (Shopify/Trendyol) |

## Statusuri comanda in flux

```
NEW/PENDING → INVOICED → AWB_CREATED → [picking] → [handover] → DELIVERED
                |
                v (daca firma nu e primara)
           intercompanyStatus = "pending"
```

## Gestionare erori

Fiecare eroare de facturare sau AWB:
1. Se salveaza in tabela `ProcessingError` cu `batchId`, `type`, `status: PENDING`
2. Se returneaza in raspunsul API pentru afisare in UI
3. Erorile nu opresc procesarea celorlalte comenzi din batch

## Raspuns API

```json
{
  "success": true/false,
  "stats": {
    "total": 5,
    "success": 4,
    "failed": 1,
    "invoicesIssued": 3,
    "awbsCreated": 4
  },
  "results": [...],
  "errors": [...],
  "batchId": "uuid",
  "pickingList": {
    "id": "...",
    "code": "PL-ABC123",
    "totalItems": 10,
    "totalQuantity": 25
  }
}
```
