# Erori Comune

Lista completa de erori intalnite frecvent in aplicatie, cu cauze si solutii.

---

## Erori de Retea

### 1. NETWORK_ERROR - "Eroare de conexiune"

- **Mesaj**: "Nu s-a putut conecta la server. Verifica conexiunea la internet si incearca din nou."
- **Cauza**: Serverul nu este accesibil - fie aplicatia e down, fie clientul nu are internet
- **Solutie**: Verifica statusul aplicatiei pe Railway; verifica conexiunea la internet
- **Prevenire**: Railway este configurat cu `restartPolicyType = "ON_FAILURE"` si `restartPolicyMaxRetries = 10`

### 2. TIMEOUT - "Cererea a expirat"

- **Mesaj**: "Serverul nu a raspuns la timp."
- **Cauza**: Request-ul a durat mai mult de 30 secunde (timeout default)
- **Solutie**: Incearca din nou; daca persista, verifica Railway metrics pentru CPU/memorie
- **Prevenire**: Optimizarea query-urilor lente; timeout-ul e configurat in `src/lib/oblio.ts` (`DEFAULT_TIMEOUT = 30000`) si `src/lib/fancourier.ts` (`timeout: 30000`)

### 3. ECONNREFUSED - "Conexiune refuzata"

- **Mesaj**: "Serverul nu este disponibil momentan."
- **Cauza**: PostgreSQL down sau nu accepta conexiuni; sau API extern down
- **Solutie**: Verifica serviciul PostgreSQL pe Railway; verifica statusul Oblio/FanCourier
- **Prevenire**: Monitorizare Railway alerts

---

## Erori de Autentificare

### 4. UNAUTHORIZED / 401 - "Neautorizat"

- **Mesaj**: "Sesiunea ta a expirat. Te rugam sa te autentifici din nou."
- **Cauza**: Token-ul de sesiune a expirat sau cookie-ul a fost sters
- **Solutie**: Re-login in aplicatie
- **Prevenire**: N/A - sesiunile expira natural

### 5. FORBIDDEN / 403 - "Acces interzis"

- **Mesaj**: "Nu ai permisiunea necesara pentru aceasta actiune."
- **Cauza**: Utilizatorul nu are rolul necesar (ex: pagina /admin/repair-invoices e doar pentru super admin)
- **Solutie**: Contacteaza administratorul pentru permisiuni
- **Prevenire**: Verifica rolurile utilizatorilor la configurare

---

## Erori Facturare (Oblio)

### 6. ORDER_NOT_FOUND - "Comanda nu a fost gasita"

- **Mesaj**: "Comanda nu a fost gasita."
- **Cauza**: ID-ul comenzii nu exista in baza de date
- **Solutie**: Verifica numarul comenzii; posibil comanda nu a fost inca sincronizata din Shopify
- **Prevenire**: Asteapta sincronizarea completa inainte de facturare
- **Fisier**: `src/lib/invoice-errors.ts` linia 3

### 7. ALREADY_ISSUED - "Factura a fost deja emisa"

- **Mesaj**: "Factura a fost deja emisa pentru aceasta comanda."
- **Cauza**: Se incearca emiterea unei a doua facturi pentru aceeasi comanda
- **Solutie**: Verifica factura existenta; daca trebuie re-emisa, storneaza mai intai
- **Prevenire**: Verificarea `hasIssuedInvoice()` se face automat in `src/lib/invoice-service.ts` linia 300
- **Fisier**: `src/lib/invoice-errors.ts` linia 4

### 8. NO_COMPANY - "Magazinul nu are o firma asociata"

- **Mesaj**: "Magazinul nu are o firma de facturare asociata."
- **Cauza**: Store-ul nu are un `company` configurat
- **Solutie**: Mergi la Setari > Magazine si asociaza o firma
- **Prevenire**: Configureaza firma la adaugarea magazinului
- **Fisier**: `src/lib/invoice-errors.ts` linia 6

### 9. NO_CREDENTIALS - "Credentialele Oblio nu sunt configurate"

- **Mesaj**: "Credentialele Oblio nu sunt configurate pentru firma."
- **Cauza**: Firma nu are `oblioEmail` sau `oblioSecretToken` completate
- **Solutie**: Mergi la Setari > Firme si completeaza email-ul si token-ul Oblio
- **Prevenire**: Testeaza conexiunea Oblio dupa configurare
- **Fisier**: `src/lib/invoice-errors.ts` linia 7; verificare in `src/lib/oblio.ts` functia `hasOblioCredentials()`

### 10. NO_SERIES - "Nu exista serie de facturare"

