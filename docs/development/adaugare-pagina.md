# Ghid: Adăugarea unei Pagini Noi

Acest ghid descrie pas cu pas cum se adaugă o pagină nouă în dashboard-ul aplicației.

## Structura fișierelor

Paginile din dashboard se află în `src/app/(dashboard)/`. Parantezele indică un **route group** - nu apar în URL, dar aplică un layout comun (sidebar + verificare permisiuni).

```
src/app/(dashboard)/
├── layout.tsx          # Layout comun: Sidebar, PermissionsProvider, RouteGuard
├── pagina-noua/
│   └── page.tsx        # /pagina-noua
```

## Pași de implementare

### 1. Creează directorul și fișierul

```bash
mkdir -p src/app/\(dashboard\)/pagina-noua
touch src/app/\(dashboard\)/pagina-noua/page.tsx
```

### 2. Implementează componenta paginii

#### Template complet

```typescript
// src/app/(dashboard)/pagina-noua/page.tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { RequirePermission, usePermissions } from "@/hooks/use-permissions";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonTableRow } from "@/components/ui/skeleton";

// Tipuri
interface Item {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
}

export default function PaginaNouaPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // ─── FETCH DATE ───────────────────────────────
  const { data, isLoading, error } = useQuery({
    queryKey: ["pagina-noua", { search, page }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      if (search) params.set("search", search);

      const res = await fetch(`/api/pagina-noua?${params}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Eroare la încărcare");
      }
      return res.json();
    },
  });

  // ─── MUTAȚIE CREARE ───────────────────────────
  const createMutation = useMutation({
    mutationFn: async (formData: { name: string; description?: string }) => {
      const res = await fetch("/api/pagina-noua", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Eroare la creare");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pagina-noua"] });
      toast({ title: "Succes", description: "Element creat cu succes" });
      setShowCreateDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Eroare",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // ─── RENDER ───────────────────────────────────

  return (
    <>
      {/* Header pagină */}
      <PageHeader
        title="Pagina Nouă"
        description="Descrierea paginii și a funcționalității"
      />

      {/* Toolbar: search + acțiuni */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Caută..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-10"
          />
        </div>

        <RequirePermission permission="resursa.create">
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Adaugă
          </Button>
        </RequirePermission>
      </div>

      {/* Conținut principal */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            // Loading skeleton
            <div className="p-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonTableRow key={i} />
              ))}
            </div>
          ) : !data?.items?.length ? (
            // Empty state
            <EmptyState
              icon="FileText"
              title="Nu există elemente"
              description="Adaugă primul element folosind butonul de mai sus."
            />
          ) : (
            // Tabel cu date
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 text-sm font-medium">Nume</th>
                  <th className="text-left p-3 text-sm font-medium">Descriere</th>
                  <th className="text-left p-3 text-sm font-medium">Data</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item: Item) => (
                  <tr key={item.id} className="border-b hover:bg-muted/30">
                    <td className="p-3 text-sm font-medium">{item.name}</td>
                    <td className="p-3 text-sm text-muted-foreground">
                      {item.description || "-"}
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">
                      {new Date(item.createdAt).toLocaleDateString("ro-RO")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Paginare */}
      {data?.pagination && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            Pagina {data.pagination.page} din {data.pagination.totalPages}
            {" "}({data.pagination.total} total)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.pagination.totalPages}
              onClick={() => setPage(page + 1)}
            >
              Următor
            </Button>
          </div>
        </div>
      )}

      {/* Dialog creare (exemplu) */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adaugă element nou</DialogTitle>
          </DialogHeader>
          {/* Formular creare */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              createMutation.mutate({
                name: formData.get("name") as string,
                description: formData.get("description") as string,
              });
            }}
          >
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Nume</label>
                <Input name="name" required placeholder="Nume element" />
              </div>
              <div>
                <label className="text-sm font-medium">Descriere</label>
                <Input name="description" placeholder="Descriere (opțional)" />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
              >
                Anulează
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Creează
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

### 3. Adaugă pagina în sidebar

Editează `src/components/sidebar.tsx` - adaugă un item în array-ul `navigation`:

```typescript
// Găsește secțiunea potrivită sau creează una nouă
const navigation: NavItem[] = [
  // ...secțiunile existente...
  {
    name: "Secțiunea",
    icon: FileText,
    permissions: ["resursa.view"],
    children: [
      // Adaugă aici:
      {
        name: "Pagina Nouă",
        href: "/pagina-noua",
        icon: FileText,
        permissions: ["resursa.view"],
      },
    ],
  },
];
```

