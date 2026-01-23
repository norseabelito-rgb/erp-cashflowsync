# Settings (Setari) - Audit

**Auditat:** 2026-01-23
**Status:** Functioneaza
**URL:** /settings
**Fisier:** src/app/(dashboard)/settings/page.tsx
**Linii cod:** 1624 (a doua cea mai mare pagina)

## Scopul Paginii

Centrul de configurare pentru toate integrarile si preferintele aplicatiei. Acoperă: magazine Shopify, Trendyol marketplace, Google Drive (imagini produse), Facturis (contabilitate), FanCourier (curierat), AI Insights, si Backup automat.

## Elemente UI

### Tab-uri Principale

| Tab | Functionalitate | Status | Linie cod |
|-----|-----------------|--------|-----------|
| Magazine | Lista si configurare magazine Shopify | OK | 376-379, 406-471 |
| Trendyol | Integrare marketplace Turcia | OK | 380-383, 473-772 |
| Produse | Google Drive pentru imagini | OK | 384-387, 774-927 |
| Contabilitate | Redirect la config firme/serii | OK | 388-391, 929-989 |
| Curieri | FanCourier API si setari AWB | OK | 392-395, 991-1212 |
| AI | Claude AI pentru insights | OK | 396-399, 1214-1378 |
| Backup | Backup automat in Google Drive | OK | 400-403, 1380-1503 |

### Tab Magazine

| Element | Functionalitate | Status | Linie cod |
|---------|-----------------|--------|-----------|
| Tabel magazine | Lista magazine cu firma asociata | OK | 426-468 |
| Adauga magazin | Dialog pentru magazin nou Shopify | OK | 414-417, 1506-1557 |
| Editeaza magazin | Asociere magazin cu firma facturare | OK | 460-462, 1559-1620 |

### Tab Trendyol

| Element | Functionalitate | Status | Linie cod |
|---------|-----------------|--------|-----------|
| ID Comerciant | Input supplier ID | OK | 494-505 |
| Cheie API | Input API key | OK | 506-516 |
| Secret API | Input cu visibility toggle | OK | 517-539 |
| Mod Test | Switch test/productie | OK | 543-554 |
| Cod Tara StoreFront | Select pentru tara (RO, BG, HU, etc.) | OK | 555-575 |
| Curs RON/EUR | Input conversie valuta | OK | 576-588 |
| Testeaza conexiunea | Test API + auto-detectare storefront | OK | 592-651 |
| Vezi Categorii | Fetch categorii din Trendyol | OK | 672-700 |
| Cauta Brand | Cautare brand dupa nume | OK | 702-730 |
| Vezi Produse | Lista produse din cont | OK | 732-761 |

### Tab Produse (Google Drive)

| Element | Functionalitate | Status | Linie cod |
|---------|-----------------|--------|-----------|
| URL Folder Parinte | Input URL Google Drive | OK | 784-795 |
| Service Account JSON | Textarea pentru credentials | OK | 797-810 |
| Structura recomandata | Info box cu exemplu structura | OK | 812-834 |
| Testeaza conexiunea | Verifica acces folder | OK | 836-874 |
| Sincronizeaza acum | Sync imagini cu produse | OK | 875-916 |

### Tab Contabilitate

| Element | Functionalitate | Status | Linie cod |
|---------|-----------------|--------|-----------|
| Info box | Explicatie configurare la nivel de firma | OK | 941-950 |
| Configureaza firmele | Link la /settings/companies | OK | 953-959 |
| Gestioneaza serii | Link la /settings/invoice-series | OK | 960-966 |

### Tab Curieri (FanCourier)

| Element | Functionalitate | Status | Linie cod |
|---------|-----------------|--------|-----------|
| Client ID | Input | OK | 1000-1007 |
| Username | Input | OK | 1008-1015 |
| Parola | Input cu visibility toggle | OK | 1016-1033 |
| Testeaza conexiunea | Test API FanCourier | OK | 1036-1054 |
| Tip Serviciu | Select cu optiune reload servicii | OK | 1069-1097 |
| Tip Plata | Select (destinatar/expeditor) | OK | 1098-1110 |
| Greutate Default | Input numeric | OK | 1113-1122 |
| Numar Colete Default | Input numeric | OK | 1123-1131 |
| Date Expeditor | Form complet (nume, telefon, adresa) | OK | 1136-1204 |

