import { useEffect, useRef, useState } from 'react';
import { getAllSessions } from '../db';
import { slotLabel } from '../logic';
import styles from './Calendar.module.css';

const MONTHS_IT = [
  'Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
  'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre',
];
const MONTHS_S = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
const DAYS_S   = ['dom','lun','mar','mer','gio','ven','sab'];
const GRID_HDR = ['L','M','M','G','V','S','D'];

function sessionDateLabel(iso) {
  const d = new Date(iso + 'T00:00:00');
  return `${DAYS_S[d.getDay()].charAt(0).toUpperCase() + DAYS_S[d.getDay()].slice(1)} ${d.getDate()} ${MONTHS_S[d.getMonth()].charAt(0).toUpperCase() + MONTHS_S[d.getMonth()].slice(1)}`;
}

export default function Calendar({ onBack, onNavigate }) {
  const now     = new Date();
  const todayISO = now.toISOString().slice(0, 10);

  const [year,        setYear]        = useState(now.getFullYear());
  const [month,       setMonth]       = useState(now.getMonth());
  const [sessionMap,  setSessionMap]  = useState({});
  const [lastSessions, setLastSessions] = useState([]);
  const [monthCount,  setMonthCount]  = useState(0);

  useEffect(() => {
    getAllSessions().then(sessions => {
      const map = {};
      for (const s of sessions) {
        if (!map[s.date]) map[s.date] = [];
        map[s.date].push(s);
      }
      setSessionMap(map);
      // Always show last 3 global sessions
      const sorted = [...sessions].sort((a, b) => b.date.localeCompare(a.date));
      setLastSessions(sorted.slice(0, 3));
    });
  }, []);

  useEffect(() => {
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    let count = 0;
    for (const [date] of Object.entries(sessionMap)) {
      if (date.startsWith(prefix)) count++;
    }
    setMonthCount(count);
  }, [sessionMap, year, month]);

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }

  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }

  const firstOffset  = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth  = new Date(year, month + 1, 0).getDate();
  const cells = [
    ...Array(firstOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function isoFor(day) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  function handleSessionTap(s) {
    onNavigate('session', { date: s.date, slot: s.slot });
  }

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

  return (
    <div className={styles.screen}>

      {/* ── Header ── */}
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={onBack}>←</button>
      </div>

      {/* ── Month title ── */}
      <div className={styles.monthRow}>
        <div className={styles.monthTitleWrap}>
          <span className={styles.monthName}>{MONTHS_IT[month]}</span>
          <span className={styles.monthYear}>{year}</span>
        </div>
        <div className={styles.navBtns}>
          <button className={styles.navBtn} onClick={prevMonth}>‹</button>
          <button className={styles.navBtn} onClick={nextMonth}>›</button>
        </div>
      </div>

      {/* ── Subtitle ── */}
      <p className={styles.monthSub}>
        {monthCount > 0
          ? `${monthCount} session${monthCount === 1 ? 'e' : 'i'} questo mese`
          : 'Nessuna sessione questo mese'}
      </p>

      {/* ── Grid ── */}
      <div className={styles.calWrap}>
        <div className={styles.gridHeaders}>
          {GRID_HDR.map((h, i) => <div key={i} className={styles.gridHdr}>{h}</div>)}
        </div>
        <div className={styles.grid}>
          {cells.map((day, i) => {
            if (!day) return <div key={`e-${i}`} className={styles.empty} />;
            const iso       = isoFor(day);
            const isToday   = iso === todayISO;
            const isFuture  = iso > todayISO;
            const hasSess   = !!(sessionMap[iso]?.length);

            return (
              <button
                key={iso}
                className={[
                  styles.day,
                  isToday  ? styles.dayToday   : '',
                  hasSess && !isToday ? styles.dayHas : '',
                  isFuture ? styles.dayFuture  : '',
                ].join(' ')}
                onClick={() => hasSess && !isToday ? handleSessionTap(sessionMap[iso][0]) : null}
              >
                <span className={styles.dayNum}>{day}</span>
                {hasSess && !isToday && <span className={styles.dot} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Session list — last 3 global ── */}
      {lastSessions.length > 0 && (
        <div className={styles.listWrap}>
          <p className={styles.listLabel}>ULTIME SESSIONI</p>
          {lastSessions.map(s => (
            <button key={s.id} className={styles.sessRow} onClick={() => handleSessionTap(s)}>
              <div className={styles.sessInfo}>
                <span className={styles.sessDate}>{sessionDateLabel(s.date)}</span>
                <span className={styles.sessMeta}>
                  {slotLabel(s.slot)} · SETT.{s.weekNumber}
                </span>
              </div>
              <span className={styles.sessArrow}>→</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
