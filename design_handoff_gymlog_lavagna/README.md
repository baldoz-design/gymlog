# Handoff: GymLog — redesign UI "Lavagna"

## Overview
Redesign completo della UI di GymLog (PWA mobile-first per il tracciamento di allenamenti Small Class, cicli di 5 settimane, dati locali in IndexedDB). La direzione scelta si chiama **Lavagna**: fondo scuro `#121110`, accento "gesso" lime `#D9F24B`, tipografia Archivo con numeri in JetBrains Mono. Obiettivo dichiarato: leggibilità da lontano in palestra, gerarchia chiara, home che non sia mezza vuota, e un momento di ricompensa a fine sessione.

Sostituisce l'attuale sistema chiaro (`#F7F6F2` / card bianche / accenti verde-blu-viola).

## About the Design Files
Il file `GymLog Redesign.dc.html` in questa cartella è un **riferimento di design creato in HTML** — un prototipo che mostra aspetto e comportamento voluti, **non codice di produzione da copiare**. Il compito è **ricreare questi design nel codebase esistente** (React + Vite, CSS Modules, IndexedDB) usando i pattern già presenti nel progetto: componenti React, file `.module.css`, nessuna nuova libreria necessaria.

Il file contiene tre direzioni esplorate (turno 1: `1a` Lavagna, `1b` Quaderno, `1c` Blocchi colore) e, in cima, il **turno 2 con il set completo della direzione approvata `1a`**. **Implementare solo il turno 2.**

## Fidelity
**High-fidelity.** Colori, tipografia, spaziature e stati sono definitivi e vanno riprodotti fedelmente. Le interazioni presenti nel prototipo (stepper kg, menu tipologia, dot di paginazione grafico, spunta esercizi) sono funzionanti e descrivono il comportamento atteso.

---

## Design Tokens

### Colori
| Token | Hex | Uso |
|---|---|---|
| `--bg` | `#121110` | Sfondo app, sfondo campo input |
| `--surface` | `#1B1917` | Card, sheet, tile |
| `--surface-alt` | `#232120` | Chip, quadratino icona secondario |
| `--surface-3` | `#2A2724` | Bordo card, barra progresso vuota, badge icona tipologia |
| `--border` | `#332F2B` | Bordo bottoni ghost (stepper, segmenti non attivi) |
| `--hairline` | `#232120` | Separatore righe lista |
| `--hairline-strong` | `#2A2724` | Separatore header / sezioni |
| `--text` | `#F5F2EA` | Testo primario |
| `--text-2` | `#D6D0C6` | Testo secondario forte (nomi esercizi in liste dense) |
| `--text-3` | `#B6AFA4` | Valori secondari, label bottoni ghost |
| `--muted` | `#8E877C` | Meta testo |
| `--muted-2` | `#6E6862` | Label micro, codici esercizio, unità |
| `--dim` | `#3A3733` | Barre grafico non attive, giorni fuori mese |
| `--accent` | `#D9F24B` | Accento gesso: CTA, label blocco, valore attivo, oggi |
| `--accent-ink` | `#121110` | Testo su accento |
| `--accent-soft` | `rgba(217,242,75,.45)` | Bordo card compilata |
| `--accent-bg` | `#1C1D14` | Sfondo card compilata |
| `--danger` | `#C4553B` | Testo bottone Elimina |
| `--danger-border` | `#4A2E28` | Bordo bottone Elimina |

Colori elastici (in ordine di durezza crescente):
| Elastico | Hex |
|---|---|
| azzurro | `#4FA8DB` |
| giallo | `#E8C33D` |
| arancione | `#E0762C` |

### Tipografia
- **Archivo** (Google Fonts, pesi 400/500/600/700/800) — tutto il testo.
- **JetBrains Mono** (400/500/700) — codici esercizio (`A1`), sigle tipologia (`KG`/`EL`/`BW`), etichette numeriche del grafico.

