import { useEffect, useState } from 'react';
import { getActiveCycle, getAllSessions, getAllExercises, getAllSessionEntries, getLastEntriesMap, getSessionByDateAndSlot } from '../db';
import { getSlotFromDate, getWeekNumberInCycle, todayISO, slotLabel, formatEntryValue } from '../logic';
import { buildIndex, computeWrap, fmtNum, periodStats } from '../analytics';
import { rpeZone } from '../rpe';
import { resolveBlocks } from '../swaps';
import CountUp from '../components/CountUp';
import WeeklyWrap from '../components/WeeklyWrap';
import styles from './Home.module.css';

const WRAP_SEEN_KEY = 'gymlog_wrap_seen';
const readWrapSeen = () => { try { return localStorage.getItem(WRAP_SEEN_KEY); } catch { return null; } };

const MONTHS_S = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
const DAYS_S   = ['dom','lun','mar','mer','gio','ven','sab'];

export default function Home({ onNavigate }) {
  const [cycle,        setCycle]        = useState(undefined);
  const [preview,      setPreview]      = useState([]);
  const [index,        setIndex]        = useState(null);
  const [expanded,     setExpanded]     = useState(false);
  const [wrapOpen,     setWrapOpen]     = useState(false);
  const [wrapSeen,     setWrapSeen]     = useState(readWrapSeen);

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

    Promise.all([getAllSessions(), getAllSessionEntries(), getAllExercises()])
      .then(([sessions, entries, exercises]) => setIndex(buildIndex(sessions, entries, exercises)));

    if (!cycle || !slot) return;
    Promise.all([getAllExercises(), getSessionByDateAndSlot(today, slot)]).then(async ([exercises, todaySession]) => {
      // Tutti gli esercizi dello slot, con eventuali cambi di oggi o del programma
      const allBEs = resolveBlocks(cycle, slot, today, todaySession)
        .flatMap(b => b.exercises.map(be => ({ ...be, blockLabel: b.label })));
      const lastMap = await getLastEntriesMap(allBEs.map(be => be.exerciseId), today);
      const exMap = Object.fromEntries(exercises.map(e => [e.id, e]));
      setPreview(allBEs.map(be => ({
        label: `${be.blockLabel}${be.position}`,
        name:  exMap[be.exerciseId]?.canonicalName || '?',
        value: lastMap[be.exerciseId] ? formatEntryValue(lastMap[be.exerciseId]) : '—',
      })));
    });
  }, [cycle, slot, today]); // eslint-disable-line

  const dayLabel   = `${DAYS_S[now.getDay()].toUpperCase()} ${now.getDate()} ${MONTHS_S[now.getMonth()].toUpperCase()}`;
  const period     = index ? periodStats(index, now, 1, 4) : null;
  const wrap       = index ? computeWrap(index, now) : null;
  const hasWrap    = wrap && wrap.sessions.length > 0;
  const isWrapSeen = hasWrap && wrapSeen === wrap.start;
  const exWithHistory = index ? new Set(index.entries.map(e => e.exerciseId)).size : 0;
  const monthSessions = index ? index.sessions.filter(s => s.date.startsWith(today.slice(0, 7))).length : null;
  const GAUGE_C    = 2 * Math.PI * 33;
  const avgRounded = period?.rpe.avg != null ? Math.round(period.rpe.avg) : null;
  const shownPrev  = expanded ? preview : preview.slice(0, 3);
  const remaining  = preview.length - 3;

  function closeWrap() {
    setWrapOpen(false);
    setWrapSeen(wrap.start);
    try { localStorage.setItem(WRAP_SEEN_KEY, wrap.start); } catch { /* storage non disponibile */ }
  }

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {!noCycle && <span className={styles.headerDate}>{dayLabel}</span>}
          <button
            className={styles.settingsBtn}
            onClick={() => onNavigate('settings')}
            aria-label="Impostazioni"
          >⚙</button>
        </div>
      </header>

      <main className={styles.main}>
        {/* ── Wrap settimanale ── */}
        {hasWrap && (
          <button className={`${styles.wrapCard} ${isWrapSeen ? styles.wrapSeen : ''}`} onClick={() => setWrapOpen(true)}>
            <span className={styles.wrapRing}>
              <span className={styles.wrapRingIn}>{wrap.sessions.slice(0, 5).map(s => <i key={s.id} />)}</span>
            </span>
            <span className={styles.wrapTxt}>
              <span className={styles.wrapTitle}>{isWrapSeen ? 'Wrap della settimana' : 'Il tuo wrap è pronto'}</span>
              <span className={styles.wrapSub}>
                {new Date(wrap.start + 'T00:00:00').getDate()} → {new Date(wrap.end + 'T00:00:00').getDate()} {MONTHS_S[new Date(wrap.end + 'T00:00:00').getMonth()]} · {wrap.sessions.length} allenamenti
              </span>
            </span>
            <span className={styles.wrapArrow}>→</span>
          </button>
        )}

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
            <span className={styles.statsTitle}>Statistiche</span>
            <span className={styles.statsMeta}>ULTIME 4 SETT. →</span>
          </div>
          {period && (
            <div className={styles.info}>
              <div className={styles.gauge}>
                <svg viewBox="0 0 80 80" aria-hidden="true">
                  <circle cx="40" cy="40" r="33" className={styles.gaugeTrack} />
                  <circle cx="40" cy="40" r="33" className={styles.gaugeFill}
                    style={{ strokeDasharray: GAUGE_C, '--off': GAUGE_C * (1 - period.consistency / 100), '--full': GAUGE_C }} />
                </svg>
                <span className={styles.gaugeIn}>
                  <b><CountUp value={period.consistency} /><small>%</small></b>
                  <span>costanza</span>
                </span>
              </div>
              <div className={styles.infoRight}>
                <div className={styles.infoLine}>
                  <span className={styles.infoBig}><CountUp value={period.sessions} /></span>
                  <span className={styles.infoTxt}>sessioni<br />{period.slotsDone} slot su {period.slotsTotal}</span>
                </div>
                <div className={styles.meter} aria-label={avgRounded ? `Sforzo medio ${fmtNum(period.rpe.avg)}` : 'Sforzo non registrato'}>
                  {Array.from({ length: 10 }, (_, k) => k + 1).map(v => (
                    <i key={v} style={{ background: rpeZone(v).color, opacity: avgRounded && v <= avgRounded ? 1 : 0.16, animationDelay: `${v * 40}ms` }} />
                  ))}
                </div>
                <span className={styles.meterLbl}>
                  {avgRounded
                    ? <>sforzo medio <b>{fmtNum(period.rpe.avg)}</b> · {rpeZone(period.rpe.avg).label}</>
                    : 'sforzo non ancora registrato'}
                </span>
              </div>
            </div>
          )}
        </button>

        {/* ── Bottom row ── */}
        <div className={styles.row}>
          <button className={styles.halfCard} onClick={() => onNavigate('calendar')}>
            <span className={styles.halfTitle}>Calendario</span>
            <span className={styles.halfSub}>{monthSessions != null ? `${monthSessions} questo mese` : 'Sessioni passate'}</span>
          </button>
          <button className={styles.halfCard} onClick={() => onNavigate('program')}>
            <span className={styles.halfTitle}>Programma</span>
            <span className={styles.halfSub}>{noCycle ? 'Nessuno attivo' : cycleSub(cycle.name)}</span>
          </button>
          <button className={styles.halfCard} onClick={() => onNavigate('exercises')}>
            <span className={styles.halfTitle}>Esercizi</span>
            <span className={styles.halfSub}>{exWithHistory} con storico</span>
          </button>
        </div>
      </main>

      {wrapOpen && (
        <WeeklyWrap
          wrap={wrap}
          weekNum={weekNum}
          reps={reps}
          todaySlot={slot}
          todayBlocks={cycle && slot ? (cycle.slots[slot] || []) : []}
          onClose={closeWrap}
          onStart={() => { closeWrap(); handleWorkoutTap(); }}
        />
      )}
    </div>
  );
}
