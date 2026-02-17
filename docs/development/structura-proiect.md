# Structura Proiectului

Proiectul ERP CashFlowSync este o aplicație Next.js 14 cu App Router, Prisma ORM și PostgreSQL.

## Directoare principale

```
erp-cashflowsync/
├── prisma/                    # Schema și migrații baza de date
├── public/                    # Fișiere statice (favicon, etc.)
├── scripts/                   # Scripturi de deployment și utilități
├── src/                       # Codul sursă principal
│   ├── app/                   # Next.js App Router (pagini și API)
│   ├── components/            # Componente React reutilizabile
│   ├── hooks/                 # React hooks custom
│   ├── lib/                   # Servicii, utilitare, logica de business
│   ├── middleware.ts          # Middleware NextAuth (protecție rute)
│   ├── test/                  # Setup și utilități pentru teste
│   ├── tests/                 # Teste unitare
│   └── types/                 # Tipuri TypeScript custom
├── docs/                      # Documentație internă
├── .planning/                 # Note de planificare și debug
├── next.config.js             # Configurare Next.js
├── tailwind.config.ts         # Configurare Tailwind CSS
├── tsconfig.json              # Configurare TypeScript
├── vitest.config.ts           # Configurare Vitest (teste)
├── package.json               # Dependențe și scripturi
└── railway.toml               # Configurare deployment Railway
```

## `src/app/` - App Router

Next.js App Router folosește structura de directoare pentru a defini rutele.

### Pagini (Dashboard)

Toate paginile din dashboard sunt grupate în `src/app/(dashboard)/` - parantezele indică un **route group** (nu apare în URL).

```
src/app/(dashboard)/
├── layout.tsx                 # Layout-ul comun (Sidebar + RouteGuard)
├── dashboard/page.tsx         # /dashboard - Dashboard principal
├── orders/page.tsx            # /orders - Lista comenzilor
├── customers/page.tsx         # /customers - Lista clienților
├── products/                  # /products - Produse și categorii
├── inventory/                 # /inventory - Stocuri, transferuri, recepții
├── invoices/                  # /invoices - Facturi
├── tracking/                  # /tracking - AWB-uri
├── picking/                   # /picking - Liste picking
├── handover/                  # /handover - Predare curier
├── returns/                   # /returns - Scanare retururi
├── trendyol/                  # /trendyol - Marketplace Trendyol
├── temu/                      # /temu - Marketplace Temu
├── ads/                       # /ads - Campanii advertising
├── intercompany/              # /intercompany - Decontări intercompany
├── reports/                   # /reports - Rapoarte
├── settings/                  # /settings - Setări sistem
├── tasks/                     # /tasks - Task management
├── stores/                    # /stores - Magazine
├── sync-history/              # /sync-history - Istoric sincronizare
├── activity/                  # /activity - Log activitate
├── processing-errors/         # /processing-errors - Erori procesare
├── docs/                      # /docs - Documentație internă
├── admin/                     # /admin - Pagini admin (repair-invoices)
├── profile/                   # /profile - Profil utilizator
├── preferences/               # /preferences - Preferințe
└── notifications/             # /notifications - Notificări
```

### Rute API

```
src/app/api/
├── auth/                      # NextAuth.js endpoints
├── orders/                    # CRUD comenzi, procesare, export
│   ├── route.ts               # GET /api/orders - listare
│   ├── [id]/route.ts          # GET/PUT /api/orders/:id
│   ├── process/route.ts       # POST - procesare (factura + AWB)
│   ├── process-all/route.ts   # POST - procesare batch
│   └── export/route.ts        # GET - export Excel
├── customers/                 # CRUD clienți
├── products/                  # CRUD produse
├── invoices/                  # Facturi - emitere, anulare, download
├── awb/                       # Generare și tracking AWB
├── picking/                   # Liste picking
├── handover/                  # Predare curier
├── inventory/                 # Gestiune stoc
├── inventory-items/           # Articole inventar
├── stock/                     # Operații stoc
├── transfers/                 # Transferuri între depozite
├── goods-receipts/            # Recepții marfă (NIR)
├── purchase-orders/           # Comenzi de achiziție
├── supplier-invoices/         # Facturi furnizori
├── warehouses/                # CRUD depozite
├── trendyol/                  # Integrare Trendyol
├── temu/                      # Integrare Temu
├── sync/                      # Sincronizare Shopify
├── intercompany/              # Decontări intercompany
├── ads/                       # Advertising (Meta, TikTok)
├── cron/                      # Job-uri programate
│   ├── sync-orders/           # Sincronizare automată comenzi
│   ├── sync-awb/              # Actualizare status AWB
│   ├── ads-sync/              # Sincronizare date ads
│   ├── ads-alerts/            # Verificare alerte ads
│   ├── handover-finalize/     # Finalizare predare automată
│   ├── trendyol-sync/         # Sincronizare Trendyol
│   ├── intercompany-settlement/ # Decontări automate
│   ├── ai-analysis/           # Analiză AI periodică
│   └── backup/                # Backup automat
├── rbac/                      # Roluri, permisiuni, invitații
├── settings/                  # Setări sistem
├── companies/                 # Gestiune firme
├── stores/                    # Magazine Shopify
├── categories/                # Categorii produse
├── stats/                     # Statistici dashboard
├── reports/                   # Generare rapoarte
├── manifests/                 # Manifeste curier
├── notifications/             # Notificări
├── tasks/                     # Task management
├── activity/                  # Log activitate
├── upload/                    # Upload fișiere
├── health/                    # Health check
├── debug/                     # Endpoint-uri debug
├── pin/                       # Verificare PIN securitate
├── printers/                  # Configurare imprimante
├── print-jobs/                # Job-uri printare
├── print-client/              # Client printare
├── webhooks/                  # Webhook-uri externe
├── admin/                     # Administrare (repair-invoices, daktela-sync)
├── drive-image/               # Imagini Google Drive
├── invoice-series/            # Serii facturare
├── order-statuses/            # Statusuri comenzi custom
├── returns/                   # Gestionare retururi
├── reception-reports/         # Rapoarte recepție
├── suppliers/                 # Furnizori
├── channels/                  # Canale vânzare
├── backup/                    # Backup/restore
└── user/                      # Profil utilizator
```

