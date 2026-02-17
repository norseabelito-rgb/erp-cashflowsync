# Debugging Oblio

Documentatie pentru debugging-ul integrarii cu Oblio (serviciu de facturare online).

Fisier principal: `src/lib/oblio.ts`

## Arhitectura Integrarii

### Clase de erori

```
OblioError (baza)
├── OblioAuthError     (401 - autentificare esuata)
├── OblioValidationError (400 - date invalide)
└── OblioApiError      (alte erori API)
```

Toate erorile au un camp `isRetryable`:
- `OblioAuthError` - NU se reincearca (credentiale gresite nu se schimba)
- `OblioValidationError` - NU se reincearca (datele sunt gresite)
- `OblioApiError` - Se reincearca doar pentru erori de retea

### Constante importante

```typescript
const OBLIO_API_URL = "https://www.oblio.eu/api";
const TOKEN_URL = "https://www.oblio.eu/api/authorize/token";
const DEFAULT_TIMEOUT = 30000;  // 30 secunde
const MAX_RETRIES = 2;          // 2 reincercari (total 3 incercari)
```

## Autentificare OAuth 2.0

### Flux de autentificare

1. Se trimite POST la `/authorize/token` cu:
   - `grant_type`: `client_credentials`
   - `client_id`: email-ul contului Oblio
   - `client_secret`: token-ul secret din Oblio > Setari > Date Cont

2. Se primeste un `access_token` valid **1 ora** (3600 secunde)

3. Token-ul e folosit in header: `Authorization: Bearer [token]`

4. Token-ul e cache-uit in memorie si reinnoit cu 60 secunde inainte de expirare:
   ```typescript
   // src/lib/oblio.ts linia 178
   if (this.accessToken && Date.now() < this.tokenExpiresAt - 60000) {
     return this.accessToken;
   }
   ```

### Erori de autentificare

**"Autentificare esuata. Verifica email-ul si token-ul secret din Oblio."**

Cauze:
- Email gresit in campul `oblioEmail` al firmei
- Token secret gresit sau expirat in campul `oblioSecretToken`
- Contul Oblio e dezactivat sau suspendat

Solutie:
1. Logheaza-te in Oblio.eu
2. Mergi la Setari > Date Cont
3. Copiaza token-ul secret
4. Actualizeaza in aplicatie: Setari > Firme > [firma] > Oblio Secret Token

**"Nu s-a primit token de acces de la Oblio."**

Cauze:
- Oblio API a raspuns fara `access_token` (raspuns malformat)
- Problema temporara Oblio

Solutie: Incearca din nou dupa cateva minute; daca persista, contacteaza suportul Oblio.

## Operatii API

### Creare Factura (POST /docs/invoice)

Fisier: `src/lib/oblio.ts` linia 371-417

Validari locale (inainte de API call):
- `seriesName` obligatoriu
- `client.name` obligatoriu
- `products` trebuie sa aiba cel putin un element

Erori frecvente:
- **"Serie inexistenta"** - Seria configurata nu exista in contul Oblio
- **"Client invalid"** - Date client incomplete
- **"Produs fara pret"** - Produs cu pret 0 sau negativ

### Stornare Factura (POST /docs/invoice cu referenceDocument)

Fisier: `src/lib/oblio.ts` linia 486-529

Stornarea emite o factura inversa (credit note):
```typescript
{
  cif: credentials.cif,
  seriesName,
  referenceDocument: {
    type: "Factura",
    refund: 1,
    seriesName,
    number: Number(number),
  },
}
```

Erori frecvente:
- **"Factura nu exista"** - Seria sau numarul nu se potrivesc cu o factura din Oblio
- **"Factura deja stornata"** - A fost deja emisa o credit note
- **"Nu se poate storna"** - Factura e in stare care nu permite stornare

**IMPORTANT**: Diferenta intre cele 3 operatii Oblio:
| Operatie | Endpoint | Ce face |
|----------|----------|---------|
| **Cancel** | PUT /docs/invoice/cancel | Marcheaza ca anulata (fara document invers) |
| **Delete** | DELETE /docs/invoice | Sterge factura (doar ultima din serie) |
| **Storno** | POST /docs/invoice cu refund=1 | Emite credit note (factura inversa) |

In aplicatie se foloseste **storno** peste tot pentru anulare contabila corecta.

### Anulare Factura (PUT /docs/invoice/cancel)

