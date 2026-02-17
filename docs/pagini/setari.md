# Setari

## Prezentare Generala

Pagina de setari centralizeaza toata configuratia aplicatiei: magazine Shopify, integrari marketplace, contabilitate, curieri, AI si backup. In plus, exista sub-pagini dedicate pentru firme, depozite, serii de facturare, utilizatori, roluri si audit log.

**URL-uri:**
- `/settings` - Pagina principala cu taburi
- `/settings/companies` - Gestionare firme
- `/settings/warehouses` - Gestionare depozite
- `/settings/invoice-series` - Serii de facturare
- `/settings/users` - Gestionare utilizatori
- `/settings/roles` - Roluri si permisiuni
- `/settings/groups` - Grupuri utilizatori
- `/settings/audit` - Audit log
- `/settings/security` - Securitate
- `/settings/handover` - Predare colete
- `/settings/printers` - Imprimante
- `/settings/backup` - Backup
- `/settings/awb-repair` - Reparare AWB
- `/settings/awb-statuses` - Statusuri AWB
- `/settings/order-statuses` - Statusuri comenzi

---

## Pagina Principala (`/settings`)

### Taburi Disponibile

#### 1. Magazine (Stores)

Gestionarea magazinelor Shopify conectate.

**Informatii per magazin:**
- Nume magazin
- Domeniu Shopify
- Firma asociata
- Serie de facturare Oblio
- Status webhook-uri
- Numar comenzi

**Actiuni per magazin:**
- Editare asociere firma si serie
- Configurare webhook-uri Shopify
- Test conexiune

**Dialog Editare Magazin:**
- Selectie firma de facturare
- Selectie serie Oblio
- Activare/dezactivare magazin

#### 2. Trendyol

Gestionarea magazinelor Trendyol (componenta `TrendyolStoresTab`).
- Adaugare/editare magazine Trendyol
- API Key, API Secret, Seller ID
- Asociere cu firma de facturare

#### 3. Temu

Gestionarea magazinelor Temu (componenta `TemuStoresTab`).
- Adaugare/editare magazine Temu
- App Key, App Secret
- Asociere cu firma de facturare

#### 4. Produse

- **Google Drive** - configurare integrare pentru imagini produse
- Folder ID pentru sincronizare

#### 5. Contabilitate

- Redirect catre configurarea Oblio per firma
- Link rapid catre pagina de firme (`/settings/companies`)

#### 6. Curieri

Configurarea integrarii FanCourier.

**Sectiuni:**
- **Credentiale FanCourier** - Client ID, Username, Password (redirect catre firme)
- **Setari AWB default:**
  - Tip serviciu (Standard / Express)
  - Greutate default
  - Numar colete default
  - Continut implicit
  - Plata transport (expeditor/destinatar)
  - Ramburs
- **Date expeditor:**
  - Nume, telefon, email
  - Adresa completa (judet, oras, strada, numar, cod postal)

#### 7. AI

Configurarea integrarii Claude AI.

**Campuri:**
- Claude API Key (cu toggle vizibilitate)
- Model selectat (dropdown: Claude Sonnet / Claude Haiku)
- Toggle: Analiza zilnica automata (daily insights)

**Buton Test:** Testeaza conexiunea cu API-ul Claude

#### 8. Backup

Configurarea backup-ului pe Google Drive.

**Sectiuni:**
- Conectare cont Google (OAuth)
- Selectie folder backup
- Programare auto-backup (frecventa)
- Backup manual (buton)
- Istoric backup-uri

---

## Firme (`/settings/companies`)

### Informatii Afisate

**Grid carduri firma:**
- Nume firma + cod scurt
- CIF
- Locatie (oras, judet)
- Status integrari: Oblio OK/Fara, FanCourier OK/Fara
- Statistici: numar magazine, numar facturi
- Badge firma primara (stea galbena)
- Badge inactiva (daca e cazul)

### Actiuni

