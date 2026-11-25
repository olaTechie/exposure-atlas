// Figures drawn by hand: bars, stacked bars, shaded grids and the parts they share.
// They draw what hub.json holds. The rules behind them (shares, shades, keyboard movement) are in logic.js.
import { h, fmt, doorHref } from './ui.js';
import { share, shade, inkOn, rove, pctf, dotOrder, stepCounts, dotState, stopReason, startStep, countFrame, tapAction, STEP_LABELS } from './logic.js';

export const calm = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
export const nOf = (n, N, unit = '') => (N == null ? fmt(n) : `${fmt(n)} of ${fmt(N)}${unit ? ' ' + unit : ''} (${pctf(share(n, N))})`);

// Set a number, counting to it in under 400 ms unless movement is unwanted. The final value is always written:
// a later call replaces an earlier one, and a page that is not being painted gets the number at once.
const counting = new WeakMap();
export function countTo(node, to) {
  const from = Number(String(node.textContent).replace(/[^\d.-]/g, '')) || 0;
  const run = {}; counting.set(node, run);
  const done = () => { if (counting.get(node) === run) { node.textContent = fmt(to); counting.delete(node); } };
  if (calm() || from === to || document.hidden || !document.hasFocus()) return done();
  const t0 = performance.now();
  const tick = t => {
    if (counting.get(node) !== run) return;
    const k = (t - t0) / 380;
    if (k >= 1) return done();
    node.textContent = fmt(countFrame(from, to, k));
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  setTimeout(done, 450);
}

// ---------------------------------------------------------------- tooltip (one for the whole hub)
const tipEl = () => document.getElementById('tip');
let tipOwner = null, tipAgain = null;
export function hideTip() { const t = tipEl(); if (t) t.classList.remove('on'); tipOwner = null; tipAgain = null; }
if (typeof document !== 'undefined') {
  document.addEventListener('keydown', e => { if (e.key === 'Escape') hideTip(); });
  // a mark that holds keyboard focus keeps its text when the page scrolls to it; a hovered one loses it
  document.addEventListener('scroll', () => { if (tipOwner && document.activeElement === tipOwner && tipAgain) tipAgain(); else hideTip(); }, { passive: true, capture: true });
}
// textFn returns { title, text } or a string. The same text is shown on hover, focus and tap.
export function tip(node, textFn) {
  const show = e => {
    const t = tipEl(); if (!t) return;
    const c = textFn(); const { title, text } = typeof c === 'string' ? { title: '', text: c } : c;
    t.replaceChildren(...(title ? [h('b', {}, title)] : []), text || '');
    t.classList.add('on'); tipOwner = node; tipAgain = () => show();
    const r = node.getBoundingClientRect();
    const byMouse = e && e.type === 'mousemove';
    const x = byMouse ? e.clientX + 12 : r.left + Math.min(r.width / 2, 40), y = byMouse ? e.clientY + 14 : r.bottom + 6;
    t.style.left = Math.max(8, Math.min(window.innerWidth - t.offsetWidth - 8, x)) + 'px';
    t.style.top = (y + t.offsetHeight + 8 > window.innerHeight ? Math.max(8, r.top - t.offsetHeight - 6) : y) + 'px';
  };
  node.addEventListener('mousemove', show);
  node.addEventListener('focus', show);
  // tap: on a touch screen the first tap shows the text and holds back whatever the mark does; the second lets it through.
  // tip() must be attached before the mark's own click handler for that to work.
  node.addEventListener('click', e => {
    const coarse = typeof matchMedia === 'function' && matchMedia('(hover: none)').matches;
    if (tapAction({ coarse, shown: tipOwner === node }) === 'show') { if (coarse) { e.preventDefault(); e.stopImmediatePropagation(); } show(e); } else if (!coarse) show(e);
  });
  node.addEventListener('mouseleave', () => { if (tipOwner === node) hideTip(); });
  node.addEventListener('blur', () => { if (tipOwner === node) hideTip(); });
  return node;
}

// One Tab stop for a group of marks; arrow keys, Home and End move inside it. cols may be a number or a function.
export function roving(container, selector, cols = 1) {
  const items = () => [...container.querySelectorAll(selector)];
  const reset = () => items().forEach((el, k) => { el.tabIndex = k === 0 ? 0 : -1; });
  reset();
  container.addEventListener('keydown', e => {
    const list = items(), at = list.indexOf(document.activeElement);
    if (at < 0) return;
    const to = rove(at, e.key, list.length, typeof cols === 'function' ? cols(list) : cols);
    if (to === at) return;
    e.preventDefault();
    list.forEach((el, k) => { el.tabIndex = k === to ? 0 : -1; });
    list[to].focus();
  });
  return { reset };
}
// marks per row, read from where the marks sit (for groups that wrap)
export const colsOf = list => { const top = list[0]?.offsetTop; const n = list.findIndex(el => el.offsetTop !== top); return n < 0 ? list.length : Math.max(1, n); };

// ---------------------------------------------------------------- a figure with its table one switch away
// figure: a node. table: a function returning the node, built the first time it is asked for. extra: nodes for the header.
export function figureBox({ title, note, figure, table, extra = [], foot = null }) {
  const body = h('div', { class: 'fig-body' }, figure);
  let tableNode = null, showing = 'figure';
  const sw = table ? h('button', { class: 'fig-switch', type: 'button', 'aria-pressed': 'false' }, 'Show as table') : null;
  if (sw) sw.addEventListener('click', () => {
    showing = showing === 'figure' ? 'table' : 'figure';
    if (showing === 'table' && !tableNode) tableNode = table();
    body.classList.toggle('as-table', showing === 'table');
    body.replaceChildren(showing === 'table' ? tableNode : figure);
    sw.textContent = showing === 'table' ? 'Show as figure' : 'Show as table';
    sw.setAttribute('aria-pressed', String(showing === 'table'));
  });
  return h('section', { class: 'panelbox fig' },
    h('header', {}, h('div', { class: 'head' }, h('span', { class: 't' }, title), note ? h('span', { class: 'note' }, note) : null),
      h('div', { class: 'acts' }, ...extra, sw)),
    body, foot);
}

// ---------------------------------------------------------------- bars
// One horizontal bar per row, from zero. opts: label(r), n(r), N(r) (may be null), unit, mark(r) -> text or null,
// sub(r) -> a line of small text under the label, onPick(r), scale: 'N' (bar = share of N) or 'max' (bar = share of the
// largest n), rule: {before: index, text}, group(r) -> a heading put above the first row of each group,
// door(r) -> the address Explore opens at for this row, or null.
export function bars(rows, { label, n, N = () => null, unit = '', mark = () => null, sub = () => null, onPick = null, scale = 'N', rule = null, group = null, door = null }) {
  const top = Math.max(0, ...rows.map(n));
  const list = h('div', { class: 'bar-list' });
  let lastGroup = null;
  rows.forEach((r, k) => {
    if (rule && rule.before === k) list.append(h('div', { class: 'bar-rule' }, rule.text));
    if (group) { const g = group(r); if (g !== lastGroup) { if (g) list.append(h('div', { class: 'bar-rule grp' }, g)); lastGroup = g; } }
    const v = n(r), of = N(r), w = scale === 'max' ? share(v, top) : share(v, of);
    const m = mark(r), text = nOf(v, of), to = door ? door(r) : null;
    const act = onPick ? () => onPick(r) : to ? () => { location.hash = to; } : null;
    const row = h(act ? 'button' : 'div', { class: 'bar-row' + (act ? ' pick' : ''), 'aria-label': `${label(r)}${m ? ', ' + m : ''}: ${nOf(v, of, unit)}` },
      h('span', { class: 'lab' }, label(r), m ? h('span', { class: 'mark' }, m) : null, sub(r) ? h('span', { class: 'sub' }, sub(r)) : null),
      h('span', { class: 'bar-track' }, h('span', { class: 'bar-fill', style: { width: Math.max(0, Math.min(100, 100 * w)) + '%' } })),
      h('span', { class: 'val' }, text));
    tip(row, () => ({ title: label(r) + (m ? ` (${m})` : ''), text: nOf(v, of, unit) + (to ? '. Select to open in Explore.' : '') }));
    if (act) { row.type = 'button'; row.addEventListener('click', act); } else row.setAttribute('role', 'img');
    list.append(row);
  });
  roving(list, '.bar-row');
  return list;
}

// ---------------------------------------------------------------- stacked bars
// One stacked bar per row. keys: [{key, label, cls}] in a fixed order; total(r) is the row's N; label(r) its name.
export function stacks(rows, { label, keys, total, unit = '', value = null, legend: showLegend = true, door = null }) {
  const legend = h('div', { class: 'stk-key' }, keys.map(k => h('span', {}, h('i', { class: k.cls }), k.label)));
  const list = h('div', { class: 'stk-list' });
  rows.forEach(r => {
    const N = total(r);
    const track = h('span', { class: 'stk-track' }, keys.filter(k => r[k.key] > 0).map(k => {
      const seg = h('button', { class: `stk-seg ${k.cls}`, type: 'button', style: { flexGrow: r[k.key] }, 'aria-label': `${label(r)}, ${k.label}: ${nOf(r[k.key], N, unit)}` });
      const to = door ? door(r, k.key) : null;
      tip(seg, () => ({ title: `${label(r)}: ${k.label}`, text: nOf(r[k.key], N, unit) + (to ? '. Select to open in Explore.' : '') }));
      if (to) { seg.classList.add('pick'); seg.addEventListener('click', () => { location.hash = to; }); }
      return seg;
    }));
    roving(track, '.stk-seg', keys.length);
    list.append(h('div', { class: 'stk-row' }, h('span', { class: 'lab' }, label(r)), track, h('span', { class: 'val' }, value ? value(r) : `N = ${fmt(N)}`)));
  });
  return h('div', {}, showLegend ? legend : null, list);
}

// ---------------------------------------------------------------- shaded grid
// rows: objects. rowKey: the row-name column. cols: column keys. total: the row-total column. Returns { node, setMode }.
// mode 'share': each cell is its share of the row; 'count': the number, shaded against the largest cell outside total rows.
// groups: [{label, cols}] puts those columns first under a shared heading; rowGroup(r) -> a heading above each group of rows.
export function shadeGrid(rows, { rowKey, cols: allCols, total, rowLabel = v => v, colLabel = v => v, totalRow = () => false, unit = '', totalHead = 'Total', corner = '', groups = null, rowGroup = null, door = null }) {
  const grouped = groups ? groups.flatMap(g => g.cols) : [];
  const cols = [...grouped, ...allCols.filter(c => !grouped.includes(c))];
  const starts = new Set(groups ? [...groups.map(g => g.cols[0]), cols[grouped.length]].filter(Boolean) : []);
  const colTh = cols.map(c => h('th', { scope: 'col', class: starts.has(c) ? 'gstart' : null }, colLabel(c)));
  const max = Math.max(0, ...rows.filter(r => !totalRow(r)).flatMap(r => cols.map(c => r[c])));
  const cells = [];
  let lastRowGroup = null;
  const body = rows.flatMap(r => {
    const th = h('th', { scope: 'row' }, rowLabel(r[rowKey]));
    const g = rowGroup ? rowGroup(r) : null, head = g && g !== lastRowGroup ? h('tr', { class: 'rowgroup' }, h('th', { colspan: cols.length + 2, scope: 'colgroup' }, g)) : null;
    if (rowGroup) lastRowGroup = g;
    return [head, h('tr', { class: totalRow(r) ? 'total' : null }, th, cols.map((c, k) => {
      const d = h('div', { class: 'grid-cell', role: 'img' });
      const hot = on => { th.classList.toggle('hot', on); colTh[k].classList.toggle('hot', on); };
      d.addEventListener('mouseenter', () => hot(true)); d.addEventListener('mouseleave', () => hot(false));
      d.addEventListener('focus', () => hot(true)); d.addEventListener('blur', () => hot(false));
      const says = () => `${rowLabel(r[rowKey])}, ${colLabel(c)}: ${nOf(r[c], r[total], unit)}`;
      d.setAttribute('aria-label', says());
      const to = door && r[c] ? door(r, c) : null;
      tip(d, () => ({ title: rowLabel(r[rowKey]), text: `${colLabel(c)}: ${nOf(r[c], r[total], unit)}` + (to ? '. Select to open in Explore.' : '') }));
      if (to) { d.classList.add('pick'); d.setAttribute('role', 'link'); d.addEventListener('click', () => { location.hash = to; });
        d.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); location.hash = to; } }); }
      cells.push([d, r, c]);
      return h('td', { class: starts.has(c) ? 'gstart' : null }, d);
    }), h('td', { class: 'tot' }, fmt(r[total])))];
  }).filter(Boolean);
  const table = h('table', { class: 'grid' },
    h('thead', {},
      groups ? h('tr', { class: 'grouphead' }, h('th', {}), groups.map(g => h('th', { colspan: g.cols.length, scope: 'colgroup', class: 'gstart' }, g.label)), h('th', { colspan: cols.length - grouped.length + 1 })) : null,
      h('tr', {}, h('th', {}, corner), colTh, h('th', { scope: 'col', style: { textAlign: 'right' } }, totalHead))), h('tbody', {}, body));
  function setMode(mode) {
    for (const [d, r, c] of cells) {
      const v = r[c], p = mode === 'share' ? shade(v, r[total]) : shade(v, totalRow(r) ? r[total] : max);
      d.classList.toggle('zero', !v); d.classList.toggle('light', !!v && inkOn(p) === 'light');
      d.style.background = v ? `color-mix(in oklab, var(--deep) ${p}%, var(--pale))` : '';
      d.textContent = !v ? '–' : mode === 'share' ? pctf(share(v, r[total])) : fmt(v);
    }
  }
  setMode('share');
  roving(table, '.grid-cell', cols.length);
  return { node: h('div', { class: 'scroll' }, table), setMode };
}

