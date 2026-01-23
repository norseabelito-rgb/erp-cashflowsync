# Orders - Audit

**Auditat:** 2026-01-23
**Status:** Probleme Minore
**URL:** /orders
**Fisier:** src/app/(dashboard)/orders/page.tsx
**Linii cod:** 2301

## Scopul Paginii

Pagina centrala pentru gestionarea comenzilor din toate magazinele Shopify conectate. Este pagina principala unde se desfasoara munca zilnica: vizualizare comenzi, emitere facturi, creare AWB-uri, si procesare bulk. Toti utilizatorii cu permisiunea `orders.view` au acces.

## Elemente UI

### Actiuni (Butoane/Link-uri) - Header

| Element | Locatie | Functionalitate | Permisiune | Status | Linie cod |
|---------|---------|-----------------|------------|--------|-----------|
| Export CSV | Header dreapta | Exporta comenzile filtrate in fisier CSV | N/A | OK | 911-928 |
| Sincronizare | Header dreapta | Trigger sync cu toate magazinele Shopify | N/A | OK | 930-939 |

### Actiuni (Butoane/Link-uri) - Bara Selectie Bulk

| Element | Locatie | Functionalitate | Permisiune | Status | Linie cod |
|---------|---------|-----------------|------------|--------|-----------|
| Emite Facturi | Bara selectie | Emite facturi pentru comenzile selectate | invoices.create | OK | 1029-1034 |
| Creaza AWB | Bara selectie | Deschide modal pentru creare AWB bulk | awb.create | OK | 1035-1040 |
| Emite Tot (Factura + AWB) | Bara selectie | Procesare completa: factura + AWB + picking list | orders.process | OK | 1041-1060 |

### Actiuni (Butoane/Link-uri) - Tabel

| Element | Locatie | Functionalitate | Permisiune | Status | Linie cod |
|---------|---------|-----------------|------------|--------|-----------|
| View (Eye icon) | Coloana Actiuni | Deschide modal cu detalii comanda | N/A | OK | 1227 |
| Edit (Pencil icon) | Coloana Actiuni | Deschide dialog editare date comanda | orders.edit | OK | 1228-1230 |
| Emite Factura (inline) | Coloana Factura | Emite factura pentru comanda individuala | implicit invoices.create | OK | 1181 |
| Creaza AWB (inline) | Coloana AWB | Deschide modal AWB pentru comanda | implicit awb.create | OK | 1222 |

### Actiuni - Modal Vizualizare Comanda

| Element | Locatie | Functionalitate | Permisiune | Status | Linie cod |
|---------|---------|-----------------|------------|--------|-----------|
| Emite factura | Sectiune Factura | Emite factura daca nu exista | invoices.create | OK | 1745-1758 |
| Emite din nou | Sectiune Factura | Re-emite daca stearsa/anulata | invoices.create | OK | 1697-1708, 1713-1724 |
| Incearca din nou | Sectiune Factura | Retry daca eroare | invoices.create | OK | 1729-1740 |
| Creaza AWB | Sectiune AWB | Creaza AWB daca nu exista | awb.create | OK | 1870-1880 |
| Creaza AWB nou | Sectiune AWB | Creeaza AWB dupa anulare/stergere | awb.create | OK | 1808-1819 |
| Sterge AWB | Sectiune AWB | Sterge AWB (cu confirmare) | awb.delete | OK | 1822-1841 |
| Sincronizeaza Status | Footer modal | Sincronizeaza status AWB si factura | N/A | OK | 1955-1963 |

### Actiuni - Tab Erori de Procesare

| Element | Locatie | Functionalitate | Permisiune | Status | Linie cod |
|---------|---------|-----------------|------------|--------|-----------|
| Reincearca (individ.) | Per eroare | Retry procesare pentru o comanda | N/A | OK | 1510-1519 |
| Sari peste (individ.) | Per eroare | Skip eroare si marcheaza SKIPPED | N/A | OK | 1524-1533 |
| Reincearca (bulk) | Header filtre | Retry toate erorile selectate | N/A | OK | 1366-1376 |
| Sari peste (bulk) | Header filtre | Skip toate erorile selectate | N/A | OK | 1377-1385 |

