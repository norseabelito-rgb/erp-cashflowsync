# API Admin

Documentatie pentru endpoint-urile de administrare avansata, accesibile doar super adminilor. Include reparare facturi, sincronizare Daktela, migrare depozite si export schema.

**Surse**: `src/app/api/admin/`

---

## Cuprins

- [Reparare Facturi](#reparare-facturi)
- [Reparare Factura Individuala](#reparare-factura-individuala)
- [Reparare Facturi Bulk](#reparare-facturi-bulk)
- [Sincronizare Daktela](#sincronizare-daktela)
- [Migrare Depozite](#migrare-depozite)
- [Sincronizare Stoc Depozit](#sincronizare-stoc-depozit)
- [Export Schema DB](#export-schema-db)

---

## Reparare Facturi

**Sursa**: `src/app/api/admin/repair-invoices/route.ts`

**Permisiuni**: Super admin only

**Config**: `maxDuration = 300` (5 minute max pentru POST - paginarea prin Oblio poate dura)

### GET /api/admin/repair-invoices

Citeste facturile afectate de bug-ul de auto-facturare din baza de date (instant, fara apel Oblio).

**Raspuns** (200):
```json
{
  "success": true,
  "total": 5,
  "repairedCount": 12,
  "lastScanAt": "2025-02-18T10:00:00.000Z",
  "invoices": [
    {
      "id": "ri1",
      "invoiceNumber": "0001",
      "invoiceSeriesName": "FCT",
      "orderId": "ord1",
      "orderNumber": "#58537",
      "oblioClient": "SC Firma SRL",
      "correctCustomer": "Ion Popescu",
      "total": 149.99,
      "currency": "RON",
      "issuedAt": "2025-02-15T10:00:00.000Z",
      "companyName": "SC Firma SRL"
    }
  ]
}
```

### POST /api/admin/repair-invoices

Scaneaza TOATE facturile din Oblio pentru toate companiile, gaseste auto-facturarile (facturile unde clientul este aceeasi firma ca emitentul) si le salveaza in DB prin upsert (nu creeaza duplicate la scanari repetate).

**Functionare**:
1. Gaseste toate companiile cu credentiale Oblio
2. Pentru fiecare companie, pagineaza prin toate facturile necancelate (batch-uri de 100)
3. Compara numele/CIF-ul clientului cu numele/CIF-ul firmei emitente
4. Daca clientul e firma emitenta, cauta comanda asociata (prin factura din DB sau prin numarul de comanda din mentions)
5. Salveaza rezultatul in `RepairInvoice` (upsert pe serie + numar + companyId)
6. Pauza de 200ms intre paginile Oblio

**Raspuns** (200):
```json
{
  "success": true,
  "totalFound": 17,
  "totalNew": 5,
  "message": "Scan complet. 17 facturi afectate gasite, 5 noi."
}
```

---

## Reparare Factura Individuala

**Sursa**: `src/app/api/admin/repair-invoices/[id]/repair/route.ts`

**Permisiuni**: Super admin only

### POST /api/admin/repair-invoices/{id}/repair

Repara o factura emisa gresit (auto-facturata). Procesul are 5 pasi:

1. **Stornare Oblio** - Emite nota de credit (storno) pentru factura veche
2. **Stergere factura DB** - Sterge factura veche din baza de date
3. **Reset billingCompanyId** - Reseteaza `billingCompanyId` pe comanda la `null` (doar daca era egal cu `store.companyId`)
4. **Re-emitere factura** - Apeleaza `issueInvoiceForOrder()` care emite factura corect
5. **Actualizare RepairInvoice** - Marcheaza ca `repaired` cu noua serie/numar

**Validari pre-reparare**:
- RepairInvoice trebuie sa existe si sa nu fie deja `repaired`
- Factura trebuie sa existe in DB cu status `issued`
- Comanda trebuie sa existe
- Firma trebuie sa aiba credentiale Oblio

**Raspuns succes** (200):
```json
{
  "success": true,
  "oldInvoice": "FCT 0001",
  "newInvoice": "FCT 0002",
  "orderNumber": "#58537"
}
```

**Raspuns eroare stornare** (400):
```json
{
  "success": false,
  "error": "Eroare la stornare Oblio: Invoice not found"
}
```

**Raspuns eroare re-emitere** (400):
```json
{
  "success": false,
  "error": "Stornarea a reusit, dar re-emiterea a esuat: ...",
  "oldInvoiceCancelled": true,
  "oldInvoiceNumber": "FCT 0001"
}
```

**Erori**:
| Status | Mesaj |
|--------|-------|
| 401 | `Neautorizat` |
| 403 | `Doar super admin poate repara facturi` |
| 404 | `Inregistrarea de reparare nu a fost gasita` |
| 400 | `Factura este deja reparata` |
| 404 | `Factura nu a fost gasita in DB` |
| 400 | `Comanda nu a fost gasita` |
| 400 | `Credentiale Oblio neconfigurate` |

**Nota**: Fiecare reparare creeaza o intrare in `AuditLog` cu actiunea `invoice.repaired`.

---

## Reparare Facturi Bulk

**Sursa**: `src/app/api/admin/repair-invoices/bulk-repair/route.ts`

**Permisiuni**: Super admin only

**Config**: `maxDuration = 300` (5 minute max)

### POST /api/admin/repair-invoices/bulk-repair

Repara mai multe facturi afectate de bug-ul de auto-facturare. Proceseaza secvential cu pauza de 500ms intre facturi.

**Body**:
```typescript
{
  repairIds: string[];  // Array de RepairInvoice IDs (max 50)
}
```

**Raspuns** (200):
```json
{
  "success": true,
  "total": 5,
  "succeeded": 4,
  "failed": 1,
  "results": [
    {
      "repairId": "ri1",
      "success": true,
      "oldInvoice": "FCT 0001",
      "newInvoice": "FCT 0006",
      "orderNumber": "#58537"
    },
    {
      "repairId": "ri2",
      "success": false,
      "error": "Comanda negasita"
    }
  ]
}
```

**Validari**:
| Status | Mesaj |
|--------|-------|
| 400 | `repairIds este obligatoriu si trebuie sa fie un array nevid` |
| 400 | `Maximum 50 de facturi per batch` |

**Nota**: Creeaza o intrare in `AuditLog` cu actiunea `invoice.bulk_repaired` si metadatele `totalAttempted`, `totalSuccess`, `totalFailed`.

---

## Sincronizare Daktela

**Sursa**: `src/app/api/admin/daktela-sync/route.ts`

**Permisiuni**: Super admin only

**Config**: `maxDuration = 300` (5 minute max)

### POST /api/admin/daktela-sync

Trimite toate contactele existente (clienti cu comenzi) catre Daktela CRM (bulk sync).

**Functionare**:
1. Gaseste toti clientii unici cu email (din comenzi, `distinct` pe `customerEmail`)
2. Gaseste clientii care au doar telefon (fara email)
3. Pentru fiecare client, construieste contactul Daktela (`buildDaktelaContactFromOrder`) si il sincronizeaza (`syncContactToDaktela`)
4. Proceseaza in batch-uri de 10 cu pauza de 100ms (rate limiting)

**Raspuns** (200):
```json
{
  "success": true,
  "total": 1500,
  "synced": 1480,
  "errors": 20,
  "errorDetails": ["Eroare la client X", "..."]
}
```

**Nota**: `errorDetails` contine maximum 10 mesaje de eroare (primele 10).

---

## Migrare Depozite

**Sursa**: `src/app/api/admin/migrate-warehouse/route.ts`

**Permisiuni**: Super admin only

Endpoint de tip one-shot pentru migrarea datelor la sistemul multi-warehouse. Trebuie apelat o singura data dupa deploy.

### POST /api/admin/migrate-warehouse

Executa migrarea catre sistemul multi-depozit:

1. **Creeaza depozitul principal** - `DEP-PRINCIPAL` cu `isPrimary: true`
2. **Migreaza stocurile** - Copiaza `InventoryItem.currentStock` in `WarehouseStock` (doar articole non-compuse cu stoc > 0)
3. **Actualizeaza miscarile** - Seteaza `warehouseId` pe toate `InventoryStockMovement` care nu au depozit
4. **Actualizeaza receptiile** - Seteaza `warehouseId` pe toate `GoodsReceipt` care nu au depozit
5. **Acorda acces** - Creeaza `UserWarehouseAccess` pentru toti utilizatorii activi

**Verificare pre-migrare**: Daca exista deja depozite in sistem, returneza 400 (migrarea a fost deja efectuata).

**Raspuns succes** (200):
```json
{
  "success": true,
  "message": "Migrarea a fost efectuata cu succes",
  "results": {
    "warehouse": {
      "id": "wh1",
      "code": "DEP-PRINCIPAL",
      "name": "Depozit Principal"
    },
    "migratedStocks": 250,
    "updatedMovements": 1200,
    "updatedReceipts": 50,
    "grantedAccess": 8
  }
}
```

**Erori**:
| Status | Mesaj |
|--------|-------|
| 400 | `Migrarea a fost deja efectuata. Exista deja depozite in sistem.` |

### GET /api/admin/migrate-warehouse

Verifica statusul migrarii.

**Raspuns** (200):
```json
{
  "migrationCompleted": true,
  "stats": {
    "warehouseCount": 1,
    "primaryWarehouse": {
      "id": "wh1",
      "code": "DEP-PRINCIPAL",
      "name": "Depozit Principal"
    },
    "warehouseStockCount": 250,
    "movementsWithWarehouse": 1200,
    "movementsWithoutWarehouse": 0
  }
}
```

---

## Sincronizare Stoc Depozit

**Sursa**: `src/app/api/admin/sync-warehouse-stock/route.ts`

**Permisiuni**: Super admin only

### POST /api/admin/sync-warehouse-stock

Asociaza toate articolele care nu au stoc in niciun depozit cu depozitul principal. Folosit dupa migrare pentru articolele adaugate ulterior.

**Functionare**:
1. Gaseste depozitul principal (`isPrimary: true`)
2. Gaseste articolele non-compuse fara `WarehouseStock`
3. Creeaza `WarehouseStock` cu valorile din `InventoryItem` (`currentStock`, `minStock`)
4. Actualizeaza miscarile de stoc si receptiile fara `warehouseId`

**Raspuns** (200):
```json
{
  "success": true,
  "message": "Sincronizarea a fost efectuata cu succes",
  "results": {
    "warehouse": {
      "id": "wh1",
      "code": "DEP-PRINCIPAL",
      "name": "Depozit Principal"
    },
    "syncedItems": 15,
    "syncedWithStock": 8,
    "updatedMovements": 3,
    "updatedReceipts": 1
  }
}
```

**Erori**:
| Status | Mesaj |
|--------|-------|
| 400 | `Nu exista depozit principal. Creeaza un depozit si seteaza-l ca principal.` |

### GET /api/admin/sync-warehouse-stock

Verifica statusul sincronizarii - cate articole nu au stoc in depozite.

**Raspuns** (200):
```json
{
  "hasPrimaryWarehouse": true,
  "primaryWarehouse": {
    "id": "wh1",
    "code": "DEP-PRINCIPAL",
    "name": "Depozit Principal"
  },
  "stats": {
    "itemsWithoutWarehouseStock": 5,
    "itemsWithWarehouseStock": 250,
    "movementsWithoutWarehouse": 0,
    "receiptsWithoutWarehouse": 0
  },
  "needsSync": true
}
```

---

## Export Schema DB

**Sursa**: `src/app/api/admin/schema-dump/route.ts`

### GET /api/admin/schema-dump

Exporta schema completa a bazei de date PostgreSQL (tabele, coloane, tipuri, indexuri, enum-uri). Folosit pentru compararea intre environment-uri (staging vs production).

**Atentie**: Acest endpoint nu are autentificare explicita in cod. Ar trebui protejat in productie.

**Raspuns** (200):
```json
{
  "exportedAt": "2025-02-18T10:00:00.000Z",
  "tableCount": 45,
  "tables": {
    "Order": {
      "columns": [
        {
          "name": "id",
          "type": "text",
          "nullable": false,
          "default": "gen_random_uuid()"
        },
        {
          "name": "status",
          "type": "USER-DEFINED",
          "nullable": false,
          "default": "'NEW'::\"OrderStatus\""
        }
      ],
      "indexes": [
        {
          "name": "Order_pkey",
          "definition": "CREATE UNIQUE INDEX \"Order_pkey\" ON public.\"Order\" USING btree (id)"
        }
      ]
    }
  },
  "enums": {
    "OrderStatus": ["NEW", "VALIDATED", "INVOICE_PENDING", "INVOICED", "SHIPPED", "DELIVERED", "CANCELLED"]
  }
}
```

**Informatii exportate**:
- Tabele din schema `public` (doar `BASE TABLE`, nu views)
- Coloane cu tipul de date, nullable, valoare default
- Indexuri cu definitia completa
- Enum-uri PostgreSQL cu toate valorile