### Tab AI Insights

| Element | Functionalitate | Status | Linie cod |
|---------|-----------------|--------|-----------|
| API Key Claude | Input cu visibility toggle | OK | 1227-1265 |
| Model AI | Select (Sonnet/Opus/Haiku) | OK | 1269-1302 |
| Analiza zilnica automata | Switch enable/disable | OK | 1305-1338 |
| Ora analizei | Time input | OK | 1324-1337 |
| Status ultima analiza | Display date | OK | 1340-1348 |
| Info Card | Explicatii AI capabilities | OK | 1352-1370 |

### Tab Backup

| Element | Functionalitate | Status | Linie cod |
|---------|-----------------|--------|-----------|
| Folder Google Drive | Input URL/ID folder | OK | 1394-1418 |
| Backup automat zilnic | Switch enable/disable | OK | 1420-1435 |
| Ora backup | Time input | OK | 1438-1452 |
| Ultimul backup | Display date | OK | 1454-1462 |
| Lista backup-uri | Link la /settings/backup | OK | 1466-1472 |
| Creaza backup acum | Trigger manual backup | OK | 1473-1492 |

### Modale/Dialoguri

| Modal | Scop | Status | Linie cod |
|-------|------|--------|-----------|
| Adauga magazin Shopify | Form (nume, domeniu, access token) | OK | 1506-1557 |
| Editeaza magazin | Asociere cu firma | OK | 1559-1620 |

## Comportament Observat

### Integrari Active

1. **Shopify:** Magazine multiple, access tokens, asociere cu firme
2. **FanCourier:** Credentiale API, servicii dinamice, date expeditor
3. **Facturis:** Configurare la nivel de firma (redirect)
4. **Google Drive:** Imagini produse, backup baza date
5. **Trendyol:** Marketplace (categorii, branduri, produse)
6. **Claude AI:** Insights si recomandari

### Test Conexiuni
- FanCourier: Test cu credentiale din formular (nu cele salvate)
- Trendyol: Salveaza mai intai, apoi testeaza
- Google Drive: Test via endpoint sync-images

## Discrepante

| ID | Comportament Asteptat | Comportament Actual | Severitate |
|----|----------------------|---------------------|------------|
| D1 | Validare formular inainte de submit | Validare minima (doar required) | Cosmetic |
| D2 | Indicatori stare conexiune per tab | Doar buton "Testeaza" manual | Cosmetic |
| D3 | Trendyol: Curs valutar automat (ex. BNR) | Curs manual configurat | Deranjeaza |

## Cod Mort / Nefolosit

**FreshSales / BaseLinker:** NU sunt prezente in Settings page. Verificat CONCERNS.md - posibil mentionate in alte parti ale codebase-ului, dar NU in UI Settings.

## Note pentru Planificare

### Referinta CONCERNS.md
- **FreshSales integration:** NEFOLOSIT - verificat, nu apare in Settings
- **BaseLinker:** NEFOLOSIT - verificat, nu apare in Settings

### Dimensiune Componenta
- 1624 linii - a doua cea mai mare dupa Orders (2301)
- Recomandat: Extragere in componente separate per tab
- Potential: `SettingsStores`, `SettingsTrendyol`, `SettingsCourier`, etc.

### Integrari Confirmate Active
1. **Shopify** - folosit zilnic
2. **Facturis** - folosit zilnic
3. **FanCourier** - folosit zilnic
4. **Google Drive** - imagini + backup
5. **Trendyol** - ACTIV (are UI complet, test conexiune, browse categorii)
6. **Claude AI** - ACTIV (configurat, daily analysis)

### Integrari de Verificat cu Utilizator
- **Trendyol:** Status real (testing vs productie)? Volum comenzi?
- **AI Insights:** E folosit zilnic sau experimental?

---

*Audit complet: 2026-01-23*
