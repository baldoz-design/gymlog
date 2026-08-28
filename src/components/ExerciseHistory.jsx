import { useEffect, useRef, useState } from 'react';
import { getExerciseHistory, renameExercise } from '../db';
import { formatEntryValue } from '../logic';
import styles from './ExerciseHistory.module.css';

const MONTHS_S = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
const DAYS_S   = ['dom','lun','mar','mer','gio','ven','sab'];
const EL_CSS   = { blue: 'var(--azzurro)', yellow: 'var(--giallo)', orange: 'var(--arancione)' };

function sessionDateLabel(iso) {
  const d = new Date(iso + 'T00:00:00');
  const day  = DAYS_S[d.getDay()];
  const mo   = MONTHS_S[d.getMonth()];
  return `${day.charAt(0).toUpperCase() + day.slice(1)} ${d.getDate()} ${mo.charAt(0).toUpperCase() + mo.slice(1)}`;
}

function monthLabel(iso) {
  const d = new Date(iso + 'T00:00:00');
  return `${MONTHS_S[d.getMonth()].toUpperCase()} ${d.getFullYear()}`;
}

function WeightChart({ history }) {
  // newest-first; take last 6 for chart (oldest to newest)
  const entries = [...history].reverse().slice(-6);
  if (entries.length < 2) return null;
  const vals   = entries.map(e => e.weightKg);
  const max    = Math.max(...vals);
  const peakI  = vals.lastIndexOf(max);
  const oldest = entries[0].date;
  const newest = entries[entries.length - 1].date;

  return (
    <div className={styles.chartWrap}>
      <div className={styles.chart}>
        {vals.map((v, i) => (
          <div key={i} className={styles.barCol}>
            <span className={[styles.barLabel, i === peakI ? styles.barLabelPeak : ''].join(' ')}>
              {v}
            </span>
            <div
              className={[styles.bar, i === peakI ? styles.barPeak : ''].join(' ')}
              style={{ height: `${Math.max(20, (v / max) * 100)}%` }}
            />
          </div>
        ))}
      </div>
      <div className={styles.chartXAxis}>
        <span>{monthLabel(oldest)}</span>
        <span>{monthLabel(newest)}</span>
      </div>
    </div>
  );
}

function SequenceChart({ history }) {
  // For elastic / bodyweight / mixed — show last 6 as dots/dashes in a row
  const entries = [...history].reverse().slice(-6); // oldest to newest, max 6
  if (!entries.length) return null;
  const oldest = entries[0].date;
  const newest = entries[entries.length - 1].date;

  return (
    <div className={styles.chartWrap}>
      <div className={styles.seqChart}>
        {entries.map((e, i) => (
          <div key={i} className={styles.seqCol}>
            {e.valueType === 'elastic' ? (
              <span className={styles.seqDot} style={{ color: EL_CSS[e.elasticColor] }}>●</span>
            ) : (
              <span className={styles.seqDash}>-</span>
            )}
          </div>
        ))}
      </div>
      <div className={styles.chartXAxis}>
        <span>{monthLabel(oldest)}</span>
        {oldest !== newest && <span>{monthLabel(newest)}</span>}
      </div>
    </div>
  );
}

