import { useEffect, useState } from 'react';
import { getAllSessions } from '../db';
import styles from './CalendarStrip.module.css';

const MONTHS_IT = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
  'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
const DAYS_IT = ['L','M','M','G','V','S','D'];

export default function CalendarStrip({ onDayTap }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [sessionDays, setSessionDays] = useState({}); // { 'YYYY-MM-DD': Session }

  useEffect(() => {
    getAllSessions().then(sessions => {
      const map = {};
      for (const s of sessions) {
        map[s.date] = s;
      }
      setSessionDays(map);
    });
  }, []);

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }

  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }

  // Genera le celle del mese
  const firstDay = new Date(year, month, 1);
  // Lunedì = 0 ... Domenica = 6
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const todayISO = today.toISOString().slice(0, 10);

  function isoFor(day) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  function handleDayTap(day) {
    const iso = isoFor(day);
    const session = sessionDays[iso];
    if (session) onDayTap(session);
  }

  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.navBtn} onClick={prevMonth}>‹</button>
        <span className={styles.monthLabel}>{MONTHS_IT[month]} {year}</span>
        <button
          className={styles.navBtn}
          onClick={nextMonth}
          disabled={isCurrentMonth}
          style={{ opacity: isCurrentMonth ? 0.3 : 1 }}
        >›</button>
      </div>

      <div className={styles.grid}>
        {DAYS_IT.map((d, i) => (
          <div key={i} className={styles.dayName}>{d}</div>
        ))}

        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} />;
          const iso = isoFor(day);
          const hasSession = !!sessionDays[iso];
          const isToday = iso === todayISO;
          const isFuture = iso > todayISO;

          return (
            <button
              key={iso}
              className={`${styles.day}
                ${isToday ? styles.today : ''}
                ${hasSession ? styles.hasSession : ''}
                ${isFuture ? styles.future : ''}
              `}
              onClick={() => handleDayTap(day)}
              disabled={!hasSession}
            >
              <span className={styles.dayNum}>{day}</span>
              {hasSession && <span className={styles.dot} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
