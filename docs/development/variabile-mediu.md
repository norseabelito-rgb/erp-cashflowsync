# Variabile de Mediu

Lista completă a variabilelor de mediu utilizate în proiect. Fișierul `.env` este ignorat de Git (configurat în `.gitignore`).

## Variabile obligatorii

### DATABASE_URL

| Proprietate | Valoare |
|-------------|---------|
| **Obligatorie** | Da |
| **Utilizare** | Conexiune PostgreSQL (Prisma ORM) |
| **Fișier** | `prisma/schema.prisma`, `scripts/force-migration.js` |
| **Exemplu** | `postgresql://user:password@localhost:5432/erp_cashflowsync` |

URL-ul de conexiune la baza de date PostgreSQL. Folosit de Prisma Client și de scripturile de migrație.

### NEXTAUTH_URL

| Proprietate | Valoare |
|-------------|---------|
| **Obligatorie** | Da |
| **Utilizare** | URL-ul de bază al aplicației (NextAuth.js) |
| **Fișiere** | `src/app/api/rbac/invitations/route.ts`, `src/app/api/ads/webhooks/route.ts`, `src/app/api/trendyol/route.ts`, `src/app/api/print-client/document/[id]/route.ts` |
| **Exemplu** | `http://localhost:3000` (local) sau `https://erp.cashflowgrup.net` (producție) |

Folosit de NextAuth.js pentru generarea URL-urilor de callback, link-uri de invitații, webhook-uri ads și URL-uri de bază pentru diverse integrări.

### NEXTAUTH_SECRET

| Proprietate | Valoare |
|-------------|---------|
| **Obligatorie** | Da |
| **Utilizare** | Secret pentru semnarea JWT-urilor NextAuth |
| **Fișier** | Folosit intern de NextAuth.js |
| **Exemplu** | `un-string-random-de-cel-putin-32-caractere` |

Generare: `openssl rand -base64 32`

## Autentificare Google OAuth

### GOOGLE_CLIENT_ID

| Proprietate | Valoare |
|-------------|---------|
| **Obligatorie** | Da (dacă se folosește login cu Google) |
| **Utilizare** | Client ID pentru Google OAuth Provider |
| **Fișier** | `src/lib/auth.ts` |
| **Exemplu** | `123456789.apps.googleusercontent.com` |

### GOOGLE_CLIENT_SECRET

| Proprietate | Valoare |
|-------------|---------|
| **Obligatorie** | Da (dacă se folosește login cu Google) |
| **Utilizare** | Client Secret pentru Google OAuth Provider |
| **Fișier** | `src/lib/auth.ts` |
| **Exemplu** | `GOCSPX-xxxxxxxxxxxxx` |

Se obțin din Google Cloud Console > APIs & Services > Credentials.

## Variabile opționale

### ALLOWED_EMAILS

| Proprietate | Valoare |
|-------------|---------|
| **Obligatorie** | Nu |
| **Utilizare** | Restricționare acces pe email |
| **Fișier** | `src/lib/auth.ts` |
| **Exemplu** | `admin@firma.ro,manager@firma.ro` |

Lista de email-uri separate prin virgulă care au permisiunea de a se autentifica. Dacă nu este setată, oricine se poate autentifica. Utilizatorii existenți în baza de date sau cei cu invitație validă pot accesa indiferent de această variabilă.

### SESSION_TIMEOUT_MINUTES

| Proprietate | Valoare |
|-------------|---------|
| **Obligatorie** | Nu |
| **Utilizare** | Durata sesiunii în minute |
| **Fișier** | `src/lib/auth.ts` |
| **Default** | `30` |
| **Exemplu** | `60` |

Timeout-ul sesiunii JWT. După expirare, utilizatorul este redirecționat la pagina de login. Sesiunea se resetează la fiecare minut de activitate.

### CRON_SECRET

| Proprietate | Valoare |
|-------------|---------|
| **Obligatorie** | Da (pentru cron jobs) |
| **Utilizare** | Autentificare endpoint-uri cron |
| **Fișiere** | `src/app/api/cron/sync-orders/route.ts`, `src/app/api/cron/sync-awb/route.ts`, `src/app/api/cron/ads-sync/route.ts`, `src/app/api/cron/ads-alerts/route.ts`, `src/app/api/cron/ads-rollback/route.ts`, `src/app/api/cron/backup/route.ts`, `src/app/api/cron/run-all/route.ts`, `src/app/api/cron/handover-finalize/route.ts`, `src/app/api/cron/trendyol-sync/route.ts`, `src/app/api/cron/intercompany-settlement/route.ts`, `src/app/api/cron/ai-analysis/route.ts`, `src/app/api/cron/backfill-postal-codes/route.ts` |
| **Exemplu** | `secret-random-pentru-cron` |

Token-ul de autorizare pentru toate endpoint-urile cron. Se trimite ca header `Authorization: Bearer <CRON_SECRET>`.

### DAKTELA_ACCESS_TOKEN

| Proprietate | Valoare |
|-------------|---------|
| **Obligatorie** | Nu |
| **Utilizare** | Token acces API Daktela (call center) |
| **Fișier** | `src/lib/daktela.ts` |
| **Exemplu** | `token-daktela-api` |

Dacă nu este setat, sincronizarea contactelor cu Daktela este dezactivată (skip silențios).

### EMBED_SECRET_TOKEN

