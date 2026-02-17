# API Printare

Documentatie pentru endpoint-urile de printare: gestionarea imprimantelor, conectarea aplicatiei de printare (print client), procesarea job-urilor de printare si obtinerea documentelor.

**Surse**: `src/app/api/printers/`, `src/app/api/print-client/`

---

## Cuprins

- [Imprimante](#imprimante)
- [Regenerare Tokenuri](#regenerare-tokenuri)
- [Conectare Print Client](#conectare-print-client)
- [Job-uri Printare](#job-uri-printare)
- [Actualizare Status Job](#actualizare-status-job)
- [Obtinere Document](#obtinere-document)

---

## Imprimante

**Sursa**: `src/app/api/printers/route.ts`

### GET /api/printers

Lista tuturor imprimantelor configurate, cu numarul de job-uri asociate.

**Permisiuni**: `printers.view`

**Raspuns** (200):
```json
{
  "success": true,
  "printers": [
    {
      "id": "pr1",
      "name": "Imprimanta AWB",
      "appToken": "abc123...",
      "printerToken": "def456...",
      "paperSize": "A6",
      "orientation": "portrait",
      "copies": 1,
      "autoPrint": true,
      "outputFormat": "PDF",
      "isActive": true,
      "isConnected": true,
      "lastSeenAt": "2025-02-18T10:00:00.000Z",
      "lastError": null,
      "createdAt": "2025-01-01T00:00:00.000Z",
      "_count": { "printJobs": 150 }
    }
  ]
}
```

### POST /api/printers

Adauga o imprimanta noua. Genereaza automat tokenuri unice (`appToken` si `printerToken`) folosind `randomBytes(16)`.

**Permisiuni**: `printers.create`

**Body**:
```typescript
{
  name: string;              // Obligatoriu
  paperSize?: string;        // Default: "A6"
  orientation?: string;      // Default: "portrait"
  copies?: number;           // Default: 1
  autoPrint?: boolean;       // Default: true
  outputFormat?: string;     // Default: "PDF"
}
```

**Raspuns** (200):
```json
{
  "success": true,
  "printer": {
    "id": "pr1",
    "name": "Imprimanta AWB",
    "appToken": "generated_token_1",
    "printerToken": "generated_token_2",
    "paperSize": "A6",
    "..."
  },
  "message": "Imprimanta adaugata cu succes"
}
```

**Erori**:
| Status | Mesaj |
|--------|-------|
| 400 | `Numele imprimantei este obligatoriu` |

### PUT /api/printers

Actualizeaza o imprimanta existenta.

**Permisiuni**: `printers.edit`

**Body**:
```typescript
{
  id: string;                // Obligatoriu
  name?: string;
  paperSize?: string;
  orientation?: string;
  copies?: number;
  autoPrint?: boolean;
  isActive?: boolean;
  outputFormat?: string;
}
```

**Raspuns** (200):
```json
{
  "success": true,
  "printer": { "..." },
  "message": "Imprimanta actualizata cu succes"
}
```

### DELETE /api/printers?id={printerId}

Sterge o imprimanta.

**Permisiuni**: `printers.delete`

**Raspuns** (200):
```json
{
  "success": true,
  "message": "Imprimanta stearsa cu succes"
}
```

---

## Regenerare Tokenuri

**Sursa**: `src/app/api/printers/[id]/regenerate-token/route.ts`

### POST /api/printers/{id}/regenerate-token

Regenereaza tokenurile de autentificare ale unei imprimante. Reseteaza statusul de conexiune (`isConnected: false`, `lastSeenAt: null`).

**Body**:
```typescript
{
  tokenType: "app" | "printer" | "both";
}
```

**Raspuns** (200):
```json
{
  "success": true,
  "printer": {
    "id": "pr1",
    "appToken": "new_generated_token",
    "printerToken": "new_generated_token_2",
    "isConnected": false,
    "lastSeenAt": null,
    "..."
  },
  "message": "Tokenuri regenerate cu succes. Reconecteaza aplicatia de printare."
}
```

**Erori**:
| Status | Mesaj |
|--------|-------|
| 400 | `Specifica tipul de token: app, printer sau both` |

---

## Conectare Print Client

**Sursa**: `src/app/api/print-client/connect/route.ts`

**Autentificare**: Token-based (`appToken` + `printerToken`), fara sesiune NextAuth. Folosit de aplicatia desktop de printare.

### POST /api/print-client/connect

Conecteaza aplicatia de printare. Verifica tokenurile si marcheaza imprimanta ca online.

**Body**:
```typescript
{
  appToken: string;
  printerToken: string;
}
```

**Raspuns succes** (200):
```json
{
  "success": true,
  "clientId": "pr1",
  "printer": {
    "id": "pr1",
    "name": "Imprimanta AWB",
    "paperSize": "A6",
    "orientation": "portrait",
    "copies": 1
  },
  "message": "Conectat cu succes"
}
```

**Erori**:
| Status | Mesaj |
|--------|-------|
| 400 | `Ambele tokenuri sunt obligatorii` |
| 401 | `Tokenuri invalide sau imprimanta inactiva` |

### GET /api/print-client/connect

Poll pentru job-uri noi (folosit de aplicatia de printare in mod continuu).

**Query params**:
| Parametru | Tip | Descriere |
|-----------|-----|-----------|
| `appToken` | string | Token-ul aplicatiei |
| `printerToken` | string | Token-ul imprimantei |

**Raspuns** (200):
```json
{
  "success": true,
  "jobs": [
    {
      "id": "job1",
      "documentType": "awb",
      "documentNumber": "2900123456",
      "status": "PENDING",
      "createdAt": "2025-02-18T10:00:00.000Z"
    }
  ],
  "printerSettings": {
    "paperSize": "A6",
    "orientation": "portrait",
    "copies": 1
  }
}
```

**Nota**: Returneaza maxim 10 job-uri PENDING, ordonate dupa data crearii (cel mai vechi primul).

---

## Job-uri Printare

**Sursa**: `src/app/api/print-client/jobs/route.ts`

**Autentificare**: Token-based (`appToken` + `printerToken`)

### GET /api/print-client/jobs

Obtine job-urile de printare in asteptare pentru o imprimanta specifica. Similar cu GET `/api/print-client/connect`, dar returneaza mai multe detalii despre fiecare job.

**Query params**:
| Parametru | Tip | Descriere |
|-----------|-----|-----------|
| `appToken` | string | Token-ul aplicatiei |
| `printerToken` | string | Token-ul imprimantei |

**Raspuns** (200):
```json
{
  "success": true,
  "jobs": [
    {
      "id": "job1",
      "documentId": "doc1",
      "documentType": "awb",
      "documentNumber": "2900123456",
      "orderId": "ord1",
      "orderNumber": "#58537",
      "createdAt": "2025-02-18T10:00:00.000Z",
      "paperSize": "A6",
      "orientation": "portrait",
      "copies": 1
    }
  ],
  "printerName": "Imprimanta AWB"
}
```

**Nota**: Setarile imprimantei (paperSize, orientation, copies) sunt adaugate la fiecare job pentru convenienta clientului.

---

## Actualizare Status Job

**Sursa**: `src/app/api/print-client/job/[id]/route.ts`

**Autentificare**: Token-based (`appToken` + `printerToken`)

### PATCH /api/print-client/job/{id}

Actualizeaza statusul unui job de printare. Aplicatia de printare apeleaza acest endpoint dupa ce proceseaza un job.

**Body**:
```typescript
{
  appToken: string;
  printerToken: string;
  status: "PRINTING" | "COMPLETED" | "FAILED";
  errorMessage?: string;      // Doar pentru status FAILED
}
```

**Logica retry**:
- La fiecare apel, `attempts` se incrementeaza cu 1
- Daca statusul este `FAILED` si `attempts < maxAttempts - 1`, job-ul revine automat la `PENDING` (retry automat)
- Daca s-au depasit incercarile maxime, job-ul ramane `FAILED`

**Raspuns** (200):
```json
{
  "success": true,
  "job": {
    "id": "job1",
    "status": "COMPLETED",
    "attempts": 1,
    "completedAt": "2025-02-18T10:00:30.000Z",
    "..."
  }
}
```

**Erori**:
| Status | Mesaj |
|--------|-------|
| 401 | `Tokenuri invalide` |
| 404 | `Job negasit` (sau nu apartine imprimantei) |

---

## Obtinere Document

**Sursa**: `src/app/api/print-client/document/[id]/route.ts`

**Autentificare**: Token-based (`appToken` + `printerToken`)

### GET /api/print-client/document/{id}

Obtine documentul PDF (sau alt format) pentru un job de printare. Documentul este returnat ca base64.

**Query params**:
| Parametru | Tip | Descriere |
|-----------|-----|-----------|
| `appToken` | string | Token-ul aplicatiei |
| `printerToken` | string | Token-ul imprimantei |

**Tipuri de documente suportate**:

### Document AWB (`documentType: "awb"`)

Obtine PDF-ul AWB de la FanCourier API si il scaleaza la dimensiunea imprimantei.

**Procesare**:
1. Apeleaza `fancourier.printAWB()` pentru a obtine PDF-ul
2. Daca imprimanta cere A6 si PDF-ul este A4, scaleaza automat folosind `pdf-lib`
3. Scalarea pastreaza raportul de aspect si centreaza continutul

**Raspuns** (200):
```json
{
  "success": true,
  "document": {
    "type": "pdf",
    "data": "base64_encoded_pdf...",
    "filename": "AWB_2900123456.pdf",
    "settings": {
      "paperSize": "A6",
      "orientation": "portrait",
      "copies": 1
    }
  }
}
```

### Document Picking List (`documentType: "picking"`)

Obtine PDF-ul picking list de la endpoint-ul intern `/api/picking/{id}/print`.

**Raspuns** (200):
```json
{
  "success": true,
  "document": {
    "type": "pdf",
    "data": "base64_encoded_pdf...",
    "filename": "Picking_PL-001.pdf",
    "settings": {
      "paperSize": "A4",
      "orientation": "portrait",
      "copies": 1
    }
  }
}
```

**Nota**: Picking list-urile sunt mereu printate pe A4.

**Erori**:
| Status | Mesaj |
|--------|-------|
| 400 | `Tip document nesuportat: {type}` |
| 401 | `Tokenuri lipsa` sau `Tokenuri invalide` |
| 404 | `Job negasit` |
| 500 | `Nu s-a putut genera documentul AWB` |
| 500 | `Nu s-a putut genera PDF-ul Picking List` |
