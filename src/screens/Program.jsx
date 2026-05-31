import { useEffect, useState } from 'react';
import { getAllCycles, seedTestData } from '../db';
import { slotLabel } from '../logic';
import ProgramImport from './ProgramImport';
import styles from './Program.module.css';

export default function Program({ onBack }) {
  const [cycles, setCycles] = useState([]);
  const [seeding, setSeeding] = useState(false);
  const [seeded, setSeeded] = useState(false);
  const [importing, setImporting] = useState(false);

  async function load() {
    const all = await getAllCycles();
    all.sort((a, b) => b.startDate.localeCompare(a.startDate));
    setCycles(all);
  }

  useEffect(() => { load(); }, []);

  if (importing) {
    return (
      <ProgramImport
        onBack={() => setImporting(false)}
        onDone={() => { setImporting(false); load(); }}
      />
    );
  }

  async function handleSeed() {
    setSeeding(true);
    await seedTestData();
    await load();
    setSeeded(true);
    setSeeding(false);
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={onBack}>←</button>
        <span className={styles.title}>Programma</span>
      </header>

      <div className={styles.body}>
        <button className={styles.importBtn} onClick={() => setImporting(true)}>
          📷 Carica nuovo programma da foto
        </button>

        {cycles.length === 0 && (
          <div className={styles.empty}>
            <p>Nessun ciclo caricato.</p>
            <p style={{ marginTop: 4 }}>Scatta una foto alla lavagna per iniziare.</p>
          </div>
        )}

        {cycles.map(c => (
          <div key={c.id} className={`${styles.cycleCard} ${c.status === 'active' ? styles.active : ''}`}>
            <div className={styles.cycleHeader}>
              <span className={styles.cycleName}>{c.name}</span>
              <span className={`${styles.statusBadge} ${c.status === 'active' ? styles.statusActive : styles.statusArchived}`}>
                {c.status === 'active' ? 'Attivo' : 'Archiviato'}
              </span>
            </div>
            <span className={styles.cycleDates}>{c.startDate} → {c.endDate}</span>

            <div className={styles.slotList}>
              {['MON_TUE', 'WED_THU', 'FRI_SAT'].map(slot => {
                const blocks = c.slots[slot] || [];
                return (
                  <div key={slot} className={styles.slotSection}>
                    <span className={styles.slotTitle}>{slotLabel(slot)}</span>
                    {blocks.map(block => (
                      <div key={block.label} className={styles.blockRow}>
                        <span className={styles.blockLabelSmall}>{block.label}</span>
                        <span className={styles.blockExercises}>
                          {block.exercises.map((_, i) => `${block.label}${block.exercises[i].position}`).join(', ')}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div className={styles.devSection}>
          <p className={styles.devNote}>DEV — Small Class Mag/Giu 2026</p>
          <button
            className={styles.seedBtn}
            onClick={handleSeed}
            disabled={seeding || seeded}
          >
            {seeded
              ? '✓ Programma caricato'
              : seeding
              ? 'Caricamento...'
              : 'Carica programma dalla lavagna'}
          </button>
          {!seeded && (
            <p className={styles.seedHint}>
              Carica il programma reale con le sessioni delle sett. 1 e 2 già compilate.
              Attenzione: cancella tutti i dati esistenti.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
