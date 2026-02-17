# ERP CashFlowSync - Documentatie

Documentatie completa pentru aplicatia ERP CashFlowSync. Scrisa pentru developeri noi care vor folosi Claude Code.

---

## Cuprins

### Arhitectura

| Fisier | Descriere |
|--------|-----------|
| [Prezentare Generala](arhitectura/prezentare-generala.md) | Tech stack, structura proiect, dependente |
| [Baza de Date](arhitectura/baza-de-date.md) | Schema Prisma completa (modele, relatii, enum-uri) |
| [Autentificare si Permisiuni](arhitectura/autentificare-si-permisiuni.md) | NextAuth, JWT, RBAC, coduri de permisiuni |
| [Servicii](arhitectura/servicii.md) | Service layer (`/src/lib/`) - ce face fiecare |
| [Integrari Externe](arhitectura/integrari-externe.md) | Oblio, FanCourier, Shopify, Trendyol, Temu, Daktela, ANAF |
| [Cron Jobs](arhitectura/cron-jobs.md) | Toate cron-urile, schedule, mecanism de locking |
| [Deploy si Migrari](arhitectura/deploy-si-migrari.md) | Railway config, deploy flow, migratii Prisma + custom SQL |

### Pagini

| Fisier | Descriere |
|--------|-----------|
| [Dashboard](pagini/dashboard.md) | Statistici, grafice, filtre |
| [Comenzi](pagini/comenzi.md) | Lista comenzi, modal detalii, procesare, note |
| [Clienti](pagini/clienti.md) | Lista clienti, modal detalii, analitice |
| [Facturi](pagini/facturi.md) | Lista facturi, stornare, plata, filtre |
| [Produse](pagini/produse.md) | Catalog, categorii, mapare inventar |
| [Inventar](pagini/inventar.md) | Stocuri, transferuri, receptii, NIR, PO, furnizori, retete, rapoarte |
| [AWB-uri](pagini/awb-uri.md) | Tracking, statusuri, istoric, statistici |
| [Picking](pagini/picking.md) | Liste picking, creare, loguri |
| [Predare Curier](pagini/predare-curier.md) | Scanare, predare, manifest, rapoarte |
| [Retururi](pagini/retururi.md) | Scanare retururi, manifest retururi |
| [Taskuri](pagini/taskuri.md) | Management taskuri, filtre, prioritati |
| [Trendyol](pagini/trendyol.md) | Produse, mapare categorii, publicare, comenzi |
| [Temu](pagini/temu.md) | Dashboard, comenzi |
| [Ads](pagini/ads.md) | Dashboard ads, campanii, produse, pixeli, conturi, alerte |
| [Setari](pagini/setari.md) | General, companii, depozite, serii, useri, roluri, audit |
| [Monitorizare](pagini/monitorizare.md) | Erori procesare, activitate, istoric sync |
| [Intercompany](pagini/intercompany.md) | Decontari, facturi intercompany |
| [Admin](pagini/admin.md) | Repair invoices (pagina ascunsa) |

### API

