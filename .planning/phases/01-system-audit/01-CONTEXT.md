# Phase 1: System Audit - Context

**Gathered:** 2026-01-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Înțelegerea completă a stării actuale a sistemului ERP — documentarea fiecărei pagini, API și flow de business înainte de a face schimbări. Acesta este un audit, nu o implementare.

</domain>

<decisions>
## Implementation Decisions

### Formatul documentației
- Audit comprehensiv: fiecare câmp, buton, stare documentată
- Format mixt: tabele pentru date/câmpuri, proză pentru flow-uri și comportamente
- Include diagrame și screenshot-uri unde adaugă claritate
- Limba: Română (termeni de business rămân naturali — factura, AWB, decontare)

### Priorități de audit
- Flow-ul E2E complet: order → factură → AWB → livrare → încasare — toate etapele la fel de importante
- Pagina de Orders este principala preocupare — acolo se face munca zilnică
- Integrări de auditat în detaliu:
  - Facturis (facturare) — cel mai mare pain point
  - SelfAWB (courier) — expediere
  - Shopify (sursa comenzilor) — order import, product sync, stock updates
- Comenzile vin din Shopify (viitor: Trendyol, Temu)
- NOTĂ: FreshSales/BaseLinker menționate în cod — utilizatorul nu le folosește, probabil cod mort

### Baseline și clasificare
- Sursa de adevăr: utilizatorul — întreb când am neclarități
- Clasificare issues: **Blochează munca** / **Deranjează** / **Cosmetic**
- Flaggez TOT codul mort și feature-urile nefolosite
- Documentez riscuri și tech debt chiar dacă funcționează

### Abordare verificare
- Lucrez direct în folderul git
- App live pe Railway: https://erp.cashflowgrup.net (PostgreSQL)
- Date reale în producție — utilizatorul creează date de test manual dacă e nevoie
- Când trebuie verificat ceva:
  - Eu dau instrucțiuni pas-cu-pas (foarte detaliate: "Click X, apoi Y, verifică dacă Z apare")
  - Utilizatorul execută și raportează ce se întâmplă
- Include review-ul schemei bazei de date
- Întrerup auditul pentru issues critice — nu aștept să termin

### Claude's Discretion
- Structura exactă a documentelor de audit
- Ordinea în care auditez paginile (în limita priorităților stabilite)
- Nivelul de detaliu pentru diagrame

</decisions>

<specifics>
## Specific Ideas

- "Trebuie să mă întrebi pe mine mereu când ai neclarități" — utilizatorul este sursa de adevăr pentru cum ar trebui să funcționeze business-ul
- FreshSales/BaseLinker există în cod dar utilizatorul nu le folosește — de verificat dacă e cod mort
- Comenzile vin doar din Shopify (nu FreshSales/BaseLinker) — viitor: Trendyol, Temu

</specifics>

<deferred>
## Deferred Ideas

None — discuția a rămas în scope-ul fazei de audit.

</deferred>

---

*Phase: 01-system-audit*
*Context gathered: 2026-01-23*
