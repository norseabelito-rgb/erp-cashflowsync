# Debugging FanCourier

Documentatie pentru debugging-ul integrarii cu FanCourier (serviciu de curierat).

Fisiere principale:
- `src/lib/fancourier.ts` - Client API FanCourier
- `src/lib/fancourier-statuses.ts` - Statusuri AWB cu descrieri
- `src/lib/awb-service.ts` - Serviciu de creare AWB

## Arhitectura Integrarii

### Autentificare si Token Caching

FanCourier foloseste token-uri Bearer cu valabilitate de **24 ore**.

Token-urile sunt cache-uite **per companie** (keyed by `clientId:username`) pentru a preveni amestecarea datelor intre firme:

```typescript
// src/lib/fancourier.ts linia 22-27
const tokenCache = new Map<string, FanCourierToken>();

function getTokenCacheKey(clientId: string, username: string): string {
  return `${clientId}:${username}`;
}
```

Token-ul e reinnoit la **23 ore** (cu 1 ora inainte de expirare):
```typescript
// src/lib/fancourier.ts linia 108-111
tokenCache.set(cacheKey, {
  token,
  expiresAt: new Date(Date.now() + 23 * 60 * 60 * 1000),
});
```

**IMPORTANT**: Token cache-ul e in memorie. La restart-ul aplicatiei, token-urile se pierd si se obtin altele noi automat.

### BigInt Handling

FanCourier returneaza numere AWB foarte mari care depasesc `Number.MAX_SAFE_INTEGER` in JavaScript. Aplicatia foloseste `json-bigint` pentru a preveni pierderea de precizie:

```typescript
// src/lib/fancourier.ts linia 8
const JSONBigString = JSONBig({ storeAsString: true });
```

Fara aceasta configurare, numerele AWB ar avea cifrele finale gresite.

## Erori de Autentificare

### "Eroare autentificare FanCourier: 401"

```
[FanCourier] Login FAILED for clientId: XXX, username: YYY
```

**Cauze**:
- Username sau parola gresite
- ClientId invalid
- Contul FanCourier e dezactivat

**Solutie**:
1. Verifica credentialele in Setari > Firme > [firma]:
   - `fancourierClientId`
   - `fancourierUsername`
   - `fancourierPassword`
2. Testeaza conexiunea din interfata
3. Verifica ca contul FanCourier e activ

### "Nu s-a putut obtine token de la FanCourier"

**Cauza**: API-ul FanCourier a raspuns dar fara token (raspuns malformat).
**Solutie**: Problema temporara FanCourier; incearca din nou.

## Erori la Crearea AWB

### Validare Locala (inainte de API call)

Aplicatia face validari locale in `src/lib/fancourier.ts` linia 293-321:

| Camp | Validare | Mesaj |
|------|----------|-------|
| Nume destinatar | Min 2 caractere | "Numele trebuie sa aiba minim 2 caractere" |
| Telefon | Format `0[2-7]XXXXXXXX` (10 cifre) | "Formatul corect este 0XXXXXXXXX" |
| Judet | Min 2 caractere | "Judetul este obligatoriu" |
| Localitate | Min 2 caractere | "Localitatea este obligatorie" |
| Strada | Min 2 caractere | "Strada este obligatorie" |

**Normalizarea telefonului** (linia 274-287):
- Elimina spatii, cratime, paranteze
- Converteste `+40` la `0`
- Converteste `0040` la `0`

### Erori FanCourier API

Erorile de la API-ul FanCourier sunt parsate si traduse automat (`translateFanCourierError`, linia 179-217):

| Eroare FanCourier | Traducere | Recomandare |
|-------------------|-----------|-------------|
| "Locality is invalid" | "Localitatea nu exista in nomenclatorul FanCourier" | Verifica ortografia |
| "County is invalid" | "Judetul nu exista in nomenclatorul FanCourier" | Foloseste denumirea oficiala |
| "Phone is invalid" | "Numarul de telefon este invalid" | Format 07XXXXXXXX |
| "Street is required" | "Strada este obligatorie" | Completeaza adresa |
| "Name is required" | "Numele destinatarului este obligatoriu" | |
| "Weight must be greater than 0" | "Greutatea trebuie sa fie mai mare decat 0" | |
| "Service is invalid" | "Serviciul selectat nu este valid" | Standard, Cont Colector, RedCode, Express Loco |

### Eroare AWB deja existent

```
AWB-ul a fost deja creat: [numar]. Daca doresti sa creezi unul nou, trebuie sa anulezi mai intai AWB-ul existent.
```

**Cauza**: Comanda are deja un AWB activ (nu anulat/sters).

**Solutie**: AWB-ul poate fi inlocuit doar daca statusul anterior e:
- `errorMessage` prezent (AWB cu eroare)
- Status contine "sters" / "deleted"
- Status contine "anulat" / "cancelled" / "canceled"

Logica: `src/lib/awb-service.ts` linia 125-148