### Campuri de Date - Modal Editare

| Camp | Sursa | Editabil | Validare | Linie cod |
|------|-------|----------|----------|-----------|
| Prenume | Order.customerFirstName | Da | Fara validare | 2162-2172 |
| Nume | Order.customerLastName | Da | Fara validare | 2173-2183 |
| Telefon | Order.customerPhone | Da | Fara validare | 2187-2197 |
| Email | Order.customerEmail | Da | type="email" | 2198-2208 |
| Adresa 1 | Order.shippingAddress1 | Da | Fara validare | 2212-2222 |
| Adresa 2 | Order.shippingAddress2 | Da | Fara validare | 2224-2234 |
| Oras | Order.shippingCity | Da | Fara validare | 2239-2249 |
| Judet | Order.shippingProvince | Da | Fara validare | 2250-2260 |
| Cod postal | Order.shippingZip | Da | Fara validare | 2261-2271 |

### Filtre

| Filtru | Tip | Optiuni | Status | Linie cod |
|--------|-----|---------|--------|-----------|
| Cautare | text input | Comanda, client, telefon | OK | 948-951 |
| Status | select | Toate, PENDING, VALIDATED, VALIDATION_FAILED, INVOICED, SHIPPED, DELIVERED, RETURNED, CANCELLED | OK | 953-966 |
| Magazin | select | Toate magazinele + lista dinamica din stores | OK | 967-975 |
| Data inceput | date input | Date picker | OK | 985-989 |
| Data sfarsit | date input | Date picker | OK | 991-996 |
| Resetare interval | button | Sterge filtrele de data | OK | 999-1008 |

### Filtre - Tab Erori

| Filtru | Tip | Optiuni | Status | Linie cod |
|--------|-----|---------|--------|-----------|
| Status eroare | select | Toate, PENDING, RETRYING, FAILED, RESOLVED, SKIPPED | OK | 1340-1353 |
| Tip eroare | select | Toate, INVOICE, AWB | OK | 1354-1364 |

### Coloane Tabel Principal

| Coloana | Sortable | Filterable | Sursa | Status | Linie cod |
|---------|----------|------------|-------|--------|-----------|
| Checkbox selectie | Nu | Nu | UI state | OK | 1125, 1148 |
| Comanda (numar + magazin + data) | Nu | Da (search) | shopifyOrderNumber, store.name, createdAt | OK | 1149-1153 |
| Client (nume + email + localitate) | Nu | Da (search) | customerFirstName/LastName, customerEmail, shippingCity/Province | OK | 1154-1158 |
| Validari | Nu | Nu | phoneValidation, addressValidation | OK | 1159-1163 |
| Valoare | Nu | Nu | totalPrice, currency | OK | 1165 |
| Status | Nu | Da (select) | status (enum) | OK | 1166 |
| Factura | Nu | Nu | invoice.invoiceSeriesName + invoiceNumber | OK | 1167-1182 |
| AWB | Nu | Nu | awb.awbNumber + currentStatus | OK | 1184-1224 |
| Actiuni | Nu | Nu | View + Edit buttons | OK | 1225-1233 |

### Paginare

| Element | Tip | Functionalitate | Status | Linie cod |
|---------|-----|-----------------|--------|-----------|
| Afisare count | text | "Afisate X - Y din Z" | OK | 1244-1246 |
| Pe pagina | select | 50, 100, 150, 250, 500, 1000 | OK | 1247-1264 |
| Prima | button | Salt la pagina 1 | OK | 1268-1275 |
| Inapoi | button | Pagina anterioara | OK | 1276-1283 |
| Indicator pagina | text | "X / Y" | OK | 1284-1286 |
| Inainte | button | Pagina urmatoare | OK | 1287-1294 |
| Ultima | button | Salt la ultima pagina | OK | 1295-1302 |

### Statistici Erori (Tab Erori)

