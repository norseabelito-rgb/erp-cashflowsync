# Documentație Picking Workflow - ERP Shopify

## Rezumat Modificări v9

### Funcționalități Noi

#### 1. Buton "Procesează" Unificat
- Înlocuiește butoanele separate "Facturează" și "Emite AWB"
- Procesare secvențială per comandă:
  1. Emite factură (SmartBill)
  2. Dacă OK → Emite AWB (FanCourier)
  3. Dacă eroare → Salvează în tabelul de erori
- După procesare:
  - Creează picking list automat
  - Notifică toți Pickerii
  - Trimite AWB-urile la imprimantă (dacă configurată)

#### 2. Sistem de Erori și Retry
- **Tabel nou**: `ProcessingError`
- **Pagină nouă**: `/processing-errors`
- Funcționalități:
  - Vizualizare erori pe categorii (factură/AWB)
  - Retry individual
  - Marcarea erorilor ca "sărite"
  - Statistici în timp real

#### 3. Workflow Picking Îmbunătățit

**Preluare Picking List:**
- Picker-ul apasă "Start Picking"
- Se salvează cine a preluat și când
- Dacă altcineva încearcă să preia → eroare "Deja preluat de X"

**Marcare Produse:**
- Click pe produs → modal "Câte bucăți ai preluat?"
- Cantitate parțială permisă
- Butoane rapide: 1, 5, 10, Toate
- Încercare surplus → eroare + log în audit

**Finalizare:**
- Buton "Finalizează" activ doar când 100% completat
- La finalizare:
  - Generează PDF cu toate detaliile
  - Salvează PDF în baza de date
  - Trimite notificare administratorilor cu PDF atașat

#### 4. Log-uri Picking (Audit Trail)
- **Tabel nou**: `PickingLog`
- **Pagină nouă**: `/picking/logs`
- **Permisiune nouă**: `picking.logs`
- Tipuri de acțiuni logate:
  - `ITEM_PICKED` - Produs marcat
  - `ITEM_UNDO` - Undo pe un produs
  - `SURPLUS_ATTEMPT` - Încercare surplus
  - `LIST_STARTED` - Listă preluată
  - `LIST_COMPLETED` - Listă finalizată
  - `LIST_SAVED` - Progres salvat
  - `QUANTITY_CHANGED` - Cantitate modificată

#### 5. RBAC - Sidebar Filtrat
- Sidebar-ul afișează DOAR meniurile la care utilizatorul are acces
- Navigare directă la o pagină neautorizată → redirect la `/403`
- Pagină 403 dedicată cu mesaj prietenos

#### 6. Notificări Îmbunătățite
- La creare picking list → notificare toți Pickerii
- La finalizare → notificare SuperAdmins și Administratori
- Notificări cu atașamente (PDF)
- Link direct la picking list

#### 7. UI Improvements
- Contrast îmbunătățit pentru produse completate
- SKU mai vizibil (fundal gri închis)
- Card-uri produse clickable pentru marcare rapidă
- Informații despre cine a creat/preluat/finalizat

### Schema DB - Modificări

```prisma
// PickingList - câmpuri noi
startedBy       String?   // User ID
startedByName   String?   // Nume cached
completedBy     String?
completedByName String?
pdfData         Bytes?    // PDF finalizat
pdfGeneratedAt  DateTime?

// PickingListItem - câmpuri noi pentru rețete
isRecipeParent  Boolean   // Are rețetă
parentItemId    String?   // Componentă a unui produs
recipeLevel     Int       // Nivel în ierarhie

// Notification - câmpuri noi
attachmentData     Bytes?
attachmentName     String?
attachmentMimeType String?
actionUrl          String?

// Tabele noi
PickingLog          // Audit trail
ProcessingError     // Erori procesare
```

### Permisiuni Noi

```
picking.logs              - Vizualizare log-uri picking
processing.errors.view    - Vizualizare erori procesare
processing.errors.retry   - Reîncercare procesare
processing.errors.skip    - Sări erori
```

### Fișiere Noi/Modificate

**Noi:**
- `/src/app/403/page.tsx`
- `/src/app/(dashboard)/processing-errors/page.tsx`
- `/src/app/(dashboard)/picking/logs/page.tsx`
- `/src/app/api/processing-errors/route.ts`
- `/src/app/api/picking/logs/route.ts`
- `/src/app/api/orders/process/route.ts`
- `/src/components/route-guard.tsx`

**Modificate:**
- `/src/app/(dashboard)/picking/[id]/page.tsx` - Modal cantitate, info preluare
- `/src/app/api/picking/[id]/route.ts` - Acțiuni pickItem, logare
- `/src/components/sidebar.tsx` - Filtrare pe baza permisiunilor
- `/src/app/(dashboard)/layout.tsx` - RouteGuard
- `/src/hooks/use-permissions.tsx` - ROUTE_PERMISSIONS map
- `/src/lib/permissions.ts` - Permisiuni noi
- `/src/lib/smartbill.ts` - Funcții pentru rețete
- `/prisma/schema.prisma` - Tabele și câmpuri noi

### Cum să Rulezi Migrația

```bash
cd erp-shopify
npx prisma migrate dev --name picking-workflow-v2
npx prisma generate
```

### Testare

1. **Procesare Comenzi:**
   - Selectează comenzi → Click "Procesează"
   - Verifică că se creează facturi, AWB-uri, picking list
   - Verifică notificările pentru pickeri

2. **Erori Procesare:**
   - Accesează `/processing-errors`
   - Verifică retry și skip

3. **Picking Workflow:**
   - Accesează un picking list ca Picker
   - Click "Start Picking"
   - Marchează produse (click + cantitate)
   - Finalizează
   - Verifică PDF generat și notificări admin

4. **RBAC:**
   - Loghează-te ca user cu permisiuni limitate
   - Verifică că sidebar-ul afișează doar ce trebuie
   - Încearcă acces direct la URL-uri neautorizate
