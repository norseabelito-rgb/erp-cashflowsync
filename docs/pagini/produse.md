# Produse si Categorii

**Rute:**
- `/products` - Catalog produse
- `/products/[id]` - Detalii produs
- `/products/inventory-mapping` - Mapare inventar
- `/products/recipes` - Retete produse compuse
- `/categories` - Gestionare categorii

**Fisiere principale:**
- `src/app/(dashboard)/products/page.tsx`
- `src/app/(dashboard)/products/inventory-mapping/page.tsx`
- `src/app/(dashboard)/products/recipes/page.tsx`
- `src/app/(dashboard)/categories/page.tsx`

## Catalog Produse (`/products`)

### Butoane Header

| Buton | Actiune |
|-------|---------|
| **Sincronizeaza Shopify** | Importa/actualizeaza produse din Shopify (`POST /api/products/sync-shopify`) |
| **Import CSV** | Deschide dialog import produse |
| **Export CSV** | Descarca produsele in format CSV |
| **Adauga Produs** | Deschide dialog creare produs nou |

### Filtre

| Filtru | Tip | Descriere |
|--------|-----|-----------|
| **Cautare** | Text input | Cauta dupa nume sau SKU |
| **Categorie** | Select | Filtreaza pe categorie |
| **Canal** | Select | Filtreaza pe canal de vanzare (Shopify store) |
| **Pagina** | Paginare | 25 produse per pagina |

### Tabel Produse

| Coloana | Continut |
|---------|----------|
| Checkbox | Selectie multipla |
| **Imagine** | Thumbnail produs sau placeholder |
| **Produs** | Titlu + SKU + badge categorie |
| **Pret** | Pret curent + pret vechi (compare at) |
| **Stoc** | Cantitate curenta |
| **Canale** | Badge-uri cu status publicare pe fiecare canal (publicat/nepublicat/sincronizat) |
| **Actiuni** | Meniu: Vezi detalii, Editeaza, Override canal, Sterge |

### Actiuni Bulk (cand sunt selectate produse)

| Actiune | Descriere |
|---------|-----------|
| **Publica pe canal** | Publica produsele selectate pe un canal ales |
| **Depublica** | Scoate produsele de pe un canal |
| **Sterge** | Sterge produsele selectate |
| **Schimba categoria** | Muta in alta categorie |

### Dialog Produs Nou

| Camp | Tip | Descriere |
|------|-----|-----------|
| **SKU** | Text | Cod unic produs |
| **Titlu** | Text | Numele produsului |
| **Descriere** | RichTextEditor | Descriere cu formatare |
| **Pret** | Number | Pretul de vanzare |
| **Pret promotional** | Number | Compare at price (optional) |
| **Tags** | Text | Etichete separate prin virgula |
| **Categorie** | Select | Categorie din lista existenta |
| **Canale** | Multi-select | Pe ce canale se publica |
| **Stoc** | Number | Stocul initial |
| **Articol inventar** | Combobox | Leaga de un articol din inventar (cautare dupa SKU) |

### Dialog Import Produse

| Camp | Optiuni |
|------|---------|
| **Fisier** | Upload CSV/Excel |
| **Mod import** | Upsert (creaza/actualizeaza), Doar creare, Doar actualizare |

### Dialog Override Canal

Permite setarea de preturi sau titluri diferite per canal de vanzare. Buton de resetare la valorile originale.

### Bulk Publish Progress

Componenta `BulkPublishProgress` afiseaza progresul publicarii in masa pe canalele de vanzare (job asincron).

## Mapare Inventar (`/products/inventory-mapping`)

Pagina de legare a produselor catalog cu articolele din inventar.

### Filtre

| Filtru | Tip | Optiuni |
|--------|-----|---------|
| **Cautare** | Text | Dupa SKU sau titlu produs |
| **Status mapare** | Select | Toate, Mapate, Nemapate |

### Tabel

Afiseaza produsele cu indicatia de mapare (icon verde/rosu). Click pe un produs deschide un dialog unde se alege articolul de inventar corespunzator.

### Auto-Match

Buton "Auto Match" care incearca sa mapeze automat produsele cu articole de inventar pe baza SKU-ului identic.

## Retete Produse Compuse (`/products/recipes`)

Pagina pentru gestionarea retetelor produselor compuse (kiturilor).

### Functionalitati

- Lista produse compuse cu numar componente
- Click pe un produs afiseaza componentele
- Mod editare: adauga/sterge componente, modifica cantitati
- Combobox pentru cautare componente

## Categorii (`/categories`)

### Functionalitati

| Actiune | Descriere |
|---------|-----------|
| **Adauga categorie** | Dialog cu camp Nume si Descriere |
| **Editeaza** | Modifica numele si descrierea |
| **Sterge** | Sterge categorie (cu confirmare) |

### Tabel

| Coloana | Continut |
|---------|----------|
| **Categorie** | Nume + descriere |
| **Produse** | Numar de produse in categorie |
| **Data creare** | Data formatata |
| **Actiuni** | Butoane Edit si Delete |

## Interfata Produs

```typescript
{
  id: string;
  sku: string;
  title: string;
  description?: string;
  price: number;
  compareAtPrice?: number;
  tags: string[];
  stock: number;
  isActive: boolean;
  category?: { id: string; name: string };
  images: { id: string; url: string; position: number }[];
  channels: ProductChannel[];
}
```
