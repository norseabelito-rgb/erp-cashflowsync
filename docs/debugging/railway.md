# Debugging Railway

Documentatie specifica pentru debugging-ul aplicatiei pe Railway.

## Configurare Railway

Aplicatia foloseste urmatoarea configurare (din `railway.toml`):

```toml
[build]
builder = "NIXPACKS"
installCommand = "npm install --legacy-peer-deps"
buildCommand = "npx prisma generate && npm run build"

[deploy]
startCommand = "bash scripts/deploy-start.sh"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
```

**Nota**: `--legacy-peer-deps` este necesar din cauza conflictelor de peer dependencies.

## Accesare Railway Dashboard

1. Deschide [railway.app](https://railway.app)
2. Selecteaza proiectul **ERP CashFlowSync**
3. Vei vedea doua servicii: **App** (Next.js) si **PostgreSQL**

## Vizualizare Logs

### Logs aplicatie (deploy)

1. Click pe serviciul **App**
2. Tab **Deployments** > click pe ultimul deployment
3. Vei vedea:
   - **Build logs** - Output-ul comenzii de build
   - **Deploy logs** - Output-ul de la pornirea aplicatiei

### Logs runtime (live)

1. Click pe serviciul **App**
2. Tab **Logs**
3. Filtre utile:
   - Cauta `[ERROR]` sau `Error` pentru erori
   - Cauta `[Oblio]` pentru probleme cu facturarea
   - Cauta `[FanCourier]` pentru probleme cu AWB-uri
   - Cauta `[Invoice]` pentru fluxul de facturare
   - Cauta `[CronLock]` pentru probleme cu cron-urile
   - Cauta `SYNC_FATAL_ERROR` pentru erori critice de sincronizare

## Proces de Deploy

Script-ul `scripts/deploy-start.sh` ruleaza la fiecare deploy:

```
1. prisma migrate resolve --applied [migrare]    # Rezolva migrarile aplicate manual
2. prisma migrate deploy                          # Ruleaza migrarile Prisma
3. node scripts/force-migration.js                # Ruleaza migrarile manuale SQL
4. LIMIT=5 npm run backfill:postal-codes          # Backfill optional
5. NODE_OPTIONS="--max-old-space-size=4096" npm run start  # Porneste aplicatia
```

### Erori frecvente la deploy

**"Migration failed"** (Pasul 2):
- Cauza: Schema Prisma nu se potriveste cu baza de date
- Solutie: Verifica daca migrarea e valida; poate fi necesar `prisma migrate resolve`

**"force-migration.js errors"** (Pasul 3):
- Cauza: SQL invalid in fisierele din `prisma/manual-migrations/`
- Nota: Script-ul ignora erorile "already exists" / "duplicate" (deja aplicate)
- Solutie: Verifica fisierul SQL specific; erorile non-duplicate sunt afisate cu cod de eroare PostgreSQL

**"OOM Killed"** (Pasul 5):
- Cauza: Aplicatia depaseste limita de memorie (4GB max-old-space-size)
- Solutie: Creste limita de memorie in Railway sau optimizeaza codul

## Conectare la PostgreSQL

### Din Railway CLI

```bash
# Instaleaza Railway CLI
npm install -g @railway/cli

# Login
railway login

# Conecteaza-te la proiect
railway link

# Deschide psql
railway connect postgres
```

### Cu connection string

1. In Railway Dashboard, click pe serviciul **PostgreSQL**
2. Tab **Variables** > copiaza `DATABASE_URL`
3. Foloseste cu psql sau orice client PostgreSQL:

```bash
psql "postgresql://user:pass@host:port/db?sslmode=require"
```

### Query-uri utile de debugging

```sql
-- Verifica lock-uri cron active
SELECT * FROM "CronLock";

-- Sterge un lock blocat
DELETE FROM "CronLock" WHERE "jobName" = 'sync-orders';

-- Verifica ultimele sincronizari
SELECT id, type, status, "startedAt", "completedAt", "errorsCount", summary
FROM "SyncLog" ORDER BY "startedAt" DESC LIMIT 10;

-- Verifica facturi esuate
SELECT * FROM "FailedInvoiceAttempt"
WHERE status = 'pending'
ORDER BY "createdAt" DESC LIMIT 20;

-- Verifica comenzi fara factura (ar trebui sa aiba)
SELECT o.id, o."shopifyOrderNumber", o.status, o."financialStatus"
FROM orders o
LEFT JOIN invoices i ON i."orderId" = o.id
WHERE o."financialStatus" = 'paid'
AND i.id IS NULL
ORDER BY o."createdAt" DESC LIMIT 20;

-- Verifica AWB-uri cu erori
SELECT a.id, a."awbNumber", a."currentStatus", a."errorMessage", o."shopifyOrderNumber"
FROM awbs a
JOIN orders o ON o.id = a."orderId"
WHERE a."errorMessage" IS NOT NULL
ORDER BY a."createdAt" DESC LIMIT 20;
```

## Restart Servicii

### Restart aplicatie

1. Railway Dashboard > Serviciul App
2. Tab **Deployments**
3. Click pe ultimul deployment > **Redeploy**

Sau forteaza un restart:
1. Tab **Settings** > **Restart**

### Restart PostgreSQL

**ATENTIE**: Restarting-ul PostgreSQL intrerupe toate conexiunile active.

1. Railway Dashboard > Serviciul PostgreSQL
2. Tab **Settings** > **Restart**

## Probleme Comune Railway

### Aplicatia nu porneste dupa deploy

1. Verifica **Build logs** - erori TypeScript sau de dependente
2. Verifica **Deploy logs** - erori la migrari sau la pornire
3. Cauze frecvente:
   - Migrare Prisma esuata
   - Variabila de mediu lipsa
   - Eroare de import (modul inexistent)

### Memoria creste continuu (memory leak)

1. Verifica **Metrics** > Memory
2. Cauze frecvente:
   - Connection pool Prisma nedrenajat
   - Cache-uri care nu se golesc (tokenCache in FanCourier)
   - Event listeners nederegistrate

### Aplicatia raspunde lent

1. Verifica **Metrics** > CPU si Response Time
2. Cauze frecvente:
   - Query-uri N+1 la baza de date
   - Sincronizare in curs (procesare masiva)
   - PostgreSQL connection pool plin

### Deploy-ul dureaza prea mult

1. Normal: 2-4 minute
2. Daca dureaza >10 minute:
   - `npm install` descarca dependente de la zero (cache invalidat)
   - `prisma generate` regenereaza clientul Prisma
   - `npm run build` compileaza Next.js (poate fi lent cu multe pagini)

## Variabile de Mediu Importante

| Variabila | Descriere |
|-----------|-----------|
| `DATABASE_URL` | Connection string PostgreSQL |
| `NEXTAUTH_SECRET` | Secret pentru autentificare |
| `NEXTAUTH_URL` | URL-ul aplicatiei |
| `NODE_OPTIONS` | Setat la `--max-old-space-size=4096` in deploy-start.sh |