### Alte rute la nivel de `src/app/`

```
src/app/
├── layout.tsx                 # Root layout (providers, fonts, toaster)
├── page.tsx                   # / - pagina principală (redirect la login/dashboard)
├── globals.css                # Stiluri globale (Tailwind + variabile CSS)
├── providers.tsx              # Providers (SessionProvider, QueryClientProvider, ThemeProvider)
├── login/page.tsx             # /login - pagina de autentificare
├── signup/page.tsx            # /signup - înregistrare
├── invite/page.tsx            # /invite/:token - acceptare invitație
├── 403/page.tsx               # /403 - access denied
├── privacy-policy/            # Politica de confidențialitate
├── terms-of-service/          # Termeni și condiții
└── customers/                 # /customers/embed - pagină embed (fără auth)
```

## `src/lib/` - Servicii și utilități

Layer-ul de business logic, separat de rutele API.

```
src/lib/
├── auth.ts                    # Configurare NextAuth.js (providers, callbacks)
├── db.ts                      # Instanță Prisma singleton
├── permissions.ts             # Sistem RBAC (permisiuni, roluri, helper-e)
├── utils.ts                   # Utilități generale (cn, formatCurrency, formatDate)
├── validators.ts              # Validare date (telefon, adresă)
│
├── invoice-service.ts         # Emitere facturi (Oblio API)
├── invoice-helpers.ts         # Funcții helper facturare
├── invoice-errors.ts          # Mapare erori facturare
├── invoice-series.ts          # Gestiune serii facturare
├── oblio.ts                   # Client API Oblio.eu
│
├── shopify.ts                 # Client API Shopify
├── sync-service.ts            # Sincronizare comenzi Shopify
│
├── fancourier.ts              # Client API FanCourier
├── awb-service.ts             # Serviciu generare AWB
├── awb-status.ts              # Mapare statusuri AWB
├── fancourier-statuses.ts     # Statusuri FanCourier
│
├── trendyol.ts                # Client API Trendyol
├── trendyol-order-sync.ts     # Sincronizare comenzi Trendyol
├── trendyol-stock-sync.ts     # Sincronizare stoc Trendyol
├── trendyol-invoice.ts        # Facturi Trendyol
├── trendyol-awb.ts            # AWB Trendyol
├── trendyol-returns.ts        # Retururi Trendyol
├── trendyol-status.ts         # Statusuri Trendyol
├── trendyol-batch-status.ts   # Status batch operații
├── trendyol-category-ai.ts    # Mapare categorii cu AI
├── trendyol-courier-map.ts    # Mapare curieri
│
├── temu.ts                    # Client API Temu
├── temu-order-sync.ts         # Sincronizare comenzi Temu
├── temu-awb.ts                # AWB Temu
├── temu-status.ts             # Statusuri Temu
├── temu-stock-sync.ts         # Sincronizare stoc Temu
│
├── meta-ads.ts                # Integrare Meta Ads
├── tiktok-ads.ts              # Integrare TikTok Ads
├── ads-config.ts              # Configurare ads din DB
├── ads-oauth-state.ts         # OAuth state management ads
│
├── ai.ts                      # Integrare Anthropic Claude (analiză AI)
├── anaf.ts                    # Verificare ANAF (CIF)
├── daktela.ts                 # Integrare Daktela (call center)
├── google-drive.ts            # Integrare Google Drive
│
├── intercompany-service.ts    # Decontări intercompany
├── handover.ts                # Logica predare curier
├── returns.ts                 # Gestionare retururi
├── picking (manual)           # (referință externă)
│
├── inventory-stock.ts         # Calcul stoc
├── stock.ts                   # Operații stoc
├── stock-transfer-service.ts  # Transferuri între depozite
├── reception-workflow.ts      # Flux recepție marfă
│
├── excel.ts                   # Export Excel
├── notification-service.ts    # Trimitere notificări
├── activity-log.ts            # Logare activitate
├── cron-lock.ts               # Lock distribuit pentru cron jobs
├── pin-service.ts             # Verificare PIN securitate
├── document-numbering.ts      # Numerotare documente
├── task-utils.ts              # Utilități task management
│
├── embed-auth.ts              # Autentificare token embed
├── design-system.ts           # Constante design system
├── empty-states.ts            # Configurare empty states UI
├── error-messages.ts          # Mesaje de eroare standard
│
└── manifest/                  # Rapoarte și manifeste
    ├── delivery-manifest.ts   # Borderou livrări
    ├── return-manifest.ts     # Manifest retururi
    ├── bulk-stornare.ts       # Stornare în masă
    └── stuck-shipments.ts     # Colete blocate
```

