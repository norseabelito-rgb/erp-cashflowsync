# Advertising (Ads)

## Prezentare Generala

Modulul de advertising integreaza Meta (Facebook/Instagram) si TikTok Ads cu ERP-ul. Ofera dashboard cu KPI-uri, gestionarea campaniilor, performanta per produs/SKU, pixeli de tracking, alerte automate si setari OAuth.

**URL-uri:**
- `/ads` - Dashboard general
- `/ads/campaigns` - Lista si gestionare campanii
- `/ads/campaigns/[id]` - Detaliu campanie
- `/ads/campaigns/create` - Creare campanie noua
- `/ads/products` - Performanta per SKU
- `/ads/pixels` - Pixeli de tracking
- `/ads/alerts` - Reguli alerte si alerte declansate
- `/ads/accounts` - Conturi conectate
- `/ads/settings` - Aplicatii OAuth

**Permisiuni:**
- `ads.view` - vizualizare (toate paginile)
- `ads.manage` - actiuni (toggle campanie, buget, adaugare SKU)
- `ads.accounts` - gestionare conturi si aplicatii
- `ads.alerts` - creare/stergere reguli alerte

---

## Dashboard (`/ads`)

**Permisiune:** `ads.view`

### Informatii Afisate

**Filtre globale:**
- Selectie cont advertising
- Perioada: 7 zile / 30 zile / 90 zile

**Carduri KPI:**
- Spend total (cheltuieli)
- Impressions (afisari)
- Clicks (cu CTR)
- Conversii (cu CPA)
- ROAS (Return on Ad Spend)

**Componenta AI Insights** - analiza AI a performantei campaniilor

**Tabel Campanii:**
- Platforma (iconita Meta/TikTok)
- Nume campanie
- Status (activ/pauza)
- Spend
- Conversii
- ROAS (colorat: verde >=3x, galben >=2x, rosu <2x)

---

## Campanii (`/ads/campaigns`)

**Permisiune:** `ads.view`, `ads.manage` pentru actiuni

### Informatii Afisate

**Tabel campanii cu coloanele:**
- Nume campanie
- Status (badge)
- Buget zilnic
- Spend
- Impressions
- Clicks
- CTR
- Conversii
- CPA
- ROAS

### Filtre

- Cautare dupa nume
- Platforma (Meta / TikTok)
- Status (Activ / Pauza / Arhivat)

### Actiuni per Campanie

| Actiune | Permisiune | Descriere |
|---------|-----------|-----------|
| Toggle Status | ads.manage | Activeaza/Opreste campania |
| Modifica Buget | ads.manage | Deschide dialog modificare buget zilnic |
| Vezi Detalii | ads.view | Navigare la `/ads/campaigns/[id]` |

### Dialog Modificare Buget

- Camp: buget zilnic (RON)
- Buget actual afisat
- Butoane: Anuleaza / Salveaza

---

## Detaliu Campanie (`/ads/campaigns/[id]`)

**Permisiune:** `ads.view`, `ads.manage` pentru actiuni

### Informatii Afisate

**Header:**
- Platforma (iconita Meta/TikTok)
- Nume campanie
- Cont si obiectiv
- Status badge
- Validare denumire (conform conventiei de naming)

**KPI-uri principale (6 carduri):**
- Spend, Impressions, Clicks, CTR, Conversii, ROAS

**KPI-uri secundare (5 carduri):**
- Buget/zi, CPC, CPM, CPA, Revenue

**Taburi:**

| Tab | Continut |
|-----|----------|
| Performanta | Grafice performanta (componenta `CampaignPerformanceCharts`) |
| AI Insights | Analiza AI on-demand (componenta `CampaignAIInsights`) |
| Structura | Arborele Ad Sets -> Ads cu metrici per element |
| Produse | SKU-uri mapate la campanie cu sursa (Auto/Manual) |
| Alerte | Alertele declansate pentru aceasta campanie |
| Istoric | Statistici zilnice (ultmele 30 zile) |

### Actiuni (ads.manage)

| Buton | Actiune |
|-------|---------|
| Pauza / Activeaza | Toggle status campanie |
| Modifica Buget | Dialog modificare buget zilnic |
| Refresh | Actualizeaza insights |
| Adauga SKU | Dialog mapare SKU manual |

### Dialog Adauga SKU

- Camp: cod SKU produs
- Butoane: Anuleaza / Adauga

---

## Creare Campanie (`/ads/campaigns/create`)

**Permisiune:** `ads.manage`

### Flux in 4 Pasi

**1. Selecteaza Contul**
- Grid cu conturile active (Meta/TikTok)
- Click pentru selectie

**2. Obiectiv Campanie**
- Lista obiective disponibile per platforma
- Descriere pentru fiecare obiectiv

**3. Produse si Denumire**
- Selector produse cu cautare (SKU, nume)
- Produse selectate apar ca badge-uri
- Generare automata nume conform conventiei: `CONV_SKU_[COD]_BROAD_2024Q4`
- Camp nume personalizat (optional, suprascrie generarea automata)

**4. Buget si Setari**
- Buget zilnic (RON)
- Toggle "Porneste imediat" (ACTIVE vs PAUSED)
- Avertisment daca se porneste imediat: "Campania va incepe sa cheltuiasca imediat!"

---

## Performanta per SKU (`/ads/products`)

**Permisiune:** `ads.view`

### Informatii Afisate

**Info mapping automat** - explica conventia de denumire `CONV_SKU_[COD]_BROAD_2024Q4`

**Carduri sumar:**
- SKU-uri promovate
- Total Spend
- Total Revenue
- Total Conversii
- ROAS Mediu

