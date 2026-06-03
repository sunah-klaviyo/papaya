// docs/src/timeline.js
import { toEpochDay, fromEpochDay, todayEpochDay } from './dates.js';
import { packSubRows } from './layout.js';

const MS = 86400000;
const OWNERS = ['Sunah', 'Meredith'];
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const ORIGIN_X = 210, MONTH_H = 34, WEEK_H = 30, HEAD_H = MONTH_H + WEEK_H;
const SUBROW_H = 70, BAR_H = 32, GUT = (SUBROW_H - BAR_H) / 2, BAR_GAP = 8;
const BLUE = '#2f80ed';
const MONTH = ['JAN', 'FEB', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

// --- calendar helpers (epoch-day integers) ---
const dow = day => new Date(day * MS).getUTCDay();              // 0 Sun .. 6 Sat
const isWeekday = day => { const w = dow(day); return w >= 1 && w <= 5; };
const mondayOnOrAfter = day => day + ((8 - dow(day)) % 7);      // 0 if already Monday
const startOfMonthDay = day => { const d = new Date(day * MS); return Math.round(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) / MS); };
const nextMonthDay = day => { const d = new Date(day * MS), y = d.getUTCFullYear(), mo = d.getUTCMonth(); return Math.round(Date.UTC(mo === 11 ? y + 1 : y, (mo + 1) % 12, 1) / MS); };

