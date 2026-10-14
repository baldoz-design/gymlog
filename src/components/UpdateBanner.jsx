import { useEffect, useState } from 'react';
import styles from './UpdateBanner.module.css';

const CURRENT = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';
const POLL_MS = 5 * 60 * 1000;

export default function UpdateBanner() {
  const [available, setAvailable] = useState(false);
  const [notes,     setNotes]     = useState([]);
  const [expanded,  setExpanded]  = useState(false);

  useEffect(() => {
    if (import.meta.env.DEV) return;

    const check = async () => {
      try {
        const res  = await fetch(`${import.meta.env.BASE_URL}version.json?t=${Date.now()}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.v && data.v !== CURRENT) {
          setNotes(data.notes || []);
          setAvailable(true);
        }
      } catch { /* silent */ }
    };

    const delay    = setTimeout(check, 30_000);
    const interval = setInterval(check, POLL_MS);
    return () => { clearTimeout(delay); clearInterval(interval); };
  }, []);

  if (!available) return null;

  return (
    <div className={styles.banner}>
      <div className={styles.row} onClick={notes.length ? () => setExpanded(e => !e) : undefined}>
        <span className={styles.dot} />
        <span className={styles.label}>Aggiornamento disponibile</span>
        {notes.length > 0 && (
          <span className={styles.chevron}>{expanded ? '▾' : '▴'}</span>
        )}
        <button
          className={styles.btn}
          onClick={e => { e.stopPropagation(); window.location.reload(); }}
        >
          Aggiorna
        </button>
      </div>

      {expanded && notes.length > 0 && (
        <ul className={styles.notes}>
          {notes.map((n, i) => <li key={i}>{n}</li>)}
        </ul>
      )}
    </div>
  );
}
