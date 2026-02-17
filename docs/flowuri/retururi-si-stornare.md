# Retururi si Stornare

Fluxul de gestionare a retururilor si stornarea facturilor asociate.

## Surse relevante

- `src/lib/returns.ts` - scanare retururi si mapare la comenzi
- `src/lib/manifest/return-manifest.ts` - generare manifest de retur
- `src/lib/manifest/bulk-stornare.ts` - stornare in masa din manifest
- `src/lib/oblio.ts` - metoda `stornoInvoice()` (liniile ~486-529)
- `src/lib/inventory-stock.ts` - readaugare stoc la retur

## Prezentare generala

```
Colet returnat ajunge in depozit
    |
    v
Operator scaneaza AWB-ul de retur
    |
    v
Mapare la comanda originala
    |
    v
Readaugare stoc in inventar (automat)
    |
    v
Generare manifest de retur
    |
    v
Confirmare manifest
    |
    v
Stornare in masa (Oblio) → facturi inverse
```

## Operatii Oblio: Storno vs Cancel vs Delete

| Operatie | Metoda | Endpoint Oblio | Efect contabil | Folosita? |
|----------|--------|---------------|----------------|-----------|
| **Storno** | `stornoInvoice()` | `POST /docs/invoice` cu `referenceDocument.refund=1` | Emite factura inversa (credit note) | **DA - peste tot** |
| **Cancel** | `cancelInvoice()` | `PUT /docs/invoice/cancel` | Marcheaza anulata, fara document invers | Nu (evitat) |
| **Delete** | - | `DELETE /docs/invoice` | Sterge fizic, doar ultima din serie | Nu (periculos) |

**IMPORTANT:** In aceasta aplicatie se foloseste exclusiv `stornoInvoice()` pentru anularea facturilor. Stornarea emite o factura inversa (credit note) care este necesara din punct de vedere contabil.

**Fiser sursa:** `src/lib/oblio.ts`, liniile ~486-529

### Cum functioneaza stornarea in Oblio

```javascript
POST /api/docs/invoice
{
  cif: "RO12345678",
  seriesName: "CFG",
  referenceDocument: {
    type: "Factura",
    refund: 1,              // ← Aceasta activeaza stornarea
    seriesName: "CFG",
    number: 123             // Numarul facturii de stornat
  }
}
```

Oblio creeaza automat o factura inversa pe aceeasi serie si sterge incasarea asociata facturii originale.

## Pasi detaliati

### Pas 1: Scanare AWB de retur

`scanReturnAWB(returnAwbNumber, userId, userName)`

```
[AWB deja scanat?]
    |       |
    DA      NU
    |       |
    v       v
  Eroare   [AWB-ul e al nostru? (in DB)]
            |       |
            DA      NU
            |       |
            v       v
          [In status de retur?]    [Cauta prin alte metode]
            |       |               → match pe prefix
            DA      NU              → match prin orderId
            |       |
            v       v
          Creeaza   Mesaj: "AWB nu e
          ReturnAWB  in status de retur"
          + readaug stoc
```

Statusuri considerate "retur": `returned`, `S6`, `S7`, `S15`, `S16`, `S33`, `S43`

**Fiser sursa:** `src/lib/returns.ts`, liniile ~36-150

### Pas 2: Readaugare stoc automat

La scanarea unui retur, se apeleaza automat `addInventoryStockForReturn(orderId, returnAwbId)`:

1. Gaseste comanda cu `lineItems` si `masterProduct`
2. Pentru fiecare produs din comanda, cauta `InventoryItem` corespunzator
3. Adauga cantitatea inapoi in `WarehouseStock` (depozitul operational)
4. Creeaza `StockMovement` cu tip "RETURN" si referinta la `returnAwbId`
5. Actualizeaza statusul ReturnAWB la `stock_returned`

Verificare idempotenta: daca miscarea de stoc exista deja, nu se dubleaza.

Rezultatul poate fi:
- `success: true, processed: N` - stocul a fost readaugat
- `alreadyProcessed: true` - stocul fusese deja procesat
- `errors: [...]` - erori partiale la unele produse

**Fiser sursa:** `src/lib/returns.ts`, liniile ~119-143

### Pas 3: Generare manifest de retur

`generateReturnManifest(documentDate?, returnAwbIds?)`

