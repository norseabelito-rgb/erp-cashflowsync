# API Setari

Documentatie pentru endpoint-urile de setari generale, magazine Shopify, PIN securitate, FanCourier si statusuri AWB necunoscute.

**Surse**: `src/app/api/settings/`, `src/app/api/stores/`

---

## Cuprins

- [Setari Generale](#setari-generale)
- [Magazine Shopify](#magazine-shopify)
- [Test FanCourier](#test-fancourier)
- [PIN Securitate](#pin-securitate)
- [Statusuri AWB Necunoscute](#statusuri-awb-necunoscute)

---

## Setari Generale

**Sursa**: `src/app/api/settings/route.ts`

### GET /api/settings

Obtine setarile aplicatiei. Credentialele sunt mascate in raspuns (afisate ca `--------`).

**Permisiuni**: `settings.view`

**Raspuns** (200):
```json
{
  "settings": {
    "id": "default",
    "fancourierUsername": "user_fc",
    "fancourierPassword": "--------",
    "fancourierClientId": "12345",
    "defaultWeight": 1.0,
    "defaultPackages": 1,
    "googleDriveCredentials": "{ \"type\": \"service_account\", \"project_id\": \"erp-proj\", \"client_email\": \"sa@proj.iam...\", \"_masked\": true }",
    "trendyolSupplierId": "123456",
    "trendyolApiKey": "abc...",
    "trendyolApiSecret": "--------",
    "trendyolCurrencyRate": 5.0,
    "trendyolStoreFrontCode": "RO",
    "aiApiKey": "sk-ant-api0--------key1",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-02-18T10:00:00.000Z"
  }
}
```

### POST /api/settings (alias: PUT, PATCH)

Actualizeaza setarile aplicatiei. Campurile mascate nu sunt suprascrise.

**Permisiuni**: `settings.edit`

**Body**: Oricare din campurile din modelul Settings (fara `id`, `createdAt`, `updatedAt`).

```typescript
{
  fancourierUsername?: string;
  fancourierPassword?: string;    // Nu se suprascrie daca === "--------"
  fancourierClientId?: string;
  defaultWeight?: number;         // Convertit automat la float
  defaultPackages?: number;       // Convertit automat la int
  trendyolSupplierId?: string;
  trendyolApiKey?: string;
  trendyolApiSecret?: string;     // Nu se suprascrie daca === "--------"
  trendyolCurrencyRate?: number;
  googleDriveCredentials?: string; // Nu se suprascrie daca contine _masked
  aiApiKey?: string;              // Nu se suprascrie daca contine "--------"
}
```

**Raspuns** (200):
```json
{
  "success": true,
  "settings": { "...setarile actualizate, cu credentiale mascate..." }
}
```

---

## Magazine Shopify

**Sursa**: `src/app/api/stores/route.ts`, `src/app/api/stores/[id]/route.ts`, `src/app/api/stores/[id]/sync/route.ts`

### GET /api/stores

Lista tuturor magazinelor Shopify cu numar comenzi, serii de facturare si firma asociata.

**Permisiuni**: `stores.view`

**Raspuns** (200):
```json
{
  "stores": [
    {
      "id": "store1",
      "name": "Magazin Principal",
      "shopifyDomain": "magazin.myshopify.com",
      "isActive": true,
      "oblioSeriesName": "FCT",
      "hasOblioCredentials": true,
      "hasWebhookSecret": true,
      "invoiceSeries": { "id": "s1", "name": "Facturi 2025", "prefix": "FCT" },
      "company": { "id": "c1", "name": "SC Firma SRL" },
      "_count": { "orders": 15000 }
    }
  ]
}
```

### POST /api/stores

Adauga un magazin Shopify nou. Testeaza conexiunea la Shopify inainte de salvare.

**Permisiuni**: `stores.manage`

**Body**:
```typescript
{
  name: string;           // Obligatoriu
  shopifyDomain: string;  // Obligatoriu, ex: "magazin.myshopify.com"
  accessToken: string;    // Obligatoriu, Shopify Admin API token
}
```

**Validari**:
- Domeniul este normalizat (lowercase, trim)
- Se verifica duplicatul dupa domeniu
- Se testeaza conexiunea la Shopify API (GET /admin/api/2024-01/shop.json)

**Erori**:
| Status | Mesaj |
|--------|-------|
| 400 | `Toate campurile sunt obligatorii` |
| 400 | `Token-ul de acces este invalid sau a expirat` (401 Shopify) |
| 400 | `Domeniul Shopify nu a fost gasit` (404 Shopify) |
| 400 | `Conexiunea la Shopify a expirat (timeout)` |
| 409 | `Acest magazin exista deja` |

### PUT /api/stores

Actualizeaza un magazin (serie Oblio, firma, serie facturare).

**Permisiuni**: `stores.manage`

**Body**:
```typescript
{
  id: string;                  // Obligatoriu
  oblioSeriesName?: string;    // Seria Oblio (null pentru a dezactiva)
  companyId?: string;          // Firma asociata (null pentru a dezasocia)
  invoiceSeriesId?: string;    // Serie de facturare (null pentru default)
}
```

### PATCH/PUT /api/stores/{id}

Actualizeaza un magazin specific.

**Body**:
```typescript
{
  name?: string;
  shopifyDomain?: string;
  accessToken?: string;
  isActive?: boolean;
  companyId?: string;           // null pentru a dezasocia
  invoiceSeriesId?: string;     // Validat: seria trebuie sa apartina firmei
  webhookSecret?: string;       // null pentru a dezactiva verificarea
}
```

### DELETE /api/stores/{id}

Sterge un magazin si toate datele asociate (comenzi, AWB-uri, facturi, line items).

**Atentie**: Operatie distructiva! Sterge in tranzactie toate entitatile asociate.

### POST /api/stores/{id}/sync

Sincronizeaza comenzile din Shopify pentru un magazin.

**Raspuns** (200):
```json
{
  "synced": 15,
  "errors": ["Eroare la comanda #12345: ..."]
}
```

---

## Test FanCourier

**Sursa**: `src/app/api/settings/test-fancourier/route.ts`

### POST /api/settings/test-fancourier

Testeaza conexiunea la FanCourier API v2.0. Daca parola este mascata sau lipseste, o citeste din baza de date.

**Body** (optional):
```typescript
{
  username?: string;
  password?: string;    // Daca "--------" sau lipsa, se citeste din DB
  clientId?: string;
}
```

**Raspuns succes** (200):
```json
{
  "success": true,
  "message": "Conexiune reusita la FanCourier API v2.0"
}
```

**Raspuns eroare** (200):
```json
{
  "success": false,
  "error": "Credentiale invalide - nu s-a putut obtine token",
  "debug": { "hasUsername": true, "hasPassword": true }
}
```

---

## PIN Securitate

**Sursa**: `src/app/api/settings/pin/route.ts`

### GET /api/settings/pin

Verifica daca PIN-ul de securitate este configurat.

**Permisiuni**: `settings.security`

**Raspuns** (200):
```json
{
  "success": true,
  "configured": true
}
```

### POST /api/settings/pin

Seteaza sau schimba PIN-ul de securitate (exact 6 cifre).

**Permisiuni**: `settings.security`

**Body**:
```typescript
{
  newPin: string;       // Exact 6 cifre
  currentPin?: string;  // Obligatoriu daca PIN-ul este deja configurat
}
```

**Raspuns** (200):
```json
{
  "success": true,
  "message": "PIN set successfully"
}
```

**Erori**:
| Status | Mesaj |
|--------|-------|
| 400 | `PIN must be exactly 6 digits` |
| 400 | `Current PIN is required to change PIN` |
| 400 | `Current PIN is incorrect` |

---

## Statusuri AWB Necunoscute

**Sursa**: `src/app/api/settings/unknown-awb-statuses/route.ts`

Gestioneaza statusurile AWB necunoscute detectate in timpul sincronizarii cu FanCourier.

### GET /api/settings/unknown-awb-statuses

Lista tuturor statusurilor AWB necunoscute, ordonate dupa frecventa.

**Raspuns** (200):
```json
{
  "unknownStatuses": [
    {
      "id": "uawb1",
      "statusCode": "PREDAT_CURIER_RETUR",
      "statusName": "Predat curier retur",
      "firstSeenAt": "2025-02-01T10:00:00.000Z",
      "lastSeenAt": "2025-02-18T10:00:00.000Z",
      "seenCount": 45,
      "sampleAwbNumber": "2900123456",
      "mappedCategory": "RETURN",
      "mappedName": "Retur in tranzit",
      "notes": "Status nou adaugat de FanCourier"
    }
  ]
}
```

### PATCH /api/settings/unknown-awb-statuses

Actualizeaza un status necunoscut (adauga mapare sau note).

**Body**:
```typescript
{
  id: string;              // Obligatoriu
  mappedCategory?: string; // Ex: "DELIVERED", "RETURN", "IN_TRANSIT"
  mappedName?: string;     // Nume descriptiv
  notes?: string;
}
```

### DELETE /api/settings/unknown-awb-statuses?id={id}

Sterge o intrare de status necunoscut.
