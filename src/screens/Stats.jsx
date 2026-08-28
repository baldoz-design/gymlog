import { useEffect, useState } from 'react';
import { getAllExercises, getExerciseHistory, getAllSessions, getEntriesBySession } from '../db';
import { formatEntryValue } from '../logic';
import ExerciseHistory from '../components/ExerciseHistory';
import styles from './Stats.module.css';

const FILTERS = [
  { id: 'all',        label: 'Ultimi 8' },
  { id: 'weight',     label: 'Con peso' },
  { id: 'elastic',    label: 'Con elastico' },
  { id: 'bodyweight', label: 'Corpo lib.' },
];

const EL_CSS = { blue: 'var(--azzurro)', yellow: 'var(--giallo)', orange: 'var(--arancione)' };

function getType(history) {
  if (!history.length) return 'none';
  const types = new Set(history.map(e => e.valueType));
  if (types.size > 1) return 'mixed';
  return [...types][0];
}

function MiniBarChart({ history }) {
  const vals = history.filter(e => e.valueType === 'weight').map(e => e.weightKg).slice(-6);
  if (vals.length < 2) return null;
  const max     = Math.max(...vals);
  const peakIdx = vals.lastIndexOf(max);
  return (
    <div className={styles.miniChart}>
      {vals.map((v, i) => (
        <div key={i}
          className={[styles.miniBar, i === peakIdx ? styles.miniBarPeak : ''].join(' ')}
          style={{ height: `${Math.max(20, (v / max) * 100)}%` }}
        />
      ))}
    </div>
  );
}

function ElasticDots({ history }) {
  const entries = history.filter(e => e.valueType === 'elastic').slice(-6);
  return (
    <div className={styles.dotRow}>
      {entries.map((e, i) => (
        <span key={i} className={styles.colorDot} style={{ color: EL_CSS[e.elasticColor] }}>●</span>
      ))}
    </div>
  );
}

function MixedChart({ history }) {
  const entries = history.slice(-6);
  return (
    <div className={styles.dotRow}>
      {entries.map((e, i) =>
        e.valueType === 'bodyweight'
          ? <span key={i} className={styles.dash}>-</span>
          : <span key={i} className={styles.colorDot} style={{ color: EL_CSS[e.elasticColor] }}>●</span>
      )}
    </div>
  );
}

export default function Stats({ onBack }) {
  const [exercises,    setExercises]    = useState([]);
  const [data,         setData]         = useState({});
  const [filter,       setFilter]       = useState('all');
  const [selected,     setSelected]     = useState(null);
  const [lastSessionIds, setLastSessionIds] = useState(new Set());
  const [search,       setSearch]       = useState('');

  useEffect(() => {
    async function load() {
      // Find the most recent session that has at least one entry
      const sessions = await getAllSessions();
      sessions.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
      for (const sess of sessions) {
        const entries = await getEntriesBySession(sess.id);
        if (entries.length > 0) {
          setLastSessionIds(new Set(entries.map(e => e.exerciseId)));
          break;
        }
      }

      const exs = await getAllExercises();
      exs.sort((a, b) => a.canonicalName.localeCompare(b.canonicalName));
      setExercises(exs);
      const map = {};
      for (const ex of exs) {
        const h = await getExerciseHistory(ex.id); // newest first
        map[ex.id] = {
          count:   h.length,
          last:    h[0] || null,
          history: [...h].reverse(), // oldest first for charts
          type:    getType(h),
        };
      }
      setData(map);
    }
    load();
  }, []);

  const searchLower = search.trim().toLowerCase();
  const filtered = exercises.filter(ex => {
    const d = data[ex.id];
    if (!d || d.count === 0) return false;
    if (filter === 'all')        { if (!lastSessionIds.has(ex.id)) return false; }
    else if (filter === 'weight')     { if (!d.history.some(e => e.valueType === 'weight'))     return false; }
    else if (filter === 'elastic')    { if (!d.history.some(e => e.valueType === 'elastic'))    return false; }
    else if (filter === 'bodyweight') { if (!d.history.some(e => e.valueType === 'bodyweight')) return false; }
    if (searchLower && !ex.canonicalName.toLowerCase().includes(searchLower)) return false;
    return true;
  });

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={onBack}>←</button>
      </header>

      <h1 className={styles.pageTitle}>Statistiche</h1>

      <div className={styles.searchWrap}>
        <span className={styles.searchIcon}>⌕</span>
        <input
          className={styles.searchInput}
          type="search"
          placeholder="Cerca esercizio…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button className={styles.searchClear} onClick={() => setSearch('')}>×</button>
        )}
      </div>

      <div className={styles.filterRow}>
        {FILTERS.map(f => (
          <button
            key={f.id}
            className={[styles.filterPill, filter === f.id ? styles.filterActive : ''].join(' ')}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className={styles.list}>
        {filtered.map(ex => {
          const d    = data[ex.id];
          const last = d?.last;
          const lastVal = last ? formatEntryValue(last) : '—';
          const history = d?.history || [];
          const type    = d?.type    || 'none';

          const max = type === 'weight'
            ? Math.max(...history.filter(e => e.valueType === 'weight').map(e => e.weightKg), 0)
            : null;

          let meta = `${d?.count} SESSIONI`;
          if (type === 'weight' && max)   meta += ` · MAX ${max} KG`;
          else if (type === 'elastic')    meta += ' · ELASTICO';
          else if (type === 'bodyweight') meta += ' · CORPO LIBERO';
          else if (type === 'mixed')      meta += ' · MISTO';

          return (
            <button key={ex.id} className={styles.exRow} onClick={() => setSelected(ex)}>
              <div className={styles.exMain}>
                <span className={styles.exName}>{ex.canonicalName}</span>
                <span className={styles.exMeta}>{meta}</span>
              </div>
              <div className={styles.exChart}>
                {(type === 'weight' || type === 'bodyweight') && <MiniBarChart history={history} />}
                {type === 'elastic' && <ElasticDots history={history} />}
                {type === 'mixed'   && <MixedChart  history={history} />}
              </div>
              <span className={styles.exValue}>
                {last?.valueType === 'elastic'
                  ? <span style={{ color: EL_CSS[last.elasticColor], fontSize: 18 }}>●</span>
                  : lastVal}
              </span>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div className={styles.empty}>Nessun esercizio con dati</div>
        )}
      </div>

      {selected && (
        <ExerciseHistory
          exercise={selected}
          onClose={() => setSelected(null)}
          onRenamed={upd => {
            setExercises(prev => prev.map(e => e.id === upd.id ? upd : e));
            setSelected(null);
          }}
        />
      )}
    </div>
  );
}