Scala usata:
| Ruolo | Stile |
|---|---|
| Titolo schermata | `800 34px/1 Archivo`, `letter-spacing:-.02em` |
| Titolo hero home | `800 52px/.92`, `letter-spacing:-.03em` |
| Titolo card | `800 24px/1.1`, `-.02em` |
| Nome esercizio (lista sessione) | `700 22px/1`, `-.01em` |
| Nome esercizio (card registrazione) | `700 19px/1`, `-.01em` |
| Valore numerico input | `800 26px/1`, colore accento |
| Riga lista densa | `500 13px/1.35` |
| Label blocco | `700 11px/1`, `letter-spacing:.18em`, uppercase, accento |
| Micro label | `500 10px/1`, `letter-spacing:.14em`, `#6E6862` |
| Bottone primario | `800 17–19px/1` uppercase |

### Spaziature e forme
- Margini laterali schermo: **16px** (card) / **22px** (testi header e liste hairline).
- Radius: **26px** hero home · **24px** card grande · **20px** card esercizio · **16px** bottoni e tile · **14px** stepper e campo valore · **13/11px** menu tipologia · **8px** chip · **99px** filtri pill.
- Altezze target (tutte ≥44px): CTA **58px**, bottoni tipologia **38px**, stepper **52px**, celle calendario **44px**.
- Sfumatura barra fissa in fondo: `linear-gradient(180deg, rgba(18,17,16,0), #121110 32%)`, padding `14px 16px 26px`.

---

## Screens / Views

Gli id fra parentesi sono quelli usati nel file HTML (`#2g`, `#2h`, …).

### 1. Home (`2g`)
**Scopo:** capire in due secondi cosa si fa oggi e partire.

Layout, dall'alto:
1. Riga titolo: `GYMLOG` `800 15px`, `letter-spacing:.14em`, uppercase — a destra data `500 12px`, `.1em`, `#8E877C`.
2. **Hero** `margin:20px 16px 0`, `background:#D9F24B`, `radius:26px`, `padding:22px 22px 20px`, testo `#121110`:
   - riga meta: `OGGI · VEN/SAB` / `SETT. 5 / 5` — `600 11px`, `.16em`, uppercase;
   - **tacche ciclo**: 5 barre `flex:1;height:4px;radius:2px`, gap 5px; completate `#121110`, futura `rgba(18,17,16,.25)`;
   - titolo `Allena—/mento` `800 52px/.92`;
   - 3 chip contorno `1.5px solid #121110`, radius 99px, `600 12px`, padding `7px 11px`: `3 blocchi`, `8 esercizi`, `×10 reps`;
   - separatore `1.5px solid rgba(18,17,16,.2)`, poi **anteprima primi 3 esercizi** (nome a sinistra `500 14px`, valore a destra `700`), infine riga `+ altri 5` a `rgba(18,17,16,.5)`;
   - CTA `INIZIA →`: `background:#121110`, testo `#D9F24B`, `800 19px`, altezza 56px, radius 16px.
3. **Card Statistiche** `#1B1917`, radius 22px: titolo `700 17px` + `6 SESSIONI`; istogramma 6 colonne altezza 52px, gap 6px, radius 3px, colonne `#3A3733`, massimo `#D9F24B`.
4. Due tile affiancate (gap 12px) `#1B1917`, radius 22px: **Calendario** / **Programma**, titolo `700 16px`, sottotitolo `500 12px #8E877C`.

### 2. Sessione — visualizzazione (`2h`)
**Scopo:** leggere il programma del giorno prima di iniziare.

- Header `padding:20px 22px 18px`, bordo inferiore `1px solid #2A2724`: freccia indietro + data uppercase a destra; sotto `VEN/SAB` `800 34px` e a fianco `SETT.5 · ×10` `600 13px` accento.
- Lista **senza card**: label blocco accento, poi righe `padding:14px 0` separate da `1px solid #232120`. Riga = codice mono 12px `#6E6862` + nome `700 22px` + valore a destra `600 17px #B6AFA4` con unità 12px `#6E6862`; corpo libero → `CORPO LIBERO` `600 13px`, `.1em`, `#6E6862`.
- Barra fissa in fondo: CTA `INIZIA SESSIONE` accento, 58px.

### 3. Sessione — registrazione (`2a` blocco A, `2i` blocchi B/C — stessa schermata, la lista scrolla)
**Scopo:** inserire i valori con pochi tocchi, salvataggio automatico.

Header: `← VEN 28 AGO · VEN/SAB` a sinistra e contatore `4/8` accento a destra (entrambi `white-space:nowrap`, una sola riga); barra di progresso `height:6px`, radius 3px, sfondo `#2A2724`, riempimento accento con `transition:width .25s ease`; sotto, pallino accento 5px + `SALVATO` `500 10px`, `.1em`, `#6E6862`.

