import { useState, useEffect, useRef } from 'react';
import { formatEntryValue } from '../logic';
import styles from './ExerciseCard.module.css';

function IconKg() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="8" width="18" height="13" rx="2"/>
      <path d="M8 8V6a4 4 0 0 1 8 0v2"/>
    </svg>
  );
}

function IconElastic() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3C8.5 3 5 6 5 10c0 4.5 3.5 8 7 11 3.5-3 7-6.5 7-11 0-4-3.5-7-7-7z"/>
    </svg>
  );
}

function IconBW() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="5" r="2"/>
      <path d="M12 9v5"/>
      <path d="M9 11.5H6.5"/>
      <path d="M15 11.5h2.5"/>
      <path d="M9.5 19l2.5-5 2.5 5"/>
    </svg>
  );
}

const ELASTIC_COLORS = ['blue', 'yellow', 'orange'];
const ELASTIC_LABELS = { blue: 'BLU', yellow: 'GIA', orange: 'ARA' };

export default function ExerciseCard({ label, exercise, currentEntry, lastEntry, isHistorical, readonly, onSave, onNameTap }) {
  // Pre-selezione automatica dal tipo dell'ultima sessione
  const defaultType = currentEntry?.valueType ?? lastEntry?.valueType ?? null;
  const defaultColor = currentEntry?.elasticColor ?? (lastEntry?.valueType === 'elastic' ? lastEntry.elasticColor : null);
  const defaultWeight = currentEntry?.valueType === 'weight' ? String(currentEntry.weightKg) : '';

  const [valueType, setValueType] = useState(defaultType);
  const [weightInput, setWeightInput] = useState(defaultWeight);
  const [elasticColor, setElasticColor] = useState(defaultColor);
  const weightRef = useRef(null);

  // Se arriva un currentEntry (sessione aperta con dati già salvati), sync
  useEffect(() => {
    if (currentEntry) {
      setValueType(currentEntry.valueType);
      setWeightInput(currentEntry.valueType === 'weight' ? String(currentEntry.weightKg) : '');
      setElasticColor(currentEntry.elasticColor || null);
    }
  }, [currentEntry]);

  function buildAndSave(type, weight, color) {
    const base = { valueType: type, weightKg: null, elasticColor: null };
    if (type === 'weight') {
      const kg = parseFloat(String(weight).replace(',', '.'));
      if (isNaN(kg)) return;
      onSave({ ...base, weightKg: kg });
    } else if (type === 'elastic') {
      if (!color) return;
      onSave({ ...base, elasticColor: color });
    } else {
      onSave(base);
    }
  }

  function handleIconType(type) {
    setValueType(type);
    setElasticColor(null);
    setWeightInput('');
    if (type === 'weight') {
      setTimeout(() => weightRef.current?.focus(), 50);
    } else if (type !== 'elastic') {
      buildAndSave(type, '', null);
    }
  }

  function handleElastic(color) {
    setValueType('elastic');
    setElasticColor(color);
    setWeightInput('');
    buildAndSave('elastic', '', color);
  }

  function handleWeightBlur() {
    if (weightInput) buildAndSave('weight', weightInput, null);
  }

  const lastLabel = lastEntry ? formatEntryValue(lastEntry) : null;
  const previewLabel = !currentEntry && lastEntry ? formatEntryValue(lastEntry) : null;
  const showIncrease = currentEntry?.isIncrease;

  return (
    <div className={`${styles.card} ${readonly ? styles.cardReadonly : ''}`}>
      {/* Riga titolo */}
      <div className={styles.topRow}>
        <span className={styles.label}>{label}</span>
        <button className={styles.exName} onClick={onNameTap}>
          {exercise.canonicalName}
        </button>
        {/* In readonly: mostra il valore precedente come anteprima */}
        {readonly && previewLabel && (
          <span className={styles.previewValue}>{previewLabel}</span>
        )}
        {/* In edit: mostra l'ultima volta se c'è già un valore corrente */}
        {!readonly && lastLabel && currentEntry && (
          <span className={styles.lastValue}>
            {lastLabel}
            {lastEntry?.isIncrease && <span className={styles.arrowSmall}> ↑</span>}
          </span>
        )}
      </div>

      {/* Riga controlli — solo in modalità edit */}
      {!readonly && (
        <div className={styles.controlRow}>
          <div className={styles.iconGroup}>
            <button className={`${styles.iconBtn} ${valueType === 'weight' ? styles.iconActive : ''}`}
              onClick={() => handleIconType('weight')} aria-label="Peso"><IconKg /></button>
            <button className={`${styles.iconBtn} ${valueType === 'elastic' ? styles.iconActive : ''}`}
              onClick={() => handleIconType('elastic')} aria-label="Elastico"><IconElastic /></button>
            <button className={`${styles.iconBtn} ${valueType === 'bodyweight' ? styles.iconActive : ''}`}
              onClick={() => handleIconType('bodyweight')} aria-label="Corpo libero"><IconBW /></button>
          </div>

          <div className={styles.divider} />

          <div className={styles.valueArea}>
            {valueType === 'weight' && (
              <div className={styles.weightBox} onClick={() => weightRef.current?.focus()}>
                <input ref={weightRef} type="number" inputMode="decimal" step="0.5"
                  placeholder="0" className={styles.weightInput} value={weightInput}
                  onChange={e => setWeightInput(e.target.value)} onBlur={handleWeightBlur} />
                <span className={styles.unit}>kg</span>
              </div>
            )}
            {valueType === 'elastic' && (
              <div className={styles.elasticBtns}>
                {ELASTIC_COLORS.map(color => (
                  <button key={color}
                    className={`${styles.elasticBtn} ${styles[`e_${color}`]} ${elasticColor === color ? styles.elasticActive : ''}`}
                    onClick={() => handleElastic(color)}>
                    {ELASTIC_LABELS[color]}
                  </button>
                ))}
              </div>
            )}
            {valueType === 'bodyweight' && <span className={styles.bwLabel}>BW</span>}
            {valueType === 'none' && <span className={styles.noneLabel}>—</span>}
            {!valueType && <span className={styles.emptyHint}>seleziona tipo</span>}
          </div>
        </div>
      )}

      {showIncrease && (
        <div className={styles.increaseRow}>↑ Nuovo massimo</div>
      )}
    </div>
  );
}
