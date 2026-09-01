import { useEffect, useState } from 'react';
import { getActiveCycle, getAllSessions, getAllExercises, getLastEntryForExercise } from '../db';
import { getSlotFromDate, getWeekNumberInCycle, todayISO, slotLabel, formatEntryValue } from '../logic';
import styles from './Home.module.css';

const MONTHS_S = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
const DAYS_S   = ['dom','lun','mar','mer','gio','ven','sab'];

export default function Home({ onNavigate }) {
  const [cycle,        setCycle]        = useState(undefined);
  const [preview,      setPreview]      = useState([]);
  const [weekBars,     setWeekBars]     = useState([0,0,0,0,0,0]);
  const [sessionCount, setSessionCount] = useState(0);
  const [expanded,     setExpanded]     = useState(false);

  const today   = todayISO();
  const now     = new Date();
  const slot    = getSlotFromDate(now);
  const weekNum = cycle ? getWeekNumberInCycle(today, cycle.startDate) : 0;
  const reps    = cycle && weekNum ? (cycle.weeks[weekNum - 1]?.reps ?? '?') : '?';

  useEffect(() => {
    getActiveCycle(today).then(c => setCycle(c || null));
  }, [today]);

  useEffect(() => {
    if (cycle === undefined) return;

    // Bar chart: last 6 Mon-based calendar weeks
    getAllSessions().then(sessions => {
      setSessionCount(sessions.length);
      const bars = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now);
        const dow = (d.getDay() + 6) % 7;
        d.setDate(d.getDate() - dow - i * 7);
        d.setHours(0, 0, 0, 0);
        const end = new Date(d);
        end.setDate(d.getDate() + 7);
        bars.push(sessions.filter(s => {
          const sd = new Date(s.date + 'T00:00:00');
          return sd >= d && sd < end;
        }).length);
      }
      setWeekBars(bars);
    });

    if (!cycle || !slot) return;
    const slotBlocks = cycle.slots[slot] || [];
    // Load ALL exercises for the slot (all blocks)
    const allBEs = slotBlocks.flatMap(b => b.exercises.map(be => ({ ...be, blockLabel: b.label })));

    getAllExercises().then(exercises => {
      const exMap = Object.fromEntries(exercises.map(e => [e.id, e]));
      Promise.all(
        allBEs.map(be =>
          getLastEntryForExercise(be.exerciseId, today).then(last => ({
            label: `${be.blockLabel}${be.position}`,
            name:  exMap[be.exerciseId]?.canonicalName || '?',
            value: last ? formatEntryValue(last) : '—',
          }))
        )
      ).then(setPreview);
    });
  }, [cycle, slot, today]); // eslint-disable-line

  const dayLabel   = `${DAYS_S[now.getDay()].toUpperCase()} ${now.getDate()} ${MONTHS_S[now.getMonth()].toUpperCase()}`;
  const maxBar     = Math.max(...weekBars, 1);
  const shownPrev  = expanded ? preview : preview.slice(0, 3);
  const remaining  = preview.length - 3;

  function handleWorkoutTap() {
    if (!cycle) { onNavigate('program'); return; }
    onNavigate('session', { date: today, slot, cycle });
  }

  // Program subtitle: take last segment after "—" or "/"
  function cycleSub(name) {
    const parts = name.split(/[—–\/]/).map(p => p.trim()).filter(Boolean);
    return parts.slice(1).join(' / ') || name;
  }

  if (cycle === undefined) return <div className={styles.container} />;

  const noCycle = cycle === null;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <span className={styles.appName}>GYMLOG</span>
        {!noCycle && <span className={styles.headerDate}>{dayLabel}</span>}
      </header>

      <main className={styles.main}>
        {/* ── Hero card ── */}
        <div className={styles.heroCard}>
          {noCycle ? (
            /* Nessun programma: CTA inline */
            <div className={styles.noProgramBox}>
              <p className={styles.noProgramTitle}>Nessun programma</p>
              <p className={styles.noProgramSub}>Carica il programma della tua palestra per iniziare.</p>
              <button className={styles.heroBtn} onClick={() => onNavigate('program')}>
                CARICA PROGRAMMA →
              </button>
            </div>
          ) : (
            /* Programma attivo: vista normale */
            <>
              <div className={styles.heroMeta}>
                <span className={styles.heroSlot}>OGGI · {slot ? slotLabel(slot) : '—'}</span>
                <span className={styles.heroWeek}>SETT. {weekNum} / 5</span>
              </div>

              <div className={styles.tacche}>
                {[1,2,3,4,5].map(w => (
                  <div key={w} className={[
                    styles.tacca,
                    w < weekNum   ? styles.taccaDone    : '',
                    w === weekNum ? styles.taccaCurrent : '',
                  ].join(' ')} />
                ))}
              </div>

              <h1 className={styles.heroTitle}>Allenamento</h1>
              <div className={styles.repsPill}>×{reps} reps</div>
              <div className={styles.heroSep} />

              <div className={styles.exPreview}>
                {shownPrev.map(item => (
                  <div key={item.label} className={styles.previewRow}>
                    <span className={styles.previewLabel}>{item.label}</span>
                    <span className={styles.previewName}>{item.name}</span>
                    <span className={styles.previewValue}>{item.value}</span>
                  </div>
                ))}
                {!expanded && remaining > 0 && (
                  <button className={styles.previewMore} onClick={() => setExpanded(true)}>
                    + altri {remaining}
                  </button>
                )}
                {expanded && (
                  <button className={styles.previewMore} onClick={() => setExpanded(false)}>
                    ↑ nascondi
                  </button>
                )}
              </div>

              <button className={styles.heroBtn} onClick={handleWorkoutTap}>INIZIA →</button>
            </>
          )}
        </div>

        {/* ── Stats card ── */}
        <button className={styles.statsCard} onClick={() => onNavigate('stats')}>
          <div className={styles.statsTop}>
            <div>
              <span className={styles.statsTitle}>Statistiche</span>
              <span className={styles.statsSub}>Sessioni per settimana</span>
            </div>
            <span className={styles.statsMeta}>{sessionCount} SESSIONI</span>
          </div>
          <div className={styles.barsWrap}>
            {weekBars.map((v, i) => (
              <div key={i}
                className={[styles.bar, i === 5 ? styles.barCurrent : ''].join(' ')}
                style={{ height: `${Math.max(10, (v / maxBar) * 100)}%` }}
              />
            ))}
          </div>
        </button>

        {/* ── Bottom row ── */}
        <div className={styles.row}>
          <button className={styles.halfCard} onClick={() => onNavigate('calendar')}>
            <span className={styles.halfTitle}>Calendario</span>
            <span className={styles.halfSub}>Sessioni passate</span>
          </button>
          <button className={styles.halfCard} onClick={() => onNavigate('program')}>
            <span className={styles.halfTitle}>Programma</span>
            <span className={styles.halfSub}>{noCycle ? 'Nessuno attivo' : cycleSub(cycle.name)}</span>
          </button>
        </div>
      </main>
    </div>
  );
}
