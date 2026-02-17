# Clienti

**Ruta:** `/customers`
**Fisier:** `src/app/(dashboard)/customers/page.tsx`
**Tip:** Client Component (`"use client"`)

## Descriere

Pagina de vizualizare a tuturor clientilor agregati din comenzi, cu posibilitatea de a vedea istoricul detaliat al fiecarui client.

## Filtre

| Filtru | Tip | Descriere |
|--------|-----|-----------|
| **Magazin** | Select | Filtreaza pe "Toate magazinele" sau un magazin specific. Valoarea se persista in URL (`?tab=storeId`) |
| **Cautare** | Text input | Cauta dupa nume, email, telefon, numar comanda. Debounce 300ms |

## Tabel Clienti

| Coloana | Continut |
|---------|----------|
| **Client** | Nume complet + email (cu icon Mail) |
| **Contact** | Numar telefon (cu icon Phone) sau "(Fara telefon)" |
| **Comenzi** | Badge cu numar de comenzi + badge "Comenzi multiple" daca > 1 |
| **Total cheltuit** | Suma totala formatata in RON |
| **Ultima comanda** | Data formatata (cu icon Calendar) |
| **Actiuni** | Buton "Detalii" |

Click pe orice rand deschide modalul de detalii client.

## Interfata Client

Datele unui client contin:
```typescript
{
  customerKey: string;     // Identificator unic
  email: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  orderCount: number;      // Numar total comenzi
  totalSpent: number;      // Total cheltuit
  lastOrderDate: string;   // Data ultimei comenzi
  firstOrderDate: string;  // Data primei comenzi
}
```

## Modal Detalii Client

Componenta `CustomerDetailModal` (`src/components/customers/customer-detail-modal.tsx`).

Se deschide la click pe un client din tabel si primeste:
- `customer` - datele clientului selectat
- `open` / `onOpenChange` - controlul deschiderii
- `storeId` - filtru magazin activ (pentru context)

Modalul afiseaza informatii detaliate despre client si istoricul comenzilor.

## Paginare

- 50 clienti per pagina
- Afiseaza: "Afisez X-Y din Z clienti (Pagina N din M)"
- Butoane "Inapoi" si "Inainte"
- Pagina se reseteaza la 1 cand se schimba cautarea sau filtrul

## Stari Speciale

| Stare | Mesaj |
|-------|-------|
| **Loading** | 10 randuri skeleton |
| **Eroare** | "Eroare la incarcarea clientilor" cu buton "Reincearca" |
| **Lista goala** | "Nu exista clienti" sau "Niciun client gasit" daca exista cautare |

## API Folosit

- `GET /api/customers?storeId=...&search=...&page=...&limit=50` - Lista clienti cu paginare
- Raspuns: `{ customers: Customer[], stores: Store[], pagination: {...} }`