| Buton | Conditie | Actiune |
|-------|----------|---------|
| Adauga Firma | Mereu | Deschide dialog creare |
| Editeaza | Per firma | Deschide dialog editare |
| Sterge | Firma ne-primara, 0 comenzi | Dialog confirmare stergere |

### Dialog Creare/Editare Firma

**3 taburi:**

**Tab Date Generale:**
- Cautare ANAF dupa CUI (completare automata campuri)
- Nume firma, cod scurt
- CIF, Nr. Reg. Com.
- Adresa completa (strada, oras, judet, cod postal, tara)
- Banca, IBAN
- Email, telefon
- Cota TVA implicita (%)
- Adaos intercompany (%)
- Toggle-uri: Platitor TVA, Firma primara, Activa

**Tab Oblio:**
- Email cont Oblio
- Token secret (cu toggle vizibilitate)
- CIF firma in Oblio (daca difera)
- Serie decontare intercompany
- Buton: Test Conexiune Oblio

**Tab FanCourier:**
- Client ID
- Username, Password (cu toggle vizibilitate)
- Date expeditor (sender): nume, telefon, email, adresa completa
- Buton: Test Conexiune FanCourier

---

## Depozite (`/settings/warehouses`)

### Informatii Afisate

**Info sistem multi-depozit** - explicatie ca toate depozitele folosesc acelasi nomenclator, stocurile sunt per depozit, comenzile scad din depozitul principal.

**Grid carduri depozit:**
- Nume + cod
- Descriere
- Adresa
- Numar articole cu stoc
- Badge "Principal" (stea galbena pe depozitul principal)
- Badge "Inactiv" (daca e cazul)

### Actiuni

| Buton | Conditie | Actiune |
|-------|----------|---------|
| Depozit Nou | Mereu | Dialog creare depozit |
| Sincronizeaza Articole | Exista depozite | Asociaza articole cu depozitul principal |
| Seteaza ca Principal | Depozit activ, ne-principal | Marcheaza depozitul ca principal |
| Editeaza | Per depozit | Dialog editare |
| Sterge | Nu e principal | Dialog confirmare stergere |
| Migrare Date Existente | 0 depozite | Creaza depozit principal si migreaza stocurile |

### Dialog Creare/Editare Depozit

- Cod (readonly la editare)
- Nume
- Descriere (optional)
- Adresa (optional)
- Toggle: Activ (dezactivat pentru depozitul principal)

---

## Serii de Facturare (`/settings/invoice-series`)

### Informatii Afisate

**Alerta importanta** - seriile trebuie create manual si sa corespunda cu cele din Oblio (case-sensitive).

**Lista serii:**
Per serie:
- Prefix (afisat in patrat colorat)
- Nume
- Badge "Default" (daca e serie implicita)
- Badge "Oblio" (daca e sincronizata cu Oblio)
- Firma asociata (sau "Fara firma" cu badge rosu)
- Numar curent
- Magazine care o folosesc

**Sectiune Serii Oblio (Facturare):**
Per magazin:
- Nume magazin + firma + domeniu Shopify
- Selectie serie Oblio din dropdown (incarca dinamic seriile din API Oblio)
- Status: serie setata sau lipsa

**Sectiune Trendyol:**
- Selectie serie de facturare pentru comenzile Trendyol

**Tabel Status Configurare:**
Per magazin verifica:
- Firma asociata (OK / Neasociat)
- Serie Oblio (OK / Lipsa)
- Status general (OK / Configureaza)

### Actiuni

| Buton | Actiune |
|-------|---------|
| Adauga Serie | Dialog creare serie noua |
| Editeaza | Dialog editare serie |
| Seteaza Default | Marcheaza seria ca implicita |
| Sterge | Stergere (dezactivat daca e folosita de magazine) |

### Dialog Creare/Editare Serie

- Prefix (uppercase, max 10 caractere)
- Numar de start
- Nume serie
- Firma de facturare (obligatoriu)
- Descriere (optional)
- Tip document: Factura / Proforma / Chitanta
- Toggle: Serie default
- Toggle: Sincronizeaza cu Oblio
  - Camp serie Oblio (daca activat)

