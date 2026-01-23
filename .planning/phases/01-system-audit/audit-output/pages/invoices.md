# Invoices (Facturi) - Audit

**Auditat:** 2026-01-23
**Status:** Functioneaza
**URL:** /invoices
**Fisier:** src/app/(dashboard)/invoices/page.tsx
**Linii cod:** 929

## Scopul Paginii

Lista si gestionare facturi emise prin Facturis. Permite vizualizarea statusului facturilor, inregistrarea platilor, si anularea facturilor (cu stornare in Facturis). Utilizatorii pot filtra si cauta facturi, si pot vedea statistici agregate.

## Elemente UI

### Actiuni (Butoane/Link-uri) - Header

| Element | Locatie | Functionalitate | Status | Linie cod |
|---------|---------|-----------------|--------|-----------|
| Help - Statusuri | Header dreapta | Deschide dialog cu explicatii statusuri | OK | 304-307 |
| Reimprospatreaza | Header dreapta | Reincarca lista de facturi | OK | 308-311 |

### Actiuni - Dropdown per Factura

| Element | Locatie | Functionalitate | Status | Linie cod |
|---------|---------|-----------------|--------|-----------|
| Descarca PDF | Menu factura | Deschide/descarca PDF-ul facturii | OK | 538-548 |
| Deschide in Facturis | Menu factura | Link extern catre Facturis | OK | 549-560 |
| Vezi comanda | Menu factura | Navigheaza la pagina comenzii | OK | 563-571 |
| Marcheaza ca platita | Menu factura | Deschide dialog plata (doar daca neplătită) | OK | 574-587 |
| Anuleaza factura | Menu factura | Deschide dialog anulare (doar daca emisa) | OK | 590-597 |

### Statistici (Cards)

| Element | Date | Status | Linie cod |
|---------|------|--------|-----------|
| Total facturi | stats.total | OK | 317-327 |
| Platite | stats.paid | OK | 328-338 |
| Neplatite | stats.unpaid | OK | 339-349 |
| Scadente | stats.overdue | OK | 350-360 |
| Anulate | stats.cancelled | OK | 361-371 |

### Filtre

| Filtru | Tip | Optiuni | Status | Linie cod |
|--------|-----|---------|--------|-----------|
| Cautare | text input | Numar factura sau comanda | OK | 378-387 |
| Status factura | select | Toate, Emise, In asteptare, Anulate, Cu erori | OK | 389-400 |
| Status plata | select | Toate platile, Platite, Neplatite, Partial platite | OK | 401-411 |

### Coloane Tabel

| Coloana | Sursa | Status | Linie cod |
|---------|-------|--------|-----------|
| Factura (numar serie + numar) | invoiceSeriesName + invoiceNumber | OK | 458-477 |
| Comanda | order.shopifyOrderNumber + store.name | OK | 478-492 |
| Client | customerFirstName + customerLastName | OK | 493-498 |
| Valoare | order.totalPrice + currency | OK | 499-506 |
| Status | Emisa/Anulata/Eroare/In asteptare | OK | 507-509 |
| Plata | Platita/Neplătită/Scadentă | OK | 510-512 |
| Scadenta | dueDate | OK | 513-527 |
| Actiuni | Dropdown menu | OK | 528-601 |

### Modale/Dialoguri

| Modal | Scop | Status | Linie cod |
|-------|------|--------|-----------|
| Anulare Factura | Input motiv + confirmare stornare | OK | 611-682 |
| Help Statusuri | Explicatii detaliate statusuri | OK | 684-822 |
| Inregistrare Plata | Suma + metoda plata | OK | 824-925 |

## Comportament Observat

### La Incarcare
1. Se incarca lista de facturi cu filtrele active
2. Se calculeaza statistici agregate (total, platite, neplatite, scadente, anulate)
3. Tabelul afiseaza facturile cu link-uri la comenzi

### Actiuni Principale

**Marcare ca Platita:**
- Apeleaza POST /api/invoices/[id]/pay
- Inregistreaza suma si metoda plata
- Sincronizeaza automat in Facturis
- Optiuni: Numerar, Card, Transfer bancar, Ramburs curier

**Anulare Factura:**
- Apeleaza POST /api/invoices/[id]/cancel
- Emite factura de stornare in Facturis
- Ambele facturi raman in sistem (evidenta contabila)
- Motiv anulare optional

### Statusuri Factura

| Status | Badge | Descriere |
|--------|-------|-----------|
| issued | Success (verde) | Factura emisa cu succes |
| pending | Warning (galben) | In curs de procesare |
| error | Destructive (rosu) | Eroare la emitere |
| cancelled | Destructive cu line-through | Anulata/stornata |
| deleted | Gri | Stearsa din Facturis |

### Statusuri Plata

| Status | Badge | Descriere |
|--------|-------|-----------|
| paid | Success (verde) | Incasata integral |
| partial | Warning | Incasare partiala |
| unpaid | Warning | Neplatita |
| overdue | Destructive | Depasit termenul |

## Discrepante

| ID | Comportament Asteptat | Comportament Actual | Severitate |
|----|----------------------|---------------------|------------|
| D1 | Filtru pe date (interval) | Lipseste filtru dupa data emiterii | Deranjeaza |
| D2 | Export facturi | Nu exista functionalitate de export | Cosmetic |
| D3 | Bulk actions (marcare platite in masa) | Nu exista bulk actions | Cosmetic |

## Cod Mort / Nefolosit

Nu am identificat cod mort sau nefolosit in aceasta pagina.

## Note pentru Planificare

### Integrari
- **Facturis:** Emitere, anulare (stornare), inregistrare plati - toate sincronizate
- Navigare bidirectionala cu pagina Orders

### Puncte de Imbunatatire
1. Adaugare filtru pe interval de date
2. Export PDF bulk sau CSV
3. Bulk mark as paid pentru facturi ramburs
4. Dashboard cu grafice (facturi emise pe luna, incasari)

---

*Audit complet: 2026-01-23*
