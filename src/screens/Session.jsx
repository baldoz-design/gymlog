import { useEffect, useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  getSessionByDateAndSlot, saveSession, deleteSession, getEntriesBySession,
  saveSessionEntry, deleteSessionEntry, getAllExercises, getLastEntryForExercise, getCycleById,
} from '../db';
import {
  getSlotFromDate, getWeekNumberInCycle, calculateIsIncrease,
  slotLabel, todayISO, formatEntryValue,
} from '../logic';
import ExerciseCard from '../components/ExerciseCard';
import ExerciseHistory from '../components/ExerciseHistory';
import CalendarPicker from '../components/CalendarPicker';
import styles from './Session.module.css';

const MONTHS_S = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
const DAYS_S   = ['dom','lun','mar','mer','gio','ven','sab'];
const SLOTS    = ['MON_TUE', 'WED_THU', 'FRI_SAT'];

function compactDate(iso) {
  const d = new Date(iso + 'T00:00:00');
  return `${DAYS_S[d.getDay()].toUpperCase()} ${d.getDate()} ${MONTHS_S[d.getMonth()].toUpperCase()}`;
}

export default function Session({ params, onBack }) {
  const [date,  setDate]  = useState(params?.date || todayISO());
  const [slot,  setSlot]  = useState(params?.slot || getSlotFromDate(new Date()));
  const [cycle, setCycle] = useState(params?.cycle);

  const [session,       setSession]       = useState(null);
  const [entries,       setEntries]       = useState({});
  const [lastEntries,   setLastEntries]   = useState({});
  const [exercises,     setExercises]     = useState({});
  const [historyEx,     setHistoryEx]     = useState(null);
  const [showCalendar,  setShowCalendar]  = useState(!params?.slot);
  const [showSlotPick,  setShowSlotPick]  = useState(false);
  const [recording,     setRecording]     = useState(false);
  const [showDelConf,   setShowDelConf]   = useState(false);
  const [activeBlock,   setActiveBlock]   = useState(0);

  const blockRefs = useRef([]);
  const snapRef   = useRef(null);

  const today        = todayISO();
  const isHistorical = date < today;
  const weekNumber   = cycle ? getWeekNumberInCycle(date, cycle.startDate) : 1;
  const reps         = cycle ? (cycle.weeks[weekNumber - 1]?.reps ?? '?') : '?';
  const blocks       = (slot && cycle) ? (cycle.slots[slot] || []) : [];
  const allBlockExs  = blocks.flatMap(b => b.exercises);

  const loadSession = useCallback(async () => {
    if (!slot) return;
    const existing = await getSessionByDateAndSlot(date, slot);
    if (existing) {
      setSession(existing);
      // Don't auto-start recording — user taps button
      const saved = await getEntriesBySession(existing.id);
      const map = {};
      for (const e of saved) map[e.exerciseId] = e;
      setEntries(map);
      // Load cycle from session if not already provided
      if (existing.cycleId && (!cycle || cycle.id !== existing.cycleId)) {
        const orig = await getCycleById(existing.cycleId);
        if (orig) { setCycle(orig); return; } // will re-run after cycle is set
      }
    } else {
      setSession(null);
      setRecording(false);
    }
    if (!cycle) return; // wait for cycle to load
    const lastMap = {};
    for (const be of allBlockExs) {
      lastMap[be.exerciseId] = await getLastEntryForExercise(be.exerciseId, date);
    }
    setLastEntries(lastMap);
    const exMap = {};
    for (const ex of await getAllExercises()) exMap[ex.id] = ex;
    setExercises(exMap);
  }, [date, slot, cycle, weekNumber]); // eslint-disable-line

  useEffect(() => { loadSession(); }, [loadSession]);

  // Snap-block IntersectionObserver: tracks which block is in focus
  useEffect(() => {
    if (!recording || !snapRef.current) return;
    const container = snapRef.current;
    const observers = blocks.map((_, i) => {
      const el = blockRefs.current[i];
      if (!el) return null;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveBlock(i); },
        { root: container, threshold: 0.6 }
      );
      obs.observe(el);
      return obs;
    });
    return () => observers.forEach(o => o?.disconnect());
  }, [recording]); // eslint-disable-line

  async function handleStartSession() {
    if (session) {
      // Session already exists — just enter recording mode
      setRecording(true);
      return;
    }
    const sess = { id: uuidv4(), date, slot, cycleId: cycle?.id, weekNumber, entries: [] };
    await saveSession(sess);
    setSession(sess);
    setRecording(true);
  }

  async function handleDeleteSession() {
    if (!session) return;
    await deleteSession(session.id);
    onBack();
  }

  async function handleDeleteEntry(exerciseId) {
    const entry = entries[exerciseId];
    if (!entry) return;
    await deleteSessionEntry(entry.id);
    setEntries(prev => {
      const next = { ...prev };
      delete next[exerciseId];
      return next;
    });
  }

  async function handleSaveEntry(exerciseId, entryData) {
    if (!session) return;
    const isIncrease = calculateIsIncrease(entryData, lastEntries[exerciseId] || null);
    const entry = {
      id: entries[exerciseId]?.id || uuidv4(),
      sessionId: session.id,
      exerciseId,
      ...entryData,
      isIncrease,
    };
    await saveSessionEntry(entry);
    setEntries(prev => ({ ...prev, [exerciseId]: entry }));
  }

  function handleDateSelect(newDate) {
    setDate(newDate);
    const autoSlot = getSlotFromDate(new Date(newDate + 'T00:00:00'));
    if (autoSlot) setSlot(autoSlot);
    else setShowSlotPick(true);
  }

  const dateLabel  = compactDate(date);
  const savedCount = Object.keys(entries).length;
  const totalCount = allBlockExs.length;

  // ── Slot picker ─────────────────────────────────────────────
  if (showSlotPick) {
    return (
      <div className={styles.container}>
        <header className={styles.compactHeader}>
          <button className={styles.backBtn} onClick={() => setShowSlotPick(false)}>←</button>
          <span className={styles.compactTitle}>Scegli slot</span>
        </header>
        <div className={styles.slotPicker}>
          {SLOTS.map(s => (
            <button key={s} className={styles.slotBtn}
              onClick={() => { setSlot(s); setShowSlotPick(false); }}>
              {slotLabel(s)}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Recording mode ───────────────────────────────────────────
  if (recording && session) {
    const progress = totalCount > 0 ? savedCount / totalCount : 0;

    return (
      <div className={styles.container}>
        <header className={styles.recHeader}>
          <div className={styles.recHeaderLeft}>
            <button className={styles.backBtn} onClick={onBack}>←</button>
            <div className={styles.recHeaderInfo}>
              <button className={styles.recDateBtn} onClick={() => setShowCalendar(true)}>
                {dateLabel} · {slotLabel(slot)}
              </button>
              <span className={styles.recWeek}>SETT. {weekNumber} · ×{reps}</span>
            </div>
          </div>
          <span className={styles.recCount}>{savedCount}/{totalCount}</span>
        </header>

        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${progress * 100}%` }} />
        </div>

        {savedCount > 0 && (
          <div className={styles.savedRow}>
            <span className={styles.savedDot} />
            <span className={styles.savedLabel}>SALVATO</span>
          </div>
        )}

        <div ref={snapRef} className={styles.recBody}>
          {blocks.map((block, i) => (
            <div
              key={block.label}
              ref={el => { blockRefs.current[i] = el; }}
              className={`${styles.block} ${blocks.length > 1 && i !== activeBlock ? styles.blockDim : ''}`}
            >
              {/* Block header: label + dot indicator */}
              <div className={styles.blockTopRow}>
                <div className={styles.blockLabel}>BLOCCO {block.label}</div>
                {blocks.length > 1 && (
                  <div className={styles.blockDots}>
                    {blocks.map((_, di) => (
                      <span key={di} className={`${styles.blockDot} ${di === activeBlock ? styles.blockDotActive : ''}`} />
                    ))}
                  </div>
                )}
              </div>
              {block.exercises.map(be => {
                const ex = exercises[be.exerciseId];
                if (!ex) return null;
                return (
                  <ExerciseCard
                    key={be.exerciseId}
                    label={`${block.label}${be.position}`}
                    exercise={ex}
                    currentEntry={entries[be.exerciseId] || null}
                    lastEntry={lastEntries[be.exerciseId] || null}
                    isHistorical={isHistorical}
                    readonly={false}
                    onSave={data => handleSaveEntry(be.exerciseId, data)}
                    onNameTap={() => setHistoryEx(ex)}
                  />
                );
              })}
              {/* Bottom actions solo nell'ultimo blocco */}
              {i === blocks.length - 1 && (
                <div className={styles.bottomBar}>
                  <button className={styles.delBtn} onClick={() => setShowDelConf(true)}>× Elimina</button>
                  <button className={styles.saveCloseBtn} onClick={() => setRecording(false)}>SALVA E CHIUDI</button>
                </div>
              )}
            </div>
          ))}
        </div>

        {showDelConf && (
          <div className={styles.overlay} onClick={() => setShowDelConf(false)}>
            <div className={styles.sheet} onClick={e => e.stopPropagation()}>
              <p className={styles.sheetTitle}>Eliminare questa sessione?</p>
              <p className={styles.sheetSub}>Tutti i valori registrati verranno persi definitivamente.</p>
              <div className={styles.sheetBtns}>
                <button className={styles.sheetDel} onClick={handleDeleteSession}>Elimina</button>
                <button className={styles.sheetCancel} onClick={() => setShowDelConf(false)}>Annulla</button>
              </div>
            </div>
          </div>
        )}

        {showCalendar && (
          <CalendarPicker selectedDate={date} onSelect={handleDateSelect} onClose={() => setShowCalendar(false)} />
        )}
        {historyEx && (
          <ExerciseHistory
            exercise={historyEx}
            onClose={() => setHistoryEx(null)}
            onRenamed={upd => { setExercises(p => ({ ...p, [upd.id]: upd })); setHistoryEx(null); }}
          />
        )}
      </div>
    );
  }

  // ── View mode ────────────────────────────────────────────────
  return (
    <div className={styles.container}>
      <header className={styles.viewHeader}>
        <button className={styles.backBtn} onClick={onBack}>←</button>
        <button className={styles.viewDateBtn} onClick={() => setShowCalendar(true)}>
          {dateLabel}
        </button>
      </header>

      <div className={styles.viewBody}>
        <div className={styles.viewTitleRow}>
          <h1 className={styles.viewSlot}>{slotLabel(slot)}</h1>
          <span className={styles.viewMeta}>SETT.{weekNumber} · ×{reps}</span>
        </div>

        <div className={styles.viewSep} />

        {blocks.map(block => (
          <div key={block.label} className={styles.viewBlock}>
            <div className={styles.viewBlockLabel}>BLOCCO {block.label}</div>
            {block.exercises.map(be => {
              const ex      = exercises[be.exerciseId];
              const current = entries[be.exerciseId];
              const entry   = current || lastEntries[be.exerciseId];
              if (!ex) return null;
              const EL_MAP = { blue: 'var(--azzurro)', yellow: 'var(--giallo)', orange: 'var(--arancione)' };
              const valNode = entry?.valueType === 'elastic'
                ? <span style={{ color: EL_MAP[entry.elasticColor], fontSize: 18, lineHeight: 1 }}>●</span>
                : (entry ? formatEntryValue(entry) : '—');
              return (
                <div key={be.exerciseId} className={styles.viewExRow}>
                  <span className={styles.viewExLabel}>{block.label}{be.position}</span>
                  <span className={styles.viewExName}>{ex.canonicalName}</span>
                  <span className={`${styles.viewExValue} ${!current ? styles.viewExValuePrev : ''}`}>
                    {valNode}
                  </span>
                  {current && (
                    <button
                      className={styles.viewExDel}
                      onClick={() => handleDeleteEntry(be.exerciseId)}
                      aria-label="Elimina valore"
                    >
                      ×
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {blocks.length === 0 && (
          <p className={styles.empty}>Nessun esercizio per questo slot</p>
        )}
      </div>

      <div className={styles.viewBottom}>
        <button className={styles.startBtn} onClick={handleStartSession}>
          {session ? 'CONTINUA SESSIONE' : isHistorical ? 'REGISTRA SESSIONE' : 'INIZIA SESSIONE'}
        </button>
      </div>

      {showCalendar && (
        <CalendarPicker selectedDate={date} onSelect={handleDateSelect} onClose={() => setShowCalendar(false)} />
      )}
    </div>
  );
}
