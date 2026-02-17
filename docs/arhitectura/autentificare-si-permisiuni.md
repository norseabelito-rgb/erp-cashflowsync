# Autentificare si Permisiuni

## Configurare NextAuth.js

Fisier: `src/lib/auth.ts`

### Provideri de Autentificare

| Provider | Descriere |
|---|---|
| **Google OAuth** | Login cu cont Google. `allowDangerousEmailAccountLinking: true` permite legarea automata a conturilor. |
| **Credentials** | Login cu email + parola (hash bcrypt). Verifica: existenta user, parola setata, cont activ, parola corecta. |

### Strategia de Sesiune

- **Tip:** JWT (JSON Web Token)
- **Durata sesiune:** Configurabila prin `SESSION_TIMEOUT_MINUTES` (default: 30 minute)
- **Update age:** 60 secunde (reseteaza timeout-ul la activitate)
- **Debug:** Activat doar in `development`

### Pagini Custom

| Pagina | Ruta |
|---|---|
| Sign In | `/login` |
| Error | `/login` |
| Redirect dupa login | `/dashboard` |

### Fluxul de Autentificare

#### 1. Callback `signIn`

```
Utilizator se autentifica
  │
  ├── Google OAuth?
  │   ├── Exista user cu acest email?
  │   │   ├── DA -> Are cont Google legat?
  │   │   │   ├── DA -> Foloseste user-ul existent
  │   │   │   └── NU -> Leaga contul Google automat
  │   │   └── NU -> Creeaza user nou (adapter)
  │   │
  │   └── ALLOWED_EMAILS configurat?
  │       ├── Email in lista -> Permite
  │       ├── User exista in DB -> Permite
  │       ├── Are invitatie valida -> Permite
  │       └── Altfel -> Respinge
  │
  ├── Cont activ?
  │   ├── DA -> Continua
  │   └── NU -> Respinge (utilizator dezactivat)
  │
  └── User nou (creat in ultimele 10s)?
      └── DA -> Notifica SuperAdmin-ii
```

#### 2. Callback `jwt`

La primul login:
- Adauga `id` si `isSuperAdmin` in token
- Daca este **primul utilizator** din sistem -> devine SuperAdmin automat (creeaza rol + asigneaza)
- Altfel -> fetch `isSuperAdmin` din DB

La `trigger === "update"`:
- Re-fetch `isSuperAdmin` din DB (pentru actualizari in timp real)

#### 3. Callback `session`

Adauga in sesiune:
- `session.user.id` - ID-ul utilizatorului
- `session.user.isSuperAdmin` - flag SuperAdmin

### Primul Utilizator = SuperAdmin

Cand primul utilizator se inregistreaza:
1. Se creeaza toate permisiunile din `ALL_PERMISSIONS`
2. Se creeaza rolul `SUPER_ADMIN` (system role)
3. Se asigneaza toate permisiunile la rol
4. User-ul primeste `isSuperAdmin: true`
5. Se asigneaza rolul `SUPER_ADMIN`

### Restrictie ALLOWED_EMAILS

Variabila de mediu `ALLOWED_EMAILS` (lista separata prin virgula):
- Daca este **goala** -> oricine se poate autentifica
- Daca este **setata** -> doar email-urile din lista, utilizatorii existenti, sau cei cu invitatie valida pot accesa

---

## Autentificare Embed (iframe)

Fisier: `src/lib/embed-auth.ts`

Pentru acces iframe (ex: embed in Daktela CRM), se foloseste un token Bearer simplu:

```typescript
// Validare: Authorization: Bearer <EMBED_SECRET_TOKEN>
validateEmbedToken(request: NextRequest): boolean
```

- Token-ul este comparat cu variabila de mediu `EMBED_SECRET_TOKEN`
- Folosit pentru rute `/customers/embed/*`
- Nu necesita sesiune NextAuth (cross-origin, fara cookies)

### Configurare iframe in `next.config.js`

```javascript
// CSP frame-ancestors din EMBED_ALLOWED_DOMAINS
// CORS headers pentru API customers
```

---

## Sistem RBAC (Role-Based Access Control)

Fisier: `src/lib/permissions.ts`

### Ierarhie Acces

```
SuperAdmin (isSuperAdmin: true)
  └── Toate permisiunile, toate store-urile, toate depozitele
      │
User normal
  ├── Permisiuni din roluri directe (UserRoleAssignment)
  ├── Permisiuni din grupuri (UserGroupMembership -> GroupRoleAssignment -> Role)
  ├── Acces store (UserStoreAccess) - daca nu are restrictii -> acces la toate
  └── Acces depozit (UserWarehouseAccess) - daca nu are restrictii -> acces la toate
```

### Functii de Verificare