Lista: contenitore `padding:4px 16px 100px; height:676px; box-sizing:border-box; overflow:auto`.

**Card esercizio** — `radius:20px; padding:14px 16px 12px; margin-bottom:9px`
- non compilata: `background:#1B1917; border:1px solid #2A2724`
- compilata: `background:#1C1D14; border:1px solid rgba(217,242,75,.45)`

Struttura interna:
1. **Riga titolo**: codice mono `600 11px #6E6862` + nome `700 19px`; a destra il **bottone tipologia** (`padding:5px 9px 5px 5px`, radius 11px, `background:#121110`, bordo `1px solid #2A2724`; quando il menu è aperto `background:#2A2724`) composto da quadratino 26px radius 8px `#2A2724` con sigla `700 10px` mono accento (`KG` / `EL` / `BW`), etichetta `600 12px #B6AFA4` (`Peso` / `Elastico` / `Corpo libero`) e chevron `▾` 9px.
2. **Riga ultima volta**: `ULTIMA VOLTA` `500 10px`, `.14em`, `#6E6862` + valore `700 13px #B6AFA4` (es. `12.5 kg`, `Corpo libero`, `Elastico giallo`). Badge lime `tipo cambiato` (`600 9px`, `.12em`, uppercase, `#121110` su `#D9F24B`, radius 5px) solo se l'utente ha cambiato tipologia rispetto all'ultima sessione.
3. **Menu tipologia** (solo se aperto): contenitore `background:#121110`, radius 15px, padding 6px, gap 6px; tre segmenti `flex:1; height:38px; radius:11px`, `600 12px`, con sigla mono 9px a `opacity:.75`; attivo `background:#F5F2EA; color:#121110`, inattivo trasparente con bordo `#332F2B` e testo `#8E877C`. Alla selezione il menu si chiude.
4. **Input per tipologia**
   - **Peso**: `−` e `+` 52×52, radius 14px, bordo `1.5px solid #332F2B`, glifo `600 24px #B6AFA4`; al centro campo `flex:1; height:52px; radius:14px; background:#121110`, valore `800 26px` accento **centrato verticalmente** + `kg` `600 13px #6E6862`. Step **0,5 kg**, minimo 0.
   - **Elastico**: tre pill `flex:1; height:46px; radius:14px`, `600 13px`, capitalize, con pallino 10px; non selezionata → trasparente, bordo `1.5px solid #332F2B`, testo `#B6AFA4`, pallino nel colore dell'elastico; selezionata → sfondo pieno del colore, testo e pallino bianchi.
   - **Corpo libero**: unico bottone `height:46px; radius:14px`; non fatto → trasparente, bordo `1.5px solid #332F2B`, testo `#B6AFA4`, label `Segna come fatto`; fatto → `background:#D9F24B; color:#121110`, label `✓ Fatto a corpo libero`.
5. **Barra fissa in fondo**: `✕ Elimina` (altezza 58px, `padding:0 18px`, radius 16px, bordo `1.5px solid #4A2E28`, testo `700 15px #C4553B`) + `SALVA E CHIUDI` (`flex:1`, 58px, radius 16px, accento, `800 17px`). Nessun bottone "Salva": i valori si salvano a ogni modifica.

### 4. Statistiche (`2b`)
- Header con titolo `Statistiche` `800 34px` e riga filtri scrollabile orizzontalmente: pill `600 12px`, radius 99px, padding `8px 12px`; attivo `#D9F24B` su testo `#121110`, inattivo bordo `1.5px solid #332F2B` testo `#B6AFA4`. Filtri, in ordine: **Ultimi** (con conteggio, es. `8`, a `opacity:.55`), **Con peso**, **Con elastico**, **Corpo libero**, **Tutti**.
- Righe esercizio `padding:16px 6px`, separatore `1px solid #232120`, tre colonne: nome `700 19px` + meta `500 11px`, `.08em`, `#6E6862`; micro-grafico largo 76px alto 34px; valore corrente allineato a destra su 56px.
- Micro-grafico secondo la tipologia:
  - **peso** → 6 colonne `flex:1`, radius 2px, `#3A3733`, massimo `#D9F24B`;
  - **elastico** → pallini 11px nei colori usati, in ordine cronologico;
  - **storico misto** (es. Pull Up: 4 sessioni corpo libero + 2 con elastico arancione) → 4 trattini `10×3px #3A3733` seguiti da 2 pallini `#E0762C`, meta `6 SESSIONI · 4 BW → 2 ELASTICO`, valore `Arancione` colorato.

