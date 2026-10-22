import { useEffect, useRef } from 'react';
import styles from './Confetti.module.css';

const COLORS = ['#D9F24B', '#5BA3FF', '#E0762C', '#E05252', '#F5F2EA'];
const FADE_FROM = 4.4;
const END = 5.6;

export default function Confetti() {
  const ref = useRef(null);

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const c = ref.current;
    const ctx = c.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const W = c.clientWidth, H = c.clientHeight;
    c.width = W * dpr; c.height = H * dpr; ctx.scale(dpr, dpr);

    // Cascata: partenze scaglionate sopra il bordo alto, caduta lenta con oscillazione
    const ps = Array.from({ length: 170 }, (_, i) => ({
      x: Math.random() * W, y: -12 - Math.random() * H * 0.6,
      vy: 2.4 + Math.random() * 2, vx: (Math.random() - 0.5) * 0.5,
      sway: Math.random() * 6.28, swaySpd: 0.03 + Math.random() * 0.04, swayAmp: 0.6 + Math.random() * 1.3,
      w: 5 + Math.random() * 5, h: 9 + Math.random() * 8, r: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.2,
      c: COLORS[i % COLORS.length],
    }));

    let raf;
    const t0 = performance.now();
    const tick = t => {
      const el = (t - t0) / 1000;
      ctx.clearRect(0, 0, W, H);
      ctx.globalAlpha = el < FADE_FROM ? 1 : Math.max(0, 1 - (el - FADE_FROM) / (END - FADE_FROM));
      for (const p of ps) {
        p.sway += p.swaySpd;
        p.vy = Math.min(p.vy + 0.015, 4.6);
        p.x += p.vx + Math.sin(p.sway) * p.swayAmp;
        p.y += p.vy;
        p.r += p.vr;
        if (p.y < -20 || p.y > H + 20) continue;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.sway * 1.4)) + 1);
        ctx.restore();
      }
      if (el < END) raf = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, W, H);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={ref} className={styles.canvas} aria-hidden="true" />;
}
