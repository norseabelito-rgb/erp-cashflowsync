# Comenzi

**Ruta:** `/orders`
**Fisier:** `src/app/(dashboard)/orders/page.tsx`
**Tip:** Client Component (`"use client"`)

## Descriere

Pagina principala de gestionare a comenzilor din toate canalele de vanzare (Shopify, Trendyol, Temu). Permite vizualizarea, filtrarea, procesarea in masa (facturare + AWB) si editarea comenzilor.

## Tab-uri Canal

Componenta `ChannelTabs` afiseaza 3 tab-uri principale, persistate in URL (`?tab=shopify`):

| Tab | Descriere |
|-----|-----------|
| **Shopify** | Comenzi din magazinele Shopify (tab implicit) |
| **Trendyol** | Comenzi din magazinele Trendyol |
| **Temu** | Comenzi din Temu (componenta separata `TemuOrdersList`) |

Fiecare tab afiseaza badge-ul cu numarul total de comenzi (`sourceCounts`).

## Butoane Header

| Buton | Actiune | Permisiune |
|-------|---------|------------|
| **Export Excel** | Exporta comenzile filtrate in XLSX | - |
| **Sync Shopify** | Importa comenzi noi din Shopify (`POST /api/sync`) | - |
| **Sync Trendyol** | Importa comenzi din ultimele 7 zile din Trendyol | - |
| **Creare comanda** | Deschide dialog comanda manuala (doar tab Shopify) | `orders.create` |

## Filtre

### Rand 1 - Filtre principale

| Filtru | Tip | Optiuni |
|--------|-----|---------|
| **Cautare** | Text input | Cauta dupa comanda, client, telefon |
| **Status** | Select | Toate, In asteptare, Validate, Validare esuata, Facturate, Expediate, Livrate, Returnate, Anulate |
| **Magazin** | Select | Toate magazinele + lista magazine din canalul activ |
| **AWB** | Select | Toate, Cu AWB emis, Fara AWB |
| **Status AWB** | Select (conditionat) | Apare doar cand AWB = "Cu AWB emis". Optiuni: In tranzit, Livrate, Retururi, In asteptare, Anulate |
| **Status intern** | Select | Toate, Fara status intern + statusuri personalizate (cu culori) |

### Rand 2 - Filtre secundare

| Filtru | Tip | Descriere |
|--------|-----|-----------|
| **Interval date** | 2x Date input | Data start si data sfarsit |
| **Filtru produs** | Text input | Filtreaza dupa SKU sau nume produs |

## Actiuni Bulk (bara selectie)

Cand sunt selectate comenzi, apare o bara cu actiuni:

| Buton | Actiune | Permisiune | API |
|-------|---------|------------|-----|
| **Emite Facturi** | Emite facturi in Oblio | `invoices.create` | `POST /api/invoices/issue` |
| **Creeaza AWB** | Deschide modal AWB | `awb.create` | `POST /api/awb/create` |
| **Emite Tot (Factura + AWB)** | Procesare completa | `orders.process` | `POST /api/orders/process-all` |

### Modal Creare AWB

| Camp | Tip | Default |
|------|-----|---------|
| **Foloseste setari default** | Checkbox | Da |
| **Tip serviciu** | Select | Standard |
| **Tip plata** | Select | Destinatar |
| **Greutate (kg)** | Input | 1 |
| **Colete** | Input | 1 |
| **Observatii** | Textarea | - |
| **Creeaza picking list** | Checkbox | Da (doar la bulk) |

## Tabel Comenzi

### Coloane

| Coloana | Continut |
|---------|----------|
| Checkbox | Selectie multipla |
| **Comanda** | Numar comanda + badge magazin + badge sursa (Shopify/Trendyol) + data |
| **Client** | Nume + badge numar comenzi (daca > 1) + email + oras |
| **Validari** | Icon-uri pentru telefon si adresa (PASSED/FAILED/PENDING) |
| **Valoare** | Pret total formatat in moneda |
| **Status** | Badge status cu indicator eroare (punct rosu) |
| **Status Intern** | Dropdown cu statusuri personalizate (editabil inline) |
| **Factura** | Numar factura sau badge status |
| **AWB** | Numar AWB cu badge status colorat |
| **Sync Status** | Status sincronizare Trendyol (daca e cazul) |
| **Actiuni** | Butoane: Vezi, Editeaza, Emite factura, Creeaza AWB, Sterge AWB |

### Statusuri vizuale AWB

| Status | Culoare | Icon |
|--------|---------|------|
| Livrat | Verde | CheckCircle2 |
| In tranzit | Albastru | Truck |
| Retur/Refuz | Galben | RotateCcw |
| In asteptare | Galben | Clock |
| Anulat | Rosu (line-through) | Ban |
| Sters | Gri (line-through, opacity) | Trash2 |
| Eroare | Rosu | AlertCircle |

## Modal Vizualizare Comanda

Se deschide la click pe orice rand din tabel. Contine:

### Informatii afisate
- Numar comanda, sursa, data
- Date client: nume, email, telefon
- Adresa de livrare completa
- Produse comandate (cu imagine, SKU, cantitate, pret, tooltip stoc live)
- Status factura cu numar si link catre Oblio
- Status AWB cu optiuni de previzualizare si descarcare eticheta
- Informatii Trendyol (daca e cazul): pachet, factura trimisa, tracking trimis

### Actiuni din modal

| Buton | Actiune | Permisiune |
|-------|---------|------------|
| **Emite Factura** | `POST /api/invoices/issue` | `invoices.create` |
| **Creeaza AWB** | Deschide modal AWB | `awb.create` |
| **Procesare Completa** | Factura + AWB | `orders.process` |
| **Editeaza** | Deschide dialog editare | - |
| **Sincronizeaza** | Refresh status AWB + factura | - |
| **Anuleaza Factura** | Storno factura in Oblio | `invoices.cancel` |
| **Sterge AWB** | Sterge AWB din FanCourier | `awb.delete` |
| **Previzualizare AWB** | Afiseaza PDF etichetei | - |

### Notite Comanda

Sectiune cu `Textarea` pentru notite interne. Se salveaza cu `PUT /api/orders/{id}/notes`. Butonul "Salveaza" apare doar cand exista modificari.

## Dialog Editare Comanda

Permite editarea:
- Telefon, email, prenume, nume
- Adresa: strada, complement, oras, judet, cod postal

Daca comanda are documente emise (factura/AWB), afiseaza un avertisment si cere confirmare explicita (`acknowledgeDocumentsIssued`). Modificarile se sincronizeaza si in Shopify.

## Tab Erori de Procesare

Al doilea tab (`Tabs`) afiseaza erorile persistente din baza de date:
- Badge cu numar erori active pe tab
- Filtru dupa status eroare si tip eroare
- Selectie multipla cu actiuni Retry/Skip bulk
- Componenta `ProcessingErrorsPanel` afiseaza erorile inline

## Dialog Comanda Manuala

Componenta `ManualOrderDialog` permite crearea unei comenzi manuale (pentru comenzi telefonice sau offline). Disponibil doar pe tab-ul Shopify, necesita permisiunea `orders.create`.

## Transfer Warning Modal

Componenta `TransferWarningModal` apare cand se incearca facturarea unor comenzi care au transferuri de inventar in curs. Afiseaza numarul transferului si statusul, si cere confirmare inainte de a continua.

## Paginare

Afiseaza numar total de comenzi, pagina curenta si butoane Inapoi/Inainte. Limita implicita: 50 comenzi per pagina.