### 5. Dettaglio esercizio (`2c`)
Bottom sheet sopra la lista sfocata/attenuata (`opacity:.28`), ancorato a `top:150px`, `background:#1B1917`, radius `28px 28px 0 0`, padding `22px 22px 0`.
- Titolo `800 28px` + meta `6 SESSIONI · DA MAR 2026`; chiusura tonda 36px `#2A2724`.
- Tre KPI affiancati (gap 10px) `background:#121110`, radius 16px, padding 14px: `ATTUALE`, `MASSIMO` (valore in accento), `DELTA` — label `500 10px`, `.12em`, valore `800 24px`.
- **Grafico paginato**: 6 colonne, altezza area 118px, etichetta valore mono 11px sopra la colonna (accento sul massimo di pagina), altezza colonna = `34 + (v / max) * 46` px, radius `6px 6px 0 0`.
- Sotto: riga con periodo (`MAG — LUG 2026`, `500 10px`, `.14em`, `#6E6862`) e **navigation dot** a destra — pagina attiva pill `18×6px #D9F24B`, altre `6×6px #3A3733`, `transition:width .2s ease`. Swipe orizzontale sul grafico = cambio pagina (6 sessioni per pagina, dalla più recente).
- Storico: righe `padding:14px 0`, data `500 15px #B6AFA4`, valore `700 16px`; incrementi rispetto alla sessione precedente in accento con `↑`.

### 6. Programma (`2d`)
- Card ciclo attivo `#1B1917`, bordo `1px solid rgba(217,242,75,.4)`, radius 24px, padding 20px: badge `ATTIVO` (`600 10px`, `.16em`, `#121110` su accento, radius 6px) + `SETT. 5 / 5`; titolo su due righe `800 24px/1.1`; intervallo date `500 12px #8E877C`.
- Per ogni giornata (`LUN/MAR`, `MER/GIO`, `VEN/SAB`), separata da `1px solid #2A2724`: label giornata accento `700 11px`, `.16em`, poi **tre righe A/B/C** — sigla blocco `700 10px/1.35` mono `#6E6862` in colonna fissa 12px, nomi esercizi separati da `·` in `500 13px/1.35 #D6D0C6`. Giornata senza dati → `Nessun esercizio importato` `#6E6862`.
- CTA accento `FOTOGRAFA LA LAVAGNA`, 58px.
- **Archivio**: label `700 11px`, `.18em`, `#6E6862`; righe `padding:13px 0` con titolo `600 15px #D6D0C6`, meta `500 11px #6E6862` (`18 mag → 21 giu · 24 sessioni`) e chevron `→`.

### 7. Import — step 2 di 3 (`2e`)
- Progress a 3 segmenti (`height:4px`, radius 2px): completati accento, futuro `#2A2724`; label `PASSO 2 DI 3`; titolo `Controlla / quello che ho letto` `800 30px/1.05`.
- Card foto `#1B1917` radius 20px: thumbnail 64px con placeholder a righe diagonali (`repeating-linear-gradient(135deg,#2A2724 0 6px,#232120 6px 12px)`), nome file `600 13px`, meta mono `8 esercizi · 3 blocchi / confidenza alta`.
- Righe esercizio riconosciuto: `padding:13px 14px`, radius 14px, `#1B1917`, bordo `#2A2724`, codice mono + nome `600 17px` + `✎`. Riga a bassa confidenza: sfondo `#1C1D14`, bordo `rgba(217,242,75,.45)`, codice accento e tag `DA VERIFICARE` `600 10px`, `.1em`, accento.
- Barra fissa: `Indietro` ghost 110px + `CONFERMA` accento `flex:1`.

