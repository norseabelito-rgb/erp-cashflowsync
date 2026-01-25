# Phase 4: Flow Integrity - Context

**Gathered:** 2026-01-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Asigură consistența datelor prin blocarea condițională a facturării când există transferuri active, și rutează generarea AWB către contul de curier corect al companiei. Fiecare companie poate avea cont SelfAWB propriu; sistemul selectează automat bazat pe store-ul comenzii.

</domain>

<decisions>
## Implementation Decisions

### Transfer Blocking Rules
- Avertisment (nu blocare) când comanda are transfer nefinalizat
- Avertisment detaliat: număr transfer, status, acțiune recomandată
- Utilizatorul trebuie să confirme explicit (checkbox/buton separat) pentru a continua
- Decizia de a continua se loghează pentru audit trail

### Block Messaging & UX
- Modal/popup la acțiunea de facturare (nu banner permanent)
- Ton de atenționare: "Atenție! Transferul #X nu e finalizat. Risc de eroare la facturare."
- Culoare galben/orange (warning standard)
- Se loghează când cineva continuă în ciuda avertismentului

### Courier Account Mapping
- Număr variabil de companii cu conturi SelfAWB separate
- Configurare în Settings > Companies (câmpuri SelfAWB pe pagina de editare companie)
- Date necesare: Username + Password + Client ID
- Dacă companie nu are cont configurat: avertizează și lasă utilizatorul să aleagă manual din conturile disponibile

### Mismatch Prevention
- AWB/Factură mismatch: avertizează dar permite continuarea
- Auto-select cont AWB bazat pe: Store → Company → Cont SelfAWB al companiei
- Store-ul comenzii nu se schimbă după creare (nu e un scenariu real)
- Mismatch-urile se loghează pentru audit

### Claude's Discretion
- Structura exactă a tabelei de audit logging
- Design-ul modal-ului de confirmare
- Validarea credențialelor SelfAWB la salvare

</decisions>

<specifics>
## Specific Ideas

- Același sistem de logging pentru ambele tipuri de override (transfer warning și mismatch warning)
- Warning modal ar trebui să arate clar ce risc există și ce acțiune ar rezolva problema

</specifics>

<deferred>
## Deferred Ideas

None — discuția a rămas în scope-ul fazei

</deferred>

---

*Phase: 04-flow-integrity*
*Context gathered: 2026-01-25*
