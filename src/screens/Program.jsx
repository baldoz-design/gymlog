import { useEffect, useRef, useState } from 'react';
import { getAllCycles, getAllExercises, seedTestData } from '../db';
import { slotLabel, todayISO, getWeekNumberInCycle } from '../logic';
import ProgramImport from './ProgramImport';
import styles from './Program.module.css';

const MONTHS_S = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];

function fmtDate(iso) {
  const d = new Date(iso + 'T00:00:00');
  return `${d.getDate()} ${MONTHS_S[d.getMonth()]} ${d.getFullYear()}`;
}

export default function Program({ onBack }) {
  const [cycles,     setCycles]     = useState([]);
  const [exMap,      setExMap]      = useState({});
  const [seeding,    setSeeding]    = useState(false);
  const [seeded,     setSeeded]     = useState(false);
  const [importFile, setImportFile] = useState(null);

  const fileRef = useRef();
  const today   = todayISO();

  async function load() {
    const all = await getAllCycles();
    all.sort((a, b) => b.startDate.localeCompare(a.startDate));
    setCycles(all);
    const exs = await getAllExercises();
    const map = {};
    exs.forEach(e => { map[e.id] = e.canonicalName; });
    setExMap(map);
  }

  useEffect(() => { load(); }, []);

  function handleImportTap() { fileRef.current?.click(); }

  function handleFileSelected(e) {
    const file = e.target.files?.[0];
    if (file) setImportFile(file);
    e.target.value = '';
  }

  async function handleSeed() {
    setSeeding(true);
    await seedTestData();
    await load();
    setSeeded(true);
    setSeeding(false);
  }

  if (importFile) {
    return (
      <ProgramImport
        file={importFile}
        onBack={() => setImportFile(null)}
        onDone={() => { setImportFile(null); load(); }}
      />
    );
  }

  const active   = cycles.find(c => c.status === 'active');
  const archived = cycles.filter(c => c.status !== 'active');
  const weekNum  = active ? getWeekNumberInCycle(today, active.startDate) : 0;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={onBack}>←</button>
      </header>

      <h1 className={styles.pageTitle}>Programma</h1>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileSelected}
      />

      <div className={styles.body}>
        {/* ── Ciclo attivo ── */}
        {active && (
          <div className={styles.activeCycle}>
            <div className={styles.cycleTop}>
              <span className={styles.activeBadge}>ATTIVO</span>
              <span className={styles.cycleWeek}>SETT. {weekNum} / 5</span>
            </div>

            <h2 className={styles.cycleName}>{active.name}</h2>
            <p className={styles.cycleDates}>{fmtDate(active.startDate)} → {fmtDate(active.endDate)}</p>

            <div className={styles.slotsList}>
              {['MON_TUE', 'WED_THU', 'FRI_SAT'].map(slot => {
                const blocks = active.slots[slot] || [];
                return (
                  <div key={slot} className={styles.slotGroup}>
                    <div className={styles.slotSep} />
                    <span className={styles.slotTitle}>{slotLabel(slot)}</span>
                    {blocks.length === 0 && (
                      <span className={styles.slotEmpty}>Nessun esercizio importato</span>
                    )}
                    {blocks.map(block => (
                      <div key={block.label} className={styles.blockRow}>
                        <span className={styles.blockLbl}>{block.label}</span>
                        <span className={styles.blockExs}>
                          {block.exercises.map(be => exMap[be.exerciseId] || '?').join(' · ')}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {cycles.length === 0 && (
          <p className={styles.empty}>Nessun programma caricato.</p>
        )}

        {/* ── CTA fotografa ── */}
        <button className={styles.importBtn} onClick={handleImportTap}>
          FOTOGRAFA LA LAVAGNA
        </button>

        {/* ── Dev seed ── */}
        <div className={styles.devSection}>
          <p className={styles.devNote}>DEV — dati di test</p>
          <button className={styles.seedBtn} onClick={handleSeed} disabled={seeding || seeded}>
            {seeded ? '✓ Caricato' : seeding ? 'Caricamento...' : 'Carica Small Class (test)'}
          </button>
        </div>

        {/* Archivio nascosto — cicli precedenti tenuti in memoria per consultazione storica */}
      </div>
    </div>
  );
}
