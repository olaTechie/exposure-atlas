import { h, put, fill, fmt, pctf, pageHead, panelBox, csvButton, join, plural } from '../ui.js';
import { charBlock, gridTable } from '../tables.js';
import { primaryNote } from '../figures.js';

const groupBy = (rows, key) => { const g = new Map(); for (const r of rows) { if (!g.has(r[key])) g.set(r[key], []); g.get(r[key]).push(r); } return [...g.entries()]; };

export default function sources(el, params, DB) {
  const T = DB.tables.sources;
  const list = Object.entries(DB.sources).map(([id, s]) => ({ id, ...s })).sort((a, b) => a.author.localeCompare(b.author) || String(a.year).localeCompare(String(b.year)));
  const characteristics = [...new Set(T.map(r => r.Characteristic))];

  // searchable list
  const LIMIT = 50;
  let q = '', all = false;
  const status = h('span', { class: 'small' }), body = h('div', {});
  let rows = list;
  function draw() {
    const needle = q.toLowerCase();
    rows = list.filter(s => !needle || [s.author, s.title, ...s.countries].join(' ').toLowerCase().includes(needle));
    const shown = all ? rows : rows.slice(0, LIMIT);
    fill(status, `Showing ${fmt(shown.length)} of ${fmt(rows.length)} sources. `,
      rows.length > shown.length ? h('a', { href: '#', onclick: e => { e.preventDefault(); all = true; draw(); } }, 'Show all') : null);
    body.replaceChildren(rows.length ? gridTable(shown, [
      { key: 'author', label: 'Source', fmt: (v, s) => `${s.author} ${s.year}` },
      { key: 'title', label: 'Title', fmt: (v, s) => [s.title, s.doi ? [' ', h('a', { href: 'https://doi.org/' + s.doi, target: '_blank', rel: 'noopener' }, 'DOI ↗')] : null] },
      { key: 'countries', label: 'Country', fmt: v => join(v) }, { key: 'design', label: 'Design', fmt: v => v || 'not reported' },
      { key: 'ageGroups', label: 'Age bands', fmt: v => join(v) }, { key: 'nMeasures', label: 'Measures contributed', num: true }])
      : h('p', { class: 'in muted' }, 'No source matches this search.'));
  }
  draw();

  const mmat = groupBy(DB.quality.mmat, 'Study design (MMAT category)').map(([design, rs]) =>
    panelBox(design, `N = ${plural(rs[0]['Studies appraised (N)'], 'study', 'studies')} appraised`,
      gridTable(rs, [{ key: 'Criterion' }, ...['Yes', 'No', "Can't tell", 'Not answered'].map(k => ({ key: k, num: true })), { key: '% Yes', num: true, fmt: v => pctf(v) }])));
  const frameworks = groupBy(DB.quality.frameworks, 'Section').map(([section, rs]) =>
    panelBox(section, `N = ${fmt(rs[0].N)} sources`,
      gridTable(rs, [{ key: 'Category' }, { key: 'n', label: 'n/N', num: true, fmt: (v, r) => `${fmt(r.n)}/${fmt(r.N)}` }, { key: '%', num: true, fmt: v => pctf(v) }])));

  put(el,
    pageHead('Sources', `The ${fmt(list.length)} included sources: database studies and grey literature documents. Unit: sources.`),
    primaryNote(),
    h('h2', {}, 'Characteristics of the sources'),
    h('div', { class: 'cols2' }, characteristics.map(c => charBlock(T, c, { unit: 'sources' }))),
    h('h2', {}, 'List of sources'),
    h('div', { class: 'filters' },
      h('input', { type: 'search', placeholder: 'Search author, title or country…', 'aria-label': 'Search the sources', oninput: e => { q = e.target.value; all = false; draw(); } }),
      status, h('span', { class: 'spacer' }),
      csvButton('Download CSV', 'SMEPH261_sources_shown.csv', () => [
        ['ID', 'Author', 'Year', 'Title', 'Journal', 'DOI', 'Countries', 'Age bands', 'Design', 'MMAT category', 'Reporting quality', 'Measures contributed'],
        ...rows.map(s => [s.id, s.author, s.year, s.title, s.journal, s.doi, s.countries.join('; '), s.ageGroups.join('; '), s.design, s.mmat, s.reporting, s.nMeasures])])),
    panelBox('Included sources', 'one row per source', body),
    h('h2', {}, 'Quality appraisal (Mixed Methods Appraisal Tool)'),
    h('p', { class: 'lede' }, 'Answers to the appraisal criteria for the empirical studies appraised, overall and by study design. Unit: studies.'),
    h('div', { class: 'cols2' }, mmat),
    h('h2', {}, 'Definitions and conceptual frameworks'),
    h('p', { class: 'lede' }, 'How the sources define the exposure and which conceptual frameworks they name. Unit: sources.'),
    h('div', { class: 'cols2' }, frameworks));
}