| Fisier | Descriere |
|--------|-----------|
| [Comenzi](api/comenzi.md) | GET/POST/PUT /api/orders, process, process-all, export, notes |
| [Facturi](api/facturi.md) | /api/invoices/[id]/cancel, repair-invoices |
| [AWB](api/awb.md) | /api/awb/create, /api/awb/[id], /api/awb/refresh, tracking |
| [Clienti](api/clienti.md) | /api/customers/[email] |
| [Inventar](api/inventar.md) | inventory, inventory-items, warehouses, transfers, stock/movements |
| [Picking](api/picking.md) | /api/picking, aggregate, logs, print |
| [Predare Curier](api/predare-curier.md) | /api/handover/today, scan, finalize, reopen, report |
| [Produse](api/produse.md) | /api/products, categories, suppliers |
| [Sincronizare](api/sincronizare.md) | /api/sync/full, store sync |
| [Utilizatori si RBAC](api/utilizatori-si-rbac.md) | /api/rbac/*, /api/user/profile, invitations |
| [Setari](api/setari.md) | /api/settings, stores, printers |
| [Trendyol](api/trendyol.md) | /api/trendyol/orders, stats, mapping |
| [Temu](api/temu.md) | /api/temu/orders, stats |
| [Ads](api/ads.md) | /api/ads/*, campaigns, accounts, pixels, webhooks |
| [Cron](api/cron.md) | /api/cron/* (toate cron endpoints) |
| [Webhooks](api/webhooks.md) | /api/webhooks/shopify, meta |
| [Admin](api/admin.md) | /api/admin/repair-invoices, daktela-sync |
| [Print](api/print.md) | /api/print-client/*, printers, print-jobs |

### Flow-uri de Business

| Fisier | Descriere |
|--------|-----------|
| [Procesare Comanda](flowuri/procesare-comanda.md) | De la creare la factura, AWB, picking, predare |
| [Facturare](flowuri/facturare.md) | Pre-flight checks, Oblio API, serii, numerotare |
| [Creare AWB](flowuri/creare-awb.md) | FanCourier, multi-company, Trendyol/Temu tracking push |
| [Predare Curier](flowuri/predare-curier.md) | Scanare zilnica, finalizare, manifest |
| [Retururi si Stornare](flowuri/retururi-si-stornare.md) | Manifest retur, storno vs cancel vs delete, credit note |
| [Decontare Intercompany](flowuri/decontare-intercompany.md) | Settlement subsidiare, cost-based billing, markup |
| [Sincronizare Comenzi](flowuri/sincronizare-comenzi.md) | Shopify webhook, Trendyol pull, Temu pull, Daktela sync |
| [Transfer Stoc](flowuri/transfer-stoc.md) | Primary warehouse la order warehouse, workflow |

### Debugging

| Fisier | Descriere |
|--------|-----------|
| [Ghid General](debugging/ghid-general.md) | Unde te uiti cand crapa (Railway, consola, logs) |
| [Erori Comune](debugging/erori-comune.md) | Top 20+ erori cu solutii exacte |
| [Railway](debugging/railway.md) | railway login, link, connect postgres, deploy logs |
| [Migrari Baza de Date](debugging/migrari-baza-date.md) | Prisma migrate, manual SQL, force-migration.js |
| [Oblio](debugging/oblio.md) | Erori Oblio API, autentificare, token expired |
| [FanCourier](debugging/fancourier.md) | Erori FanCourier, token cache, AWB creation fails |
| [Sincronizare](debugging/sincronizare.md) | Sync fails, cron locks, duplicate orders |
| [Prompturi Claude Code](debugging/prompturi-claude.md) | Prompturi specifice pentru debugging cu Claude Code |

### Development

| Fisier | Descriere |
|--------|-----------|
| [Setup Local](development/setup-local.md) | Clone, install, env vars, prisma generate, dev server |
| [Structura Proiect](development/structura-proiect.md) | Directoare, conventii de fisiere |
| [Conventii Cod](development/conventii-cod.md) | Patterns folosite (React Query, Prisma, error handling) |
| [Adaugare Endpoint](development/adaugare-endpoint.md) | Pas cu pas: cum adaugi un API endpoint nou |
| [Adaugare Pagina](development/adaugare-pagina.md) | Pas cu pas: cum adaugi o pagina noua |
| [Variabile de Mediu](development/variabile-mediu.md) | Toate env vars cu descriere si exemplu |

---

## Conventii documentatie

- **Limba**: Romana
- **Format**: Markdown cu headere clare, tabele, blocuri de cod
- **Endpoint-uri API**: Includ metoda HTTP, URL, parametri, request/response body, exemple
- **Pagini**: Descriu ce se afiseaza, butoane, actiuni, modale, conditii de vizibilitate
- **Flow-uri**: Pas cu pas, cu referinte la fisierele sursa relevante
- **Debugging**: Include prompturi specifice pentru Claude Code
