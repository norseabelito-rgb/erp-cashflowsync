# Ghid General de Debugging

Acest document descrie strategia generala de debugging pentru aplicatia ERP CashFlowSync.

## Unde sa cauti cand ceva nu merge

### 1. Railway Dashboard (Productie)

Aplicatia ruleaza pe Railway. Aceasta este prima sursa de informatii:

- **Logs** - Toate `console.log` si `console.error` din aplicatie apar aici
- **Deploy logs** - Verifica daca ultimul deploy a reusit
- **Metrics** - CPU, memorie, network (daca memoria depaseste 4GB, aplicatia poate crapa)
- **Variables** - Variabilele de mediu (DATABASE_URL, chei API, etc.)

Detalii complete: [railway.md](railway.md)

### 2. Browser Console (Erori Frontend)

Deschide **Developer Tools** (F12) > **Console** pentru:

- Erori JavaScript (TypeError, ReferenceError)
- Erori de retea (Failed to fetch, 500, 401)
- Mesaje de warning React

**Network tab** - Verifica:
- Status code-ul raspunsurilor API (200, 400, 401, 500)
- Body-ul raspunsului pentru mesaje de eroare detaliate
- Timing-ul request-urilor (timeout daca >30s)

### 3. Raspunsuri API

Toate API-urile returneaza raspunsuri consistente:

```json
// Succes
{ "success": true, "data": {...} }

// Eroare
{ "error": "Mesaj de eroare in romana", "errorCode": "COD_EROARE" }
```

Coduri de eroare comune - vezi `src/lib/error-messages.ts`:
- `NETWORK_ERROR` - Probleme de conexiune
- `UNAUTHORIZED` / `SESSION_EXPIRED` - Sesiune expirata, re-login necesar
- `OBLIO_CONNECTION_ERROR` - Nu se poate conecta la Oblio
- `AWB_GENERATION_FAILED` - Eroare la generarea AWB
- `INVOICE_GENERATION_FAILED` - Eroare la generarea facturii

### 4. Erori Baza de Date

Simptome:
- Pagini care nu se incarca
- Erori "500 Internal Server Error"
- Mesaje "Connection refused" in logs

Cauze frecvente:
- **Connection pool epuizat** - Prea multe conexiuni simultane la PostgreSQL
- **Migrari esuate** - Schema nu corespunde cu codul
- **Lock-uri** - Tranzactii blocate

Verificare din Railway:
1. Deschide serviciul PostgreSQL in Railway
2. Verifica tab-ul **Metrics** (conexiuni active)
3. Verifica tab-ul **Logs** pentru erori

### 5. Erori la Deploy

Procesul de deploy (`scripts/deploy-start.sh`):
1. Rezolva migrarile marcate manual cu `prisma migrate resolve`
2. Ruleaza `prisma migrate deploy` (migrarile Prisma)
3. Ruleaza `node scripts/force-migration.js` (migrarile manuale SQL)
4. Ruleaza backfill optional (postal codes)
5. Porneste aplicatia cu `npm run start`

Daca deploy-ul esueaza, verifica:
- **Build errors** - Erori TypeScript in `npx prisma generate && npm run build`
- **Migration errors** - Schema Prisma incompatibila
- **Force migration errors** - SQL invalid in `prisma/manual-migrations/`
- **Runtime errors** - Aplicatia crapa imediat dupa pornire

## Strategia de Debugging

### Pas 1: Identifica sursa erorii

| Simptom | Sursa probabila |
|---------|-----------------|
| Pagina alba / "Application error" | Eroare la build sau la pornire (Railway logs) |
| "Internal Server Error" | Eroare in API route (Railway logs) |
| "Failed to fetch" | Probleme de retea sau server down |
| Datele nu apar | Query gresit sau filtre incorecte |
| Factura nu se genereaza | Oblio API sau configurare lipsa |
| AWB nu se genereaza | FanCourier API sau adresa invalida |
| Sync nu ruleaza | Cron lock blocat sau eroare de configurare |

### Pas 2: Verifica log-urile

1. **Railway logs** - Cauta erori cu `[ERROR]`, `[Oblio]`, `[FanCourier]`, `[Invoice]`
2. **Browser console** - Erori frontend si raspunsuri API
3. **Baza de date** - Tabela `SyncLog` si `SyncLogEntry` pentru sincronizari
4. **Tabela `FailedInvoiceAttempt`** - Facturi care au esuat

### Pas 3: Reproduce problema

- Incearca aceeasi actiune din interfata
- Verifica daca problema este consistenta sau intermitenta
- Verifica daca afecteaza un singur magazin/firma sau toate

### Pas 4: Rezolva

- Daca e eroare de configurare: corecteaza in Setari
- Daca e eroare de date: corecteaza datele in DB sau interfata
- Daca e bug in cod: fix + deploy
- Daca e eroare API externa: asteapta sau contacteaza suportul (Oblio/FanCourier)

## Fisiere cheie pentru debugging

| Fisier | Ce contine |
|--------|-----------|
| `src/lib/error-messages.ts` | Toate mesajele de eroare traduse in romana |
| `src/lib/invoice-errors.ts` | Coduri de eroare specifice facturilor |
| `src/lib/oblio.ts` | Client API Oblio cu erori custom |
| `src/lib/fancourier.ts` | Client API FanCourier cu validari locale |
| `src/lib/fancourier-statuses.ts` | Toate statusurile FanCourier cu descrieri |
| `src/lib/sync-service.ts` | Serviciul de sincronizare cu logging detaliat |
| `src/lib/cron-lock.ts` | Mecanismul de lock pentru cron-uri |
| `scripts/deploy-start.sh` | Script-ul de deploy |
| `scripts/force-migration.js` | Script-ul de migrari manuale |
