import { useEffect, useState } from 'react';
import { getAllExercises, getAllSessions, getAllSessionEntries } from '../db';
import { slotLabel } from '../logic';
import { SLOTS, WEEK_TARGET, buildIndex, periodStats, sessionsInWeek, weekWindow } from '../analytics';
import { ZONES, rpeZone } from '../rpe';
import ExerciseHistory from '../components/ExerciseHistory';
import CountUp from '../components/CountUp';
import styles from './Stats.module.css';

const MONTHS_S = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
const shortDate = iso => { const d = new Date(iso + 'T00:00:00'); return `${d.getDate()} ${MONTHS_S[d.getMonth()]}`; };

export default function Stats({ onBack }) {
  const [data,     setData]     = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    Promise.all([getAllSessions(), getAllSessionEntries(), getAllExercises()]).then(([sessions, entries, exercises]) => {
      setData({ ix: buildIndex(sessions, entries, exercises), exercises: Object.fromEntries(exercises.map(e => [e.id, e])) });
    });
  }, []);

  if (!data) return <div className={styles.container} />;

  const now  = new Date();
  const p    = periodStats(data.ix, now, 1, 4);
  const prev = periodStats(data.ix, now, 5, 4);
  const diff = p.sessions - prev.sessions;
  const zone = p.rpe.avg != null ? rpeZone(p.rpe.avg) : null;

  const weeks   = Array.from({ length: 12 }, (_, k) => weekWindow(now, 12 - k));
  const counts   = weeks.map(w => sessionsInWeek(data.ix, w));
  const maxCount = Math.max(3, ...counts);
  const onTarget = counts.filter(c => c >= WEEK_TARGET).length;
  const perSlot  = SLOTS.map(slot => data.ix.sessions.filter(x => x.slot === slot && x.date >= weeks[0].start && x.date <= weeks[11].end).length);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={onBack}>←</button>
      </header>

      <h1 className={styles.pageTitle}>Statistiche</h1>
      <p className={styles.period}>Ultime 4 settimane · {shortDate(p.start)} → {shortDate(p.end)}</p>

      <div className={styles.body}>
        <div className={styles.tiles}>
          <div className={styles.tile}>
            <span className={styles.tileLbl}>SESSIONI</span>
            <span className={styles.tileVal}><CountUp value={p.sessions} /></span>
            <span className={`${styles.tileNote} ${diff > 0 ? styles.tileNoteUp : ''}`}>
              {diff === 0 ? 'come le 4 precedenti' : `${diff > 0 ? '+' : '−'}${Math.abs(diff)} sulle 4 precedenti`}
            </span>
          </div>
          <div className={styles.tile}>
            <span className={styles.tileLbl}>A SETTIMANA</span>
            <span className={styles.tileVal}><CountUp value={p.perWeek} decimals={1} /></span>
            <span className={styles.tileNote}>{p.weeksOnTarget} settimane su {p.nWeeks} con almeno {WEEK_TARGET}</span>
          </div>
          <div className={styles.tile}>
            <span className={styles.tileLbl}>IN AUMENTO</span>
            <span className={`${styles.tileVal} ${styles.tileValAcc}`}><CountUp value={p.progress.length} /></span>
            <span className={styles.tileNote}>esercizi con più carico</span>
          </div>
          <div className={styles.tile}>
            <span className={styles.tileLbl}>SFORZO MEDIO</span>
            <span className={styles.tileVal}>
              {zone ? <><i className={styles.dot} style={{ background: zone.color }} /><CountUp value={p.rpe.avg} decimals={1} /></> : '—'}
            </span>
            <span className={styles.tileNote}>{zone ? zone.label : 'nessun dato'}</span>
          </div>
        </div>

        <section className={styles.card}>
          <div className={styles.cardHead}>
            <span className={styles.cardTitle}>Sessioni per settimana</span>
            <span className={`${styles.cardMeta} ${styles.wkLegend}`}><i />{WEEK_TARGET} A SETT.</span>
          </div>
          <div className={styles.wk}>
            <span className={styles.wkTarget} style={{ bottom: `${WEEK_TARGET / maxCount * 100}%` }} />
            {counts.map((n, wi) => (
              <span key={wi} className={styles.wkCol} title={`${n} ${n === 1 ? 'sessione' : 'sessioni'}`}>
                <i
                  className={`${styles.wkBar} ${n >= WEEK_TARGET ? styles.wkOn : n ? styles.wkLow : ''}`}
                  style={{ height: n ? `${n / maxCount * 100}%` : '3px', animationDelay: `${wi * 30}ms` }}
                />
              </span>
            ))}
          </div>
          <div className={styles.wkMonths}>
            {weeks.map((w, wi) => {
              const m = w.monday.getMonth();
              const show = wi === 0 || weeks[wi - 1].monday.getMonth() !== m;
              return <span key={'m' + wi} className={styles.heatMonth}>{show ? MONTHS_S[m].toUpperCase() : ''}</span>;
            })}
          </div>
          <p className={styles.caption}>{onTarget} settimane su 12 con almeno {WEEK_TARGET} sessioni.</p>
          <p className={styles.slotLine}>Per slot: {SLOTS.map((slot, k) => `${slotLabel(slot)} ${perSlot[k]}`).join(' · ')}</p>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHead}>
            <span className={styles.cardTitle}>Sforzo per zona</span>
            <span className={styles.cardMeta}>{p.rpe.count} ESERCIZI</span>
          </div>
          {p.rpe.count > 0 ? (
            <>
              <div className={styles.zoneBar}>
                {ZONES.map((z, zi) => p.rpe.dist[zi] > 0 && <span key={z.label} style={{ flex: p.rpe.dist[zi], background: z.color }} />)}
              </div>
              <div className={styles.zoneLegend}>
                {ZONES.map((z, zi) => (
                  <span key={z.label} className={styles.zoneItem}>
                    <i className={styles.dot} style={{ background: z.color }} />
                    {z.label}
                    <b>{Math.round(p.rpe.dist[zi] / p.rpe.count * 100)}%</b>
                  </span>
                ))}
              </div>
            </>
          ) : (
            <p className={styles.caption}>Registra lo sforzo dopo FATTO per vedere la distribuzione.</p>
          )}
        </section>

        <section className={styles.card}>
          <div className={styles.cardHead}>
            <span className={styles.cardTitle}>Progressi di carico</span>
            <span className={styles.cardMeta}>{p.progress.length} ESERCIZI</span>
          </div>
          {p.progress.length > 0 ? (
            <div>
              {p.progress.map(x => (
                <button key={x.exerciseId} className={styles.progRow} onClick={() => setSelected(data.exercises[x.exerciseId])}>
                  <span className={styles.progMain}>
                    <span className={styles.progName}>{x.name}</span>
                    <span className={styles.progSub}>{x.from} → {x.to} kg</span>
                  </span>
                  <span className={styles.progDelta}>+{x.delta} kg</span>
                </button>
              ))}
            </div>
          ) : (
            <p className={styles.caption}>Nessun aumento di carico nel periodo.</p>
          )}
        </section>
      </div>

      {selected && <ExerciseHistory exercise={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
