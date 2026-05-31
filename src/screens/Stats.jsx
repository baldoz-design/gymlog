import { useEffect, useState } from 'react';
import { getAllExercises, getExerciseHistory } from '../db';
import { formatEntryValue, formatDateLabel } from '../logic';
import ExerciseHistory from '../components/ExerciseHistory';
import styles from './Stats.module.css';

export default function Stats({ onBack }) {
  const [exercises, setExercises] = useState([]);
  const [data, setData] = useState({});
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    async function load() {
      const exs = await getAllExercises();
      exs.sort((a, b) => a.canonicalName.localeCompare(b.canonicalName));
      setExercises(exs);

      const map = {};
      for (const ex of exs) {
        const h = await getExerciseHistory(ex.id);
        map[ex.id] = {
          count: h.length,
          first: h[h.length - 1] || null,
          last: h[0] || null,
        };
      }
      setData(map);
    }
    load();
  }, []);

  const filtered = exercises.filter(e =>
    e.canonicalName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={onBack}>←</button>
        <span className={styles.title}>Statistiche</span>
      </header>

      <div className={styles.searchBar}>
        <input
          type="search"
          placeholder="Cerca esercizio..."
          className={styles.searchInput}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <ul className={styles.list}>
        {filtered.map(ex => {
          const d = data[ex.id];
          const first = d?.first;
          const last = d?.last;
          const firstVal = first ? formatEntryValue(first) : null;
          const lastVal = last ? formatEntryValue(last) : null;
          const sameEntry = first && last && first.id === last.id;

          return (
            <li key={ex.id}>
              <button className={styles.exRow} onClick={() => setSelected(ex)}>
                <div className={styles.exInfo}>
                  <span className={styles.exName}>{ex.canonicalName}</span>
                  {d?.count > 0 ? (
                    <div className={styles.progression}>
                      {sameEntry ? (
                        <span className={styles.progSingle}>
                          {formatDateLabel(first.date)} · {firstVal}
                        </span>
                      ) : (
                        <>
                          <span className={styles.progFirst}>{firstVal}</span>
                          <span className={styles.progArrow}>→</span>
                          <span className={styles.progLast}>{lastVal}</span>
                          {last?.isIncrease && <span className={styles.progUp}>↑</span>}
                        </>
                      )}
                    </div>
                  ) : (
                    <span className={styles.exMeta}>Nessuna sessione</span>
                  )}
                </div>
                <span className={styles.count}>{d?.count ?? 0} sess.</span>
              </button>
            </li>
          );
        })}
        {filtered.length === 0 && (
          <li className={styles.empty}>Nessun esercizio trovato</li>
        )}
      </ul>

      {selected && (
        <ExerciseHistory
          exercise={selected}
          onClose={() => setSelected(null)}
          onRenamed={updated => {
            setExercises(prev => prev.map(e => e.id === updated.id ? updated : e));
            setSelected(null);
          }}
        />
      )}
    </div>
  );
}
