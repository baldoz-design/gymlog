import { useEffect, useState } from 'react';
import { getAllSessions } from '../db';
import styles from './CalendarPicker.module.css';

const MONTHS_IT = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
  'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
const DAYS_IT = ['L','M','M','G','V','S','D'];

export default function CalendarPicker({ selectedDate, onSelect, onClose }) {
  const todayISO = new Date().toISOString().slice(0, 10);
  const [year, setYear] = useState(parseInt(selectedDate.slice(0, 4)));
  const [month, setMonth] = useState(parseInt(selectedDate.slice(5, 7)) - 1);
  const [sessionDays, setSessionDays] = useState({});

  useEffect(() => {
    getAllSessions().then(sessions => {
      const map = {};
      for (const s of sessions) map[s.date] = s;
      setSessionDays(map);
    });
  }, []);

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }

  function nextMonth() {
    const now = new Date();
    const isAtCurrentMonth = year === now.getFullYear() && month === now.getMonth();
    if (isAtCurrentMonth) return;
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }

  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  function isoFor(day) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  const now = new Date();
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.sheet} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <button className={styles.navBtn} onClick={prevMonth}>‹</button>
          <span className={styles.monthLabel}>{MONTHS_IT[month]} {year}</span>
          <button
            className={styles.navBtn}
            onClick={nextMonth}
            style={{ opacity: isCurrentMonth ? 0.25 : 1 }}
          >›</button>
        </div>

        <div className={styles.grid}>
          {DAYS_IT.map((d, i) => (
            <div key={i} className={styles.dayName}>{d}</div>
          ))}

          {cells.map((day, i) => {
            if (!day) return <div key={`e-${i}`} />;
            const iso = isoFor(day);
            const isSelected = iso === selectedDate;
            const isToday = iso === todayISO;
            const hasSession = !!sessionDays[iso];
            const isFuture = iso > todayISO;

            return (
              <button
                key={iso}
                className={`${styles.day}
                  ${isSelected ? styles.selected : ''}
                  ${isToday && !isSelected ? styles.today : ''}
                  ${isFuture ? styles.future : ''}
                `}
                onClick={() => { onSelect(iso); onClose(); }}
              >
                <span className={styles.dayNum}>{day}</span>
                {hasSession && !isSelected && <span className={styles.dot} />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
