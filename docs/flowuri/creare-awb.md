# Creare AWB

Fluxul de creare a unui AWB (scrisoare de transport) prin FanCourier API.

## Surse relevante

- `src/lib/awb-service.ts` - serviciul principal AWB (~524 linii)
- `src/lib/fancourier.ts` - client FanCourier API
- `src/lib/trendyol-awb.ts` - push tracking la Trendyol
- `src/lib/temu-awb.ts` - push tracking la Temu

## Prezentare generala

```
createAWBForOrder(orderId, options)
    |
    v
Lock row-level (FOR UPDATE) → previne duplicate
    |
    v
Validari (AWB existent, firma, credentiale)
    |
    v
Determinare ramburs, serviciu, observatii
    |
    v
Apel FanCourier API → createAWB()
    |
    v
Salvare AWB in DB + actualizare status comanda
    |
    v
Push tracking la Trendyol/Temu (fire-and-forget)
```

## Pasi detaliati

### Pas 1: Lock si incarcare comanda

Se foloseste row-level lock (`SELECT ... FOR UPDATE`) pentru a preveni crearea duplicata de AWB-uri in cazul request-urilor concurente.

```sql
SELECT id FROM "orders" WHERE id = $orderId FOR UPDATE
```

Se incarca comanda cu relatiile: `store.company`, `awb`, `lineItems`, `billingCompany`.

**Fiser sursa:** `src/lib/awb-service.ts`, liniile ~101-118

### Pas 2: Verificare AWB existent

```
[AWB existent cu awbNumber?]
    |               |
    NU              DA
    |               |
    v               v
  Continua      [Poate fi inlocuit?]
                    |           |
                    DA          NU
                    |           |
                    v           v
                  Sterge      Eroare: "AWB deja creat"
                  AWB vechi
```

Un AWB existent poate fi inlocuit daca:
- Are `errorMessage` (creare anterioara esuata)
- Status contine: "sters", "deleted", "anulat", "cancelled", "canceled"

**Fiser sursa:** `src/lib/awb-service.ts`, liniile ~125-148

### Pas 3: Determinare firma pentru AWB

Prioritate:
1. `order.billingCompany` - firma B2B
2. `order.store.company` - firma magazinului

### Pas 4: Detectie mismatch firma

Daca `billingCompany` exista si difera de `store.company`:

```
[Mismatch detectat?]
    |           |
    DA          NU
    |           |
    v           v
  [User a confirmat?]    Continua normal
    |           |
    DA          NU
    |           |
    v           v
  Log override    Returneaza warning:
  + continua      needsConfirmation: true
                  warning.type: "AWB_MISMATCH"
```

**Fiser sursa:** `src/lib/awb-service.ts`, liniile ~161-196

### Pas 5: Verificare credentiale FanCourier

Se verifica ca firma selectata are configurate:
- `fancourierClientId`
- `fancourierUsername`
- `fancourierPassword`

Se creeaza clientul FanCourier cu `createFanCourierClientForCompany(company)`.

**Fiser sursa:** `src/lib/awb-service.ts`, liniile ~199-217

### Pas 6: Obtinere sender info

Datele expeditorului se extrag din firma, cu fallback:
- `senderName` → `company.name`
- `senderPhone` → `company.phone`
- `senderCounty` → `company.county`
- etc.

**Fiser sursa:** `src/lib/awb-service.ts`, liniile ~64-91

### Pas 7: Determinare ramburs si serviciu

```
[Comanda platita online? (financialStatus === "paid")]
    |           |
    DA          NU
    |           |
    v           v
  COD = 0       [paymentType === "destinatar"?]
  paymentType     |           |
  = "expeditor"   DA          NU
  service =       |           |
  "Standard"      v           v
                COD = totalPrice    COD din options
```

Logica serviciu:
- Daca `COD > 0` si serviciul nu e "Cont Colector" → schimba la "Cont Colector"
- Daca `COD = 0` si serviciul e "Cont Colector" → schimba la "Standard"

**Fiser sursa:** `src/lib/awb-service.ts`, liniile ~226-258

### Pas 8: Construire observatii

Se genereaza lista de produse din `lineItems`:
- Format: `"1x Produs A - Varianta, 2x Produs B"`
- Prefix: `"Produse: "`
- Maxim 200 caractere (trunchiat cu "...")

**Fiser sursa:** `src/lib/awb-service.ts`, liniile ~260-285

### Pas 9: Apel FanCourier API

Parametrii trimisi la `fancourier.createAWB()`:
- **Sender**: din firma (nume, telefon, email, adresa)
- **Recipient**: din comanda (client, adresa livrare)
- **Service**: determinat la pas 7
- **Payment**: "sender" (transportul e platit de expeditor, inclus in pret)
- **Parcels**: din options sau settings (default 1)
- **Weight**: din options sau settings (default 1 kg)
- **COD**: rambursul determinat la pas 7
- **DeclaredValue**: totalPrice (rotunjit la 2 zecimale)
- **Options**: "X" (ePOD) + optional "A" (verificare colet daca produsul contine "VERIFICARE COLET")
- **CostCenter**: `store.name || company.name`

**Fiser sursa:** `src/lib/awb-service.ts`, liniile ~297-333

### Pas 10: Salvare rezultat in DB

**In caz de succes:**
1. `AWB.upsert` cu: `awbNumber`, `companyId`, `serviceType`, `paymentType`, `weight`, `packages`, `cashOnDelivery`, `currentStatus: "created"`
2. `Order.update`: `status: "AWB_CREATED"`, `billingCompanyId: company.id`
3. Log in ActivityLog

**In caz de eroare:**
1. `AWB.upsert` cu: `currentStatus: "error"`, `errorMessage`
2. `Order.update`: `status: "AWB_ERROR"`

**Fiser sursa:** `src/lib/awb-service.ts`, liniile ~335-407

### Pas 11: Push tracking la marketplace-uri

Dupa creare cu succes, se trimite numarul AWB la marketplace-ul sursa:

- **Trendyol**: `sendTrackingToTrendyol(orderId, awbNumber, "fancourier")`
- **Temu**: `sendTrackingToTemu(orderId, awbNumber, "fancourier")`

Aceste operatii sunt **fire-and-forget** - erori nu afecteaza succesul AWB-ului.

**Fiser sursa:** `src/lib/awb-service.ts`, liniile ~411-427

## Autentificare FanCourier

- OAuth cu username + password → primeste token JWT
- Token valid 24 ore, cached per companie (key: `clientId:username`)
- Cache previne reautentificarea intre request-uri
- BigInt handling: numere AWB pot depasi `MAX_SAFE_INTEGER`, se foloseste `json-bigint` cu `storeAsString`

**Fiser sursa:** `src/lib/fancourier.ts`, liniile ~69-114

## Erori FanCourier traduse

Erorile FanCourier sunt traduse in romana cu explicatii si recomandari:
- "Locality is invalid" → "Localitatea nu exista in nomenclatorul FanCourier"
- "County is invalid" → "Judetul nu exista..."
- "Phone is invalid" → "Numarul de telefon este invalid"

**Fiser sursa:** `src/lib/fancourier.ts`, liniile ~179-200

## Bulk AWB creation

`createAWBsForOrders(orderIds, options)` proceseaza secvential fiecare comanda si returneaza statistici agregate (`created`, `failed`, `results`).

**Fiser sursa:** `src/lib/awb-service.ts`, liniile ~499-523
