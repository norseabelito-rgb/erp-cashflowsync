# Dead Code - Catalog

**Data:** 2026-01-23
**Sursa:** Audit Phase 1 + User decisions din 01-01

---

## Cod Mort Confirmat

### FreshSales Integration

**Status:** **STERGE** (user confirmat)

**Cautare efectuata:**
- Pattern: `freshsales`, `FreshSales`, `fresh_sales`, `FRESHSALES`
- Rezultat: **0 fisiere** gasite in `/src`

**Concluzie:**
FreshSales nu exista in codul sursa actual. Este mentionat doar in documentatia de planning/audit. Este posibil sa fi fost deja sters sau sa fi fost doar planificat.

**Actiune Phase 5:**
- Verificare finala ca nu exista referinte
- Cleanup in CONCERNS.md (stergere mentiuni)

---

### BaseLinker Integration

**Status:** **STERGE** (user confirmat)

**Cautare efectuata:**
- Pattern: `baselinker`, `BaseLinker`, `base_linker`, `BASELINKER`
- Rezultat: **0 fisiere** gasite in `/src`

**Concluzie:**
BaseLinker nu exista in codul sursa actual. Similar cu FreshSales, exista doar in documentatie.

**Actiune Phase 5:**
- Verificare finala ca nu exista referinte
- Cleanup in CONCERNS.md (stergere mentiuni)

---

## Cod Posibil Mort (Necesita Confirmare)

### Ads Module (Meta/TikTok/Google)

**Status:** NECLAR - Necesita confirmare utilizator

**Fisiere gasite:**

| Tip | Fisier | Linii |
|-----|--------|-------|
| Lib | `src/lib/meta-ads.ts` | 2536 |
| Lib | `src/lib/tiktok-ads.ts` | - |
| Lib | `src/lib/ads-oauth-state.ts` | - |
| Lib | `src/lib/ads-config.ts` | - |
| API | `src/app/api/ads/**/*.ts` | ~3964 |
| Cron | `src/app/api/cron/ads-sync/route.ts` | 228 |
| Cron | `src/app/api/cron/ads-rollback/route.ts` | 168 |
| Cron | `src/app/api/cron/ads-alerts/route.ts` | 326 |
| UI | `src/app/(dashboard)/ads/page.tsx` | 418 |

**Total estimat:** ~7000+ linii cod

**Schema Prisma asociata:**
- `AdsSettings`, `AdsApp`, `AdsAccount` - Conturi conectate
- `AdsCampaign`, `AdsAdSet`, `AdsAd` - Campanii si creatives
- `AdsDailyStats` - Statistici zilnice
- `AdsAlertRule`, `AdsAlert` - Sistem alerte
- `AdsWebhookConfig`, `AdsWebhookEvent` - Webhook handling
- `AdsCampaignProduct` - Mapping campanii-produse
- `AdsCreative` - Librarie creative

**CONCERNS.md referinte:**
- "OAuth State Management in Memory" - Potential memory leak
- "Debug Logging Always Enabled" - `DEBUG_OAUTH = true` hardcoded
- Meta/TikTok webhook notification spam bug

**Intrebari pentru user:**
1. Este modulul Ads folosit activ in productie?
2. Sunt conectate conturi Meta/TikTok/Google?
3. Se monitorizeaza campanii prin acest dashboard?

**Decizie:**
- **PASTREAZA** pana la confirmare explicita de la user
- Investitie mare in cod (~7000 linii), nu stergem fara confirmare
- Daca nu e folosit, reprezinta ~7% din codul total (~101K linii)

---

### Trendyol Integration

**Status:** NECLAR - Necesita confirmare utilizator

**Fisiere gasite:**

| Tip | Fisier | Linii |
|-----|--------|-------|
| Lib | `src/lib/trendyol.ts` | 1067 |
| Lib | `src/lib/trendyol-status.ts` | 356 |
| API | `src/app/api/trendyol/**/*.ts` | ~847 |
| UI | `src/app/(dashboard)/trendyol/page.tsx` | 378 |

