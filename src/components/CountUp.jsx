import { useEffect, useState } from 'react';

const REDUCED = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export default function CountUp({ value, decimals = 0, ms = 800 }) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (REDUCED || value == null) return;
    let raf, t0;
    const step = t => {
      t0 ??= t;
      const k = Math.min(1, (t - t0) / ms);
      setShown(value * (1 - Math.pow(1 - k, 3)));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    // requestAnimationFrame si ferma a pagina nascosta: il valore finale arriva comunque
    const done = setTimeout(() => { cancelAnimationFrame(raf); setShown(value); }, ms + 150);
    return () => { cancelAnimationFrame(raf); clearTimeout(done); };
  }, [value, ms]);

  if (value == null) return '—';
  const v = REDUCED ? value : shown;
  return decimals ? (Math.round(v * 10) / 10).toFixed(decimals) : String(Math.round(v));
}
