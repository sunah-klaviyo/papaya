// docs/src/dates.js
const MS = 86400000;

export function toEpochDay(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / MS);
}

export function fromEpochDay(day) {
  const dt = new Date(day * MS);
  const p = n => String(n).padStart(2, '0');
  return `${dt.getUTCFullYear()}-${p(dt.getUTCMonth() + 1)}-${p(dt.getUTCDate())}`;
}

export function todayEpochDay() {
  return Math.floor(Date.now() / MS);
}
