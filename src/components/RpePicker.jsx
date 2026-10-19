import { useRef, useState } from 'react';
import { ZONES, rpeZoneIndex as zoneIndex, rpeBackground as getBg } from '../rpe';
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

export default function RpePicker({ initialValue = null, onConfirm, onCancel }) {
  const [value, setValue] = useState(initialValue);
  const barsRef  = useRef(null);
  const dragging = useRef(false);

  // Le zone hanno spaziature diverse: si prende la barra col centro più vicino
  function valueFromX(clientX) {
    let best = 1, bestDist = Infinity;
    for (const bar of barsRef.current.querySelectorAll('[data-value]')) {
      const r = bar.getBoundingClientRect();
      const d = Math.abs(clientX - (r.left + r.width / 2));
      if (d < bestDist) { bestDist = d; best = Number(bar.dataset.value); }
    }
    return best;
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

  const activeZone = value ? zoneIndex(value) : -1;

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
        {ZONES.map((zone, zi) => (
          <div key={zone.label} className={styles.group}>
            <div className={styles.groupBars}>
              {Array.from({ length: zone.range[1] - zone.range[0] + 1 }, (_, k) => zone.range[0] + k).map(v => (
                <div
                  key={v}
                  data-value={v}
                  className={`${styles.bar} ${value && v <= value ? styles.barSel : ''}`}
                  style={{ height: BAR_HEIGHTS[v - 1], background: zone.color }}
                />
              ))}
            </div>
            <span className={`${styles.groupLabel} ${zi === activeZone ? styles.groupLabelActive : ''}`}>
              {zone.label}
            </span>
          </div>
        ))}
      </div>

      <div className={styles.labelWrap}>
        {value ? (
          <div className={styles.labelPill} style={{ boxShadow: `inset 0 0 0 1px ${ZONES[activeZone].color}55` }}>
            <span className={styles.labelNum} style={{ background: `${ZONES[activeZone].color}30`, color: ZONES[activeZone].color }}>{value}</span>
            <span className={styles.labelTxt}>{RPE_LABELS[value]}</span>
          </div>
        ) : (
          <p className={styles.labelHint}>Trascina o tocca per selezionare</p>
        )}
      </div>
    </div>
  );
}
