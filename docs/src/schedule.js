// docs/src/schedule.js
import { toEpochDay } from './dates.js';

// Returns each milestone extended with effective startDay/endDay (epoch-day integers).
// Declared dates are the baseline; dependencies push dependents right, never left.
// Assumes a valid DAG (parse.js rejects cycles).
export function schedule(milestones) {
  const byId = Object.fromEntries(milestones.map(m => [m.id, m]));
  const memo = {};

  const compute = id => {
    if (memo[id]) return memo[id];
    const m = byId[id];
    const declStart = toEpochDay(m.start);
    const duration = toEpochDay(m.end) - declStart;
    let startDay = declStart;
    for (const dep of m.deps) startDay = Math.max(startDay, compute(dep).endDay);
    return (memo[id] = { ...m, startDay, endDay: startDay + duration });
  };

  return milestones.map(m => compute(m.id));
}
