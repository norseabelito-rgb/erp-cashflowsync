# Picking Lists

**Rute:**
- `/picking` - Lista picking lists
- `/picking/create` - Creaza picking list nou
- `/picking/[id]` - Detalii si executie picking list
- `/picking/logs` - Log-uri activitate picking

**Fisiere:**
- `src/app/(dashboard)/picking/page.tsx`
- `src/app/(dashboard)/picking/create/page.tsx`
- `src/app/(dashboard)/picking/[id]/page.tsx`
- `src/app/(dashboard)/picking/logs/page.tsx`

## Pagina Lista Picking Lists (`/picking`)

### Butoane Header

| Buton | Actiune |
|-------|---------|
| **Refresh** | Reincarca lista |
| **Picking Nou** | Navigheaza la `/picking/create` |

### Carduri Statistici

5 carduri:

| Card | Valoare | Culoare |
|------|---------|---------|
| **Total** | Nr total picking lists | Default |
| **In asteptare** | Status PENDING | Galben |
| **In lucru** | Status IN_PROGRESS | Albastru |
| **Finalizate** | Status COMPLETED | Verde |
| **Anulate** | Status CANCELLED | Gri |

### Filtre

| Filtru | Tip | Optiuni |
|--------|-----|---------|
| **Cautare** | Text | Dupa cod sau nume |
| **Status** | Select | Toate, In asteptare, In lucru, Finalizate, Anulate |

### Lista Picking Lists (carduri)

Fiecare picking list e afisat ca un card cu:

| Element | Continut |
|---------|----------|
| **Cod** | Cod unic mono font (ex: PL-20260218-001) |
| **Status** | Badge colorat |
| **Nume** | Nume optional al listei |
| **Info** | Nr produse + cantitate totala + nr AWB-uri + data |
| **Progres** | Bara de progres (doar pentru IN_PROGRESS) |
| **AWB-uri** | Primele 5 numere AWB ca badge-uri |

### Actiuni per Picking List

| Buton | Conditie | Permisiune |
|-------|----------|------------|
| **Previzualizare PDF** | Status COMPLETED | - |
| **Descarca PDF** | Status COMPLETED | - |
| **Vezi** | Mereu | - |
| **Anuleaza** | Status PENDING | `picking.create` |
| **Sterge** | Status PENDING sau CANCELLED | `picking.create` |

### Dialog Stergere

Confirmare inainte de stergere cu titlu "Esti sigur?" si descriere.

## Pagina Creare Picking (`/picking/create`)

### Descriere

Permite selectarea AWB-urilor pentru care se creeaza o lista de picking. Agrregeaza produsele si cantitatile.

### Filtre AWB-uri

| Filtru | Descriere |
|--------|-----------|
| **Cautare** | Dupa numar comanda, client |
| **SKU** | Filtreaza AWB-urile care contin un anumit SKU |

### Functionalitati

1. **Selectare AWB-uri** - Checkbox pe fiecare AWB
2. **Previzualizare** - Dialog cu produsele agregate (SKU, titlu, cantitate totala, numar AWB-uri)
3. **Nume picking list** - Camp text optional
4. **Creare** - `POST /api/picking` cu lista de AWB ID-uri

### Tabel AWB-uri disponibile

| Coloana | Continut |
|---------|----------|
| Checkbox | Selectie |
| **AWB** | Numar AWB |
| **Comanda** | Numar comanda |
| **Client** | Nume + oras |
| **Produse** | Lista SKU-uri si cantitati |
| **Valoare** | Total comanda |
| **Data** | Data crearii AWB |

## Pagina Detalii Picking (`/picking/[id]`)

### Descriere

Pagina de executie a unui picking list. Suporta scanare cod de bare, marcare manuala si progres in timp real.

### Informatii Header

- Cod picking list + status badge
- Creat de / Preluat de / Finalizat de (nume utilizator)
- Date: creat, inceput, finalizat

### Butoane

| Buton | Conditie | Actiune |
|-------|----------|---------|
| **Preia lista** | Status PENDING | Seteaza status IN_PROGRESS si asigneaza utilizatorului curent |
| **Salveaza progres** | Status IN_PROGRESS | Salveaza cantitatile curente |
| **Finalizeaza** | Status IN_PROGRESS + toate produsele completate | Seteaza COMPLETED |
| **Descarca PDF** | Status COMPLETED | Genereaza si descarca PDF |
| **Previzualizare PDF** | Status COMPLETED | Deschide PDF in tab nou |

### Tabel Produse

| Coloana | Continut |
|---------|----------|
| **Produs** | Titlu + variant + imagine thumbnail |
| **SKU** | Cod produs |
| **Cod bare** | Barcode (daca exista) |
| **Locatie** | Locatia in depozit |
| **Necesar** | Cantitate necesara |
| **Ridicat** | Cantitate ridicata + butoane +/- |
| **Status** | Badge complet/incomplet |

### Scanare Cod de Bare

- Input text cu focus automat
- Scanarea unui barcode incrementeaza automat cantitatea produsului corespunzator
- Feedback vizual (verde = succes, rosu = eroare, galben = surplus)

### AWB-uri Asociate

Lista AWB-urilor incluse in picking list cu numar comanda si nume client.

## Pagina Log-uri Picking (`/picking/logs`)

### Descriere

Istoric complet al activitatii pe listele de picking.

### Filtre

| Filtru | Optiuni |
|--------|---------|
| **Actiune** | Toate, Produs ridicat, Undo, Surplus, Lista preluata, Lista finalizata, Progres salvat, Cantitate modificata |
| **Cautare** | Dupa cod picking list, SKU, utilizator |

### Tabel Log-uri

| Coloana | Continut |
|---------|----------|
| **Actiune** | Icon + label colorat |
| **Picking List** | Cod picking list |
| **Utilizator** | Nume utilizator |
| **Produs** | SKU + titlu |
| **Cantitati** | Inainte / Dupa modificare |
| **Mesaj** | Mesaj descriptiv |
| **Data** | Distanta temporala (ex: "acum 5 min") |

### Tipuri de Actiuni

| Cod | Label | Culoare |
|-----|-------|---------|
| `ITEM_PICKED` | Produs ridicat | Verde |
| `ITEM_UNDO` | Undo produs | Galben |
| `SURPLUS_ATTEMPT` | Incercare surplus | Rosu |
| `LIST_STARTED` | Lista preluata | Albastru |
| `LIST_COMPLETED` | Lista finalizata | Verde inchis |
| `LIST_SAVED` | Progres salvat | Gri |
| `QUANTITY_CHANGED` | Cantitate modificata | Mov |
