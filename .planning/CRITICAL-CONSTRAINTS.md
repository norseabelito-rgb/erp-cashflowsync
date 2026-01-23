# CRITICAL CONSTRAINTS - ERP CashFlowSync

**CITEȘTE ACEST DOCUMENT ÎNAINTE DE ORICE MODIFICARE**

---

## 🚨 REGULA #1: NU SE ȘTERG DATE DIN BAZA DE DATE

**ABSOLUT INTERZIS:**
- `DELETE FROM` - NICIODATĂ
- `DROP TABLE` - NICIODATĂ
- `TRUNCATE` - NICIODATĂ
- `prisma.model.delete()` / `deleteMany()` - doar cu aprobare explicită pentru cazuri specifice
- Orice operațiune care pierde date existente

**PERMIS:**
- `ALTER TABLE ADD COLUMN` - adăugare coloane noi
- `ALTER TABLE ALTER COLUMN` - modificare tipuri (cu migrare date!)
- `CREATE INDEX` - adăugare indecși
- `ADD CONSTRAINT` - adăugare constraint-uri
- `UPDATE` - actualizare date existente
- Soft delete (adăugare câmp `deletedAt`)

**Migrări Prisma:**
- VERIFICĂ preview-ul migrării ÎNAINTE de aplicare
- Folosește `prisma migrate dev --create-only` pentru a vedea ce va face
- NICIODATĂ `prisma migrate reset` în producție

---

## BUSINESS RULES CONFIRMATE

### Flow Comenzi
- **Flow normal:** Shopify → PENDING → VALIDATED → INVOICED → AWB_CREATED → SHIPPED → DELIVERED
- **Excepție permisă:** AWB fără factură (pentru cazuri speciale)
- **Statusuri de implementat:** PICKING, PACKED (pentru tracking warehouse)
- **Tranzițiile ilegale** trebuie blocate (ex: nu poți merge din DELIVERED înapoi în PENDING)

### Stoc și Inventar
- **Deducere stoc:** La emitere factură
- **AWB fără factură:** REZERVĂ stocul (nu deduce)
- **Deducere finală:** La emiterea facturii
- **Articole composite:** Stocul se calculează din componente (bottleneck method)

### Facturare
- **Numerotare:** STRICT CONTINUĂ - NU sunt permise gap-uri
- **Facturis = MASTER:** Seriile se creează/gestionează în Facturis
- **ERP:** Doar referă seria din Facturis (mapping store → serie Facturis)
- **Race conditions:** TREBUIE prevenite - un singur request poate obține un număr la un moment dat

### Multi-Store / Multi-Company
- **Default access:** PERMIT - userii fără restricții văd toate store-urile (INTENȚIONAT)
- **2-3 companii** cu serii de facturare separate
- **Intercompany:** Firma primară facturează către firme secundare

### Procesare Bulk
- **3 opțiuni necesare:**
  1. Emite doar Facturi (fără AWB)
  2. Creează doar AWB (fără factură)
  3. Procesează Tot (factură + AWB)

### Comenzi Manuale
- **Creare manuală:** Client, produse, adresă, selectare magazin
- **Sync înapoi:** Comanda trebuie să apară și în Shopify

---

## PROBLEME CUNOSCUTE DE REZOLVAT

### CRITICE (Race Conditions / Data Integrity)
1. [ ] Race condition la numerele de factură (invoice-series.ts:18-54)
2. [ ] Rollback număr factură în afara tranzacției (invoice-service.ts:485)
3. [ ] LineItems se șterg/recrează la update (shopify.ts:584-632)

### ÎNALTE (Security / Data Leak)
4. [ ] Store sync fără autentificare (stores/[id]/sync/route.ts)
5. [ ] Validare store lipsește în API orders/invoices
6. [ ] Upsert în loc de create pentru facturi

### MEDII (Funcționalitate Lipsă)
7. [ ] Nu se poate adăuga comandă manuală din UI
8. [ ] Bulk processing - nu există opțiuni separate pentru facturi/AWB
9. [ ] Statusuri PICKING/PACKED neimplementate
10. [ ] Invoice sync nu face nimic (sync-service.ts:640)

### JOASE (Performance / Cleanup)
11. [ ] N+1 query în picking list
12. [ ] ProcessingError nu se curăță
13. [ ] OAuth state în memorie

---

## VERIFICĂRI OBLIGATORII LA FIECARE PR

1. **Nu șterge date:** Verifică că nu există DELETE/DROP/TRUNCATE
2. **Migrări sigure:** `IF NOT EXISTS` pentru toate operațiunile
3. **Atomicitate:** Operațiunile critice în `$transaction`
4. **Race conditions:** Lock-uri unde e necesar
5. **Teste:** Unit tests pentru logica de business

---

*Ultima actualizare: 2026-01-23*
*Aprobat de: [Owner]*
