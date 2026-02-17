# Integrari Externe

## Privire de Ansamblu

| Integrare | Fisier | Scop | Autentificare |
|---|---|---|---|
| **Oblio** | `src/lib/oblio.ts` | Facturare electronica | OAuth 2.0 (email + secret token) |
| **FanCourier** | `src/lib/fancourier.ts` | Curierat / AWB | Token JWT (username + password + clientId) |
| **Shopify** | `src/lib/shopify.ts` | Comenzi e-commerce | Access Token per store |
| **Trendyol** | `src/lib/trendyol.ts` | Marketplace Turcia/RO/DE | Basic Auth (API key + secret) |
| **Temu** | `src/lib/temu.ts` | Marketplace global | OAuth + MD5 Signature |
| **Daktela** | `src/lib/daktela.ts` | CRM / Call Center | API Token |
| **ANAF** | `src/lib/anaf.ts` | Validare CUI/CIF | Public (fara autentificare) |
| **Google Drive** | `src/lib/google-drive.ts` | Imagini produse + Backup | Service Account (JSON) |
| **Meta Ads** | `src/lib/meta-ads.ts` | Advertising Facebook | OAuth 2.0 Access Token |
| **TikTok Ads** | `src/lib/tiktok-ads.ts` | Advertising TikTok | OAuth 2.0 Access Token |

---

## Oblio (Facturare)

**Fisier:** `src/lib/oblio.ts`
**URL API:** `https://www.oblio.eu/api`
**Documentatie:** https://www.oblio.eu/api

### Autentificare

OAuth 2.0 cu credentiale per firma:
- `email` (client_id) - emailul contului Oblio
- `secretToken` (client_secret) - token din Setari > Date Cont
- `cif` - CIF-ul firmei pentru care se emit facturi

Token-ul se obtine de la `POST /authorize/token` si este cache-uit in memorie.

### Credentiale

Stocate in modelul `Company`:
- `company.oblioEmail`
- `company.oblioSecretToken`
- `company.oblioCif`

### Operatii Principale

| Metoda | HTTP | Endpoint | Descriere |
|---|---|---|---|
| `createInvoice()` | POST | `/docs/invoice` | Emite factura noua |
| `stornoInvoice()` | POST | `/docs/invoice` | Emite nota de credit (stornare) - cu `referenceDocument.refund=1` |
| `cancelInvoice()` | PUT | `/docs/invoice/cancel` | Marcheaza factura ca anulata (fara nota de credit) |
| `deleteInvoice()` | DELETE | `/docs/invoice` | Sterge factura (doar ultima din serie) |
| `getInvoice()` | GET | `/docs/invoice` | Obtine detalii factura |
| `listInvoices()` | GET | `/docs/invoice/list` | Lista facturi cu paginare (max 100/pagina) |

### Date Factură

Structura `OblioInvoiceData`:
- Informatii firma: `cif`, `seriesName`
- Informatii client: `name`, `cif`, `address`, `city`, `country`, `email`, `phone`
- Produse: array de `OblioInvoiceItem` cu `name`, `price`, `quantity`, `vatPercentage`, `vatIncluded`
- Date document: `issueDate`, `dueDate`, `mentions`

### Note Importante

- **Stornare vs Cancel vs Delete:** Se foloseste `stornoInvoice()` care emite nota de credit. `cancelInvoice()` doar marcheaza, `deleteInvoice()` sterge doar ultima din serie.
- **Mentions:** Contine referinta comenzii: `"Comanda online: #58537"`
- **Client filter:** Parametrul `client` cauta dupa CIF/email/telefon/cod, NU dupa nume
- Timeout: 30 secunde, max 2 retry-uri

---

## FanCourier (Curierat)

**Fisier:** `src/lib/fancourier.ts`
**URL API:** `https://api.fancourier.ro`

### Autentificare

Token JWT (valid 24h) obtinut cu username + password. Token cache-uit per companie (dupa `clientId:username`).

### Credentiale

Stocate in modelul `Company`:
- `company.fancourierClientId`
- `company.fancourierUsername`
- `company.fancourierPassword`

### Operatii Principale

| Metoda | HTTP | Descriere |
|---|---|---|
| `createAWB()` | POST `/reports/awb` | Creeaza AWB nou |
| `deleteAWB()` | DELETE | Sterge AWB |
| `getAWBStatus()` | GET | Obtine status AWB |
| `syncAWBsFromFanCourier()` | GET | Sincronizeaza statusuri pentru toate AWB-urile active |
| `backfillPostalCodes()` | GET | Populeaza coduri postale din nomenclator |
| `getTracking()` | GET | Tracking detaliat |

### Note Tehnice

- Foloseste `json-bigint` pentru parsarea raspunsurilor (numerele AWB depasesc `Number.MAX_SAFE_INTEGER`)
- Sender info stocat pe Company: `senderName`, `senderPhone`, `senderCounty`, `senderCity`, etc.
- Statusuri FanCourier mapate in `src/lib/fancourier-statuses.ts` cu coduri (C0, S2, H4, etc.)

---

## Shopify (E-commerce)

**Fisier:** `src/lib/shopify.ts`
**URL API:** `https://{domain}/admin/api/2024-01/`

### Autentificare

Access Token per store, stocat in `Store.accessToken`. Header: `X-Shopify-Access-Token`.

### Operatii Principale

| Metoda | Descriere |
|---|---|
| `syncAllStoresOrders()` | Sincronizeaza comenzi de la toate store-urile active |
| `syncStoreOrders(store)` | Sincronizeaza comenzi dintr-un store specific |
| `createDraftOrder()` | Creeaza comanda manuala (draft order) in Shopify |
| `getProducts()` | Obtine lista produse |
| `updateProduct()` | Actualizeaza produs in Shopify |

