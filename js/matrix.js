// The tailoring matrix and its drill-down panel (Overview and Health themes).
import { h, acr, openPanel, tag, instTags, instLink, reporters, csvButton, toggleCompare, compareIds, href, fileSafe, plural, lowerFirst, doorHref } from './ui.js';
import { cellTools, ALL, agesText, usableHeading, allAgesOnly, kindOf, byPathway } from './logic.js';

const CRITERIA = 'validated with evidence from the age band, usable in a survey, available with the reporter for the age band, and meeting the minimum-evidence condition';
const MEANING = {
  Green: 'Green: at least one validated exposure instrument meets all four readiness criteria',
  Amber: 'Amber: instruments or methods are in use, but none meets all four readiness criteria',
  Red: 'Red: no measure identified',
};
export const bandText = band => (band === ALL ? 'all ages combined' : agesText(band));

export function legend() {
  return h('p', { class: 'legend' },
    h('i', { class: 'c-green' }), 'an instrument meets all four readiness criteria',
    h('i', { class: 'c-amber' }), 'instruments or methods in use, none meets them',
    h('i', { class: 'c-red' }), 'no measure (hatched)',
    h('br'), `Each cell shows the number of validated exposure instruments that are ${CRITERIA}. `,
    'Problematic-use scales are not counted. Select a cell or a health theme to see what is in use.');
}

// Sets every cell of a matrix to the age band: colour, number and label. The cells stay, so the change can be seen.
function paint(table, DB, band, selTheme) {
  const M = DB.matrix[band];
  table.dataset.band = band;
  table.querySelectorAll('tbody tr').forEach(tr => tr.classList.toggle('sel', tr.dataset.theme === selTheme));
  table.querySelectorAll('button.cell').forEach(b => {
    const t = b.dataset.theme, d = b.dataset.dim, c = M[t][d];
    b.className = 'cell c-' + c.colour.toLowerCase();
    b.title = `${DB.themeLabel(t)} · ${DB.dimLabel(d)}. ${MEANING[c.colour]}. ${plural(c.inUse.length, 'instrument or method', 'instruments or methods')} in use.`;
    b.setAttribute('aria-label', `${DB.themeLabel(t)}, ${DB.dimLabel(d)}: ${plural(c.ids.length, 'instrument meets', 'instruments meet')} the readiness criteria; ${c.inUse.length ? plural(c.inUse.length, 'instrument or method', 'instruments or methods') + ' in use' : 'no measure identified'}`);
    b.textContent = c.ids.length;
  });
}

export function renderMatrix(DB, band, { selTheme = '' } = {}) {
  const table = h('table', { class: 'mx' },
    h('thead', {}, h('tr', {}, h('th'), DB.labels.dims.map(d => h('th', { scope: 'col' }, d.label)))),
    h('tbody', {}, byPathway(DB, DB.labels.themes, t => t.key).flatMap(g => [
      h('tr', { class: 'pw' }, h('th', { colspan: DB.labels.dims.length + 1, scope: 'colgroup' }, g.pathway.label)),
      ...g.rows.map(t => h('tr', { 'data-theme': t.key },
      h('td', { class: 't' }, h('button', { title: 'Everything in use for this health theme', onclick: () => openCellPanel(DB, table.dataset.band, t.key, null) }, t.label)),
      DB.labels.dims.map(d => h('td', {}, h('button', { class: 'cell', 'data-theme': t.key, 'data-dim': d.key,
        onclick: () => openCellPanel(DB, table.dataset.band, t.key, d.key) })))))])));
  paint(table, DB, band, selTheme);
  return h('div', { class: 'scroll' }, table);
}

// Changes a matrix made by renderMatrix to another age band or selected health theme, without replacing it.
export function updateMatrix(node, DB, band, { selTheme = '' } = {}) {
  const table = node.matches('table.mx') ? node : node.querySelector('table.mx');
  paint(table, DB, band, selTheme);
}

// dim = null: the whole row (all five analytical dimensions)
export function openCellPanel(DB, band, theme, dim) {
  const { usable, others } = cellTools(DB, band, theme, dim);
  const cell = dim ? DB.matrix[band][theme][dim] : null;
  const all = [...usable, ...others];
  const role = id => (dim && DB.byId[id].dims[dim] ? (DB.byId[id].dims[dim] === 'primary' ? 'main dimension' : 'secondary dimension') : null);
  const cmpLink = id => {
    const text = () => (compareIds().includes(id) ? 'remove from compare' : 'add to compare');
    return h('a', { href: '#', onclick: e => { e.preventDefault(); toggleCompare(id); e.target.textContent = text(); } }, text());
  };
  const item = id => {
    const i = DB.byId[id];
    return h('li', {}, instLink(i), acr(i),
      h('div', { class: 'small' }, instTags(i, { allAges: band === ALL })),
      h('div', { class: 'small muted' }, [reporters(i), role(id)].filter(Boolean).join(' · '), ' · ', cmpLink(id)));
  };
  const othersList = h('ul', { hidden: true }, others.map(item));
  const toggle = h('a', { href: '#', class: 'small', onclick: e => { e.preventDefault(); othersList.hidden = !othersList.hidden; toggle.textContent = othersList.hidden ? 'show' : 'hide'; } }, 'show');
  openPanel(
    h('h3', {}, `${band} · ${DB.themeLabel(theme)} · ${dim ? DB.dimLabel(dim) : 'all analytical dimensions'}`),
    cell ? h('p', { class: 'small' }, tag(cell.colour.toLowerCase(), cell.colour), ' ', lowerFirst(MEANING[cell.colour].split(': ')[1]) + '.') : null,
    all.length === 0 ? h('p', { class: 'muted' }, 'No measure identified for this combination.') : [
      h('h3', {}, usableHeading(band, usable.length)),
      band === ALL && usable.some(id => allAgesOnly(DB).includes(id)) ? h('p', { class: 'small muted' }, 'With all ages combined, an instrument can meet the readiness criteria although its validation sample has no age band reported. It is then usable in no specific age band.') : null,
      usable.length ? h('ul', {}, usable.map(item)) : h('p', { class: 'muted small' }, `None meets all four readiness criteria for ${bandText(band)}.`),
      h('h3', { style: { marginTop: '14px' } }, `Others in use in this combination (${others.length}) `, others.length ? toggle : null),
      othersList,
      h('p', { class: 'row', style: { marginTop: '14px' } },
        csvButton('Download this list (CSV)', fileSafe(`SMEPH261_${band}_${theme}_${dim || 'all_dimensions'}.csv`), () => [
          ['Instrument', 'Acronym', 'Type', 'Meets all four readiness criteria here', 'Meets validation rule', 'Reporters', 'Usable in a survey', 'Sources using it'],
          ...all.map(id => { const i = DB.byId[id]; return [i.name, i.acronym, kindOf(i),
            usable.includes(id) ? 'Yes' : 'No', i.master ? i.master['Meets validation rule'] : 'No', reporters(i), i.master ? i.master['Usable in a survey (any use)'] : '', i.sources.length]; })]),
        h('a', { href: href('compare') }, 'Open compare'),
        cell && dim && band !== ALL && cell.ids.length && doorHref('instruments', { kind: ['Named instrument'], usable: [band], theme: [DB.themeLabel(theme)], covers: [DB.dimLabel(dim)] }, cell.ids.length)
          ? h('a', { href: doorHref('instruments', { kind: ['Named instrument'], usable: [band], theme: [DB.themeLabel(theme)], covers: [DB.dimLabel(dim)] }, cell.ids.length) }, 'Open in Explore') : null),
    ]);
}
