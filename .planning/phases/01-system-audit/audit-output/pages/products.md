# Products (Produse) - Audit

**Auditat:** 2026-01-23
**Status:** Functioneaza
**URL:** /products
**Fisier:** src/app/(dashboard)/products/page.tsx
**Linii cod:** 1441

## Scopul Paginii

Gestionarea produselor master si sincronizarea pe canale de vanzare (Shopify). Produsele sunt create din articole de inventar si pot fi publicate pe multiple canale cu override-uri per canal. Suporta import/export Excel si bulk actions.

## Elemente UI

### Actiuni (Butoane/Link-uri) - Header

| Element | Locatie | Functionalitate | Status | Linie cod |
|---------|---------|-----------------|--------|-----------|
| Sync Shopify | Header dreapta | Push produse catre Shopify | OK | 530-550 |
| Mapare Inventar | Header dreapta | Link la /products/inventory-mapping | OK | 551-556 |
| Import/Export dropdown | Header dreapta | Export CSV / Import Excel | OK | 557-574 |
| Produs Nou | Header dreapta | Deschide dialog creare | OK | 575-579 |

### Filtre

| Filtru | Tip | Optiuni | Status | Linie cod |
|--------|-----|---------|--------|-----------|
| Cautare | text input | SKU, titlu, tag | OK | 585-596 |
| Categorie | select | Lista categorii cu count | OK | 598-611 |
| Canal | select | Lista canale (Shopify stores) | OK | 613-626 |

### Bulk Actions Bar

| Element | Locatie | Functionalitate | Status | Linie cod |
|---------|---------|-----------------|--------|-----------|
| Counter produse selectate | Bara bulk | "{N} produse selectate" | OK | 631-634 |
| Actiuni Bulk dropdown | Bara bulk | Schimba categorie, add/remove tags, publish/unpublish, delete | OK | 636-673 |
| Deselecteaza | Bara bulk | Goleste selectia | OK | 674-677 |

### Coloane Tabel

| Coloana | Sursa | Status | Linie cod |
|---------|-------|--------|-----------|
| Checkbox selectie | UI state | OK | 687-691, 737-741 |
| Img | images[0].url sau placeholder | OK | 693, 743-755 |
| SKU | sku (font-mono) | OK | 694, 756 |
| Titlu | title + tags (max 2 + overflow count) | OK | 695, 757-778 |
| Pret | price + compareAtPrice (strikethrough) | OK | 696, 779-786 |
| Stoc | stock (badge color-coded) | OK | 697, 787-790 |
| Categorie | category.name sau "-" | OK | 698, 792-796 |
| Canale (max 4) | Status sync per canal | OK | 699-708, 797-828 |
| Actiuni | Dropdown (edit, delete) | OK | 709, 829-857 |

### Status Canale (Icons)

| Status | Icon | Descriere | Linie cod |
|--------|------|-----------|-----------|
| synced | CheckCircle2 verde | Sincronizat cu canalul | 495-496 |
| override | AlertTriangle galben | Are override-uri locale | 497-498 |
| external-changes | AlertTriangle galben | Modificat in Shopify | 499-500 |
| draft | MinusCircle gri | Draft (nepublicat) | 501-502 |
| paused | MinusCircle albastru | Pauzat de la sync | 503-504 |
| not-published | XCircle gri deschis | Nu e pe acest canal | 505-506 |

### Modale/Dialoguri

| Modal | Scop | Status | Linie cod |
|-------|------|--------|-----------|
| Create Product | Form complet + selectie inventar | OK | 892-1085 |
| Override Details | Vizualizare diferente master vs canal | OK | 1087-1155 |
| Bulk Action | Form specific actiunii bulk | OK | 1157-1174 (component separat 1298-1439) |
| Delete Confirmation | Confirmare stergere produs | OK | 1175-1201 |
| Import Excel | Upload + mod import | OK | 1203-1292 |

## Comportament Observat

### La Incarcare
1. Se incarca lista de produse cu paginare (default 25)
2. Se incarca categorii si canale pentru filtre
3. Sync channels cu stores se executa automat daca nu exista canale

### Actiuni Principale

**Creare Produs:**
- Selectie obligatorie din inventarul local (dropdown cu search)
- Auto-populeaza: SKU, titlu, descriere, pret, stoc
- Optiuni: categorie, tags, canale de publicare
- **Observatie:** Dropdown inventory filtreaza automat articolele deja mapate

**Sync Shopify:**
- Trimite toate produsele cu canale Shopify active
- Creeaza produse noi si actualizeaza existente
- Include: titlu, pret, descriere, imagini

**Bulk Actions:**
- Schimba categoria (set sau remove)
- Add/remove tags
- Publish/unpublish pe canal
- Delete produse

### Verificare Bug CONCERNS.md

**"SKU Duplicate in Product Creation Dropdown":**
- Testat: Query-ul foloseste `excludeMapped: true` (linia 236)
- **Status:** BUG FIXAT - dropdown-ul filtreaza articolele deja mapate

## Discrepante

| ID | Comportament Asteptat | Comportament Actual | Severitate |
|----|----------------------|---------------------|------------|
| D1 | Vizualizare imagini multiple | Doar prima imagine afisata in tabel | Cosmetic |
| D2 | Bulk sync to Shopify | Sync-ul e global, nu pentru selectia curenta | Deranjeaza |
| D3 | Sortare pe coloane | Neimplementat | Cosmetic |

## Cod Mort / Nefolosit

| Element | Observatii |
|---------|------------|
| SyncOverlay import | Importat (linia 98) dar nefolosit in componenta |

## Note pentru Planificare

### Integrari
- **Shopify:** Sync bidirectional, detectie modificari externe
- **Inventar local:** Produsele sunt create doar din articole existente

### Referinta CONCERNS.md
- **SKU Duplicate:** BUG FIXAT - `excludeMapped=true` in query

### Puncte de Imbunatatire
1. Bulk sync pentru produse selectate
2. Preview imagini multiple in modal
3. Sortare pe coloane
4. Quick edit pret/stoc inline
5. Afisare override-uri inline (nu doar icon)

---

*Audit complet: 2026-01-23*
