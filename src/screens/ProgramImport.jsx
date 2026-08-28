import { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { getAllExercises, saveExercise, saveCycle, archiveAllActiveCycles } from '../db';
import { matchExercise } from '../fuzzy';
import { extractProgramFromImage } from '../vision';
import styles from './ProgramImport.module.css';

const SLOT_LABELS = { MON_TUE: 'LUN/MAR', WED_THU: 'MER/GIO', FRI_SAT: 'VEN/SAB' };
const SLOTS = ['MON_TUE', 'WED_THU', 'FRI_SAT'];

function calcEndDate(startISO) {
  const d = new Date(startISO + 'T00:00:00');
  d.setDate(d.getDate() + 34);
  return d.toISOString().slice(0, 10);
}

function nextMonday() {
  const d = new Date();
  const diff = d.getDay() === 0 ? 1 : 8 - d.getDay();
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

/**
 * ProgramImport — riceve un file immagine già selezionato dall'utente,
 * lo analizza con Claude e mostra il flusso di review + salvataggio.
 * Nessuna UI per API key o scelta provider.
 */
export default function ProgramImport({ file, onBack, onDone }) {
  // 'analyzing' | 'review' | 'save'
  const [phase, setPhase] = useState('analyzing');
  const [imagePreview, setImagePreview] = useState(null);
  const [error, setError] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [existingExercises, setExistingExercises] = useState([]);
  const [reviewSlots, setReviewSlots] = useState(null);
  const [cycleName, setCycleName] = useState('');
  const [startDate, setStartDate] = useState(nextMonday());
  const [saving, setSaving] = useState(false);

  // Avvia analisi appena il componente monta con il file
  useEffect(() => {
    let cancelled = false;

    async function run() {
      const exs = await getAllExercises();
      if (cancelled) return;
      setExistingExercises(exs);

      // Leggi il file come base64
      const { base64, mediaType, previewUrl } = await readFile(file);
      if (cancelled) return;
      setImagePreview(previewUrl);

      try {
        const result = await extractProgramFromImage(base64, mediaType);
        if (cancelled) return;
        setWarnings(result.warnings || []);
        buildReviewData(result.slots || {}, exs);
        setPhase('review');
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    }

    run();
    return () => { cancelled = true; };
  }, [file]);

  function readFile(f) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        const dataUrl = e.target.result;
        const [header, b64] = dataUrl.split(',');
        resolve({
          base64: b64,
          mediaType: header.match(/data:(.*);/)?.[1] || 'image/jpeg',
          previewUrl: dataUrl,
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(f);
    });
  }

  function buildReviewData(apiSlots, exs) {
    const updated = {};
    for (const slot of SLOTS) {
      const blocks = apiSlots[slot]?.blocks || [];
      updated[slot] = blocks.map(block => ({
        label: block.label,
        exercises: block.exercises.map(ex => {
          const match = matchExercise(ex.name, exs);
          return {
            position: ex.position,
            extractedName: ex.name,
            resolvedName: match.status !== 'new' ? match.match.canonicalName : ex.name,
            status: match.status,
            matchedExercise: match.match,
            confirmed: match.status === 'exact',
          };
        }),
      }));
    }
    setReviewSlots(updated);
    const now = new Date();
    setCycleName(`Small Class — ${now.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}`);
  }

  function updateExerciseName(slot, bi, ei, newName) {
    setReviewSlots(prev => {
      const next = structuredClone(prev);
      next[slot][bi].exercises[ei].resolvedName = newName;
      return next;
    });
  }

  function confirmFuzzy(slot, bi, ei, useMatch) {
    setReviewSlots(prev => {
      const next = structuredClone(prev);
      const ex = next[slot][bi].exercises[ei];
      if (useMatch) {
        ex.resolvedName = ex.matchedExercise.canonicalName;
        ex.status = 'exact';
      } else {
        ex.status = 'new';
        ex.matchedExercise = null;
        ex.resolvedName = ex.extractedName;
      }
      ex.confirmed = true;
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const resolvedExMap = {};
      const allEx = [...existingExercises];

      for (const slot of SLOTS) {
        for (const block of reviewSlots[slot] || []) {
          for (const ex of block.exercises) {
            const name = ex.resolvedName.trim();
            if (!name || resolvedExMap[name]) continue;
            if ((ex.status === 'exact' || ex.status === 'fuzzy') && ex.matchedExercise) {
              resolvedExMap[name] = ex.matchedExercise;
            } else {
              const existing = allEx.find(e => e.canonicalName.toLowerCase() === name.toLowerCase());
              if (existing) {
                resolvedExMap[name] = existing;
              } else {
                const newEx = { id: uuidv4(), canonicalName: name, createdAt: new Date().toISOString().slice(0, 10) };
                await saveExercise(newEx);
                resolvedExMap[name] = newEx;
              }
            }
          }
        }
      }

      await archiveAllActiveCycles();

      const cycleSlots = {};
      for (const slot of SLOTS) {
        cycleSlots[slot] = (reviewSlots[slot] || []).map(block => ({
          label: block.label,
          exercises: block.exercises
            .filter(ex => ex.resolvedName.trim())
            .map((ex, i) => ({
              position: i + 1,
              exerciseId: resolvedExMap[ex.resolvedName.trim()]?.id,
            }))
            .filter(e => e.exerciseId),
        })).filter(b => b.exercises.length > 0);
      }

      await saveCycle({
        id: uuidv4(),
        name: cycleName,
        startDate,
        endDate: calcEndDate(startDate),
        status: 'active',
        weeks: [
          { weekNumber: 1, reps: 6 },
          { weekNumber: 2, reps: 6 },
          { weekNumber: 3, reps: 8 },
          { weekNumber: 4, reps: 8 },
          { weekNumber: 5, reps: 10 },
        ],
        slots: cycleSlots,
      });

      onDone();
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  }

  // ── RENDER ─────────────────────────────────────────────────────────

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={onBack}>←</button>
        <div className={styles.steps}>
          {['Analisi', 'Verifica', 'Attiva'].map((label, i) => {
            const stepNum = i + 1;
            const currentStep = phase === 'analyzing' ? 1 : phase === 'review' ? 2 : 3;
            return (
              <div key={label} className={`${styles.stepDot} ${currentStep >= stepNum ? styles.stepActive : ''}`} />
            );
          })}
        </div>
        <span className={styles.stepLabel}>
          {phase === 'analyzing' ? 'Analisi' : phase === 'review' ? 'Verifica' : 'Attiva'}
        </span>
      </header>

      {/* ── ANALISI IN CORSO ── */}
      {phase === 'analyzing' && (
        <div className={styles.body} style={{ alignItems: 'center', justifyContent: 'center', gap: 24 }}>
          {imagePreview && (
            <img src={imagePreview} alt="Foto lavagna" className={styles.preview} style={{ maxHeight: 220 }} />
          )}
          {!error ? (
            <>
              <div className={styles.analyzingSpinner}>⏳</div>
              <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', textAlign: 'center' }}>
                Analisi in corso…
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center' }}>
                Claude sta leggendo la lavagna e individuando gli esercizi
              </p>
            </>
          ) : (
            <>
              <div className={styles.error}>{error}</div>
              <button className={styles.primaryBtn} onClick={onBack}>← Torna indietro</button>
            </>
          )}
        </div>
      )}

      {/* ── REVIEW ── */}
      {phase === 'review' && reviewSlots && (
        <div className={styles.body}>
          <h2 className={styles.title}>Controlla gli esercizi</h2>
          <p className={styles.subtitle}>Verifica i nomi estratti. Gli esercizi già in libreria sono evidenziati.</p>

          {warnings.length > 0 && (
            <div className={styles.warningBox}>
              <strong>Attenzione:</strong> {warnings.join(' · ')}
            </div>
          )}

          {imagePreview && (
            <img src={imagePreview} alt="Foto lavagna" className={styles.preview} />
          )}

          {SLOTS.map(slot => {
            const blocks = reviewSlots[slot] || [];
            if (blocks.length === 0) return null;
            return (
              <div key={slot} className={styles.slotSection}>
                <div className={styles.slotTitle}>{SLOT_LABELS[slot]}</div>
                {blocks.map((block, bi) => (
                  <div key={block.label} className={styles.reviewBlock}>
                    <div className={styles.blockLabel}>Blocco {block.label}</div>
                    {block.exercises.map((ex, ei) => (
                      <div key={ei} className={styles.reviewRow}>
                        <span className={styles.reviewPos}>{block.label}{ex.position}</span>
                        <div className={styles.reviewInfo}>
                          <div className={styles.reviewInputRow}>
                            <input
                              className={styles.reviewInput}
                              value={ex.resolvedName}
                              onChange={e => updateExerciseName(slot, bi, ei, e.target.value)}
                            />
                          </div>
                          {ex.status === 'exact' && (
                            <span className={styles.badgeExact}>già in libreria ✓</span>
                          )}
                          {ex.status === 'new' && (
                            <span className={styles.badgeNew}>nuovo esercizio</span>
                          )}
                          {ex.status === 'fuzzy' && !ex.confirmed && (
                            <div className={styles.fuzzyRow}>
                              <span className={styles.badgeFuzzy}>
                                Forse: «{ex.matchedExercise.canonicalName}»?
                              </span>
                              <div className={styles.fuzzyBtns}>
                                <button className={styles.fuzzyYes} onClick={() => confirmFuzzy(slot, bi, ei, true)}>Sì</button>
                                <button className={styles.fuzzyNo} onClick={() => confirmFuzzy(slot, bi, ei, false)}>No, è nuovo</button>
                              </div>
                            </div>
                          )}
                          {ex.status === 'fuzzy' && ex.confirmed && (
                            <span className={styles.badgeExact}>collegato ✓</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            );
          })}

          {error && <div className={styles.error}>{error}</div>}

          <button className={styles.primaryBtn} onClick={() => setPhase('save')}>
            Conferma e continua →
          </button>
        </div>
      )}

      {/* ── ATTIVA CICLO ── */}
      {phase === 'save' && (
        <div className={styles.body}>
          <h2 className={styles.title}>Attiva il ciclo</h2>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>Nome ciclo</label>
            <input className={styles.fieldInput} value={cycleName} onChange={e => setCycleName(e.target.value)} />
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>Inizio ciclo</label>
            <input type="date" className={styles.fieldInput} value={startDate}
              onChange={e => setStartDate(e.target.value)} />
          </div>

          <div className={styles.summary}>
            <span>5 settimane:</span>
            <span className={styles.summaryDates}>{startDate} → {calcEndDate(startDate)}</span>
          </div>

          <div className={styles.weeksPreview}>
            {[{n:1,r:6},{n:2,r:6},{n:3,r:8},{n:4,r:8},{n:5,r:10}].map(w => (
              <div key={w.n} className={styles.weekRow}>
                <span className={styles.weekNum}>Settimana {w.n}</span>
                <span className={styles.weekReps}>×{w.r} reps</span>
              </div>
            ))}
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <button className={styles.primaryBtn} onClick={handleSave} disabled={saving || !cycleName}>
            {saving ? 'Salvataggio…' : '✓ Attiva ciclo'}
          </button>
        </div>
      )}
    </div>
  );
}
