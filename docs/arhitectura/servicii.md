# Servicii (src/lib/)

## Privire de Ansamblu

Toate serviciile se gasesc in `src/lib/`. Ele contin logica business, clienti API externi si utilitare.

---

## Servicii Core

### `db.ts`
Singleton Prisma Client. Exporta instanta globala `prisma` reutilizata in toata aplicatia.

### `auth.ts`
Configurare NextAuth.js: provideri (Google, Credentials), callbacks JWT/Session, setup SuperAdmin la primul login. Vezi [autentificare-si-permisiuni.md](autentificare-si-permisiuni.md).

### `permissions.ts`
Sistem RBAC complet: definirea tuturor permisiunilor, rolurilor default, functii de verificare (`hasPermission`, `hasStoreAccess`, `getUserPermissions`). Vezi [autentificare-si-permisiuni.md](autentificare-si-permisiuni.md).

### `embed-auth.ts`
Validare token Bearer pentru acces iframe (embed in Daktela).

---

## Servicii Facturare

### `invoice-service.ts`
Serviciu unificat pentru emiterea facturilor. Foloseste Oblio pentru emitere cu credentiale per firma si numerotare locala. Gestioneaza:
- Emitere facturi B2C si B2B
- Detectia clientilor B2B (isRealB2B)
- Stornare facturi
- Procesare stoc la facturare
- Functii principale: `issueInvoice()`, `stornoInvoice()`

### `invoice-series.ts`
Gestionarea seriilor de facturare: numerotare automata, cautare serie per firma.
- `getNextInvoiceNumber()`, `getInvoiceSeriesForCompany()`

### `invoice-errors.ts`
Mesaje de eroare prietenoase pentru erorile de facturare.
- `getInvoiceErrorMessage()`

### `invoice-helpers.ts`
Functii helper pentru verificare facturi existente.
- `hasIssuedInvoice()`, `getActiveInvoice()`

---

## Servicii AWB & Curierat

### `awb-service.ts`
Serviciu unificat pentru crearea AWB-urilor cu credentiale per firma FanCourier. Trimite tracking catre Trendyol/Temu dupa creare.
- `createAWBForOrder()`

### `awb-status.ts`
Mapare si categorizare statusuri AWB (FanCourier -> categorii interne).
- `getCategoryFilterConditions()`

### `fancourier-statuses.ts`
Nomenclator complet statusuri FanCourier cu coduri, categorii si traduceri romanesti.
- `FANCOURIER_STATUSES`, `getFanCourierStatus()`, `isPickupStatus()`

---

## Servicii Sincronizare

### `sync-service.ts`
Logica de sincronizare cu logging detaliat. Creeaza sesiuni SyncLog cu entries individuale.
- `createSyncSession()`, `addLogEntry()`, `completeSyncSession()`

### `shopify.ts`
Client API Shopify: sincronizare comenzi din toate store-urile, creare draft orders, gestionare fulfillments.
- `syncAllStoresOrders()`, `createDraftOrder()`

### `trendyol-order-sync.ts`
Sincronizare comenzi Trendyol -> Order local.

### `temu-order-sync.ts`
Sincronizare comenzi Temu -> Order local.

### `trendyol-stock-sync.ts`
Sincronizare stoc si preturi catre Trendyol.
- `syncAllProductsToTrendyol()`

### `temu-stock-sync.ts`
Sincronizare stoc catre Temu.

---

## Servicii Operationale

### `handover.ts`
Logica predare curier: Lista 1 (Predare Azi), Lista 2 (Nepredate), scanare AWB, finalizare/redeschidere.
- `getHandoverAWBs()`, `scanAWBForHandover()`, `checkAutoFinalize()`

### `returns.ts`
Gestionare retururi: matching return AWB cu comanda originala.

### `intercompany-service.ts`
Decontari intercompany. Aquaterra (firma primara) factureaza firmele secundare pe baza pretului de achizitie + markup.
- `getSettlementPreview()`, `generateSettlementInvoice()`, `runWeeklySettlement()`

### `dashboard-stats.ts`
Calcul statistici pentru dashboard: vanzari zilnice, comenzi, AWB-uri, stoc scazut.

---

## Servicii Inventar

### `inventory-stock.ts`
Calcul stoc real (per depozit sau total), procesare stoc la facturare, alerte stoc scazut.
- `processInventoryStockForOrderFromPrimary()`, `getLowStockAlerts()`

### `stock.ts`
Serviciu stoc legacy pentru modelul `Product`.

