# Ghid de Configurare Google OAuth

## Pași pentru activarea autentificării Google

### 1. Creează un proiect în Google Cloud Console

1. Accesează [Google Cloud Console](https://console.cloud.google.com/)
2. Click pe **Select a project** → **New Project**
3. Denumește proiectul (ex: "ERP Shopify") și creează-l

### 2. Activează Google+ API (opțional, dar recomandat)

1. În meniul din stânga, mergi la **APIs & Services** → **Library**
2. Caută "Google+ API" și activează-l

### 3. Configurează OAuth Consent Screen

1. Mergi la **APIs & Services** → **OAuth consent screen**
2. Selectează **External** (sau Internal dacă ai Google Workspace)
3. Completează informațiile:
   - **App name**: ERP Shopify
   - **User support email**: email-ul tău
   - **Developer contact information**: email-ul tău
4. La **Scopes**, adaugă:
   - `email`
   - `profile`
   - `openid`
5. La **Test users** (doar pentru External), adaugă email-urile utilizatorilor autorizați
6. Salvează și continuă

### 4. Creează OAuth Credentials

1. Mergi la **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Selectează **Web application**
4. Denumește-l (ex: "ERP Shopify Web")
5. La **Authorized JavaScript origins**, adaugă:
   ```
   http://localhost:3000
   https://erp.cashflowgrup.net
   ```
6. La **Authorized redirect URIs**, adaugă:
   ```
   http://localhost:3000/api/auth/callback/google
   https://erp.cashflowgrup.net/api/auth/callback/google
   ```
7. Click **Create**
8. Copiază **Client ID** și **Client Secret**

### 5. Configurează variabilele de mediu

Editează fișierul `.env`:

```env
# NextAuth.js
NEXTAUTH_URL="https://erp.cashflowgrup.net"
NEXTAUTH_SECRET="genereaza_un_secret_securizat"

# Google OAuth
GOOGLE_CLIENT_ID="123456789-abcdefgh.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-..."

# Restricționare acces (opțional)
ALLOWED_EMAILS="admin@cashflowgrup.net,manager@cashflowgrup.net"
```

**Generare NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

### 6. Rulează migrarea bazei de date

```bash
npx prisma db push
```

### 7. Repornește aplicația

```bash
npm run build
pm2 restart erp-shopify
```

---

## Structura de roluri

| Rol | Permisiuni |
|-----|------------|
| **ADMIN** | Acces complet la toate funcțiile |
| **MANAGER** | Poate vedea tot, poate modifica comenzi/picking |
| **USER** | Doar vizualizare (citire) |

### Schimbare rol utilizator

```sql
-- În baza de date PostgreSQL
UPDATE users SET role = 'ADMIN' WHERE email = 'admin@cashflowgrup.net';
```

Sau prin Prisma Studio:
```bash
npx prisma studio
```

---

## Restricționare acces

### Prin email-uri autorizate

Setează în `.env`:
```env
ALLOWED_EMAILS="user1@domain.com,user2@domain.com"
```

Doar utilizatorii cu aceste email-uri vor putea să se autentifice.

### Prin domeniu Google Workspace

Dacă ai Google Workspace, poți restricționa la nivelul organizației:
1. În OAuth consent screen, selectează **Internal**
2. Doar utilizatorii din organizația ta vor putea să se autentifice

---

## Troubleshooting

### Eroare "Access Denied"
- Verifică că email-ul e în lista `ALLOWED_EMAILS`
- Verifică că redirect URI e corect configurat în Google Console

### Eroare "Configuration Error"
- Verifică că `GOOGLE_CLIENT_ID` și `GOOGLE_CLIENT_SECRET` sunt setate
- Verifică că `NEXTAUTH_SECRET` e setat

### Sesiunea nu se salvează
- Verifică că tabelele de autentificare există în baza de date
- Rulează `npx prisma db push` pentru a crea tabelele

---

## Fluxul de autentificare

```
[Utilizator] → /login → [Google OAuth] → /api/auth/callback/google → [Verificare ALLOWED_EMAILS] → /dashboard
```

1. Utilizatorul accesează orice pagină protejată
2. Middleware-ul detectează lipsa sesiunii și redirecționează la `/login`
3. Utilizatorul click pe "Continuă cu Google"
4. Google afișează ecranul de consimțământ
5. După autorizare, Google redirecționează înapoi cu un cod
6. NextAuth validează codul și creează sesiunea
7. Utilizatorul e redirecționat la dashboard
