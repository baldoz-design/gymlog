import { useState } from 'react';
import { SLOTS, fmtNum } from '../analytics';
import { ZONES, rpeZone, rpeBackground } from '../rpe';
import { slotLabel, formatEntryValue } from '../logic';
import styles from './WeeklyWrap.module.css';

const SLIDE_MS = 6500;
const MONTHS_IT = ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];
const MONTHS_S  = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
const DAYS_S    = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];
const EL_NAME   = { blue: 'elastico azzurro', yellow: 'elastico giallo', orange: 'elastico arancione' };

const dayLabel = iso => { const d = new Date(iso + 'T00:00:00'); return `${DAYS_S[d.getDay()]} ${d.getDate()} ${MONTHS_S[d.getMonth()]}`; };
const valueText = e => e.valueType === 'elastic' ? EL_NAME[e.elasticColor] : formatEntryValue(e);

export default function WeeklyWrap({ wrap: w, weekNum, reps, todaySlot, todayBlocks, onClose, onStart }) {
  const [index,  setIndex]  = useState(0);
  const [paused, setPaused] = useState(false);

  const d1 = new Date(w.start + 'T00:00:00');
  const d2 = new Date(w.end + 'T00:00:00');
  const range = `${d1.getDate()} → ${d2.getDate()} ${MONTHS_IT[d2.getMonth()]}`;
  const done = w.slots.filter(Boolean).length;
  const zone = w.rpe.avg != null ? rpeZone(w.rpe.avg) : null;
  const todayCount = todayBlocks.reduce((t, b) => t + b.exercises.length, 0);

  const slides = [
    { key: 'cover', tone: 'lime', body: (
      <>
        <p className={styles.eyebrow}>WRAP SETTIMANALE</p>
        <p className={styles.range}>{range}</p>
        <div className={styles.tally}>{w.sessions.map(s => <i key={s.id} />)}</div>
        <p className={styles.mega}>{w.sessions.length}</p>
        <p className={styles.megaLbl}>allenamenti</p>
        <p className={styles.foot}>
          {w.entries.length} esercizi completati
          {w.increases.length > 0 && `, ${w.increases.length} con più carico della volta prima`}.
        </p>
      </>
    ) },
    { key: 'slots', tone: 'dark', body: (
      <>
        <p className={styles.eyebrow}>COSTANZA</p>
        <h2 className={styles.h}>{done === 3 ? 'Tutti e tre gli slot, nessuno saltato' : `${done} slot su 3`}</h2>
        <div className={styles.slots}>
          {SLOTS.map((slot, k) => (
            <div key={slot} className={`${styles.slotRow} ${w.slots[k] ? styles.slotOn : ''}`}>
              <span className={styles.slotName}>{slotLabel(slot)}</span>
              <span className={styles.slotDate}>{w.slots[k] ? dayLabel(w.slots[k].date) : 'saltato'}</span>
              <span className={styles.slotCheck}>{w.slots[k] ? '✓' : ''}</span>
            </div>
          ))}
        </div>
        {w.streak >= 2 && (
          <div className={styles.streak}>
            <span className={styles.streakNum}>{w.streak}</span>
            <span className={styles.streakTxt}>settimane di fila con almeno 2 allenamenti</span>
          </div>
        )}
        <div className={styles.weeks}>
          {w.streakWeeks.map((n, k) => <i key={k} className={n >= 2 ? styles.weekOn : ''} />)}
        </div>
      </>
    ) },
    w.increases.length > 0 && { key: 'up', tone: 'orange', body: (
      <>
        <p className={styles.eyebrow}>PROGRESSI</p>
        <h2 className={styles.h}>
          Hai alzato il carico su {w.increases.length === 1 ? 'un esercizio' : `${w.increases.length} esercizi`}
        </h2>
        <div className={styles.list}>
          {w.increases.map((x, k) => (
            <div key={k} className={styles.upRow}>
              <span className={styles.upName}>{x.name}</span>
              <span className={styles.upVals}>{x.from} → {x.to} kg</span>
              <span className={styles.upDelta}>+{fmtNum(x.to - x.from)}</span>
            </div>
          ))}
        </div>
      </>
    ) },
    w.rpe.count > 0 && { key: 'rpe', tone: 'rpe', bg: rpeBackground(Math.round(w.rpe.avg)), body: (
      <>
        <p className={styles.eyebrow}>SFORZO PERCEPITO</p>
        <p className={styles.mega}>{fmtNum(w.rpe.avg)}</p>
        <span className={styles.zonePill} style={{ color: zone.color, borderColor: zone.color }}>{zone.label}</span>
        <p className={styles.megaLbl2}>di media su {w.rpe.count} esercizi</p>
        <div className={styles.zoneBar}>
          {ZONES.map((z, zi) => w.rpe.dist[zi] > 0 && <span key={z.label} style={{ flex: w.rpe.dist[zi], background: z.color }} />)}
        </div>
        <div className={styles.zoneLegend}>
          {ZONES.map((z, zi) => <span key={z.label}><i style={{ background: z.color }} />{z.label} {w.rpe.dist[zi]}</span>)}
        </div>
        <p className={styles.foot}>Il più duro: {w.hardest.slice(0, 2).join(' e ')}, sforzo {w.top}.</p>
      </>
    ) },
    w.margin.length > 0 && { key: 'push', tone: 'blue', body: (
      <>
        <p className={styles.eyebrow}>DOVE PUOI SPINGERE</p>
        <h2 className={styles.h}>Qui ti è sembrato facile</h2>
        <div className={styles.list}>
          {w.margin.map((x, k) => (
            <div key={k} className={styles.pushRow}>
              <span className={styles.pushMain}>
                <span className={styles.upName}>{x.name}</span>
                <span className={styles.upVals}>{valueText(x.entry)}</span>
              </span>
              <span className={styles.pushRpe}>{x.rpe}</span>
            </div>
          ))}
        </div>
        <p className={styles.foot}>Sforzo 4 o meno. La prossima volta prova ad aumentare il carico.</p>
      </>
    ) },
    { key: 'next', tone: 'dark', body: (
      <>
        <p className={styles.eyebrow}>PROSSIMA SETTIMANA</p>
        <h2 className={styles.h}>Settimana {weekNum} di 5</h2>
        <p className={`${styles.mega} ${styles.megaAcc}`}>×{reps}</p>
        <p className={styles.megaLbl}>ripetizioni</p>
        {todaySlot && (
          <p className={styles.foot}>Oggi tocca a {slotLabel(todaySlot)}: {todayCount} esercizi in {todayBlocks.length} blocchi.</p>
        )}
        <button className={styles.cta} onClick={e => { e.stopPropagation(); onStart(); }}>
          INIZIA L'ALLENAMENTO →
        </button>
      </>
    ) },
  ].filter(Boolean);

  const last  = slides.length - 1;
  const slide = slides[Math.min(index, last)];
  const next  = () => setIndex(i => Math.min(last, i + 1));
  const prev  = () => setIndex(i => Math.max(0, i - 1));

  function handleTap(e) {
    const r = e.currentTarget.getBoundingClientRect();
    if (e.clientX - r.left < r.width / 3) prev(); else next();
  }

  return (
    <div
      className={`${styles.overlay} ${styles['t_' + slide.tone]}`}
      style={slide.bg ? { background: slide.bg } : undefined}
      role="dialog"
      aria-modal="true"
      aria-label="Wrap settimanale"
      onClick={handleTap}
      onPointerDown={() => setPaused(true)}
      onPointerUp={() => setPaused(false)}
      onPointerCancel={() => setPaused(false)}
      onPointerLeave={() => setPaused(false)}
    >
      <div className={styles.inner}>
        <div className={styles.top}>
          <div className={styles.segs}>
            {slides.map((x, k) => (
              <span key={x.key} className={styles.seg}>
                <span
                  className={`${styles.fill} ${k < index ? styles.fillDone : ''} ${k === index ? styles.fillNow : ''}`}
                  style={k === index ? { animationDuration: `${SLIDE_MS}ms`, animationPlayState: paused ? 'paused' : 'running' } : undefined}
                  onAnimationEnd={k === index && index < last ? next : undefined}
                />
              </span>
            ))}
          </div>
          <div className={styles.bar}>
            <span className={styles.brand}>GYMLOG · WRAP</span>
            <button className={styles.close} onClick={e => { e.stopPropagation(); onClose(); }} aria-label="Chiudi">×</button>
          </div>
        </div>
        <div key={slide.key} className={styles.slide}>{slide.body}</div>
        <p className={styles.hint}>{index < last ? 'Tocca per continuare' : ''}</p>
      </div>
    </div>
  );
}
