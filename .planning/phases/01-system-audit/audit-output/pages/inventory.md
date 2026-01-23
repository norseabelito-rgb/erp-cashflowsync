# Inventory (Articole Inventar) - Audit

**Auditat:** 2026-01-23
**Status:** Functioneaza
**URL:** /inventory
**Fisier:** src/app/(dashboard)/inventory/page.tsx
**Linii cod:** 943

## Scopul Paginii

Gestionarea articolelor din inventarul local. Suporta articole simple si compuse (cu reteta/BOM), import/export Excel, filtrare pe depozite multiple. Fiecare articol are SKU unic, stoc curent, pret cost, si poate fi mapat la produse master.

## Elemente UI

### Actiuni (Butoane/Link-uri) - Header

| Element | Locatie | Functionalitate | Status | Linie cod |
|---------|---------|-----------------|--------|-----------|
| Reincarca | Header dreapta | Reincarca lista de articole | OK | 376-379 |
| Import/Export dropdown | Header dreapta | Import Excel / Export CSV | OK | 380-404 |
| Articol nou | Header dreapta | Navigheaza la /inventory/new | OK | 405-408 |

### Statistici (Cards)

| Element | Date | Status | Linie cod |
|---------|------|--------|-----------|
| Total articole | stats.totalItems | OK | 415-422 |
| Individuale | stats.individualItems | OK | 423-430 |
| Compuse | stats.compositeItems | OK | 431-440 |
| Stoc scazut | stats.lowStockItems (cu warning daca >0) | OK | 441-455 |

### Filtre

| Filtru | Tip | Optiuni | Status | Linie cod |
|--------|-----|---------|--------|-----------|
| Cautare | text input | SKU sau nume | OK | 459-466 |
| Tip articol | select | Toate, Individuale, Compuse | OK | 468-477 |
| Status stoc | select | Tot stocul, Stoc scazut, Doar active | OK | 478-487 |
| Depozit | select | Toate depozitele + lista warehouses | OK | 488-503 |

### Actiuni Bulk

| Element | Locatie | Functionalitate | Status | Linie cod |
|---------|---------|-----------------|--------|-----------|
| Sterge N selectate | Bara filtre (vizibil cand selectii) | Stergere bulk | OK | 504-512 |

### Paginare (Top)

| Element | Tip | Status | Linie cod |
|---------|-----|--------|-----------|
| Afiseaza | select | 25, 50, 100, 250, Toate | OK | 516-531 |
| Total articole | text | OK | 532-534 |

### Coloane Tabel

| Coloana | Sursa | Status | Linie cod |
|---------|-------|--------|-----------|
| Checkbox selectie | UI state | OK | 542-546, 588-592 |
| SKU | sku (font-mono) | OK | 594-596 |
| Nume | name + description | OK | 597-604 |
| Tip | isComposite (badge Individual/Compus) | OK | 605-614 |
| Stoc | currentStock (badge color-coded) | OK | 615-617 |
| Unitate | unit + unitsPerBox | OK | 618-625 |
| Cost | costPrice | OK | 626-628 |
| Furnizor | supplier.name | OK | 629-631 |
| Actiuni | Dropdown menu | OK | 632-666 |

### Actiuni per Articol (Dropdown)

| Element | Functionalitate | Status | Linie cod |
|---------|-----------------|--------|-----------|
| Vezi detalii | Navigheaza la /inventory/[id] | OK | 642-648 |
| Editeaza | Navigheaza la /inventory/[id]/edit | OK | 649-655 |
| Sterge | Deschide dialog confirmare | OK | 657-664 |

### Modale/Dialoguri

| Modal | Scop | Status | Linie cod |
|-------|------|--------|-----------|
| Delete Confirmation | Confirmare stergere cu warning produse mapate | OK | 703-734 |
| Bulk Delete | Confirmare stergere in masa | OK | 736-763 |
| Import Dialog | Upload Excel + selectie mod import | OK | 765-843 |
| Import Results | Afisare rezultate import (create/update/skip/errors) | OK | 845-938 |

## Comportament Observat

### La Incarcare
1. Se incarca lista de articole cu paginare (default 50)
2. Se incarca lista de depozite pentru filtru
3. Se calculeaza statistici

### Actiuni Principale

**Import Excel:**
- Moduri: upsert, create, update, stock_only
- Afiseaza rezultate detaliate (create/update/skip/errors)
- Template descarcare disponibil

**Export CSV:**
- Exporta toate articolele in format CSV
- Fisier: `inventar_YYYY-MM-DD.csv`

**Stergere Articol:**
- Afiseaza warning daca articolul e mapat la produse
- Stergere individuala sau bulk

### Status Stoc (Badge-uri)

| Conditie | Badge |
|----------|-------|
| stock = 0 | Destructive "Fara stoc" |
| stock <= minStock | Warning (numar) |
| stock > minStock | Secondary (numar) |
| isComposite = true | Outline "Compus" |

## Discrepante

| ID | Comportament Asteptat | Comportament Actual | Severitate |
|----|----------------------|---------------------|------------|
| D1 | Sortare pe coloane | Sortarea nu e implementata (doar filtrare) | Deranjeaza |
| D2 | Vizualizare stoc per depozit | Filtrul pe depozit functioneaza, dar tabelul nu arata breakdown | Cosmetic |
| D3 | Istoric miscari stoc | Nu e vizibil din lista (doar din detalii) | Cosmetic |

## Cod Mort / Nefolosit

Nu am identificat cod mort in aceasta pagina.

## Note pentru Planificare

### Referinta CONCERNS.md
- **P3.1:** Race condition multi-warehouse sync - relevant pentru pagina aceasta
- **P3.3:** Camp gresit in sync stock (quantity vs currentStock)

### Multi-Warehouse
- Pagina suporta filtrare pe depozite
- Stock-ul afisat e total (sumat pe toate depozitele) sau filtrat pe depozit

### Puncte de Imbunatatire
1. Sortare pe coloane (SKU, stoc, cost)
2. Afisare stoc breakdown pe depozite direct in tabel
3. Quick edit stoc inline
4. Alert notifications pentru stoc scazut
5. Grafic evolutie stoc

---

*Audit complet: 2026-01-23*
