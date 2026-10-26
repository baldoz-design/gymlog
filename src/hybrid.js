// Lezioni Hybrid: circuito a stazioni, si registrano le stazioni fatte e lo sforzo complessivo.
//   session.type            = 'hybrid' (assente = Strength); slot, cycleId e weekNumber restano vuoti
//   session.circuitId       = id del circuito
//   session.stations        = [{ n, choice }]  una voce per stazione fatta, in ordine
//   session.perceivedEffort = sforzo complessivo della lezione

// Il circuito della lavagna, per ora fisso
export const HYBRID_CIRCUIT = {
  id: 'h1',
  name: 'Hybrid',
  work: 120,   // secondi per ciascuno dei due esercizi
  rest: 60,    // pausa tra i due esercizi
  change: 90,  // cambio stazione
  stations: [
    { n: 1, cardio: 'Rower tecnica',    options: ['Wall ball', 'Push press', 'Sedia'] },
    { n: 2, cardio: 'SkiErg tecnica',   options: ['Salti box', 'Step up'] },
    { n: 3, cardio: 'Rower solo gambe', options: ['Plank'] },
    { n: 4, cardio: 'Bike easy',        options: ['Push up'] },
  ],
};

export const getCircuit = () => HYBRID_CIRCUIT;
export const isHybrid = s => s?.type === 'hybrid';

export const stationSec = c => c.work * 2 + c.rest + c.change;
// L'ultima stazione non ha il cambio
export const hybridMinutes = (c, n) => n ? Math.round((n * stationSec(c) - c.change) / 60) : 0;
export const fmtSec = s => s % 60 ? `${Math.floor(s / 60)}'${s % 60}"` : `${s / 60}'`;
export const timingLabel = c => `${fmtSec(c.work)} · ${fmtSec(c.rest)} · ${fmtSec(c.work)} · cambio ${fmtSec(c.change)}`;

// 7 stazioni su un circuito da 4: "1 giro e 3 stazioni"
export function lapsText(n, size = HYBRID_CIRCUIT.stations.length) {
  const g = Math.floor(n / size), r = n % size;
  const st = k => `${k} ${k === 1 ? 'stazione' : 'stazioni'}`;
  if (!g) return `${st(r)} del primo giro`;
  const gs = g === 1 ? '1 giro' : `${g} giri`;
  return r ? `${gs} e ${st(r)}` : `${gs} complet${g === 1 ? 'o' : 'i'}`;
}

// Lezioni Hybrid con almeno una stazione, prima di una data, dalla più vecchia
export const hybridBefore = (sessions, date) =>
  sessions.filter(s => isHybrid(s) && s.date < date && s.stations?.length).sort((a, b) => a.date.localeCompare(b.date));

// Alternativa scelta l'ultima volta per ogni stazione
export function lastChoices(sessions, date) {
  const out = {};
  for (const s of hybridBefore(sessions, date)) for (const st of s.stations) out[st.n] = st.choice;
  return out;
}

// Tipo proposto in home: quello di oggi se già registrato, altrimenti quello dello stesso giorno della settimana scorsa
export function suggestedType(sessions, todayIso) {
  const d = new Date(todayIso + 'T00:00:00');
  d.setDate(d.getDate() - 7);
  const weekAgo = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const s = sessions.find(x => x.date === todayIso) || sessions.find(x => x.date === weekAgo);
  return isHybrid(s) ? 'hybrid' : 'strength';
}
