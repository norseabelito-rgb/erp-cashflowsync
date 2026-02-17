# Cron Jobs

## Privire de Ansamblu

Toate cron job-urile sunt implementate ca rute API Next.js in `src/app/api/cron/`. Sunt apelate de un scheduler extern (cron-job.org, Upstash QStash, sau manual).

Fiecare cron job:
1. Verifica autorizarea cu `CRON_SECRET` (header `Authorization: Bearer <secret>`)
2. Foloseste sistemul de locking pentru a preveni executia concurenta
3. Logheaza rezultatele

---

## Mecanism de Locking

**Fisier:** `src/lib/cron-lock.ts`

Previne executia concurenta a cron jobs folosind tabela `CronLock` din baza de date.

### Cum Functioneaza

```sql
-- Tabela creata automat daca nu exista
CREATE TABLE IF NOT EXISTS "CronLock" (
  "jobName" VARCHAR(100) PRIMARY KEY,
  "lockId" VARCHAR(100) NOT NULL,
  "lockedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "expiresAt" TIMESTAMP NOT NULL
);
```

1. **Achizitie lock:** `INSERT ... ON CONFLICT DO UPDATE WHERE expiresAt < NOW()`
   - Daca insert reuseste (result = 1) -> lock achizitionat
   - Daca exista lock activ (neexpirat) -> job skip
2. **Eliberare lock:** `DELETE WHERE jobName = X AND lockId = Y` (doar proprietarul)
3. **TTL default:** 10 minute (lock expira automat)
4. **Cleanup:** Functia `cleanupExpiredLocks()` sterge lock-uri expirate

### Functii Exportate

| Functie | Descriere |
|---|---|
| `acquireCronLock(jobName, ttlMs)` | Incearca sa achizitioneze un lock |
| `releaseCronLock(jobName, lockId)` | Elibereaza lock-ul (sau force release fara lockId) |
| `withCronLock(jobName, fn, ttlMs)` | Wrapper: achizitioneaza lock -> executa functie -> elibereaza lock |
| `cleanupExpiredLocks()` | Sterge lock-uri expirate |

### Exemplu Utilizare

```typescript
const lockResult = await withCronLock("sync-orders", async () => {
  const result = await syncAllStoresOrders();
  return result;
});

if (lockResult.skipped) {
  // Job deja in executie
  console.log(lockResult.reason);
}
```

---

## Lista Cron Jobs

### 1. Sync Orders (Sincronizare Comenzi Shopify)

| Proprietate | Valoare |
|---|---|
| **Ruta** | `GET /api/cron/sync-orders` |
| **Fisier** | `src/app/api/cron/sync-orders/route.ts` |
| **Frecventa** | La fiecare 15 minute |
| **Lock** | `sync-orders` |
| **Functie** | `syncAllStoresOrders()` din `src/lib/shopify.ts` |

**Ce face:**
- Sincronizeaza comenzile noi/actualizate de la toate store-urile Shopify active
- Creeaza/actualizeaza comenzi in baza de date locala
- Sincronizeaza contacte catre Daktela

---

### 2. Sync AWB (Actualizare Status AWB)

| Proprietate | Valoare |
|---|---|
| **Ruta** | `GET /api/cron/sync-awb` |
| **Fisier** | `src/app/api/cron/sync-awb/route.ts` |
| **Frecventa** | La fiecare 30 minute |
| **Lock** | `sync-awb` |
| **Functie** | `syncAWBsFromFanCourier()` din `src/lib/fancourier.ts` |

**Ce face:**
- Actualizeaza statusul de tracking pentru toate expedierile in curs
- Detecteaza livrari, retururi, C0 (preluat de curier)
- Actualizeaza `AWB.currentStatus`, `AWBStatusHistory`

---

### 3. Ads Sync (Sincronizare Campanii Ads)

| Proprietate | Valoare |
|---|---|
| **Ruta** | `GET /api/cron/ads-sync?mode=light|full|resume` |
| **Fisier** | `src/app/api/cron/ads-sync/route.ts` |
| **Frecventa** | La fiecare 30 minute (light), rar (full) |
| **Functii** | `syncMetaAccountLight()`, `syncMetaAccount()`, `syncTikTokAccount()` |

**Moduri:**
- **light** (default): Sync rapid - doar campanii + insights
- **full**: Sync complet inclusiv ad sets/ads
- **resume**: Reporneste job-uri in pauza

**Ce face:**
- Sincronizeaza campaniile, KPI-urile (spend, impressions, clicks, conversions, ROAS)
- Actualizeaza status campanii
- Suporta Meta si TikTok

---

### 4. Ads Alerts (Verificare Alerte Ads)

| Proprietate | Valoare |
|---|---|
| **Ruta** | `GET /api/cron/ads-alerts` |
| **Fisier** | `src/app/api/cron/ads-alerts/route.ts` |
| **Frecventa** | La fiecare 15 minute |
| **Functii** | `updateMetaCampaignStatus()`, `updateMetaCampaignBudget()`, `updateTikTokCampaignStatus()` |

**Ce face:**
- Evalueaza regulile de alerta (`AdsAlertRule`) contra KPI-urilor curente
- Actiuni automate: NOTIFY, PAUSE campanie, REDUCE_BUDGET
- Respecta cooldown (nu declanseaza acelasi alert de 2 ori in 24h)

---

### 5. Ads Rollback (Rollback Actiuni Automate)

