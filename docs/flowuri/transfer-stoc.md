# Transfer Stoc

Fluxul de transfer al stocului intre depozite cand produsele nu sunt disponibile in depozitul operational.

## Surse relevante

- `src/lib/stock-transfer-service.ts` - serviciul principal (~386 linii)
- `src/lib/inventory-stock.ts` - operatii stoc (descarcare la facturare, readaugare la retur)

## Prezentare generala

Cand o comanda necesita produse care nu exista in depozitul operational (de expediere), sistemul propune automat un transfer din alt depozit:

```
Comanda noua
    |
    v
Verificare stoc in depozitul operational
    |
    v
[Stoc suficient?]
    |       |
    DA      NU
    |       |
    v       v
  Continua   Cauta in alte depozite
  procesare    |
               v
             [Gasit in alt depozit?]
               |       |
               DA      NU
               |       |
               v       v
             Propune   Eroare: stoc
             transfer  indisponibil
               |
               v
             Transfer DRAFT
               |
               v
             Aprobare → PENDING
               |
               v
             Executare → COMPLETED
               |
               v
             Comanda poate fi facturata
```

## Concepte cheie

### Depozit operational

Depozitul din care se face expedierea (`warehouse.isOperational = true`). De obicei exista un singur depozit operational activ.

**Fiser sursa:** `src/lib/stock-transfer-service.ts`, liniile ~44-48

### Structura stoc

```
Warehouse (depozit)
    ↓
WarehouseStock (stoc per articol per depozit)
    ↓
InventoryItem (articol inventar, cu costPrice)
    ↓
MasterProduct (produs principal, mapare SKU)
```

### Statusuri transfer

```
DRAFT → PENDING → COMPLETED
  |
  └→ (anulat)
```

- **DRAFT**: propus automat, asteapta aprobare
- **PENDING**: aprobat, asteapta executare fizica
- **COMPLETED**: executat, stocul a fost mutat

## Pasi detaliati

### Pas 1: Verificare stoc pentru comanda

`checkStockForOrder(orderId)`

1. Incarca comanda cu `lineItems` si `masterProduct`
2. Obtine depozitul operational
3. **Optimizare batch**: incarca TOATE `InventoryItem`-urile si `WarehouseStock`-urile in 2-3 query-uri (previne N+1)
4. Pentru fiecare `lineItem`:
   - Gaseste `InventoryItem` (prin `masterProductId` sau `sku`)
   - Verifica `WarehouseStock.currentStock` in depozitul operational
   - Daca stocul e insuficient: cauta in depozitele alternative

**Rezulat:**
```typescript
{
  hasAllStock: boolean;
  missingItems: [{
    sku: string;
    title: string;
    requiredQuantity: number;
    availableInOperational: number;
    missingQuantity: number;
    alternativeWarehouses: [{
      warehouseId, warehouseName, warehouseCode,
      availableQuantity
    }]
  }]
}
```

Depozitele alternative sunt sortate descrescator dupa cantitatea disponibila.

**Fiser sursa:** `src/lib/stock-transfer-service.ts`, liniile ~53-192

### Pas 2: Propunere transfer automat

`proposeTransferForOrder(orderId)`

Daca `checkStockForOrder` indica lipsa de stoc:

1. Se grupeaza lipsurile pe depozite sursa
2. Se alege depozitul cu cel mai mult stoc pentru fiecare produs
3. Se calculeaza cantitatea de transferat: `min(missingQuantity, availableQuantity)`
4. Se genereaza numar transfer: `TRF-{YYYYMMDD}-{count+1}` (ex: `TRF-20260218-001`)
5. Se creeaza `WarehouseTransfer` cu:
   - `fromWarehouseId` = depozitul sursa (cel mai bun)
   - `toWarehouseId` = depozitul operational
   - `status` = "DRAFT"
   - `isAutoProposed` = true
   - `notes` = "Transfer automat propus pentru comanda #58537"
   - `items[]` = lista produse cu cantitati
6. Se actualizeaza comanda:
   - `requiredTransferId` = ID-ul transferului creat
   - `status` = "WAIT_TRANSFER"

