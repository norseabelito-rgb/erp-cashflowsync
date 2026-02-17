# Predare Curier

Fluxul zilnic de predare a coletelor catre curier (handover).

## Surse relevante

- `src/lib/handover.ts` - logica de business principala
- `src/app/api/handover/scan/route.ts` - endpoint scanare AWB
- `src/app/api/handover/finalize/route.ts` - endpoint finalizare predare
- `src/app/api/handover/today/route.ts` - lista AWB-uri de azi
- `src/app/api/handover/not-handed/route.ts` - AWB-uri nepredate
- `src/app/api/handover/report/route.ts` - raport predare
- `src/app/api/handover/reopen/route.ts` - redeschidere predare
- `src/app/api/handover/c0-alerts/route.ts` - alerte C0

## Prezentare generala

Predarea curierului este un flux zilnic care asigura ca toate AWB-urile emise sunt predate fizic curierului:

```
AWB-uri emise azi
    |
    v
Lista 1: "Predare Azi" (AWB-uri nescanate)
    |
    v
Operator scaneaza fiecare AWB cu scanner-ul
    |
    v
AWB-ul trece din "nescanat" in "predat"
    |
    v
La final de zi: Finalizare predare
    |
    v
AWB-uri nescanate → "Nepredate" (Lista 2)
```

## Concepte cheie

### Sesiune de predare

Fiecare zi are o sesiune de predare (`HandoverSession`) cu doua stari:
- **OPEN** - se pot scana AWB-uri
- **CLOSED** - predarea a fost finalizata

Se creeaza automat la primul acces al zilei (`getOrCreateTodaySession`).

### Doua liste

1. **Predare Azi** - AWB-uri create azi, nescanate inca
2. **Nepredate** - AWB-uri din zile anterioare care nu au fost scanate niciodata

### Alerte C0

C0 = AWB-uri care au primit status de la FanCourier ("ridicat de curier") dar NU au fost scanate in sistemul nostru. Indica un AWB care a plecat fara confirmare locala.

## Pasi detaliati

### Pas 1: Vizualizare lista pentru azi

Endpoint: `GET /api/handover/today`

`getTodayHandoverList(storeId?)`:
1. Filtreaza AWB-urile create azi (`createdAt` intre `00:00` si `23:59:59`)
2. Exclude AWB-uri anulate sau sterse
3. Include date comanda, produse, status FanCourier
4. Returneaza TOATE (si scanate si nescanate) - frontend-ul le separa

Permisiune necesara: `handover.view`

**Fiser sursa:** `src/lib/handover.ts`, liniile ~150-190

### Pas 2: Scanare AWB

Endpoint: `POST /api/handover/scan`

```
scanAWB(awbNumber, userId, userName)
    |
    v
[Sesiune deschisa?]
    |       |
    DA      NU → Eroare: "Predarea a fost finalizata"
    |
    v
[AWB gasit in DB?]
    |       |
    DA      NU → Eroare: "AWB negasit"
    |
    v
[Deja scanat azi?]
    |       |
    DA      NU
    |       |
    v       v
  Warning   Marcheaza ca predat:
  "deja     → handedOverAt = now
   scanat"  → handedOverByName = userName
            → notHandedOver = false
```

Permisiune necesara: `handover.scan`

Raspunsul scanarii include:
- `type: "success"` - AWB scanat cu succes
- `type: "warning"` - AWB deja scanat (se afiseaza data anterioara)
- `type: "error"` - AWB negasit sau sesiune inchisa

**Fiser sursa:** `src/app/api/handover/scan/route.ts`, liniile ~1-63

### Pas 3: Verificare AWB-uri nepredate din zile anterioare

Endpoint: `GET /api/handover/not-handed`

Se cauta AWB-urile cu:
- `handedOverAt IS NULL` - niciodata scanate
- `notHandedOver = true` - marcate explicit ca nepredate
- Create inainte de azi
- Exclud anulate/sterse

### Pas 4: Finalizare predare

Endpoint: `POST /api/handover/finalize`

```
finalizeHandover(userId, userName, closeType)
    |
    v
[Sesiune deja inchisa?]
    |       |
    DA      NU
    |       |
    v       v
  Eroare   1. Marcheaza AWB-urile nescanate
           ca notHandedOver = true
           |
           v
         2. Inchide sesiunea:
           status = "CLOSED"
           closedAt = now
           closedBy = userId
           closeType = "manual"/"auto"
           |
           v
         3. Genereaza statistici finale
```

Permisiune necesara: `handover.finalize`

**Fiser sursa:** `src/app/api/handover/finalize/route.ts`, liniile ~1-47

### Pas 5: Redeschidere predare

Endpoint: `POST /api/handover/reopen`

Permite redeschiderea unei predari finalizate pentru corectii:
- Schimba statusul sesiunii inapoi la `OPEN`
- Reseteaza campurile `closedAt`, `closedBy`

Permisiune necesara: `handover.finalize`

### Pas 6: Raport predare

Endpoint: `GET /api/handover/report`

Genereaza un raport complet cu:
- Statistici: total emise, predate, nepredate, alerte C0
- Lista AWB-urilor predate (cu timestamp si cine a scanat)
- Lista AWB-urilor nepredate
- Ora finalizarii si cine a finalizat

Optional export Excel: `GET /api/handover/report/export`

## Statistici (HandoverStats)

```typescript
{
  totalIssued: number;          // AWB-uri emise azi
  totalHandedOver: number;      // AWB-uri scanate (predate)
  totalNotHandedOver: number;   // AWB-uri azi nescanate
  totalNotHandedOverAll: number; // Total nepredate din TOATE zilele
  totalPending: number;          // In asteptare scanare
  totalFromPrevDays: number;     // Din zile anterioare in asteptare
  totalC0Alerts: number;         // AWB-uri cu C0 dar fara scan
}
```

**Fiser sursa:** `src/lib/handover.ts`, liniile ~54-62

## Structura HandoverAWB

Fiecare AWB din lista contine:
- `awbNumber`, `orderId`, `orderNumber`
- `storeName`, `storeId`
- `recipientName`, `recipientCity`
- `products` - lista formatata de produse
- `fanCourierStatusCode`, `fanCourierStatusName` - status live
- `handedOverAt`, `handedOverByName` - cand/cine a scanat
- `notHandedOver`, `notHandedOverAt` - marcat ca nepredat
- `hasC0WithoutScan`, `c0ReceivedAt` - alerta C0

**Fiser sursa:** `src/lib/handover.ts`, liniile ~19-39

## Flux complet zilnic

```
Dimineata:
  Operator deschide pagina Predare Curier
  → Se creeaza sesiunea zilei automat
  → Se afiseaza AWB-urile de azi + nepredate din zile anterioare

In timpul zilei:
  Operatorul proceseaza comenzi → se creeaza AWB-uri noi
  → Apar automat in lista "Predare Azi"

Cand vine curierul:
  Operatorul scaneaza fiecare colet
  → AWB-ul dispare din "nescanate" si apare in "predate"

Dupa plecare curier:
  Operatorul apasa "Finalizeaza Predarea"
  → AWB-urile nescanate se marcheaza ca "nepredate"
  → Sesiunea se inchide
  → Se genereaza raportul zilei

A doua zi:
  AWB-urile nepredate apar in Lista 2 ("Nepredate")
  → Pot fi scanate cand sunt predate fizic
```
