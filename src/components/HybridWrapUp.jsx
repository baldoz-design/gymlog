import { rpeZone } from '../rpe';
import { getCircuit, hybridMinutes, lapsText } from '../hybrid';
import CountUp from './CountUp';
import Confetti from './Confetti';
import Laps from './Laps';
import wu from './WorkoutWrapUp.module.css';
import styles from './HybridWrapUp.module.css';

const MONTHS_S = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
const DAYS_S   = ['dom','lun','mar','mer','gio','ven','sab'];
const COLORS   = ['#B9A2FF', '#D9F24B', '#F5F2EA', '#5BA3FF', '#E0762C'];
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const dayLabel = iso => { const d = new Date(iso + 'T00:00:00'); return `${cap(DAYS_S[d.getDay()])} ${d.getDate()} ${cap(MONTHS_S[d.getMonth()])}`; };

// history: lezioni Hybrid precedenti, dalla più vecchia
export default function HybridWrapUp({ session, history, onClose }) {
  const c = getCircuit();
  const size = c.stations.length;
  const prev = history[history.length - 1] || null;
  const record = history.length ? Math.max(...history.map(s => s.stations.length)) : null;
  const n = session.stations.length;
  const rpe = session.perceivedEffort;
  const dn = prev ? n - prev.stations.length : null;
  const dr = prev?.perceivedEffort && rpe ? rpe - prev.perceivedEffort : null;
  const d = new Date(session.date + 'T00:00:00');
  const title = record == null ? 'Primo Hybrid registrato'
    : n > record ? 'Nuovo record di stazioni'
    : dn > 0 ? `${dn === 1 ? 'Una stazione' : `${dn} stazioni`} in più`
    : dn === 0 ? 'Come la volta scorsa'
    : 'Hybrid completato';

  return (
    <div className={`${wu.overlay} ${styles.overlay}`} role="dialog" aria-modal="true" aria-labelledby="hwu-title">
      <Confetti colors={COLORS} />
      <div className={wu.inner}>
        <div className={wu.scroll}>
          <p className={`${wu.eyebrow} ${styles.eyebrow}`}>
            {DAYS_S[d.getDay()].toUpperCase()} {d.getDate()} {MONTHS_S[d.getMonth()].toUpperCase()} · HYBRID
          </p>
          <p className={styles.big}><CountUp value={n} /></p>
          <p className={styles.bigLbl}>stazioni · {lapsText(n, size)}</p>
          <div className={styles.laps}><Laps n={n} size={size} variant="big" /></div>
          <h1 id="hwu-title" className={wu.title}>{title}</h1>

          <div className={wu.strip}>
            <div className={wu.stat}>
              <span className={wu.statVal}>
                {rpe ? <><i className={wu.dot} style={{ background: rpeZone(rpe).color }} /><CountUp value={rpe} /></> : '—'}
              </span>
              <span className={wu.statLbl}>
                sforzo
                {dr ? <> <b className={dr < 0 ? styles.good : ''}>{dr > 0 ? '+' : '−'}{Math.abs(dr)}</b></> : null}
              </span>
            </div>
            <div className={wu.stat}>
              <span className={wu.statVal}><CountUp value={hybridMinutes(c, n)} /><small>min</small></span>
              <span className={wu.statLbl}>durata stimata</span>
            </div>
            <div className={wu.stat}>
              <span className={wu.statVal}>{Math.max(n, record ?? 0)}</span>
              <span className={wu.statLbl}>
                {record != null && n > record ? <b className={styles.good}>nuovo record</b> : 'record'}
              </span>
            </div>
          </div>
          {prev && (
            <p className={wu.vs}>
              Confronto con l'Hybrid di {dayLabel(prev.date)}: {prev.stations.length} stazioni{prev.perceivedEffort ? `, sforzo ${prev.perceivedEffort}` : ''}.
            </p>
          )}

          <p className={wu.section}>LE STAZIONI DI OGGI</p>
          <div className={wu.list}>
            {session.stations.map((x, k) => {
              const st = c.stations.find(y => y.n === x.n);
              return (
                <div key={k} className={wu.row} style={{ animationDelay: `${0.35 + k * 0.06}s` }}>
                  <span className={`${wu.badge} ${styles.badge}`}>Stazione {x.n}</span>
                  <span className={wu.rowMain}>
                    <span className={wu.rowName}>{st?.cardio || '?'} + {x.choice}</span>
                    <span className={wu.rowDetail}>giro {Math.floor(k / size) + 1}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        <div className={wu.foot}>
          <button className={`${wu.cta} ${styles.cta}`} onClick={onClose}>CHIUDI</button>
        </div>
      </div>
    </div>
  );
}