**Fiser sursa:** `src/lib/stock-transfer-service.ts`, liniile ~198-327

### Pas 3: Verificare si propunere la sincronizare

`checkAndProposeTransfer(orderId)`

Functie wrapper care:
1. Verifica stocul
2. Daca totul e in stoc → `{ needsTransfer: false }`
3. Daca exista deja un transfer → returneaza referinta
4. Daca nu → propune transfer nou

**Fiser sursa:** `src/lib/stock-transfer-service.ts`, liniile ~333-386

### Pas 4: Aprobare transfer

`approveTransfer(transferId, userId, userName)`

1. Verifica ca transferul exista si este in status DRAFT
2. Schimba statusul la "PENDING"
3. Logeaza aprobarea

**Fiser sursa:** `src/lib/stock-transfer-service.ts`, linia ~391

### Pas 5: Executare transfer

Dupa aprobarea si executarea fizica (mutarea produselor intre depozite):

1. Se actualizeaza `WarehouseStock` in ambele depozite:
   - Scadere stoc in depozitul sursa
   - Crestere stoc in depozitul destinatie
2. Se creeaza miscari de stoc (`StockMovement`) pentru audit
3. Transfer → `status: "COMPLETED"`
4. Comanda poate fi acum facturata (iesire din WAIT_TRANSFER)

## Interactiunea cu facturarea

In `issueInvoiceForOrder()` (din `src/lib/invoice-service.ts`, liniile ~315-350):

```
[Comanda are requiredTransferId?]
    |       |
    DA      NU
    |       |
    v       v
  [Transfer COMPLETED?]    Continua facturare
    |       |
    DA      NU
    |       |
    v       v
  Continua    [User a confirmat?]
  facturare     |       |
                DA      NU
                |       |
                v       v
              Log override    Returneaza warning:
              + continua      needsConfirmation: true
                              type: "TRANSFER_PENDING"
```

Daca transferul nu e finalizat, facturarea NU este blocata hard. Se returneaza un warning pe care utilizatorul il poate confirma (`acknowledgeTransferWarning`).

## Descarcare stoc la facturare

`processInventoryStockForOrderFromPrimary(orderId, invoiceId)` - apelat dupa emiterea facturii:

1. Gaseste depozitul operational
2. Pentru fiecare produs din comanda:
   - Gaseste `InventoryItem` prin `masterProductId` sau `sku`
   - Scade `WarehouseStock.currentStock` cu cantitatea comandata
   - Creeaza `StockMovement` cu tip "SALE" si referinta la `invoiceId`
3. Returneaza: `{ success, processed, skipped, errors, warehouseName }`

**Fiser sursa:** `src/lib/inventory-stock.ts`

## Readaugare stoc la retur

`addInventoryStockForReturn(orderId, returnAwbId)` - apelat la scanarea returului:

1. Gaseste produsele din comanda
2. Adauga cantitatea inapoi in `WarehouseStock`
3. Creeaza `StockMovement` cu tip "RETURN" si referinta la `returnAwbId`
4. Verificare idempotenta: nu dubleaza daca deja procesat

**Fiser sursa:** `src/lib/inventory-stock.ts`

## Flux complet exemplu

```
Comanda #58537: 2x "Produs A", 1x "Produs B"
    |
    v
checkStockForOrder():
  - Produs A: operational=1, necesar=2 → LIPSA 1
  - Produs B: operational=5, necesar=1 → OK
    |
    v
proposeTransferForOrder():
  - Produs A: depozit "Central" are 10 buc
  - Creeaza TRF-20260218-001: Central → Operational, 1x Produs A
  - Comanda → status: WAIT_TRANSFER
    |
    v
Manager aproba transferul → status: PENDING
    |
    v
Operator muta fizic 1x Produs A din Central in Operational
    |
    v
Transfer → status: COMPLETED
  - Central: stoc Produs A: 10 → 9
  - Operational: stoc Produs A: 1 → 2
    |
    v
Comanda poate fi facturata
    |
    v
La facturare → processInventoryStockForOrderFromPrimary():
  - Operational: Produs A: 2 → 0
  - Operational: Produs B: 5 → 4
  - StockMovement: SALE x 2
```