// two-way switch as pills; returns the node. options: [[value, label]]
export function modeSwitch(options, current, onPick) {
  const btns = options.map(([v, l]) => h('button', { class: 'pill', type: 'button', 'aria-pressed': String(v === current) }, l));
  btns.forEach((b, k) => b.addEventListener('click', () => { btns.forEach((x, j) => x.setAttribute('aria-pressed', String(j === k))); onPick(options[k][0]); }));
  return h('span', { class: 'pills' }, btns);
}

// ---------------------------------------------------------------- age strip
// Four small boxes, one per age band: usable (all four readiness criteria), validated, used, or none.
export function ageState(i, band) {
  if ((i.usableAt || []).includes(band)) return 'usable';
  if ((i.validAges || []).includes(band)) return 'validated';
  return (i.ages || []).includes(band) ? 'used' : 'none';
}
const AGE_WORD = { usable: 'usable (meets all four readiness criteria)', validated: 'validated', used: 'used', none: 'not used' };
export function ageStrip(i, DB) {
  const parts = DB.labels.bands.map(b => [b, ageState(i, b)]);
  const says = parts.map(([b, s]) => `${b}: ${AGE_WORD[s]}`).join('; ');
  const strip = h('span', { class: 'agestrip', role: 'img', 'aria-label': says, tabindex: '0' }, parts.map(([, s]) => h('i', { class: s })));
  return tip(strip, () => ({ title: 'By age band', text: says }));
}
export const ageStripKey = () => h('p', { class: 'note' }, 'Age strip, one box per age band from under 8 to 15–17: ',
  h('span', { class: 'agestrip' }, h('i', { class: 'none' })), ' not used, ', h('span', { class: 'agestrip' }, h('i', { class: 'used' })), ' used, ',
  h('span', { class: 'agestrip' }, h('i', { class: 'validated' })), ' validated, ', h('span', { class: 'agestrip' }, h('i', { class: 'usable' })), ' usable (meets all four readiness criteria).');