### `stock-transfer-service.ts`
Logica transferuri intre depozite.

### `reception-workflow.ts`
Workflow receptie marfa (NIR): creare, verificare, aprobare diferente.

---

## Servicii Marketplace

### `trendyol.ts`
Client API Trendyol: categorii, branduri, atribute, produse, comenzi. Autentificare Basic Auth.

### `trendyol-awb.ts`
Trimitere numar tracking catre Trendyol dupa creare AWB local.

### `trendyol-invoice.ts`
Trimitere link factura catre Trendyol.

### `trendyol-returns.ts`
Gestionare retururi Trendyol.

### `trendyol-status.ts`
Mapare statusuri Trendyol.

### `trendyol-batch-status.ts`
Verificare statusuri batch produse Trendyol.

### `trendyol-category-ai.ts`
Matching categorii Trendyol cu AI.

### `trendyol-courier-map.ts`
Mapare curieri Trendyol <-> curieri locali.

### `temu.ts`
Client API Temu: comenzi, produse. Autentificare OAuth + MD5 signature.

### `temu-awb.ts`
Trimitere tracking catre Temu.

### `temu-status.ts`
Mapare statusuri Temu.

---

## Servicii Advertising

### `meta-ads.ts`
Client Meta (Facebook) Ads API: sincronizare campanii, ad sets, ads, insights, management status/buget.

### `tiktok-ads.ts`
Client TikTok Ads API: sincronizare campanii, management status/buget.

### `ads-config.ts`
Configurare conturi ads.

### `ads-oauth-state.ts`
Gestionare state OAuth pentru conectare conturi ads.

---

## Servicii AI & Analiza

### `ai.ts`
Integrare Anthropic Claude pentru insights automatizate: analiza performanta ads, sugestii preturi, tracking aplicare.
- `analyzeAdsPerformance()`, `analyzeProductPrices()`, `saveInsights()`

---

## Servicii Suport

### `cron-lock.ts`
Mecanism de locking distribuit folosind baza de date. Previne executia concurenta a cron jobs. Vezi [cron-jobs.md](cron-jobs.md).

### `daktela.ts`
Integrare Daktela (CRM/call center): sincronizare contacte clienti cu date comenzi agregate.
- `buildDaktelaContactFromOrder()`, `syncContactToDaktela()`

### `anaf.ts`
Interogare API ANAF v9 pentru validare CUI/CIF si obtinere date firma.
- `lookupCui()`

### `google-drive.ts`
Integrare Google Drive: sincronizare imagini produse, backup baza de date.

### `notification-service.ts`
Trimitere notificari in-app (ex: NIR gata pentru verificare).

### `activity-log.ts`
Logare actiuni in `ActivityLog` cu referinte entitati.

### `pin-service.ts`
Gestionare PIN securitate pentru aprobari exceptii (stornare/incasare manuala).

### `document-numbering.ts`
Generare numere documente (transferuri, receptii) in format standardizat.

### `validators.ts`
Validari (telefon, adresa, etc.).

### `excel.ts`
Export date in format Excel cu stiluri si formatare.

### `bulk-publish-worker.ts`
Worker pentru publicare bulk produse pe canale multiple.

---

## Utilitare

### `utils.ts`
Functii utilitare generale (ex: `cn()` pentru class names cu tailwind-merge).

### `design-system.ts`
Constante design system (culori, spacing).

### `empty-states.ts`
Mesaje si configurari pentru stari goale in UI.

### `error-messages.ts`
Mesaje de eroare centralizate.

### `task-utils.ts`
Utilitare pentru task management.

---

## Diagrama Dependente Servicii

```
shopify.ts ─────────────┐
trendyol-order-sync.ts ─┤
temu-order-sync.ts ─────┤
                        ▼
              invoice-service.ts ──> oblio.ts (API)
                   │                    │
                   │              invoice-series.ts
                   │              invoice-errors.ts
                   ▼
              awb-service.ts ────> fancourier.ts (API)
                   │
                   ├──> trendyol-awb.ts (send tracking)
                   └──> temu-awb.ts (send tracking)

              intercompany-service.ts ──> oblio.ts
                        │
              handover.ts ──> fancourier-statuses.ts

              ai.ts ──> meta-ads.ts
                   └──> tiktok-ads.ts

              daktela.ts ──> (API extern)
              anaf.ts ──> (API ANAF)

              Toate serviciile ──> db.ts (Prisma)
                              └──> activity-log.ts
```
