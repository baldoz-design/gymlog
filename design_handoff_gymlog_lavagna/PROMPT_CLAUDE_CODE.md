# Prompt per Claude Code

Copia e incolla quanto segue in Claude Code, con la cartella `design_handoff_gymlog_lavagna/` nella root del repo GymLog.

---

Nel repo trovi la cartella `design_handoff_gymlog_lavagna/`. Contiene il redesign completo della UI di GymLog:

- `README.md` — specifica di design autosufficiente: token colore, scala tipografica, ogni schermata componente per componente con hex/px/font-weight, interazioni, state, note di migrazione. **È la fonte di verità.**
- `screens/*.png` — screenshot a 2x delle 8 schermate finali, nell'ordine del flusso.
- `GymLog Redesign.dc.html` — prototipo HTML interattivo (riferimento visivo e di comportamento, **non** codice da copiare). Implementa solo le schermate del turno 2 (`#2g`, `#2h`, `#2a`, `#2i`, `#2b`, `#2c`, `#2d`, `#2e`, `#2f`); il turno 1 sono direzioni scartate.

Obiettivo: portare questo design nel codebase React + Vite + CSS Modules esistente, mantenendo intatta la logica applicativa e la persistenza su IndexedDB. Nessuna nuova dipendenza, nessun refactor dell'architettura dati.

Procedi così:

1. Leggi `README.md` per intero, poi esplora il codebase e mappa ogni schermata del design ai componenti e ai file `.module.css` esistenti. Prima di scrivere codice, mostrami la mappatura schermata → file e segnala dove il design richiede struttura nuova (es. il menu tipologia di input, i dot di paginazione del grafico, le tre righe A/B/C nel Programma).
2. Introduci i design token come CSS custom properties in un unico punto (variabili globali già esistenti o un nuovo file di tema importato una volta sola) e usa **solo** quelle nei CSS Modules: niente hex hardcoded nei componenti.
3. Migra il tema da chiaro a scuro in un unico passaggio, schermata per schermata, in questo ordine: Home → Sessione (visualizzazione) → Sessione (registrazione) → Statistiche → Dettaglio esercizio → Programma → Import → Calendario. Un commit per schermata.
4. Nella schermata di registrazione implementa i tre comportamenti nuovi descritti nel README: il **bottone tipologia** (peso / elastico / corpo libero) che apre il menu a tre voci e cambia l'input; il valore peso **preimpostato all'ultima sessione** con stepper a 0,5 kg; il **salvataggio automatico** a ogni modifica, con in fondo solo `Elimina` (con conferma) e `Salva e chiudi`. Aggiorna il modello dati se serve: la tipologia di input di un esercizio deve poter variare da sessione a sessione, ereditando come default quella dell'ultima sessione registrata.
5. Aggiorna la terna colori degli elastici ad azzurro / giallo / arancione (in ordine di durezza) in tutta l'app, incluse le statistiche, e gestisci lo storico misto (es. esercizio fatto prima a corpo libero e poi con elastico) come descritto.
6. Verifica su viewport 375px che nessuna riga vada a capo negli header, che tutte le aree tappabili siano ≥44px e che le liste scrollabili lascino spazio alle barre fisse in fondo. Poi controlla che il rendering coincida con gli screenshot in `screens/`.

Se una scelta del design va in conflitto con un vincolo del codebase, fermati e chiedimi come procedere invece di improvvisare.
