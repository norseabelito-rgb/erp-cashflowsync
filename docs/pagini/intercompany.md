# Decontari Intercompany

## Prezentare Generala

Pagina de decontari intercompany permite generarea facturilor de decontare interna intre firma primara (care detine stocul) si firmele secundare (care vand prin magazinele lor Shopify). Calculul se face pe baza costului produselor + adaos procentual configurabil per firma.

**URL:** `/intercompany`

---

## Informatii Afisate

### Carduri Statistice

| Card | Descriere | Varianta |
|------|-----------|----------|
| Total Facturi | Numarul total de facturi intercompany | Default |
| De incasat | Facturi cu status PENDING | Warning (daca > 0) |
| Incasate | Facturi cu status PAID | Success |
| Firme secundare | Numarul de firme secundare | Default |

### Selector Firma Secundara

Dropdown pentru selectia firmei secundare catre care se emit facturi de decontare.

### Tabel Comenzi Eligibile

Afiseaza comenzile care nu au inca factura de decontare intercompany:

| Coloana | Descriere |
|---------|-----------|
| Checkbox | Selectie pentru includere in factura |
| Numar comanda | Numarul comenzii Shopify |
| Data | Data comenzii |
| Client | Numele clientului |
| Produse | SKU-uri si cantitati |
| Total comanda | Valoarea comenzii |
| Cost estimat | Costul calculat (cost produse + adaos) |

### Tabel Facturi Intercompany Existente

| Coloana | Descriere |
|---------|-----------|
| Serie + Numar | Seria si numarul facturii Oblio |
| Firma | Firma secundara |
| Data | Data emiterii |
| Total | Valoarea totala |
| Status | PENDING / PAID |
| Status Oblio | Emisa / Eroare |
| Actiuni | Marcheaza platit / Retry Oblio |

---

## Butoane si Actiuni

| Buton | Conditie | Actiune |
|-------|----------|---------|
| Selecteaza Toate | Exista comenzi eligibile | Selecteaza toate comenzile din lista |
| Sterge Selectia | Exista selectie | Deselecteaza toate |
| Previzualizeaza | Cel putin 1 selectat | Deschide dialog preview factura |
| Genereaza Factura | Din dialog preview | Emite factura in Oblio |
| Marcheaza Platit | Factura cu status PENDING | Schimba statusul in PAID |
| Retry Oblio | Factura cu eroare Oblio | Reincearca emiterea in Oblio |
| Refresh | Mereu vizibil | Reincarca datele |

---

## Dialog Previzualizare Factura

### Informatii Afisate

**Header:**
- Firma emitenta (primara)
- Firma beneficiar (secundara)
- Numar comenzi incluse

**Tabel linii factura:**
Produsele sunt agregate per SKU din toate comenzile selectate:

| Coloana | Descriere |
|---------|-----------|
| SKU | Codul produsului |
| Denumire | Numele produsului |
| Cantitate | Cantitatea totala |
| Pret unitar | Costul unitar al produsului |
| Valoare | Cantitate x Pret |

**Sumar:**
- Subtotal (cost produse)
- Adaos intercompany (procentul configurat pe firma secundara)
- Total fara TVA
- TVA
- Total cu TVA

### Actiuni din Dialog

- **Anuleaza** - inchide dialogul
- **Genereaza Factura** - emite factura in Oblio folosind seria de decontare intercompany configurata pe firma

---

## Flux de Lucru

1. Selecteaza firma secundara din dropdown
2. Selecteaza comenzile eligibile (checkbox)
3. Apasa "Previzualizeaza" pentru a vedea detaliile facturii
4. Verifica liniile si totalul
5. Apasa "Genereaza Factura" pentru emiterea in Oblio
6. Factura apare in tabelul de facturi cu status PENDING
7. Dupa primirea platii, marcheaza ca PAID

---

## Configurare Necesara

Pentru ca decontarile sa functioneze:
1. **Firma primara** - trebuie marcata ca primara in Setari > Firme
2. **Firma secundara** - trebuie sa aiba configurat:
   - Credentiale Oblio
   - Serie de facturare intercompany (`intercompanySeriesName`)
   - Adaos intercompany (`intercompanyMarkup` - procent)
3. **Produsele** - trebuie sa aiba cost definit (pretul de achizitie)
