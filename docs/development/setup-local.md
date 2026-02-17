# Setup Local - Ghid de Instalare

Acest ghid descrie pașii necesari pentru a rula proiectul ERP CashFlowSync pe mașina locală.

## Cerințe preliminare

| Cerință | Versiune minimă | Verificare |
|---------|-----------------|------------|
| Node.js | 20.x | `node --version` |
| npm | 10.x | `npm --version` |
| PostgreSQL | 14+ | `psql --version` |
| Git | 2.x | `git --version` |

## 1. Clonarea repository-ului

```bash
git clone <url-repository> erp-cashflowsync
cd erp-cashflowsync
```

## 2. Instalarea dependențelor

```bash
npm install --legacy-peer-deps
```

Flag-ul `--legacy-peer-deps` este necesar deoarece unele pachete au conflicte de peer dependencies. Acest flag este configurat și în `railway.toml` pentru deployment.

## 3. Configurarea bazei de date PostgreSQL

Creează o bază de date PostgreSQL locală:

```bash
# Conectare la PostgreSQL
psql -U postgres

# Creare bază de date
CREATE DATABASE erp_cashflowsync;

# Creare utilizator (opțional)
CREATE USER erp_user WITH PASSWORD 'parola_locala';
GRANT ALL PRIVILEGES ON DATABASE erp_cashflowsync TO erp_user;
```

## 4. Configurarea variabilelor de mediu

Creează un fișier `.env` în rădăcina proiectului (acest fișier este ignorat de Git):

```bash
# Bază de date PostgreSQL
DATABASE_URL="postgresql://erp_user:parola_locala@localhost:5432/erp_cashflowsync"

# NextAuth.js - obligatoriu
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="un-secret-random-generat-local"

# Google OAuth (pentru login cu Google)
GOOGLE_CLIENT_ID="xxxxx.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="xxxxx"

# Opțional - restricționare acces pe email
# ALLOWED_EMAILS="user1@example.com,user2@example.com"

# Opțional - timeout sesiune (default: 30 minute)
# SESSION_TIMEOUT_MINUTES="30"
```

Pentru a genera un `NEXTAUTH_SECRET` random:

```bash
openssl rand -base64 32
```

> Vezi documentul [variabile-mediu.md](variabile-mediu.md) pentru lista completă a variabilelor de mediu.

## 5. Generarea clientului Prisma

```bash
npx prisma generate
```

Acest pas generează clientul TypeScript pe baza schemei din `prisma/schema.prisma`. Trebuie rulat:
- La prima instalare
- După orice modificare a fișierului `schema.prisma`
- Este inclus automat în comanda `npm run build`

## 6. Crearea tabelelor în bază de date

```bash
npx prisma migrate dev
```

Această comandă:
- Aplică toate migrațiile existente din `prisma/migrations/`
- Creează tabelele definite în `schema.prisma`
- Generează automat clientul Prisma

Alternativ, pentru a sincroniza schema fără migrații (util în development):

```bash
npx prisma db push
```

## 7. Pornirea serverului de development

```bash
npm run dev
```

Serverul pornește pe `http://localhost:3000`.

## 8. Verificarea funcționării

1. Deschide `http://localhost:3000` - ar trebui să vezi pagina de login
2. Autentifică-te cu Google sau creează un cont cu email/parolă
3. Primul utilizator devine automat **SuperAdmin** cu acces complet
4. După autentificare, ești redirecționat la `/dashboard`

## Scripturi disponibile

| Comandă | Descriere |
|---------|-----------|
| `npm run dev` | Pornește serverul de development (Next.js) |
| `npm run build` | Build de producție (`prisma generate && next build`) |
| `npm run start` | Pornește serverul de producție |
| `npm run lint` | Verificare linting (ESLint) |
| `npm run test` | Rulează testele cu Vitest (watch mode) |
| `npm run test:run` | Rulează testele o singură dată |
| `npm run test:coverage` | Rulează testele cu raport de coverage |
| `npm run db:generate` | Regenerează clientul Prisma |
| `npm run db:push` | Sincronizează schema cu baza de date |
| `npm run db:studio` | Deschide Prisma Studio (UI pentru baza de date) |
| `npm run db:seed` | Populează baza de date cu date inițiale |
| `npm run db:migrate` | Rulează migrațiile cu script custom |
| `npm run db:force-migrate` | Forțează rularea migrațiilor |

## Prisma Studio

Pentru a inspecta și edita datele din baza de date:

```bash
npm run db:studio
```

Se deschide un UI web pe `http://localhost:5555` unde poți vedea și modifica direct datele.

## Troubleshooting

### Eroare "Cannot find module @prisma/client"

```bash
npx prisma generate
```

### Eroare la conectarea la PostgreSQL

Verifică:
- PostgreSQL rulează (`pg_isready`)
- URL-ul din `DATABASE_URL` este corect
- Baza de date există
- Utilizatorul are permisiuni

### Port 3000 ocupat

```bash
# Găsește procesul care ocupă portul
lsof -i :3000
# Oprește procesul
kill -9 <PID>
```

### Erori la `npm install`

```bash
# Șterge node_modules și reinstalează
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

## Structura deployment

Proiectul este configurat pentru deployment pe Railway (`railway.toml`):

- **Build**: Nixpacks cu `npx prisma generate && npm run build`
- **Start**: `bash scripts/deploy-start.sh` (include migrații automate)
- **Restart policy**: ON_FAILURE cu maxim 10 reîncercări
