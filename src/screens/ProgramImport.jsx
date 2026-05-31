import { useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { getAllExercises, saveExercise, saveCycle, archiveAllActiveCycles } from '../db';
import { matchExercise } from '../fuzzy';
import { extractProgramFromImage } from '../vision';
import styles from './ProgramImport.module.css';

const SLOT_LABELS = { MON_TUE: 'LUN/MAR', WED_THU: 'MER/GIO', FRI_SAT: 'VEN/SAB' };
const SLOTS = ['MON_TUE', 'WED_THU', 'FRI_SAT'];

function getSavedKey(provider) {
  return localStorage.getItem(`api_key_${provider}`) || '';
}
function saveKey(provider, key) {
  localStorage.setItem(`api_key_${provider}`, key);
}

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

// Struttura vuota per l'inserimento manuale
function emptyReviewSlots() {
  const slots = {};
  for (const slot of SLOTS) {
    slots[slot] = [
      { label: 'A', exercises: [1, 2, 3].map(p => emptyEx(p)) },
      { label: 'B', exercises: [1, 2].map(p => emptyEx(p)) },
      { label: 'C', exercises: [1, 2, 3].map(p => emptyEx(p)) },
    ];
  }
  return slots;
}

function emptyEx(position) {
  return { position, extractedName: '', resolvedName: '', status: 'new', matchedExercise: null, confirmed: true };
}

export default function ProgramImport({ onBack, onDone }) {
  // 'choose' | 'photo' | 'manual'
  const [mode, setMode] = useState('choose');
  const [step, setStep] = useState(1); // 1=foto/manual, 2=review, 3=date
  const [provider, setProvider] = useState('gemini');
  const [apiKey, setApiKeyState] = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [imageType, setImageType] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [existingExercises, setExistingExercises] = useState([]);
  const [reviewSlots, setReviewSlots] = useState(null);
  const [cycleName, setCycleName] = useState('');
  const [startDate, setStartDate] = useState(nextMonday());
  const [saving, setSaving] = useState(false);

  const fileRef = useRef();
  const cameraRef = useRef();

  useEffect(() => {
    getAllExercises().then(setExistingExercises);
  }, []);

  useEffect(() => {
    setApiKeyState(getSavedKey(provider));
  }, [provider]);

  // ── Gestione foto ──────────────────────────────────────────────────

  function handleFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      const dataUrl = e.target.result;
      setImagePreview(dataUrl);
      const [header, b64] = dataUrl.split(',');
      setImageBase64(b64);
      setImageType(header.match(/data:(.*);/)?.[1] || 'image/jpeg');
    };
    reader.readAsDataURL(file);
  }

  async function handleAnalyze() {
    if (!imageBase64) { setError('Seleziona prima una foto.'); return; }
    if (!apiKey.trim()) { setError('Inserisci la API key per continuare.'); return; }
    saveKey(provider, apiKey.trim());
    setAnalyzing(true);
    setError(null);
    try {
      const result = await extractProgramFromImage(imageBase64, imageType, provider, apiKey.trim());
      setWarnings(result.warnings || []);
      buildReviewData(result.slots || {});
      setStep(2);
    } catch (e) {
      setError(e.message);
    } finally {
      setAnalyzing(false);
    }
  }

  // ── Modalità manuale ───────────────────────────────────────────────

  function startManual() {
    const now = new Date();
    setCycleName(`Small Class — ${now.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}`);
    setReviewSlots(emptyReviewSlots());
    setMode('manual');
    setStep(2);
  }

  // ── Review dati estratti da foto ───────────────────────────────────

  function buildReviewData(apiSlots) {
    const updated = {};
    for (const slot of SLOTS) {
      const blocks = apiSlots[slot]?.blocks || [];
      updated[slot] = blocks.map(block => ({
        label: block.label,
        exercises: block.exercises.map(ex => {
          const match = matchExercise(ex.name, existingExercises);
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

  function addExercise(slot, bi) {
    setReviewSlots(prev => {
      const next = structuredClone(prev);
      const block = next[slot][bi];
      block.exercises.push(emptyEx(block.exercises.length + 1));
      return next;
    });
  }

  function removeExercise(slot, bi, ei) {
    setReviewSlots(prev => {
      const next = structuredClone(prev);
      next[slot][bi].exercises.splice(ei, 1);
      next[slot][bi].exercises.forEach((e, i) => { e.position = i + 1; });
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

  // ── Salvataggio ────────────────────────────────────────────────────

  async function handleSave() {
    setSaving(true);
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
            .map(ex => ({
              position: ex.position,
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

  // ── Render ─────────────────────────────────────────────────────────

  const isManual = mode === 'manual';

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={onBack}>←</button>
        {mode === 'choose' ? (
          <span className={styles.headerTitle}>Nuovo programma</span>
        ) : (
          <div className={styles.steps}>
            {[1, 2, 3].map(n => (
              <div key={n} className={`${styles.stepDot} ${step >= n ? styles.stepActive : ''}`} />
            ))}
          </div>
        )}
        <span className={styles.stepLabel}>
          {mode === 'choose' ? '' : step === 1 ? 'Foto' : step === 2 ? 'Esercizi' : 'Attiva'}
        </span>
      </header>

      {/* ── SCELTA MODALITÀ ── */}
      {mode === 'choose' && (
        <div className={styles.body}>
          <h2 className={styles.title}>Come vuoi inserire il programma?</h2>

          <button className={styles.modeCard} onClick={() => { setMode('photo'); setStep(1); }}>
            <span className={styles.modeIcon}>📷</span>
            <div className={styles.modeText}>
              <span className={styles.modeTitle}>Foto della lavagna</span>
              <span className={styles.modeSub}>Scatta o carica una foto, l&apos;AI estrae gli esercizi automaticamente</span>
            </div>
            <span className={styles.modeArrow}>›</span>
          </button>

          <button className={styles.modeCard} onClick={startManual}>
            <span className={styles.modeIcon}>✏️</span>
            <div className={styles.modeText}>
              <span className={styles.modeTitle}>Inserimento manuale</span>
              <span className={styles.modeSub}>Digita gli esercizi direttamente, senza API</span>
            </div>
            <span className={styles.modeArrow}>›</span>
          </button>
        </div>
      )}

      {/* ── STEP 1: FOTO ── */}
      {mode === 'photo' && step === 1 && (
        <div className={styles.body}>
          <h2 className={styles.title}>Foto della lavagna</h2>

          {imagePreview && (
            <div className={styles.photoArea}>
              <img src={imagePreview} alt="Anteprima" className={styles.preview} />
            </div>
          )}

          <div className={styles.photoButtons}>
            <button className={styles.photoBtn} onClick={() => cameraRef.current?.click()}>
              <span className={styles.photoBtnIcon}>📷</span>
              <span>Scatta foto</span>
            </button>
            <button className={styles.photoBtn} onClick={() => fileRef.current?.click()}>
              <span className={styles.photoBtnIcon}>🖼️</span>
              <span>Dalla galleria</span>
            </button>
          </div>
          <input ref={cameraRef} type="file" accept="image/*" capture="environment"
            style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
          <input ref={fileRef} type="file" accept="image/*"
            style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />

          {/* Scelta provider */}
          <div className={styles.providerRow}>
            <span className={styles.providerLabel}>AI:</span>
            <button
              className={`${styles.providerBtn} ${provider === 'gemini' ? styles.providerActive : ''}`}
              onClick={() => setProvider('gemini')}
            >
              Gemini (gratuito)
            </button>
            <button
              className={`${styles.providerBtn} ${provider === 'claude' ? styles.providerActive : ''}`}
              onClick={() => setProvider('claude')}
            >
              Claude
            </button>
          </div>

          <div className={styles.apiSection}>
            <label className={styles.apiLabel}>
              {provider === 'gemini' ? 'API Key Google (aistudio.google.com)' : 'API Key Anthropic (console.anthropic.com)'}
            </label>
            <input
              type="password"
              className={styles.apiInput}
              placeholder={provider === 'gemini' ? 'AIza...' : 'sk-ant-...'}
              value={apiKey}
              onChange={e => setApiKeyState(e.target.value)}
            />
            {provider === 'gemini' && (
              <p className={styles.apiHint}>
                Gratuito fino a 1500 richieste/giorno. Registrati su aistudio.google.com, nessuna carta richiesta.
              </p>
            )}
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <button className={styles.primaryBtn} onClick={handleAnalyze} disabled={!imageBase64 || analyzing}>
            {analyzing ? 'Analisi in corso…' : 'Analizza programma'}
          </button>
        </div>
      )}

      {/* ── STEP 2: REVIEW / MANUALE ── */}
      {step === 2 && reviewSlots && (
        <div className={styles.body}>
          <h2 className={styles.title}>{isManual ? 'Inserisci gli esercizi' : 'Controlla gli esercizi'}</h2>
          {!isManual && <p className={styles.subtitle}>Verifica che i nomi siano corretti</p>}
          {isManual && <p className={styles.subtitle}>Compila i blocchi per ogni slot. Lascia vuoti i campi non usati.</p>}

          {warnings.length > 0 && (
            <div className={styles.warningBox}><strong>Attenzione:</strong> {warnings.join(' · ')}</div>
          )}

          {SLOTS.map(slot => {
            const blocks = reviewSlots[slot] || [];
            if (!isManual && blocks.length === 0) return null;
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
                              placeholder={isManual ? 'Nome esercizio…' : ''}
                              onChange={e => updateExerciseName(slot, bi, ei, e.target.value)}
                            />
                            {isManual && (
                              <button className={styles.removeBtn} onClick={() => removeExercise(slot, bi, ei)}>✕</button>
                            )}
                          </div>
                          {!isManual && ex.status === 'exact' && (
                            <span className={styles.badgeExact}>già in libreria</span>
                          )}
                          {!isManual && ex.status === 'new' && (
                            <span className={styles.badgeNew}>nuovo</span>
                          )}
                          {!isManual && ex.status === 'fuzzy' && !ex.confirmed && (
                            <div className={styles.fuzzyRow}>
                              <span className={styles.badgeFuzzy}>Forse: «{ex.matchedExercise.canonicalName}»?</span>
                              <div className={styles.fuzzyBtns}>
                                <button className={styles.fuzzyYes} onClick={() => confirmFuzzy(slot, bi, ei, true)}>Sì</button>
                                <button className={styles.fuzzyNo} onClick={() => confirmFuzzy(slot, bi, ei, false)}>No</button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {isManual && (
                      <button className={styles.addExBtn} onClick={() => addExercise(slot, bi)}>
                        + aggiungi esercizio
                      </button>
                    )}
                  </div>
                ))}
              </div>
            );
          })}

          {error && <div className={styles.error}>{error}</div>}
          <button className={styles.primaryBtn} onClick={() => setStep(3)}>
            Conferma e continua
          </button>
        </div>
      )}

      {/* ── STEP 3: DATE ── */}
      {step === 3 && (
        <div className={styles.body}>
          <h2 className={styles.title}>Attiva il ciclo</h2>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>Nome ciclo</label>
            <input className={styles.fieldInput} value={cycleName} onChange={e => setCycleName(e.target.value)} />
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>Inizio ciclo (lunedì)</label>
            <input type="date" className={styles.fieldInput} value={startDate}
              onChange={e => setStartDate(e.target.value)} style={{ colorScheme: 'dark' }} />
          </div>

          <div className={styles.summary}>
            <span>5 settimane:</span>
            <span className={styles.summaryDates}>{startDate} → {calcEndDate(startDate)}</span>
          </div>

          <div className={styles.weeksPreview}>
            {[{n:1,r:6},{n:2,r:6},{n:3,r:8},{n:4,r:8},{n:5,r:10}].map(w => (
              <div key={w.n} className={styles.weekRow}>
                <span className={styles.weekNum}>Sett. {w.n}</span>
                <span className={styles.weekReps}>×{w.r} reps</span>
              </div>
            ))}
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <button className={styles.primaryBtn} onClick={handleSave} disabled={saving || !cycleName}>
            {saving ? 'Salvataggio…' : 'Attiva ciclo'}
          </button>
        </div>
      )}
    </div>
  );
}