### Flux Sincronizare

1. Pentru fiecare store activ -> `syncStoreOrders()`
2. Obtine comenzi noi/actualizate de la Shopify API
3. Upsert in tabelul `Order` (dupa `shopifyOrderId + storeId`)
4. Salveaza `LineItem`-urile asociate
5. Sincronizeaza contact catre Daktela (`syncContactToDaktela`)
6. Logheaza in `SyncLog`

---

## Trendyol (Marketplace)

**Fisier:** `src/lib/trendyol.ts`
**URL API (Production):** `https://apigw.trendyol.com`
**URL API (Test):** `https://stageapi.trendyol.com`

### Autentificare

Basic Auth: Base64 encode de `"API_KEY:API_SECRET"`.

### Credentiale

Stocate in modelul `TrendyolStore`:
- `supplierId` - ID furnizor Trendyol
- `apiKey` / `apiSecret` - Credentiale API
- `storeFrontCode` - "RO", "DE", "BG", "TR"

### Operatii Principale

| Metoda | Descriere |
|---|---|
| `getCategories()` | Obtine categorii Trendyol |
| `getBrands()` | Cauta branduri |
| `getCategoryAttributes()` | Atribute obligatorii per categorie |
| `createProducts()` | Publica produse (batch) |
| `updateProducts()` | Actualizeaza stoc/pret (batch) |
| `getOrders()` | Obtine comenzi noi |

### Servicii Asociate

- `src/lib/trendyol-order-sync.ts` - Sincronizare comenzi
- `src/lib/trendyol-stock-sync.ts` - Sincronizare stoc si preturi
- `src/lib/trendyol-awb.ts` - Trimitere tracking catre Trendyol
- `src/lib/trendyol-invoice.ts` - Trimitere link factura
- `src/lib/trendyol-returns.ts` - Gestionare retururi
- `src/lib/trendyol-batch-status.ts` - Verificare status batch
- `src/lib/trendyol-category-ai.ts` - Matching categorii cu AI
- `src/lib/trendyol-courier-map.ts` - Mapare curieri

---

## Temu (Marketplace)

**Fisier:** `src/lib/temu.ts`
**URL API (EU):** `https://openapi-b-eu.temu.com/openapi/router`

### Autentificare

OAuth + semnatura MD5:
- `access_token` - valabil 3 luni, necesita re-autorizare
- **Semnatura:** MD5 hash al parametrilor sortati, inveliti cu `appSecret`

### Credentiale

Stocate in modelul `TemuStore`:
- `appKey` / `appSecret` - Credentiale aplicatie
- `accessToken` - Token acces (3 luni)
- `region` - EU, US, GLOBAL

### Operatii Principale

| Metoda | Descriere |
|---|---|
| `getOrders()` | Obtine comenzi |
| `getOrderDetail()` | Detalii comanda |
| `shipOrder()` | Confirma expediere cu tracking |

### Servicii Asociate

- `src/lib/temu-order-sync.ts` - Sincronizare comenzi
- `src/lib/temu-stock-sync.ts` - Sincronizare stoc
- `src/lib/temu-awb.ts` - Trimitere tracking
- `src/lib/temu-status.ts` - Mapare statusuri

---

## Daktela (CRM / Call Center)

**Fisier:** `src/lib/daktela.ts`
**URL API:** `https://cashflowgroup.daktela.com/api/v6/contacts.json`

### Autentificare

Token API transmis ca parametru.

### Functionalitate

Sincronizeaza contacte clienti catre Daktela cu date agregate din comenzi:
- Numar comenzi, total cheltuit
- Prima/ultima comanda
- Sursa client (magazin)
- Istoric comenzi

### Functii Exportate

| Functie | Descriere |
|---|---|
| `buildDaktelaContactFromOrder(orderId)` | Construieste datele de contact din comanda |
| `syncContactToDaktela(contactData)` | Trimite/actualizeaza contactul in Daktela |

Apelat automat la sincronizarea comenzilor din Shopify.

---

## ANAF (Validare Firme)

**Fisier:** `src/lib/anaf.ts`
**URL API:** `https://webservicesp.anaf.ro/api/PlatitorTvaRest/v9/tva`

### Autentificare

API public, fara autentificare.

### Functionalitate

Interogare informatii firma pe baza CUI/CIF:
- Denumire firma, adresa, nr. Reg. Com.
- Status TVA (platitor/neplatitor, date inceput/sfarsit)
- TVA la incasare
- Status inactiv/radiat
- Split TVA
- RO e-Factura
- IBAN

### Functii Exportate

| Functie | Descriere |
|---|---|
| `lookupCui(cui)` | Cauta informatii firma dupa CUI |
| `normalizeCui(cui)` | Normalizeaza CUI (elimina prefix RO, spatii) |

### Note

- API-ul v8 nu mai functioneaza din 2025; se foloseste v9
- Input: CUI fara prefix "RO" (normalizat automat)

---

## Google Drive (Imagini + Backup)

**Fisier:** `src/lib/google-drive.ts`

### Autentificare

Google Service Account cu credentiale JSON stocate in `Settings.googleDriveCredentials`.

### Functionalitate

- Sincronizare imagini produse din foldere Google Drive
- Backup automat baza de date catre Google Drive

---

## Meta Ads & TikTok Ads (Advertising)

**Fisiere:** `src/lib/meta-ads.ts`, `src/lib/tiktok-ads.ts`

### Autentificare

OAuth 2.0 cu access tokens stocate in `AdsAccount`:
- `accessToken` / `refreshToken`
- `tokenExpiresAt`

### Functionalitate

- Sincronizare campanii, ad sets, ads
- Citire insights/KPIs
- Management: pornire/oprire campanii, modificare bugete
- Alerte automate bazate pe reguli
