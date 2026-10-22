import { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { getAllExercises, getAllSessionEntries, getAllSessions, saveExercise } from '../db';
import { formatEntryValue, slotLabel, todayISO } from '../logic';
import { isoOf } from '../analytics';
import styles from './SwapSheet.module.css';

const EL_NAME = { blue: 'elastico azzurro', yellow: 'elastico giallo', orange: 'elastico arancione' };
const valueText = e => e.valueType === 'elastic' ? EL_NAME[e.elasticColor] : formatEntryValue(e);

export default function SwapSheet({ current, label, slot, hasEntry, excludeIds, onPick, onClose }) {
  const [scope,   setScope]   = useState('today');
  const [query,   setQuery]   = useState('');
  const [library, setLibrary] = useState(null);
  const [recentFrom] = useState(() => isoOf(new Date(Date.now() - 42 * 864e5)));

  useEffect(() => {
    Promise.all([getAllExercises(), getAllSessions(), getAllSessionEntries()]).then(([exercises, sessions, entries]) => {
      const dateOf = Object.fromEntries(sessions.map(s => [s.id, s.date]));
      const stats = {};
      for (const e of entries) {
        const d = dateOf[e.sessionId];
        if (!d) continue;
        const st = (stats[e.exerciseId] ||= { count: 0, last: null, lastDate: '' });
        st.count++;
        if (d > st.lastDate) { st.last = e; st.lastDate = d; }
      }
      setLibrary({ exercises, stats });
    });
  }, []);

  const q = query.trim().toLowerCase();
  const pool = (library?.exercises || [])
    .filter(ex => !excludeIds.includes(ex.id) && (!q || ex.canonicalName.toLowerCase().includes(q)))
    .sort((a, b) => a.canonicalName.localeCompare(b.canonicalName));
  const stats = library?.stats || {};
  const recent = q ? [] : pool
    .filter(ex => stats[ex.id]?.lastDate >= recentFrom)
    .sort((a, b) => stats[b.id].lastDate.localeCompare(stats[a.id].lastDate))
    .slice(0, 5);
  const exact = (library?.exercises || []).some(ex => ex.canonicalName.toLowerCase() === q);

  async function addNew() {
    const ex = { id: uuidv4(), canonicalName: query.trim(), createdAt: todayISO() };
    await saveExercise(ex);
    onPick(ex, scope);
  }

  const row = ex => {
    const st = stats[ex.id];
    return (
      <button key={ex.id} className={styles.row} onClick={() => onPick(ex, scope)}>
        <span className={styles.rowMain}>
          <span className={styles.rowName}>{ex.canonicalName}</span>
          <span className={styles.rowMeta}>
            {st ? `${st.count} ${st.count === 1 ? 'sessione' : 'sessioni'} · ultima ${valueText(st.last)}` : 'Mai registrato'}
          </span>
        </span>
        <span className={styles.rowGo}>→</span>
      </button>
    );
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.sheet} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="sw-title">
        <div className={styles.head}>
          <div className={styles.titleBlock}>
            <h2 id="sw-title" className={styles.title}>Cambia esercizio</h2>
            <p className={styles.sub}>Al posto di <b>{current.canonicalName}</b> · {label}</p>
          </div>
          <button className={styles.close} onClick={onClose} aria-label="Chiudi">×</button>
        </div>

        <div className={styles.seg} role="radiogroup" aria-label="Validità del cambio">
          <button role="radio" aria-checked={scope === 'today'}
            className={`${styles.segBtn} ${scope === 'today' ? styles.segOn : ''}`} onClick={() => setScope('today')}>
            Solo oggi
          </button>
          <button role="radio" aria-checked={scope === 'program'}
            className={`${styles.segBtn} ${scope === 'program' ? styles.segOn : ''}`} onClick={() => setScope('program')}>
            Da oggi nel programma
          </button>
        </div>
        <p className={styles.help}>
          {scope === 'today'
            ? 'Per un dolore o una variante: il programma resta com’è.'
            : `Da oggi ${slotLabel(slot)} usa il nuovo esercizio. Le sessioni passate restano come sono.`}
        </p>
        {hasEntry && <p className={styles.warn}>Il valore già salvato oggi per {current.canonicalName} verrà tolto.</p>}

        <div className={styles.search}>
          <span className={styles.searchIcon}>⌕</span>
          <input className={styles.searchInput} type="search" placeholder="Cerca nella libreria…"
            value={query} onChange={e => setQuery(e.target.value)} aria-label="Cerca esercizio" />
        </div>

        <div className={styles.list}>
          {q && !exact && (
            <button className={`${styles.row} ${styles.rowNew}`} onClick={addNew}>
              <span className={styles.rowMain}>
                <span className={styles.rowName}>+ Aggiungi «{query.trim()}»</span>
                <span className={styles.rowMeta}>Nuovo esercizio nella libreria</span>
              </span>
            </button>
          )}
          {recent.length > 0 && (
            <>
              <p className={styles.section}>USATI DI RECENTE</p>
              {recent.map(row)}
            </>
          )}
          <p className={styles.section}>{q ? 'RISULTATI' : 'TUTTI'}</p>
          {!library && <p className={styles.empty}>Caricamento…</p>}
          {library && (pool.length ? pool.map(row) : <p className={styles.empty}>Nessun esercizio con questo nome.</p>)}
        </div>
      </div>
    </div>
  );
}

export function SwapToast({ text, onUndo }) {
  return (
    <div className={styles.toast} role="status">
      <span className={styles.toastTxt}>{text}</span>
      <button className={styles.toastBtn} onClick={onUndo}>Annulla</button>
    </div>
  );
}
