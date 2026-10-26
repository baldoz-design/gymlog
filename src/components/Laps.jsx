import styles from './Laps.module.css';

// Un quadratino per stazione, una riga per giro. live: tiene visibile la riga del giro in corso
export default function Laps({ n, size = 4, live = false, variant = '' }) {
  const rows = Math.max(2, Math.ceil((live ? n + 1 : n) / size));
  return (
    <div className={`${styles.laps} ${variant ? styles[variant] : ''}`} role="img" aria-label={`${n} stazioni`}>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className={styles.lap} style={{ gridTemplateColumns: `repeat(${size}, var(--cell-w))` }}>
          {Array.from({ length: size }, (_, c) => {
            const k = r * size + c;
            return <i key={c} className={`${styles.cell} ${k < n ? styles.on : ''}`} style={k < n ? { animationDelay: `${k * 45}ms` } : undefined} />;
          })}
        </div>
      ))}
    </div>
  );
}
