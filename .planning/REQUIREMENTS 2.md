# Requirements: CashFlowSync ERP

**Defined:** 2026-01-23
**Core Value:** Facturare corecta si AWB-uri emise fara erori pentru fiecare comanda, cu trasabilitate completa

## v1 Requirements

Requirements pentru stabilizarea si imbunatatirea sistemului curent.

### Audit

- [x] **AUDIT-01**: Audit complet al fiecarei pagini din dashboard
- [x] **AUDIT-02**: Audit fiecare API endpoint (functionalitate, validare, erori)
- [x] **AUDIT-03**: Audit flows E2E (comanda > factura > AWB > livrare > incasare)
- [x] **AUDIT-04**: Audit cod si arhitectura (identificare tech debt, refactoring necesar)
- [x] **AUDIT-05**: Documentare discrepante intre cod si comportament asteptat

### Facturare

- [ ] **INV-01**: Serii facturare definite in Facturis, selectate automat per magazin/firma
- [ ] **INV-02**: Mapare corecta magazin > firma > serie facturare
- [ ] **INV-03**: Logica decontare interna: comenzi firma secundara > tracking separat
- [ ] **INV-04**: Selectie comenzi firma secundara cu status "incasat" pentru decontare
- [ ] **INV-05**: Calcul automat cumul produse la pret achizitie + 10% adaos
- [ ] **INV-06**: Generare factura interna Aquaterra > firma secundara (saptamanal)
- [ ] **INV-07**: AWB emis pe contul firmei care factureaza (user dedicat per firma in SelfAWB)
- [ ] **INV-08**: Verificare si fix pentru edge cases in auto-correct serii

### Flow Integrity

- [ ] **FLOW-01**: Blocare emitere factura pana la inchidere fisa transfer
- [ ] **FLOW-02**: AWB emis pe contul firmei care factureaza

### UX/Design

- [ ] **UX-01**: Tooltips descriptive pe toate butoanele si actiunile
- [ ] **UX-02**: Consistenta vizuala (culori, spatiere, fonturi, shadows)
- [ ] **UX-03**: Imbunatatiri responsive pentru mobile si tablet
- [ ] **UX-04**: Loading states clare si feedback vizual pentru toate operatiunile
- [ ] **UX-05**: Error states clare cu mesaje actionable
- [ ] **UX-06**: Empty states cu call-to-action

### Task Management

- [ ] **TASK-01**: Model de date pentru task-uri (titlu, descriere, tip, prioritate, deadline, assignee)
- [ ] **TASK-02**: UI pentru vizualizare si management task-uri
- [ ] **TASK-03**: Task-uri operationale zilnice pentru depozit (picking, verificare, expediere)
- [ ] **TASK-04**: To-do-uri business (proiecte, deadline-uri, responsabili)
- [ ] **TASK-05**: Sistem notificari si remindere pentru deadline-uri
- [ ] **TASK-06**: Rapoarte activitate (cine a facut ce, cand)
- [ ] **TASK-07**: Auto-creare task-uri din evenimente sistem (ex: tura AWB > task picking)
- [ ] **TASK-08**: Auto-asignare task-uri la persoanele responsabile
- [ ] **TASK-09**: Auto-confirmare task-uri cand sistemul detecteaza completare

### Documentatie

- [ ] **DOC-01**: Pagina documentatie actualizata in aplicatie
- [ ] **DOC-02**: Documentare flows de business (cu diagrame)
- [ ] **DOC-03**: Documentare configurari si setari
- [ ] **DOC-04**: Ghid utilizare pentru fiecare modul

### Quality Assurance

- [ ] **QA-01**: Verificare finala toate flows functioneaza corect
- [ ] **QA-02**: Fix pentru toate bugs identificate in audit
- [ ] **QA-03**: Test coverage pentru flows critice (facturare, AWB)
- [ ] **QA-04**: Performance check pentru operatiuni frecvente

## v2 Requirements

Deferred pentru dupa stabilizare.

### Integrari Noi

- **INT-01**: Integrare Temu (import comenzi, push produse)
- **INT-02**: Consolidare si imbunatatire integrare Trendyol
- **INT-03**: Alte marketplace-uri (EMAG imbunatatit, eMAG Marketplace)

### Imbunatatiri Avansate

- **ADV-01**: Job queue pentru operatiuni async (sync-uri mari)
- **ADV-02**: Rate limiting pe API endpoints
- **ADV-03**: Backup verification automatizat
- **ADV-04**: GDPR data export feature

## Out of Scope

| Feature | Reason |
|---------|--------|
| Mobile app | Web-first, responsive e suficient pentru acum |
| Multi-language | Doar romana pentru echipa interna |
| Public API | Sistem intern, nu expunem API extern |
| Real-time collaboration | Nu e necesar pentru workflow-ul curent |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUDIT-01 | Phase 1: System Audit | Complete |
| AUDIT-02 | Phase 1: System Audit | Complete |
| AUDIT-03 | Phase 1: System Audit | Complete |
| AUDIT-04 | Phase 1: System Audit | Complete |
| AUDIT-05 | Phase 1: System Audit | Complete |
| INV-01 | Phase 2: Invoice Series Fix | Pending |
| INV-02 | Phase 2: Invoice Series Fix | Pending |
| INV-08 | Phase 2: Invoice Series Fix | Pending |
| INV-03 | Phase 3: Internal Settlement | Pending |
| INV-04 | Phase 3: Internal Settlement | Pending |
| INV-05 | Phase 3: Internal Settlement | Pending |
| INV-06 | Phase 3: Internal Settlement | Pending |
| INV-07 | Phase 4: Flow Integrity | Pending |
| FLOW-01 | Phase 4: Flow Integrity | Pending |
| FLOW-02 | Phase 4: Flow Integrity | Pending |
| QA-02 | Phase 5: Known Bug Fixes | Pending |
| UX-01 | Phase 6: UX Foundation | Pending |
| UX-02 | Phase 6: UX Foundation | Pending |
| UX-03 | Phase 6: UX Foundation | Pending |
| UX-04 | Phase 6: UX Foundation | Pending |
| UX-05 | Phase 6: UX Foundation | Pending |
| UX-06 | Phase 6: UX Foundation | Pending |
| TASK-01 | Phase 7: Task Management Core | Pending |
| TASK-02 | Phase 7: Task Management Core | Pending |
| TASK-03 | Phase 7: Task Management Core | Pending |
| TASK-04 | Phase 7: Task Management Core | Pending |
| TASK-05 | Phase 8: Task Management Advanced | Pending |
| TASK-06 | Phase 8: Task Management Advanced | Pending |
| TASK-07 | Phase 8: Task Management Advanced | Pending |
| TASK-08 | Phase 8: Task Management Advanced | Pending |
| TASK-09 | Phase 8: Task Management Advanced | Pending |
| DOC-01 | Phase 9: Documentation | Pending |
| DOC-02 | Phase 9: Documentation | Pending |
| DOC-03 | Phase 9: Documentation | Pending |
| DOC-04 | Phase 9: Documentation | Pending |
| QA-01 | Phase 10: Quality Assurance | Pending |
| QA-03 | Phase 10: Quality Assurance | Pending |
| QA-04 | Phase 10: Quality Assurance | Pending |

**Coverage:**
- v1 requirements: 35 total
- Mapped to phases: 35
- Unmapped: 0

---
*Requirements defined: 2026-01-23*
*Last updated: 2026-01-23 after roadmap creation*