| Functie | Descriere |
|---|---|
| `hasPermission(userId, code)` | Verifica daca user-ul are o permisiune specifica |
| `hasStoreAccess(userId, storeId)` | Verifica acces la un magazin |
| `hasWarehouseAccess(userId, warehouseId)` | Verifica acces la un depozit |
| `getUserPermissions(userId)` | Returneaza toate permisiunile user-ului |
| `getUserStores(userId)` | Returneaza store-urile accesibile |
| `getUserWarehouses(userId)` | Returneaza depozitele accesibile |
| `getPrimaryWarehouse()` | Returneaza depozitul principal |
| `logAuditAction(params)` | Logheaza o actiune in audit log |
| `seedPermissions()` | Populeaza permisiunile in DB |
| `seedDefaultRoles()` | Creeaza rolurile default |

### Logica Acces Store/Depozit

- Daca user-ul **nu are nicio restrictie** (niciun `UserStoreAccess` / `UserWarehouseAccess`), are acces la **toate** store-urile/depozitele
- Daca are **cel putin o restrictie**, are acces doar la cele specificate

---

## Lista Completa Permisiuni

### Comenzi (`orders`)

| Cod | Descriere |
|---|---|
| `orders.view` | Vizualizare comenzi |
| `orders.create` | Creare comenzi manuale |
| `orders.edit` | Editare comenzi |
| `orders.delete` | Stergere comenzi |
| `orders.process` | Procesare comenzi (factura + AWB) |
| `orders.export` | Export comenzi |
| `orders.sync` | Sincronizare comenzi din Shopify |

### Produse (`products`)

| Cod | Descriere |
|---|---|
| `products.view` | Vizualizare produse |
| `products.create` | Adaugare produse noi |
| `products.edit` | Editare produse |
| `products.delete` | Stergere produse |
| `products.sync` | Sincronizare produse cu Shopify |
| `products.stock` | Modificare stoc |
| `products.prices` | Modificare preturi |

### Categorii (`categories`)

| Cod | Descriere |
|---|---|
| `categories.view` | Vizualizare categorii |
| `categories.manage` | Gestiune categorii (CRUD) |

### Facturi (`invoices`)

| Cod | Descriere |
|---|---|
| `invoices.view` | Vizualizare facturi |
| `invoices.create` | Emitere facturi |
| `invoices.cancel` | Anulare/stornare facturi |
| `invoices.download` | Download PDF facturi |
| `invoices.payment` | Inregistrare plati |
| `invoices.series` | Gestiune serii facturare |

### AWB (`awb`)

| Cod | Descriere |
|---|---|
| `awb.view` | Vizualizare AWB |
| `awb.create` | Generare AWB |
| `awb.print` | Printare AWB |
| `awb.delete` | Stergere AWB |
| `awb.track` | Tracking/actualizare status |

### Picking (`picking`)

| Cod | Descriere |
|---|---|
| `picking.view` | Vizualizare picking |
| `picking.create` | Creare liste picking |
| `picking.process` | Procesare picking |
| `picking.complete` | Finalizare picking |
| `picking.print` | Printare liste picking |
| `picking.logs` | Vizualizare log-uri picking |

### Predare Curier (`handover`)

| Cod | Descriere |
|---|---|
| `handover.view` | Vizualizare predare |
| `handover.scan` | Scanare AWB pentru predare |
| `handover.finalize` | Finalizare/redeschidere predare |
| `handover.report` | Rapoarte predare |

### Inventar (`inventory`)

| Cod | Descriere |
|---|---|
| `inventory.view` | Vizualizare stocuri |
| `inventory.adjust` | Ajustare manuala stoc |
| `inventory.sync` | Sincronizare stoc extern |
| `inventory.edit` | Editare articole inventar |

### Depozite (`warehouses`)

| Cod | Descriere |
|---|---|
| `warehouses.view` | Vizualizare depozite |
| `warehouses.create` | Creare depozite |
| `warehouses.edit` | Editare depozite |
| `warehouses.delete` | Stergere depozite |
| `warehouses.set_primary` | Setare depozit principal |

### Transferuri (`transfers`)

| Cod | Descriere |
|---|---|
| `transfers.view` | Vizualizare transferuri |
| `transfers.create` | Creare transferuri |
| `transfers.execute` | Executie/finalizare transferuri |
| `transfers.cancel` | Anulare transferuri |

### Marketplace, Ads, Reports, Settings, Users, Admin, Logs, Tasks, Companies, Intercompany

Fiecare categorie are permisiuni similare de `view`, `create`/`manage`, `edit`, `delete` dupa caz. Consultati `src/lib/permissions.ts` pentru lista completa.

---

## Roluri Default de Sistem

| Rol | Culoare | Descriere |
|---|---|---|
| **Administrator** | Rosu (#ef4444) | Acces complet fara gestiune roluri |
| **Manager** | Galben (#f59e0b) | Comenzi, produse, facturi, AWB, rapoarte |
| **Operator Comenzi** | Albastru (#3b82f6) | Procesare comenzi, facturi, AWB |
| **Picker** | Verde (#22c55e) | Procesare liste de picking |
| **Operator Predare** | Violet (#8b5cf6) | Scanare si predare colete catre curier |
| **Vizualizare** | Gri (#6b7280) | Doar vizualizare, fara modificari |

Toate sunt `isSystem: true` si nu pot fi sterse din UI.
