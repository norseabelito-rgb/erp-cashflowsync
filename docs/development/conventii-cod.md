# Convenții de Cod

Acest document descrie convențiile și pattern-urile folosite în proiectul ERP CashFlowSync.

## Structura unui endpoint API (Route Handler)

Fiecare endpoint API urmează același pattern standard. Fișierul se numește `route.ts` și se află într-un director care reflectă URL-ul.

### Pattern standard

```typescript
// src/app/api/resursa/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

export async function GET(request: NextRequest) {
  try {
    // 1. Verificare autentificare
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Trebuie să fii autentificat" },
        { status: 401 }
      );
    }

    // 2. Verificare permisiuni
    const canView = await hasPermission(session.user.id, "resursa.view");
    if (!canView) {
      return NextResponse.json(
        { error: "Nu ai permisiunea necesară" },
        { status: 403 }
      );
    }

    // 3. Extragere parametri
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    // 4. Query Prisma
    const [total, items] = await Promise.all([
      prisma.resursa.count({ where }),
      prisma.resursa.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    // 5. Returnare răspuns
    return NextResponse.json({
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    // 6. Tratare erori
    console.error("Error:", error);
    return NextResponse.json(
      {
        error: "Mesaj de eroare pentru utilizator",
        details: error?.message || String(error),
        stack: process.env.NODE_ENV === "development" ? error?.stack : undefined,
      },
      { status: 500 }
    );
  }
}
```

Referință reală: `src/app/api/orders/route.ts`

### Convenții endpoint

- Fiecare endpoint este wrapat în `try/catch`
- Autentificarea se verifică **întotdeauna** prima
- Permisiunile se verifică imediat după autentificare
- Mesajele de eroare sunt în **limba română** pentru utilizator
- Stack trace-ul se trimite doar în `development`
- Se folosește `NextResponse.json()` pentru toate răspunsurile
- Coduri HTTP standard: 200, 201, 400, 401, 403, 404, 500

## Structura unei pagini (Client Component)

Paginile din dashboard sunt client components (`"use client"`) care folosesc React Query.

### Pattern standard

```typescript
// src/app/(dashboard)/resursa/page.tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { RequirePermission, usePermissions } from "@/hooks/use-permissions";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export default function ResursaPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();

  // 1. Fetch date cu React Query
  const { data, isLoading, error } = useQuery({
    queryKey: ["resursa", filtreActive],
    queryFn: async () => {
      const res = await fetch(`/api/resursa?${params}`);
      if (!res.ok) throw new Error("Eroare la încărcare");
      return res.json();
    },
  });

  // 2. Mutație (creare/editare/ștergere)
  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await fetch("/api/resursa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Eroare");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resursa"] });
      toast({ title: "Succes", description: "Operație reușită" });
    },
    onError: (error: Error) => {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    },
  });

  // 3. Render cu loading state și empty state
  if (isLoading) return <SkeletonTableRow />;
  if (!data?.items?.length) return <EmptyState />;

  return (
    <>
      <PageHeader title="Resursa" description="Descriere pagină" />
      <RequirePermission permission="resursa.create">
        <Button onClick={() => setShowDialog(true)}>Adaugă</Button>
      </RequirePermission>
      {/* ... conținut ... */}
    </>
  );
}
```

Referință reală: `src/app/(dashboard)/orders/page.tsx`

### Convenții pagini

- Directiva `"use client"` pe prima linie
- React Query pentru toate operațiile de date (`useQuery`, `useMutation`)
- `queryKey` descriptiv bazat pe resursă și filtre
- Invalidare cache după mutații cu `queryClient.invalidateQueries()`
- Toast notifications pentru feedback utilizator
- Loading states cu `SkeletonTableRow` sau similar
- Empty states cu componenta `EmptyState`
- Permisiuni verificate cu `RequirePermission` (component) sau `usePermissions` (hook)

## Stilizare

### Tailwind CSS + shadcn/ui

- Se folosește **Tailwind CSS** pentru toate stilurile
- Componentele UI de bază vin din **shadcn/ui** (`src/components/ui/`)
- Funcția `cn()` din `src/lib/utils.ts` combină clase Tailwind:

```typescript
import { cn } from "@/lib/utils";

<div className={cn(
  "flex items-center gap-2",
  isActive && "bg-primary text-white",
  className
)} />
```

- Iconele sunt din **lucide-react**
- Variabilele CSS pentru teme sunt definite în `globals.css`

### Responsive Design

- Mobile-first: `px-4 lg:px-6`
- Sidebar colapsabil pe mobile cu hamburger menu
- Tabele scrollabile orizontal pe mobile

## Pattern-uri Prisma

### Query cu include

