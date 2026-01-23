# Remaining Pages - Audit

**Auditat:** 2026-01-23

Acest document acopera paginile secundare din dashboard care nu au audit individual detaliat. Pentru fiecare pagina: scop, dimensiune, si observatii.

---

## Pagini Active (Folosite Regulat)

### /tracking (662 linii)
**Scop:** Tracking comenzi in curs de livrare. Dashboard centralizat pentru AWB-uri active.
**Elemente cheie:** Filtre status, lista AWB-uri cu detalii, quick actions
**Observatii:** Overlap partial cu pagina /awb. Recomandat: consolidare sau diferentiere clara.
**Status:** ACTIV

### /picking (439 linii)
**Scop:** Picking lists pentru procesare comenzi in depozit. Grupeaza produse din mai multe comenzi.
**Elemente cheie:** Lista picking lists, generare noua, status tracking
**Observatii:** Folosit pentru bulk order processing.
**Status:** ACTIV

### /stores (578 linii)
**Scop:** Gestionare magazine Shopify conectate.
**Elemente cheie:** Lista magazine, add/edit/delete, test conexiune
**Observatii:** Partial duplicat cu Settings > Magazine. Recomandat: redirect la Settings.
**Status:** ACTIV (posibil redundant)

### /handover (798 linii)
**Scop:** Predare colete la curier (FanCourier pickup manifest).
**Elemente cheie:** Selectie AWB-uri pentru pickup, generare borderou
**Observatii:** Workflow important pentru livrari zilnice.
**Status:** ACTIV

### /sync-history (340 linii)
**Scop:** Istoric sincronizari cu Shopify.
**Elemente cheie:** Log sync-uri, erori, retry
**Observatii:** Util pentru debugging.
**Status:** ACTIV

### /processing-errors (376 linii)
**Scop:** Erori de procesare comenzi (facturi, AWB-uri failed).
**Elemente cheie:** Lista erori cu actiuni retry/skip
**Observatii:** Partial integrat in pagina Orders (tab Erori).
**Status:** ACTIV (posibil redundant)

### /notifications (254 linii)
**Scop:** Notificari sistem (comenzi noi, erori, etc).
**Elemente cheie:** Lista notificari, mark as read
**Observatii:** -
**Status:** ACTIV

### /intercompany (557 linii)
**Scop:** Transferuri si facturare intre firme/entitati juridice.
**Elemente cheie:** Lista transferuri, creare transfer nou, rapoarte
**Observatii:** Functional pentru multi-company setup.
**Status:** ACTIV

### /categories (342 linii)
**Scop:** Gestionare categorii produse.
**Elemente cheie:** Lista/tree categorii, CRUD
**Observatii:** -
**Status:** ACTIV

---

## Pagini de Verificat Utilizare

### /ads (418 linii)
**Scop:** Dashboard campanii publicitare (Meta Ads, Google Ads).
**Elemente cheie:** Lista campanii, statistici ROAS, spend, conversii
**Observatii:**
- UI exista si e functional
- CONCERNS.md nu mentioneaza probleme
- **NECESITA CONFIRMARE:** Este folosit activ sau experimental?
**Status:** DE VERIFICAT

### /trendyol (378 linii)
**Scop:** Integrare Trendyol marketplace - produse si comenzi.
**Elemente cheie:** Sync produse, lista comenzi Trendyol, status
**Observatii:**
- UI complet implementat
- Settings > Trendyol are configurare completa
- **NECESITA CONFIRMARE:** Este live cu comenzi reale sau in testing?
**Status:** DE VERIFICAT

### /docs (1886 linii)
**Scop:** Documentatie interna / help pages.
**Elemente cheie:** Continut documentatie
**Observatii:**
- Foarte mare (1886 linii) - posibil include markdown rendering
- **NECESITA CONFIRMARE:** Este actualizat si folosit?
**Status:** DE VERIFICAT

---

## Pagini Minore

### /activity (297 linii)
**Scop:** Activity log / audit trail.
**Elemente cheie:** Lista actiuni utilizatori
**Observatii:** Util pentru audit.
**Status:** ACTIV

### /preferences (254 linii)
**Scop:** Preferinte utilizator (UI settings, notificari).
**Elemente cheie:** Form preferinte
**Observatii:** -
**Status:** ACTIV

### /profile (250 linii)
**Scop:** Profil utilizator curent.
**Elemente cheie:** Info cont, schimbare parola
**Observatii:** -
**Status:** ACTIV

---

## Dead Code Candidates - FLAGGED

### FreshSales Integration
**Mentionat in:** CONCERNS.md, ANALYSIS
**Gasit in UI:** **NU** - Nu apare in Settings sau alte pagini dashboard
**Recomandare:** Verificat backend (API routes, lib/) pentru cleanup

### BaseLinker Integration
**Mentionat in:** CONCERNS.md
**Gasit in UI:** **NU** - Nu apare in Settings sau alte pagini dashboard
**Recomandare:** Verificat backend pentru cleanup

### Ads Module (/ads)
**Dimensiune:** 418 linii
**Integrare:** Meta Ads, Google Ads
**UI Status:** Complet implementat
**Problema:** CONCERNS.md mentioneaza "~80KB of code, usage unclear"
**Recomandare:** CONFIRMARE UTILIZATOR - Este folosit activ?

### Trendyol Integration (/trendyol + Settings tab)
**Dimensiune:** 378 linii (pagina) + ~300 linii (Settings tab)
**Integrare:** Trendyol Marketplace API
**UI Status:** Complet implementat (produse, comenzi, sync)
**Problema:** Status neclar - testing sau productie?
**Recomandare:** CONFIRMARE UTILIZATOR - Este live cu comenzi reale?

---

## Sumar pentru User Review

### Intrebari pentru Utilizator:

1. **Ads module (/ads)**
   - Este folosit zilnic/saptamanal pentru monitorizare campanii?
   - Sau este experimental/nefolosit?

2. **Trendyol integration (/trendyol)**
   - Exista comenzi reale de pe Trendyol?
   - Este in mod test sau productie?

3. **Documentatie (/docs)**
   - Este actualizata si utila?
   - Sau poate fi stearsa/simplificata?

4. **Redundante posibile**
   - /stores vs Settings > Magazine - prefer una?
   - /processing-errors vs Orders > Tab Erori - prefer una?
   - /tracking vs /awb - diferenta intentionata?

---

*Audit complet: 2026-01-23*
