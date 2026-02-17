# Deploy si Migrari

## Platforma de Deploy

**Railway** cu builder **Nixpacks** (auto-detect Node.js).

Nu exista Dockerfile; Railway detecteaza automat proiectul Node.js si construieste imaginea.

---

## Configurare Railway

**Fisier:** `railway.toml`

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

### Faze Deploy

| Faza | Comanda | Descriere |
|---|---|---|
| **Install** | `npm install --legacy-peer-deps` | Instalare dependente (legacy-peer-deps pentru compatibilitate) |
| **Build** | `npx prisma generate && npm run build` | Generare Prisma Client + Build Next.js |
| **Start** | `bash scripts/deploy-start.sh` | Script de pornire cu migratii |

### Politica Restart

- **Tip:** `ON_FAILURE` (restart doar la erori)
- **Max retries:** 10

---

## Script de Start (Deploy)

**Fisier:** `scripts/deploy-start.sh`

Secventa de executie la pornirea containerului:

```bash
#!/bin/bash
set -e

# 1. Rezolva migratii problematice (aplicate manual anterior)
npx prisma migrate resolve --applied 20260217_add_repair_invoices 2>/dev/null || true

# 2. Ruleaza migratiile Prisma (OBLIGATORIU - aplicatia nu porneste fara)
npx prisma migrate deploy

# 3. Ruleaza migratiile manuale SQL
node scripts/force-migration.js

# 4. Backfill coduri postale (optional, ignora erori)
LIMIT=5 npm run backfill:postal-codes || echo "Backfill skipped"

# 5. Porneste aplicatia
NODE_OPTIONS="--max-old-space-size=4096" npm run start
```

### Note

- `set -e` - scriptul se opreste la prima eroare (cu exceptia comenzilor cu `|| true`)
- `prisma migrate resolve --applied` rezolva migratii care au fost aplicate manual dar nu sunt in `_prisma_migrations`
- `NODE_OPTIONS="--max-old-space-size=4096"` - creste limita memorie la 4GB

---

## Strategia de Migrari

Proiectul foloseste **doua sisteme de migrari** in paralel:

### 1. Migratii Prisma (Auto-generate)

**Director:** `prisma/migrations/`

Migratii generate automat de Prisma din diferentele de schema:

```
prisma/migrations/
├── 20260107_ads_webhooks_optimization/
│   └── migration.sql
├── 20260216_add_order_notes/
│   └── migration.sql
├── 20260216_allow_multiple_invoices_per_order/
│   └── migration.sql
└── 20260217_add_repair_invoices/
    └── migration.sql
```

**Comenzi:**
- `npx prisma migrate dev` - Creeaza migratie noua (dezvoltare)
- `npx prisma migrate deploy` - Aplica migratii in productie
- `npx prisma migrate resolve --applied <name>` - Marcheaza migratie ca aplicata

### 2. Migratii Manuale SQL

**Director:** `prisma/manual-migrations/`

Fisiere SQL executate direct prin `pg` (driver PostgreSQL nativ), fara Prisma. Folosite cand Prisma nu poate genera migratia corecta sau cand se fac modificari care trebuie aplicate idempotent.

```
prisma/manual-migrations/
├── add_multi_company_support.sql
├── add_trendyol_stores.sql
├── add_temu_tables.sql
├── add_task_management.sql
├── add_bulk_publish_job.sql
├── add_bulk_push_job.sql
├── add_courier_manifest_tables.sql
├── add_customer_notes.sql
├── add_failed_invoice_attempts.sql
├── add_intercompany_series_name.sql
├── add_internal_order_statuses.sql
├── add_oblio_series_name_to_store.sql
├── add_order_source_field.sql
├── add_reception_workflow.sql
├── add_return_awbs.sql
├── add_trendyol_order_tracking_fields.sql
├── add_trendyol_product_fields.sql
├── add_unknown_awb_status.sql
├── map_masterproduct_to_inventoryitem.sql
└── 20260204_add_external_handle.sql
```

---

## Script Force Migration

**Fisier:** `scripts/force-migration.js`

Executor de migratii manuale SQL. Ruleaza automat la fiecare deploy (din `deploy-start.sh`).

### Cum Functioneaza

1. Conectare la PostgreSQL folosind `DATABASE_URL`
2. Citeste toate fisierele `.sql` din `prisma/manual-migrations/`
3. Sorteaza alfabetic (ordine consistenta)
4. Executa fiecare fisier statement cu statement

### Gestionare Erori

Scriptul este **idempotent** - ignora erorile "deja exista":

```javascript
// Erori ignorate (migratie deja aplicata):
- 'already exists'
- 'does not exist'
- 'duplicate'
- error code 42701 (duplicate column)
- error code 42P07 (duplicate table)
- error code 42710 (duplicate object)
- error code 42703 (column does not exist)
```

### Gestionare Blocuri DO $$

Scriptul parseaza corect blocurile PL/pgSQL `DO $$ ... $$;` care contin `;` interior:

```sql
DO $$
BEGIN
  IF NOT EXISTS (...) THEN
    ALTER TABLE ... ADD COLUMN ...;
  END IF;
END
$$;
```

### Raportare

La sfarsit afiseaza statistici per fisier:
- Executate cu succes
- Sarite (deja aplicate)
- Erori

---

## Variabile de Mediu Necesare

| Variabila | Descriere | Obligatorie |
|---|---|---|
| `DATABASE_URL` | Connection string PostgreSQL | Da |
| `NEXTAUTH_URL` | URL-ul aplicatiei (ex: `https://app.example.com`) | Da |
| `NEXTAUTH_SECRET` | Secret pentru JWT NextAuth | Da |
| `GOOGLE_CLIENT_ID` | OAuth Google Client ID | Da |
| `GOOGLE_CLIENT_SECRET` | OAuth Google Client Secret | Da |
| `CRON_SECRET` | Secret pentru autorizare cron jobs | Da |
| `SESSION_TIMEOUT_MINUTES` | Durata sesiune (default: 30) | Nu |
| `ALLOWED_EMAILS` | Lista email-uri permise (comma-separated) | Nu |
| `EMBED_SECRET_TOKEN` | Token pentru acces embed iframe | Nu |
| `EMBED_ALLOWED_DOMAINS` | Domenii permise pentru iframe (comma-separated) | Nu |

---

## Flux Complet de Deploy

```
1. Push pe branch main
       │
2. Railway detecteaza push
       │
3. BUILD:
   ├── npm install --legacy-peer-deps
   └── npx prisma generate && npm run build
       │
4. DEPLOY (deploy-start.sh):
   ├── prisma migrate resolve (migratii problematice)
   ├── prisma migrate deploy (migratii Prisma)
   ├── node scripts/force-migration.js (migratii manuale SQL)
   ├── backfill postal codes (optional)
   └── NODE_OPTIONS="--max-old-space-size=4096" npm run start
       │
5. Aplicatia este live
       │
6. La eroare -> restart automat (max 10 incercari)
```

---

## Probleme Cunoscute

### Git Pack Objects SIGBUS

Repository-ul local poate avea obiecte git corupte. Workaround:
1. Cloneaza fresh in `/tmp`
2. Copiaza fisierele modificate
3. Commit + push din copia fresh
4. Curatare

Alternativ: `git config pack.windowMemory 50m && git config pack.threads 1`

### TypeScript Build Errors

`next.config.js` are `ignoreBuildErrors: true` din cauza generarii Prisma Client in pipeline-ul de build. Prisma Client trebuie generat inainte de compilarea TypeScript, iar ordinea nu este intotdeauna garantata.
