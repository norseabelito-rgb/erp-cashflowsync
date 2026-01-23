# AWB (Tracking AWB) - Audit

**Auditat:** 2026-01-23
**Status:** Functioneaza
**URL:** /awb
**Fisier:** src/app/(dashboard)/awb/page.tsx
**Linii cod:** 478

## Scopul Paginii

Pagina de tracking pentru toate AWB-urile (airway bills / scrisori de transport). Afiseaza status livrari de la FanCourier/SelfAWB, permite filtrare si cautare, si navigare la detalii AWB individual.

## Elemente UI

### Actiuni (Butoane/Link-uri) - Header

| Element | Locatie | Functionalitate | Status | Linie cod |
|---------|---------|-----------------|--------|-----------|
| Refresh | Header dreapta | Reincarca lista AWB-uri | OK | 207-215 |

### Statistici (Cards)

| Element | Date | Click Action | Status | Linie cod |
|---------|------|--------------|--------|-----------|
| Total | stats.total | setStatusFilter("all") | OK | 219-224 |
| In tranzit | stats.inTransit | setStatusFilter("tranzit") | OK | 225-230 |
| Livrate | stats.delivered | setStatusFilter("livrat") + showDelivered | OK | 231-236 |
| Retururi | stats.returned | setStatusFilter("retur") | OK | 237-242 |
| In asteptare | stats.pending | setStatusFilter("pending") | OK | 243-248 |
| Anulate | stats.cancelled | setStatusFilter("anulat") | OK | 249-254 |
| Erori | stats.errors | (no action defined) | OK | 255-260 |

### Filtre

| Filtru | Tip | Optiuni | Status | Linie cod |
|--------|-----|---------|--------|-----------|
| Cautare | text input | AWB, comanda, client, SKU | OK | 268-279 |
| Status | select | Toate, In tranzit, Livrate, Retururi, In asteptare, Anulate | OK | 282-297 |
| Magazin | select | Lista stores | OK | 300-316 |
| Afiseaza livrate | checkbox | Include/exclude livrate | OK | 319-330 |
| Reseteaza filtrele | button | Clear all filters | OK | 333-347 |

### Coloane Tabel

| Coloana | Sursa | Status | Linie cod |
|---------|-------|--------|-----------|
| AWB | awbNumber + shopifyOrderNumber | OK | 389-394 |
| Data | createdAt | OK | 395-397 |
| Client | customerName + shippingCity/Province | OK | 398-406 |
| Status FanCourier | currentStatus (badge color-coded) | OK | 407-416 |
| Ramburs | cashOnDelivery | OK | 418-426 |
| Magazin | store.name | OK | 427-431 |
| Link | External link icon -> /awb/[id] | OK | 432-438 |

### Paginare

| Element | Functionalitate | Status | Linie cod |
|---------|-----------------|--------|-----------|
| Counter | "Afisez X - Y din Z AWB-uri" | OK | 447-451 |
| Anterior | Pagina anterioara | OK | 453-460 |
| Urmator | Pagina urmatoare | OK | 461-468 |

## Comportament Observat

### La Incarcare
1. Se incarca lista AWB-uri cu paginare (50/pagina)
2. Se incarca lista stores pentru filtru
3. Default: ascunde livrate (showDelivered=false)

### Filtrare
- Filtrare pe status se face server-side
- Filtrare pe magazin se face local (client-side) - potential performance issue pentru liste mari

### Status Badge Logic (getStatusBadge)

| Pattern in status | Rezultat |
|-------------------|----------|
| "livrat" / "delivered" | Success verde |
| "tranzit" / "transport" / "livrare" | Info albastru |
| "retur" / "refuz" / "returned" | Warning galben |
| "anulat" / "sters" | Error rosu |
| "ridicat" / "predat" | Indigo |
| default | Outline gri |

## Discrepante

| ID | Comportament Asteptat | Comportament Actual | Severitate |
|----|----------------------|---------------------|------------|
| D1 | Filtrare magazin server-side | Se filtreaza local (linia 175-177) | Deranjeaza |
| D2 | Click pe card Erori sa filtreze | Nu are onClick handler | Cosmetic |
| D3 | Sortare pe coloane | Neimplementat (sortBy/sortDir definite dar nefolosite) | Cosmetic |
| D4 | Filtre pe date (dateFrom/dateTo) | Definite in state dar neimplementate in UI | Deranjeaza |
| D5 | Bulk print AWB-uri | Neimplementat | Deranjeaza |

## Cod Mort / Nefolosit

| Element | Observatii | Linie cod |
|---------|------------|-----------|
| dateFrom, dateTo | State definit dar nefolosit in UI | 126-127 |
| sortBy, sortDir | State definit dar nefolosit | 130-131 |
| ArrowUpDown import | Importat dar nefolosit | 21 |
| Calendar import | Importat dar nefolosit | 47 |
| Popover components | Importate dar nefolosite (pentru date filter?) | 43-46 |
| format, ro locale | Definit pentru date picker neimplementat | 49-50 |

## Note pentru Planificare

### Integrari
- **FanCourier/SelfAWB:** Status tracking via API
- Navigare bidirectionala cu pagina Orders

### Cod Nefolosit pentru Viitor
- State-uri dateFrom/dateTo si sortBy/sortDir sugereaza intentie de implementare
- Componentele Calendar si Popover importate dar nefolosite

### Puncte de Imbunatatire
1. Implementare filtru pe date (codul exista partial)
2. Implementare sortare pe coloane (state exista)
3. Mutare filtru magazin server-side
4. Bulk print AWB-uri
5. Export lista AWB-uri
6. Click pe card "Erori" sa filtreze

---

*Audit complet: 2026-01-23*
