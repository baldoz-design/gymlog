import { useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { getAllSessions, saveSession, deleteSession } from '../db';
import { todayISO } from '../logic';
import { getCircuit, isHybrid, hybridBefore, lastChoices, hybridMinutes, fmtSec, lapsText } from '../hybrid';
import Laps from '../components/Laps';
import RpePicker from '../components/RpePicker';
import HybridWrapUp from '../components/HybridWrapUp';
import { SwapToast } from '../components/SwapSheet';
import ses from './Session.module.css';
import styles from './HybridSession.module.css';

const MONTHS_S = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
const DAYS_S   = ['dom','lun','mar','mer','gio','ven','sab'];
const REDUCED  = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const compactDate = iso => { const d = new Date(iso + 'T00:00:00'); return `${DAYS_S[d.getDay()].toUpperCase()} ${d.getDate()} ${MONTHS_S[d.getMonth()].toUpperCase()}`; };

export default function HybridSession({ params, onBack }) {
  const date    = params?.date || todayISO();
  const circuit = getCircuit();
  const size    = circuit.stations.length;

  const [history,     setHistory]     = useState(null); // lezioni Hybrid precedenti
  const [session,     setSession]     = useState(null);
  const [choice,      setChoice]      = useState({});
  const [flash,       setFlash]       = useState(null);
  const [toast,       setToast]       = useState(null);
  const [showRpe,     setShowRpe]     = useState(false);
  const [showWrapUp,  setShowWrapUp]  = useState(false);
  const [showDelConf, setShowDelConf] = useState(false);
  const toastTimer = useRef(null);
  const cardRefs   = useRef({});

  useEffect(() => {
    getAllSessions().then(all => {
      const last = lastChoices(all, date);
      setHistory(hybridBefore(all, date));
      setSession(all.find(s => s.date === date && isHybrid(s)) || null);
      setChoice(Object.fromEntries(circuit.stations.map(st => [st.n, last[st.n] || st.options[0]])));
    });
  }, [date]); // eslint-disable-line react-hooks/exhaustive-deps -- il circuito è fisso

  if (!history) return <div className={ses.container} />;

  const stations = session?.stations || [];
  const n = stations.length;
  // La prossima stazione è quella dopo l'ultima fatta; prima di iniziare nessuna: si parte da quella libera
  const nowN   = n ? stations[n - 1].n % size + 1 : null;
  const record = history.length ? Math.max(...history.map(s => s.stations.length)) : null;

  // Una lezione senza stazioni non resta salvata: non deve contare nelle statistiche
  function persist(next) {
    setSession(next?.stations.length ? next : null);
    if (next?.stations.length) saveSession(next);
    else if (next) deleteSession(next.id);
  }

  function showToast(text, undo) {
    clearTimeout(toastTimer.current);
    setToast({ text, undo });
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }

  function restore(prev, current) {
    if (prev) { setSession(prev); saveSession(prev); }
    else { setSession(null); deleteSession(current.id); }
    setFlash(null);
    setToast(null);
  }

  function logStation(stN) {
    const prev = session;
    const base = session || { id: uuidv4(), date, type: 'hybrid', slot: null, circuitId: circuit.id, stations: [], perceivedEffort: null };
    const next = { ...base, stations: [...base.stations, { n: stN, choice: choice[stN] }] };
    persist(next);
    setFlash(stN);
    const st = circuit.stations.find(x => x.n === stN);
    showToast(`Stazione ${stN} fatta · ${st.cardio} + ${choice[stN]}`, () => restore(prev, next));
    setTimeout(() => cardRefs.current[stN % size + 1]?.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'nearest' }), 250);
  }

  // Toglie l'ultima volta registrata di una stazione, per un clic sbagliato
  function removeStation(stN) {
    const prev = session;
    const k = stations.map(x => x.n).lastIndexOf(stN);
    if (k < 0) return;
    const next = { ...session, stations: stations.filter((_, i) => i !== k) };
    persist(next);
    setFlash(null);
    showToast(`Tolta una volta la stazione ${stN}`, () => restore(prev, next));
  }

  function handleClose() {
    if (!n) { onBack(); return; }
    setShowRpe(true);
  }

  function handleRpe(v) {
    const next = { ...session, perceivedEffort: v };
    setSession(next);
    saveSession(next);
    setShowRpe(false);
    setShowWrapUp(true);
  }

  async function handleDelete() {
    if (session) await deleteSession(session.id);
    onBack();
  }

  const lapsLbl = [n > 0 && `circa ${hybridMinutes(circuit, n)} min`, record != null && `record ${record}`].filter(Boolean).join(' · ');

  return (
    <div className={ses.container}>
      <header className={styles.header}>
        <div className={styles.headLeft}>
          <button className={ses.backBtn} onClick={onBack} aria-label="Indietro">←</button>
          <div className={styles.headInfo}>
            <span className={styles.date}>{compactDate(date)}</span>
            <span className={styles.kind}>HYBRID · {size} STAZIONI</span>
          </div>
        </div>
        {n > 0 ? (
          <span key={n} className={styles.headCount}>{n}<small>{n === 1 ? 'STAZIONE' : 'STAZIONI'}</small></span>
        ) : (
          <span className={styles.timing}>{fmtSec(circuit.work)} lavoro · {fmtSec(circuit.rest)} pausa<br />cambio {fmtSec(circuit.change)}</span>
        )}
      </header>

      <div className={styles.body}>
        <div className={styles.hero}>
          <div>
            <span key={n} className={styles.countNum}>{n}</span>
            <span className={styles.countLbl}>{n === 1 ? 'stazione fatta' : 'stazioni fatte'}</span>
          </div>
          <div className={styles.lapsWrap}>
            <Laps n={n} size={size} live />
            <span className={styles.lapsLbl}>
              {n > 0 && <><b>{lapsText(n, size)}</b><br /></>}
              {lapsLbl}
            </span>
          </div>
        </div>

        {n === 0 && (
          <p className={styles.hint}>
            Parti dalla stazione libera. Quando la finisci premi FATTA su quella: da lì l'app ti propone la successiva. Se sbagli, il − sulla stazione toglie l'ultima volta.
          </p>
        )}

        <div className={styles.list}>
          {circuit.stations.map(st => {
            const count = stations.filter(x => x.n === st.n).length;
            const isNow = st.n === nowN;
            return (
              <div key={st.n} ref={el => { cardRefs.current[st.n] = el; }} className={`${styles.card} ${isNow ? styles.cardNow : ''}`}>
                <div className={styles.cardTop}>
                  <span className={styles.num}>{st.n}</span>
                  <span className={styles.cardio}>{st.cardio}<small>{fmtSec(circuit.work)}</small></span>
                  {isNow && <span className={styles.tag}>ORA</span>}
                  {count > 0 && (
                    <>
                      <span className={styles.doneCount}>✓ {count > 1 ? `×${count}` : 'fatta'}</span>
                      <button className={styles.minus} onClick={() => removeStation(st.n)} aria-label={`Togli una volta la stazione ${st.n}`}>−</button>
                    </>
                  )}
                </div>
                <div className={styles.ctrl}>
                  <div className={styles.then}>
                    <span className={styles.thenLbl}>POI {fmtSec(circuit.work)}{st.options.length > 1 ? ' · A SCELTA' : ''}</span>
                    <div className={styles.opts}>
                      {st.options.map(o => (
                        <button
                          key={o}
                          aria-pressed={choice[st.n] === o}
                          className={`${styles.opt} ${choice[st.n] === o ? styles.optOn : ''}`}
                          onClick={() => setChoice(c => ({ ...c, [st.n]: o }))}
                        >{o}</button>
                      ))}
                    </div>
                  </div>
                  <button
                    key={`${st.n}-${count}`}
                    className={`${styles.doneBtn} ${flash === st.n ? styles.pop : ''}`}
                    onClick={() => logStation(st.n)}
                  >FATTA</button>
                </div>
              </div>
            );
          })}
        </div>

        <div className={styles.bottom}>
          <button className={ses.delBtn} onClick={() => session ? setShowDelConf(true) : onBack()}>× Elimina</button>
          <button className={styles.save} onClick={handleClose}>SALVA E CHIUDI</button>
        </div>
      </div>

      {showDelConf && (
        <div className={ses.overlay} onClick={() => setShowDelConf(false)}>
          <div className={ses.sheet} onClick={e => e.stopPropagation()}>
            <p className={ses.sheetTitle}>Eliminare questa sessione?</p>
            <p className={ses.sheetSub}>Le stazioni registrate verranno perse definitivamente.</p>
            <div className={ses.sheetBtns}>
              <button className={ses.sheetDel} onClick={handleDelete}>Elimina</button>
              <button className={ses.sheetCancel} onClick={() => setShowDelConf(false)}>Annulla</button>
            </div>
          </div>
        </div>
      )}
      {showRpe && (
        <RpePicker
          title="Sforzo complessivo"
          initialValue={session?.perceivedEffort ?? null}
          onConfirm={handleRpe}
          onCancel={() => setShowRpe(false)}
        />
      )}
      {showWrapUp && session && (
        <HybridWrapUp session={session} history={history} onClose={() => { setShowWrapUp(false); onBack(); }} />
      )}
      {toast && <SwapToast text={toast.text} onUndo={toast.undo} />}
    </div>
  );
}
