export const ZONES = [
  { range: [1, 3],  label: 'Leggero',  color: '#5BA3FF' },
  { range: [4, 6],  label: 'Moderato', color: '#D9F24B' },
  { range: [7, 8],  label: 'Intenso',  color: '#E0762C' },
  { range: [9, 10], label: 'Massimo',  color: '#E05252' },
];

export const rpeZoneIndex = v => ZONES.findIndex(z => v >= z.range[0] && v <= z.range[1]);
export const rpeZone = v => ZONES[rpeZoneIndex(Math.round(v))];

export function rpeBackground(value) {
  if (!value) return 'linear-gradient(180deg,#1C1A17 0%,#121110 100%)';
  if (value <= 3) return 'linear-gradient(180deg,#0D1F38 0%,#121110 75%)';
  if (value <= 6) return 'linear-gradient(180deg,#0C1B48 0%,#121110 75%)';
  if (value <= 8) return 'linear-gradient(180deg,#1E0A48 0%,#121110 75%)';
  return 'linear-gradient(180deg,#48080E 0%,#121110 75%)';
}
