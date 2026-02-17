# Prezentare Generala

## Despre Aplicatie

**ERP CashFlowSync** este un sistem centralizat de gestionare a comenzilor, facturilor, AWB-urilor si stocurilor, construit pentru grupul de firme Cash Flow Grup. Aplicatia integreaza multiple canale de vanzare (Shopify, Trendyol, Temu) cu servicii de facturare (Oblio), curierat (FanCourier), si publicitate (Meta Ads, TikTok Ads).

**URL Metadata:** `Cash Flow Grup | Dashboard` - "Sistem centralizat de gestionare comenzi si facturi"

## Stack Tehnologic

| Componenta | Tehnologie | Versiune |
|---|---|---|
| **Framework** | Next.js (App Router) | 14.1.3 |
| **Limbaj** | TypeScript | ^5.3.3 |
| **Runtime** | Node.js | ES2017 target |
| **ORM** | Prisma Client | ^5.10.2 |
| **Baza de date** | PostgreSQL | via `pg` driver |
| **Autentificare** | NextAuth.js | ^4.24.7 |
| **UI Components** | Radix UI + Tailwind CSS | ^3.4.1 |
| **State Management** | TanStack React Query | ^5.28.0 |
| **Tabele** | TanStack React Table | ^8.13.2 |
| **Validare** | Zod | ^3.22.4 |
| **Formulare** | React Hook Form | ^7.51.0 |
| **Grafice** | Recharts | ^2.12.0 |
| **Rich Text Editor** | TipTap | ^3.17.1 |
| **HTTP Client** | Axios | ^1.6.7 |
| **AI** | Anthropic SDK | ^0.30.1 |
| **Export Excel** | ExcelJS | ^4.4.0 |
| **PDF** | pdf-lib + PDFKit | ^1.17.1 / ^0.14.0 |
| **Font** | Geist (Sans + Mono) | ^1.2.2 |
| **Teste** | Vitest | ^4.0.17 |
| **Deploy** | Railway (Nixpacks) | - |

## Structura Proiectului

```
erp-cashflowsync/
├── prisma/
│   ├── schema.prisma              # Schema baza de date (toate modelele)
│   ├── migrations/                # Migratii Prisma (auto-generate)
│   └── manual-migrations/         # Migratii SQL manuale (rulate la deploy)
├── scripts/
│   ├── deploy-start.sh            # Script start deploy Railway
│   ├── force-migration.js         # Executor migratii manuale SQL
│   └── backfill-postal-codes.ts   # Script backfill coduri postale
├── src/
│   ├── app/
│   │   ├── layout.tsx             # Layout principal (Geist font, Providers, Toaster)
│   │   ├── providers.tsx          # SessionProvider, QueryClient, ThemeProvider
│   │   ├── globals.css            # Stiluri globale Tailwind
│   │   ├── (dashboard)/           # Paginile aplicatiei (cu layout sidebar)
│   │   │   ├── dashboard/         # Dashboard cu statistici
│   │   │   ├── orders/            # Comenzi
│   │   │   ├── products/          # Produse (PIM)
│   │   │   ├── picking/           # Picking lists
│   │   │   ├── handover/          # Predare curier
│   │   │   ├── inventory/         # Inventar & Depozite
│   │   │   ├── customers/         # Clienti (embed + pagina)
│   │   │   ├── settings/          # Setari aplicatie
│   │   │   ├── admin/             # Admin (utilizatori, roluri, reparari)
│   │   │   └── ...
│   │   └── api/
│   │       ├── auth/              # NextAuth endpoints
│   │       ├── cron/              # Cron jobs (sync, backup, ads)
│   │       ├── orders/            # API comenzi
│   │       ├── invoices/          # API facturi
│   │       ├── awb/               # API AWB
│   │       ├── products/          # API produse
│   │       ├── picking/           # API picking
│   │       ├── handover/          # API predare curier
│   │       ├── inventory/         # API inventar
│   │       ├── trendyol/          # API Trendyol
│   │       ├── temu/              # API Temu
│   │       ├── ads/               # API Advertising
│   │       └── ...
│   ├── components/
│   │   ├── ui/                    # Componente Radix UI (button, dialog, table, etc.)
│   │   └── ...                    # Componente business (OrderModal, InvoiceView, etc.)
│   ├── lib/
│   │   ├── auth.ts                # Configurare NextAuth
│   │   ├── permissions.ts         # Sistem RBAC (permisiuni, roluri)
│   │   ├── db.ts                  # Singleton Prisma Client
│   │   ├── oblio.ts               # Client API Oblio (facturare)
│   │   ├── fancourier.ts          # Client API FanCourier (curierat)
│   │   ├── shopify.ts             # Client API Shopify (comenzi)
│   │   ├── trendyol.ts            # Client API Trendyol (marketplace)
│   │   ├── temu.ts                # Client API Temu (marketplace)
│   │   ├── daktela.ts             # Integrare Daktela (CRM/call center)
│   │   ├── anaf.ts                # API ANAF (validare CUI)
│   │   ├── invoice-service.ts     # Logica emitere facturi
│   │   ├── awb-service.ts         # Logica creare AWB
│   │   ├── sync-service.ts        # Logica sincronizare
│   │   ├── intercompany-service.ts # Decontari intercompany
│   │   ├── ai.ts                  # AI Insights (Anthropic Claude)
│   │   └── ...                    # Alte servicii specializate
│   └── types/                     # Tipuri TypeScript custom
├── railway.toml                   # Configurare deploy Railway
├── next.config.js                 # Configurare Next.js
├── tsconfig.json                  # Configurare TypeScript
└── package.json                   # Dependente si scripturi
```