### Eroare AWB Mismatch (firma diferita)

```
AWB-ul va fi emis pe contul firmei "X" (din billingCompany). Verificati ca e corect.
```

**Cauza**: `billingCompany` difera de `store.company`.

**Solutie**: Confirma warning-ul (buton "Continua oricum") sau corecteaza `billingCompany`.

## Statusuri AWB FanCourier

Toate statusurile sunt definite in `src/lib/fancourier-statuses.ts`.

### Categorii de statusuri

| Categorie | Coduri | Descriere |
|-----------|--------|-----------|
| **Ridicare** | C0, C1 | Coletul a fost preluat de curier |
| **Tranzit** | H0-H17 | Coletul e in drum intre depozite |
| **Livrare** | S1, S2, S8, S35, S46, S47 | In livrare sau livrat |
| **Avizare** | S3, S11, S12, S21, S22, S24, S30 | Destinatar contactat/avizat |
| **Problema** | S4, S5, S9, S10, S14, S19, S20, S25, S27, S28, S42 | Probleme de adresa |
| **Retur** | S6, S7, S15, S16, S33, S43, S50 | Refuz/retur |
| **Anulare** | A0, A1, A2, A3, A4 | AWB anulat/sters |

### Statusuri finale (nu mai urmeaza alte evenimente)

| Cod | Nume | Actiune recomandata |
|-----|------|---------------------|
| **S2** | Livrat | Comanda livrata cu succes |
| **S6** | Refuz primire | Contacteaza clientul; coletul revine |
| **S7** | Refuz plata transport | Coletul revine la expeditor |
| **S15** | Refuz plata ramburs | Coletul revine |
| **S16** | Retur la termen | Termenul de pastrare a expirat |
| **S33** | Retur solicitat | Returul a fost solicitat de expeditor |
| **S43** | Retur | Coletul se intoarce |
| **S50** | Refuz confirmare | Clientul a refuzat semnatura ePOD |
| **A0-A4** | AWB anulat/sters | Nu necesita actiune |

### Statusuri care necesita actiune

| Cod | Problema | Ce trebuie facut |
|-----|----------|-----------------|
| **S4** | Adresa incompleta | Contacteaza clientul pentru detalii |
| **S5** | Destinatar mutat | Obtine noua adresa |
| **S10** | Adresa gresita, fara telefon | URGENT: Obtine telefon si adresa corecta |
| **S20** | Adresa incompleta, fara telefon | URGENT: Completeaza adresa si telefon |
| **S21** | Lipsa persoana de contact | Contacteaza clientul telefonic |
| **S22** | Nu are bani de ramburs | Informeaza clientul sa pregateasca suma |
| **S27** | Adresa + telefon gresite | URGENT: Verifica comanda complet |
| **S28** | Adresa incompleta + telefon gresit | URGENT: Corecteaza ambele |
| **S30** | Nu raspunde la telefon | Incearca sa contactezi direct |

### Mapare la statusuri interne

Statusurile FanCourier sunt mapate la statusuri interne:

```typescript
internalStatus: "SHIPPED" | "DELIVERED" | "RETURNED" | "CANCELLED" | "AWB_ERROR"
```

Logica de detectare a tipului de schimbare: `src/lib/sync-service.ts` functia `detectAWBChangeType` (linia 270-387).

## Tracking AWB

Endpoint: `GET /reports/awb/tracking`

Fisier: `src/lib/fancourier.ts` linia 434-469

Returneaza lista de evenimente cu: `id`, `name`, `location`, `date`

Erori frecvente:
- **"AWB negasit"** - Numarul AWB nu exista in FanCourier (posibil sters)
- Detectat in sync ca `DELETED` daca AWB-ul avea status anterior valid

## Printare Etichete AWB

Endpoint: `GET /awb/label`

Fisier: `src/lib/fancourier.ts` linia 478-532

Formate disponibile: A4, A5, A6 (A6 necesita optiunea ePOD/X)
Tipuri: 1=PDF, 2=HTML, 3=ZPL

Erori frecvente:
- Raspuns gol (0 bytes) - AWB nu exista sau e sters
- Raspuns JSON in loc de PDF - FanCourier returneaza eroare

## Stergere AWB

Endpoint: `DELETE /awb`

Fisier: `src/lib/fancourier.ts` linia 537-552

**ATENTIE**: Se poate sterge doar daca AWB-ul nu a fost inca preluat de curier.

## Tips de Debugging

1. **Verifica log-urile** - Toate operatiile logheaza cu prefix `[FanCourier]` si blocuri vizuale `=====`
2. **Payload-ul complet** se logheaza la crearea AWB-ului (linia 367-378)
3. **Raspunsul API** se logheaza de asemenea (linia 382-386)
4. **Testeaza credentialele** individual per firma (cache-ul e per `clientId:username`)
5. **Verifica nomenclatorul** FanCourier pentru localitati valide
