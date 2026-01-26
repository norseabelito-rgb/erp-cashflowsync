# CashFlowSync ERP

## What This Is

Sistem ERP centralizat pentru e-commerce multi-canal care gestionează comenzi din multiple magazine Shopify și marketplace-uri (Trendyol, EMAG), emite facturi prin Facturis, generează AWB-uri prin FanCourier/SelfAWB, și oferă vizibilitate completă asupra stocurilor, livrărilor și decontărilor între firme. Destinat echipei operaționale (depozit, facturare, management) pentru gestiunea zilnică a afacerii.

## Core Value

Facturare corectă și AWB-uri emise fără erori pentru fiecare comandă, cu trasabilitate completă a cine a făcut ce și când.

## Requirements

### Validated

<!-- Funcționalități existente în cod, confirmate că funcționează -->

- ✓ Import comenzi din Shopify via webhooks și polling — existing
- ✓ Import comenzi din Trendyol — existing
- ✓ Generare facturi prin Oblio API — migrated from Facturis (Phase 2 complete)
- ✓ Generare AWB-uri prin FanCourier — existing
- ✓ Nomenclator de produse cu SKU — existing
- ✓ Gestiune stoc multi-depozit — existing
- ✓ Transfer stoc între depozite — existing
- ✓ Picking lists pentru depozit — existing
- ✓ Verificare internă AWB-uri predate — existing
- ✓ Sistem RBAC (roluri și permisiuni) — existing
- ✓ Modul Ads cu Meta și TikTok — existing
- ✓ Configurări în interfață (credențiale, imprimantă, utilizatori, firme) — existing
- ✓ Sincronizare imagini produse din Google Drive — existing
- ✓ Push produse către magazine — existing

### Active

<!-- Scope curent - ce construim/reparăm -->

- [ ] **AUDIT-01**: Audit complet al tuturor paginilor, butoanelor și funcționalităților
- [ ] **AUDIT-02**: Verificare E2E a fiecărui flow de business
- [ ] **INV-01**: Fix serii facturare - definite în Facturis, folosite după logica magazin/firmă
- [ ] **INV-02**: Implementare corectă logică decontare internă (Aquaterra → firmă secundară)
- [ ] **INV-03**: Facturi la preț achiziție + 10% pentru comenzi firmă secundară încasate
- [ ] **INV-04**: Selecție comenzi firmă secundară cu colete "încasate" pentru decontare săptămânală
- [ ] **FLOW-01**: Blocare emitere factură până la închidere fișă transfer
- [ ] **FLOW-02**: AWB emis pe contul firmei care facturează (user dedicat per firmă)
- [ ] **UX-01**: Îmbunătățiri design conform best practices
- [ ] **UX-02**: Tooltips pe fiecare buton
- [ ] **TASK-01**: Modul task management operațional (depozit, livrări, verificări)
- [ ] **TASK-02**: Modul task management business (proiecte, to-do-uri, deadline-uri)
- [ ] **DOC-01**: Pagină documentație actualizată
- [ ] **QA-01**: Verificare finală că totul funcționează impecabil

### Out of Scope

<!-- Exclus explicit din acest milestone -->

- Integrare Temu — după stabilizarea sistemului curent
- Consolidare Trendyol — după stabilizarea sistemului curent
- Alte marketplace-uri noi — după stabilizarea sistemului curent
- Mobile app — web-first

## Context

**Situație curentă:**
- Sistem dezvoltat iterativ cu Claude, dar context pierdut pe parcurs
- Migrare recentă SmartBill → Facturis a cauzat probleme cu seriile de facturare
- Funcționalități adăugate și modificate fără documentație actualizată
- Cod "varză" în unele zone - componente monolitice (2000+ linii)

**Structura business:**
- 2 firme active: Aquaterra (principală) + firmă secundară (ex: Construim Destine)
- 5-6 magazine distribuite pe cele 2 firme
- Fiecare magazin are propria serie de facturare
- Depozit operațional unic: Săcueni (pentru coletare/AWB)
- Decontare internă săptămânală pentru comenzi firmă secundară

**Flow decontare internă:**
1. Comandă intră → ERP setează firma în funcție de magazin
2. Verificare stoc Săcueni → propunere transfer dacă lipsește
3. Nu se emite factură până nu se închide fișa de transfer
4. AWB emis pe contul firmei care facturează
5. Factură emisă către client
6. Comenzile firmei secundare intră în "decontare internă"
7. Săptămânal: cumul comenzi încasate la preț achiziție + 10%
8. Aquaterra emite factură internă către firma secundară

**Probleme tehnice identificate (din CONCERNS.md):**
- Invoice Series Auto-Correct poate avea edge cases
- Componente monolitice (orders/page.tsx 2301 linii)
- No transaction handling pentru order processing
- OAuth state management în memorie
- Missing input validation în API routes
- N+1 query patterns în list views
- No integration tests pentru RBAC

## Constraints

- **Tech stack**: Next.js 14 + Prisma + PostgreSQL — menținut
- **Deployment**: Railway — menținut
- **Integrări externe**: Oblio (facturi), FanCourier/SelfAWB (AWB), Shopify/Trendyol (comenzi)
- **Compatibilitate**: Logica existentă trebuie menținută unde funcționează corect
- **Stabilitate**: Prioritate pe fix-uri înainte de features noi

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Migrare SmartBill → Facturis | Cerință business | ⚠️ Revisit - a cauzat probleme |
| Serii facturare definite în Facturis | Sursa adevărului să fie Facturis | — Pending |
| Audit complet înainte de fix-uri | Înțelegere completă a stării curente | — Pending |
| Task management în același sistem | O singură platformă pentru echipă | — Pending |

---
*Last updated: 2026-01-23 after initialization*
