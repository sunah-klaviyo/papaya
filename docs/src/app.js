// docs/src/app.js
import { parsePlan } from './parse.js';
import { schedule } from './schedule.js';
import { renderTimeline } from './timeline.js';
import { renderDepGraph } from './depgraph.js';

async function main() {
  try {
    const res = await fetch('plan.md');
    if (!res.ok) throw new Error(`Could not load plan.md (HTTP ${res.status}).`);
    const text = await res.text();
    const { config, milestones, pto } = parsePlan(text);
    const scheduled = schedule(milestones);
    renderTimeline(document.getElementById('chart'), scheduled, config, pto);
    renderDepGraph(document.getElementById('dag'), milestones);
  } catch (e) {
    const el = document.getElementById('error');
    if (el) { el.textContent = e.message; el.style.display = 'block'; }
    console.error(e);
  }
}

main();