- **Mesaj**: "Nu exista serie de facturare configurata pentru acest magazin."
- **Cauza**: Magazinul sau firma nu are o serie de facturare activa
- **Solutie**: Mergi la Setari > Magazine si selecteaza seria Oblio (camp `oblioSeriesName`)
- **Prevenire**: Configureaza seria la setup-ul magazinului
- **Fisier**: `src/lib/invoice-errors.ts` linia 10

### 11. OBLIO_AUTH_ERROR - "Autentificare esuata la Oblio"

- **Mesaj**: "Autentificare esuata. Verifica email-ul si token-ul secret din Oblio."
- **Cauza**: Token-ul OAuth Oblio nu poate fi obtinut - credentiale gresite sau expirate
- **Solutie**: Regenereaza token-ul in Oblio > Setari > Date Cont; actualizeaza in Setari > Firme
- **Prevenire**: Token-ul Oblio nu expira, dar poate fi revocat din interfata Oblio
- **Fisier**: `src/lib/oblio.ts` linia 139-144 (clasa `OblioAuthError`)

### 12. TRANSFER_PENDING - "Transferul de stoc nu a fost finalizat"

- **Mesaj**: "Transferul de stoc nu a fost finalizat. Asteapta finalizarea transferului."
- **Cauza**: Comanda are un transfer intercompany care nu e completat
- **Solutie**: Finalizeaza transferul de stoc sau confirma ca doresti sa continui (cu warning override)
- **Prevenire**: Proceseaza transferurile inainte de facturare
- **Fisier**: `src/lib/invoice-service.ts` linia 315-351

### 13. NO_LINE_ITEMS - "Comanda nu are produse"

- **Mesaj**: "Comanda nu are produse. Nu se poate emite factura fara articole."
- **Cauza**: Comanda din Shopify nu are line items (posibil editata sau partiala)
- **Solutie**: Verifica comanda in Shopify; re-sincronizeaza daca lipsesc produse
- **Prevenire**: Nu edita comenzile in Shopify dupa import

### 14. OblioValidationError - "Eroare de validare Oblio"

- **Mesaj**: Variabil (ex: "Seria de facturare este obligatorie", "Numele clientului este obligatoriu")
- **Cauza**: Datele trimise la Oblio nu sunt valide - lipsesc campuri obligatorii
- **Solutie**: Verifica mesajul specific; completeaza campurile lipsa
- **Prevenire**: Validarile locale din `src/lib/oblio.ts` linia 374-383 prind cele mai frecvente probleme
- **Fisier**: `src/lib/oblio.ts` linia 146-151 (clasa `OblioValidationError`)

---

## Erori AWB (FanCourier)

### 15. AWB_ALREADY_EXISTS - "AWB deja generat"

- **Mesaj**: "AWB-ul a fost deja creat: [numar]. Daca doresti sa creezi unul nou, trebuie sa anulezi mai intai AWB-ul existent."
- **Cauza**: Comanda are deja un AWB activ
- **Solutie**: Anuleaza AWB-ul existent din interfata sau din FanCourier, apoi creaza unul nou
- **Prevenire**: Verificarea automata in `src/lib/awb-service.ts` linia 125-148
- **Fisier**: `src/lib/awb-service.ts` linia 137-141

### 16. "Locality is invalid" - Localitate invalida FanCourier

- **Mesaj**: "Localitatea nu exista in nomenclatorul FanCourier."
- **Cauza**: Numele localitatii nu se potriveste cu nomenclatorul FanCourier (diacritice, prescurtari)
- **Solutie**: Verifica ortografia localitatii; foloseste numele exact din nomenclatorul FanCourier
- **Prevenire**: Validarea adresei la completare
- **Fisier**: `src/lib/fancourier.ts` linia 198

### 17. "Phone is invalid" - Telefon invalid FanCourier

- **Mesaj**: "Numarul de telefon este invalid."
- **Cauza**: Formatul telefonului nu este 0XXXXXXXXX (10 cifre)
- **Solutie**: Corecteaza numarul de telefon; normalizarea automata converteste +40/0040 la 0
- **Prevenire**: Validarea locala din `src/lib/fancourier.ts` linia 274-303 normalizeaza automat
- **Fisier**: `src/lib/fancourier.ts` linia 200

### 18. "Eroare autentificare FanCourier"

- **Mesaj**: "Eroare autentificare FanCourier: 401 (ClientId: X, Username: Y). Verificati credentialele."
- **Cauza**: Username, parola sau clientId gresit pentru FanCourier
- **Solutie**: Verifica credentialele in Setari > Firme; testeaza conexiunea
- **Prevenire**: Testeaza conexiunea FanCourier dupa configurare
- **Fisier**: `src/lib/fancourier.ts` linia 91-98

