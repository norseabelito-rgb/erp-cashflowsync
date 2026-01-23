# Requirements: CashFlowSync ERP

**Defined:** 2026-01-23
**Core Value:** Facturare corectă și AWB-uri emise fără erori pentru fiecare comandă, cu trasabilitate completă

## v1 Requirements

Requirements pentru stabilizarea și îmbunătățirea sistemului curent.

### Audit

- [ ] **AUDIT-01**: Audit complet al fiecărei pagini din dashboard
- [ ] **AUDIT-02**: Audit fiecare API endpoint (funcționalitate, validare, erori)
- [ ] **AUDIT-03**: Audit flows E2E (comandă → factură → AWB → livrare → încasare)
- [ ] **AUDIT-04**: Audit cod și arhitectură (identificare tech debt, refactoring necesar)
- [ ] **AUDIT-05**: Documentare discrepanțe între cod și comportament așteptat

### Facturare

- [ ] **INV-01**: Serii facturare definite în Facturis, selectate automat per magazin/firmă
- [ ] **INV-02**: Mapare corectă magazin → firmă → serie facturare
- [ ] **INV-03**: Logică decontare internă: comenzi firmă secundară → tracking separat
- [ ] **INV-04**: Selecție comenzi firmă secundară cu status "încasat" pentru decontare
- [ ] **INV-05**: Calcul automat cumul produse la preț achiziție + 10% adaos
- [ ] **INV-06**: Generare factură internă Aquaterra → firmă secundară (săptămânal)
- [ ] **INV-07**: AWB emis pe contul firmei care facturează (user dedicat per firmă în SelfAWB)
- [ ] **INV-08**: Verificare și fix pentru edge cases în auto-correct serii

### UX/Design

- [ ] **UX-01**: Tooltips descriptive pe toate butoanele și acțiunile
- [ ] **UX-02**: Consistență vizuală (culori, spațiere, fonturi, shadows)
- [ ] **UX-03**: Îmbunătățiri responsive pentru mobile și tablet
- [ ] **UX-04**: Loading states clare și feedback vizual pentru toate operațiunile
- [ ] **UX-05**: Error states clare cu mesaje actionable
- [ ] **UX-06**: Empty states cu call-to-action

### Task Management

- [ ] **TASK-01**: Model de date pentru task-uri (titlu, descriere, tip, prioritate, deadline, assignee)
- [ ] **TASK-02**: UI pentru vizualizare și management task-uri
- [ ] **TASK-03**: Task-uri operaționale zilnice pentru depozit (picking, verificare, expediere)
- [ ] **TASK-04**: To-do-uri business (proiecte, deadline-uri, responsabili)
- [ ] **TASK-05**: Sistem notificări și remindere pentru deadline-uri
- [ ] **TASK-06**: Rapoarte activitate (cine a făcut ce, când)
- [ ] **TASK-07**: Auto-creare task-uri din evenimente sistem (ex: tură AWB → task picking)
- [ ] **TASK-08**: Auto-asignare task-uri la persoanele responsabile
- [ ] **TASK-09**: Auto-confirmare task-uri când sistemul detectează completare

### Documentație

- [ ] **DOC-01**: Pagină documentație actualizată în aplicație
- [ ] **DOC-02**: Documentare flows de business (cu diagrame)
- [ ] **DOC-03**: Documentare configurări și setări
- [ ] **DOC-04**: Ghid utilizare pentru fiecare modul

### Quality Assurance

- [ ] **QA-01**: Verificare finală toate flows funcționează corect
- [ ] **QA-02**: Fix pentru toate bugs identificate în audit
- [ ] **QA-03**: Test coverage pentru flows critice (facturare, AWB)
- [ ] **QA-04**: Performance check pentru operațiuni frecvente

## v2 Requirements

Deferred pentru după stabilizare.

### Integrări Noi

- **INT-01**: Integrare Temu (import comenzi, push produse)
- **INT-02**: Consolidare și îmbunătățire integrare Trendyol
- **INT-03**: Alte marketplace-uri (EMAG îmbunătățit, eMAG Marketplace)

### Îmbunătățiri Avansate

- **ADV-01**: Job queue pentru operațiuni async (sync-uri mari)
- **ADV-02**: Rate limiting pe API endpoints
- **ADV-03**: Backup verification automatizat
- **ADV-04**: GDPR data export feature

## Out of Scope

| Feature | Reason |
|---------|--------|
| Mobile app | Web-first, responsive e suficient pentru acum |
| Multi-language | Doar română pentru echipa internă |
| Public API | Sistem intern, nu expunem API extern |
| Real-time collaboration | Nu e necesar pentru workflow-ul curent |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUDIT-01 | Phase 1 | Pending |
| AUDIT-02 | Phase 1 | Pending |
| AUDIT-03 | Phase 1 | Pending |
| AUDIT-04 | Phase 1 | Pending |
| AUDIT-05 | Phase 1 | Pending |
| INV-01 | Phase 2 | Pending |
| INV-02 | Phase 2 | Pending |
| INV-03 | Phase 2 | Pending |
| INV-04 | Phase 2 | Pending |
| INV-05 | Phase 2 | Pending |
| INV-06 | Phase 2 | Pending |
| INV-07 | Phase 2 | Pending |
| INV-08 | Phase 2 | Pending |
| UX-01 | Phase 3 | Pending |
| UX-02 | Phase 3 | Pending |
| UX-03 | Phase 3 | Pending |
| UX-04 | Phase 3 | Pending |
| UX-05 | Phase 3 | Pending |
| UX-06 | Phase 3 | Pending |
| TASK-01 | Phase 4 | Pending |
| TASK-02 | Phase 4 | Pending |
| TASK-03 | Phase 4 | Pending |
| TASK-04 | Phase 4 | Pending |
| TASK-05 | Phase 4 | Pending |
| TASK-06 | Phase 4 | Pending |
| TASK-07 | Phase 4 | Pending |
| TASK-08 | Phase 4 | Pending |
| TASK-09 | Phase 4 | Pending |
| DOC-01 | Phase 5 | Pending |
| DOC-02 | Phase 5 | Pending |
| DOC-03 | Phase 5 | Pending |
| DOC-04 | Phase 5 | Pending |
| QA-01 | Phase 6 | Pending |
| QA-02 | Phase 6 | Pending |
| QA-03 | Phase 6 | Pending |
| QA-04 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 32 total
- Mapped to phases: 32
- Unmapped: 0 ✓

---
*Requirements defined: 2026-01-23*
*Last updated: 2026-01-23 after initial definition*
