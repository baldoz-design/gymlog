import { ZONES } from './rpe';

export const SLOTS = ['MON_TUE', 'WED_THU', 'FRI_SAT'];

export const isoOf = d =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const mondayOf = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - (x.getDay() + 6) % 7); return x; };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const fmtNum = n => String(Math.round(n * 10) / 10);

// ago = 0 settimana in corso, 1 settimana scorsa, ...
export function weekWindow(now, ago) {
  const monday = addDays(mondayOf(now), -7 * ago);
  return { start: isoOf(monday), end: isoOf(addDays(monday, 6)), monday };
}

export function buildIndex(sessions, entries, exercises) {
  const byId = Object.fromEntries(sessions.map(s => [s.id, s]));
  return {
    sessions,
    entries: entries.filter(e => byId[e.sessionId]).map(e => ({ ...e, date: byId[e.sessionId].date })),
    names: Object.fromEntries(exercises.map(e => [e.id, e.canonicalName])),
  };
}

const sessionsBetween = (ix, a, b) => ix.sessions.filter(s => s.date >= a && s.date <= b);
const entriesBetween  = (ix, a, b) => ix.entries.filter(e => e.date >= a && e.date <= b);

function lastBefore(ix, exerciseId, date) {
  let best = null;
  for (const e of ix.entries) {
    if (e.exerciseId === exerciseId && e.date < date && (!best || e.date > best.date)) best = e;
  }
  return best;
}

export function slotsDoneInWeek(ix, w) {
  const ss = sessionsBetween(ix, w.start, w.end);
  return SLOTS.map(slot => ss.find(s => s.slot === slot) || null);
}

function weekStreak(ix, now, fromAgo) {
  let n = 0;
  for (let k = fromAgo; k < 80; k++) {
    const w = weekWindow(now, k);
    if (sessionsBetween(ix, w.start, w.end).length >= 2) n++; else break;
  }
  return n;
}

function rpeSummary(entries) {
  const rated = entries.filter(e => e.perceivedEffort);
  const avg = rated.length ? rated.reduce((t, e) => t + e.perceivedEffort, 0) / rated.length : null;
  const dist = ZONES.map(z => rated.filter(e => e.perceivedEffort >= z.range[0] && e.perceivedEffort <= z.range[1]).length);
  return { count: rated.length, avg, dist, rated };
}

// Carico: ultimo valore del periodo contro l'ultimo prima del periodo (o il primo del periodo)
function progressBetween(ix, a, b) {
  const byEx = {};
  for (const e of entriesBetween(ix, a, b)) if (e.valueType === 'weight') (byEx[e.exerciseId] ||= []).push(e);
  const out = [];
  for (const [exerciseId, list] of Object.entries(byEx)) {
    list.sort((x, y) => x.date.localeCompare(y.date));
    const before = lastBefore(ix, exerciseId, a);
    const base = before?.valueType === 'weight' ? before.weightKg : list[0].weightKg;
    const last = list[list.length - 1].weightKg;
    if (last > base) {
      out.push({ exerciseId, name: ix.names[exerciseId] || '?', from: base, to: last, delta: Math.round((last - base) * 10) / 10 });
    }
  }
  return out.sort((x, y) => y.delta - x.delta);
}

// Riferimento di costanza: le sessioni abituali a settimana, non i tre slot
export const WEEK_TARGET = 2;

export const sessionsInWeek = (ix, w) => sessionsBetween(ix, w.start, w.end).length;

export function periodStats(ix, now, fromAgo, nWeeks) {
  const first = weekWindow(now, fromAgo + nWeeks - 1);
  const last  = weekWindow(now, fromAgo);
  const counts = Array.from({ length: nWeeks }, (_, k) => sessionsInWeek(ix, weekWindow(now, fromAgo + k)));
  const sessions = sessionsBetween(ix, first.start, last.end).length;
  return {
    start: first.start,
    end: last.end,
    nWeeks,
    sessions,
    perWeek: sessions / nWeeks,
    weeksOnTarget: counts.filter(c => c >= WEEK_TARGET).length,
    progress: progressBetween(ix, first.start, last.end),
    rpe: rpeSummary(entriesBetween(ix, first.start, last.end)),
  };
}

export function computeWrap(ix, now) {
  const w = weekWindow(now, 1);
  const sessions = sessionsBetween(ix, w.start, w.end).sort((a, b) => a.date.localeCompare(b.date));
  const entries = entriesBetween(ix, w.start, w.end);
  const increases = entries
    .filter(e => e.isIncrease && e.valueType === 'weight')
    .map(e => ({ name: ix.names[e.exerciseId] || '?', from: lastBefore(ix, e.exerciseId, e.date)?.weightKg, to: e.weightKg }));
  const rpe = rpeSummary(entries);
  const top = rpe.count ? Math.max(...rpe.rated.map(e => e.perceivedEffort)) : null;
  const hardest = rpe.rated.filter(e => e.perceivedEffort === top).map(e => ix.names[e.exerciseId] || '?');
  // A corpo libero non si può aggiungere carico: restano fuori dai suggerimenti
  const margin = rpe.rated
    .filter(e => e.perceivedEffort <= 4 && e.valueType !== 'bodyweight')
    .sort((a, b) => a.perceivedEffort - b.perceivedEffort || (b.valueType === 'weight') - (a.valueType === 'weight'))
    .slice(0, 3)
    .map(e => ({ name: ix.names[e.exerciseId] || '?', entry: e, rpe: e.perceivedEffort }));
  const streakWeeks = Array.from({ length: 8 }, (_, k) => {
    const x = weekWindow(now, 8 - k);
    return sessionsBetween(ix, x.start, x.end).length;
  });
  return {
    ...w, sessions, entries, slots: slotsDoneInWeek(ix, w),
    increases, rpe, top, hardest, margin, streak: weekStreak(ix, now, 1), streakWeeks,
  };
}