### 19. "County is invalid" - Judet invalid

- **Mesaj**: "Judetul nu exista in nomenclatorul FanCourier."
- **Cauza**: Numele judetului nu se potriveste (ex: "Bucuresti" vs "BUCURESTI", "Cluj" vs "CJ")
- **Solutie**: Foloseste denumirea oficiala completa
- **Prevenire**: Validare la completarea adresei
- **Fisier**: `src/lib/fancourier.ts` linia 199

### 20. AWB_MISMATCH - "Firma AWB diferita de firma magazin"

- **Mesaj**: "AWB-ul va fi emis pe contul firmei X (din billingCompany). Verificati ca e corect."
- **Cauza**: Comanda are billingCompany diferita de firma magazinului
- **Solutie**: Confirma warning-ul daca e corect; sau corecteaza billingCompany
- **Prevenire**: Seteaza corect billingCompany la import
- **Fisier**: `src/lib/awb-service.ts` linia 166-180

---

## Erori Sincronizare

### 21. "Job already running since..."

- **Mesaj**: "Job already running since [timestamp]"
- **Cauza**: Un cron job anterior nu s-a terminat sau lock-ul nu a fost eliberat
- **Solutie**: Asteapta expirarea lock-ului (TTL: 10 minute) sau sterge manual lock-ul din tabela `CronLock`
- **Prevenire**: Lock-ul se auto-curata dupa TTL; functia `cleanupExpiredLocks()` sterge lock-uri expirate
- **Fisier**: `src/lib/cron-lock.ts` linia 29-81

### 22. "Configurare FanCourier lipsa"

- **Mesaj**: "Configurare FanCourier lipsa - nu pot sincroniza AWB-uri"
- **Cauza**: Setarile globale nu au credentiale FanCourier (fancourierClientId, fancourierUsername, fancourierPassword)
- **Solutie**: Configureaza credentialele FanCourier in Settings
- **Fisier**: `src/lib/sync-service.ts` linia 168-176

### 23. "Eroare fatala la sincronizare"

- **Mesaj**: "Eroare fatala la sincronizare: [detalii]"
- **Cauza**: Exceptie neprinsasa in procesul de sincronizare (baza de date down, eroare de memorie)
- **Solutie**: Verifica Railway logs pentru detalii; verifica statusul PostgreSQL
- **Prevenire**: Monitorizare Railway
- **Fisier**: `src/lib/sync-service.ts` linia 238-264

---

## Erori HTTP Generice

### 24. 429 - "Prea multe cereri"

- **Mesaj**: "Ai trimis prea multe cereri. Asteapta cateva momente."
- **Cauza**: Rate limiting de la API-urile externe (Shopify, Oblio, FanCourier)
- **Solutie**: Asteapta 30-60 secunde si incearca din nou
- **Prevenire**: Oblio are MAX_RETRIES = 2 cu backoff exponential (`src/lib/oblio.ts` linia 17)

### 25. 500 - "Eroare de server"

- **Mesaj**: "A aparut o eroare pe server."
- **Cauza**: Eroare neasteptata in codul backend
- **Solutie**: Verifica Railway logs pentru stack trace-ul complet
- **Prevenire**: Tratare corecta a erorilor in cod

### 26. 502 / 503 - "Gateway invalid / Serviciu indisponibil"

- **Mesaj**: "Serverul nu a putut procesa cererea."
- **Cauza**: Railway redeploy in curs sau serviciul s-a restartat
- **Solutie**: Asteapta 1-2 minute si incearca din nou
- **Prevenire**: Deploy-urile Railway au zero-downtime cand functioneaza corect

---

## Erori Stoc si Produse

### 27. INSUFFICIENT_STOCK - "Stoc insuficient"

- **Mesaj**: "Nu exista suficient stoc pentru a finaliza aceasta operatie."
- **Cauza**: Cantitatea de stoc in inventar este mai mica decat cantitatea ceruta
- **Solutie**: Verifica stocul in pagina de inventar; adauga receptie daca e necesar

### 28. PRODUCT_NOT_FOUND - "Produs negasit"

- **Mesaj**: "Produsul solicitat nu a fost gasit in sistem."
- **Cauza**: SKU-ul nu exista in baza de date
- **Solutie**: Sincronizeaza produsele din Shopify; verifica daca SKU-ul e corect

### 29. SKU_NOT_ASSIGNED - "SKU neasignat"

- **Mesaj**: "Acest produs nu are un SKU asignat."
- **Cauza**: Varianta produsului din Shopify nu are SKU completat
- **Solutie**: Adauga SKU-ul in Shopify si re-sincronizeaza
