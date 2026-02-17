# API Webhooks

Documentatie pentru endpoint-urile de webhook primite de la platformele externe: Shopify si Meta (Facebook).

**Surse**: `src/app/api/webhooks/`

---

## Cuprins

- [Webhook Shopify](#webhook-shopify)
- [Webhook Meta](#webhook-meta)

---

## Webhook Shopify

**Sursa**: `src/app/api/webhooks/shopify/route.ts`

### POST /api/webhooks/shopify

Primeste notificari real-time de la Shopify cand se creaza, actualizeaza sau anuleaza comenzi.

**Autentificare**: HMAC-SHA256 via header `x-shopify-hmac-sha256`. Secretul este configurat per magazin (`store.webhookSecret`). Daca magazinul nu are secret configurat, semnatura nu este verificata.

**Headere obligatorii**:
| Header | Descriere |
|--------|-----------|
| `x-shopify-hmac-sha256` | Semnatura HMAC-SHA256 (base64) |
| `x-shopify-topic` | Tipul evenimentului |
| `x-shopify-shop-domain` | Domeniul magazinului Shopify |

**Evenimente suportate**:
| Topic | Descriere | Actiune |
|-------|-----------|---------|
| `orders/create` | Comanda noua | Apeleaza `syncSingleOrder()` pentru a crea comanda in DB |
| `orders/updated` | Comanda actualizata | Apeleaza `syncSingleOrder()` pentru a actualiza comanda |
| `orders/cancelled` | Comanda anulata | Seteaza status `CANCELLED` pe comanda din DB |

**Verificare semnatura**:
1. Se genereaza HMAC-SHA256 din body-ul raw cu secretul magazinului
2. Se compara cu header-ul `x-shopify-hmac-sha256` folosind `timingSafeEqual`
3. Daca semnatura este invalida, se returneaza 401

**Raspunsuri**:
| Status | Conditie |
|--------|----------|
| 200 | `{ success: true }` - eveniment procesat cu succes |
| 400 | `{ error: "Missing required headers" }` - headere lipsa |
| 401 | `{ error: "Invalid signature" }` - semnatura HMAC invalida |
| 404 | `{ error: "Store not found" }` - domeniul nu este inregistrat |
| 500 | `{ error: "..." }` - eroare interna |

**Nota**: Evenimentele cu topic necunoscut sunt ignorate (logat in consola, raspuns 200).

---

## Webhook Meta

**Sursa**: `src/app/api/webhooks/meta/route.ts`

Gestioneaza doua fluxuri: verificarea initiala de la Meta (GET) si primirea evenimentelor (POST).

**Configurare**: In Facebook Developer Console se seteaza Callback URL (`/api/webhooks/meta`) si Verify Token (generat in platforma ERP la Ads > Setari > Webhooks).

### GET /api/webhooks/meta

Verificarea initiala a webhook-ului de catre Meta (subscription verification).

**Query params**:
| Parametru | Tip | Descriere |
|-----------|-----|-----------|
| `hub.mode` | string | Trebuie sa fie `subscribe` |
| `hub.verify_token` | string | Token-ul de verificare configurat |
| `hub.challenge` | string | Challenge-ul returnat ca raspuns |

**Functionare**:
1. Verifica ca `hub.mode` este `subscribe`
2. Citeste configuratia din DB (`AdsWebhookConfig` unde `platform = "META"`)
3. Compara `hub.verify_token` cu token-ul salvat
4. Marcheaza webhook-ul ca verificat (`isVerified: true`)
5. Returneaza `hub.challenge` ca plain text

**Raspunsuri**:
| Status | Conditie |
|--------|----------|
| 200 | Challenge returnat ca `text/plain` - verificare reusita |
| 400 | `hub.mode` nu este `subscribe` sau parametri lipsa |
| 403 | Token de verificare invalid |
| 404 | Webhook-ul Meta nu este configurat |

### POST /api/webhooks/meta

Primeste evenimente de la Meta (schimbari campanii, conturi, insights, leads).

**Autentificare**: HMAC-SHA256 via header `x-hub-signature-256`. Format: `sha256={hash}`. Secretul este `appSecret` din configuratia webhook-ului.

**Deduplicare**: Fiecare eveniment primeste un ID unic (extras din payload sau generat via MD5 hash). Evenimentele duplicate sunt ignorate.

**Evenimente suportate**:
| Event Type | Descriere | Actiune |
|------------|-----------|---------|
| `campaign_status_changes` | Schimbare status campanie | Actualizeaza campania in DB, creeaza notificari |
| `ad_account` | Schimbare cont ads | Detecteaza dezactivare cont, alerteaza spending limit |
| `ads_insights` | Insights disponibile | Doar logat (procesate de CRON) |
| `leadgen` | Lead nou generat | Doar logat (pentru viitor) |

**Procesare `campaign_status_changes`**:
1. Gaseste campania in DB dupa `campaign_id`
2. Mapeaza statusul Meta la statusul intern (ACTIVE, PAUSED, DELETED, ARCHIVED)
3. Actualizeaza campania in DB
4. Creeaza notificari pentru toti utilizatorii cu acces la modulul Ads (super admini sau utilizatori cu permisiuni `ads.*`)

**Procesare `ad_account`**:
1. Gaseste contul in DB (extragem ID din format `act_123456789`)
2. Daca contul e dezactivat (`account_status === 2` sau `disable_reason`), seteaza status `ERROR`
3. Creeaza notificare urgenta de tip `ADS_ERROR`
4. Daca `spending_limit_reached`, creeaza alerta de tip `ADS_WARNING`

**Raspunsuri**:
| Status | Conditie |
|--------|----------|
| 200 | `{ received: true }` - eveniment procesat (sau eroare interna - Meta asteapta 200) |
| 400 | JSON invalid |
| 403 | Semnatura HMAC invalida (eroarea e salvata si in DB) |

**Note importante**:
- Meta cere raspuns in sub 20 secunde - procesarea trebuie sa fie rapida
- In caz de eroare interna, se returneaza tot 200 pentru a evita retry-urile excessive de la Meta
- Erorile sunt salvate in `AdsWebhookConfig` (`lastError`, `lastErrorAt`)
- Statisticile sunt actualizate automat (`eventsReceived`, `lastEventAt`)
- Evenimentele sunt salvate in `AdsWebhookEvent` cu dedup key (`externalEventId`)
