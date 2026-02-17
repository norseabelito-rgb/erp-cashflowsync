# Prompturi Claude Code pentru Debugging

Prompturi gata de utilizat pentru Claude Code in contexte comune de debugging.

---

## Facturare

### Investigare factura nereusita

```
Verifica de ce comanda #XXXXX nu s-a facturat. Citeste src/lib/invoice-service.ts si verifica:
1. Comanda exista in baza de date?
2. Are deja o factura emisa? (hasIssuedInvoice)
3. Are firma asociata cu credentiale Oblio?
4. Are serie de facturare configurata?
5. Are produse (lineItems)?
6. Exista un transfer pending?
Verifica si tabela FailedInvoiceAttempt pentru aceasta comanda.
```

### Investigare eroare Oblio

```
Investigheaza eroarea Oblio "[MESAJ_EROARE]" pentru comanda #XXXXX.
Citeste src/lib/oblio.ts si verifica:
1. Este eroare de autentificare (OblioAuthError)?
2. Este eroare de validare (OblioValidationError)?
3. Este eroare de retea/timeout?
Verifica credentialele firmei (oblioEmail, oblioSecretToken, oblioCif).
```

### Stornare factura esuata

```
De ce stornarea facturii [SERIE][NUMAR] a esuat? Citeste:
- src/lib/oblio.ts metoda stornoInvoice()
- Verifica ca seria si numarul sunt corecte
- Verifica ca factura nu a fost deja stornata
- Verifica log-urile cu prefix [Oblio] pentru detalii
```

### Verificare serie facturare

```
Verifica configurarea seriei de facturare pentru magazinul [NUME_MAGAZIN].
Citeste src/lib/invoice-service.ts si verifica:
1. Store are oblioSeriesName configurat? (prioritate 1)
2. Store are invoiceSeries asociata si activa? (prioritate 2)
3. Company are serie default? (prioritate 3)
4. Seria exista efectiv in contul Oblio al firmei?
```

---

## AWB si Curierat

### Investigare AWB esuat

```
De ce AWB-ul pentru comanda #XXXXX a esuat? Citeste:
- src/lib/awb-service.ts metoda createAWBForOrder()
- src/lib/fancourier.ts metoda createAWB()
Verifica:
1. Comanda are firma cu credentiale FanCourier?
2. Adresa destinatarului e completa (strada, oras, judet)?
3. Telefonul e in format valid (0XXXXXXXXX)?
4. Exista deja un AWB activ pentru aceasta comanda?
Cauta in Railway logs blocul "FANCOURIER - EROARE LA GENERARE AWB".
```

### Status AWB necunoscut

```
Ce inseamna statusul AWB "[COD_STATUS]"? Citeste src/lib/fancourier-statuses.ts si gaseste:
- Descrierea statusului
- Categoria (tranzit, livrare, problema, retur, etc.)
- Daca e status final (isFinal)
- Actiunea recomandata
```

### AWB sters din FanCourier

```
Investigheaza de ce AWB-ul [NUMAR_AWB] apare ca sters. Citeste:
- src/lib/sync-service.ts functia detectAWBChangeType()
- Verifica daca statusul anterior era valid
- Verifica daca eroarea de tracking contine "negasit" sau "not found"
- Cauta in Railway logs "[CronLock]" si "AWB_SYNC_ERROR"
```

### Mismatch firma AWB

```
De ce apare avertisment de mismatch la crearea AWB-ului pentru comanda #XXXXX?
Citeste src/lib/awb-service.ts si verifica:
1. Care e billingCompany pe comanda?
2. Care e company pe store?
3. Sunt diferite? (hasMismatch linia 166)
4. Utilizatorul trebuie sa confirme manual (acknowledgeMismatchWarning)
```

---

## Sincronizare

### Cron nu ruleaza

```
Verifica de ce cron-ul de sincronizare nu ruleaza. Citeste:
- src/lib/cron-lock.ts
Verifica:
1. Exista un lock activ in tabela CronLock? (SELECT * FROM "CronLock")
2. Lock-ul e expirat? (expiresAt < NOW())
3. Cand a fost ultima sincronizare? (SELECT * FROM "SyncLog" ORDER BY "startedAt" DESC LIMIT 5)
4. Ultima sincronizare s-a terminat cu erori?
```

### Sincronizare esuata

