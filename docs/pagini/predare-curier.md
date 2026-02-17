# Predare Curier

**Rute:**
- `/handover` - Scanare si predare zilnica
- `/handover/not-handed` - AWB-uri nepredate
- `/handover/report` - Rapoarte predare

**Fisiere:**
- `src/app/(dashboard)/handover/page.tsx`
- `src/app/(dashboard)/handover/not-handed/page.tsx`
- `src/app/(dashboard)/handover/report/page.tsx`

## Pagina Principala - Scanare Predare (`/handover`)

### Descriere

Pagina de scanare a coletelor pentru predarea catre curier. Functioneaza cu sesiuni zilnice care se inchid automat la ora 20:00.

### Butoane Header

| Buton | Actiune |
|-------|---------|
| **Timer** | Afiseaza timpul ramas pana la finalizare auto (ora 20:00) |
| **Refresh** | Reincarca datele |
| **Nepredate (N)** | Navigheaza la `/handover/not-handed` cu numarul total nepredate |
| **Rapoarte** | Navigheaza la `/handover/report` |

### Filtru Magazin

Select cu optiunea "Toate magazinele" + magazine individuale.

### Alerta C0

Banner galben care apare cand exista AWB-uri ridicate de FanCourier (confirmare C0) dar nescanate in sistem. Afiseaza numarul de alerte si permite rezolvarea lor (marcare ca scanat sau marcare ca eroare).

### Sectiunea de Scanare

- **Input scanare** - Camp text cu focus automat, suporta scanere hardware
- Auto-submit dupa 100ms de la ultima tastare (pentru scanere rapide)
- Feedback vizual cu animatie: verde (succes), rosu (eroare)
- Ultimul rezultat de scanare afisat cu mesaj descriptiv
- Daca sesiunea e inchisa, scanarea este blocata cu mesaj de avertizare

### Carduri Statistici

| Card | Valoare | Descriere |
|------|---------|-----------|
| **AWB-uri emise** | `stats.totalIssued` | Total AWB-uri emise azi |
| **Predate** | `stats.totalHandedOver` | Scanate si predate curierului |
| **Nepredate** | `stats.totalNotHandedOver` | Ramase de predat |
| **In asteptare** | `stats.totalPending` | AWB-uri fara status |
| **Zile anterioare** | `stats.totalFromPrevDays` | AWB-uri din zilele anterioare nescanate |
| **Alerte C0** | `stats.totalC0Alerts` | AWB-uri cu confirmare C0 fara scanare |

### Bara de Progres

Afiseaza procentul de completare: `totalHandedOver / totalIssued * 100%`

### Liste AWB-uri

Doua sectiuni:

#### AWB-uri in Asteptare (nescanate)
- Afiseaza: AWB, comanda, destinatar, oras, magazin, produse, status FanCourier
- Buton "Scaneaza" pe fiecare rand

#### AWB-uri Scanate (predate)
- Afiseaza: AWB, comanda, destinatar, ora scanarii, cine a scanat

### Actiuni Sesiune

| Buton | Conditie | Actiune |
|-------|----------|---------|
| **Finalizeaza predarea** | Sesiune OPEN | Deschide dialog confirmare. Marcheaza AWB-urile nescanate ca "nepredate" |
| **Redeschide predarea** | Sesiune CLOSED | Redeschide sesiunea pentru scanari suplimentare |

### Dialog Finalizare

Afiseaza un sumar:
- Numar AWB-uri predate
- Numar AWB-uri ramase (vor fi marcate ca nepredate)
- Confirmare cu buton "Da, finalizeaza"

## Pagina Nepredate (`/handover/not-handed`)

### Descriere

Lista tuturor AWB-urilor marcate ca nepredate (din toate sesiunile).

### Filtre

| Filtru | Tip |
|--------|-----|
| **Magazin** | Select cu magazine |

### Tabel

| Coloana | Continut |
|---------|----------|
| **AWB** | Numar AWB |
| **Comanda** | Numar comanda |
| **Destinatar** | Nume + oras |
| **Produse** | Lista produse |
| **Status FanCourier** | Status actual |
| **Data** | Data emiterii |
| **Actiuni** | Buton "Scaneaza" - scaneaza retroactiv |

### Actiune Scanare

Permite scanarea retroactiva a AWB-urilor nepredate. Apeleaza `POST /api/handover/scan` cu numarul AWB.

## Pagina Rapoarte (`/handover/report`)

### Descriere

Rapoarte zilnice detaliate despre predarea catre curier.

### Filtre

| Filtru | Tip | Descriere |
|--------|-----|-----------|
| **Data** | Date input | Selecteaza ziua (implicit azi) |
| **Magazin** | Select | Filtreaza pe magazin |

### Informatii Raport

| Sectiune | Continut |
|----------|----------|
| **Statistici zi** | Total emise, predate, nepredate, in asteptare, din zile anterioare |
| **Sesiune** | Ora inchidere, cine a inchis, tip inchidere (manual/automat) |

### Tab-uri

| Tab | Continut |
|-----|----------|
| **Predate** | Tabel cu AWB-urile predate (ora, cine a scanat) |
| **Nepredate** | Tabel cu AWB-urile nepredate |
| **Zile anterioare** | AWB-uri din zile anterioare nescanate |

### Fiecare tabel afiseaza:

| Coloana | Continut |
|---------|----------|
| **AWB** | Numar AWB |
| **Comanda** | Numar comanda |
| **Destinatar** | Nume + oras |
| **Produse** | Lista produse |
| **Status** | Status FanCourier |
| **Ora predare** | Ora la care a fost scanat (doar tab Predate) |
| **Scanat de** | Numele persoanei (doar tab Predate) |

## API-uri Folosite

| Endpoint | Metoda | Descriere |
|----------|--------|-----------|
| `/api/handover/today` | GET | Date sesiune curenta cu AWB-uri si statistici |
| `/api/handover/scan` | POST | Scaneaza un AWB (marcheaza ca predat) |
| `/api/handover/finalize` | POST | Finalizeaza sesiunea de predare |
| `/api/handover/reopen` | POST | Redeschide sesiunea |
| `/api/handover/c0-alerts` | GET | AWB-uri cu confirmare C0 fara scanare |
| `/api/handover/c0-alerts` | POST | Rezolva o alerta C0 |
| `/api/handover/not-handed` | GET | Lista AWB-uri nepredate |
| `/api/handover/report` | GET | Raport pe o zi specifica |