```typescript
const order = await prisma.order.findUnique({
  where: { id },
  include: {
    store: { select: { id: true, name: true } },
    lineItems: true,
    invoices: { orderBy: { createdAt: "desc" }, take: 1 },
    awb: { select: { id: true, awbNumber: true, currentStatus: true } },
  },
});
```

### Query cu filtrare complexă

```typescript
const where: Prisma.OrderWhereInput = {};

if (search) {
  where.OR = [
    { shopifyOrderNumber: { contains: search, mode: "insensitive" } },
    { customerEmail: { contains: search, mode: "insensitive" } },
  ];
}

if (status && status !== "all") {
  where.status = status;
}
```

### Paginare standard

```typescript
const page = parseInt(searchParams.get("page") || "1");
const limit = parseInt(searchParams.get("limit") || "50");
const skip = (page - 1) * limit;

const [total, items] = await Promise.all([
  prisma.model.count({ where }),
  prisma.model.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" } }),
]);

return NextResponse.json({
  items,
  pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
});
```

### Instanța Prisma

Se importă din `@/lib/db`:

```typescript
import prisma from "@/lib/db";
```

Instanța este un singleton care previne crearea multiplă în development (hot reload).

## Autentificare și Autorizare

### Autentificare (NextAuth.js)

- Configurată în `src/lib/auth.ts`
- Providers: Google OAuth + Credentials (email/parolă)
- Strategie sesiune: **JWT**
- Middleware protejează rutele din dashboard (`src/middleware.ts`)

### Autorizare (RBAC)

- Permisiunile sunt definite în `src/lib/permissions.ts`
- Format: `categorie.acțiune` (ex: `orders.view`, `invoices.create`)
- **SuperAdmin** are acces la totul (`isSuperAdmin: true`)
- Verificare server-side: `hasPermission(userId, "code")`
- Verificare client-side: `usePermissions()` hook + `RequirePermission` component
- Sidebar-ul se filtrează automat pe baza permisiunilor

## Tratarea erorilor

### În API routes

```typescript
catch (error: any) {
  console.error("Descriere context:", error);
  return NextResponse.json(
    {
      error: "Mesaj pentru utilizator (în română)",
      details: error?.message || String(error),
      stack: process.env.NODE_ENV === "development" ? error?.stack : undefined,
    },
    { status: 500 }
  );
}
```

### În pagini (client)

```typescript
onError: (error: Error) => {
  toast({
    title: "Eroare",
    description: error.message,
    variant: "destructive",
  });
}
```

## Convenții de numire

### Fișiere

| Tip | Convenție | Exemplu |
|-----|-----------|---------|
| Pagini | `page.tsx` | `src/app/(dashboard)/orders/page.tsx` |
| API routes | `route.ts` | `src/app/api/orders/route.ts` |
| Componente | `kebab-case.tsx` | `src/components/orders/channel-tabs.tsx` |
| Servicii lib | `kebab-case.ts` | `src/lib/invoice-service.ts` |
| Hooks | `use-kebab-case.ts` | `src/hooks/use-permissions.tsx` |
| Tipuri | `kebab-case.ts` | `src/types/prisma-enums.ts` |

### Variabile și funcții

- **Funcții**: camelCase (`issueInvoiceForOrder`, `hasPermission`)
- **Componente React**: PascalCase (`PageHeader`, `RequirePermission`)
- **Constante**: UPPER_SNAKE_CASE (`PERMISSIONS`, `DEFAULT_ROLES`, `CRON_SECRET`)
- **Interfețe**: PascalCase (`ProcessingResult`, `OblioCredentials`)
- **Query keys**: array descriptiv (`["orders", { status, page }]`)

### Mesaje și texte

- Mesaje de eroare API: **în limba română** (ex: "Nu ai permisiunea necesară")
- Comentarii în cod: **în limba română** (ex: `// Verificăm autentificarea`)
- Nume variabile/funcții: **în limba engleză** (ex: `hasPermission`, `invoiceService`)

## Cron Jobs

Toate cron job-urile urmează acest pattern:

```typescript
// src/app/api/cron/job-name/route.ts
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ... logica cron job
}
```

- Autentificate cu `CRON_SECRET` din environment
- Header: `Authorization: Bearer <secret>`
- Returnează rezultate sumarizate

## Servicii externe

Credențialele pentru servicii externe (Oblio, FanCourier, Shopify, Trendyol) sunt stocate **în baza de date** (tabelele `Store`, `Company`), nu în variabile de mediu. Acest lucru permite configurarea per-magazin/firmă din interfața aplicației.

Excepții (variabile de mediu):
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - autentificare Google
- `CRON_SECRET` - autentificare cron jobs
- `DAKTELA_ACCESS_TOKEN` - integrare call center
- `EMBED_SECRET_TOKEN` - autentificare embed iframe