| Proprietate | Valoare |
|-------------|---------|
| **Obligatorie** | Nu |
| **Utilizare** | Autentificare acces embed (iframe) |
| **Fișier** | `src/lib/embed-auth.ts` |
| **Exemplu** | `token-secret-embed` |

Folosit pentru autentificarea accesului la pagina de embed clienți (iframe Daktela). Se trimite ca `Authorization: Bearer <token>`.

### EMBED_ALLOWED_DOMAINS

| Proprietate | Valoare |
|-------------|---------|
| **Obligatorie** | Nu |
| **Utilizare** | Domenii permise pentru iframe embed |
| **Fișier** | `next.config.js` |
| **Exemplu** | `https://daktela.cashflowgrup.net,https://alt-domeniu.ro` |

Lista de domenii separate prin virgulă care au permisiunea de a încorpora pagina de embed în iframe. Dacă nu este setată, se permite orice domeniu (`frame-ancestors *`).

### NEXT_PUBLIC_APP_URL

| Proprietate | Valoare |
|-------------|---------|
| **Obligatorie** | Nu |
| **Utilizare** | URL public al aplicației (client-side) |
| **Fișier** | `src/lib/ads-config.ts` |
| **Exemplu** | `https://erp.cashflowgrup.net` |

Folosit pentru generarea redirect URI-urilor OAuth pentru platformele de advertising.

### NEXT_PUBLIC_BASE_URL

| Proprietate | Valoare |
|-------------|---------|
| **Obligatorie** | Nu |
| **Utilizare** | URL de bază alternativ |
| **Fișiere** | `src/app/api/trendyol/stores/route.ts`, `src/app/api/trendyol/stores/[id]/route.ts` |
| **Exemplu** | `https://erp.cashflowgrup.net` |

Fallback pentru `NEXTAUTH_URL` în anumite contexte Trendyol.

### UPLOAD_DIR

| Proprietate | Valoare |
|-------------|---------|
| **Obligatorie** | Nu |
| **Utilizare** | Director pentru fișiere uploadate |
| **Fișiere** | `src/app/api/upload/route.ts`, `src/app/api/upload/[...path]/route.ts`, `src/app/api/supplier-invoices/upload/route.ts`, `src/app/api/reception-reports/[id]/photos/route.ts` |
| **Default** | `./uploads` |
| **Exemplu** | `/data/uploads` |

Directorul unde se salvează fișierele uploadate (facturi furnizori, fotografii recepție).

### ANTHROPIC_API_KEY

| Proprietate | Valoare |
|-------------|---------|
| **Obligatorie** | Nu (doar pentru funcționalitatea AI) |
| **Utilizare** | Cheie API Anthropic Claude |
| **Fișier** | Folosit de SDK-ul `@anthropic-ai/sdk` |
| **Exemplu** | `sk-ant-xxxxx` |

Folosit pentru analiza AI a campaniilor de advertising și sugestii de optimizare.

## Variabile de sistem (setate automat)

### NODE_ENV

| Proprietate | Valoare |
|-------------|---------|
| **Setat automat** | Da (de Next.js) |
| **Valori** | `development`, `production`, `test` |
| **Utilizare** | Comportament condiționat |

Efecte:
- `development`: debug NextAuth activ, stack trace-uri în răspunsuri API, Prisma singleton persistent
- `production`: fără debug, fără stack traces

### VERCEL_URL

| Proprietate | Valoare |
|-------------|---------|
| **Setat automat** | Da (pe Vercel) |
| **Utilizare** | Fallback URL de bază pe Vercel |
| **Fișier** | `src/app/api/print-client/document/[id]/route.ts` |

## Credențiale stocate în baza de date

Următoarele credențiale **NU** sunt variabile de mediu - sunt stocate în baza de date și se configurează din interfața aplicației:

| Serviciu | Tabel DB | Configurare din |
|----------|----------|-----------------|
| **Shopify** (API Key, Secret, Access Token) | `Store` | Setări > Magazine |
| **Oblio** (Email, Secret Token, CIF) | `Company` | Setări > Firme |
| **FanCourier** (Username, Password, Client ID) | `Company` | Setări > Firme |
| **Trendyol** (API Key, Secret, Seller ID) | `TrendyolStore` | Trendyol > Setări |
| **Meta Ads** (App ID, App Secret) | `AdsSettings` | Marketing > Conturi Ads |
| **TikTok Ads** (App ID, App Secret) | `AdsSettings` | Marketing > Conturi Ads |
| **Google Drive** (Service Account JSON) | `Settings` | Setări > Integrări |

## Exemplu fișier `.env` complet

```bash
# === OBLIGATORII ===
DATABASE_URL="postgresql://user:password@localhost:5432/erp_cashflowsync"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generat-cu-openssl-rand-base64-32"

# === AUTENTIFICARE GOOGLE ===
GOOGLE_CLIENT_ID="123456789.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-xxxxxxxxxxxxx"

# === OPȚIONALE ===
# ALLOWED_EMAILS="admin@firma.ro,user@firma.ro"
# SESSION_TIMEOUT_MINUTES="30"
# CRON_SECRET="secret-random-pentru-cron"
# DAKTELA_ACCESS_TOKEN="token-daktela"
# EMBED_SECRET_TOKEN="token-embed"
# EMBED_ALLOWED_DOMAINS="https://daktela.cashflowgrup.net"
# UPLOAD_DIR="./uploads"
# ANTHROPIC_API_KEY="sk-ant-xxxxx"
# NEXT_PUBLIC_APP_URL="http://localhost:3000"
```
