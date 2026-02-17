# Migrari Baza de Date

Documentatie pentru gestionarea migrarilor bazei de date in ERP CashFlowSync.

## Tipuri de Migrari

Aplicatia foloseste **doua sisteme de migrari** in paralel:

### 1. Prisma Migrations (Principal)

- **Folder**: `prisma/migrations/`
- **Comanda dev**: `npx prisma migrate dev --name descriptive_name`
- **Comanda productie**: `npx prisma migrate deploy`
- **Schema**: `prisma/schema.prisma`

Migrarile Prisma sunt generate automat din modificarile aduse la `schema.prisma`.

### 2. Migrari Manuale SQL

- **Folder**: `prisma/manual-migrations/`
- **Script**: `scripts/force-migration.js`
- **Executie**: Automat la deploy (dupa Prisma migrate)

Migrarile manuale sunt fisiere SQL executate direct prin `pg` client. Se folosesc cand:
- Trebuie adaugate coloane/tabele fara a modifica schema.prisma
- Migrarile Prisma nu pot gestiona o operatie complexa
- Trebuie adaugate date default sau facute transformari de date

## Prisma Migrate - Detalii

### Comenzi utile

```bash
# Dezvoltare locala - genereaza si aplica migrare
npx prisma migrate dev --name add_new_column

# Aplica migrarile existente (productie)
npx prisma migrate deploy

# Verifica statusul migrarilor
npx prisma migrate status

# Marcheaza o migrare ca aplicata (fara sa o ruleze)
npx prisma migrate resolve --applied 20260217_add_repair_invoices

# Regenereaza Prisma Client (dupa modificari schema)
npx prisma generate

# Deschide Prisma Studio (vizualizator DB)
npx prisma studio
```

### Migrarile existente

Exemple de migrari Prisma in proiect:

| Migrare | Descriere |
|---------|-----------|
| `20260107_ads_webhooks_optimization` | Optimizare webhooks si ads |
| `20260216_add_order_notes` | Adaugare note pe comenzi |
| `20260216_allow_multiple_invoices_per_order` | Suport facturi multiple per comanda |
| `20260217_add_repair_invoices` | Tabele pentru reparare facturi |

### Flux de lucru Prisma

1. Modifica `prisma/schema.prisma`
2. Ruleaza `npx prisma migrate dev --name descriptive_name`
3. Prisma genereaza un fisier SQL in `prisma/migrations/[timestamp]_[name]/migration.sql`
4. Commit fisierul de migrare si schema actualizata
5. La deploy, `prisma migrate deploy` aplica migrarile noi

## Migrari Manuale SQL - Detalii

### Cum functioneaza `force-migration.js`

Script-ul (`scripts/force-migration.js`) face urmatoarele:

1. Se conecteaza la PostgreSQL prin `DATABASE_URL`
2. Citeste toate fisierele `.sql` din `prisma/manual-migrations/`
3. Le sorteaza alfabetic
4. Executa fiecare statement SQL individual
5. **Ignora erorile** de tip:
   - `already exists` (tabela/coloana deja exista)
   - `does not exist` (DROP IF EXISTS)
   - `duplicate` (constrangere duplicata)
   - Coduri PostgreSQL: `42701` (coloana duplicata), `42P07` (tabela duplicata), `42710` (obiect duplicat), `42703` (coloana inexistenta)

Acest comportament permite ca script-ul sa fie **idempotent** - poate fi rulat de mai multe ori fara probleme.

### Fisiere de migrari manuale

Migrarile manuale existente in `prisma/manual-migrations/`:

| Fisier | Descriere |
|--------|-----------|
| `add_multi_company_support.sql` | Suport multi-companie |
| `add_oblio_series_name_to_store.sql` | Serie Oblio directa pe store |
| `add_failed_invoice_attempts.sql` | Tabela incercari esuate facturi |
| `add_task_management.sql` | Management sarcini |
| `add_temu_tables.sql` | Tabele Temu marketplace |
| `add_trendyol_stores.sql` | Tabele Trendyol |
| `add_return_awbs.sql` | AWB-uri de retur |
| `add_courier_manifest_tables.sql` | Tabele manifest curier |
| `add_reception_workflow.sql` | Workflow receptie marfa |
| `add_bulk_publish_job.sql` | Publicare in masa |
| `add_bulk_push_job.sql` | Push in masa |