---

## Utilizatori (`/settings/users`)

### Informatii Afisate

**Lista utilizatori:**
Per utilizator:
- Avatar + nume
- Email
- Badge SuperAdmin (daca e cazul)
- Badge Inactiv (daca e cazul)
- Roluri (badge-uri colorate)
- Grupuri (badge-uri, max 2 vizibile + "+N")

### Filtre

- Cautare dupa nume sau email
- Filtru dupa rol
- Filtru dupa grup

### Actiuni

| Actiune | Descriere |
|---------|-----------|
| Invita Utilizator | Deschide dialog invitatie |
| Editeaza Permisiuni | Dialog editare roluri, grupuri, acces store-uri |
| Activeaza/Dezactiveaza | Toggle status utilizator (dezactivat pentru SuperAdmin) |

### Dialog Invitare Utilizator

1. Camp email
2. Selectie roluri (badge-uri click-abile)
3. Selectie grupuri (badge-uri click-abile)
4. Buton "Creaza Invitatie"
5. Dupa creare: afiseaza URL invitatie cu buton copiere

### Dialog Editare Permisiuni

- **Roluri** - badge-uri click-abile cu culori per rol
- **Grupuri** - badge-uri click-abile
- **Acces Store-uri** - badge-uri click-abile (gol = acces la toate)

---

## Roluri si Permisiuni (`/settings/roles`)

### Informatii Afisate

**Grid carduri rol:**
- Culoare rol (punct colorat)
- Nume rol
- Iconita lacat (daca e rol sistem)
- Descriere
- Numar utilizatori
- Numar permisiuni

### Actiuni

| Buton | Conditie | Actiune |
|-------|----------|---------|
| Rol Nou | Mereu | Dialog creare rol |
| Editeaza | Per rol | Dialog editare |
| Sterge | Nu e rol sistem | Dialog confirmare stergere |

### Dialog Creare/Editare Rol

- Nume (readonly pentru roluri sistem)
- Selectie culoare (paleta 18 culori)
- Descriere
- **Matrice permisiuni** - lista pe categorii (expandabile):
  - Per categorie: checkbox selectie toate + numar selectate
  - Per permisiune: nume, descriere, checkbox individual
  - Categorii: Comenzi, Facturi, AWB, Stoc, Produse, Setari, Sincronizare, etc.

---

## Audit Log (`/settings/audit`)

### Informatii Afisate

**Numar total inregistrari** (badge)

**Lista audit entries:**
Per intrare:
- Avatar utilizator (sau "SYS" pentru sistem)
- Nume utilizator
- Actiune (badge colorat: create=verde, update=albastru, delete=rosu, etc.)
- Tip entitate (badge outline)
- Detalii (nume, email, numar roluri - din newValue)
- Timestamp (format romanesc complet)

### Filtre

- Cautare dupa actiune
- Tip entitate: Toate / Utilizatori / Roluri / Grupuri / Invitatii / Comenzi / Produse / Facturi

### Paginare

- 25 elemente per pagina
- Navigare: Anterior / Urmator
- Afisare: "Pagina X din Y"

---

## Navigare Setari

```
/settings                  -- Pagina principala (taburi)
  Tab: Magazine, Trendyol, Temu, Produse, Contabilitate, Curieri, AI, Backup

/settings/companies        -- Firme
/settings/warehouses       -- Depozite
/settings/invoice-series   -- Serii de facturare
/settings/users            -- Utilizatori
/settings/roles            -- Roluri si permisiuni
/settings/groups           -- Grupuri
/settings/audit            -- Audit log
/settings/security         -- Securitate
/settings/handover         -- Predare colete
/settings/printers         -- Imprimante
/settings/backup           -- Backup
/settings/awb-repair       -- Reparare AWB
/settings/awb-statuses     -- Statusuri AWB
/settings/order-statuses   -- Statusuri comenzi
```
