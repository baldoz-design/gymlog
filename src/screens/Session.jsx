import { useEffect, useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  getSessionByDateAndSlot, saveSession, deleteSession, getEntriesBySession,
  saveSessionEntry, getAllExercises, getLastEntryForExercise,
} from '../db';
import {
  getSlotFromDate, getWeekNumberInCycle, calculateIsIncrease,
  slotLabel, todayISO, formatEntryValue,
} from '../logic';
import ExerciseCard from '../components/ExerciseCard';
import ExerciseHistory from '../components/ExerciseHistory';
import CalendarPicker from '../components/CalendarPicker';
import styles from './Session.module.css';

const SLOTS = ['MON_TUE', 'WED_THU', 'FRI_SAT'];

export default function Session({ params, onBack }) {
  const [date, setDate] = useState(params?.date || todayISO());
  const [slot, setSlot] = useState(params?.slot || getSlotFromDate(new Date()));
  const [cycle] = useState(params?.cycle);
  const [session, setSession] = useState(null);
  const [entries, setEntries] = useState({});
  const [lastEntries, setLastEntries] = useState({});
  const [exercises, setExercises] = useState({});
  const [historyExercise, setHistoryExercise] = useState(null);
  const [showSlotPicker, setShowSlotPicker] = useState(false);
  // Se domenica (slot=null), apri subito il calendario
  const [showCalendar, setShowCalendar] = useState(!params?.slot);
  // "recording" = l'utente ha esplicitamente avviato la registrazione
  const [recording, setRecording] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const today = todayISO();
  const isHistorical = date < today;
  // Si entra in edit quando: c'è già una sessione registrata (recording=true),
  // oppure l'utente ha premuto "Inizia"
  const isEditing = recording;

  const weekNumber = cycle ? getWeekNumberInCycle(date, cycle.startDate) : 1;
  const reps = cycle ? (cycle.weeks[weekNumber - 1]?.reps ?? '?') : '?';
  const blocks = (slot && cycle) ? (cycle.slots[slot] || []) : [];
  const allBlockExercises = blocks.flatMap(b => b.exercises);

  const loadSession = useCallback(async () => {
    if (!slot || !cycle) return;

    // Cerca sessione esistente senza crearne una nuova automaticamente
    const existing = await getSessionByDateAndSlot(date, slot);
    if (existing) {
      setSession(existing);
      setRecording(true); // c'è già una sessione → entra subito in modalità edit
      const savedEntries = await getEntriesBySession(existing.id);
      const entriesMap = {};
      for (const e of savedEntries) entriesMap[e.exerciseId] = e;
      setEntries(entriesMap);
    } else {
      setSession(null);
      setRecording(false);
    }

    const lastMap = {};
    for (const be of allBlockExercises) {
      lastMap[be.exerciseId] = await getLastEntryForExercise(be.exerciseId, date);
    }
    setLastEntries(lastMap);

    const exMap = {};
    for (const ex of await getAllExercises()) exMap[ex.id] = ex;
    setExercises(exMap);
  }, [date, slot, cycle, weekNumber]);

  useEffect(() => { loadSession(); }, [loadSession]);

  // Chiamato solo quando l'utente preme "Inizia" / "Registra"
  async function handleStartSession() {
    const sess = { id: uuidv4(), date, slot, cycleId: cycle.id, weekNumber, entries: [] };
    await saveSession(sess);
    setSession(sess);
    setRecording(true);
  }

  async function handleDeleteSession() {
    if (!session) return;
    await deleteSession(session.id);
    onBack();
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
    const d = new Date(newDate + 'T00:00:00');
    const autoSlot = getSlotFromDate(d);
    if (autoSlot) setSlot(autoSlot);
    else setShowSlotPicker(true);
  }

  const dateLabel = new Date(date + 'T00:00:00').toLocaleDateString('it-IT', {
    weekday: 'short', day: 'numeric', month: 'short',
  });

  const savedCount = Object.keys(entries).length;
  const totalCount = allBlockExercises.length;

  // Slot picker manuale (solo se richiesto esplicitamente dall'utente)
  if (showSlotPicker) {
    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <button className={styles.backBtn} onClick={onBack}>←</button>
          <span className={styles.headerTitle}>Scegli lo slot</span>
        </header>
        <div className={styles.slotPicker}>
          <p className={styles.slotPickerHint}>Scegli il programma manualmente</p>
          {SLOTS.map(s => (
            <button key={s} className={styles.slotBtn} onClick={() => { setSlot(s); setShowSlotPicker(false); }}>
              {slotLabel(s)}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={onBack}>←</button>
        <div className={styles.headerCenter}>
          <button className={styles.dateBtn} onClick={() => setShowCalendar(true)}>
            <span className={styles.dateBtnText}>{dateLabel}</span>
            {isHistorical && <span className={styles.historicalBadge}>storico</span>}
          </button>
          <button className={styles.slotBadge} onClick={() => setShowSlotPicker(true)}>
            {slotLabel(slot)}
          </button>
        </div>
        <div className={styles.headerRight}>
          <span className={styles.weekBadge}>
            Sett.{weekNumber} ×{reps}
            {isEditing && totalCount > 0 && (
              <span className={savedCount === totalCount ? styles.savedCountDone : styles.savedCount}>
                {' '}· {savedCount}/{totalCount}
              </span>
            )}
          </span>
          {isEditing && session && (
            <button className={styles.deleteBtn} onClick={() => setShowDeleteConfirm(true)} title="Elimina sessione">
              🗑
            </button>
          )}
        </div>
      </header>

      <div className={styles.body}>
        {blocks.map(block => (
          <div key={block.label} className={styles.block}>
            <div className={styles.blockLabel}>Blocco {block.label}</div>
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
                  readonly={!isEditing}
                  onSave={entryData => handleSaveEntry(be.exerciseId, entryData)}
                  onNameTap={() => setHistoryExercise(ex)}
                />
              );
            })}
          </div>
        ))}

        {blocks.length === 0 && (
          <div className={styles.empty}>Nessun esercizio per questo slot</div>
        )}
      </div>

      {/* Banner avvio — oggi o date passate non ancora registrate */}
      {!isEditing && (
        <div className={styles.startBanner}>
          <div className={styles.startBannerText}>
            <span className={styles.startBannerTitle}>
              {isHistorical ? 'Sessione non registrata' : 'Pronti?'}
            </span>
            <span className={styles.startBannerSub}>
              {isHistorical
                ? 'Registra questa sessione inserendo i valori manualmente'
                : 'Tocca per iniziare a registrare questa sessione'}
            </span>
          </div>
          <button className={styles.startBtn} onClick={handleStartSession}>
            {isHistorical ? 'Registra' : 'Inizia'}
          </button>
        </div>
      )}

      {/* Conferma elimina */}
      {showDeleteConfirm && (
        <div className={styles.deleteOverlay} onClick={() => setShowDeleteConfirm(false)}>
          <div className={styles.deleteSheet} onClick={e => e.stopPropagation()}>
            <p className={styles.deleteTitle}>Eliminare questa sessione?</p>
            <p className={styles.deleteSub}>Tutti i valori registrati verranno persi definitivamente.</p>
            <div className={styles.deleteBtns}>
              <button className={styles.deleteConfirmBtn} onClick={handleDeleteSession}>
                Elimina
              </button>
              <button className={styles.deleteCancelBtn} onClick={() => setShowDeleteConfirm(false)}>
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}

      {showCalendar && (
        <CalendarPicker
          selectedDate={date}
          onSelect={handleDateSelect}
          onClose={() => setShowCalendar(false)}
        />
      )}

      {historyExercise && (
        <ExerciseHistory
          exercise={historyExercise}
          onClose={() => setHistoryExercise(null)}
          onRenamed={updated => {
            setExercises(prev => ({ ...prev, [updated.id]: updated }));
            setHistoryExercise(null);
          }}
        />
      )}
    </div>
  );
}
