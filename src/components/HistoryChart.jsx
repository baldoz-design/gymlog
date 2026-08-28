/**
 * HistoryChart — grafico area full-width per la bottom sheet di storico.
 * Stile finance: linea + area sfumata, etichette min/max, dot sull'ultimo punto.
 */
export default function HistoryChart({ entries }) {
  function toNumeric(entry) {
    const t = entry.valueType ?? entry.type;
    if (t === 'weight') return entry.weightKg ?? entry.value ?? null;
    if (t === 'elastic') {
      const map = { blue: 1, yellow: 2, orange: 3 };
      return map[entry.elasticColor ?? entry.color] ?? 1;
    }
    if (t === 'bodyweight' || t === 'bw') return 0.5; // valore fisso visivo
    return null;
  }

  function toLabel(entry) {
    const t = entry.valueType ?? entry.type;
    if (t === 'weight') return `${entry.weightKg ?? entry.value} kg`;
    if (t === 'elastic') {
      const labels = { blue: 'BLU', yellow: 'GIA', orange: 'ARA' };
      return labels[entry.elasticColor ?? entry.color] ?? '—';
    }
    if (t === 'bodyweight' || t === 'bw') return 'BW';
    return '—';
  }

  // Dal più vecchio al più recente
  const chronological = [...entries].reverse();
  const points = chronological.map(e => ({ v: toNumeric(e), label: toLabel(e), entry: e }))
    .filter(p => p.v !== null);

  if (points.length < 2) return null;

  const W = 320, H = 80;
  const padX = 4, padTop = 12, padBottom = 24;
  const chartW = W - padX * 2;
  const chartH = H - padTop - padBottom;

  const values = points.map(p => p.v);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const coords = points.map((p, i) => ({
    x: padX + (i / (points.length - 1)) * chartW,
    y: padTop + chartH - ((p.v - min) / range) * chartH,
    label: p.label,
  }));

  const linePath = coords.map(({ x, y }, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${coords[coords.length - 1].x.toFixed(1)},${(padTop + chartH).toFixed(1)} L${coords[0].x.toFixed(1)},${(padTop + chartH).toFixed(1)} Z`;

  const first = coords[0];
  const last = coords[coords.length - 1];
  const isElastic = (entries[0]?.valueType ?? entries[0]?.type) === 'elastic';

  return (
    <div style={{ padding: '16px 16px 0', borderBottom: '1px solid var(--border)' }}>
      <svg
        width="100%"
        viewBox={`0 0 ${W} ${H}`}
        style={{ display: 'block', overflow: 'visible' }}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="hcGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--green)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--green)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Linea guida orizzontale centrale */}
        <line
          x1={padX} y1={padTop + chartH / 2}
          x2={W - padX} y2={padTop + chartH / 2}
          stroke="var(--border)" strokeWidth="1" strokeDasharray="3,4"
        />

        {/* Area */}
        <path d={areaPath} fill="url(#hcGrad)" />

        {/* Linea */}
        <path
          d={linePath}
          fill="none"
          stroke="var(--green)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Dot primo punto */}
        <circle cx={first.x} cy={first.y} r="3" fill="var(--bg-card)" stroke="var(--green)" strokeWidth="1.5" />

        {/* Dot ultimo punto */}
        <circle cx={last.x} cy={last.y} r="4" fill="var(--green)" />

        {/* Etichetta primo valore */}
        <text
          x={first.x}
          y={H - 6}
          textAnchor="start"
          fontSize="10"
          fill="var(--text-secondary)"
          fontWeight="600"
        >
          {points[0].label}
        </text>

        {/* Etichetta ultimo valore */}
        <text
          x={last.x}
          y={H - 6}
          textAnchor="end"
          fontSize="10"
          fill="var(--green)"
          fontWeight="700"
        >
          {points[points.length - 1].label}
        </text>

        {/* Numero sessioni */}
        <text
          x={W / 2}
          y={H - 6}
          textAnchor="middle"
          fontSize="10"
          fill="var(--text-secondary)"
        >
          {points.length} sessioni
        </text>
      </svg>
    </div>
  );
}
