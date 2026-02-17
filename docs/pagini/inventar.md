# Inventar

**Ruta:** `/inventory`
**Fisier principal:** `src/app/(dashboard)/inventory/page.tsx`
**Tip:** Client Component (`"use client"`)

## Descriere

Sistemul de gestionare a inventarului cu articole individuale si compuse, suport multi-depozit, transferuri, receptii, comenzi de achizitie, furnizori si rapoarte.

## Sub-pagini

| Ruta | Fisier | Descriere |
|------|--------|-----------|
| `/inventory` | `page.tsx` | Lista articole inventar |
| `/inventory/new` | `new/page.tsx` | Adauga articol nou |
| `/inventory/[id]` | `[id]/page.tsx` | Detalii articol |
| `/inventory/[id]/edit` | `[id]/edit/page.tsx` | Editeaza articol |
| `/inventory/movements` | `movements/page.tsx` | Istoric miscari stoc |
| `/inventory/movements/adjustments` | `movements/adjustments/page.tsx` | Ajustari manuale stoc |
| `/inventory/transfers` | `transfers/page.tsx` | Lista transferuri inter-depozit |
| `/inventory/transfers/new` | `transfers/new/page.tsx` | Transfer nou |
| `/inventory/transfers/[id]` | `transfers/[id]/page.tsx` | Detalii transfer |
| `/inventory/receipts` | `receipts/page.tsx` | Lista receptii (NIR) |
| `/inventory/receipts/new` | `receipts/new/page.tsx` | Receptie noua |
| `/inventory/receipts/[id]` | `receipts/[id]/page.tsx` | Detalii receptie |
| `/inventory/receipts/office` | `receipts/office/page.tsx` | Receptii birou |
| `/inventory/receipts/pending-approval` | `receipts/pending-approval/page.tsx` | Receptii in asteptare aprobare |
| `/inventory/reception` | `reception/page.tsx` | Receptie simplificata |
| `/inventory/reception/[id]` | `reception/[id]/page.tsx` | Detalii receptie simplificata |
| `/inventory/suppliers` | `suppliers/page.tsx` | Lista furnizori |
| `/inventory/recipes` | `recipes/page.tsx` | Retete articole compuse |
| `/inventory/recipes/[id]` | `recipes/[id]/page.tsx` | Detalii reteta |
| `/inventory/purchase-orders` | `purchase-orders/page.tsx` | Comenzi de achizitie |
| `/inventory/purchase-orders/new` | `purchase-orders/new/page.tsx` | Comanda achizitie noua |
| `/inventory/purchase-orders/[id]` | `purchase-orders/[id]/page.tsx` | Detalii comanda achizitie |
| `/inventory/purchase-orders/[id]/labels` | `.../labels/page.tsx` | Etichete pentru comanda |
| `/inventory/supplier-invoices` | `supplier-invoices/page.tsx` | Facturi furnizor |
| `/inventory/supplier-invoices/[id]` | `supplier-invoices/[id]/page.tsx` | Detalii factura furnizor |
| `/inventory/reports/stock` | `reports/stock/page.tsx` | Raport stoc |

## Pagina Principala - Lista Articole (`/inventory`)

### Butoane Header

| Buton | Actiune |
|-------|---------|
| **Reincarca** | Reincarca lista |
| **Export CSV** | Descarca inventarul in CSV |
| **Import CSV** | Deschide dialog import |
| **Adauga Articol** | Navigheaza la `/inventory/new` |

### Filtre

| Filtru | Tip | Optiuni |
|--------|-----|---------|
| **Cautare** | Text | Dupa SKU sau nume articol |
| **Tip** | Select | Toate, Individual, Compus |
| **Stoc** | Select | Toate, Stoc scazut, Active |
| **Depozit** | Select | Toate depozitele + depozite specifice |
| **Per pagina** | Select | 25, 50, 100 |

### Carduri Statistici

| Card | Valoare |
|------|---------|
| **Total articole** | `stats.totalItems` |
| **Compuse** | `stats.compositeItems` |
| **Individuale** | `stats.individualItems` |
| **Stoc scazut** | `stats.lowStockItems` |

### Tabel Articole

| Coloana | Continut |
|---------|----------|
| Checkbox | Selectie multipla |
| **Articol** | Nume + SKU |
| **Unitate** | Unitate de masura (buc, kg, l) |
| **Pret cost** | Pret de achizitie |
| **Stoc** | Badge colorat: Fara stoc (rosu), Sub minim (galben), OK (gri), Compus |
| **Stoc per depozit** | Coloane dinamice, cate una per depozit activ |
| **Furnizor** | Nume furnizor (daca exista) |
| **Mapari** | Numar produse mapate |
| **Actiuni** | Meniu: Vezi, Editeaza, Sterge |

Click pe un rand navigheaza la `/inventory/{id}`.

### Actiuni Bulk

| Actiune | Descriere |
|---------|-----------|
| **Sterge selectate** | Sterge articolele selectate (cu confirmare) |

### Dialog Import

| Camp | Optiuni |
|------|---------|
| **Fisier** | Upload CSV |
| **Mod import** | Upsert, Doar creare, Doar actualizare, Doar stoc |
| **Sterge nelistate** | Checkbox - sterge articolele care nu apar in fisierul importat |

Dupa import se afiseaza un dialog cu rezultatele: articole create, actualizate, sarite, erori.

## Interfata Articol Inventar

```typescript
{
  id: string;
  sku: string;
  name: string;
  description?: string;
  currentStock: number;
  minStock?: number;
  unit: string;              // buc, kg, l, etc.
  unitsPerBox?: number;
  boxUnit?: string;
  costPrice?: number;
  isComposite: boolean;      // true = produs compus (reteta)
  isActive: boolean;
  supplier?: { id: string; name: string };
  warehouseStocks?: [{       // Stoc per depozit
    id: string;
    currentStock: number;
    warehouse: { id: string; code: string; name: string };
  }];
  recipeComponents?: [{      // Componente reteta (daca compus)
    id: string;
    quantity: number;
    unit?: string;
    componentItem: { id: string; sku: string; name: string; currentStock: number; unit: string };
  }];
  _count?: {
    mappedProducts: number;
    stockMovements: number;
  };
}
```

## API-uri Folosite

| Endpoint | Metoda | Descriere |
|----------|--------|-----------|
| `/api/inventory-items` | GET | Lista articole cu filtre si paginare |
| `/api/inventory-items` | DELETE | Sterge articol dupa id |
| `/api/inventory-items/bulk-delete` | POST | Sterge mai multe articole |
| `/api/inventory-items/import` | POST | Import din CSV (FormData) |
| `/api/inventory-items/export` | GET | Export CSV |
| `/api/warehouses` | GET | Lista depozite |
