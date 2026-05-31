import { useEffect, useRef, useState } from 'react';
import { getExerciseHistory, renameExercise } from '../db';
import { formatEntryValue, formatDateLabel } from '../logic';
import styles from './ExerciseHistory.module.css';

const MAX_VISIBLE = 20;

export default function ExerciseHistory({ exercise, onClose, onRenamed }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [renaming, setRenaming] = useState(false);
  const [nameInput, setNameInput] = useState(exercise.canonicalName);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef();

  useEffect(() => {
    getExerciseHistory(exercise.id).then(h => {
      setHistory(h);
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

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.sheet} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          {renaming ? (
            <input
              ref={inputRef}
              className={styles.renameInput}
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          ) : (
            <span className={styles.title}>{exercise.canonicalName}</span>
          )}

          <div className={styles.headerActions}>
            {renaming ? (
              <>
                <button className={styles.saveBtn} onClick={handleSaveRename} disabled={saving}>
                  {saving ? '…' : 'Salva'}
                </button>
                <button className={styles.cancelBtn} onClick={() => { setNameInput(exercise.canonicalName); setRenaming(false); }}>
                  Annulla
                </button>
              </>
            ) : (
              <button className={styles.renameBtn} onClick={() => setRenaming(true)} title="Rinomina">
                ✎
              </button>
            )}
            <button className={styles.closeBtn} onClick={onClose}>✕</button>
          </div>
        </div>

        <div className={styles.body}>
          {loading && <div className={styles.hint}>Caricamento...</div>}

          {!loading && history.length === 0 && (
            <div className={styles.hint}>Prima sessione registrata per questo esercizio</div>
          )}

          {!loading && history.length > 0 && (
            <ul className={styles.list}>
              {history.slice(0, MAX_VISIBLE).map(entry => (
                <li key={entry.id} className={styles.row}>
                  <span className={styles.rowDate}>{formatDateLabel(entry.date)}</span>
                  <span className={styles.rowValue}>{formatEntryValue(entry)}</span>
                  {entry.isIncrease && <span className={styles.arrow}>↑</span>}
                </li>
              ))}
              {history.length > MAX_VISIBLE && (
                <li className={styles.more}>+ altri {history.length - MAX_VISIBLE} risultati</li>
              )}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
