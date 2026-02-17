# Dashboard

**Ruta:** `/dashboard`
**Fisier:** `src/app/(dashboard)/dashboard/page.tsx`
**Tip:** Server Component (SSR)

## Descriere

Pagina principala a aplicatiei care ofera o vedere de ansamblu asupra afacerii: vanzari, comenzi, livrari, facturi, stocuri si magazine active.

## Filtre Globale

Componenta `DashboardFilters` (`dashboard-filters.tsx`) permite filtrarea tuturor datelor din dashboard.

| Filtru | Tip | Descriere |
|--------|-----|-----------|
| **Magazin** | Select | Filtreaza pe un singur magazin sau "Toate magazinele" |
| **Data start** | Date input | Data de inceput a perioadei |
| **Data sfarsit** | Date input | Data de sfarsit a perioadei |
| **Butoane rapide** | Butoane | "Azi", "Saptamana", "Luna" - seteaza automat intervalul |

Toate filtrele se persista in URL (`?store=...&startDate=...&endDate=...`). Datele se calculeaza in timezone Romania (`Europe/Bucharest`).

## Sectiuni

### 1. Carduri Statistici Principale (rand 1)

4 carduri cu gradient color care afiseaza:

| Card | Valoare | Descriere | Link |
|------|---------|-----------|------|
| **Vanzari** | Total valoare comenzi | Numar comenzi in perioada | `/invoices` |
| **De procesat** | Comenzi PENDING + VALIDATED | Comenzi care asteapta actiune | `/orders?status=PENDING,VALIDATED` |
| **In Tranzit** | AWB-uri in tranzit | Colete in drum spre clienti | `/tracking?status=in_transit` |
| **Facturi emise** | Nr facturi in perioada | In perioada selectata | `/invoices` |

Cardul "De procesat" devine galben (warning) daca are peste 10 comenzi.

### 2. Carduri Canal (rand 2)

| Card | Valoare | Descriere | Link |
|------|---------|-----------|------|
| **Comenzi Shopify** | Nr comenzi | Valoare in RON | `/orders?source=shopify` |
| **Comenzi Trendyol** | Nr comenzi | Valoare in RON | `/orders?source=trendyol` |
| **Total Comenzi** | Total din toate canalele | Valoare totala | `/orders` |
| **Retururi** | Nr colete returnate | Colete refuzate sau returnate | `/tracking?status=returned` |

### 3. Grafice

Doua grafice afisate pe acelasi rand (`dashboard-charts.tsx`):

- **Comenzi Ultimele 7 Zile** - `AreaChart` (Recharts) cu vanzari pe zile, include:
  - Total vanzari
  - Media zilnica
  - Numar total comenzi
  - Tooltip cu detalii pe hover

- **Comenzi pe Ore** - `BarChart` cu distributia comenzilor pe intervale orare

### 4. Comenzi Recente

Tabel cu ultimele comenzi (din `stats.recentOrders`), care afiseaza:
- Numar comanda si badge magazin
- Nume client si valoare
- Status cu badge colorat
- Data comenzii

Link "Vezi toate" duce la `/orders`.

Daca nu exista comenzi, se afiseaza un `EmptyState` cu buton "Adauga Magazin" care duce la `/stores`.

### 5. Stoc Scazut

Lista articole din inventar cu stoc sub nivelul minim configurat sau la 0. Afiseaza:
- Nume articol
- SKU si stoc minim
- Stoc curent (rosu daca `out_of_stock`, galben daca sub minim)

Link "Inventar" duce la `/inventory?filter=low`.

### 6. Magazine Active

Grid cu toate magazinele configurate. Pentru fiecare magazin:
- Nume magazin cu icon
- Numar total de comenzi

Link "Gestionare" duce la `/stores`.

## Statusuri Comanda

| Status | Eticheta | Varianta badge |
|--------|----------|----------------|
| `PENDING` | In asteptare | warning |
| `VALIDATED` | Validat | info |
| `VALIDATION_FAILED` | Validare esuata | destructive |
| `INVOICED` | Facturat | success |
| `SHIPPED` | Expediat | info |
| `DELIVERED` | Livrat | success |
| `RETURNED` | Returnat | destructive |
| `CANCELLED` | Anulat | neutral |
| `INVOICE_ERROR` | Eroare factura | destructive |
| `AWB_ERROR` | Eroare AWB | destructive |

## Sursa Datelor

Datele vin din `getFilteredDashboardStats()` definita in `src/lib/dashboard-stats.ts`, care returneaza:
- `totalSales`, `orderCount`, `pendingOrders`, `validatedOrders`
- `inTransit`, `todayInvoices`
- `shopifyOrders`, `shopifyRevenue`, `trendyolOrders`, `trendyolRevenue`
- `totalOrders`, `returns`
- `salesData[]` (date/total/orders per zi)
- `ordersByHour[]`
- `recentOrders[]`
- `lowStockProducts[]`
- `stores[]`
