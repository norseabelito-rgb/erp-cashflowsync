# Temu

## Prezentare Generala

Modulul Temu integreaza marketplace-ul Temu cu ERP-ul, oferind doua pagini: un dashboard cu statistici si comenzi recente, si o pagina cu lista completa a comenzilor. Suporta mai multe magazine Temu simultan.

**URL-uri:**
- `/temu` - Dashboard Temu
- `/temu/orders` - Comenzi Temu

---

## Dashboard Temu (`/temu`)

### Stare Neconfigurata

Daca nu exista magazine Temu configurate (`configured: false`), pagina afiseaza:
- Mesaj: "Temu nu este configurat"
- Descriere: "Adauga un magazin Temu pentru a incepe."
- Buton: "Configureaza Temu" - navigare la `/settings?tab=temu`

### Informatii Afisate (configurata)

**Selector magazine** - dropdown vizibil daca exista mai mult de 1 magazin Temu

**Carduri statistice:**

| Card | Descriere | Varianta | Link |
|------|-----------|----------|------|
| Total Comenzi | Numarul total de comenzi | Default | `/temu/orders` |
| De Facturat | Comenzi fara factura | Warning (daca > 0) | `/orders?source=temu&needsInvoice=true` |
| Fara AWB | Comenzi fara AWB | Warning (daca > 0) | `/orders?source=temu&needsAwb=true` |
| Sincronizate Azi | Comenzi sincronizate astazi | Success | - |

**Tabel Comenzi Recente** (ultimele 5):

| Coloana | Descriere |
|---------|-----------|
| Comanda | Numarul comenzii Temu |
| Client | Numele clientului |
| Data | Data comenzii (format RO) |
| Status | Badge status |
| Total | Suma + moneda |

### Statusuri Comenzi

| Status | Label | Badge |
|--------|-------|-------|
| PENDING_SHIPMENT | De expediat | Default |
| SHIPPED | Expediat | Info |
| DELIVERED | Livrat | Success |
| CANCELLED | Anulat | Destructive |
| RETURNED | Returnat | Warning |

### Butoane si Actiuni

| Buton | Actiune |
|-------|---------|
| Sincronizeaza | Descarca comenzile noi din ultimele 7 zile (cu SyncOverlay) |
| Vezi comenzi | Navigare la `/temu/orders` |
| Setari | Navigare la `/settings?tab=temu` |
| Sincronizeaza acum | Afisat cand nu sunt comenzi |

### SyncOverlay

In timpul sincronizarii se afiseaza un overlay cu:
- Titlu: "Sincronizare comenzi Temu"
- Descriere: "Se descarca comenzile din Temu..."
- Progres
- Mesaj succes/eroare la finalizare

---

## Comenzi Temu (`/temu/orders`)

### Informatii Afisate

**Tabel comenzi:**

| Coloana | Descriere |
|---------|-----------|
| Comanda | Numar comanda Temu |
| Client | Numele clientului |
| Data | Data comenzii |
| Status | Badge cu status-ul comenzii |
| Total | Suma + moneda |
| Sincronizare | Iconite status factura si tracking |

### Filtre si Cautare

- **Cautare** - dupa numar comanda sau nume client
- **Status** - Toate / De expediat / Expediat / Livrat / Anulat / Returnat
- **Magazin** - selector daca exista mai multe magazine
- **Paginare**

### Butoane si Actiuni

| Buton | Actiune |
|-------|---------|
| Sincronizeaza | Descarca comenzile noi din Temu API |
| Deschide | Deschide dialogul de detaliu comanda |
| Refresh | Reincarca lista |

### Dialog Detaliu Comanda

**Sectiuni:**

1. **Informatii client** - Nume, adresa completa, telefon
2. **Produse** - Lista cu SKU, titlu, cantitate, pret, status mapare
3. **Status sincronizare** - Factura emisa, AWB generat
4. **Link comanda ERP** - daca exista comanda mapata in sistem

### Navigare

- Dashboard Temu: `/temu`
- Comenzi Temu: `/temu/orders`
- Setari Temu: `/settings?tab=temu`
- Comenzi principale filtrate: `/orders?source=temu`