**Tabel produse:**
- Produs (imagine + SKU + titlu)
- Platforme (iconite Meta/TikTok)
- Numar campanii
- Spend (sortabil)
- Impressions
- Conversii (sortabil)
- CPA (sortabil)
- Revenue (sortabil)
- ROAS (sortabil, colorat)

**Detaliu expandabil** (click pe rand) - lista campaniilor asociate unui SKU cu metrici individuale

### Filtre

- Cautare dupa SKU sau produs
- Platforma (Toate / Meta / TikTok)
- Sortare (Spend / ROAS / Conversii / CPA / Revenue)

---

## Pixeli Tracking (`/ads/pixels`)

**Permisiune:** `ads.view`, `ads.manage` pentru actiuni

### Informatii Afisate

**Carduri per cont** - pentru fiecare cont activ, numar de pixeli si buton sincronizare

**Filtre:**
- Selectie cont

**Tabel pixeli:**
- Pixel (platforma + nume + ID extern)
- Cont
- Status (Activ / Avertisment / Eroare)
- Evenimente tracked (badge-uri: PageView, Purchase, etc.)
- Ultima verificare
- Actiuni

### Actiuni

| Actiune | Permisiune | Descriere |
|---------|-----------|-----------|
| Sincronizeaza | ads.manage | Sincronizeaza pixelii din contul selectat |
| Verifica | ads.view | Verifica starea pixelului |
| Adauga Manual | ads.manage | Dialog adaugare pixel manual |
| Sterge | ads.manage | Sterge pixelul din ERP (cu confirmare) |

### Dialog Adauga Pixel Manual

- Selectie cont
- Pixel ID
- Nume
- Butoane: Anuleaza / Adauga

---

## Alerte Advertising (`/ads/alerts`)

**Permisiune:** `ads.view`, `ads.alerts` pentru creare/stergere reguli

### Informatii Afisate

**Carduri statistice:**
- Reguli active
- Alerte noi (rosu)
- Vazute (galben)
- Rezolvate (verde)

**Doua taburi:**

#### Tab Reguli

Lista regulilor de alerta cu:
- Nume regula
- Status (Activ/Inactiv) cu switch toggle
- Tip actiune (Doar notificare / Opreste campania / Reduce bugetul)
- Conditii (ex: CPA > 50)
- Numar declansari, cooldown, ultima verificare
- Buton stergere (ads.alerts)

#### Tab Alerte

Lista alertelor declansate cu:
- Status (NEW = rosu, SEEN, RESOLVED)
- Campanie afectata + platforma
- Regula care a declansat + actiunea luata
- Snapshot metrici
- Data
- Butoane: Vazut / Rezolvat

### Dialog Creare Regula

Campuri formular:
- **Nume regula** (obligatoriu)
- **Descriere** (optional)
- **Aplicare pe**: Toate campaniile / O platforma / Un SKU
- **Conditii** (multiple, cu AND/OR):
  - Metrica: Spend, CPA, ROAS, CTR, CPM, CPC, Frequency, Conversii
  - Operator: >, <, >=, <=
  - Valoare
  - Timeframe: 3h, 6h, 12h, 24h, 48h, 7d
- **Actiune**: Doar notificare / Opreste campania / Reduce bugetul (cu procent)
- **Notificari**: email si/sau in-app
- **Cooldown**: 6h, 12h, 24h, 48h, 72h

---

## Conturi (`/ads/accounts`)

**Permisiune:** `ads.view`, `ads.accounts` pentru actiuni

### Informatii Afisate

**Tabel conturi:**
- Platforma (Meta/TikTok)
- Nume cont
- ID extern
- Status (Activ/Inactiv/Eroare)
- Ultima sincronizare
- Numar campanii
- Business Manager / Aplicatie

### Filtre

- Platforma
- Business Manager

### Actiuni

| Actiune | Descriere |
|---------|-----------|
| Conecteaza Cont | Dialog cu selectie platforma si aplicatie, apoi redirect OAuth |
| Sincronizeaza | Sincronizare campanii cu progres (faze: campaigns, ad sets, ads) |
| Sterge | Dialog confirmare stergere cont |

### Dialog Conectare Cont

1. Selectie platforma: Meta, TikTok, Google (coming soon)
2. Selectie aplicatie OAuth (din cele configurate in Settings)
3. Redirect la pagina de autorizare a platformei

### Progres Sincronizare

- Bara progres cu faze (campanii, ad sets, ads)
- Gestionare rate limit cu countdown retry
- Mesaje status per faza

---

## Setari Advertising (`/ads/settings`)

**Permisiune:** `ads.accounts`

### Informatii Afisate

**Taburi platforme:** Meta / TikTok / Google (coming soon)

Per platforma:
- Lista aplicatii OAuth configurate
- Per aplicatie: nume, App ID, status, numar conturi conectate
- Butoane: Editare / Stergere (dezactivat daca are conturi)

**Sectiune Webhook (jos):**
- Componenta `WebhookConfigSection` pentru notificari in timp real

### Dialog Adaugare/Editare Aplicatie

- Nume aplicatie
- App ID / Client ID
- App Secret / Client Secret (cu toggle vizibilitate)
- OAuth Redirect URI (cu buton copiere)
- Pasi de configurare specifici platformei
- Link catre pagina developers a platformei

### Navigare Ads

```
/ads                    -- Dashboard general
/ads/campaigns          -- Lista campanii
/ads/campaigns/create   -- Creare campanie
/ads/campaigns/[id]     -- Detaliu campanie
/ads/products           -- Performanta per SKU
/ads/pixels             -- Pixeli tracking
/ads/alerts             -- Alerte
/ads/accounts           -- Conturi conectate
/ads/settings           -- Setari aplicatii OAuth
```
