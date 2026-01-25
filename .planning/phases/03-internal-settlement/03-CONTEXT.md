# Phase 3: Internal Settlement - Context

**Gathered:** 2026-01-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Track orders from secondary company stores and settle weekly via internal invoicing from Aquaterra. Orders become eligible when payment is collected (AWB "încasat" status). User selects orders, system calculates acquisition price + markup, and generates internal invoice in Oblio.

</domain>

<decisions>
## Implementation Decisions

### Order flagging
- Comenzile se identifică **după magazin** — magazinul aparține unei firme, comanda moștenește firma
- **Firmă secundară = orice firmă în afară de Aquaterra** (Aquaterra e firma principală)
- Eligibilitate pentru decontare: când **coletul e "încasat"** (status AWB confirmă încasarea rambursului)
- Comenzile plătite online (non-ramburs): **intră în decontare, dar marcate diferit** — au flag "deja încasat"

### Selection workflow
- **Combinație**: pre-selectează toate comenzile eligibile din perioadă, user-ul poate exclude manual
- Filtru implicit: **de la ultima decontare** — arată tot ce n-a fost încă decontat
- Coloane afișate: **detaliat** — nr. comandă, dată, total, status plată, magazin, client, nr. produse, preț achiziție
- **Preview obligatoriu** înainte de generare — sumar cu total, nr. comenzi, valoare calculată

### Price calculation
- Preț achiziție vine **din nomenclator** — câmp pe produs în baza de date
- Adaosul se aplică **pe totalul comenzii** — sumă prețuri achiziție produse, apoi +X% pe total
- Dacă produs fără preț achiziție: **avertizare** — se poate include, dar apare warning în preview
- Procentul de adaos: **configurabil per firmă** — fiecare firmă secundară poate avea alt procent (default 10%)

### Invoice output
- Linii factură: **o linie per produs** — toate produsele din toate comenzile, grupate
- Serie facturare: **serie dedicată** în Oblio doar pentru decontare (ex: "DEC" sau "DECONT")
- Descriere factură: **ambele** — perioada + lista scurtă de numere comenzi
- Istoric: **tabel Settlement + factură în lista de facturi** — model dedicat cu link la factura din Oblio

### Claude's Discretion
- Structura exactă a modelului Settlement (câmpuri, relații)
- UI/UX pentru ecranul de selecție (tabel, filtre)
- Logica de grupare produse pe factură
- Formatarea descrierii facturii

</decisions>

<specifics>
## Specific Ideas

- Flow-ul e săptămânal — decontare se face o dată pe săptămână pentru toate comenzile încasate
- Factura internă e de la Aquaterra CĂTRE firma secundară
- Trebuie trasabilitate: de la Settlement poți vedea comenzile incluse, de la comandă poți vedea în ce Settlement e inclusă

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-internal-settlement*
*Context gathered: 2026-01-25*
