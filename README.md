# ERP Shopify - Platformă Centralizată de Gestiune Comenzi

O platformă modernă și scalabilă pentru gestionarea centralizată a comenzilor din multiple magazine Shopify, cu integrare automată pentru facturare (SmartBill) și livrare (FanCourier).

## ✨ Funcționalități

- **📦 Centralizare Comenzi** - Sincronizare automată a comenzilor din toate magazinele Shopify
- **✅ Validări Automate** - Verificare numere de telefon românești și adrese valide
- **🧾 Facturare SmartBill** - Emitere facturi individual sau în bulk
- **🚚 Integrare FanCourier** - Creare AWB-uri cu opțiuni configurabile
- **📍 Tracking Live** - Urmărire statusuri AWB cu actualizare automată
- **🏪 Multi-magazin** - Gestionare ușoară a mai multor magazine
- **🎨 Interfață Modernă** - Design enterprise cu temă dark

## 🛠️ Stack Tehnologic

- **Frontend**: Next.js 14, React 18, Tailwind CSS
- **UI Components**: Radix UI, Lucide Icons
- **State Management**: TanStack React Query
- **Database**: PostgreSQL cu Prisma ORM
- **APIs**: Shopify Admin API, SmartBill API, FanCourier API

## 📋 Cerințe

- Node.js 18+
- PostgreSQL 14+
- npm sau yarn

## 🚀 Instalare

### 1. Clonează sau copiază proiectul

```bash
cd erp-shopify
```

### 2. Instalează dependențele

```bash
npm install
```

### 3. Configurează variabilele de mediu

Copiază fișierul `.env.example` în `.env`:

```bash
cp .env.example .env
```

Editează `.env` și completează:

```env
# Database PostgreSQL
DATABASE_URL="postgresql://user:password@localhost:5432/erp_shopify?schema=public"

# SmartBill API (de pe https://cloud.smartbill.ro/)
SMARTBILL_EMAIL="email@exemplu.ro"
SMARTBILL_TOKEN="your-smartbill-api-token"
SMARTBILL_CIF="RO12345678"
SMARTBILL_SERIES="FCT"

# FanCourier API (de pe https://www.fancourier.ro/)
FANCOURIER_CLIENT_ID="your-client-id"
FANCOURIER_USERNAME="your-username"
FANCOURIER_PASSWORD="your-password"
```

### 4. Inițializează baza de date

```bash
# Generează clientul Prisma
npm run db:generate

# Creează tabelele în baza de date
npm run db:push
```

### 5. Pornește aplicația

```bash
npm run dev
```

Aplicația va rula la: **http://localhost:3000**

## 📖 Ghid de Utilizare

### Adăugare Magazin Shopify

1. Accesează **Magazine** din meniul lateral
2. Click pe **Adaugă Magazin**
3. Completează:
   - **Nume**: Numele afișat al magazinului
   - **Domeniu**: `magazin.myshopify.com`
   - **Access Token**: Token-ul Admin API din Shopify

#### Obținerea Access Token-ului Shopify:
1. În Shopify Admin → Settings → Apps and sales channels → Develop apps
2. Creează o aplicație nouă
3. Configurează permisiunile API (minim: `read_orders`, `write_orders`)
4. Instalează aplicația și copiază Access Token-ul

### Configurare SmartBill

1. Accesează **Setări** din meniul lateral
2. Completează credențialele SmartBill:
   - Email-ul contului
   - Token-ul API (din setările SmartBill)
   - CIF-ul companiei
   - Seria pentru facturi

### Configurare FanCourier

1. În **Setări**, completează:
   - Client ID
   - Username și Parolă API
2. Configurează datele expeditorului
3. Setează opțiunile default pentru AWB

### Procesare Comenzi

1. **Sincronizare**: Click pe butonul de sincronizare pentru a importa comenzile noi
2. **Verificare Validări**: Comenzile sunt validate automat (telefon, adresă)
3. **Emitere Factură**: Selectează comenzile → Click "Emite Facturi"
4. **Creare AWB**: 
   - Selectează comenzile validate
   - Click "Creează AWB"
   - Alege setări predefinite sau personalizate
   - Confirmă crearea

### Tracking AWB

- Accesează **Tracking AWB** pentru a vedea toate expedițiile
- Click pe un AWB pentru a vedea istoricul complet
- Folosește butonul "Actualizează Statusuri" pentru refresh

## 🔗 Webhook-uri Shopify (Opțional)

Pentru sincronizare în timp real, configurează webhook-uri în Shopify:

1. În Shopify Admin → Settings → Notifications → Webhooks
2. Adaugă webhook-uri pentru:
   - `orders/create` → `https://your-domain/api/webhooks/shopify`
   - `orders/updated` → `https://your-domain/api/webhooks/shopify`
   - `orders/cancelled` → `https://your-domain/api/webhooks/shopify`

## 📁 Structură Proiect

```
erp-shopify/
├── prisma/
│   └── schema.prisma      # Schema baza de date
├── src/
│   ├── app/
│   │   ├── (dashboard)/   # Pagini dashboard
│   │   ├── api/           # API routes
│   │   └── layout.tsx     # Layout principal
│   ├── components/
│   │   ├── ui/            # Componente UI reutilizabile
│   │   └── sidebar.tsx    # Navigare laterală
│   ├── lib/
│   │   ├── db.ts          # Conexiune Prisma
│   │   ├── shopify.ts     # Client Shopify API
│   │   ├── smartbill.ts   # Client SmartBill API
│   │   ├── fancourier.ts  # Client FanCourier API
│   │   └── validators.ts  # Validări telefon/adresă
│   └── hooks/
│       └── use-toast.ts   # Hook notificări
├── .env.example           # Template variabile mediu
├── package.json
└── README.md
```

## 🔧 Comenzi Disponibile

```bash
npm run dev        # Pornește în modul dezvoltare
npm run build      # Build pentru producție
npm run start      # Pornește în producție
npm run db:generate # Generează clientul Prisma
npm run db:push    # Sincronizează schema cu DB
npm run db:studio  # Deschide Prisma Studio (vizualizare date)
```

## 🐛 Depanare

### Eroare conexiune baza de date
- Verifică că PostgreSQL rulează
- Verifică URL-ul din DATABASE_URL
- Rulează `npm run db:push`

### Eroare SmartBill
- Verifică credențialele în Setări
- Asigură-te că CIF-ul și seria sunt corecte
- Verifică dacă ai credit pe contul SmartBill

### Eroare FanCourier
- Verifică credențialele API
- Asigură-te că datele expeditorului sunt complete
- Verifică formatul adreselor (județ, oraș)

### Comenzile nu se sincronizează
- Verifică că magazinul este marcat ca "Activ"
- Verifică Access Token-ul Shopify
- Asigură-te că token-ul are permisiunile necesare

## 📝 Licență

MIT License - Folosește liber în proiectele tale!

## 🤝 Suport

Pentru întrebări sau probleme, deschide un Issue pe GitHub.

---

Creat cu ❤️ pentru antreprenorii e-commerce din România
