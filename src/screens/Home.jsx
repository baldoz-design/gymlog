import { useEffect, useState } from 'react';
import { getActiveCycle, getCycleById } from '../db';
import { getSlotFromDate, getWeekNumberInCycle, todayISO, slotLabel } from '../logic';
import styles from './Home.module.css';

function IconDumbbell() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 4v16M18 4v16"/>
      <rect x="2" y="7" width="4" height="10" rx="1"/>
      <rect x="18" y="7" width="4" height="10" rx="1"/>
      <line x1="6" y1="12" x2="18" y2="12"/>
    </svg>
  );
}

function IconChart() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  );
}

function IconClipboard() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="8" y="2" width="8" height="4" rx="1"/>
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
      <line x1="9" y1="12" x2="15" y2="12"/>
      <line x1="9" y1="16" x2="13" y2="16"/>
    </svg>
  );
}

const DAY_NAMES = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];

export default function Home({ onNavigate }) {
  const [cycle, setCycle] = useState(undefined);
  const today = todayISO();

  useEffect(() => {
    getActiveCycle(today).then(c => setCycle(c || null));
  }, [today]);

  const now = new Date();
  const slot = getSlotFromDate(now);
  const weekNum = cycle ? getWeekNumberInCycle(today, cycle.startDate) : null;
  const reps = cycle && weekNum ? cycle.weeks[weekNum - 1]?.reps : null;

  const hasCycle = !!cycle;

  let workoutSub = 'Carica prima un programma';
  if (hasCycle && slot) workoutSub = `${slotLabel(slot)} · Sett. ${weekNum} · ×${reps} reps`;
  else if (hasCycle && !slot) workoutSub = 'Domenica · scegli lo slot';

  function handleWorkoutTap() {
    if (!hasCycle) { onNavigate('program'); return; }
    // Domenica: apri direttamente la sessione senza slot — mostrerà il calendario
    onNavigate('session', { date: today, slot, cycle });
  }

  async function handleCalendarDayTap(session) {
    // Recupera il ciclo associato alla sessione per passarlo alla schermata
    const sessionCycle = await getCycleById(session.cycleId);
    onNavigate('session', {
      date: session.date,
      slot: session.slot,
      cycle: sessionCycle,
    });
  }

  if (cycle === undefined) return <div className={styles.container} />;

  // Onboarding: nessun ciclo mai caricato
  if (cycle === null) {
    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.appName}>GymLog</div>
        </header>
        <div className={styles.onboarding}>
          <div className={styles.onboardingIcon}>🏋️</div>
          <h2 className={styles.onboardingTitle}>Benvenuto in GymLog</h2>
          <p className={styles.onboardingText}>
            Inizia caricando il programma della tua palestra. Basta scattare una foto alla lavagna.
          </p>
          <button className={styles.onboardingBtn} onClick={() => onNavigate('program')}>
            Carica programma
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.appName}>GymLog</div>
        <div className={styles.headerDate}>
          <span className={styles.dayName}>{DAY_NAMES[now.getDay()]}</span>
          <span className={styles.dayNum}>{now.getDate()}</span>
          <span className={styles.monthName}>
            {now.toLocaleDateString('it-IT', { month: 'short' })}
          </span>
        </div>
      </header>

      <main className={styles.main}>
        {/* Avviso ciclo non attivo per la data odierna */}
        {!slot && hasCycle && (
          <div className={styles.noSlotBanner}>
            Oggi è domenica. Torna domani o apri una sessione manualmente.
          </div>
        )}

        {/* Blocco primario Allenamento */}
        <button
          className={`${styles.block} ${styles.blockWorkout}`}
          onClick={handleWorkoutTap}
        >
          <div className={styles.blockIcon}><IconDumbbell /></div>
          <div className={styles.blockText}>
            <span className={styles.blockTitle}>Allenamento</span>
            <span className={styles.blockSub}>{workoutSub}</span>
          </div>
          <span className={styles.arrow}>›</span>
        </button>

        <div className={styles.row}>
          {/* Statistiche */}
          <button className={`${styles.block} ${styles.blockHalf} ${styles.blockStats}`} onClick={() => onNavigate('stats')}>
            <div className={styles.blockIcon}><IconChart /></div>
            <span className={styles.blockTitle}>Statistiche</span>
            <span className={styles.blockSub}>Storico esercizi</span>
          </button>

          {/* Programma */}
          <button className={`${styles.block} ${styles.blockHalf} ${styles.blockProgram}`} onClick={() => onNavigate('program')}>
            <div className={styles.blockIcon}><IconClipboard /></div>
            <span className={styles.blockTitle}>Programma</span>
            <span className={styles.blockSub}>{hasCycle ? cycle.name : 'Nessun ciclo'}</span>
          </button>
        </div>
      </main>
    </div>
  );
}
