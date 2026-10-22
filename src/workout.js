import { resolveBlocks } from './swaps';
import { fmtNum } from './analytics';

const EL_ORDER = { blue: 1, yellow: 2, orange: 3 };
const EL_IT    = { blue: 'azzurro', yellow: 'giallo', orange: 'arancione' };

// Le ripetizioni non si registrano: vengono dalla settimana del programma
export function compareEntry(cur, prev, curReps, prevReps) {
  if (!prev) return { kind: 'new' };
  if (cur.valueType !== prev.valueType) return { kind: 'same' };
  if (cur.valueType === 'weight') {
    if (cur.weightKg > prev.weightKg) return { kind: 'load', badge: `+${fmtNum(cur.weightKg - prev.weightKg)} kg`, detail: `${prev.weightKg} → ${cur.weightKg} kg` };
    if (cur.weightKg < prev.weightKg) return { kind: 'down' };
  }
  if (cur.valueType === 'elastic') {
    if (EL_ORDER[cur.elasticColor] > EL_ORDER[prev.elasticColor]) return { kind: 'load', badge: 'elastico ↑', detail: `${EL_IT[prev.elasticColor]} → ${EL_IT[cur.elasticColor]}` };
    if (EL_ORDER[cur.elasticColor] < EL_ORDER[prev.elasticColor]) return { kind: 'down' };
  }
  if (curReps && prevReps && curReps > prevReps) {
    return { kind: 'reps', badge: `+${curReps - prevReps} rip.`, detail: `stesso carico, ×${curReps} invece di ×${prevReps}` };
  }
  if (cur.perceivedEffort && prev.perceivedEffort && cur.perceivedEffort < prev.perceivedEffort) {
    return { kind: 'easier', badge: `sforzo −${prev.perceivedEffort - cur.perceivedEffort}`, detail: `stesso carico, sforzo ${prev.perceivedEffort} → ${cur.perceivedEffort}` };
  }
  return { kind: 'same' };
}

const avgRpe = list => {
  const rated = list.filter(e => e.perceivedEffort);
  return rated.length ? rated.reduce((t, e) => t + e.perceivedEffort, 0) / rated.length : null;
};
// Volume indicativo: carico × ripetizioni della settimana, le serie non vengono contate
const volumeOf = (list, reps) => reps ? list.filter(e => e.valueType === 'weight').reduce((t, e) => t + e.weightKg * reps, 0) : 0;

export function workoutSummary({ session, sessionEntries, sessions, entries, cycles, exercises }) {
  const cycleById = Object.fromEntries(cycles.map(c => [c.id, c]));
  const sessById  = Object.fromEntries(sessions.map(s => [s.id, s]));
  const names     = Object.fromEntries(exercises.map(e => [e.id, e.canonicalName]));
  const repsOf    = s => s ? (cycleById[s.cycleId]?.weeks?.[(s.weekNumber || 1) - 1]?.reps ?? null) : null;
  const dated     = entries.filter(e => sessById[e.sessionId] && e.sessionId !== session.id)
    .map(e => ({ ...e, date: sessById[e.sessionId].date }));
  const lastBefore = (exerciseId, date) => {
    let best = null;
    for (const e of dated) if (e.exerciseId === exerciseId && e.date < date && (!best || e.date > best.date)) best = e;
    return best;
  };

  const order = resolveBlocks(cycleById[session.cycleId], session.slot, session.date, session)
    .flatMap(b => b.exercises.map(be => be.exerciseId));
  const own  = [...sessionEntries].sort((a, b) => order.indexOf(a.exerciseId) - order.indexOf(b.exerciseId));
  const reps = repsOf(session);

  const items = own.map(e => {
    const prev = lastBefore(e.exerciseId, session.date);
    return { id: e.id, name: names[e.exerciseId] || '?', ...compareEntry(e, prev, reps, prev ? repsOf(sessById[prev.sessionId]) : null) };
  });

  const prevSess = sessions
    .filter(s => s.slot === session.slot && s.date < session.date && dated.some(e => e.sessionId === s.id))
    .sort((a, b) => b.date.localeCompare(a.date))[0] || null;
  const prevEntries = prevSess ? dated.filter(e => e.sessionId === prevSess.id) : [];
  // Il volume si confronta solo sugli esercizi fatti in entrambe le sessioni
  const prevIds = new Set(prevEntries.map(e => e.exerciseId));
  const ownIds  = new Set(own.map(e => e.exerciseId));

  return {
    done: own.length,
    total: order.length,
    reps,
    prevSess,
    improvements: items.filter(x => x.kind === 'load' || x.kind === 'reps' || x.kind === 'easier'),
    same:   items.filter(x => x.kind === 'same').length,
    down:   items.filter(x => x.kind === 'down').length,
    firsts: items.filter(x => x.kind === 'new').length,
    rpe: avgRpe(own),
    prevRpe: avgRpe(prevEntries),
    volume: volumeOf(own, reps),
    volumeShared: volumeOf(own.filter(e => prevIds.has(e.exerciseId)), reps),
    prevVolumeShared: prevSess ? volumeOf(prevEntries.filter(e => ownIds.has(e.exerciseId)), repsOf(prevSess)) : 0,
  };
}