## `src/components/` - Componente React

```
src/components/
├── ui/                        # Componente UI de bază (shadcn/ui)
│   ├── button.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   ├── input.tsx
│   ├── select.tsx
│   ├── table.tsx
│   ├── badge.tsx
│   ├── toast.tsx
│   ├── page-header.tsx
│   ├── empty-state.tsx
│   ├── skeleton.tsx
│   └── ...                    # Alte componente Radix UI
│
├── sidebar.tsx                # Sidebar-ul principal cu navigație
├── user-menu.tsx              # Meniu utilizator (dropdown)
├── auth-provider.tsx          # Provider NextAuth
├── auto-sync.tsx              # Auto-sync provider
├── route-guard.tsx            # Guard permisiuni pe rute
├── session-monitor.tsx        # Monitor expirare sesiune
├── global-loading.tsx         # Loading screen global
├── ai-insights.tsx            # Componenta AI insights
├── bulk-publish-progress.tsx  # Progress publicare batch
│
├── orders/                    # Componente specifice comenzilor
├── invoice/                   # Componente facturare
├── customers/                 # Componente clienți
├── inventory/                 # Componente inventar
├── manifest/                  # Componente manifeste
├── ads/                       # Componente advertising
├── settings/                  # Componente setări
├── tasks/                     # Componente task management
├── pin/                       # Componente PIN securitate
├── docs/                      # Componente documentație
├── layout/                    # Componente layout (NotificationBell)
└── onboarding/                # Componente onboarding
```

## `src/hooks/` - React Hooks

```
src/hooks/
├── use-permissions.tsx        # Hook + Provider permisiuni RBAC
├── use-toast.ts               # Hook notificări toast
├── use-display.tsx            # Hook preferințe display
├── use-auto-sync.ts           # Hook sincronizare automată
└── use-error-modal.tsx        # Hook modal erori detaliate
```

## `prisma/` - Baza de date

```
prisma/
├── schema.prisma              # Schema completă a bazei de date
├── migrations/                # Migrații Prisma (versionare schema)
│   ├── 20260216_add_order_notes/
│   ├── 20260216_allow_multiple_invoices_per_order/
│   ├── 20260217_add_repair_invoices/
│   └── ...
├── manual-migrations/         # Migrații SQL manuale
└── seed.ts                    # Script populare date inițiale
```

## `scripts/` - Scripturi

```
scripts/
├── deploy-start.sh            # Script pornire deployment (migrații + start)
├── force-migration.js         # Forțare rulare migrații (prestart hook)
├── run-migration.js           # Rulare migrații standard
├── backfill-postal-codes.ts   # Backfill coduri poștale
├── compare-schemas.ts         # Comparare scheme DB
├── migrate-to-warehouse.ts    # Migrare date depozite
└── generate-test-plan-excel.js # Generare plan testare Excel
```

## Fișiere de configurare

| Fișier | Scop |
|--------|------|
| `package.json` | Dependențe, scripturi npm |
| `next.config.js` | Configurare Next.js (imagini remote, CSP headers, embed) |
| `tsconfig.json` | Configurare TypeScript (`@/*` alias pentru `./src/*`) |
| `tailwind.config.ts` | Configurare Tailwind CSS (teme, culori, animații) |
| `vitest.config.ts` | Configurare teste Vitest |
| `postcss.config.js` | Configurare PostCSS (Tailwind + Autoprefixer) |
| `railway.toml` | Configurare deployment Railway |
| `.gitignore` | Fișiere ignorate de Git |

## Alias-uri TypeScript

Configurat în `tsconfig.json`:

```json
{
  "paths": {
    "@/*": ["./src/*"]
  }
}
```

Exemple de utilizare:
- `import prisma from "@/lib/db"` - importă din `src/lib/db.ts`
- `import { Button } from "@/components/ui/button"` - importă componenta Button
- `import { hasPermission } from "@/lib/permissions"` - importă helper permisiuni
