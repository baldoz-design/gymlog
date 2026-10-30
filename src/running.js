// Running del mercoledì: l'allenamento cambia ogni volta, si registra solo la presenza.
//   session.type            = 'running'; slot, cycleId e weekNumber restano vuoti
//   session.perceivedEffort = sforzo complessivo, facoltativo quando si recupera una sessione passata

const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const isRunning = s => s?.type === 'running';

// Dal più vecchio
export const runningSessions = sessions =>
  sessions.filter(isRunning).sort((a, b) => a.date.localeCompare(b.date));

export const runningBefore = (sessions, date) => runningSessions(sessions).filter(s => s.date < date);

// Settimane consecutive con almeno un running, all'indietro dalla settimana di date
export function runWeekStreak(sessions, date) {
  const runs = runningSessions(sessions);
  const monday = new Date(date + 'T00:00:00');
  monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7);
  let n = 0;
  for (; n < 80; n++) {
    const a = iso(monday);
    const end = new Date(monday);
    end.setDate(end.getDate() + 6);
    const b = iso(end);
    if (!runs.some(s => s.date >= a && s.date <= b)) break;
    monday.setDate(monday.getDate() - 7);
  }
  return n;
}