1. Gaseste `ReturnAWB`-urile cu status `received` sau `processed`
2. Filtreaza cele care NU sunt deja intr-un manifest neprocesat
3. Pentru fiecare return AWB, identifica:
   - Comanda asociata (din `order` direct sau din `originalAwb.order`)
   - Factura activa asociata comenzii
4. Creeaza `CourierManifest` cu tip `RETURN` si status `DRAFT`
5. Creeaza `ManifestItem` pentru fiecare retur cu link la factura

**Fiser sursa:** `src/lib/manifest/return-manifest.ts`, liniile ~36-139

### Pas 4: Confirmare manifest

Manifestul trece prin starile:

```
DRAFT → CONFIRMED → PROCESSED
```

- **DRAFT**: manifestul a fost generat, poate fi editat
- **CONFIRMED**: manifestul a fost verificat, pregatit pentru stornare
- **PROCESSED**: toate facturile au fost stornate

### Pas 5: Stornare in masa (bulk stornare)

`processReturnManifestStornare(manifestId, userId)`

Preconditii:
- Manifestul trebuie sa fie in status `CONFIRMED`
- Doar itemii cu `invoiceId` sunt procesati

```
Pentru fiecare item din manifest:
    |
    v
[Are factura legata?]
    |       |
    NU      DA
    |       |
    v       v
  Skip    [Factura deja anulata?]
  (error)   |       |
            DA      NU
            |       |
            v       v
          Skip    [Firma are credentiale Oblio?]
          (ok)      |       |
                    DA      NU
                    |       |
                    v       v
                  stornoInvoice()    Skip (error)
                    |
                    v
                  [Stornare OK?]
                    |       |
                    DA      NU
                    |       |
                    v       v
                  Update:     Log eroare
                  - invoice.status="cancelled"
                  - invoice.stornoNumber
                  - invoice.stornoSeries
                  - invoice.cancelReason="Return manifest {id}"
                  - invoice.cancellationSource=MANIFEST_RETURN
                  - manifestItem.status=PROCESSED
                  + Audit log
```

Procesarea fiecarui item este independenta - esuarea unuia NU opreste batch-ul.

**Fiser sursa:** `src/lib/manifest/bulk-stornare.ts`, liniile ~38-249

### Pas 6: Rezultat stornare

Raspunsul contine statistici detaliate:

```typescript
{
  success: boolean;
  totalProcessed: number;    // Total itemi procesati
  successCount: number;      // Stornari reusite
  errorCount: number;        // Stornari esuate
  skippedCount: number;      // Itemi fara factura / deja anulati
  errors: [{                 // Detalii erori
    itemId, awbNumber, invoiceNumber, error
  }]
}
```

## Manifest de livrare (delivery manifest)

Pe langa manifestul de retur, exista si manifestul de livrare care functioneaza similar:

`fetchDeliveryManifest(date, companyId)`

1. Cauta AWB-urile livrate (`fanCourierStatusCode: "S2"`) pe o anumita data
2. Statusul de livrare provine din auto-sync (tracking FanCourier)
3. Filtreaza cele care nu sunt deja in manifeste existente
4. Creeaza `CourierManifest` cu tip `DELIVERY` si status `DRAFT`
5. Folosit pentru marcarea automata a facturilor ca incasate (pentru ramburs)

**Fiser sursa:** `src/lib/manifest/delivery-manifest.ts`, liniile ~31-143

## Statusuri ManifestItem

| Status | Descriere |
|--------|-----------|
| `PENDING` | In asteptare procesare |
| `PROCESSED` | Stornat cu succes |
| `ERROR` | Eroare la stornare (cu mesaj) |

## Surse de anulare (CancellationSource)

- `MANIFEST_RETURN` - anulat din manifestul de retur (bulk stornare)
- `MANUAL` - anulat manual de operator
- `API` - anulat prin API

## Flux complet retur

```
Colet ajunge in depozit
    ↓
Operator: scanReturnAWB("AWB123")
    ↓
Sistem: mapare la comanda #58537
    ↓
Sistem: readaugare 2x "Produs A" in stoc
    ↓
La finalul zilei: generateReturnManifest()
    ↓
Manifest DRAFT cu 15 retururi
    ↓
Manager: confirma manifestul → CONFIRMED
    ↓
Manager: processReturnManifestStornare()
    ↓
Sistem: stornoInvoice() x 15 (independent)
    ↓
Rezultat: 14 reusite, 1 eroare
    ↓
Manifest → PROCESSED
```