| Element | Date afisate | Status | Linie cod |
|---------|--------------|--------|-----------|
| Card "In asteptare" | dbErrorStats.pending | OK | 1315-1318 |
| Card "Se reincearca" | dbErrorStats.retrying | OK | 1319-1322 |
| Card "Esuate" | dbErrorStats.failed | OK | 1323-1326 |
| Card "Rezolvate" | dbErrorStats.resolved | OK | 1327-1330 |
| Card "Sarite" | dbErrorStats.skipped | OK | 1331-1334 |

### Modale/Dialoguri

| Modal | Scop | Trigger | Status | Linie cod |
|-------|------|---------|--------|-----------|
| AWB Settings | Configurare optiuni AWB (serviciu, plata, greutate) | Click "Creaza AWB" | OK | 1555-1619 |
| View Order | Vizualizare detalii comanda completa | Click pe rand sau Eye icon | OK | 1621-1968 |
| Process Errors | Lista erori de procesare cu actiuni | Click "Vezi erori" pe banner | OK | 1970-2078 |
| Delete AWB Confirm | Confirmare stergere AWB | Click "Sterge AWB" in modal | OK | 2080-2106 |
| Edit Order | Editare date client si adresa | Click Pencil icon | OK | 2108-2297 |

## Comportament Observat

### La Incarcare

1. Se incarca lista de comenzi cu paginare (default 50 per pagina)
2. Se incarca lista de magazine pentru filtru
3. Daca tab-ul "Erori de procesare" e activ, se incarca si erorile din DB
4. Toate filtrele sunt resetate (status: "all", magazin: "all", fara date)

### Actiuni Principale

**Sincronizare:**
- Apeleaza POST /api/sync
- Sincronizeaza comenzi noi din Shopify
- Verifica si starea facturilor si AWB-urilor (sincronizare bilaterala)
- Afiseaza toast cu rezultatul

**Emite Facturi (bulk):**
- Apeleaza POST /api/invoices/issue cu lista orderIds
- Afiseaza toast cu numarul de facturi emise
- Reincarca lista de comenzi

**Creaza AWB (bulk):**
- Deschide modal cu optiuni AWB
- Optiune "Foloseste setarile predefinite" (default ON)
- Daca bulk (>1 comanda), optiune "Creaza Picking List automat"
- Apeleaza POST /api/awb/create
- Reincarca lista de comenzi si picking lists

**Procesare Completa (Emite Tot):**
- Apeleaza POST /api/orders/process-all
- Creeaza facturi, AWB-uri si picking list (daca >1 comanda)
- Daca sunt erori, salveaza in processErrors state si afiseaza banner
- Afiseaza toast cu rezultatul

**Export CSV:**
- Apeleaza GET /api/orders/export cu filtrele curente
- Descarca fisier CSV cu numele "comenzi_YYYY-MM-DD.csv"

**Editare Comanda:**
- Deschide modal cu formular pre-populat
- Daca comanda are factura sau AWB emise, afiseaza warning si cere confirmare
- La salvare, apeleaza PUT /api/orders/[id]
- Sincronizeaza modificarile in Shopify (cu comentariu audit)

### Statusuri Comenzi Suportate

| Status | Eticheta UI | Culoare | Descriere |
|--------|-------------|---------|-----------|
| PENDING | In asteptare | warning (galben) | Comanda noua, nevalidata |
| VALIDATED | Validat | info (albastru) | Telefon si adresa OK |
| VALIDATION_FAILED | Validare esuata | destructive (rosu) | Probleme la validare |
| INVOICED | Facturat | success (verde) | Factura emisa |
| PICKING | In picking | info | Definit dar NEFOLOSIT |
| PACKED | Impachetat | success | Definit dar NEFOLOSIT |
| SHIPPED | Expediat | info | AWB creat |
| DELIVERED | Livrat | success | Colet livrat |
| RETURNED | Returnat | destructive | Colet returnat |
| CANCELLED | Anulat | neutral (gri) | Comanda anulata |
| INVOICE_ERROR | Eroare factura | destructive | Eroare la emitere factura |
| AWB_ERROR | Eroare AWB | destructive | Eroare la creare AWB |
| AWB_PENDING | Necesita AWB | warning | Facturat, asteapta AWB |
| INVOICE_PENDING | Necesita factura | warning | Validat, asteapta factura |

