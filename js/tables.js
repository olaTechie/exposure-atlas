// Renders the master tables as they come: one block per characteristic, or a plain grid of rows.
import { h, fmt, pctf, DASH } from './ui.js';
import { figureBox, bars } from './figures.js';

// The plain table of a block of master rows: category, n/N, %.
export const charTable = rs => h('div', { class: 'scroll' }, h('table', { class: 'data' },
  h('thead', {}, h('tr', {}, h('th', {}, 'Category'), h('th', { class: 'n' }, 'n/N'), h('th', { class: 'n' }, '%'))),
  h('tbody', {}, rs.map(r => h('tr', {},
    h('td', {}, r.Category), h('td', { class: 'n' }, `${fmt(r.n)}/${fmt(r.N)}`), h('td', { class: 'n' }, pctf(r['%'])))))));

// rows: master rows {Characteristic, Category, n, N, '%', 'Categories overlap'}; characteristic is matched at the start.
// Returns the figure (bars) with the table one switch away. opts.rule sets a divider before a row: {before, text}.
export function charBlock(rows, characteristic, { title, unit = '', rule = null, foot = null } = {}) {
  const rs = rows.filter(r => r.Characteristic.startsWith(characteristic));
  if (!rs.length) throw new Error(`The master tables hold no rows for "${characteristic}"`);
  const Ns = [...new Set(rs.map(r => r.N))];
  const overlap = rs[0]['Categories overlap'] === 'Yes';
  const note = `${Ns.length === 1 ? `N = ${fmt(Ns[0])}${unit ? ' ' + unit : ''} · ` : ''}categories ${overlap ? 'overlap' : 'do not overlap'}`;
  const table = () => charTable(rs);
  return figureBox({ title: title || rs[0].Characteristic, note, table, foot,
    figure: bars(rs, { label: r => r.Category, n: r => r.n, N: r => r.N, unit, rule }) });
}

// rows: list of objects; cols: [{key, label, fmt, num}]. fmt(value, row) may return text or a node.
export function gridTable(rows, cols, { caption, rowClass } = {}) {
  return h('div', { class: 'scroll' }, h('table', { class: 'data' },
    caption ? h('caption', { class: 'note', style: { captionSide: 'bottom', textAlign: 'left', padding: '8px 12px' } }, caption) : null,
    h('thead', {}, h('tr', {}, cols.map(c => h('th', { class: c.num ? 'n' : null }, c.label ?? c.key)))),
    h('tbody', {}, rows.map(r => h('tr', { class: rowClass ? rowClass(r) : null },
      cols.map(c => { const v = c.fmt ? c.fmt(r[c.key], r) : r[c.key]; return h('td', { class: c.num ? 'n' : null }, v == null || v === '' ? DASH : v); })))) ));
}
