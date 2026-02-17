# Monitorizare

## Prezentare Generala

Paginile de monitorizare ofera vizibilitate asupra erorilor de procesare si activitatii din sistem. Ajuta la depistarea si rezolvarea problemelor.

**URL-uri:**
- `/processing-errors` - Erori de procesare comenzi
- `/activity` - Log de activitate

---

## Erori de Procesare (`/processing-errors`)

### Informatii Afisate

**Carduri statistice:**

| Card | Descriere | Varianta |
|------|-----------|----------|
| In asteptare | Erori cu status PENDING | Warning |
| Se reincerca | Erori in curs de retry | Default |
| Rezolvate | Erori rezolvate | Success |
| Esuate | Erori finale (max retries) | Error |
| Omise | Erori marcate ca skip | Default |

**Tabel erori:**

| Coloana | Descriere |
|---------|-----------|
| Comanda | Numar comanda (link) |
| Tip | Tip eroare (INVOICE / AWB / PICKING_LIST) |
| Mesaj | Mesajul de eroare |
| Incercari | Numarul de retry-uri |
| Ultima incercare | Data + ora |
| Status | Badge colorat |
| Actiuni | Butoane retry/skip |

### Filtre

- **Status** - Toate / In asteptare / Se reincerca / Rezolvate / Esuate / Omise
- **Tip** - Toate / Factura / AWB / Picking List

### Actiuni per Eroare

| Actiune | Conditie | Descriere |
|---------|----------|-----------|
| Reincearca | Status != RESOLVED, SKIPPED | Retrimite comanda la procesare |
| Omite | Status != RESOLVED, SKIPPED | Marcheaza eroarea ca omisa (skip) |

**Dialog confirmare omitere:**
- Mesaj: "Esti sigur ca vrei sa omiti aceasta eroare?"
- Nota: comanda nu va mai fi procesata automat
- Butoane: Anuleaza / Omite

---

## Log Activitate (`/activity`)

### Informatii Afisate

**Tabel activitati:**

| Coloana | Descriere |
|---------|-----------|
| Tip entitate | Badge colorat (ORDER, INVOICE, AWB, STOCK, PRODUCT, SETTINGS, SYNC) |
| Actiune | Badge cu tipul actiunii |
| Detalii | Mesajul activitatii |
| Data | Data si ora |
| Status | Success (verde) / Error (rosu) |

### Filtre

- **Cautare** - text liber in mesaje
- **Tip entitate** - ORDER / INVOICE / AWB / STOCK / PRODUCT / SETTINGS / SYNC
- **Status** - Toate / Succes / Eroare

### Paginare

- 30 elemente per pagina
- Navigare pagini cu butoane Anterior/Urmator

### Culori Badge-uri per Tip Entitate

| Tip | Culoare |
|-----|---------|
| ORDER | Albastru |
| INVOICE | Verde |
| AWB | Portocaliu |
| STOCK | Violet |
| PRODUCT | Cyan |
| SETTINGS | Gri |
| SYNC | Galben |

---

## Navigare

- Erori procesare: `/processing-errors`
- Activitate: `/activity`
- Ambele accesibile din meniul principal
