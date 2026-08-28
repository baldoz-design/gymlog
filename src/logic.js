export function getSlotFromDate(date) {
  const day = date.getDay();
  if (day === 1 || day === 2) return 'MON_TUE';
  if (day === 3 || day === 4) return 'WED_THU';
  if (day === 5 || day === 6) return 'FRI_SAT';
  return null; // domenica
}

export function getWeekNumberInCycle(sessionDateISO, cycleStartDateISO) {
  const sessionDate = new Date(sessionDateISO);
  const startDate = new Date(cycleStartDateISO);
  const diffDays = Math.floor((sessionDate - startDate) / (1000 * 60 * 60 * 24));
  const weekNumber = Math.floor(diffDays / 7) + 1;
  return Math.min(Math.max(weekNumber, 1), 5);
}

export function calculateIsIncrease(currentEntry, previousEntry) {
  if (!previousEntry) return false;
  if (currentEntry.valueType !== previousEntry.valueType) return false;

  if (currentEntry.valueType === 'weight') {
    return currentEntry.weightKg > previousEntry.weightKg;
  }

  if (currentEntry.valueType === 'elastic') {
    const order = { blue: 1, yellow: 2, orange: 3 };
    return order[currentEntry.elasticColor] > order[previousEntry.elasticColor];
  }

  return false;
}

export function formatEntryValue(entry) {
  if (!entry) return null;
  if (entry.valueType === 'weight') return `${entry.weightKg} kg`;
  if (entry.valueType === 'elastic') {
    const labels = { blue: 'AZZ', yellow: 'GIA', orange: 'ARA' };
    return labels[entry.elasticColor] || entry.elasticColor;
  }
  if (entry.valueType === 'bodyweight') return 'BW';
  return '—';
}

export function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export function formatDateLabel(isoDate) {
  const d = new Date(isoDate + 'T00:00:00');
  return d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
}

const SLOT_LABELS = {
  MON_TUE: 'LUN/MAR',
  WED_THU: 'MER/GIO',
  FRI_SAT: 'VEN/SAB',
};

export function slotLabel(slot) {
  return SLOT_LABELS[slot] || slot;
}