### Vizualizare Detalii Comanda

Modal-ul de vizualizare afiseaza:
- Date client (nume, email, telefon)
- Adresa livrare (completa)
- Status comanda
- Valoare totala
- Validari (telefon + adresa cu iconite vizuale)
- Stare factura (cu actiuni contextuale)
- Stare AWB (cu status detaliat si actiuni contextuale)
- **Lista produse** (titlu, SKU, cantitate, pret, total) - **FUNCTIONAL** (linii 1886-1945)
- Data comenzii

## Discrepante

| ID | Comportament Asteptat | Comportament Actual | Severitate | Referinta |
|----|----------------------|---------------------|------------|-----------|
| D1 | Statusurile PICKING si PACKED sunt folosite pentru tracking warehouse | Statusurile sunt definite in enum dar NU sunt folosite nicaieri in UI sau logica | Deranjeaza | P1.3 din ANALYSIS |
| D2 | Produsele din comanda sunt afisate in modal | **REZOLVAT** - Produsele se afiseaza corect (linii 1886-1945) | N/A | Bug menționat in CONCERNS.md era deja fixat |
| D3 | Sortare pe coloane tabel | Nici o coloana din tabel nu e sortabila (lipsa handler-e) | Deranjeaza | - |
| D4 | Validare input la editare (telefon format) | Nu exista validare - se accepta orice | Cosmetic | - |
| D5 | Coloanele ample (Status, Factura, AWB) ar trebui sa aiba filtre dedicate | Doar Status are filtru dropdown, Factura/AWB nu | Cosmetic | - |

## Cod Mort / Nefolosit

| Element | Locatie | Observatii |
|---------|---------|------------|
| Status PICKING | statusConfig[PICKING] linia 161 | Definit dar niciodata setat de logica aplicatiei |
| Status PACKED | statusConfig[PACKED] linia 162 | Definit dar niciodata setat de logica aplicatiei |
| Status INVOICE_ERROR | statusConfig linia 167 | Exista alternativa cu invoice.status="error" |
| Status AWB_ERROR | statusConfig linia 168 | Exista alternativa cu awb.errorMessage |
| Status AWB_PENDING | statusConfig linia 169 | Logica existenta foloseste alte mecanisme |
| Status INVOICE_PENDING | statusConfig linia 170 | Logica existenta foloseste alte mecanisme |

## Note pentru Planificare

### Monoliticitate
- Cu 2301 linii, aceasta e a doua cea mai mare componenta din aplicatie
- Contine: interfete TypeScript, configuratii status, functii helper, state management, mutations, queries, UI complet
- Recomandat: Extragere in hooks separate (`useOrders`, `useOrderMutations`, `useAwbMutations`)
- Recomandat: Componente separate pentru: `OrdersTable`, `OrderViewModal`, `OrderEditModal`, `AwbModal`, `ProcessErrorsDialog`

### Performanta
- Query-ul principal `/api/orders` incarca relatiile store, invoice, awb - bine optimizat
- lineItems se incarca lazy la click pe View - OK
- Tab-ul Erori incarca date doar cand e activ - OK

### Integrari
- Shopify: Sync comenzi, sync modificari la editare
- Facturis: Emitere facturi, anulare, stare
- FanCourier/SelfAWB: Creare AWB, stergere, status tracking
- Picking Lists: Creare automata la procesare bulk

### Puncte de Imbunatatire Viitoare
1. Implementare statusuri PICKING/PACKED pentru workflow warehouse
2. Adaugare sortare pe coloane tabel
3. Adaugare filtre avansate (valoare minima/maxima, cu/fara factura, cu/fara AWB)
4. Export mai flexibil (selectie coloane, format Excel)
5. Bulk actions pentru anulare comenzi

---

*Audit complet: 2026-01-23*
