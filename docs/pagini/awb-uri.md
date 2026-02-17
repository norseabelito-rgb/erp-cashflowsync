# Tracking AWB

**Rute:**
- `/awb` - Lista AWB-uri
- `/awb/[id]` - Detalii AWB

**Fisiere:**
- `src/app/(dashboard)/awb/page.tsx`
- `src/app/(dashboard)/awb/[id]/page.tsx`

## Pagina Lista AWB-uri (`/awb`)

### Descriere

Pagina de urmarire a tuturor AWB-urilor (expeditii) cu statistici, filtre si tabel detaliat.

### Butoane Header

| Buton | Actiune |
|-------|---------|
| **Refresh** | Reincarca lista AWB-uri |

### Carduri Statistici

7 carduri clickable (click pe card seteaza filtrul corespunzator):

| Card | Valoare | Culoare |
|------|---------|---------|
| **Total** | Nr total AWB-uri | Default |
| **In tranzit** | AWB-uri in tranzit | Albastru |
| **Livrate** | AWB-uri livrate | Verde |
| **Retururi** | AWB-uri returnate | Galben |
| **In asteptare** | AWB-uri pending | Gri |
| **Anulate** | AWB-uri anulate | Rosu |
| **Erori** | AWB-uri cu erori | Destructive |

### Filtre

| Filtru | Tip | Optiuni |
|--------|-----|---------|
| **Cautare** | Text | AWB, comanda, client, SKU |
| **Status** | Select | Toate, In tranzit, Livrate, Retururi, In asteptare, Anulate |
| **Magazin** | Select | Toate + magazine individuale |
| **Afiseaza livrate** | Checkbox | Include AWB-urile deja livrate (implicit ascunse) |
| **Reseteaza filtrele** | Buton | Apare doar cand exista filtre active |

### Tabel AWB-uri

| Coloana | Continut |
|---------|----------|
| **AWB** | Numar AWB (mono font) + numar comanda sub |
| **Data** | Data crearii |
| **Client** | Nume complet + telefon + adresa (oras, judet) |
| **Status FanCourier** | Badge colorat cu icon si text status |
| **Ramburs** | Suma cash on delivery (RON) |
| **Magazin** | Numele magazinului |
| **Link** | Icon link extern |

Click pe un rand navigheaza la `/awb/{id}`.

### Statusuri Vizuale

| Tip Status | Culoare | Icon |
|------------|---------|------|
| Livrat | Verde | CheckCircle2 |
| In tranzit | Albastru | Truck |
| Retur/Refuz | Galben | AlertTriangle |
| Anulat/Sters | Rosu | XCircle |
| Ridicat/Predat | Indigo | Package |
| Necunoscut | Gri | Clock |

### Paginare

50 AWB-uri per pagina cu butoane Inapoi/Inainte.

## Pagina Detalii AWB (`/awb/[id]`)

### Descriere

Pagina detaliata pentru un singur AWB, cu istoric statusuri, comentarii si informatii de livrare.

### Butoane Header

| Buton | Actiune |
|-------|---------|
| **Inapoi** | Navigheaza la `/awb` |
| **Refresh** | Reincarca datele |
| **Sterge AWB** | Sterge AWB-ul (cu confirmare) - necesita permisiune `awb.delete` |

### Sectiuni Afisate

#### Informatii AWB
- Numar AWB (mono font, mare)
- Status curent cu badge colorat
- Data ultimului status
- Tip serviciu si tip plata
- Ramburs (cash on delivery)

#### Informatii Comanda
- Numar comanda cu link
- Nume client, telefon, email
- Adresa completa de livrare
- Magazin

#### Produse din Comanda
- Lista produselor cu SKU, titlu si cantitate

#### Istoric Statusuri (Timeline)
- Lista cronologica a evenimentelor de status
- Fiecare eveniment: data, status, locatie, descriere

#### Comentarii
- Sectiune de comentarii cu avatar utilizator
- Adauga comentarii text
- Suport pentru atasarea imaginilor
- Afiseaza distanta temporala ("acum 5 minute")

### API-uri Folosite

| Endpoint | Metoda | Descriere |
|----------|--------|-----------|
| `/api/awb?page=&limit=&search=&status=&showAll=` | GET | Lista AWB-uri cu filtre |
| `/api/awb/[id]` | GET | Detalii AWB cu istoric si comentarii |
| `/api/awb/[id]` | DELETE | Sterge AWB |
| `/api/awb/[id]/comments` | POST | Adauga comentariu |
| `/api/awb/[id]/label` | GET | Descarca/previzualizeaza eticheta PDF |
