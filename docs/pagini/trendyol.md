# Trendyol

## Prezentare Generala

Modulul Trendyol integreaza marketplace-ul Trendyol cu ERP-ul, oferind patru pagini: lista produse, mapare categorii, publicare produse si comenzi. Suporta mai multe magazine Trendyol simultan.

**URL-uri:**
- `/trendyol` - Lista produse
- `/trendyol/mapping` - Mapare categorii si atribute
- `/trendyol/publish` - Publicare produse pe Trendyol
- `/trendyol/orders` - Comenzi Trendyol

---

## Pagina Produse (`/trendyol`)

### Informatii Afisate

**Selector magazine** (sus) - dropdown pentru selectia magazinului Trendyol curent (daca exista mai multe)

**Carduri statistice:**
- Total produse
- Active (aprobate)
- In asteptare (pending)
- Filtru curent (numarul de produse afisate)

**Info sincronizare:**
- Data ultimei sincronizari
- Numarul de produse sincronizate

**Tabel produse:**
- Imagine produs (thumbnail)
- Cod bare (barcode)
- Titlu produs
- Brand
- Categorie
- Pret
- Stoc
- Status (badge: Approved/Pending/Rejected)

### Filtre si Cautare

- **Cautare** - dupa cod de bare
- **Status** - Toate / Aprobate / In asteptare
- **Paginare** cu navigare pagini

### Butoane si Actiuni

| Buton | Actiune |
|-------|---------|
| Sincronizeaza Inventar | Sincronizeaza stocurile cu Trendyol |
| Mapare Categorii | Navigare la `/trendyol/mapping` |
| Publica Produse | Navigare la `/trendyol/publish` |
| Trendyol Partner | Link extern catre panoul partener Trendyol |
| Refresh | Reincarca lista produse |

---

## Pagina Mapare Categorii (`/trendyol/mapping`)

### Informatii Afisate

**Carduri statistice:**
- Total categorii ERP
- Mapate (cu categorie Trendyol asociata)
- Nemapate (fara mapare)
- Produse cu atribute lipsa

**Doua sectiuni:**

#### Sectiunea 1: Mapare Categorii

Lista categoriilor ERP cu:
- Numele categoriei ERP
- Categoria Trendyol asociata (sau "Nemapat")
- Buton cautare categorie Trendyol (cu sugestii AI)

**Cautare categorie Trendyol:**
- Camp de cautare cu text liber (suporta romana si turca)
- Rezultate din API-ul Trendyol
- Buton "Sugereaza cu AI" - trimite la `/api/trendyol/category-suggest` pentru sugestii automate bazate pe Claude

#### Sectiunea 2: Configurare Atribute Produse

Dupa maparea categoriei, fiecare produs poate necesita atribute suplimentare:
- Atribute obligatorii (marcate cu *)
- Atribute optionale
- Valori custom sau selectie din lista Trendyol

### Butoane si Actiuni

| Buton | Actiune |
|-------|---------|
| Mapeaza | Deschide dialog cautare categorie Trendyol |
| Sugereaza cu AI | Obtine sugestii automate de categorie |
| Salveaza Atribute | Salveaza configuratia atributelor produsului |
| Refresh | Reincarca datele |

---

## Pagina Publicare Produse (`/trendyol/publish`)

### Informatii Afisate

**Lista produse publicabile:**
- Checkbox selectie
- Imagine produs
- SKU / Cod bare
- Titlu
- Categorie mapata
- Status atribute (complet/incomplet)

**Status batch-uri:**
Dupa publicare, se afiseaza starea batch-urilor cu polling la 3 secunde:
- ID batch
- Total produse
- Acceptate
- Respinse (cu detalii erori)

### Butoane si Actiuni

| Buton | Conditie | Actiune |
|-------|----------|---------|
| Selecteaza Toate | Mereu | Selecteaza toate produsele din lista |
| Publica Selectate | Cel putin 1 selectat | Deschide dialog selectie brand, apoi publica |
| Verifica Status | Exista batch-uri | Deschide dialog status batch |
| Refresh | Mereu | Reincarca lista |

### Modale si Dialoguri

**Dialog Selectie Brand:**
- Camp cautare brand Trendyol
- Lista rezultate cu butoane selectie
- Confirmare publicare

**Dialog Status Batch:**
- Tabel cu batch-uri
- Per batch: total, acceptate, respinse
- Detalii erori per produs respins

---

## Pagina Comenzi Trendyol (`/trendyol/orders`)

### Informatii Afisate

**Tabel comenzi:**
- Numar comanda Trendyol
- Client
- Data
- Status (badge: De expediat, Expediat, Livrat, Anulat, Returnat)
- Total (cu moneda)
- Status sincronizare: iconite pentru factura si tracking (cu tooltip-uri)
  - Factura trimisa (verde) / netrimisa (gri)
  - AWB trimis (verde) / netrimis (gri)

### Filtre si Cautare

- **Cautare** - dupa numar comanda sau client
- **Status** - Toate / De expediat / Expediat / Livrat / Anulat / Returnat
- **Mapare** - Toate / Mapate / Nemapate (legate de comenzi din ERP sau nu)
- **Paginare**

### Butoane si Actiuni

| Buton | Actiune |
|-------|---------|
| Sincronizeaza | Descarca comenzile noi din ultimele 7 zile |
| Deschide | Deschide dialogul de detaliu comanda |
| Refresh | Reincarca lista |

### Dialog Detaliu Comanda

**Informatii client:**
- Nume, adresa completa, telefon

**Informatii tracking/cargo:**
- Numar tracking, companie cargo

**Produse:**
- Lista produse din comanda (SKU, titlu, cantitate, pret)
- Status mapare: mapat la produs ERP sau nu (cu link catre produs)

**Status sincronizare:**
- Factura emisa: da/nu
- AWB generat: da/nu
- Link catre comanda in ERP (daca mapata)