**Total estimat:** ~2650 linii cod

**Schema Prisma asociata:**
- `TrendyolOrder` - Comenzi Trendyol
- `TrendyolOrderItem` - Produse din comenzi
- `TrendyolProductMapping` - Mapare produse Trendyol -> local
- `TrendyolProduct` - Produse sincronizate
- `TrendyolCampaign`, `TrendyolCampaignProduct` - Campanii

**Integrare MasterProduct:**
- `MasterProduct.trendyolBarcode` - Barcode pentru Trendyol
- `MasterProduct.trendyolProductId` - ID in Trendyol
- `MasterProduct.trendyolStatus` - "pending", "approved", "rejected"

**Setari:**
- `Settings.trendyolSupplierId`, `trendyolApiKey`, `trendyolApiSecret`
- `Settings.trendyolInvoiceSeries` - Serie separata pentru comenzi Trendyol

**Intrebari pentru user:**
1. Trendyol integration este in productie sau in testing?
2. Exista comenzi reale din Trendyol?
3. Se planifica utilizare viitoare?

**Decizie:**
- **PASTREAZA** pana la confirmare explicita de la user
- User a mentionat "future Trendyol/Temu" in context
- Pare a fi implementat complet, probabil in faza de testare

---

## Recomandari

### Tabel Sumar

| Categorie | Fisiere | Linii | Decizie | Actiune |
|-----------|---------|-------|---------|---------|
| FreshSales | 0 | 0 | **STERGE** | Cleanup documentatie |
| BaseLinker | 0 | 0 | **STERGE** | Cleanup documentatie |
| Ads Module | ~20+ | ~7000 | CONFIRMA | Asteapta user decision |
| Trendyol | ~10 | ~2650 | CONFIRMA | Asteapta user decision |

### Impact Stergere (daca se confirma)

**FreshSales + BaseLinker:**
- Impact: ZERO (nu exista cod)
- Cleanup: Doar documente

**Ads Module (daca se sterge):**
- Impact: ~7% din codebase
- Dependencies: Schema Prisma (11 modele ads-related)
- Risk: Pierdere functionalitate ads dashboard
- Migrari necesare: Stergere modele Prisma, cleanup DB

**Trendyol (daca se sterge):**
- Impact: ~2.6% din codebase
- Dependencies: Schema Prisma (5 modele), MasterProduct fields
- Risk: Pierdere integrare marketplace
- Migrari necesare: Stergere modele Prisma, cleanup fields

---

## Alte Observatii

### Posibil Cod Redundant (nu mort, dar duplicate)

| Pagina/Feature | Status | Observatie |
|----------------|--------|------------|
| /stores vs Settings | Redundant | Aceleasi actiuni in doua locuri |
| /processing-errors vs Orders tab | Partial redundant | Erori afisate si in Orders |

### Cod Activ dar Nefolosit Frecvent

| Feature | Utilizare | Nota |
|---------|-----------|------|
| /docs (1886 linii) | Neclar | Documentatie interna - verificat daca e actualizata |
| AI Insights module | Neclar | Feature avansat, trebuie verificat |

---

## Intrebari Ramase pentru User

1. **Ads Module:**
   - Este conectat la conturi Meta/TikTok?
   - Se foloseste dashboard-ul pentru monitorizare campanii?
   - Daca nu, preferati sa il pastram pentru viitor sau sa il stergem?

2. **Trendyol Integration:**
   - Exista comenzi reale din Trendyol in DB?
   - Este in plan utilizarea in viitorul apropiat?
   - Daca nu, preferati cleanup sau pastrare?

3. **Module secundare:**
   - `/docs` - documentatie actualizata?
   - AI Insights - se foloseste?

---

*Generat: 2026-01-23*
*User confirmation: FreshSales, BaseLinker -> STERGE (01-01 checkpoint)*
*Pending confirmation: Ads, Trendyol*