// ---------------------------------------------------------------- objective header
// o: a row of DB.objectives. The element id is the section address (obj1 ... obj7).
export function objectiveHead(o) {
  const to = o.door ? doorHref(o.door.tab, o.door.f, o.door.n) : null;
  return h('header', { class: 'obj-head', id: o.section },
    h('span', { class: 'obj-n' }, `Objective ${o.n}`),
    h('h2', {}, o.question),
    h('p', { class: 'obj-answer' }, o.answer, to ? [' ', h('a', { href: to }, `Open the ${fmt(o.door.n)} ${o.door.tab} in Explore`)] : null),
    h('details', {}, h('summary', {}, 'Wording and domains'),
      h('p', {}, `Objective as stated in the review: to ${o.wording}. `, `Protocol extraction domains: ${o.domains}.`)));
}
// The line carried by the pages that serve the primary objective rather than one secondary objective.
export const primaryNote = () => h('p', { class: 'primary-note' }, 'This page serves the primary objective of the review: to map and compare the instruments and methods used to measure social media exposure ',
  'in children and adolescents aged 0 to 17, with particular attention to instruments feasible for population-based surveys.');

// ---------------------------------------------------------------- the dot field (Overview)
// One dot per named instrument and five steps from "named" to "usable in an age band".
// Returns { node, setStep, setPicker, dispose }. onOpen(id) opens an instrument.
const SEEN = 'hub.stepsSeen';
const seen = () => { try { return sessionStorage.getItem(SEEN) === '1'; } catch { return false; } };
const markSeen = () => { try { sessionStorage.setItem(SEEN, '1'); } catch { /* storage unavailable: the steps play again next time */ } };

