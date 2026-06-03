// docs/src/layout.js

// Greedy interval packing: each milestone gets the first row whose last item already ended.
// Input items must have integer startDay/endDay. Returns { row: {id->index}, rowCount }.
export function packSubRows(items) {
  const sorted = [...items].sort((a, b) => a.startDay - b.startDay);
  const rowEnd = [];
  const row = {};
  for (const m of sorted) {
    let r = rowEnd.findIndex(end => end <= m.startDay);
    if (r === -1) { r = rowEnd.length; rowEnd.push(0); }
    rowEnd[r] = m.endDay;
    row[m.id] = r;
  }
  return { row, rowCount: rowEnd.length };
}

// Longest-path layering over the dependency DAG: layer 0 = no deps, else max(dep layer)+1.
export function computeLayers(milestones) {
  const byId = Object.fromEntries(milestones.map(m => [m.id, m]));
  const layer = {};
  const visit = id => {
    if (layer[id] != null) return layer[id];
    const m = byId[id];
    if (!m.deps.length) return (layer[id] = 0);
    let L = 0;
    for (const d of m.deps) L = Math.max(L, visit(d) + 1);
    return (layer[id] = L);
  };
  milestones.forEach(m => visit(m.id));
  return layer;
}