export default function ExerciseHistory({ exercise, onClose, onRenamed }) {
  const [history,  setHistory]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [renaming, setRenaming] = useState(false);
  const [nameInput, setNameInput] = useState(exercise.canonicalName);
  const [saving,   setSaving]   = useState(false);
  const inputRef = useRef();

  useEffect(() => {
    getExerciseHistory(exercise.id).then(h => {
      setHistory(h); // newest first
      setLoading(false);
    });
  }, [exercise.id]);

  useEffect(() => {
    if (renaming) setTimeout(() => inputRef.current?.focus(), 50);
  }, [renaming]);

  async function handleSaveRename() {
    const trimmed = nameInput.trim();
    if (!trimmed || trimmed === exercise.canonicalName) { setRenaming(false); return; }
    setSaving(true);
    await renameExercise(exercise.id, trimmed);
    setSaving(false);
    setRenaming(false);
    onRenamed?.({ ...exercise, canonicalName: trimmed });
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleSaveRename();
    if (e.key === 'Escape') { setNameInput(exercise.canonicalName); setRenaming(false); }
  }

  // Derive stats
  const weightEntries  = history.filter(e => e.valueType === 'weight');
  const elasticEntries = history.filter(e => e.valueType === 'elastic');
  const maxKg    = weightEntries.length ? Math.max(...weightEntries.map(e => e.weightKg)) : null;
  const firstKg  = weightEntries.length ? weightEntries[weightEntries.length - 1].weightKg : null;
  const lastKg   = weightEntries.length ? weightEntries[0].weightKg : null;
  const delta    = (firstKg !== null && lastKg !== null) ? Math.round((lastKg - firstKg) * 10) / 10 : null;

  const isWeightEx   = weightEntries.length > 0;
  const hasSequence  = elasticEntries.length > 0 || history.some(e => e.valueType === 'bodyweight');
  const oldestDate   = history.length ? history[history.length - 1].date : null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.sheet} onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className={styles.sheetHeader}>
          <div className={styles.titleBlock}>
            {renaming ? (
              <input
                ref={inputRef}
                className={styles.renameInput}
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            ) : (
              <h2 className={styles.exTitle} onClick={() => setRenaming(true)}>{exercise.canonicalName}</h2>
            )}
            <p className={styles.exMeta}>
              {history.length} SESSIONI
              {oldestDate && ` · DA ${monthLabel(oldestDate)}`}
            </p>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        {renaming && (
          <div className={styles.renameActions}>
            <button className={styles.saveBtn} onClick={handleSaveRename} disabled={saving}>
              {saving ? '…' : 'Salva'}
            </button>
            <button className={styles.cancelBtn} onClick={() => { setNameInput(exercise.canonicalName); setRenaming(false); }}>
              Annulla
            </button>
          </div>
        )}

        <div className={styles.body}>
          {loading && <div className={styles.hint}>Caricamento...</div>}

          {!loading && history.length === 0 && (
            <div className={styles.hint}>Prima sessione per questo esercizio</div>
          )}

          {/* ── Stats boxes (weight only) ── */}
          {!loading && isWeightEx && (
            <div className={styles.statsBoxes}>
              <div className={styles.statBox}>
                <span className={styles.statLabel}>ATTUALE</span>
                <span className={styles.statVal}>{lastKg} <span className={styles.statUnit}>kg</span></span>
              </div>
              <div className={styles.statBox}>
                <span className={styles.statLabel}>MASSIMO</span>
                <span className={[styles.statVal, styles.statValPeak].join(' ')}>{maxKg} <span className={styles.statUnit}>kg</span></span>
              </div>
              <div className={styles.statBox}>
                <span className={styles.statLabel}>DELTA</span>
                <span className={styles.statVal}>{delta >= 0 ? '+' : ''}{delta} <span className={styles.statUnit}>kg</span></span>
              </div>
            </div>
          )}

          {/* ── Chart ── */}
          {!loading && isWeightEx && weightEntries.length >= 2 && (
            <WeightChart history={history} />
          )}
          {!loading && !isWeightEx && hasSequence && history.length >= 2 && (
            <SequenceChart history={history} />
          )}

          {/* ── History list ── */}
          {!loading && history.length > 0 && (
            <ul className={styles.list}>
              {history.slice(0, 20).map(entry => (
                <li key={entry.id} className={styles.row}>
                  <span className={styles.rowDate}>{sessionDateLabel(entry.date)}</span>
                  <span className={[styles.rowVal, entry.isIncrease ? styles.rowValPeak : ''].join(' ')}>
                    {entry.valueType === 'elastic' ? (
                      <span className={styles.rowElDot} style={{ color: EL_CSS[entry.elasticColor] }}>●</span>
                    ) : (
                      formatEntryValue(entry)
                    )}
                    {entry.isIncrease && ' ↑'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
