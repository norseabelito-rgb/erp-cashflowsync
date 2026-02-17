# Facturi

**Ruta:** `/invoices`
**Fisier:** `src/app/(dashboard)/invoices/page.tsx`
**Tip:** Client Component (`"use client"`)

## Descriere

Pagina de gestionare a facturilor emise prin Oblio. Permite vizualizarea, filtrarea, anularea (stornarea) si marcarea ca platite a facturilor.

## Butoane Header

| Buton | Actiune |
|-------|---------|
| **Help - Statusuri** | Deschide dialog cu explicatii despre statusurile facturilor |
| **Reimprospatateaza** | Reincarca lista de facturi |

## Carduri Statistici

5 carduri in header cu sumar:

| Card | Valoare | Culoare |
|------|---------|---------|
| **Total facturi** | Numar total | Albastru |
| **Platite** | Facturi cu `paymentStatus = "paid"` | Verde |
| **Neplatite** | Facturi emise dar neplatite | Galben |
| **Scadente** | Facturi cu `dueDate` depasit si neplatite | Rosu |
| **Anulate** | Facturi cu `status = "cancelled"` | Gri |

## Filtre

| Filtru | Tip | Optiuni |
|--------|-----|---------|
| **Cautare** | Text input | Cauta dupa numar factura sau comanda |
| **Status factura** | Select | Toate, Emise, In asteptare, Anulate, Cu erori |
| **Status plata** | Select | Toate, Platite, Neplatite, Partial platite |
| **AWB** | Select | Toate, Cu AWB emis, Fara AWB |
| **Status AWB** | Select (conditionat) | Apare doar cu AWB. Optiuni: In tranzit, Livrate, Retururi, In asteptare, Anulate |

## Tabel Facturi

| Coloana | Continut |
|---------|----------|
| **Factura** | Serie + numar (mono font). Daca anulata: line-through. Afiseaza si numarul de stornare daca exista |
| **Comanda** | Numar comanda Shopify |
| **Client** | Nume complet |
| **Valoare** | Pret total in moneda |
| **Status** | Badge: Emisa (verde), In asteptare (galben), Anulata (rosu), Eroare (rosu cu mesaj) |
| **Plata** | Badge: Platita (verde), Neplatita (galben), Scadenta (rosu), Anulata (gri) |
| **Scadenta** | Data scadenta |
| **Actiuni** | Meniu dropdown |

Click pe un rand navigheaza la `/orders/{orderId}`.

### Meniu Actiuni per Factura

| Actiune | Conditie | Descriere |
|---------|----------|-----------|
| **Vizualizeaza PDF** | Factura emisa + are pdfUrl | Deschide PDF-ul in tab nou |
| **Deschide in Oblio** | Are oblioId | Link extern catre Oblio |
| **Marcheaza ca platita** | Factura emisa + neanulata | Deschide dialog plata |
| **Anuleaza factura** | Factura emisa + neanulata | Deschide dialog confirmare stornare |
| **Vizualizeaza eroarea** | Are errorMessage | Afiseaza mesajul de eroare intr-un modal |

## Dialog Anulare Factura (Storno)

- Afiseaza numarul facturii si un camp pentru motivul anularii
- Actiunea: `POST /api/invoices/{id}/cancel` cu `{ reason }`
- In Oblio se emite o nota de credit (storno), nu se sterge factura

## Dialog Marcare ca Platita

| Camp | Descriere |
|------|-----------|
| **Suma** | Pre-populata cu totalul comenzii |
| **Metoda de plata** | Select: Cash, Card, Transfer bancar |

Actiunea: `POST /api/invoices/{id}/pay` cu `{ amount, method }`

## Pagina Facturi Esuate

**Ruta:** `/invoices/failed`
**Fisier:** `src/app/(dashboard)/invoices/failed/page.tsx`

Sub-pagina accesibila din header-ul paginii de facturi. Afiseaza facturile care au esuat la emitere.

### Filtre

| Filtru | Optiuni |
|--------|---------|
| **Status** | In asteptare, Rezolvate |
| **Cautare** | Dupa numar comanda, magazin sau mesaj eroare |

### Tabel Facturi Esuate

| Coloana | Continut |
|---------|----------|
| **Comanda** | Numar comanda + email client |
| **Magazin** | Nume magazin |
| **Companie** | Compania de facturare |
| **Serie** | Serie factura configurata |
| **Cod eroare** | Badge colorat (NO_SERIES, FACTURIS_ERROR, VALIDATION_ERROR, UNKNOWN) |
| **Mesaj eroare** | Detalii eroare |
| **Data** | Data tentativei |
| **Tentativa** | Numarul tentativei |
| **Status** | Rezolvat / In asteptare |
| **Actiuni** | Buton "Reincearca" (POST /api/invoices/failed) |

## Interfata Factura

```typescript
{
  id: string;
  invoiceNumber: string | null;
  invoiceSeriesName: string | null;
  oblioId: string | null;
  status: "issued" | "pending" | "cancelled" | "error";
  errorMessage: string | null;
  pdfUrl: string | null;
  issuedAt: string | null;
  dueDate: string | null;
  paymentStatus: "paid" | "unpaid" | "partial";
  paidAmount: string | null;
  paidAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  stornoNumber: string | null;
  stornoSeries: string | null;
  order: {
    id: string;
    shopifyOrderNumber: string;
    customerFirstName: string | null;
    customerLastName: string | null;
    totalPrice: string;
    currency: string;
    financialStatus: string | null;
    store: { name: string };
  };
}
```