Fisier: `src/lib/oblio.ts` linia 461-479

**ATENTIE**: Aceasta metoda doar marcheaza factura ca anulata in Oblio, fara a emite un document invers. Nu se mai foloseste in practica - se foloseste `stornoInvoice()`.

### Listare Facturi (GET /docs/invoice/list)

Fisier: `src/lib/oblio.ts` linia 535-568

Parametri:
- `cif` - CIF-ul firmei (obligatoriu)
- `seriesName` - Filtru dupa serie
- `client` - Filtru dupa CIF/email/telefon/cod client (**NU** dupa nume!)
- `issuedAfter` / `issuedBefore` - Filtru dupa data
- `canceled` - 0 sau 1
- `limitPerPage` - Max 100 per pagina
- `offset` - Offset pentru paginare

**ATENTIE**: Parametrul `client` cauta dupa CIF, email, telefon sau cod intern - **NU** dupa numele clientului. Pentru a gasi facturi dupa numele clientului, trebuie paginat prin toate facturile si comparat manual.

### Marcare ca Incasata (PUT /docs/invoice/collect)

Fisier: `src/lib/oblio.ts` linia 579-606

Tipuri de incasare: "Ramburs", "Ordin de plata", "Cash", "Card"

### Trimitere e-Factura SPV (POST /docs/einvoice)

Fisier: `src/lib/oblio.ts` linia 611-629

## Erori API si Solutii

### Eroare 401 - Token expirat sau invalid

```
[Oblio] Eroare la obtinere token: ...
```

**Diagnostic**: Token-ul OAuth nu e valid.
**Solutie**: Verifica credentialele; token-ul se reseteaza automat la 401 (`this.accessToken = null` linia 276).

### Eroare 400 - Validare esuata

```
OblioValidationError: [mesaj specific]
```

Mesaje frecvente:
- "Seria de facturare nu exista" - Verifica ca seria e configurata in Oblio
- "CIF invalid" - Verifica CIF-ul firmei
- "Client: campul X este obligatoriu" - Date client incomplete
- "Produse: lista de produse este goala" - Factura fara produse

**Solutie**: Corecteaza datele si incearca din nou. Aceste erori NU se reincearca automat.

### Eroare retea / Timeout

```
[Oblio] Retry 1/2 pentru /docs/invoice
```

**Diagnostic**: API-ul Oblio nu raspunde in 30 secunde.
**Solutie**: Asteptati - se reincearca automat de 2 ori cu backoff (1s, 2s).

### "Raspuns invalid de la Oblio"

```
OblioApiError: Raspuns invalid de la Oblio: [text]
```

**Diagnostic**: Oblio a returnat un raspuns care nu e JSON valid (posibil HTML/eroare server).
**Solutie**: Oblio e temporar indisponibil; incearca mai tarziu.

## Cote TVA

Maparea cotelor TVA Romania in `src/lib/oblio.ts` linia 672-689:

| Procent | Denumire Oblio |
|---------|---------------|
| 19% / 21% | "Normala" |
| 9% / 11% | "Redusa" |
| 5% | "Redusa2" |
| 0% | "Scutita" |

**IMPORTANT**: Denumirile trebuie sa corespunda cu cele configurate in Oblio > Setari > Cote TVA. Daca nu se potrivesc, factura va fi respinsa.

## Functii Helper

### `hasOblioCredentials(company)`
Verifica daca firma are email si token Oblio configurate.
Fisier: `src/lib/oblio.ts` linia 639-644

### `createOblioClient(company)`
Creeaza un client Oblio cu credentialele firmei. Returneaza `null` daca lipsesc credentiale.
Fisier: `src/lib/oblio.ts` linia 649-659

### `createOblioInvoiceItem(params)`
Creeaza un item de factura cu pret TVA inclus, unitate "buc", tip "Piese".
Fisier: `src/lib/oblio.ts` linia 694-719

## Tips de Debugging

1. **Verifica log-urile** - Toate operatiile Oblio logheaza cu prefixul `[Oblio]`
2. **Testeaza conexiunea** - Foloseste `testConnection()` din interfata Setari > Firme
3. **Verifica seria** - Seria trebuie sa existe si sa fie activa in contul Oblio
4. **Verifica CIF-ul** - `oblioCif` trebuie sa corespunda cu firma din Oblio
5. **Token cache** - Token-ul e in memorie; la restart se obtine unul nou automat
