# API Utilizatori si RBAC

Documentatie pentru endpoint-urile de gestionare a utilizatorilor, rolurilor, grupurilor, permisiunilor si invitatiilor.

**Surse**: `src/app/api/rbac/`, `src/app/api/user/`

---

## Cuprins

- [Profil Utilizator](#profil-utilizator)
- [Preferinte Utilizator](#preferinte-utilizator)
- [Roluri](#roluri)
- [Grupuri](#grupuri)
- [Permisiuni](#permisiuni)
- [Utilizatori RBAC](#utilizatori-rbac)
- [Invitatii](#invitatii)
- [Audit Log](#audit-log)

---

## Profil Utilizator

### GET /api/user/profile

Obtine profilul utilizatorului curent autentificat, inclusiv roluri si grupuri.

**Autentificare**: Sesiune NextAuth (orice utilizator autentificat)

**Raspuns** (200):
```json
{
  "user": {
    "id": "clx1abc...",
    "name": "Ion Popescu",
    "email": "ion@firma.ro",
    "image": "https://lh3.googleusercontent.com/...",
    "isSuperAdmin": false,
    "isActive": true,
    "createdAt": "2025-01-15T10:00:00.000Z",
    "emailVerified": "2025-01-15T10:00:00.000Z",
    "roles": [
      {
        "role": { "id": "role1", "name": "Operator", "color": "#3B82F6" }
      }
    ],
    "groups": [
      {
        "group": { "id": "grp1", "name": "Depozit", "color": "#10B981" }
      }
    ]
  }
}
```

### PUT /api/user/profile

Actualizeaza profilul utilizatorului curent (nume si/sau parola).

**Autentificare**: Sesiune NextAuth

**Body**:
```typescript
{
  name?: string;            // Numele nou
  currentPassword?: string; // Obligatoriu daca se schimba parola
  newPassword?: string;     // Minim 8 caractere
}
```

**Raspuns** (200):
```json
{
  "success": true,
  "user": {
    "id": "clx1abc...",
    "name": "Ion Popescu",
    "email": "ion@firma.ro",
    "image": null
  },
  "message": "Profil actualizat"
}
```

**Erori**:
| Status | Mesaj |
|--------|-------|
| 400 | `Numele este obligatoriu` |
| 400 | `Parola noua trebuie sa aiba cel putin 8 caractere` |
| 400 | `Contul foloseste autentificarea cu Google` (nu are parola) |
| 400 | `Parola curenta este incorecta` |

---

## Preferinte Utilizator

### GET /api/user/preferences

Obtine preferintele utilizatorului curent (JSON arbitrar stocat pe user).

**Autentificare**: Sesiune NextAuth

**Raspuns** (200):
```json
{
  "preferences": {
    "theme": "dark",
    "defaultStoreId": "store1",
    "ordersPerPage": 50
  }
}
```

### PUT /api/user/preferences

Salveaza preferintele utilizatorului.

**Body**:
```typescript
{
  preferences: Record<string, any>; // Orice structura JSON
}
```

**Raspuns** (200):
```json
{
  "success": true,
  "preferences": { "theme": "dark" }
}
```

---

## Roluri

**Sursa**: `src/app/api/rbac/roles/route.ts`

### GET /api/rbac/roles

Lista tuturor rolurilor cu permisiuni, utilizatori si grupuri asociate.

**Autentificare**: Sesiune NextAuth (orice utilizator autentificat)

**Raspuns** (200):
```json
[
  {
    "id": "role1",
    "name": "Administrator",
    "description": "Acces complet la aplicatie",
    "color": "#EF4444",
    "isSystem": true,
    "permissions": [
      {
        "permission": {
          "id": "perm1",
          "code": "orders.view",
          "name": "Vizualizare comenzi",
          "category": "orders"
        }
      }
    ],
    "users": [
      { "user": { "id": "u1", "name": "Ion", "email": "ion@firma.ro", "image": null } }
    ],
    "groups": [
      { "group": { "id": "g1", "name": "Management" } }
    ],
    "_count": { "users": 3, "groups": 1 }
  }
]
```

### POST /api/rbac/roles

Creeaza un rol nou.

**Permisiuni**: `admin.roles` sau SuperAdmin

**Body**:
```typescript
{
  name: string;               // Obligatoriu, unic
  description?: string;
  color?: string;             // Cod hex, ex: "#3B82F6"
  permissionIds?: string[];   // Lista ID-uri permisiuni
}
```

**Raspuns** (200): Rolul creat cu permisiuni si count.

### PUT /api/rbac/roles

Actualizeaza un rol existent. Rolurile de sistem (`isSystem: true`) nu pot fi redenumite.

**Permisiuni**: `admin.roles` sau SuperAdmin

**Body**:
```typescript
{
  id: string;                 // Obligatoriu
  name?: string;
  description?: string;
  color?: string;
  permissionIds?: string[];   // Inlocuieste toate permisiunile existente
}
```

**Erori**:
| Status | Mesaj |
|--------|-------|
| 400 | `Nu poti schimba numele unui rol de sistem` |
| 404 | `Rolul nu a fost gasit` |

### DELETE /api/rbac/roles?id={roleId}

Sterge un rol. Nu se poate sterge un rol de sistem sau un rol care are utilizatori/grupuri asignate.

**Permisiuni**: `admin.roles` sau SuperAdmin

**Erori**:
| Status | Mesaj |
|--------|-------|
| 400 | `Nu poti sterge un rol de sistem` |
| 400 | `Nu poti sterge un rol care are utilizatori sau grupuri asignate` |

---

## Grupuri

**Sursa**: `src/app/api/rbac/groups/route.ts`

### GET /api/rbac/groups

Lista tuturor grupurilor cu membri si roluri.

**Autentificare**: Sesiune NextAuth

**Raspuns** (200):
```json
[
  {
    "id": "grp1",
    "name": "Depozit",
    "description": "Echipa depozit",
    "color": "#10B981",
    "members": [
      { "user": { "id": "u1", "name": "Ion", "email": "ion@firma.ro", "image": null } }
    ],
    "roles": [
      { "role": { "id": "r1", "name": "Operator", "color": "#3B82F6" } }
    ],
    "_count": { "members": 5, "roles": 2 }
  }
]
```

### POST /api/rbac/groups

Creeaza un grup nou.

**Permisiuni**: `admin.groups` sau SuperAdmin

**Body**:
```typescript
{
  name: string;             // Obligatoriu, unic
  description?: string;
  color?: string;
  roleIds?: string[];       // Roluri de asignat grupului
  memberIds?: string[];     // Utilizatori de adaugat in grup
}
```

### PUT /api/rbac/groups

Actualizeaza un grup (nume, culoare, roluri, membri).

**Permisiuni**: `admin.groups` sau SuperAdmin

**Body**:
```typescript
{
  id: string;               // Obligatoriu
  name?: string;
  description?: string;
  color?: string;
  roleIds?: string[];       // Inlocuieste toate rolurile
  memberIds?: string[];     // Inlocuieste toti membrii
}
```

### DELETE /api/rbac/groups?id={groupId}

Sterge un grup. Membrii si rolurile se sterg automat (cascade).

**Permisiuni**: `admin.groups` sau SuperAdmin

---

## Permisiuni

**Sursa**: `src/app/api/rbac/permissions/route.ts`

### GET /api/rbac/permissions

Lista tuturor permisiunilor din sistem, grupate pe categorii.

**Permisiuni**: `admin.permissions` sau SuperAdmin

**Raspuns** (200):
```json
{
  "permissions": [
    {
      "id": "perm1",
      "code": "orders.view",
      "name": "Vizualizare comenzi",
      "description": "Permite vizualizarea listei de comenzi",
      "category": "orders",
      "sortOrder": 10
    }
  ],
  "categories": {
    "orders": "Comenzi",
    "products": "Produse",
    "settings": "Setari"
  }
}
```

**Nota**: Daca nu exista permisiuni in baza de date, se face seed automat si se returneaza `seeded: true`.

### POST /api/rbac/permissions

Seed manual al permisiunilor si rolurilor implicite.

**Permisiuni**: Doar SuperAdmin

**Raspuns** (200):
```json
{
  "success": true,
  "message": "Permisiuni si roluri seed-uite cu succes"
}
```

---

## Utilizatori RBAC

**Sursa**: `src/app/api/rbac/users/route.ts`

### GET /api/rbac/users

Lista utilizatorilor cu roluri, grupuri si acces la magazine.

**Permisiuni**: `users.view` sau SuperAdmin

**Query params**:
| Parametru | Tip | Descriere |
|-----------|-----|-----------|
| `search` | string | Cautare in nume si email |
| `roleId` | string | Filtru dupa rol |
| `groupId` | string | Filtru dupa grup |
| `includeInactive` | "true" | Include utilizatori dezactivati |

**Raspuns** (200): Array de utilizatori cu roluri, grupuri, storeAccess.

### PUT /api/rbac/users

Actualizeaza un utilizator: roluri, grupuri, acces magazine, status activ, promovare SuperAdmin.

**Body**:
```typescript
{
  userId: string;                // Obligatoriu
  action?: "updateRoles" | "updateGroups" | "updateStoreAccess";
  roleIds?: string[];           // Permisiune: users.roles
  groupIds?: string[];          // Permisiune: users.groups
  storeIds?: string[];          // Permisiune: doar SuperAdmin
  isActive?: boolean;           // Permisiune: users.deactivate
  isSuperAdmin?: boolean;       // Permisiune: doar SuperAdmin
}
```

**Reguli**:
- Nu poti modifica un SuperAdmin daca nu esti SuperAdmin
- Nu te poti dezactiva pe tine insuti
- Nu te poti retrograda de la SuperAdmin pe tine insuti

### POST /api/rbac/users

Obtine permisiunile utilizatorului curent.

**Body**:
```typescript
{ action: "getMyPermissions" }
```

**Raspuns** (200):
```json
{
  "permissions": ["orders.view", "orders.edit", "products.view"],
  "isSuperAdmin": false
}
```

---

## Invitatii

**Sursa**: `src/app/api/rbac/invitations/`

### GET /api/rbac/invitations

Lista tuturor invitatiilor cu detalii despre roluri, grupuri si magazine.

**Permisiuni**: `users.invite` sau SuperAdmin

**Raspuns** (200): Array de invitatii cu `isExpired`, `isAccepted`, roluri, grupuri, magazine.

### POST /api/rbac/invitations

Creeaza o invitatie noua. Genereaza un link unic de invitare.

**Permisiuni**: `users.invite` sau SuperAdmin

**Body**:
```typescript
{
  email: string;              // Obligatoriu
  roleIds?: string[];
  groupIds?: string[];
  storeIds?: string[];
  expiresInDays?: number;     // Default: 7
}
```

**Raspuns** (200):
```json
{
  "invitation": { "id": "inv1", "email": "nou@firma.ro", "token": "abc123..." },
  "inviteUrl": "https://app.firma.ro/invite/abc123...",
  "message": "Invitatie creata. Trimite acest link: ..."
}
```

**Erori**:
| Status | Mesaj |
|--------|-------|
| 400 | `Un utilizator cu acest email exista deja` |
| 400 | `Exista deja o invitatie activa pentru acest email` |

### DELETE /api/rbac/invitations?id={invitationId}

Anuleaza o invitatie (doar daca nu a fost acceptata).

**Permisiuni**: `users.invite` sau SuperAdmin

### GET /api/rbac/invitations/accept?token={token}

Obtine detaliile unei invitatii (fara autentificare - pagina publica de acceptare).

**Raspuns** (200):
```json
{
  "id": "inv1",
  "email": "nou@firma.ro",
  "roles": [{ "id": "r1", "name": "Operator", "color": "#3B82F6" }],
  "groups": [],
  "stores": [{ "id": "s1", "name": "Magazin Principal" }],
  "invitedBy": { "name": "Admin", "email": "admin@firma.ro" },
  "expiresAt": "2025-02-22T10:00:00.000Z",
  "isExpired": false,
  "isAccepted": false
}
```

### POST /api/rbac/invitations/accept

Accepta o invitatie. Utilizatorul trebuie sa fie autentificat cu email-ul din invitatie.

**Autentificare**: Sesiune NextAuth

**Body**:
```typescript
{ token: string }
```

**Actiuni**: Asigneaza roluri, adauga in grupuri, seteaza acces la magazine.

**Erori**:
| Status | Mesaj |
|--------|-------|
| 400 | `Invitatia a fost deja acceptata` |
| 400 | `Invitatia a expirat` |
| 400 | `Email-ul nu corespunde` |

---

## Audit Log

**Sursa**: `src/app/api/rbac/audit/route.ts`

### GET /api/rbac/audit

Lista audit logs cu paginare si filtre.

**Permisiuni**: `admin.audit` sau SuperAdmin

**Query params**:
| Parametru | Tip | Default | Descriere |
|-----------|-----|---------|-----------|
| `page` | number | 1 | Pagina curenta |
| `limit` | number | 50 | Rezultate per pagina |
| `userId` | string | - | Filtru dupa utilizator |
| `entityType` | string | - | Ex: "Role", "Group", "User" |
| `action` | string | - | Cautare in actiune (contains) |
| `from` | ISO date | - | Data start |
| `to` | ISO date | - | Data sfarsit |

**Raspuns** (200):
```json
{
  "logs": [
    {
      "id": "log1",
      "userId": "u1",
      "action": "role.create",
      "entityType": "Role",
      "entityId": "r1",
      "oldValue": null,
      "newValue": { "name": "Operator" },
      "createdAt": "2025-02-18T10:00:00.000Z",
      "user": { "id": "u1", "name": "Admin", "email": "admin@firma.ro", "image": null }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "totalPages": 3
  }
}
```

### POST /api/rbac/audit

Obtine statistici audit pe ultimele 30 de zile.

**Permisiuni**: `admin.audit` sau SuperAdmin

**Body**:
```typescript
{ action: "getStats" }
```

**Raspuns** (200):
```json
{
  "actionStats": [
    { "action": "order.process", "_count": { "id": 450 } }
  ],
  "entityStats": [
    { "entityType": "Order", "_count": { "id": 1200 } }
  ],
  "userStats": [
    { "userId": "u1", "_count": { "id": 300 }, "user": { "id": "u1", "name": "Admin" } }
  ]
}
```