Proprietăți NavItem:
- `name` - textul afișat în sidebar
- `href` - URL-ul paginii (fără prefix `/dashboard`)
- `icon` - iconă din lucide-react
- `permissions` - array de permisiuni necesare (OR logic - oricare e suficientă)

### 4. Adaugă protecția rutei în middleware

Editează `src/middleware.ts` pentru a proteja noua rută:

```typescript
export const config = {
  matcher: [
    // ...rutele existente...
    "/pagina-noua/:path*",  // Adaugă aici
  ],
};
```

### 5. Adaugă maparea rută-permisiuni (opțional)

Dacă folosești `RouteGuard` pentru verificare automată a permisiunilor pe rută, adaugă în `src/hooks/use-permissions.tsx`:

```typescript
export const ROUTE_PERMISSIONS: Record<string, string[]> = {
  // ...rutele existente...
  "/pagina-noua": ["resursa.view"],
};
```

## Layout-ul Dashboard

Layout-ul din `src/app/(dashboard)/layout.tsx` aplică automat:

```typescript
<PermissionsProvider>      {/* Încarcă permisiunile utilizatorului */}
  <DisplayProvider>         {/* Preferințe display */}
    <AutoSyncProvider>      {/* Sincronizare automată la 5 minute */}
      <Sidebar />           {/* Sidebar-ul cu navigație */}
      <RouteGuard>          {/* Verificare permisiuni pe rută */}
        {children}          {/* Pagina ta */}
      </RouteGuard>
    </AutoSyncProvider>
  </DisplayProvider>
</PermissionsProvider>
```

Nu trebuie să reimportezi acești provideri în pagina ta.

## Sub-pagini

Pentru sub-pagini, creează directoare imbricate:

```
src/app/(dashboard)/pagina-noua/
├── page.tsx                    # /pagina-noua
├── [id]/
│   └── page.tsx                # /pagina-noua/:id (detaliu)
└── sub-sectiune/
    └── page.tsx                # /pagina-noua/sub-sectiune
```

## Componente reutilizabile disponibile

| Componentă | Import | Scop |
|------------|--------|------|
| `PageHeader` | `@/components/ui/page-header` | Header standardizat cu titlu și descriere |
| `EmptyState` | `@/components/ui/empty-state` | Afișare când nu există date |
| `SkeletonTableRow` | `@/components/ui/skeleton` | Loading placeholder |
| `RequirePermission` | `@/hooks/use-permissions` | Afișare condiționată pe baza permisiunilor |
| `Card` / `CardContent` | `@/components/ui/card` | Container de conținut |
| `Button` | `@/components/ui/button` | Buton standardizat |
| `Dialog` | `@/components/ui/dialog` | Modal dialog |
| `Input` | `@/components/ui/input` | Câmp de text |
| `Select` | `@/components/ui/select` | Dropdown select |
| `Badge` | `@/components/ui/badge` | Etichetă colorată |
| `Tabs` | `@/components/ui/tabs` | Tab-uri de navigare |
| `toast` | `@/hooks/use-toast` | Notificări toast |
| `ActionTooltip` | `@/components/ui/action-tooltip` | Tooltip pe acțiuni |

## Hooks disponibile

| Hook | Import | Scop |
|------|--------|------|
| `usePermissions()` | `@/hooks/use-permissions` | Verificare permisiuni client-side |
| `useToast()` | `@/hooks/use-toast` | Afișare notificări toast |
| `useErrorModal()` | `@/hooks/use-error-modal` | Modal cu detalii erori |

## Checklist

- [ ] Directorul și `page.tsx` create în `src/app/(dashboard)/`
- [ ] Directiva `"use client"` pe prima linie
- [ ] `PageHeader` cu titlu descriptiv
- [ ] React Query pentru fetch date (`useQuery`)
- [ ] Mutații cu `useMutation` + invalidare cache
- [ ] Loading state cu `SkeletonTableRow`
- [ ] Empty state cu `EmptyState`
- [ ] Paginare (dacă listarea poate avea multe elemente)
- [ ] Permisiuni verificate cu `RequirePermission`
- [ ] Ruta adăugată în sidebar (`src/components/sidebar.tsx`)
- [ ] Ruta protejată în middleware (`src/middleware.ts`)
- [ ] Mapare rută-permisiuni adăugată (opțional, în `use-permissions.tsx`)
- [ ] Toast notifications pentru feedback
