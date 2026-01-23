# Phase 2: Invoice Series Fix - Context

**Gathered:** 2026-01-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Facturile folosesc automat seria corectă bazată pe maparea magazin→companie. Utilizatorul configurează maparea o dată, iar sistemul selectează seria fără intervenție manuală la fiecare factură.

**În scope:**
- Sincronizare serii din Facturis
- Configurare mapare magazin→companie→serie
- Selectare automată serie la generare factură
- Gestionare edge cases (serie lipsă, număr invalid)
- Pagină dedicată pentru facturi eșuate

**Out of scope:**
- Modificări la procesul de generare factură în sine (doar selecția seriei)
- Alte integrări Facturis (doar serii)

</domain>

<decisions>
## Implementation Decisions

### Sincronizare Serii

- **Trigger sync:** Auto-fetch la încărcarea paginii de setări + buton manual de refresh
- **Serii modificate în Facturis:** Auto-ștergere mapări către serii care nu mai există
- **Cache:** NU - întotdeauna fetch live din Facturis API
- **Facturis indisponibil:** Blocheză generarea facturii până când API-ul e accesibil

### UI Mapare

- **Locație configurare:** Settings > Stores - seria se configurează per magazin
- **Dropdown serii:** Grupat pe companie (Aquaterra > Seria A, B; CONSTRUIM > Seria C, D)
- **Overview:** Tabel sumar cu toate mapările (Magazin | Companie | Serie) pentru audit rapid
- **Validare:** Blocheză generarea facturii pentru magazinele fără serie configurată

### Feedback Auto-selecție

- **Preview:** NU - generare imediată, fără pas de confirmare
- **Succes single:** Dialog cu rezultat (număr factură, serie folosită, link să vadă/descarce)
- **Succes bulk:** Progress bar în timpul generării, apoi dialog sumar cu toate rezultatele
- **Vizibilitate:** Numărul facturii vizibil întotdeauna în lista de comenzi (coloană dedicată)
- **Override:** NU - seria vine întotdeauna din maparea magazinului, fără excepții

### Prezentare Erori

- **Limbă:** Toate mesajele în română
- **Magazin fără mapare:** "Magazinul X nu are serie de facturare configurată. Mergi la Setări > Magazine pentru a configura."
- **Erori Facturis:** Mesaje traduse/simplificate, nu mesajele brute din API
- **Edge cases (număr zero/negativ):** Auto-corecție + notificare utilizator ce s-a întâmplat
- **Erori bulk:** Listă detaliată per comandă eșuată, cu motivul specific
- **Istoric erori:** Pagină dedicată "Facturi eșuate" unde utilizatorul poate reveni ulterior și reîncerca

### Claude's Discretion

- Algoritmul exact de auto-corecție pentru numere invalide
- Design-ul exact al paginii de facturi eșuate (layout, filtre)
- Frecvența de refresh pentru lista de serii în dropdown
- Tratamentul exact pentru serii cu caractere speciale sau nume lungi

</decisions>

<specifics>
## Specific Ideas

- Întreaga platformă este în română - toate mesajele și interfața în română
- Bulk generation trebuie să salveze istoricul erorilor pentru revenire ulterioară
- Progress bar pentru operații bulk - utilizatorul trebuie să vadă progresul în timp real

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-invoice-series-fix*
*Context gathered: 2026-01-24*
