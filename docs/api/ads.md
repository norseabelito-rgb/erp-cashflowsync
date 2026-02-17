# API Ads (Publicitate)

Documentatie pentru endpoint-urile de gestionare a conturilor de publicitate Meta (Facebook/Instagram) si TikTok: conturi, campanii, insights, alerte, pixeli, webhook-uri.

**Surse**: `src/app/api/ads/`

---

## Cuprins

- [Conturi Ads](#conturi-ads)
- [Conectare Conturi](#conectare-conturi)
- [Campanii](#campanii)
- [Insights Campanii](#insights-campanii)
- [Comparatie Campanii](#comparatie-campanii)
- [Statistici Ads](#statistici-ads)
- [Alerte](#alerte)
- [Reguli Alerte](#reguli-alerte)
- [Pixeli](#pixeli)
- [Produse Ads](#produse-ads)
- [Setari Ads](#setari-ads)
- [Webhook-uri Ads](#webhook-uri-ads)
- [Aplicatii Ads](#aplicatii-ads)

---

## Conturi Ads

**Sursa**: `src/app/api/ads/accounts/route.ts`

### GET /api/ads/accounts

Lista tuturor conturilor de publicitate conectate (fara token-uri).

**Permisiuni**: `ads.view`

**Raspuns** (200):
```json
{
  "accounts": [
    {
      "id": "acc1",
      "platform": "META",
      "externalId": "act_123456789",
      "name": "Cont Facebook Ads",
      "currency": "RON",
      "timezone": "Europe/Bucharest",
      "businessId": "biz_123",
      "businessName": "SC Firma SRL",
      "status": "ACTIVE",
      "lastSyncAt": "2025-02-18T10:00:00.000Z",
      "lastSyncError": null,
      "syncInProgress": false,
      "createdAt": "2025-01-01T00:00:00.000Z",
      "campaignsCount": 15,
      "pixelsCount": 2
    }
  ]
}
```

### POST /api/ads/accounts

Sincronizare manuala a unui cont.

**Permisiuni**: `ads.manage`

**Body**:
```typescript
{
  accountId: string;
  action: "sync";
}
```

**Raspuns** (200):
```json
{
  "success": true,
  "message": "Sincronizare completa: 15 campanii, 30 ad sets, 45 ads",
  "jobId": "job1",
  "campaignsSynced": 15,
  "adSetsSynced": 30,
  "adsSynced": 45
}
```

**Raspuns pauza (rate limit)**:
```json
{
  "success": false,
  "paused": true,
  "jobId": "job1",
  "retryAt": "2025-02-18T10:15:00.000Z",
  "error": "Rate limit atins"
}
```

### DELETE /api/ads/accounts?id={accountId}

Deconecteaza un cont de publicitate. Cascade: sterge campanii, alerte, etc.

**Permisiuni**: `ads.manage`

### GET /api/ads/accounts/{id}/sync-status

Verifica statusul sincronizarii unui cont.

**Sursa**: `src/app/api/ads/accounts/[id]/sync-status/route.ts`

---

## Conectare Conturi

### GET /api/ads/accounts/connect

Initializeaza fluxul OAuth pentru conectarea unui cont.

**Sursa**: `src/app/api/ads/accounts/connect/route.ts`

### GET /api/ads/accounts/callback/meta

Callback OAuth Meta (Facebook).

**Sursa**: `src/app/api/ads/accounts/callback/meta/route.ts`

### GET /api/ads/accounts/callback/tiktok

Callback OAuth TikTok.

**Sursa**: `src/app/api/ads/accounts/callback/tiktok/route.ts`

---

## Campanii

**Sursa**: `src/app/api/ads/campaigns/route.ts`, `src/app/api/ads/campaigns/[id]/route.ts`

### GET /api/ads/campaigns

Lista campaniilor de publicitate.

### GET /api/ads/campaigns/{id}

Detalii campanie.

### POST /api/ads/campaigns/create

Creeaza o campanie noua.

**Sursa**: `src/app/api/ads/campaigns/create/route.ts`

### POST /api/ads/campaigns/{id}/refresh

Reimprospateza datele unei campanii din platforma ads.

**Sursa**: `src/app/api/ads/campaigns/[id]/refresh/route.ts`

---

## Insights Campanii

**Sursa**: `src/app/api/ads/campaigns/[id]/insights/route.ts`

### GET /api/ads/campaigns/{id}/insights

Obtine metrici de performanta pentru o campanie (impressions, clicks, spend, conversions, etc.).

---

## Comparatie Campanii

**Sursa**: `src/app/api/ads/campaigns/[id]/compare/route.ts`

### GET /api/ads/campaigns/{id}/compare

Compara performanta unei campanii pe doua perioade.

---

## Statistici Ads

**Sursa**: `src/app/api/ads/stats/route.ts`

### GET /api/ads/stats

Statistici agregate pentru toate conturile de publicitate.

---

## Alerte

**Sursa**: `src/app/api/ads/alerts/route.ts`

### GET /api/ads/alerts

Lista alertelor generate automat (campanii oprite, bugete depasite, etc.).

---

## Reguli Alerte

**Sursa**: `src/app/api/ads/alerts/rules/route.ts`

### GET /api/ads/alerts/rules

Lista regulilor de alertare configurate.

### POST /api/ads/alerts/rules

Creeaza o regula de alertare noua.

---

## Pixeli

**Sursa**: `src/app/api/ads/pixels/route.ts`

### GET /api/ads/pixels

Lista pixelilor de tracking configurati (Meta Pixel, TikTok Pixel).

---

## Produse Ads

**Sursa**: `src/app/api/ads/products/route.ts`

### GET /api/ads/products

Lista produselor disponibile pentru reclame (catalog).

---

## Setari Ads

**Sursa**: `src/app/api/ads/settings/route.ts`

### GET /api/ads/settings

Setari pentru modulul de publicitate (frecventa sync, alerte email, etc.).

### POST /api/ads/settings

Actualizeaza setarile modulului de publicitate.

---

## Webhook-uri Ads

**Sursa**: `src/app/api/ads/webhooks/route.ts`

### GET /api/ads/webhooks

Lista configurarilor de webhook-uri pentru platformele ads.

### POST /api/ads/webhooks

Configureaza un webhook nou pentru o platforma.

---

## Aplicatii Ads

**Sursa**: `src/app/api/ads/apps/route.ts`

### GET /api/ads/apps

Lista aplicatiilor ads configurate (Meta App, TikTok App).
