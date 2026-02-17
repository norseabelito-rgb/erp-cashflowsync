# API Cron Jobs

Documentatie pentru endpoint-urile cron (job-uri programate). Toate endpoint-urile cron necesita autentificare prin header `Authorization: Bearer {CRON_SECRET}`.

**Surse**: `src/app/api/cron/`

---

## Cuprins

- [Autentificare](#autentificare)
- [Run All (Orchestrator)](#run-all-orchestrator)
- [Sync Orders](#sync-orders)
- [Sync AWB](#sync-awb)
- [Ads Sync](#ads-sync)
- [Ads Alerts](#ads-alerts)
- [Ads Rollback](#ads-rollback)
- [AI Analysis](#ai-analysis)
- [Backup](#backup)
- [Handover Finalize](#handover-finalize)
- [Intercompany Settlement](#intercompany-settlement)
- [Trendyol Sync](#trendyol-sync)
- [Backfill Postal Codes](#backfill-postal-codes)

---

## Autentificare

Toate endpoint-urile cron verifica variabila de mediu `CRON_SECRET` si header-ul de autorizare:

```
Authorization: Bearer {CRON_SECRET}
```

Daca `CRON_SECRET` nu este configurat, se returneaza status 500. Daca header-ul lipseste sau e invalid, se returneaza 401.

**Surse de apel valide**:
- cron-job.org (serviciu gratuit de cron)
- Upstash QStash
- Vercel Cron (header `x-vercel-cron: true` - acceptat in unele endpoint-uri)
- Trigger manual din panoul admin

---

## Run All (Orchestrator)

**Sursa**: `src/app/api/cron/run-all/route.ts`

### GET /api/cron/run-all?job={jobName}

Endpoint unificat care orchestreaza executia job-urilor. Apeleaza intern celelalte endpoint-uri cron.

**Query params**:
| Job | Descriere | Schedule recomandat |
|-----|-----------|-------------------|
| `sync-orders` | Sincronizeaza comenzile Shopify | La 15 min |
| `sync-awb` | Actualizeaza statusurile AWB | La 30 min |
| `ads-sync` | Sincronizeaza conturile de ads | La 30 min |
| `ads-alerts` | Verifica regulile de alertare | La 15 min |
| `ads-rollback` | Rollback campanii oprite automat | La ora |
| `handover` | Finalizeaza predarea automata | La 20:00 |
| `backup` | Backup automat | La ora configurata |
| `all` | Ruleaza toate job-urile (pentru testare) | - |

**Raspuns** (200):
```json
{
  "success": true,
  "job": "sync-orders",
  "results": {
    "sync-orders": {
      "success": true,
      "data": { "synced": 15 }
    }
  },
  "timestamp": "2025-02-18T10:00:00.000Z"
}
```

---

## Sync Orders

**Sursa**: `src/app/api/cron/sync-orders/route.ts`

### GET /api/cron/sync-orders

Sincronizeaza comenzile din toate magazinele Shopify conectate.

**Schedule**: La fiecare 15 minute

**Functionare**:
1. Itereaza prin toate magazinele Shopify active
2. Obtine comenzile noi de la ultimul sync
3. Creeaza/actualizeaza comenzile in baza de date
4. Foloseste `withCronLock` pentru a preveni executia simultana

**Raspuns** (200):
```json
{
  "success": true,
  "stores": [
    { "storeId": "s1", "synced": 10, "errors": [] }
  ],
  "totalSynced": 10,
  "timestamp": "2025-02-18T10:00:00.000Z"
}
```

---

## Sync AWB

**Sursa**: `src/app/api/cron/sync-awb/route.ts`

### GET /api/cron/sync-awb

Actualizeaza statusurile AWB pentru toate expeditiile in tranzit de la FanCourier.

**Schedule**: La fiecare 30 minute

**Functionare**:
1. Obtine toate AWB-urile active (nu livrate/anulate)
2. Interogheaza FanCourier API pentru statusul curent
3. Actualizeaza statusul si istoricul in baza de date
4. Foloseste `withCronLock` pentru a preveni executia simultana

---

## Ads Sync

**Sursa**: `src/app/api/cron/ads-sync/route.ts`

### GET /api/cron/ads-sync

Sincronizeaza datele din conturile de publicitate (Meta, TikTok).

**Schedule**: La fiecare 30 minute

**Query params**:
| Parametru | Valori | Default | Descriere |
|-----------|--------|---------|-----------|
| `mode` | `light`, `full`, `resume` | `light` | Modul de sincronizare |

**Moduri**:
| Mod | Descriere |
|-----|-----------|
| `light` | Sync rapid - doar campanii si insights (recomandat la 30 min) |
| `full` | Sync complet inclusiv ad sets si ads (folosit rar) |
| `resume` | Reporneste job-uri in pauza (dupa rate limit) |

---

## Ads Alerts

**Sursa**: `src/app/api/cron/ads-alerts/route.ts`

### GET /api/cron/ads-alerts

Verifica regulile de alertare configurate si executa actiunile automate (oprire campanie, ajustare buget).

**Schedule**: La fiecare 15 minute (`*/15 * * * *`)

**Functionare**:
1. Incarca toate regulile de alertare active
2. Evalueaza conditiile pe metrici (CPA, ROAS, spend, etc.)
3. Executa actiunile configurate (oprire campanie, reducere buget)
4. Creeaza intrari de alerta pentru dashboard

---

## Ads Rollback

**Sursa**: `src/app/api/cron/ads-rollback/route.ts`

### GET /api/cron/ads-rollback

Rollback automat al campaniilor oprite de regulile de alertare.

**Schedule**: La fiecare ora (`0 * * * *`)

**Functionare**:
1. Gaseste alertele cu `rollbackEligible = true` si `rollbackAt <= now`
2. Verifica ca nu au fost deja procesate (`rollbackExecuted = false`)
3. Restarteaza campaniile oprite (Meta/TikTok API)
4. Restaureaza bugetele originale

---

## AI Analysis

**Sursa**: `src/app/api/cron/ai-analysis/route.ts`

### GET /api/cron/ai-analysis

Analiza AI a performantei reclamelor si preturilor produselor.

**Schedule**: La fiecare ora (verifica intern daca e momentul analizei zilnice)

**Functionare**:
1. Verifica setarile AI (cheia API, ora programata)
2. Analizeaza performanta reclamelor (Meta/TikTok)
3. Analizeaza preturile produselor
4. Genereaza insights si le salveaza in baza de date
5. Creeaza un `AnalysisRun` pentru audit

---

## Backup

**Sursa**: `src/app/api/cron/backup/route.ts`

### GET /api/cron/backup

Backup automat al bazei de date pe Google Drive.

**Schedule**: La fiecare ora (verifica intern daca e ora configurata in setari)

**Functionare**:
1. Verifica daca backup-ul automat este activat in setari
2. Verifica daca e ora corecta pentru backup
3. Exporta baza de date
4. Uploadeaza pe Google Drive (folosind credentialele de service account)

---

## Handover Finalize

**Sursa**: `src/app/api/cron/handover-finalize/route.ts`

### GET /api/cron/handover-finalize

Finalizeaza automat procesul de predare catre curier.

**Schedule**: La fiecare minut (`* * * * *`)

**Functionare**: Apeleaza `checkAutoFinalize()` care verifica daca predarea curenta trebuie finalizata automat (ora de cut-off).

---

## Intercompany Settlement

**Sursa**: `src/app/api/cron/intercompany-settlement/route.ts`

### POST /api/cron/intercompany-settlement

Decontare saptamanala inter-companii.

**Schedule**: Saptamanal (apelat extern)

**Functionare**:
1. Calculeaza sumele datorate intre companii
2. Genereaza decontari
3. Foloseste `withCronLock` pentru a preveni executia simultana

---

## Trendyol Sync

**Sursa**: `src/app/api/cron/trendyol-sync/route.ts`

### GET /api/cron/trendyol-sync

Sincronizeaza stocurile si preturile produselor cu Trendyol.

**Schedule**: La fiecare 15 minute

**Config**: `maxDuration = 300` (5 minute max pentru batch sync)

**Functionare**:
1. Apeleaza `syncAllProductsToTrendyol()`
2. Actualizeaza stocurile si preturile pe platforma Trendyol
3. Accepta si header-ul `x-vercel-cron: true` ca alternativa la CRON_SECRET

---

## Backfill Postal Codes

**Sursa**: `src/app/api/cron/backfill-postal-codes/route.ts`

### POST /api/cron/backfill-postal-codes

Populeaza codurile postale pentru comenzile existente folosind nomenclatorul FanCourier.

**Query params**:
| Parametru | Tip | Default | Descriere |
|-----------|-----|---------|-----------|
| `limit` | number | 500 | Numarul maxim de comenzi de procesat |
| `onlyMissing` | "true"/"false" | "true" | Doar comenzi fara cod postal |

**Nota**: Acest endpoint e de tip one-shot (se ruleaza o data sau ocazional, nu periodic).
