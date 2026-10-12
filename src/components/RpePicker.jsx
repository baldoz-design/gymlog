import { useRef, useState } from 'react';
import styles from './RpePicker.module.css';

const BAR_HEIGHTS = [48, 62, 76, 90, 106, 122, 140, 158, 176, 198]; // px, bar 1 → 10

const RPE_LABELS = {
  1:  'Riposo attivo',
  2:  'Facilissimo',
  3:  'Facile',
  4:  'Moderato',
  5:  'Abbastanza facile',
  6:  'Impegnativo',
  7:  'Difficile',
  8:  'Molto difficile',
  9:  'Al massimo!',
  10: 'Limite assoluto',
};

function getBg(value) {
  if (!value) return 'linear-gradient(180deg,#1C1A17 0%,#121110 100%)';
  if (value <= 3) return 'linear-gradient(180deg,#0D1F38 0%,#121110 75%)';
  if (value <= 6) return 'linear-gradient(180deg,#0C1B48 0%,#121110 75%)';
  if (value <= 8) return 'linear-gradient(180deg,#1E0A48 0%,#121110 75%)';
  return 'linear-gradient(180deg,#48080E 0%,#121110 75%)';
}

export default function RpePicker({ initialValue = null, onConfirm, onCancel }) {
  const [value, setValue] = useState(initialValue);
  const barsRef  = useRef(null);
  const dragging = useRef(false);

  function valueFromX(clientX) {
    const rect = barsRef.current.getBoundingClientRect();
    const pct  = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Math.max(1, Math.min(10, Math.floor(pct * 10) + 1));
  }

  function onPointerDown(e) {
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    setValue(valueFromX(e.clientX));
  }

  function onPointerMove(e) {
    if (!dragging.current) return;
    setValue(valueFromX(e.clientX));
  }

  function onPointerUp() {
    dragging.current = false;
  }

  function handleConfirm() {
    if (value) onConfirm(value);
  }

  return (
    <div className={styles.overlay} style={{ background: getBg(value) }}>
      <button className={styles.closeBtn} onClick={onCancel} aria-label="Annulla">✕</button>
      <button
        className={`${styles.confirmBtn} ${value ? styles.confirmActive : ''}`}
        onClick={handleConfirm}
        aria-label="Conferma"
        disabled={!value}
      >✓</button>

      <h1 className={styles.title}>Valuta il tuo sforzo</h1>

      <div
        ref={barsRef}
        className={styles.barsWrap}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {[1,2,3,4,5,6,7,8,9,10].map(v => (
          <div
            key={v}
            className={`${styles.bar} ${v === value ? styles.barSel : ''}`}
            style={{ height: BAR_HEIGHTS[v - 1] }}
          />
        ))}
      </div>

      <div className={styles.labelWrap}>
        {value ? (
          <div className={styles.labelPill}>
            <span className={styles.labelNum}>{value}</span>
            <span className={styles.labelTxt}>{RPE_LABELS[value]}</span>
          </div>
        ) : (
          <p className={styles.labelHint}>Trascina o tocca per selezionare</p>
        )}
      </div>
    </div>
  );
}
