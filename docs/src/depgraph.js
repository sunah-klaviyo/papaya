// docs/src/depgraph.js
import { computeLayers } from './layout.js';

const NS = 'http://www.w3.org/2000/svg';
const NODE_W = 172, NODE_H = 52, COL_W = 218, ROW_H = 84, PAD_X = 28, PAD_TOP = 24;

export function renderDepGraph(container, milestones) {
  container.innerHTML = '';
  const layer = computeLayers(milestones);

  const cols = {};
  milestones.forEach(m => { (cols[layer[m.id]] ||= []).push(m.id); });
  const numLayers = Math.max(...Object.keys(cols).map(Number)) + 1;
  const maxPer = Math.max(...Object.values(cols).map(a => a.length));

  const DAG_W = PAD_X * 2 + (numLayers - 1) * COL_W + NODE_W;
  const DAG_H = PAD_TOP * 2 + maxPer * ROW_H;
  const midY = DAG_H / 2;

  const pos = {};
  for (let L = 0; L < numLayers; L++) {
    const ids = cols[L] || [];
    ids.forEach((id, k) => {
      const cy = midY + (k - (ids.length - 1) / 2) * ROW_H;
      pos[id] = { left: PAD_X + L * COL_W, top: cy - NODE_H / 2, cy };
    });
  }

  container.style.width = DAG_W + 'px';
  container.style.height = DAG_H + 'px';

  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('width', DAG_W);
  svg.setAttribute('height', DAG_H);
  svg.style.cssText = 'position:absolute;left:0;top:0;z-index:1';
  svg.innerHTML = '<defs><marker id="dah" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto"><path d="M0,0 L6.5,3 L0,6 Z" fill="#64748b"/></marker></defs>';
  container.appendChild(svg);

  const byId = Object.fromEntries(milestones.map(m => [m.id, m]));
  for (const m of milestones) {
    for (const pid of m.deps) {
      const a = pos[pid], b = pos[m.id];
      const x1 = a.left + NODE_W, y1 = a.cy, x2 = b.left, y2 = b.cy, dx = (x2 - x1) * 0.45;
      const path = document.createElementNS(NS, 'path');
      path.setAttribute('d', `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', '#64748b');
      path.setAttribute('stroke-width', '1.8');
      path.setAttribute('marker-end', 'url(#dah)');
      svg.appendChild(path);
    }
  }

  for (const m of milestones) {
    const p = pos[m.id];
    container.insertAdjacentHTML('beforeend',
      `<div class="node" style="left:${p.left}px;top:${p.top}px;width:${NODE_W}px;min-height:${NODE_H}px">
         <div class="nm">${m.name}</div><div class="ow">${m.owner}</div></div>`);
  }
}