### Adaugarea unei migrari manuale noi

1. Creeaza un fisier `.sql` in `prisma/manual-migrations/`:
   ```sql
   -- prisma/manual-migrations/add_new_feature.sql

   -- Adauga coloana doar daca nu exista
   DO $$ BEGIN
     ALTER TABLE "orders" ADD COLUMN "newField" TEXT;
   EXCEPTION WHEN duplicate_column THEN
     -- Coloana exista deja, skip
   END $$;
   ```

2. Testeaza local:
   ```bash
   DATABASE_URL="postgresql://..." node scripts/force-migration.js
   ```

3. Commit si deploy - script-ul ruleaza automat la deploy

### Conventii pentru migrari manuale

- Foloseste `DO $$ BEGIN ... EXCEPTION WHEN ... END $$;` pentru idempotenta
- Prefixeaza cu data daca ordinea conteaza: `20260204_add_external_handle.sql`
- Adauga comentarii SQL la inceputul fisierului
- Testeaza pe o baza de date de test inainte de deploy

## Erori Comune si Solutii

### "Migration failed to apply cleanly"

**Cauza**: Baza de date are modificari care nu se potrivesc cu migrarea Prisma.

**Solutie**:
```bash
# Daca migrarea a fost aplicata manual (prin SQL)
npx prisma migrate resolve --applied MIGRATION_NAME

# Daca migrarea trebuie recreata
npx prisma migrate dev --create-only
# Editeaza fisierul generat
npx prisma migrate deploy
```

### "P3009: migrate found failed migrations"

**Cauza**: O migrare anterioara a esuat si Prisma refuza sa continue.

**Solutie**:
```bash
# Marcheaza migrarea esuata ca aplicata (daca a fost corectata manual)
npx prisma migrate resolve --applied MIGRATION_NAME

# Sau marcheaza ca rolled-back
npx prisma migrate resolve --rolled-back MIGRATION_NAME
```

Nota: In `scripts/deploy-start.sh` linia 6, exista deja un resolve automat:
```bash
npx prisma migrate resolve --applied 20260217_add_repair_invoices 2>/dev/null || true
```

### "Prisma Migrate could not create the shadow database"

**Cauza**: Railway PostgreSQL nu permite crearea de baze de date noi (necesar pentru `migrate dev`).

**Solutie**: Ruleaza `migrate dev` doar local, nu pe Railway. Pe Railway se foloseste doar `migrate deploy`.

### Coloana adaugata manual nu apare in Prisma Client

**Cauza**: Coloana a fost adaugata prin migrare manuala dar nu e in `schema.prisma`.

**Solutie**: Adauga coloana si in `schema.prisma`, apoi ruleaza `npx prisma generate`. Sau accepta ca va fi accesibila doar prin `$queryRaw`.

### Script-ul force-migration.js esueaza

**Cauza**: SQL invalid sau eroare de conexiune.

**Diagnosticare**: Script-ul afiseaza output detaliat:
```
📊 Rezultat filename.sql:
   ✅ Executate cu succes: X
   ⏭️  Sarite (deja aplicate): Y
   ❌ Erori: Z
```

**Solutie**: Verifica erorile specifice (cod PostgreSQL si statement complet afisat in log).

## Best Practices

1. **Testeaza local inainte de deploy** - Ruleaza migrarile pe o copie locala
2. **Migrari mici si incrementale** - O modificare per migrare
3. **Nu edita migrarile existente** - Creeaza una noua in schimb
4. **Backup inainte de migrari critice** - Exporta baza de date din Railway
5. **Foloseste tranzactii** - Pentru migrari care modifica date existente
6. **Sincronizeaza schema.prisma** - Dupa migrari manuale, actualizeaza si schema
