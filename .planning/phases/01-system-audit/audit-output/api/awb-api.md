# API: AWB - Audit

**Auditat:** 2026-01-23
**Base Path:** /api/awb, /api/fancourier
**Status:** OK

## Rezumat

AWB API gestioneaza AWB-urile (scrisori de transport) pentru comenzi. Se integreaza cu FanCourier pentru creare si tracking. Include endpoint-uri pentru listare, creare batch, refresh status si servicii FanCourier.

## Endpoints

### GET /api/awb

| Aspect | Detalii |
|--------|---------|
| Scop | Lista AWB-uri cu filtrare, statistici si paginare |
| Auth | Da - sesiune NextAuth |
| Permisiune | `awb.view` |
| Parametri Query | `status`, `search`, `showAll`, `containsSku`, `containsBarcode`, `page`, `limit`, `noPagination` |
| Response | `{ awbs[], stats, pagination }` |
| Paginare | Da - default 100/pagina |
| Validare | Manual |
| Include | order (cu store, lineItems), statusHistory (ultimele 20) |
| Status | OK |

**Statistici calculate:**
- total, inTransit, delivered, returned, cancelled, pending, errors

**Note:**
- `showAll=false` exclude AWB-urile livrate
- Cautare in: awbNumber, order.shopifyOrderNumber, customer name, lineItems.sku/title
- Suport noPagination pentru compatibilitate

**Fisier sursa:** `src/app/api/awb/route.ts`

---

### POST /api/awb/create

| Aspect | Detalii |
|--------|---------|
| Scop | Creeaza AWB-uri pentru comenzile selectate |
| Auth | Da - sesiune NextAuth |
| Permisiune | `awb.create` |
| Body | `{ orderIds[], options?, createPickingList?, pickingListName?, assignedTo?, createdBy? }` |
| Response | `{ success, created, errors[], pickingList? }` |
| Validare | Manual - verifica orderIds array non-gol |
| Side Effects | Creare AWB FanCourier, picking list optional, print jobs automat |
| Status | OK |

**Flux:**
1. Itereaza prin orderIds
2. Apeleaza `createAWBForOrder(orderId, options)`
3. Colecteaza AWB ids pentru picking list
4. Creeaza PickingList daca cerut
5. Trimite la printare automata (daca exista printer autoPrint)

**Fisier sursa:** `src/app/api/awb/create/route.ts`

---

### POST /api/awb/refresh

| Aspect | Detalii |
|--------|---------|
| Scop | Actualizeaza statusul AWB-urilor din FanCourier |
| Auth | Da - sesiune NextAuth |
| Permisiune | `awb.track` |
| Body | (empty) |
| Response | `{ success, updated, checked, statusChanges, errors[], details[] }` |
| Validare | - |
| Side Effects | Actualizeaza currentStatus, currentStatusDate, adauga in statusHistory |
| Status | OK |

**Note:**
- Apeleaza `syncAWBsFromFanCourier()` din lib/fancourier.ts

**Fisier sursa:** `src/app/api/awb/refresh/route.ts`

---

### GET /api/awb/[id]

| Aspect | Detalii |
|--------|---------|
| Scop | Detalii AWB cu istoric status |
| Auth | Da - sesiune NextAuth |
| Permisiune | `awb.view` |
| Parametri Path | `id` - UUID AWB |
| Response | `{ awb }` cu statusHistory complet |
| Status | OK |

---

### DELETE /api/awb/[id]

| Aspect | Detalii |
|--------|---------|
| Scop | Sterge AWB din baza de date (nu din FanCourier) |
| Auth | Da - sesiune NextAuth |
| Permisiune | `awb.delete` |
| Parametri Path | `id` - UUID AWB |
| Response | `{ success, message }` |
| Status | OK |

**Nota:** Sterge doar local, nu anuleaza in FanCourier.

---

## FanCourier Integration Endpoints

### GET /api/fancourier/services

| Aspect | Detalii |
|--------|---------|
| Scop | Lista servicii FanCourier disponibile |
| Auth | Nu explicit (doar NextAuth implicit) |
| Permisiune | **Lipsa verificare permisiune!** |
| Response | `{ success, services[], raw }` |
| Validare | - |
| Status | OK |

**Note:**
- Returneaza lista de servicii pentru dropdown la creare AWB
- Include datele raw pentru debugging

**Fisier sursa:** `src/app/api/fancourier/services/route.ts`

---

### POST /api/fancourier/test

| Aspect | Detalii |
|--------|---------|
| Scop | Test conexiune FanCourier |
| Auth | Nu explicit |
| Permisiune | **Lipsa verificare permisiune!** |
| Response | `{ success, message }` |
| Status | OK |

---

## Integrare FanCourier

### Token Caching

**PROBLEMA - Referinta CONCERNS.md:**
> "Token Caching Without Expiration Validation" - Tokenul este cached pentru 23 ore fara verificare server-side inainte de utilizare

**Detalii:**
- Token salvat in `src/lib/fancourier.ts` (linii 86-89)
- Cache duration: 23 ore
- Nu exista retry logic daca tokenul expira server-side mai devreme
- Poate cauza erori silentioase la creare AWB

**Recomandare:**
- Adauga token validation request inainte de operatii
- Implementeaza exponential backoff pe auth failures
- Adauga re-auth automata pe 401

### Servicii Folosite

| Operatie | Metoda FanCourier | Endpoint Local |
|----------|-------------------|----------------|
| Autentificare | Token OAuth | intern |
| Creare AWB | POST /shipments | /api/awb/create |
| Tracking | GET /tracking | /api/awb/refresh |
| Servicii | GET /services | /api/fancourier/services |

---

## Observatii de Securitate

1. **Lipsa verificare permisiuni:**
   - `/fancourier/services` - poate fi apelat de orice user autentificat
   - `/fancourier/test` - poate fi apelat de orice user autentificat

2. **Validare input:**
   - `/create` nu valideaza options object
   - Nu se valideaza format UUID pentru orderIds

3. **Stergere incompleta:**
   - DELETE /awb/[id] sterge doar local, nu din FanCourier

## Probleme de Performanta

1. **Refresh AWB-uri:**
   - Sync sincron, poate dura mult la multe AWB-uri active
   - Referinta CONCERNS.md: "Synchronization Operations Block Request Handler"

2. **Stats calculation:**
   - Daca noPagination=false, face query separat pentru statistici
   - La multi AWB-uri poate fi lent

## Model de Date

```typescript
AWB {
  id: string
  orderId: string
  awbNumber: string | null
  serviceType: string | null
  paymentType: string | null  // expeditor/destinatar
  cashOnDelivery: Decimal | null
  currentStatus: string | null
  currentStatusDate: DateTime | null
  errorMessage: string | null
  createdAt: DateTime
  updatedAt: DateTime
}

AWBStatusHistory {
  id: string
  awbId: string
  status: string
  statusDescription: string | null
  statusDate: DateTime
  location: string | null
  createdAt: DateTime
}
```

---

## Referinte CONCERNS.md

| Concern | Endpoint Afectat | Severitate |
|---------|-----------------|------------|
| Token Caching Without Expiration Validation | Toate operatiile FanCourier | MEDIE |
| Synchronization Operations Block Request Handler | /refresh | MEDIE |

---

*Auditat: 2026-01-23*
