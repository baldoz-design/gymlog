import { useState, useEffect, useRef, useCallback } from 'react'; // useRef needed for saveTimer
import { formatEntryValue } from '../logic';
import styles from './ExerciseCard.module.css';

const STEP = 0.5;
const ELASTIC_COLORS  = ['blue', 'yellow', 'orange'];
const ELASTIC_LABELS  = { blue: 'AZZ', yellow: 'GIA', orange: 'ARA' };
const ELASTIC_CSS     = { blue: 'var(--azzurro)', yellow: 'var(--giallo)', orange: 'var(--arancione)' };
const TYPE_SIGLA      = { weight: 'KG', elastic: 'EL', bodyweight: 'BW' };
const TYPE_LABEL      = { weight: 'Peso', elastic: 'Elastico', bodyweight: 'Corpo libero' };

export default function ExerciseCard({
  label, exercise, currentEntry, lastEntry,
  isHistorical, readonly, onSave, onNameTap,
}) {
  const defaultType  = currentEntry?.valueType ?? lastEntry?.valueType ?? null;
  const defaultColor = currentEntry?.elasticColor
    ?? (lastEntry?.valueType === 'elastic' ? lastEntry.elasticColor : null);
  const defaultKg    = currentEntry?.valueType === 'weight'
    ? currentEntry.weightKg
    : (lastEntry?.valueType === 'weight' ? lastEntry.weightKg : 0);

  const [valueType,    setValueType]    = useState(defaultType);
  const [weightKg,     setWeightKg]     = useState(defaultKg);
  const [elasticColor, setElasticColor] = useState(defaultColor);
  const [typeOpen,     setTypeOpen]     = useState(false);
  const [editingKg,    setEditingKg]    = useState(false);

  const saveTimer  = useRef(null);
  const kgInputRef = useRef(null);

  useEffect(() => {
    if (currentEntry) {
      setValueType(currentEntry.valueType);
      setElasticColor(currentEntry.elasticColor || null);
      if (currentEntry.valueType === 'weight') setWeightKg(currentEntry.weightKg);
    }
  }, [currentEntry]);

  const schedSave = useCallback((type, kg, color) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const base = { valueType: type, weightKg: null, elasticColor: null };
      if      (type === 'weight')     { if (kg < 0) return; onSave({ ...base, weightKg: kg }); }
      else if (type === 'elastic')    { if (!color) return;  onSave({ ...base, elasticColor: color }); }
      else if (type === 'bodyweight') { onSave(base); }
    }, 300);
  }, [onSave]);

  function handleSelectType(type) {
    setTypeOpen(false);
    setValueType(type);
    setElasticColor(null);
    if (type === 'bodyweight') schedSave(type, null, null);
  }

  function handleElastic(color) {
    setElasticColor(color);
    schedSave('elastic', null, color);
  }

  function handleStepDown() {
    const next = Math.max(0, Math.round((weightKg - STEP) * 10) / 10);
    setWeightKg(next);
    schedSave('weight', next, null);
  }

  function handleStepUp() {
    const next = Math.round((weightKg + STEP) * 10) / 10;
    setWeightKg(next);
    schedSave('weight', next, null);
  }

  function handleKgTap() {
    setEditingKg(true);
    setTimeout(() => { kgInputRef.current?.select(); }, 30);
  }

  function handleKgBlur() {
    setEditingKg(false);
    const parsed = parseFloat(String(weightKg).replace(',', '.'));
    const val = isNaN(parsed) ? 0 : Math.max(0, Math.round(parsed * 10) / 10);
    setWeightKg(val);
    schedSave('weight', val, null);
  }

  function handleKgChange(e) {
    setWeightKg(e.target.value); // allow free typing, validate on blur
  }

  function handleKgKey(e) {
    if (e.key === 'Enter') { e.target.blur(); }
  }

  const lastLabel = lastEntry ? formatEntryValue(lastEntry) : null;
  const isSaved   = !!currentEntry;

  // ── Read-only view (session view mode) ───────────────────────
  if (readonly) {
    const roEntry = currentEntry || lastEntry;
    const roValue = roEntry?.valueType === 'elastic'
      ? <span style={{ color: ELASTIC_CSS[roEntry.elasticColor], fontSize: 18, lineHeight: 1 }}>●</span>
      : (roEntry ? formatEntryValue(roEntry) : '—');
    return (
      <div className={`${styles.card} ${styles.cardReadonly}`}>
        <div className={styles.topRow}>
          <span className={styles.lbl}>{label}</span>
          <span className={styles.exName}>{exercise.canonicalName}</span>
          <span className={styles.roValue}>{roValue}</span>
        </div>
      </div>
    );
  }

  // ── Edit view ────────────────────────────────────────────────
  return (
    <div className={`${styles.card} ${isSaved ? styles.cardSaved : ''}`}>

      {/* ── Top row: label + name + type pill ── */}
      <div className={styles.topRow}>
        <span className={styles.lbl}>{label}</span>
        <button className={styles.exName} onClick={onNameTap}>{exercise.canonicalName}</button>
        <button className={styles.typePill} onClick={() => setTypeOpen(o => !o)}>
          {valueType
            ? <>
                <span className={styles.tSigla}>{TYPE_SIGLA[valueType]}</span>
                <span className={styles.tSep}>|</span>
                <span className={styles.tLbl}>{TYPE_LABEL[valueType]}</span>
                <span className={styles.tChev}>▾</span>
              </>
            : <span className={styles.tPlaceholder}>Tipo ▾</span>
          }
        </button>
      </div>

      {/* ── Type selector ── */}
      {typeOpen && (
        <div className={styles.typeSelector}>
          {['weight', 'bodyweight', 'elastic'].map(t => (
            <button
              key={t}
              className={`${styles.tSelBtn} ${valueType === t ? styles.tSelActive : ''}`}
              onClick={() => handleSelectType(t)}
            >
              {TYPE_SIGLA[t]} · {TYPE_LABEL[t]}
            </button>
          ))}
        </div>
      )}

      {/* ── Ultima volta ── */}
      {lastLabel && !typeOpen && (
        <div className={styles.ultimaVolta}>
          ULTIMA VOLTA <span className={styles.ultimaVal}>{lastLabel}</span>
        </div>
      )}

      {/* ── Controls ── */}
      {!typeOpen && valueType === 'weight' && (
        <div className={styles.controlRow}>
          <div className={styles.stepper}>
            <button className={styles.stepBtn} onClick={handleStepDown} aria-label="-0.5 kg">−</button>
            <div className={styles.stepCenter}>
              {editingKg ? (
                <input
                  ref={kgInputRef}
                  className={styles.stepInput}
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  min="0"
                  value={weightKg}
                  onChange={handleKgChange}
                  onBlur={handleKgBlur}
                  onKeyDown={handleKgKey}
                />
              ) : (
                <button className={styles.stepValBtn} onClick={handleKgTap}>
                  <span className={styles.stepVal}>{weightKg}</span>
                  <span className={styles.stepUnit}>kg</span>
                </button>
              )}
            </div>
            <button className={styles.stepBtn} onClick={handleStepUp} aria-label="+0.5 kg">+</button>
          </div>
          <button
            className={`${styles.doneBtn} ${isSaved ? styles.doneBtnSaved : ''}`}
            onClick={() => schedSave('weight', weightKg, null)}
          >
            {isSaved ? '✓' : 'FATTO'}
          </button>
        </div>
      )}

      {!typeOpen && valueType === 'elastic' && (
        <div className={styles.controlRow}>
          <div className={styles.elasticBtns}>
            {ELASTIC_COLORS.map(color => (
              <button
                key={color}
                className={`${styles.elasticBtn} ${elasticColor === color ? styles.elasticActive : ''}`}
                style={{
                  borderColor: ELASTIC_CSS[color],
                  background: elasticColor === color ? ELASTIC_CSS[color] : 'transparent',
                }}
                onClick={() => handleElastic(color)}
              >
                <span style={{ color: elasticColor === color ? 'var(--accent-ink)' : ELASTIC_CSS[color], fontSize: 20 }}>●</span>
              </button>
            ))}
          </div>
          <button
            className={`${styles.doneBtn} ${isSaved ? styles.doneBtnSaved : ''}`}
            onClick={() => elasticColor && schedSave('elastic', null, elasticColor)}
          >
            {isSaved ? '✓' : 'FATTO'}
          </button>
        </div>
      )}

      {!typeOpen && valueType === 'bodyweight' && (
        <div className={styles.controlRow}>
          <div className={styles.bwLabel}>Corpo libero</div>
          <button
            className={`${styles.doneBtn} ${isSaved ? styles.doneBtnSaved : ''}`}
            onClick={() => schedSave('bodyweight', null, null)}
          >
            {isSaved ? '✓' : 'FATTO'}
          </button>
        </div>
      )}

    </div>
  );
}
