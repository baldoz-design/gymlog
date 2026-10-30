import { useEffect, useState } from 'react';
import { getAllExercises, getAllSessions, getAllSessionEntries } from '../db';
import { slotLabel } from '../logic';
import { SLOTS, WEEK_TARGET, buildIndex, fmtNum, isoOf, periodStats, sessionsInWeek, weekWindow } from '../analytics';
import { ZONES, rpeZone } from '../rpe';
import { isHybrid, getCircuit, fmtSec, stationSec } from '../hybrid';
import { isRunning, runningSessions, runWeekStreak } from '../running';
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
  const hyCounts = weeks.map(w => data.ix.sessions.filter(s => isHybrid(s) && s.date >= w.start && s.date <= w.end).length);
  const runCounts = weeks.map(w => data.ix.sessions.filter(s => isRunning(s) && s.date >= w.start && s.date <= w.end).length);
  const hyTotal  = hyCounts.reduce((t, x) => t + x, 0);
  const runTotal = runCounts.reduce((t, x) => t + x, 0);
  const stTotal  = counts.reduce((t, x) => t + x, 0) - hyTotal - runTotal;
  // Card Hybrid: tutte le lezioni con almeno una stazione, non solo il periodo
  const hys      = data.ix.sessions.filter(s => isHybrid(s) && s.stations?.length).sort((a, b) => a.date.localeCompare(b.date));
  const hyShown  = hys.slice(-8);
  const hyRecord = hys.length ? Math.max(...hys.map(s => s.stations.length)) : null;
  const hyRated  = hys.filter(s => s.perceivedEffort);
  const hyRpe    = hyRated.length ? hyRated.reduce((t, s) => t + s.perceivedEffort, 0) / hyRated.length : null;
  const hyMax    = Math.max(8, hyRecord || 0);
  // Card Running: tutte le volte, non solo il periodo
  const runs      = runningSessions(data.ix.sessions);
  const runShown  = runs.slice(-8);
  const runLast   = runs[runs.length - 1]?.perceivedEffort;
  const runRated  = runs.filter(s => s.perceivedEffort);
  const runRpe    = runRated.length ? runRated.reduce((t, s) => t + s.perceivedEffort, 0) / runRated.length : null;
  // La settimana in corso può non avere ancora il running: non azzera la serie
  const runStreak = runWeekStreak(data.ix.sessions, isoOf(now)) || runWeekStreak(data.ix.sessions, weeks[11].end);
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
                >
                  {runCounts[wi] > 0 && <b className={styles.wkRun} style={{ height: `${runCounts[wi] / n * 100}%` }} />}
                  {hyCounts[wi] > 0 && <b className={styles.wkHybrid} style={{ height: `${hyCounts[wi] / n * 100}%` }} />}
                </i>
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
          <p className={styles.legend}>
            <span><i style={{ background: 'var(--accent)' }} />Strength <b>{stTotal}</b></span>
            <span><i style={{ background: 'var(--hybrid)' }} />Hybrid <b>{hyTotal}</b></span>
            <span><i style={{ background: 'var(--run)' }} />Running <b>{runTotal}</b></span>
          </p>
          <p className={styles.caption}>{onTarget} settimane su 12 con almeno {WEEK_TARGET} sessioni, contando tutte le lezioni.</p>
          <p className={styles.slotLine}>Strength per slot: {SLOTS.map((slot, k) => `${slotLabel(slot)} ${perSlot[k]}`).join(' · ')}</p>
        </section>

        {hys.length > 0 && (
          <section className={`${styles.card} ${styles.hyCard}`}>
            <div className={styles.cardHead}>
              <span className={styles.cardTitle}>Hybrid</span>
              <span className={`${styles.cardMeta} ${styles.hyMeta}`}>{hys.length} {hys.length === 1 ? 'LEZIONE' : 'LEZIONI'}</span>
            </div>
            <div className={styles.hyRow}>
              <div className={styles.hyStat}>
                <span className={styles.hyLbl}>RECORD</span>
                <span className={styles.hyVal}>{hyRecord}<small>staz.</small></span>
              </div>
              <div className={styles.hyStat}>
                <span className={styles.hyLbl}>ULTIMA</span>
                <span className={styles.hyVal}>{hys[hys.length - 1].stations.length}<small>staz.</small></span>
              </div>
              <div className={styles.hyStat}>
                <span className={styles.hyLbl}>SFORZO</span>
                <span className={styles.hyVal}>
                  {hyRpe != null ? <><i className={styles.dot} style={{ background: rpeZone(hyRpe).color }} />{fmtNum(hyRpe)}</> : '—'}
                </span>
              </div>
            </div>
            <div className={styles.hyBars}>
              {hyShown.map((s, k) => (
                <span key={s.id} className={styles.hyCol}>
                  <span className={styles.hyN}>{s.stations.length}</span>
                  <i
                    className={`${styles.hyBar} ${k < hyShown.length - 1 ? styles.hyBarPast : ''}`}
                    style={{ height: `${s.stations.length / hyMax * 100}%`, animationDelay: `${k * 50}ms` }}
                  />
                  <span className={styles.hyD}>{shortDate(s.date).toUpperCase()}</span>
                </span>
              ))}
            </div>
            <p className={styles.caption}>
              {hys.length === 1
                ? "Stazioni per lezione. Dalla prossima vedi l'andamento: l'obiettivo è aggiungerne una."
                : `Stazioni per lezione, ultime ${hyShown.length}. Ogni stazione dura ${fmtSec(stationSec(getCircuit()))} con il cambio.`}
            </p>
          </section>
        )}

        {runs.length > 0 && (
          <section className={`${styles.card} ${styles.runCard}`}>
            <div className={styles.cardHead}>
              <span className={styles.cardTitle}>Running</span>
              <span className={`${styles.cardMeta} ${styles.runMeta}`}>{runs.length} {runs.length === 1 ? 'VOLTA' : 'VOLTE'}</span>
            </div>
            <div className={styles.hyRow}>
              <div className={styles.hyStat}>
                <span className={styles.hyLbl}>ULTIMO</span>
                <span className={styles.hyVal}>
                  {runLast ? <><i className={styles.dot} style={{ background: rpeZone(runLast).color }} />{runLast}</> : '—'}
                </span>
              </div>
              <div className={styles.hyStat}>
                <span className={styles.hyLbl}>MEDIA</span>
                <span className={styles.hyVal}>
                  {runRpe != null ? <><i className={styles.dot} style={{ background: rpeZone(runRpe).color }} />{fmtNum(runRpe)}</> : '—'}
                </span>
              </div>
              <div className={styles.hyStat}>
                <span className={styles.hyLbl}>DI FILA</span>
                <span className={styles.hyVal}>{runStreak}<small>sett.</small></span>
              </div>
            </div>
            <div className={styles.hyBars}>
              {runShown.map((s, k) => (
                <span key={s.id} className={styles.hyCol}>
                  <span className={styles.hyN}>{s.perceivedEffort || '—'}</span>
                  <i
                    className={styles.runBar}
                    style={{ height: `${(s.perceivedEffort || 0) * 10}%`, background: s.perceivedEffort ? rpeZone(s.perceivedEffort).color : undefined, animationDelay: `${k * 50}ms` }}
                  />
                  <span className={styles.hyD}>{shortDate(s.date).toUpperCase()}</span>
                </span>
              ))}
            </div>
            <p className={styles.caption}>Sforzo complessivo per volta, ultime {runShown.length}. Il colore è la zona di sforzo.</p>
          </section>
        )}

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
