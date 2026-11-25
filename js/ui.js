// Small DOM and formatting helpers shared by all views.
import { validCompareIds, pctf, formatExplore, door } from './logic.js';
export { pctf };

let DB = null;                       // set once by app.js, so helpers can read labels and known ids
export const bindDB = db => { DB = db; };

export function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

export const store = {
  get(k, d) { try { const v = localStorage.getItem('hub.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('hub.' + k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
};

const query = params => new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== '')).toString();
export const href = (view, params = {}) => { const q = query(params); return '#/' + view + (q ? '?' + q : ''); };
export function go(view, params = {}) { location.hash = href(view, params); }
// the address of Explore in a given state: {tab, f, mf} (see logic.js)
export const exploreHref = state => href('explore', formatExplore(state, DB));
// the address Explore opens at for a number shown on a page, or null when Explore would not give that number
export const doorHref = (tab, labels, shown) => { const d = door(DB, tab, labels, shown); return d ? exploreHref(d) : null; };

// append / replace children, skipping null and flattening arrays
const clean = kids => kids.flat(Infinity).filter(k => k != null && k !== false);
export const put = (el, ...kids) => el.append(...clean(kids));
export const fill = (el, ...kids) => el.replaceChildren(...clean(kids));

export const DASH = '–';
export const fmt = n => Number(n).toLocaleString('en-GB');
export const nNp = (n, N) => `${fmt(n)}/${fmt(N)} (${pctf(N ? n / N : 0)})`;
export const plural = (n, one, many) => `${fmt(n)} ${n === 1 ? one : many}`;
export const lowerFirst = s => s.charAt(0).toLowerCase() + s.slice(1);

export const pageHead = (title, ...lede) => [h('div', { class: 'ttl' }, h('h1', {}, title)), lede.length ? h('p', { class: 'lede' }, ...lede) : null];
export const tag = (kind, text, title) => h('span', { class: `tag t-${kind}`, title }, text);
export const panelBox = (title, note, ...kids) => h('section', { class: 'panelbox' },
  h('header', {}, h('span', { class: 't' }, title), note ? h('span', { class: 'note' }, note) : null), ...clean(kids));

const REP = {
  'Child/adolescent self-report': 'Self-report', 'Parent/caregiver proxy': 'Parent report', 'Dual informant (child + parent)': 'Self-report and parent report',
  'Device-generated': 'Device', 'Researcher-coded': 'Researcher-coded', 'Teacher report': 'Teacher report',
};
export const repShort = r => REP[r] || r;
export const reporters = i => (i.reporters.length ? [...new Set(i.reporters.map(repShort))].join(', ') : 'not reported');

// acronym suffix, unless the name already carries it
export const acr = i => (i.acronym && !i.name.includes(`(${i.acronym})`) ? ` (${i.acronym})` : '');
export const instLink = i => h('a', { href: href('instrument', { id: i.id }) }, i.name);
export const instLabel = i => i.name + acr(i);
export const join = xs => (xs && xs.length ? xs.join(', ') : 'not reported');
export const itemsTime = i => `${i.items.length ? i.items.join(' / ') + ' items' : 'items not reported'} · ${i.burden.length ? i.burden.join(' / ') + ' min' : 'time not reported'}`;

export const isValidated = i => !!i.master && i.master['Meets validation rule'] === 'Yes';
// analytical dimensions in full, main dimensions first
export const dimList = i => DB.labels.dims.filter(d => i.dims[d.key]).map(d => ({ label: d.label, main: i.dims[d.key] === 'primary' }))
  .sort((a, b) => Number(b.main) - Number(a.main));
export const dimText = i => dimList(i).map(d => `${d.label}${d.main ? '' : ' (secondary)'}`).join(', ') || 'not classified';
export const themeText = i => i.themes.map(t => DB.themeLabel(t)).join(', ') || 'none of the seven health themes';
// "usable at" for the validated exposure instruments; null for every other instrument
export const usableText = i => (i.usableAt == null ? null : i.usableAt.length ? i.usableAt.join(', ') : `none: ${i.whyNot}`);
export const usableTag = i => (i.usableAt == null ? null : i.usableAt.length
  ? tag('green', `usable at ${i.usableAt.join(', ')}`, 'Meets all four readiness criteria in these age bands')
  : h('span', { class: 'tag t-red wrap' }, `none: ${i.whyNot}`));

// allAges: the list is for all ages combined, where an instrument can count although it is usable in no age band
export function instTags(i, { allAges = false } = {}) {
  if (i.level === 'system') return [tag('blue', 'named tracking system', 'A digital-trace system identified by name; reported with the digital-trace measures and not judged against the validation rule')];
  if (i.level !== 'named') return [tag('blue', 'study-specific items', 'Questions written for one study; never validated')];
  const m = i.master, out = [];
  if (isValidated(i)) {
    const n = m['Validating sources'];
    out.push(tag('green', 'validated'), tag(n === 1 ? 'amber' : 'blue', `validated in ${plural(n, 'study', 'studies')}`));
  } else out.push(tag('blue', 'not validated'));
  if (m['Usable in a survey (any use)'] === 'Yes') {
    out.push(tag('blue', m['Completion time reported'] === 'Yes' ? 'usable in a survey' : 'usable in a survey · time not reported',
      'No app or device needed, and 10 minutes or less or completion time not reported'));
  }
  out.push(allAges && i.usableAt != null && !i.usableAt.length
    ? h('span', { class: 'tag t-amber wrap' }, `counted for all ages combined only: ${i.whyNot}`) : usableTag(i));
  return out.filter(Boolean);
}

export function csvDownload(filename, rows) {
  const esc = v => { const s = v == null ? '' : String(v); return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const blob = new Blob(['﻿' + rows.map(r => r.map(esc).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = h('a', { href: URL.createObjectURL(blob), download: filename });
  document.body.append(a); a.click(); a.remove();
}
export const csvButton = (label, filename, rowsFn) => h('button', { class: 'btn ghost', onclick: () => csvDownload(filename, rowsFn()) }, label);
export const fileSafe = s => String(s).replace(/[^\w.–-]+/g, '_');

// right-hand drill-down panel
const panel = () => document.getElementById('panel');
let opener = null;                    // where keyboard focus was when the panel opened
export function openPanel(...content) {
  const p = panel();
  if (p.hidden) opener = document.activeElement;
  const close = h('button', { class: 'close', 'aria-label': 'Close details', onclick: closePanel }, '×');
  p.replaceChildren(close, ...clean(content));
  p.hidden = false;
  close.focus();
}
export function closePanel() {
  const p = panel();
  if (p.hidden) return;
  p.hidden = true;
  if (opener && document.contains(opener)) opener.focus();
  opener = null;
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') closePanel(); });

// filter pills
export function tabs(options, current, onPick, labelOf = x => x) {
  return h('span', { class: 'pills' }, options.map(o => h('button', { class: 'pill' + (o === current ? ' on' : ''), onclick: () => onPick(o) }, labelOf(o))));
}

export function select(options, value, onChange, allLabel) {
  return h('select', { onchange: e => onChange(e.target.value) },
    allLabel ? h('option', { value: '' }, allLabel) : null,
    options.map(o => { const [v, l] = Array.isArray(o) ? o : [o, o]; return h('option', { value: v, selected: v === value }, l); }));
}

// compare basket (max 4); ids the data no longer hold are dropped
export const MAX_COMPARE = 4;
export const compareIds = () => validCompareIds(store.get('compare', []), DB).slice(0, MAX_COMPARE);
export function setCompare(ids) { store.set('compare', validCompareIds(ids, DB).slice(0, MAX_COMPARE)); refreshCompareCount(); }
export function toggleCompare(id) {
  let ids = compareIds();
  if (ids.includes(id)) ids = ids.filter(x => x !== id);
  else if (ids.length >= MAX_COMPARE) { alert(`You can compare up to ${MAX_COMPARE} instruments. Remove one first.`); return false; }
  else ids = [...ids, id];
  setCompare(ids); return true;
}
export function refreshCompareCount() { const n = compareIds().length; document.getElementById('cmpCount').textContent = n || ''; }

// one master label reads oddly on a page that does show the row or column
export const relabel = s => (s === 'Not shown: other categories' ? 'Other categories (not analytical dimensions)' : s);
