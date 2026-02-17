# Retururi

## Prezentare Generala

Modulul de retururi ofera doua pagini principale: scanarea retururilor si gestionarea manifestelor de stornare. Scanarea se face prin citirea AWB-urilor (cod de bare), iar stornarea facturilor se proceseaza prin manifeste cu flux de aprobare.

**URL-uri:**
- `/returns` - Scanare retururi
- `/returns/manifest` - Manifeste stornare

**Permisiuni necesare:** `handover.scan` (verificat prin `RequirePermission`)

---

## Pagina Scanare Retururi (`/returns`)

### Informatii Afisate

**Carduri statistice (sus):**
- Scanate azi - numarul de retururi scanate in ziua curenta
- Nemapate - retururi care nu au fost inca legate de o comanda
- Retururi in asteptare - retururi cu status PENDING

**Layout split:**
- **Stanga** - Lista retururilor scanate, cu paginare (20 per pagina)
- **Dreapta** - Lista retururilor in asteptare (PENDING)

**Informatii per retur (tabel):**
- AWB-ul returului
- AWB-ul original (daca exista)
- Numarul comenzii (link catre comanda)
- Numarul facturii + seria
- Status factura
- Status plata
- Data scanarii
- Feedback vizual: bordura colorata (verde = procesat, rosu = eroare, galben = pending)

### Filtre si Cautare

- **Camp scanner** - input auto-focus cu auto-submit (se activeaza la scan barcode, procesare la Enter)
- **Taburi** - PENDING, PROCESSED, ERROR, ALL
- **Paginare** - 20 elemente per pagina cu butoane Inapoi/Inainte

### Butoane si Actiuni

| Buton | Conditie | Actiune |
|-------|----------|---------|
| Scanner input | Mereu vizibil | Scaneaza AWB - adauga returul in sistem |
| Genereaza Manifest | Exista retururi pending | Creaza manifest nou din retururile PENDING |
| Export Excel | Mereu vizibil | Deschide dialog export cu selectie interval date |
| Refresh | Mereu vizibil | Reincarca lista |

**Actiuni per retur:**
- **Link** (buton pe retururi nemapate) - deschide dialog pentru maparea returului la o comanda

### Modale si Dialoguri

**Dialog Link Retur:**
- Camp cautare: numarul comenzii sau AWB-ul original
- Rezultate cautare: lista de comenzi potentiale
- Buton confirmare: leaga returul de comanda selectata

**Dialog Export Excel:**
- Selectie data inceput
- Selectie data sfarsit
- Buton "Exporta" - descarca fisier Excel cu retururile din intervalul selectat

### Feedback Vizual

Retururile scanate au bordura colorata:
- **Verde** (`border-green-500`) - procesate cu succes
- **Rosu** (`border-red-500`) - eroare la procesare
- **Galben** (`border-yellow-500`) - in asteptare
- **Gri** (default) - status necunoscut

---

## Pagina Manifeste Retururi (`/returns/manifest`)

### Vizualizare Lista

Afiseaza toate manifestele recente intr-un tabel.

**Coloane tabel:**
- Data documentului
- Status (badge colorat)
- Numar AWB-uri
- Procesate
- Erori (badge rosu daca > 0)
- Buton "Deschide"

**Buton principal:**
- **Genereaza Manifest Nou** - creaza un manifest nou din retururile PENDING scanate

### Vizualizare Detaliu (cu parametru `?id=`)

**Header manifest:**
- Titlu cu status badge
- Data crearii
- Data confirmarii + cine a confirmat (daca e cazul)

**Statistici:**
- Total AWB-uri
- Procesate (verde)
- Erori (rosu)
- In asteptare

**Alert erori** - afisat cand exista facturi cu erori la stornare

**Tabel AWB-uri** - foloseste componenta `ReturnManifestTable` cu:
- AWB retur
- AWB original
- Numarul comenzii
- Seria + numarul facturii
- Status factura
- Status plata
- Status procesare (PENDING/PROCESSED/ERROR)
- Mesaj eroare (daca exista)

### Statusuri Manifest

| Status | Badge | Descriere |
|--------|-------|-----------|
| DRAFT | Secundar | Manifest nou, neconfirmat |
| PENDING_VERIFICATION | Outline | In verificare |
| CONFIRMED | Albastru | Confirmat, pregatit pentru procesare |
| PROCESSED | Verde | Toate stornrile au fost executate |

### Butoane si Actiuni pe Detaliu

| Buton | Conditie | Actiune |
|-------|----------|---------|
| Confirma | Status = DRAFT | Trece manifestul in CONFIRMED |
| Storneaza Toate | Status = CONFIRMED | Proceseaza stornarea tuturor facturilor din manifest |
| Refresh | Mereu vizibil | Reincarca datele manifestului |
| Inapoi la lista | Mereu vizibil | Navigare la lista manifeste |

**Confirmare stornare (AlertDialog):**
- Mesaj: "Vei storna X facturi din Oblio. Aceasta actiune este ireversibila."
- Butoane: Anuleaza / Continua Stornare

### Navigare

- De la lista manifeste catre detaliu: `?id={manifestId}`
- Buton inapoi din detaliu catre lista: `/returns/manifest`
- De la pagina scanare catre manifeste: buton "Genereaza Manifest"
