# Taskuri

## Prezentare Generala

Pagina de task-uri ofera un sistem complet de gestionare a sarcinilor interne: creare, editare, stergere, filtrare si urmarire. Task-urile pot fi asignate utilizatorilor, prioritizate si grupate pe date.

**URL:** `/tasks`

---

## Informatii Afisate

**Carduri statistice (sus):**
- Total taskuri
- Astazi - taskuri cu termen azi
- Restante - taskuri cu termenul depasit
- Completate - taskuri finalizate

**Lista task-uri:**
Task-urile sunt grupate pe date folosind utilitarul `groupTasksByDate`. Fiecare grup afiseaza:
- Eticheta datei (azi, maine, data specifica)
- Numarul de taskuri in grup

**Informatii per task:**
- Titlu
- Descriere (trunchiat)
- Prioritate (badge colorat)
- Tip task
- Asignat catre (avatar + nume)
- Termen limita
- Status (completat/necompletat)

### Prioritati

| Prioritate | Culoare Badge |
|------------|---------------|
| URGENT | Rosu |
| HIGH | Portocaliu |
| MEDIUM | Galben |
| LOW | Verde |

---

## Filtre si Cautare

**Preset-uri rapide (butoane):**
- Toate
- Astazi
- Restante (overdue)
- Saptamana aceasta
- Taskurile mele

**Filtre suplimentare** (componenta `TaskFilters`):
- Filtru dupa tip task
- Filtru dupa status (completat/necompletat)
- Filtru dupa asignat (utilizator)

---

## Butoane si Actiuni

| Buton | Conditie | Actiune |
|-------|----------|---------|
| Adauga Task | Mereu vizibil | Deschide dialogul de creare task |
| Completeaza/Reactiveaza | Per task | Toggle status completat |
| Editeaza | Per task | Deschide dialogul de editare |
| Sterge | Per task | Sterge taskul (cu confirmare) |
| Refresh | Mereu vizibil | Reincarca lista |

---

## Modale si Dialoguri

**Dialog Creare/Editare Task** (componenta `TaskFormDialog`):
- Titlu task
- Descriere
- Tip task (selectie)
- Prioritate (URGENT, HIGH, MEDIUM, LOW)
- Asignat catre (selectie utilizator)
- Termen limita (date picker)
- Buton Salveaza / Creaza

**Confirmare Stergere:**
- Dialog de confirmare inainte de stergerea unui task
- Butoane: Anuleaza / Sterge

---

## Navigare

- Pagina principala taskuri: `/tasks`
- Nu exista sub-pagini sau navigare suplimentara
