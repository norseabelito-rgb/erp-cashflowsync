# Dashboard - Audit

**Auditat:** 2026-01-23
**Status:** Functioneaza
**URL:** /dashboard
**Fisier:** src/app/(dashboard)/dashboard/page.tsx
**Linii cod:** 671 (Server Component)

## Scopul Paginii

Pagina principala de overview pentru toata afacerea. Afiseaza KPI-uri cheie (vanzari, comenzi de procesat, livrari, ROAS ads), grafice de vanzari, AI insights, comenzi recente, alerte stoc scazut, si lista magazine active.

## Elemente UI

### KPI Cards (Rand Principal)

| Element | Date | Link | Status | Linie cod |
|---------|------|------|--------|-----------|
| Vanzari Azi | todaySalesTotal, todayOrderCount, salesTrend | /invoices | OK | 403-411 |
| De procesat | pendingOrders + validatedOrders | /orders?status=PENDING,VALIDATED | OK | 412-419 |
| Expediate | shipped | /tracking | OK | 420-427 |
| ROAS Ads | adsROAS, activeCampaigns | /ads | OK | 428-436 |

### Grafice (Charts Row)

| Element | Functionalitate | Status | Linie cod |
|---------|-----------------|--------|-----------|
| DashboardCharts | Grafic vanzari ultimele 7 zile + filtru magazin | OK | 441-447 |
| Sumar Rapid Card | Cheltuieli Ads, Venituri Ads, Total Produse, Stoc Scazut, Erori Validare | OK | 451-499 |

### AI Insights Section

| Element | Functionalitate | Status | Linie cod |
|---------|-----------------|--------|-----------|
| DashboardAIInsights | Component separat pentru recomandari AI | OK | 503-506 |
| Badge "N recomandari AI" | In header daca pendingInsights > 0 | OK | 387-398 |

### Comenzi Recente

| Element | Functionalitate | Status | Linie cod |
|---------|-----------------|--------|-----------|
| Lista 5 comenzi recente | Numar comanda, magazin, client, valoare, status, data | OK | 511-565 |
| Link "Vezi toate" | Navigare la /orders | OK | 516-521 |
| Empty state | Mesaj + link adauga magazin | OK | 525-532 |

### Stoc Scazut

| Element | Functionalitate | Status | Linie cod |
|---------|-----------------|--------|-----------|
| Lista produse stoc <= 5 | Nume, SKU, badge cantitate | OK | 567-613 |
| Link "Inventar" | Navigare la /products?lowStock=true | OK | 575-578 |
| Empty state | Mesaj "Toate produsele au stoc suficient" | OK | 584-590 |

### Magazine Active

| Element | Functionalitate | Status | Linie cod |
|---------|-----------------|--------|-----------|
| Grid magazine | Nume, domeniu, numar comenzi | OK | 617-666 |
| Link "Gestionare" | Navigare la /stores | OK | 621-625 |
| Empty state | Mesaj + link adauga magazin | OK | 630-637 |

## Comportament Observat

### Server Component
- Pagina e un Server Component (async function)
- Query-urile Prisma se executa direct in componenta
- Suspense boundaries pentru DashboardCharts si DashboardAIInsights
- Suporta query param `?store=ID` pentru filtrare pe magazin

### Date Agregate (getStats function)

**Comenzi:**
- totalOrders, pendingOrders, validatedOrders, validationFailed
- invoiced, shipped, delivered
- recentOrders (ultimele 5)

**Vanzari (raw SQL pentru performanta):**
- salesLast7Days (per zi)
- comparatie cu saptamana anterioara (trend)
- todaySalesTotal, todayOrderCount

**Stoc:**
- totalProducts
- lowStockProducts (stoc <= 5)

**Ads:**
- adsSpend, adsRevenue, adsROAS
- activeCampaigns count

**AI:**
- pendingInsights count

### Trend Calculation
- salesTrend = (thisWeek - lastWeek) / lastWeek * 100
- Afisare +/- cu iconita TrendingUp/TrendingDown

## Discrepante

| ID | Comportament Asteptat | Comportament Actual | Severitate |
|----|----------------------|---------------------|------------|
| D1 | Filtru pe magazin ar trebui sa afecteze toate cardurile | Doar graficul e filtrat, cardurile sunt globale | Deranjeaza |
| D2 | Refresh date fara full page reload | Server component - necesita refresh manual | Cosmetic |
| D3 | Comparatie cu aceeasi zi saptamana trecuta | Comparatie cu total saptamana trecuta | Cosmetic |

## Cod Mort / Nefolosit

Nu am identificat cod mort in aceasta pagina.

## Note pentru Planificare

### Performance Observations
- Query-urile sunt executate in paralel cu Promise.all - bine optimizat
- Raw SQL pentru vanzari (evita overhead Prisma)
- Suspense boundaries pentru loading states

### Dependente
- DashboardCharts (component separat)
- DashboardAIInsights (component separat)
- Toate datele vin din DB (nu API calls externe)

### Puncte de Imbunatatire
1. Filtru pe magazin sa afecteze toate cardurile
2. Real-time updates (WebSocket sau polling)
3. Date range selector (nu doar ultimele 7 zile)
4. Export dashboard ca PDF/imagine
5. Custom KPI configuration

---

*Audit complet: 2026-01-23*