| Proprietate | Valoare |
|---|---|
| **Ruta** | `GET /api/cron/ads-rollback` |
| **Fisier** | `src/app/api/cron/ads-rollback/route.ts` |
| **Frecventa** | La fiecare ora |

**Ce face:**
- Verifica alertele cu `rollbackEligible = true` si `rollbackAt <= now`
- Restaureaza campania la starea anterioara (pornire, restaurare buget)
- Marcheaza rollback-ul ca SUCCESS/FAILED/SKIPPED

---

### 6. Handover Finalize (Finalizare Automata Predare)

| Proprietate | Valoare |
|---|---|
| **Ruta** | `GET /api/cron/handover-finalize` |
| **Fisier** | `src/app/api/cron/handover-finalize/route.ts` |
| **Frecventa** | La fiecare minut |
| **Functie** | `checkAutoFinalize()` din `src/lib/handover.ts` |

**Ce face:**
- Verifica daca a trecut ora de finalizare automata (`Settings.handoverAutoCloseTime`, default 20:00)
- Daca DA si sesiunea zilei e inca OPEN -> o inchide automat
- Calculeaza statistici finale (total emise, predate, nepredate)

---

### 7. Backup (Backup Automat)

| Proprietate | Valoare |
|---|---|
| **Ruta** | `GET /api/cron/backup` |
| **Fisier** | `src/app/api/cron/backup/route.ts` |
| **Frecventa** | La fiecare ora (verifica daca e momentul) |

**Ce face:**
- Verifica daca backup-ul e activat (`Settings.backupAutoEnabled`)
- Verifica daca e ora configurata (`Settings.backupAutoTime`, default 03:00)
- Exporta datele si le uploadeaza in Google Drive (folder din `Settings.backupFolderUrl`)

---

### 8. AI Analysis (Analiza AI Zilnica)

| Proprietate | Valoare |
|---|---|
| **Ruta** | `GET /api/cron/ai-analysis` |
| **Fisier** | `src/app/api/cron/ai-analysis/route.ts` |
| **Frecventa** | La fiecare ora (verifica daca e momentul) |

**Ce face:**
- Verifica daca analiza zilnica e activata (`Settings.aiDailyAnalysisEnabled`)
- Verifica daca e ora configurata (`Settings.aiDailyAnalysisTime`, default 08:00)
- Ruleaza analiza performanta ads + sugestii preturi produse
- Genereaza insights salvate in `AIInsight`

---

### 9. Trendyol Sync (Sincronizare Stoc Trendyol)

| Proprietate | Valoare |
|---|---|
| **Ruta** | `GET /api/cron/trendyol-sync` |
| **Fisier** | `src/app/api/cron/trendyol-sync/route.ts` |
| **Frecventa** | La fiecare 15 minute |
| **Functie** | `syncAllProductsToTrendyol()` din `src/lib/trendyol-stock-sync.ts` |
| **Max Duration** | 5 minute (300s) |

**Ce face:**
- Sincronizeaza stocul si preturile tuturor produselor catre Trendyol
- Batch update pentru eficienta

---

### 10. Intercompany Settlement (Decontare Saptamanala)

| Proprietate | Valoare |
|---|---|
| **Ruta** | `POST /api/cron/intercompany-settlement` |
| **Fisier** | `src/app/api/cron/intercompany-settlement/route.ts` |
| **Frecventa** | Saptamanal |
| **Lock** | Da (withCronLock) |
| **Functie** | `runWeeklySettlement()` din `src/lib/intercompany-service.ts` |

**Ce face:**
- Genereaza facturi intercompany pentru comenzile din saptamana trecuta
- Aquaterra (firma primara) factureaza firmele secundare
- Calcul pe baza pret achizitie + markup

---

### 11. Backfill Postal Codes (Populare Coduri Postale)

| Proprietate | Valoare |
|---|---|
| **Ruta** | `POST /api/cron/backfill-postal-codes` |
| **Fisier** | `src/app/api/cron/backfill-postal-codes/route.ts` |
| **Frecventa** | La deploy (automat) + manual |
| **Functie** | `backfillPostalCodes()` din `src/lib/fancourier.ts` |

**Ce face:**
- Populeaza codurile postale pentru comenzile existente fara cod postal
- Foloseste nomenclatorul FanCourier (judet + localitate -> cod postal)
- Limita configurabila prin query param `limit`

---

## Endpoint Unificat: Run All

**Ruta:** `GET /api/cron/run-all?job=<name>`

Apeleaza intern endpoint-urile individuale. Suporta:

| Job | Descriere |
|---|---|
| `sync-orders` | Sincronizare comenzi Shopify |
| `sync-awb` | Actualizare status AWB |
| `ads-sync` | Sincronizare campanii ads |
| `ads-alerts` | Verificare alerte ads |
| `ads-rollback` | Rollback actiuni automate |
| `handover` | Finalizare predare |
| `backup` | Backup automat |
| `all` | Toate job-urile (pentru testing) |

---

## Securitate

Toate cron job-urile verifica header-ul `Authorization: Bearer <CRON_SECRET>`:

```typescript
const CRON_SECRET = process.env.CRON_SECRET;

if (!CRON_SECRET) {
  return NextResponse.json({ error: "CRON_SECRET not set" }, { status: 500 });
}
if (authHeader !== `Bearer ${CRON_SECRET}`) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

**Exceptie:** Trendyol Sync accepta si `x-vercel-cron: true` (pentru Vercel internal cron).