export function renderTimeline(container, scheduled, config, pto = []) {
  container.innerHTML = '';
  if (!scheduled.length) return;

  // The axis counts working days only (weekends collapse to zero width), and
  // starts on a Monday so the week header divides into clean Mon-Fri blocks.
  const viewStartDay = config.viewStart
    ? toEpochDay(config.viewStart)
    : Math.min(...scheduled.map(m => m.startDay));
  const originDay = mondayOnOrAfter(viewStartDay);
  const vis = scheduled.filter(m => m.endDay > originDay);
  if (!vis.length) return;

  // signed count of weekdays in [originDay, day); weekend days share the next index
  const workIndex = day => {
    let n = 0;
    if (day >= originDay) { for (let d = originDay; d < day; d++) if (isWeekday(d)) n++; }
    else { for (let d = day; d < originDay; d++) if (isWeekday(d)) n--; }
    return n;
  };
  // weekdays in [a, b] inclusive — a task's true business-day length
  const workSpanInclusive = (a, b) => { let n = 0; for (let d = a; d <= b; d++) if (isWeekday(d)) n++; return n; };
  // a bar covers THROUGH its end day, so its right edge sits one working day past end
  const rightIndex = endDay => workIndex(endDay) + (isWeekday(endDay) ? 1 : 0);

  const TL_W = Math.max(1150, window.innerWidth - ORIGIN_X - 120);
  const totalWork = Math.max(...vis.map(m => rightIndex(m.endDay))) + 2; // working-day columns + padding
  const PPWD = TL_W / totalWork;                                         // pixels per working day
  const x = day => ORIGIN_X + workIndex(day) * PPWD;

  // pack sub-rows per owner lane
  const laneTop = {}, laneRows = {}, rowOf = {};
  let yc = HEAD_H;
  for (const owner of OWNERS) {
    laneTop[owner] = yc;
    const { row, rowCount } = packSubRows(vis.filter(m => m.owner === owner));
    Object.assign(rowOf, row);
    laneRows[owner] = Math.max(rowCount, 1);
    yc += laneRows[owner] * SUBROW_H;
  }
  const BODY_BOTTOM = yc, TOTAL_W = ORIGIN_X + TL_W;
  container.style.width = TOTAL_W + 'px';
  container.style.height = BODY_BOTTOM + 'px';
  const add = html => container.insertAdjacentHTML('beforeend', html);
  const barY = m => laneTop[m.owner] + rowOf[m.id] * SUBROW_H + GUT;

  // zebra lane backgrounds
  OWNERS.forEach((owner, i) => {
    add(`<div class="lane-bg" style="top:${laneTop[owner]}px;height:${laneRows[owner] * SUBROW_H}px;width:${TOTAL_W}px;background:${i % 2 ? '#f4f7fb' : '#ffffff'}"></div>`);
  });

  // month band + month gridlines (widths measured in working days)
  for (let cur = startOfMonthDay(originDay); workIndex(cur) < totalWork; cur = nextMonthDay(cur)) {
    const segStart = Math.max(cur, originDay);
    const startIdx = workIndex(segStart);
    const endIdx = Math.min(totalWork, workIndex(nextMonthDay(cur)));
    const w = (endIdx - startIdx) * PPWD;
    if (w <= 0) continue;
    const mo = new Date(cur * MS).getUTCMonth();
    add(`<div class="mhead" style="left:${ORIGIN_X + startIdx * PPWD}px;width:${w}px;height:${MONTH_H}px;line-height:${MONTH_H}px">${MONTH[mo]}</div>`);
    add(`<div class="mgrid" style="left:${ORIGIN_X + startIdx * PPWD}px;top:0;height:${BODY_BOTTOM}px"></div>`);
  }

  // week columns + gridlines — one Mon-Fri block (5 working days) each
  for (let mon = originDay; workIndex(mon) < totalWork; mon += 7) {
    const idx = workIndex(mon);
    const w = Math.min(5, totalWork - idx) * PPWD;
    const dt = new Date(mon * MS);
    add(`<div class="whead" style="left:${ORIGIN_X + idx * PPWD}px;width:${w}px;top:${MONTH_H}px;height:${WEEK_H}px;line-height:${WEEK_H}px">${dt.getUTCMonth() + 1}/${dt.getUTCDate()}</div>`);
    add(`<div class="grid" style="left:${ORIGIN_X + idx * PPWD}px;top:${HEAD_H}px;height:${BODY_BOTTOM - HEAD_H}px"></div>`);
  }

  // lane labels + separators
  for (const owner of OWNERS) {
    const top = laneTop[owner], h = laneRows[owner] * SUBROW_H;
    add(`<div class="lane-sep" style="top:${top}px;width:${TOTAL_W}px"></div>`);
    add(`<div class="lane-lbl" style="top:${top + h / 2 - 16}px">${owner}</div>`);
    add(`<div class="lane-cap" style="top:${top + h / 2 + 4}px">${vis.filter(m => m.owner === owner).length} milestones</div>`);
  }
  add(`<div class="lane-sep" style="top:${BODY_BOTTOM}px;width:${TOTAL_W}px"></div>`);

  // bars (positioned and sized in working days; label is the business-day length)
  for (const m of vis) {
    const left = Math.max(x(m.startDay), ORIGIN_X);
    const w = Math.max(ORIGIN_X + rightIndex(m.endDay) * PPWD - left - BAR_GAP, 8);
    const clipped = workIndex(m.startDay) < 0 ? ' clipped' : '';
    const days = m.days != null ? m.days : workSpanInclusive(m.startDay, m.endDay);
    add(`<div class="bar${clipped}" style="left:${left}px;top:${barY(m)}px;width:${w}px;height:${BAR_H}px;background:${BLUE}" title="${esc(m.name)} (${fromEpochDay(m.startDay)} → ${fromEpochDay(m.endDay)})">${esc(m.name)} (${days}d)</div>`);
  }

  // PTO — gray a one-working-day slice (1/5 of a week block) in the person's lane per day off
  for (const { person, date } of pto) {
    if (!(person in laneTop)) continue;
    const idx = workIndex(toEpochDay(date));
    if (idx < 0 || idx >= totalWork) continue;
    add(`<div class="pto-day" style="left:${ORIGIN_X + idx * PPWD}px;width:${PPWD}px;top:${laneTop[person]}px;height:${laneRows[person] * SUBROW_H}px" title="${esc(person)} PTO ${date}"></div>`);
  }

  // today line
  const tIdx = workIndex(todayEpochDay());
  if (tIdx >= 0 && tIdx < totalWork) {
    add(`<div class="today-line" style="left:${ORIGIN_X + tIdx * PPWD}px;top:${MONTH_H}px;height:${BODY_BOTTOM - MONTH_H}px"></div>`);
  }
}
