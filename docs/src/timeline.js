// docs/src/timeline.js
import { toEpochDay, fromEpochDay, todayEpochDay } from './dates.js';
import { packSubRows } from './layout.js';

const MS = 86400000;
const OWNERS = ['Sunah', 'Meredith'];
const ORIGIN_X = 210, MONTH_H = 34, WEEK_H = 30, HEAD_H = MONTH_H + WEEK_H;
const SUBROW_H = 70, BAR_H = 32, GUT = (SUBROW_H - BAR_H) / 2;
const BLUE = '#2f80ed';
const MONTH = ['JAN', 'FEB', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export function renderTimeline(container, scheduled, config) {
  container.innerHTML = '';

  const viewStartDay = config.viewStart
    ? toEpochDay(config.viewStart)
    : Math.min(...scheduled.map(m => m.startDay));
  const chartEndDay = Math.max(...scheduled.map(m => m.endDay)) + 4;
  const vis = scheduled.filter(m => m.endDay > viewStartDay);

  const TL_W = Math.max(1150, window.innerWidth - ORIGIN_X - 120);
  const totalDays = chartEndDay - viewStartDay;
  const PPD = TL_W / totalDays;
  const x = day => ORIGIN_X + (day - viewStartDay) * PPD;

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

  // month band + month gridlines
  let curMs = viewStartDay * MS;
  const endMs = chartEndDay * MS;
  while (curMs < endMs) {
    const dt = new Date(curMs), y = dt.getUTCFullYear(), mo = dt.getUTCMonth();
    const nextMs = Date.UTC(mo === 11 ? y + 1 : y, (mo + 1) % 12, 1);
    const segEnd = Math.min(nextMs, endMs);
    const left = x(curMs / MS), w = (segEnd - curMs) / MS * PPD;
    add(`<div class="mhead" style="left:${left}px;width:${w}px;height:${MONTH_H}px;line-height:${MONTH_H}px">${MONTH[mo]}</div>`);
    add(`<div class="mgrid" style="left:${left}px;top:0;height:${BODY_BOTTOM}px"></div>`);
    curMs = nextMs;
  }

  // week columns + gridlines (7-day, anchored at viewStart)
  for (let wk = viewStartDay; wk < chartEndDay; wk += 7) {
    const left = x(wk), w = 7 * PPD, dt = new Date(wk * MS);
    add(`<div class="whead" style="left:${left}px;width:${w}px;top:${MONTH_H}px;height:${WEEK_H}px;line-height:${WEEK_H}px">${dt.getUTCMonth() + 1}/${dt.getUTCDate()}</div>`);
    add(`<div class="grid" style="left:${left}px;top:${HEAD_H}px;height:${BODY_BOTTOM - HEAD_H}px"></div>`);
  }

  // lane labels + separators
  for (const owner of OWNERS) {
    const top = laneTop[owner], h = laneRows[owner] * SUBROW_H;
    add(`<div class="lane-sep" style="top:${top}px;width:${TOTAL_W}px"></div>`);
    add(`<div class="lane-lbl" style="top:${top + h / 2 - 16}px">${owner}</div>`);
    add(`<div class="lane-cap" style="top:${top + h / 2 + 4}px">${vis.filter(m => m.owner === owner).length} milestones</div>`);
  }
  add(`<div class="lane-sep" style="top:${BODY_BOTTOM}px;width:${TOTAL_W}px"></div>`);

  // bars
  for (const m of vis) {
    const left = Math.max(x(m.startDay), ORIGIN_X);
    const w = Math.max(x(m.endDay) - left, 8);
    const clipped = x(m.startDay) < ORIGIN_X ? ' clipped' : '';
    const days = m.endDay - m.startDay; // duration estimate in calendar days (preserved by the cascade)
    add(`<div class="bar${clipped}" style="left:${left}px;top:${barY(m)}px;width:${w}px;height:${BAR_H}px;background:${BLUE}" title="${m.name} (${fromEpochDay(m.startDay)} → ${fromEpochDay(m.endDay)})">${m.name} (${days}d)</div>`);
  }

  // today line
  const t = todayEpochDay();
  if (t > viewStartDay && t < chartEndDay) {
    add(`<div class="today-line" style="left:${x(t)}px;top:${MONTH_H}px;height:${BODY_BOTTOM - MONTH_H}px"></div>`);
  }
}
