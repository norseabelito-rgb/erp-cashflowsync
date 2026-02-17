# API Predare Curier (Handover)

Endpoint-uri pentru fluxul de predare a coletelor catre curier: scanare AWB-uri, finalizare sesiune zilnica, rapoarte si alerte C0.

**Fisiere sursa:**
- `src/app/api/handover/today/route.ts`
- `src/app/api/handover/scan/route.ts`
- `src/app/api/handover/finalize/route.ts`
- `src/app/api/handover/reopen/route.ts`
- `src/app/api/handover/not-handed/route.ts`
- `src/app/api/handover/report/route.ts`
- `src/app/api/handover/report/export/route.ts`
- `src/app/api/handover/c0-alerts/route.ts`

---

## Concepte

### Sesiune de predare

O sesiune de predare (`HandoverSession`) se creeaza automat pentru fiecare zi. Are doua stari:
- **OPEN** - Predarea este activa, se pot scana AWB-uri
- **CLOSED** - Predarea a fost finalizata

### Liste

1. **Lista 1** - AWB-uri de predat azi (endpoint `/today`)
2. **Lista 2** - AWB-uri nepredate din toate zilele anterioare (endpoint `/not-handed`)

### Alerte C0

AWB-uri care au primit status C0 (ridicate de curier) de la FanCourier dar nu au fost scanate intern in predare.

---

## GET /api/handover/today

Returneaza Lista 1 (AWB-uri de predat azi) impreuna cu statistici si statusul sesiunii.

**Autentificare:** Sesiune NextAuth
**Permisiune:** `handover.view`

### Query Parameters

| Parametru | Tip | Descriere |
|-----------|-----|-----------|
| `storeId` | string | Filtru optional dupa magazin |

### Raspuns (200)

```json
{
  "success": true,
  "data": {
    "awbs": [
      {
        "id": "awb-uuid",
        "awbNumber": "2024123456789",
        "orderNumber": "#58537",
        "customerName": "Ion Popescu",
        "city": "Bucuresti",
        "totalPrice": "250.00",
        "isScanned": false,
        "scannedAt": null,
        "scannedBy": null
      }
    ],
    "stats": {
      "total": 15,
      "scanned": 8,
      "remaining": 7,
      "percentComplete": 53
    },
    "session": {
      "id": "session-uuid",
      "date": "2026-02-18",
      "status": "OPEN",
      "createdAt": "2026-02-18T08:00:00.000Z",
      "closedAt": null,
      "closedBy": null
    }
  }
}
```

---

## POST /api/handover/scan

Scaneaza un AWB pentru predare.

**Autentificare:** Sesiune NextAuth
**Permisiune:** `handover.scan`

### Validari

- Sesiunea de predare trebuie sa fie OPEN
- Numarul AWB este obligatoriu

### Request Body

```json
{
  "awbNumber": "2024123456789"
}
```

### Raspunsuri posibile

**Succes:**
```json
{
  "success": true,
  "message": "AWB 2024123456789 scanat cu succes",
  "type": "success"
}
```

**Sesiune inchisa:**
```json
{
  "success": false,
  "message": "Predarea pentru azi a fost finalizata. Redeschide predarea pentru a continua.",
  "type": "error"
}
```

**AWB negasit:**
```json
{
  "success": false,
  "message": "AWB-ul 2024123456789 nu a fost gasit in sistem",
  "type": "error"
}
```

---

## POST /api/handover/finalize

Finalizeaza manual predarea pentru azi. Inchide sesiunea si genereaza raportul.

**Autentificare:** Sesiune NextAuth
**Permisiune:** `handover.finalize`

### Validari

- Sesiunea nu trebuie sa fie deja CLOSED

### Raspuns (200)

```json
{
  "success": true,
  "message": "Predarea a fost finalizata",
  "stats": {
    "totalScanned": 12,
    "totalExpected": 15,
    "missing": 3
  }
}
```

---

## POST /api/handover/reopen

Redeschide predarea pentru azi (dupa finalizare).

**Autentificare:** Sesiune NextAuth
**Permisiune:** `handover.finalize`

### Raspuns (200)

```json
{
  "success": true,
  "message": "Predarea a fost redeschisa"
}
```

### Erori

```json
{
  "success": false,
  "message": "Predarea este deja deschisa."
}
```

---

## GET /api/handover/not-handed

Returneaza Lista 2: AWB-uri nepredate din toate zilele anterioare.

**Autentificare:** Sesiune NextAuth
**Permisiune:** `handover.view`

### Query Parameters

| Parametru | Tip | Descriere |
|-----------|-----|-----------|
| `storeId` | string | Filtru optional dupa magazin |

### Raspuns (200)

```json
{
  "success": true,
  "data": {
    "awbs": [
      {
        "id": "awb-uuid",
        "awbNumber": "2024123456780",
        "orderNumber": "#58530",
        "customerName": "Maria Ionescu",
        "city": "Cluj-Napoca",
        "createdAt": "2026-02-16T10:00:00.000Z",
        "daysAgo": 2
      }
    ],
    "total": 3
  }
}
```

---

## GET /api/handover/report

Genereaza raportul de predare pentru o zi specifica.

**Autentificare:** Sesiune NextAuth
**Permisiune:** `handover.report`

### Query Parameters

| Parametru | Tip | Default | Descriere |
|-----------|-----|---------|-----------|
| `date` | string | azi | Data in format `YYYY-MM-DD` |
| `storeId` | string | - | Filtru optional dupa magazin |

### Raspuns (200)

```json
{
  "success": true,
  "data": {
    "date": "2026-02-18",
    "session": {
      "status": "CLOSED",
      "closedAt": "2026-02-18T17:00:00.000Z",
      "closedBy": "Admin"
    },
    "stats": {
      "totalExpected": 15,
      "totalScanned": 12,
      "totalMissing": 3
    },
    "scannedAwbs": [...],
    "missingAwbs": [...]
  }
}
```

### Erori

```json
{
  "success": false,
  "error": "Data invalida. Foloseste formatul YYYY-MM-DD."
}
```

---

## GET /api/handover/c0-alerts

Returneaza AWB-urile cu status C0 (ridicate de curier) dar fara scanare interna.

**Autentificare:** Sesiune NextAuth
**Permisiune:** `handover.view`

### Query Parameters

| Parametru | Tip | Descriere |
|-----------|-----|-----------|
| `storeId` | string | Filtru optional dupa magazin |

### Raspuns (200)

```json
{
  "success": true,
  "data": {
    "alerts": [
      {
        "id": "awb-uuid",
        "awbNumber": "2024123456789",
        "orderNumber": "#58537",
        "customerName": "Ion Popescu",
        "c0Date": "2026-02-18T14:00:00.000Z",
        "daysWithoutScan": 1
      }
    ],
    "total": 2
  }
}
```

---

## POST /api/handover/c0-alerts

Rezolva o alerta C0 sau toate alertele.

**Autentificare:** Sesiune NextAuth
**Permisiune:** `handover.scan`

### Request Body

```typescript
{
  awbId?: string;              // UUID AWB (obligatoriu daca nu applyToAll)
  action: "mark_handed" | "ignore";  // Actiune de rezolvare
  applyToAll?: boolean;        // Aplica la toate alertele
  storeId?: string;            // Filtru magazin (doar cu applyToAll)
}
```

### Raspuns (200)

```json
{
  "success": true,
  "message": "Alerta rezolvata cu succes",
  "resolved": 1
}
```

### Erori

```json
{
  "success": false,
  "message": "Actiune invalida. Foloseste 'mark_handed' sau 'ignore'."
}
```
