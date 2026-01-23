# API: Integrations - Audit

**Auditat:** 2026-01-23
**Status:** Probleme Minore

## Rezumat

Acest document acopera toate API-urile de integrare cu servicii externe: Facturis, Shopify, FanCourier (cross-ref), Meta/TikTok Ads, Trendyol.

---

## Facturis Integration

### /api/invoice-series

| Metoda | Endpoint | Scop | Auth | Permisiune |
|--------|----------|------|------|------------|
| GET | /api/invoice-series | Lista seriilor de facturare | Da | (implicit) |
| POST | /api/invoice-series | Creeaza serie noua | Da | `invoices.series` |
| PUT | /api/invoice-series | Actualizeaza serie sau asociere store | Da | `invoices.series` |
| DELETE | /api/invoice-series | Sterge serie (daca nefolosita) | Da | `invoices.series` |

**Functionalitati:**
- CRUD complet pentru serii de facturare
- Asociere serie <-> magazin
- Suport serie dedicata Trendyol (in Settings)
- Integrare cu Facturis prin `syncToFacturis` si `facturisSeries`

**Fisier sursa:** `src/app/api/invoice-series/route.ts`

**Note:**
- GET nu verifica explicit permisiune (doar autentificare)
- Validari: name si prefix obligatorii, unicitate name

### Facturis Client Usage

Facturis este folosit in:
- `src/lib/facturis.ts` - client principal
- `src/lib/invoice-service.ts` - emitere facturi
- `/api/invoices/[id]/cancel` - anulare facturi

**Configurare necesara per company:**
- `facturisApiKey`
- `facturisUsername`
- `facturisPassword`

**PROBLEMA - Referinta CONCERNS.md:**
> "Invoice Series Auto-Correct Not Idempotent" - Logic-ul de auto-correctare din commit 3cd1baf poate avea edge cases la request-uri rapide multiple.

---

## Shopify Integration

### /api/webhooks/shopify

| Aspect | Detalii |
|--------|---------|
| Scop | Webhook handler pentru evenimente Shopify |
| Auth | HMAC signature verification |
| Topics | orders/create, orders/updated, orders/cancelled |
| Response | `{ success: true }` |
| Status | OK |

**Implementare securitate:**
- Verifica `x-shopify-hmac-sha256` cu `crypto.timingSafeEqual`
- Cauta store dupa `x-shopify-shop-domain`
- Verifica signature doar daca `store.webhookSecret` exista

**Fisier sursa:** `src/app/api/webhooks/shopify/route.ts`

### Shopify Client Usage

| Operatie | Modul |
|----------|-------|
| Sync orders | `syncAllStoresOrders()`, `syncSingleOrder()` |
| Update order address | `shopifyClient.updateOrderAddress()` |
| Add timeline note | `shopifyClient.addOrderTimelineNote()` |
| Sync products | `src/app/api/products/sync-shopify/` |

**Configurare necesara per store:**
- `shopifyDomain`
- `shopifyAccessToken`
- `webhookSecret` (optional, pentru HMAC)

---

## FanCourier/SelfAWB Integration

**Documentatie detaliata:** Vezi `awb-api.md`

**Endpoints:**
- `/api/awb/*` - CRUD AWB-uri
- `/api/fancourier/services` - Lista servicii
- `/api/fancourier/test` - Test conexiune

**Configurare:** Global in Settings:
- `fancourierUsername`
- `fancourierPassword`
- `fancourierClientId`

---

## Meta Ads Integration

### /api/webhooks/meta

| Aspect | Detalii |
|--------|---------|
| Scop | Webhook handler pentru Meta (Facebook) Ads |
| Auth | Signature verification (x-hub-signature-256) |
| Verificare | GET - Meta verification challenge |
| Evenimente | POST - campaign changes, account changes, insights, leadgen |
| Status | **BUG: Notification spam** |

**Fisier sursa:** `src/app/api/webhooks/meta/route.ts`

**BUG CUNOSCUT - Referinta CONCERNS.md:**
> "Notification Spam from Ads Webhooks" - Multiple notificari create pentru acelasi eveniment. Meta trimite acelasi webhook de mai multe ori, iar codul creeaza notificari pentru toti userii cu ads access la fiecare primire.

**Evenimente gestionate:**
- `campaign_status_changes` - Update status campanie + notificare
- `ad_account` - Alerte cont dezactivat, spending limit
- `ads_insights` - Doar logare (procesare in cron)
- `leadgen` - Placeholder pentru viitor

**Nota:** Token comparison la linia 97 (`config.verifyToken !== token`) - potential timing attack, dar este GET verification, nu flow critic.

### /api/ads/*

| Endpoint | Scop |
|----------|------|
| /ads/accounts | CRUD conturi ads |
| /ads/accounts/[id]/sync | Sync date cont |
| /ads/campaigns | Lista campanii |
| /ads/campaigns/[id] | Detalii campanie |
| /ads/alerts | Alerte ads |
| /ads/apps | Aplicatii conectate |
| /ads/pixels | Configurare pixels |
| /ads/products | Catalog produse |
| /ads/settings | Setari ads |
| /ads/stats | Statistici ads |
| /ads/webhooks | Config webhooks |

**STATUS INTREBARE:**
> Din CONCERNS.md: Este modulul Ads in folosinta activa sau este feature in dezvoltare? Cod extins (meta-ads.ts 2536 linii) dar nu e clar daca e in productie.

---

## TikTok Ads Integration

Similar cu Meta, dar mai putin dezvoltat. Webhooks handled in acelasi mod.

---

## Trendyol Integration

### /api/trendyol

| Metoda | Endpoint | Scop |
|--------|----------|------|
| GET | /api/trendyol | Config Trendyol si statistici |
| POST | /api/trendyol | Sync comenzi Trendyol |
| PUT | /api/trendyol | Update config |

**Sub-endpoints:**
- `/api/trendyol/mapping` - Mapare categorii Trendyol
- `/api/trendyol/orders` - Comenzi Trendyol
- `/api/trendyol/products` - Produse (empty dir)
- `/api/trendyol/stats` - Statistici

**Fisier sursa:** `src/app/api/trendyol/route.ts` (19KB)

**STATUS INTREBARE:**
> Din RESEARCH: Este Trendyol integration in folosinta activa sau in testare?

---

## Observatii de Securitate

1. **Webhook signature verification:**
   - Shopify: OK - foloseste `crypto.timingSafeEqual`
   - Meta: OK - foloseste HMAC SHA256
   - Token comparison in Meta GET: potential timing attack (linia 97)

2. **Deduplicare evenimente:**
   - Meta: Lipsa deduplicare - creeaza notificari duplicate

3. **Rate limiting:**
   - Lipsa pe toate endpoint-urile de webhook

## Probleme de Performanta

1. **Meta webhook:**
   - Query pentru toti userii cu ads access la fiecare notificare
   - Poate fi lent cu multi useri

2. **Trendyol sync:**
   - Cod extins, potential blocant pentru sync-uri mari

---

## Referinte CONCERNS.md

| Concern | Endpoint Afectat | Severitate |
|---------|-----------------|------------|
| Invoice Series Auto-Correct Not Idempotent | /invoice-series | MEDIE |
| Notification Spam from Ads Webhooks | /webhooks/meta | MEDIE |
| Authentication Token Verification | /webhooks/meta GET | JOASA |

---

*Auditat: 2026-01-23*