export function dotField(DB, { onOpen, picker, table = null, door = null }) {
  const order = dotOrder(DB), n = stepCounts(DB), short = i => i.acronym || i.name;
  let step = startStep(calm(), seen()), pick = picker, timer = null;

  const stepBtns = STEP_LABELS.map((label, s) => {
    const num = h('span', { class: 'n' }, '0');
    const b = h('button', { type: 'button' }, num, h('span', { class: 'l' }, label));
    b.addEventListener('click', () => { stop(); setStep(s); });
    const li = h('li', {}, b); li.num = num; li.btn = b;
    return li;
  });
  const dots = order.map((i, k) => {
    const d = h('button', { class: 'idot', type: 'button', style: { '--i': k } });
    d.style.setProperty('--i', k);
    tip(d, () => ({ title: i.name + (i.acronym && !i.name.includes(`(${i.acronym})`) ? ` (${i.acronym})` : ''), text: stopReason(i, DB) }));
    d.addEventListener('click', () => onOpen(i.id));
    return d;
  });
  const field = h('div', { class: 'idots', role: 'group', 'aria-label': 'Named instruments, one dot each' }, dots);
  const say = h('p', { class: 'say', 'aria-live': 'polite' }), doorLine = h('p', { class: 'door-line' });
  roving(field, '.idot', colsOf);

  function draw() {
    stepBtns.forEach((li, s) => {
      li.className = (s <= step ? 'done ' : '') + (s === step ? 'cur ' : '') + (s === 4 ? 'last' : '');
      li.btn.setAttribute('aria-pressed', String(s === step));
      countTo(li.num, n[s]);
    });
    let picked = 0;
    const combined = [];
    order.forEach((i, k) => {
      const st = dotState(i, step, pick, DB);
      if (st === 'pick') picked += 1;
      if (st === 'combined') combined.push(short(i));
      dots[k].className = 'idot ' + st;
      dots[k].setAttribute('aria-label', `${i.name}: ${stopReason(i, DB)}`);
    });
    const text = [
      ['The review found ', h('b', {}, `${fmt(n[0])} named instruments`), '. Each dot is one of them.'],
      ['Measurement-property evidence exists for ', h('b', {}, `${fmt(n[1])} of ${fmt(n[0])}`), `. The other ${fmt(n[0] - n[1])} were not tested in the included sources.`],
      ['The validation rule is met by ', h('b', {}, `${fmt(n[2])} of ${fmt(n[0])}`), '.'],
      ['Exposure is measured by ', h('b', {}, `${fmt(n[3])} of the ${fmt(n[2])}`), ` validated instruments. The other ${fmt(n[2] - n[3])} measure problematic use or other constructs.`],
      ['Usable in at least one age band: ', h('b', {}, `${fmt(n[4])} of the ${fmt(n[3])}`), ', which meet all four readiness criteria. ',
        `The larger dots (${fmt(picked)}) are usable for the choice in the picker.`,
        combined.length ? ` The ring marks ${combined.join(' and ')}, which ${combined.length === 1 ? 'qualifies' : 'qualify'} only with all ages combined.` : ''],
    ][step];
    say.replaceChildren(...text.flat().filter(x => x !== ''));
    const to = door ? door(step) : null;
    doorLine.replaceChildren(...(to ? [h('a', { href: to }, 'See these instruments in Explore')] : []));
  }
  function setStep(s) { step = Math.max(0, Math.min(4, s)); draw(); }
  function setPicker(p) { pick = p; draw(); }
  function stop() { if (timer) { clearTimeout(timer); timer = null; } markSeen(); }
  function dispose() { if (timer) { clearTimeout(timer); timer = null; } }

  draw();
  if (step === 0) {          // the one sequence that plays unasked, once per browser session
    const next = () => { timer = null; if (step < 4) { setStep(step + 1); if (step < 4) timer = setTimeout(next, 1100); else markSeen(); } };
    timer = setTimeout(next, 900);
  }
  // the table behind the dots, one switch away
  const body = h('div', {}, field, say, doorLine);
  let tableNode = null, asTable = false;
  const sw = table ? h('button', { class: 'fig-switch', type: 'button', 'aria-pressed': 'false' }, 'Show as table') : null;
  if (sw) sw.addEventListener('click', () => {
    asTable = !asTable; stop();
    if (asTable && !tableNode) tableNode = table();
    body.replaceChildren(...(asTable ? [tableNode] : [field, say, doorLine]));
    sw.textContent = asTable ? 'Show as figure' : 'Show as table'; sw.setAttribute('aria-pressed', String(asTable));
  });
  const node = h('section', { class: 'follow' }, sw ? h('div', { class: 'follow-acts' }, sw) : null, h('ol', { class: 'steps' }, stepBtns), body);
  return { node, setStep, setPicker, dispose };
}
