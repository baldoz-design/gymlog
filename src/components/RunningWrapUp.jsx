import { rpeZone } from '../rpe';
import { runningBefore, runningSessions, runWeekStreak } from '../running';
import CountUp from './CountUp';
import Confetti from './Confetti';
import wu from './WorkoutWrapUp.module.css';
import styles from './RunningWrapUp.module.css';

const MONTHS_S  = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
const MONTHS_IT = ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];
const DAYS_S    = ['dom','lun','mar','mer','gio','ven','sab'];
const COLORS    = ['#FF8FB1', '#D9F24B', '#F5F2EA', '#B9A2FF', '#5BA3FF'];
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const dayLabel = iso => { const d = new Date(iso + 'T00:00:00'); return `${cap(DAYS_S[d.getDay()])} ${d.getDate()} ${cap(MONTHS_S[d.getMonth()])}`; };

// sessions: tutte le sessioni, compresa quella appena salvata
export default function RunningWrapUp({ session, sessions, onClose }) {
  const prev = runningBefore(sessions, session.date).pop() || null;
  const rpe = session.perceivedEffort;
  const dr = prev?.perceivedEffort && rpe ? rpe - prev.perceivedEffort : null;
  const d = new Date(session.date + 'T00:00:00');
  const prefix = session.date.slice(0, 7);
  const month = runningSessions(sessions).filter(s => s.date.startsWith(prefix) && s.date <= session.date).length;
  const streak = runWeekStreak(sessions, session.date);
  const title = !prev ? 'Primo running registrato' : streak >= 2 ? `${streak} settimane di fila` : 'Running registrato';

  return (
    <div className={`${wu.overlay} ${styles.overlay}`} role="dialog" aria-modal="true" aria-labelledby="rwu-title">
      <Confetti colors={COLORS} />
      <div className={wu.inner}>
        <div className={wu.scroll}>
          <p className={`${wu.eyebrow} ${styles.eyebrow}`}>
            {DAYS_S[d.getDay()].toUpperCase()} {d.getDate()} {MONTHS_S[d.getMonth()].toUpperCase()} · RUNNING
          </p>
          <p className={styles.big}><CountUp value={rpe} /></p>
          <p className={styles.bigLbl}>sforzo · {rpeZone(rpe).label}</p>
          <div className={styles.meter} aria-hidden="true">
            {Array.from({ length: 10 }, (_, k) => k + 1).map(v => (
              <i key={v} style={{ background: rpeZone(v).color, opacity: v <= rpe ? 1 : 0.16, animationDelay: `${v * 40}ms` }} />
            ))}
          </div>
          <h1 id="rwu-title" className={wu.title}>{title}</h1>

          <div className={wu.strip}>
            <div className={wu.stat}>
              <span className={wu.statVal}>{dr == null ? '—' : dr === 0 ? '=' : `${dr > 0 ? '+' : '−'}${Math.abs(dr)}`}</span>
              <span className={wu.statLbl}>sulla volta scorsa</span>
            </div>
            <div className={wu.stat}>
              <span className={wu.statVal}><CountUp value={month} /></span>
              <span className={wu.statLbl}>a {MONTHS_IT[d.getMonth()]}</span>
            </div>
            <div className={wu.stat}>
              <span className={wu.statVal}><CountUp value={streak} /></span>
              <span className={wu.statLbl}>{streak >= 2 ? <b className={styles.good}>sett. di fila</b> : 'sett. di fila'}</span>
            </div>
          </div>
          {prev && (
            <p className={wu.vs}>
              Confronto con il running di {dayLabel(prev.date)}{prev.perceivedEffort ? `: sforzo ${prev.perceivedEffort}` : ''}.
            </p>
          )}
          <p className={wu.empty}>Conta anche questo nelle sessioni della settimana.</p>
        </div>
        <div className={wu.foot}>
          <button className={`${wu.cta} ${styles.cta}`} onClick={onClose}>CHIUDI</button>
        </div>
      </div>
    </div>
  );
}
