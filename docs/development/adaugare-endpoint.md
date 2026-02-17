# Ghid: Adăugarea unui Endpoint API Nou

Acest ghid descrie pas cu pas cum se adaugă un nou endpoint API în proiect.

## Structura fișierelor

Next.js App Router folosește structura de directoare pentru rutare. Fiecare fișier `route.ts` definește handlere HTTP.

```
src/app/api/
├── resursa/
│   ├── route.ts            # GET /api/resursa (listare), POST /api/resursa (creare)
│   └── [id]/
│       └── route.ts        # GET /api/resursa/:id, PUT /api/resursa/:id, DELETE /api/resursa/:id
```

## Pași de implementare

### 1. Creează directorul și fișierul

```bash
mkdir -p src/app/api/resursa-noua
touch src/app/api/resursa-noua/route.ts
```

Pentru rute cu parametri dinamici:

```bash
mkdir -p src/app/api/resursa-noua/[id]
touch src/app/api/resursa-noua/[id]/route.ts
```

### 2. Implementează handler-ul

#### GET - Listare cu paginare

```typescript
// src/app/api/resursa-noua/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

export async function GET(request: NextRequest) {
  try {
    // Verificare autentificare
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Trebuie să fii autentificat" },
        { status: 401 }
      );
    }

    // Verificare permisiuni
    const canView = await hasPermission(session.user.id, "resursa.view");
    if (!canView) {
      return NextResponse.json(
        { error: "Nu ai permisiunea de a vizualiza această resursă" },
        { status: 403 }
      );
    }

    // Extragere parametri query
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const search = searchParams.get("search");
    const skip = (page - 1) * limit;

    // Construire filtru
    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    // Query paralel: count + date
    const [total, items] = await Promise.all([
      prisma.resursaNoua.count({ where }),
      prisma.resursaNoua.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          // Relații necesare
        },
      }),
    ]);

    return NextResponse.json({
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Error fetching resursa:", error);
    return NextResponse.json(
      {
        error: "Eroare la încărcarea datelor",
        details: error?.message || String(error),
        stack: process.env.NODE_ENV === "development" ? error?.stack : undefined,
      },
      { status: 500 }
    );
  }
}
```

#### POST - Creare

```typescript
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Trebuie să fii autentificat" },
        { status: 401 }
      );
    }

    const canCreate = await hasPermission(session.user.id, "resursa.create");
    if (!canCreate) {
      return NextResponse.json(
        { error: "Nu ai permisiunea de a crea această resursă" },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validare date
    if (!body.name || !body.name.trim()) {
      return NextResponse.json(
        { error: "Numele este obligatoriu" },
        { status: 400 }
      );
    }

    // Creare în baza de date
    const item = await prisma.resursaNoua.create({
      data: {
        name: body.name.trim(),
        description: body.description?.trim() || null,
        // ... alte câmpuri
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error: any) {
    console.error("Error creating resursa:", error);
    return NextResponse.json(
      {
        error: "Eroare la creare",
        details: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}
```

#### GET/PUT/DELETE cu parametru dinamic

```typescript
// src/app/api/resursa-noua/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const item = await prisma.resursaNoua.findUnique({
      where: { id: params.id },
      include: {
        // Relații necesare
      },
    });

    if (!item) {
      return NextResponse.json(
        { error: "Resursa nu a fost găsită" },
        { status: 404 }
      );
    }

    return NextResponse.json(item);
  } catch (error: any) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Eroare la încărcare", details: error?.message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canEdit = await hasPermission(session.user.id, "resursa.edit");
    if (!canEdit) {
      return NextResponse.json(
        { error: "Nu ai permisiunea de editare" },
        { status: 403 }
      );
    }

    const body = await request.json();

    const updated = await prisma.resursaNoua.update({
      where: { id: params.id },
      data: {
        name: body.name?.trim(),
        // ... alte câmpuri
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Error updating:", error);
    return NextResponse.json(
      { error: "Eroare la actualizare", details: error?.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canDelete = await hasPermission(session.user.id, "resursa.delete");
    if (!canDelete) {
      return NextResponse.json(
        { error: "Nu ai permisiunea de ștergere" },
        { status: 403 }
      );
    }

    await prisma.resursaNoua.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting:", error);
    return NextResponse.json(
      { error: "Eroare la ștergere", details: error?.message },
      { status: 500 }
    );
  }
}
```

### 3. Adaugă permisiunile (dacă e necesar)

Dacă endpoint-ul necesită permisiuni noi, adaugă-le în `src/lib/permissions.ts`:

```typescript
// În array-ul PERMISSIONS
{ code: "resursa.view", name: "Vizualizare resursa", description: "Poate vedea resursa", category: "resursa", sortOrder: 1500 },
{ code: "resursa.create", name: "Creare resursa", description: "Poate crea resursa", category: "resursa", sortOrder: 1501 },
{ code: "resursa.edit", name: "Editare resursa", description: "Poate edita resursa", category: "resursa", sortOrder: 1502 },
{ code: "resursa.delete", name: "Ștergere resursa", description: "Poate șterge resursa", category: "resursa", sortOrder: 1503 },
```

Adaugă și categoria în `PERMISSION_CATEGORIES`:

```typescript
{ code: "resursa", name: "Resursa Nouă", icon: "FileText" },
```

> Permisiunile noi vor fi create automat în baza de date la următoarea autentificare a unui SuperAdmin (funcția `setupSuperAdminRole()` din `src/lib/auth.ts`).

### 4. Adaugă modelul Prisma (dacă e necesar)

Dacă endpoint-ul operează pe un tabel nou, adaugă modelul în `prisma/schema.prisma`:

```prisma
model ResursaNoua {
  id          String   @id @default(cuid())
  name        String
  description String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

Apoi generează migrația:

```bash
npx prisma migrate dev --name add_resursa_noua
```

## Checklist

- [ ] Fișier `route.ts` creat în directorul corect
- [ ] Verificare autentificare (`getServerSession`)
- [ ] Verificare permisiuni (`hasPermission`)
- [ ] Validare date de intrare
- [ ] Tratare erori cu `try/catch`
- [ ] Mesaje de eroare în limba română
- [ ] Paginare implementată (pentru GET listare)
- [ ] Permisiuni adăugate în `permissions.ts` (dacă sunt noi)
- [ ] Model Prisma adăugat (dacă e necesar)
- [ ] Migrație generată (dacă e necesar)

## Exemple reale din proiect

| Endpoint | Fișier | Pattern |
|----------|--------|---------|
| GET /api/orders | `src/app/api/orders/route.ts` | Listare cu paginare, filtre multiple, search |
| POST /api/orders/process | `src/app/api/orders/process/route.ts` | Procesare batch (factură + AWB) |
| GET /api/orders/[id] | `src/app/api/orders/[id]/route.ts` | Detaliu cu relații |
| POST /api/awb/create | `src/app/api/awb/create/route.ts` | Creare cu serviciu extern |
| GET /api/cron/sync-orders | `src/app/api/cron/sync-orders/route.ts` | Cron job cu CRON_SECRET |