```
Investigheaza eroarea de sync din [DATA/ORA]. Citeste:
- src/lib/sync-service.ts
Verifica:
1. In tabela SyncLog, care e statusul ultimei sincronizari?
2. Ce erori apar in SyncLogEntry?
3. FanCourier e configurata? (fancourierClientId, fancourierUsername, fancourierPassword)
4. Cate comenzi au fost procesate vs cate au avut erori?
```

### Comanda nu apare din Shopify

```
De ce comanda Shopify #XXXXX nu apare in sistem? Citeste:
- src/lib/shopify.ts metoda getOrders()
Verifica:
1. Comanda exista in Shopify? (verificat cu shopifyId)
2. Store-ul este configurat corect (domain, accessToken)?
3. Webhook-ul de orders/create e activ?
4. Exista erori de import in Railway logs?
5. Comanda a fost importata dar cu un numar diferit?
```

### Comenzi duplicate

```
Verifica daca exista comenzi duplicate pentru numarul #XXXXX.
Verifica in baza de date:
1. SELECT * FROM orders WHERE "shopifyOrderNumber" = 'XXXXX';
2. Au shopifyId diferit? (atunci sunt comenzi diferite cu acelasi numar)
3. Au shopifyId identic? (atunci e duplicare la import)
```

---

## Baza de Date

### Migrare esuata

```
Investigheaza de ce migrarea [NUME_MIGRARE] a esuat. Citeste:
- scripts/force-migration.js
- scripts/deploy-start.sh
Verifica:
1. Ce eroare apare in Railway deploy logs?
2. Migrarea e in prisma/migrations/ sau prisma/manual-migrations/?
3. Exista deja structura in baza de date? (duplicate table/column)
4. Este o problema de permisiuni SQL?
```

### Connection pool epuizat

```
Investigheaza erori de conexiune la baza de date. Verifica:
1. Railway PostgreSQL Metrics - cate conexiuni active sunt?
2. Exista tranzactii blocate? (SELECT * FROM pg_stat_activity WHERE state = 'active')
3. Prisma connection pool size e suficient?
4. Exista query-uri care dureaza prea mult? (SELECT * FROM pg_stat_activity WHERE state = 'active' AND query_start < NOW() - interval '60 seconds')
```

---

## Interfata (Frontend)

### Pagina nu se incarca

```
Verifica de ce pagina [URL] nu se incarca.
Verifica:
1. Exista erori in browser console (F12)?
2. Ce status code returneaza API-ul? (Network tab)
3. Exista erori in Railway logs la momentul accesarii?
4. E o problema de autentificare (401/403)?
5. E o problema de date (500 cu stack trace)?
```

### Date incorecte afisate

```
De ce pagina [URL] afiseaza date incorecte? Verifica:
1. API-ul returneaza datele corecte? (Network tab > Response)
2. Query-ul din API route e corect? (verifica filtri, sortare, paginare)
3. Frontend-ul proceseaza corect datele? (state management)
4. Cache-ul browser-ului e vechi? (hard refresh cu Ctrl+Shift+R)
```

---

## Multi-companie

### Factura pe firma gresita

```
De ce factura pentru comanda #XXXXX a fost emisa pe firma gresita?
Citeste src/lib/invoice-service.ts si verifica:
1. Care e billingCompany pe comanda? (linia 355)
2. Care e company pe store?
3. Ordinea de prioritate: billingCompany > store.company
4. Comanda era B2B? (isRealB2B = billingCompany.id !== store.companyId)
5. Verifica in Oblio daca factura apare pe CIF-ul corect
```

### Credentiale amestecate intre firme

```
Verifica separarea credentialelor intre firme. Citeste:
- src/lib/oblio.ts - createOblioClient() creeaza client per firma
- src/lib/fancourier.ts - tokenCache e keyed per clientId:username
Verifica ca fiecare firma are:
1. Propriul oblioEmail si oblioSecretToken
2. Propriul fancourierClientId, fancourierUsername, fancourierPassword
3. Propriul CIF (oblioCif/cif)
```

---

## Repair Invoices

### Facturi self-invoiced (auto-facturare)

```
Verifica daca exista facturi auto-emise (client = firma emitenta).
Pagina: /admin/repair-invoices (super admin)
Citeste:
- src/app/api/admin/repair-invoices/route.ts
- src/app/(dashboard)/admin/repair-invoices/page.tsx
Procesul:
1. API-ul paginaza toate facturile din Oblio (GET /docs/invoice/list)
2. Compara client name cu company name
3. Cross-referinta cu DB prin mentions ("Comanda online: #XXXXX")
4. Afiseaza facturile afectate cu optiunea de stornare + re-emitere
```
