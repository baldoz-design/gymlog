import { Fragment, useEffect, useState } from 'react';
import { getAllExercises, getAllSessions, getAllSessionEntries } from '../db';
import { slotLabel } from '../logic';
import { SLOTS, buildIndex, fmtNum, periodStats, slotsDoneInWeek, weekWindow } from '../analytics';
import { ZONES, rpeZone } from '../rpe';
import ExerciseHistory from '../components/ExerciseHistory';
import styles from './Stats.module.css';

const MONTHS_S = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
const DAYS_S   = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];
const shortDate = iso => { const d = new Date(iso + 'T00:00:00'); return `${d.getDate()} ${MONTHS_S[d.getMonth()]}`; };
const dayLabel  = iso => { const d = new Date(iso + 'T00:00:00'); return `${DAYS_S[d.getDay()]} ${d.getDate()} ${MONTHS_S[d.getMonth()]}`; };

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
  const grid    = weeks.map(w => slotsDoneInWeek(data.ix, w));
  const perSlot = SLOTS.map((_, si) => grid.filter(g => g[si]).length);
  const minSlot = Math.min(...perSlot);
  const maxSlot = Math.max(...perSlot);

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
            <span className={styles.tileVal}>{p.sessions}</span>
            <span className={`${styles.tileNote} ${diff > 0 ? styles.tileNoteUp : ''}`}>
              {diff === 0 ? 'come le 4 precedenti' : `${diff > 0 ? '+' : '−'}${Math.abs(diff)} sulle 4 precedenti`}
            </span>
          </div>
          <div className={styles.tile}>
            <span className={styles.tileLbl}>COSTANZA</span>
            <span className={styles.tileVal}>{p.consistency}<small>%</small></span>
            <span className={styles.tileNote}>{p.slotsDone} slot su {p.slotsTotal}</span>
          </div>
          <div className={styles.tile}>
            <span className={styles.tileLbl}>IN AUMENTO</span>
            <span className={`${styles.tileVal} ${styles.tileValAcc}`}>{p.progress.length}</span>
            <span className={styles.tileNote}>esercizi con più carico</span>
          </div>
          <div className={styles.tile}>
            <span className={styles.tileLbl}>SFORZO MEDIO</span>
            <span className={styles.tileVal}>
              {zone ? <><i className={styles.dot} style={{ background: zone.color }} />{fmtNum(p.rpe.avg)}</> : '—'}
            </span>
            <span className={styles.tileNote}>{zone ? zone.label : 'nessun dato'}</span>
          </div>
        </div>

        <section className={styles.card}>
          <div className={styles.cardHead}>
            <span className={styles.cardTitle}>Costanza per slot</span>
            <span className={styles.cardMeta}>12 SETTIMANE</span>
          </div>
          <div className={styles.heat}>
            {SLOTS.map((slot, si) => (
              <Fragment key={slot}>
                <span className={styles.heatLbl}>{slotLabel(slot)}</span>
                {grid.map((g, wi) => (
                  <span key={wi} className={`${styles.cell} ${g[si] ? styles.cellOn : ''}`} title={g[si] ? dayLabel(g[si].date) : ''} />
                ))}
              </Fragment>
            ))}
            <span />
            {weeks.map((w, wi) => {
              const m = w.monday.getMonth();
              const show = wi === 0 || weeks[wi - 1].monday.getMonth() !== m;
              return <span key={'m' + wi} className={styles.heatMonth}>{show ? MONTHS_S[m].toUpperCase() : ''}</span>;
            })}
          </div>
          <p className={styles.caption}>
            {maxSlot - minSlot >= 2
              ? `${slotLabel(SLOTS[perSlot.indexOf(minSlot)])} è lo slot che salti più spesso: ${minSlot} volte su 12.`
              : 'Allenamenti ben distribuiti tra i tre slot.'}
          </p>
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
