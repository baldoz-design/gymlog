import { getSlotFromDate, getWeekNumberInCycle, slotLabel } from '../logic';
import { SLOTS } from '../analytics';
import { isHybrid } from '../hybrid';
import { isRunning } from '../running';
import styles from './DaySheet.module.css';

const MONTHS_S = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
const DAYS_IT  = ['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'];

function sessionTitle(s) {
  if (isRunning(s)) return 'Running';
  if (isHybrid(s))  return 'Hybrid';
  return `Strength · ${slotLabel(s.slot)}`;
}

function sessionMeta(s) {
  if (isRunning(s)) return s.perceivedEffort ? `Sforzo ${s.perceivedEffort}` : 'Senza sforzo';
  if (isHybrid(s))  return `${s.stations?.length || 0} stazioni${s.perceivedEffort ? ` · sforzo ${s.perceivedEffort}` : ''}`;
  return `Settimana ${s.weekNumber}`;
}

// Le sessioni di un giorno del calendario e quelle che si possono aggiungere.
// cycle: il programma in vigore quel giorno, null se non ce n'è uno.
export default function DaySheet({ date, sessions, cycle, onOpen, onAddStrength, onAddHybrid, onAddRunning, onClose }) {
  const d = new Date(date + 'T00:00:00');
  const suggestedSlot = getSlotFromDate(d);
  const week = cycle ? getWeekNumberInCycle(date, cycle.startDate) : null;
  const hasHybrid  = sessions.some(isHybrid);
  const hasRunning = sessions.some(isRunning);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.sheet} role="dialog" aria-modal="true" aria-labelledby="day-title" onClick={e => e.stopPropagation()}>
        <div className={styles.head}>
          <div className={styles.titleBlock}>
            <h2 id="day-title" className={styles.title}>{DAYS_IT[d.getDay()]} {d.getDate()} {MONTHS_S[d.getMonth()]}</h2>
            <p className={styles.sub}>
              {sessions.length ? `${sessions.length} ${sessions.length === 1 ? 'sessione registrata' : 'sessioni registrate'}` : 'Nessuna sessione registrata'}
            </p>
          </div>
          <button className={styles.close} onClick={onClose} aria-label="Chiudi">×</button>
        </div>

        {sessions.map(s => (
          <button key={s.id} className={styles.row} onClick={() => onOpen(s)}>
            <i className={`${styles.mark} ${isHybrid(s) ? styles.markHybrid : isRunning(s) ? styles.markRun : ''}`} />
            <span className={styles.rowMain}>
              <span className={styles.rowName}>{sessionTitle(s)}</span>
              <span className={styles.rowMeta}>{sessionMeta(s)}</span>
            </span>
            <span className={styles.rowGo}>→</span>
          </button>
        ))}

        <p className={styles.section}>AGGIUNGI</p>
        <div className={styles.addRow}>
          <i className={styles.mark} />
          <span className={styles.rowMain}>
            <span className={styles.rowName}>Strength</span>
            <span className={styles.rowMeta}>{cycle ? `Settimana ${week} del programma` : 'Nessun programma per questa data'}</span>
          </span>
        </div>
        {cycle && (
          <div className={styles.slots}>
            {SLOTS.map(slot => (
              <button
                key={slot}
                className={`${styles.slotBtn} ${slot === suggestedSlot ? styles.slotOn : ''}`}
                onClick={() => onAddStrength(slot)}
              >{slotLabel(slot)}</button>
            ))}
          </div>
        )}
        {!hasHybrid && (
          <button className={styles.row} onClick={onAddHybrid}>
            <i className={`${styles.mark} ${styles.markHybrid}`} />
            <span className={styles.rowMain}>
              <span className={styles.rowName}>Hybrid</span>
              <span className={styles.rowMeta}>Stazioni e sforzo complessivo</span>
            </span>
            <span className={styles.rowGo}>→</span>
          </button>
        )}
        {!hasRunning && (
          <button className={styles.row} onClick={onAddRunning}>
            <i className={`${styles.mark} ${styles.markRun}`} />
            <span className={styles.rowMain}>
              <span className={styles.rowName}>Running</span>
              <span className={styles.rowMeta}>Presenza e sforzo complessivo</span>
            </span>
            <span className={styles.rowGo}>→</span>
          </button>
        )}
      </div>
    </div>
  );
}
