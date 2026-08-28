/**
 * Sparkline — area chart stile finance app.
 * Props:
 *   entries: array di session entry dal più vecchio al più recente
 *   width, height: dimensioni SVG (default 80x36)
 *   color: colore linea/area (default var CSS)
 */
export default function Sparkline({ entries = [], width = 80, height = 36, color = '#1E6B1E' }) {
  // Converte un entry in valore numerico comparabile
  function toNumeric(entry) {
    if (!entry) return null;
    // Supporta sia valueType/weightKg/elasticColor (DB) che type/value/color (legacy)
    const t = entry.valueType ?? entry.type;
    if (t === 'weight') return entry.weightKg ?? entry.value ?? null;
    if (t === 'elastic') {
      const map = { blue: 1, yellow: 2, orange: 3 };
      return map[entry.elasticColor ?? entry.color] ?? 1;
    }
    if (t === 'bodyweight' || t === 'bw') return 1;
    return null;
  }

  const points = entries
    .map(e => toNumeric(e))
    .filter(v => v !== null);

  if (points.length < 2) return null;

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  const pad = 2;
  const w = width - pad * 2;
  const h = height - pad * 2;

  // Coordinate normalizzate
  const coords = points.map((v, i) => {
    const x = pad + (i / (points.length - 1)) * w;
    const y = pad + h - ((v - min) / range) * h;
    return [x, y];
  });

  const linePath = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ');
  const areaPath = `${linePath} L${coords[coords.length - 1][0]},${height - pad} L${coords[0][0]},${height - pad} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: 'block', flexShrink: 0 }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`sg-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Area */}
      <path
        d={areaPath}
        fill={`url(#sg-${color.replace('#', '')})`}
      />
      {/* Linea */}
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Dot finale */}
      <circle
        cx={coords[coords.length - 1][0]}
        cy={coords[coords.length - 1][1]}
        r="2.5"
        fill={color}
      />
    </svg>
  );
}
