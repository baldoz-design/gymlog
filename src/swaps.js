// cycle.swaps   = [{ slot, from, to, since }]  cambio nel programma da una data in poi
// session.swaps = { [from]: to }               cambio valido solo per quella sessione
export function resolveBlocks(cycle, slot, date, session) {
  const program = {};
  for (const sw of cycle?.swaps || []) if (sw.slot === slot && sw.since <= date) program[sw.from] = sw;
  const today = session?.swaps || {};
  return (cycle?.slots?.[slot] || []).map(block => ({
    ...block,
    exercises: block.exercises.map(be => {
      let id = be.exerciseId;
      let swap = null;
      for (let n = 0; n < 10 && program[id]; n++) {
        swap = program[id].since === date ? { from: id, scope: 'program' } : null;
        id = program[id].to;
      }
      if (today[id]) { swap = { from: id, scope: 'today' }; id = today[id]; }
      return { ...be, exerciseId: id, swap };
    }),
  }));
}
