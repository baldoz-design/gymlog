import { useEffect, useState } from 'react';
import { getAllCycles, getAllExercises, getAllSessionEntries, getAllSessions } from '../db';
import { slotLabel } from '../logic';
import { rpeZone } from '../rpe';
import { workoutSummary } from '../workout';
import CountUp from './CountUp';
import Confetti from './Confetti';
import styles from './WorkoutWrapUp.module.css';

const MONTHS_S = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
const DAYS_S   = ['dom','lun','mar','mer','gio','ven','sab'];
const KIND_TONE = { load: 'var(--accent)', reps: '#5BA3FF', easier: '#9BE3B0' };
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const RING_C = 2 * Math.PI * 52;

export default function WorkoutWrapUp({ session, sessionEntries, onClose }) {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    Promise.all([getAllSessions(), getAllSessionEntries(), getAllCycles(), getAllExercises()])
      .then(([sessions, entries, cycles, exercises]) => {
        setSummary(workoutSummary({ session, sessionEntries, sessions, entries, cycles, exercises }));
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- il riepilogo si calcola una volta, all'apertura

  const d = new Date(session.date + 'T00:00:00');

  if (!summary) return <div className={styles.overlay} />;

  const w = summary;
  const pct = w.total ? w.done / w.total : 0;
  const rpeDelta = w.rpe != null && w.prevRpe != null ? Math.round((w.rpe - w.prevRpe) * 10) / 10 : null;
  const volDelta = w.volumeShared && w.prevVolumeShared ? Math.round((w.volumeShared / w.prevVolumeShared - 1) * 100) : null;
  const rest = [
    w.same && `${w.same} allo stesso livello`,
    w.down && `${w.down} in calo`,
    w.firsts && `${w.firsts} ${w.firsts === 1 ? 'primo valore' : 'primi valori'}`,
  ].filter(Boolean);
  const prevDate = w.prevSess ? new Date(w.prevSess.date + 'T00:00:00') : null;

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="wu-title">
      <Confetti />
      <div className={styles.inner}>
        <div className={styles.scroll}>
          <div className={styles.head}>
            <svg className={styles.ring} viewBox="0 0 120 120" aria-hidden="true">
              <circle cx="60" cy="60" r="52" className={styles.ringTrack} />
              <circle cx="60" cy="60" r="52" className={styles.ringFill}
                style={{ strokeDasharray: RING_C, '--off': RING_C * (1 - pct), '--full': RING_C }} />
            </svg>
            <div className={styles.ringIn}>
              <span className={styles.ringNum}><CountUp value={w.done} /></span>
              <span className={styles.ringOf}>di {w.total}</span>
            </div>
          </div>
          <p className={styles.eyebrow}>
            {DAYS_S[d.getDay()].toUpperCase()} {d.getDate()} {MONTHS_S[d.getMonth()].toUpperCase()} · {slotLabel(session.slot)}{w.reps ? ` · ×${w.reps}` : ''}
          </p>
          <h1 id="wu-title" className={styles.title}>Allenamento completato</h1>

          <div className={styles.strip}>
            <div className={styles.stat}>
              <span className={styles.statVal}><CountUp value={w.improvements.length} /></span>
              <span className={styles.statLbl}>miglioramenti</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statVal}>
                {w.rpe != null
                  ? <><i className={styles.dot} style={{ background: rpeZone(w.rpe).color }} /><CountUp value={w.rpe} decimals={1} /></>
                  : '—'}
              </span>
              <span className={styles.statLbl}>
                sforzo medio
                {rpeDelta ? <> <b className={rpeDelta < 0 ? styles.good : ''}>{rpeDelta > 0 ? '+' : '−'}{Math.abs(rpeDelta)}</b></> : null}
              </span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statVal}>{w.volume ? <><CountUp value={w.volume} /><small>kg</small></> : '—'}</span>
              <span className={styles.statLbl}>
                volume
                {volDelta ? <> <b className={volDelta > 0 ? styles.good : ''}>{volDelta > 0 ? '+' : '−'}{Math.abs(volDelta)}%</b></> : null}
              </span>
            </div>
          </div>
          {prevDate && (
            <p className={styles.vs}>
              Confronto con {slotLabel(w.prevSess.slot)} di {cap(DAYS_S[prevDate.getDay()])} {prevDate.getDate()} {cap(MONTHS_S[prevDate.getMonth()])}. Volume: carico × ripetizioni, confrontato sugli esercizi fatti in entrambe.
            </p>
          )}

          {w.improvements.length > 0 ? (
            <>
              <p className={styles.section}>RISPETTO ALLA VOLTA SCORSA</p>
              <div className={styles.list}>
                {w.improvements.map((x, k) => (
                  <div key={x.id} className={styles.row} style={{ animationDelay: `${0.35 + k * 0.07}s` }}>
                    <span className={styles.badge} style={{ color: KIND_TONE[x.kind], borderColor: KIND_TONE[x.kind] }}>{x.badge}</span>
                    <span className={styles.rowMain}>
                      <span className={styles.rowName}>{x.name}</span>
                      <span className={styles.rowDetail}>{x.detail}</span>
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className={styles.empty}>Stesso livello della volta scorsa. L'allenamento è registrato.</p>
          )}
          {rest.length > 0 && <p className={styles.rest}>Gli altri: {rest.join(', ')}.</p>}
        </div>
        <div className={styles.foot}>
          <button className={styles.cta} onClick={onClose}>CHIUDI</button>
        </div>
      </div>
    </div>
  );
}
