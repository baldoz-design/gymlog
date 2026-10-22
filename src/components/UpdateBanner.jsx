import { useEffect, useState } from 'react';
import styles from './UpdateBanner.module.css';

const CURRENT = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';
const POLL_MS = 5 * 60 * 1000;

export default function UpdateBanner() {
  const [available, setAvailable] = useState(false);
  const [notes,     setNotes]     = useState([]);
  const [open,      setOpen]      = useState(false);

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
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="upd-title">
      <div className={styles.card}>
        <div className={styles.eyebrow}>
          <span className={styles.dot} />
          <span className={styles.eyebrowTxt}>AGGIORNAMENTO</span>
        </div>
        <h2 id="upd-title" className={styles.title}>Nuova versione disponibile</h2>
        <p className={styles.sub}>Aggiorna per continuare con l'ultima versione di GymLog.</p>

        {notes.length > 0 && (
          <>
            <button className={styles.accBtn} onClick={() => setOpen(o => !o)} aria-expanded={open}>
              <span className={styles.accLbl}>Cosa cambia</span>
              <span className={styles.accCount}>{notes.length} NOVITÀ</span>
              <span className={`${styles.accChev} ${open ? styles.accChevOpen : ''}`}>▾</span>
            </button>
            {open && (
              <ul className={styles.notes}>
                {notes.map((n, i) => <li key={i} className={styles.note}><span className={styles.noteDot} />{n}</li>)}
              </ul>
            )}
          </>
        )}

        <button className={styles.cta} onClick={() => window.location.reload()}>AGGIORNA</button>
      </div>
    </div>
  );
}
