// docs/src/parse.js
export function parsePlan(text) {
  text = text.replace(/\r\n/g, '\n'); // normalise Windows CRLF (e.g. from GitHub web editor)
  const config = { viewStart: null };
  let body = text;

  const fm = text.match(/^---\n([\s\S]*?)\n---/);
  if (fm) {
    for (const line of fm[1].split('\n')) {
      const m = line.match(/^\s*([\w-]+)\s*:\s*(.*)$/);
      if (m && m[1] === 'view-start') config.viewStart = m[2].trim() || null;
    }
    body = text.slice(fm[0].length);
  }

  const milestones = [];
  const pto = []; // [{ person, date }]
  const sections = body.split(/^##\s+/m).slice(1);
  for (const sec of sections) {
    const lines = sec.split('\n');
    const hm = lines[0].match(/^([\w-]+)\s*:\s*(.+)$/);
    if (!hm) throw new Error(`Invalid heading: "## ${lines[0]}". Expected "## <id>: <Title>".`);
    const id = hm[1].trim();
    const name = hm[2].trim();

    // Special section: "## pto: ..." lists people's days off, one bullet per person:
    //   - Meredith: 2026-05-08, 2026-05-09
    if (id.toLowerCase() === 'pto') {
      for (const line of lines.slice(1)) {
        const f = line.match(/^\s*-\s*([\w-]+)\s*:\s*(.*)$/);
        if (!f) continue;
        const person = f[1].trim();
        for (const date of f[2].split(',').map(s => s.trim()).filter(Boolean)) {
          pto.push({ person, date });
        }
      }
      continue;
    }

    const fields = {};
    for (const line of lines.slice(1)) {
      const f = line.match(/^\s*-\s*([\w-]+)\s*:\s*(.*)$/);
      if (f) fields[f[1].trim()] = f[2].trim();
    }
    const deps = (fields['depends-on'] || '').split(',').map(s => s.trim()).filter(Boolean);
    const days = Number(fields.days);
    milestones.push({
      id, name,
      owner: fields.owner || '',
      start: fields.start || '',
      end: fields.end || '',
      days: Number.isFinite(days) ? days : null, // optional business-day estimate
      deps,
    });
  }
  validate(milestones, pto);
  return { config, milestones, pto };
}

function validate(milestones, pto = []) {
  const ids = new Set();
  for (const m of milestones) {
    if (ids.has(m.id)) throw new Error(`Duplicate milestone id: "${m.id}".`);
    ids.add(m.id);
  }
  const isISO = s => /^\d{4}-\d{2}-\d{2}$/.test(s);
  for (const m of milestones) {
    if (!isISO(m.start)) throw new Error(`Milestone "${m.id}" has invalid start date: "${m.start}".`);
    if (!isISO(m.end)) throw new Error(`Milestone "${m.id}" has invalid end date: "${m.end}".`);
    if (m.end < m.start) throw new Error(`Milestone "${m.id}" ends before it starts (${m.start} → ${m.end}).`);
    for (const dep of m.deps) {
      if (!ids.has(dep)) throw new Error(`Milestone "${m.id}" depends on unknown id "${dep}".`);
    }
  }
  for (const p of pto) {
    if (!isISO(p.date)) throw new Error(`PTO entry for "${p.person}" has invalid date: "${p.date}".`);
  }
  detectCycle(milestones);
}

function detectCycle(milestones) {
  const byId = Object.fromEntries(milestones.map(m => [m.id, m]));
  const state = {}; // undefined = unseen, 0 = visiting, 1 = done
  const dfs = (id, stack) => {
    if (state[id] === 1) return;
    if (state[id] === 0) throw new Error(`Dependency cycle detected: ${[...stack, id].join(' -> ')}.`);
    state[id] = 0;
    for (const dep of byId[id].deps) dfs(dep, [...stack, id]);
    state[id] = 1;
  };
  for (const m of milestones) dfs(m.id, []);
}