### 8. Calendario (`2f`)
- Titolo `Agosto` bianco + `2026` `#6E6862`, frecce `‹ ›` `#8E877C`, sottotitolo `9 sessioni questo mese`.
- Griglia `grid-template-columns:repeat(7,1fr)`, gap 6px, intestazioni `L M M G V S D` `600 10px`, `.1em`, `#6E6862`.
- Cella 44px radius 12px: giorno senza sessione → solo numero `600 15px #6E6862`; con sessione → `background:#1B1917`, numero bianco + pallino accento 5px sotto; oggi → `background:#D9F24B`, numero `800 15px #121110`; giorni fuori mese `#3A3733`.
- Sotto: `ULTIME SESSIONI` con righe data `700 16px` + meta `VEN/SAB · SETT.4 · 8/8`.

---

## Interactions & Behavior
- **Stepper peso**: `−`/`+` a step 0,5 kg, `Math.max(0, …)`, arrotondamento al mezzo kg. Il valore parte **preimpostato** all'ultimo valore registrato per quell'esercizio.
- **Cambio tipologia**: tap sul bottone tipologia → apre il menu a 3 voci (una sola card aperta per volta); la scelta chiude il menu, cambia l'input e mostra il badge `tipo cambiato`. Il default di ogni esercizio è la tipologia dell'ultima sessione registrata, non quella del programma.
- **Corpo libero**: un tap segna/annulla il completamento.
- **Elastico**: un tap seleziona il colore; il default è l'ultimo colore usato.
- **Contatore e barra**: un esercizio conta come compilato se ha peso (sempre, perché preimpostato), colore elastico scelto, o corpo libero confermato.
- **Salvataggio**: automatico a ogni variazione (indicatore `SALVATO`). In fondo solo `Elimina` (con conferma) e `Salva e chiudi` (torna alla home).
- **Grafico dettaglio**: swipe orizzontale o tap sui dot per navigare le pagine da 6 sessioni; le colonne si riscalano sul massimo della pagina.
- **Transizioni**: `width .25s ease` sulla barra di progresso, `width .2s ease` sui dot, `background .18s ease` sugli stati di completamento. Nient'altro animato.

## State Management
Per la schermata di registrazione:
- `vals: Record<code, number>` — valori peso, inizializzati dall'ultima sessione.
- `bandChoice: Record<code, 'azzurro'|'giallo'|'arancione'>` — inizializzato dall'ultimo colore usato.
- `bwDone: Record<code, boolean>`.
- `kindOverride: Record<code, 'weight'|'band'|'bw'>` — vuoto = tipologia dell'ultima sessione.
- `openKindMenu: code | null`.
- Derivati: `filled` (conteggio compilati), `progress = filled / total`.

Dettaglio esercizio: `chartPage: number` (default = pagina più recente), pagine da 6 sessioni ricavate dallo storico.

Persistenza: ogni cambio scrive subito la sessione su IndexedDB (debounce ~300ms sullo stepper è sufficiente).

## Assets
Nessun asset esterno. Font da Google Fonts:
`https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap`
Le "icone" sono sigle testuali (`KG`, `EL`, `BW`) e glifi (`←`, `→`, `↑`, `✓`, `✕`, `▾`, `‹`, `›`): nessuna icon library richiesta. Se il codebase ha già un set di icone, si possono sostituire mantenendo dimensioni e colori.

## Files
- `PROMPT_CLAUDE_CODE.md` — prompt pronto da incollare in Claude Code.
- `screens/` — screenshot 2x delle 8 schermate: 01 home · 02 sessione visualizzazione · 03 registrazione blocco A · 04 registrazione blocchi B/C · 05 statistiche · 06 dettaglio esercizio · 07 programma · 08 calendario (Import escluso).
- `GymLog Redesign.dc.html` — prototipo completo. Implementare le schermate del **turno 2** (`#2g`, `#2h`, `#2a`, `#2i`, `#2b`, `#2c`, `#2d`, `#2e`, `#2f`); il turno 1 contiene le direzioni scartate `1b` e `1c` ed è solo storico.

## Note di migrazione dal design attuale
- Il tema passa da chiaro a scuro: rimuovere `#F7F6F2` / card bianche / bordi `#E2E0DA`, e i tre accenti verde-blu-viola (restano solo come colori-elastico, con la nuova terna azzurro/giallo/arancione).
- Font: da `-apple-system` ad Archivo + JetBrains Mono.
- Radius: da 20px home / 12–16px altrove alla scala descritta sopra.
- La card hero della home non è più un blocco vuoto: contiene meta, tacche ciclo, anteprima esercizi e CTA.
