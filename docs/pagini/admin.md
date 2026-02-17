# Admin - Reparare Facturi

## Prezentare Generala

Pagina de reparare facturi este o pagina ascunsa (fara link in navigatie), accesibila doar de super admini. A fost creata pentru a rezolva un bug specific: campul `billingCompanyId` pe Order era setat la companyId-ul store-ului, ceea ce facea ca factura sa fie emisa de la firma emitenta catre ea insasi (client = firma emitenta).

**URL:** `/admin/repair-invoices`

**Acces:** Pagina ascunsa, doar super admin

---

## Despre Problema

Bug-ul: `billingCompanyId` pe Order era setat la `company.id` al store-ului in momentul emiterii facturii. Aceasta facea ca factura sa fie emisa de la Aquaterra catre Aquaterra (firma emitenta = client).

**Procesul de reparare per factura:**
1. Storneaza factura veche in Oblio (credit note)
2. Reseteaza `billingCompanyId` pe comanda
3. Re-emite factura cu datele corecte ale clientului

---

## Informatii Afisate

### Header

- Titlu: "Reparare Facturi Auto-facturare"
- Statistici: `Pending: X | Reparate: Y`

### Card Informativ (galben)

Explica problema, procesul de reparare si afiseaza data ultimului scan.

### Tabel Facturi Afectate

| Coloana | Descriere |
|---------|-----------|
| Checkbox | Selectie pentru reparare bulk |
| Serie + Numar | Seria si numarul facturii (font mono) |
| Comanda | Numarul comenzii |
| Client Oblio | Clientul din factura gresita (rosu) |
| Client corect | Clientul care ar trebui sa fie (verde) |
| Total | Suma + moneda |
| Data | Data emiterii |
| Status | Badge status reparare |
| Actiuni | Buton "Repara" individual |

### Statusuri Reparare

| Status | Badge | Descriere |
|--------|-------|-----------|
| pending | (nimic) | In asteptare |
| processing | Outline + spinner | Se proceseaza |
| repaired | Verde | Reparat cu succes |
| error | Rosu | Eroare la reparare |

### Card Rezultate (afisat dupa reparare)

| Coloana | Descriere |
|---------|-----------|
| Comanda | Numarul comenzii |
| Factura veche | Numarul facturii stornate |
| Factura noua | Numarul facturii re-emise |
| Status | Reparat / Eroare |
| Detalii | Transformare (veche -> noua) sau mesaj eroare |

---

## Butoane si Actiuni

| Buton | Conditie | Actiune |
|-------|----------|---------|
| Scaneaza Oblio | Mereu | Scaneaza API-ul Oblio pentru a detecta facturi afectate (POST) |
| Reincarca | Mereu | Reincarca lista din baza de date |
| Selecteaza toate | Exista facturi | Selecteaza toate facturile reparabile |
| Sterge selectia | Exista selectie | Deselecteaza toate |
| Repara selectate (N) | Cel putin 1 selectat | Reparare bulk pentru facturile selectate |
| Repara (individual) | Per factura, status != repaired/processing | Repara o singura factura |

---

## Flux de Lucru

1. **Scanare** - Apasa "Scaneaza Oblio" pentru a detecta facturile afectate
   - Scaneaza toate facturile din Oblio
   - Compara clientul cu firma emitenta
   - Salveaza rezultatele in baza de date
2. **Verificare** - Revizuieste lista de facturi afectate
   - Clientul Oblio (rosu) = firma emitenta (gresit)
   - Clientul corect (verde) = clientul real din comanda
3. **Reparare** - Selecteaza si repara
   - Individual: buton "Repara" per factura
   - Bulk: selecteaza mai multe, apoi "Repara selectate"
4. **Verificare rezultate** - Cardul de rezultate afiseaza succesul/erorile
   - Factura veche a fost stornata
   - Factura noua a fost emisa cu clientul corect

---

## Stare Goala

Cand nu exista facturi de reparat:
- **Dupa scan** - mesaj: "Nu exista facturi pending de reparat" (iconita verde)
- **Inainte de scan** - mesaj: "Apasa Scaneaza Oblio pentru a detecta facturile afectate"

---

## API-uri Folosite

| Endpoint | Metoda | Descriere |
|----------|--------|-----------|
| `/api/admin/repair-invoices` | GET | Incarca facturile afectate din DB |
| `/api/admin/repair-invoices` | POST | Scaneaza Oblio pentru facturi noi |
| `/api/admin/repair-invoices/[id]/repair` | POST | Repara o factura individuala |
| `/api/admin/repair-invoices/bulk-repair` | POST | Repara mai multe facturi simultan |