## Configurare Next.js

Fisier: `next.config.js`

- **Prisma** este inclus in `serverComponentsExternalPackages` pentru a functiona in Server Components
- **TypeScript build errors** sunt ignorate (`ignoreBuildErrors: true`) din cauza generarii Prisma Client
- **Imagini remote** acceptate de la: `cdn.shopify.com`, `cdn.dsmcdn.com` (Trendyol)
- **Headers custom** pentru embed iframe (Daktela):
  - CSP `frame-ancestors` configurabil prin `EMBED_ALLOWED_DOMAINS`
  - CORS headers pentru API-ul de clienti

## Dependente Cheie si Rolul Lor

| Dependenta | Scop |
|---|---|
| `@auth/prisma-adapter` | Adaptor Prisma pentru NextAuth (sesiuni in DB) |
| `@anthropic-ai/sdk` | Integrare Claude AI pentru insights automatizate |
| `googleapis` | Google Drive API (sincronizare imagini produse, backup) |
| `json-bigint` | Parsare numere mari AWB (FanCourier returneaza BigInt) |
| `libphonenumber-js` | Validare si formatare numere de telefon |
| `pdf-lib` / `pdfkit` | Generare PDF-uri (facturi, picking lists, rapoarte) |
| `exceljs` | Export Excel cu stiluri si auto-filter |
| `bcryptjs` | Hash parole pentru autentificare cu credentials |
| `iconv-lite` | Conversie encoding caractere (CSV FanCourier) |
| `uuid` | Generare ID-uri unice |
| `date-fns` | Utilitare formatare date |

## Scripturi NPM

| Script | Descriere |
|---|---|
| `dev` | Porneste serverul de dezvoltare Next.js |
| `build` | Genereaza Prisma Client + build Next.js |
| `prestart` | Ruleaza migratiile manuale inainte de start |
| `start` | Porneste serverul de productie |
| `db:migrate` | Ruleaza migratiile cu script custom |
| `db:force-migrate` | Forteaza migratiile manuale SQL |
| `db:generate` | Genereaza Prisma Client |
| `db:push` | Push schema direct (fara migration) |
| `db:studio` | Deschide Prisma Studio (GUI baza de date) |
| `db:seed` | Populeaza baza de date cu date initiale |
| `test` | Ruleaza testele cu Vitest (watch mode) |
| `test:run` | Ruleaza testele o singura data |
| `backfill:postal-codes` | Populeaza coduri postale din nomenclator FanCourier |

## Configurare TypeScript

- **Target:** ES2017
- **Module:** ESNext cu resolver `bundler`
- **Path alias:** `@/*` -> `./src/*`
- **Strict mode:** Dezactivat (`strict: false`)
- **Teste excluse** din compilare: `*.test.ts`, `*.spec.ts`
