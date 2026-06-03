// docs/src/schedule.js
import { toEpochDay } from './dates.js';

const MS = 86400000;
const isWeekday = day => { const w = new Date(day * MS).getUTCDay(); return w >= 1 && w <= 5; };
// weekdays in [a, b] inclusive
const workSpanInclusive = (a, b) => { let n = 0; for (let d = a; d <= b; d++) if (isWeekday(d)) n++; return n; };

// Returns each milestone extended with effective startDay/endDay (epoch-day integers).
//
// Works in WORKING days: a task needs `requiredWork` working days of effort
// (its `days` estimate, or the working-day span of its declared dates). Weekends
// and the owner's PTO are skipped, so a PTO day inside a task's window pushes its
// end out. Dependencies push dependents right (a dependent starts no earlier than
// its prerequisites end), never left. Assumes a valid DAG (parse.js rejects cycles).
export function schedule(milestones, pto = []) {
  const byId = Object.fromEntries(milestones.map(m => [m.id, m]));

  const ptoByPerson = {};
  for (const { person, date } of pto) (ptoByPerson[person] ||= new Set()).add(toEpochDay(date));
  const workable = (day, owner) => isWeekday(day) && !(ptoByPerson[owner] && ptoByPerson[owner].has(day));
  const nextWorkable = (day, owner) => { let d = day; while (!workable(d, owner)) d++; return d; };
  // date of the n-th workable day, counting `start` (snapped to workable) as #1
  const addWorkDays = (start, n, owner) => {
    let d = nextWorkable(start, owner);
    for (let c = 1; c < n; c++) d = nextWorkable(d + 1, owner);
    return d;
  };

  const memo = {};
  const compute = id => {
    if (id in memo) return memo[id];
    const m = byId[id];
    const declStart = toEpochDay(m.start);
    const requiredWork = Math.max(m.days != null ? m.days : workSpanInclusive(declStart, toEpochDay(m.end)), 1);
    let earliest = declStart;
    for (const dep of m.deps) earliest = Math.max(earliest, compute(dep).endDay);
    const startDay = nextWorkable(earliest, m.owner);
    const endDay = addWorkDays(startDay, requiredWork, m.owner);
    return (memo[id] = { ...m, startDay, endDay });
  };

  return milestones.map(m => compute(m.id));
}
