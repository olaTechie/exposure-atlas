import { h, put, fmt, pageHead, panelBox, isValidated } from '../ui.js';

export default function downloads(el, params, DB) {
  const named = DB.instruments.filter(i => i.level === 'named').length;
  const FILES = [
    ['SMEPH261_instrument_inventory', 'Instrument inventory',
      `The ${fmt(named)} named instruments and ${fmt(DB.instruments.length - named)} types of study-specific items: measurement-property evidence, validation status, ages, reporters, analytical dimensions and health themes.`],
    ['SMEPH261_validated_instruments', 'Validated instruments',
      `The ${fmt(DB.instruments.filter(isValidated).length)} named instruments that meet the validation rule, with ages validated, reporters and the measurement properties with a result rated sufficient.`],
    ['SMEPH261_exposure_instruments', 'Validated exposure instruments',
      `The ${fmt(DB.exposure.length)} validated instruments that measure exposure: what each covers, and the age bands in which it meets all four conditions or the reason it meets them in none.`],
    ['SMEPH261_tailoring_matrix', 'Tailoring matrix, all age bands',
      'Every combination of health theme and analytical dimension for each age band: tools in use, validated instruments meeting the conditions, and cell colour with and without the minimum-evidence condition.'],
    ['SMEPH261_sources', 'Included sources',
      `The ${fmt(Object.keys(DB.sources).length)} included sources with country, age bands, design, quality appraisal category and the number of measures each contributes.`],
  ];
  put(el,
    pageHead('Downloads', 'The tables behind the hub, as CSV and Excel files. The lists shown on other pages can also be downloaded there as filtered.'),
    panelBox('Files', DB.meta.dataNote,
      h('div', { class: 'scroll' }, h('table', { class: 'data' },
        h('thead', {}, h('tr', {}, ['File', 'What it holds', 'Download'].map(t => h('th', {}, t)))),
        h('tbody', {}, FILES.map(([base, title, desc]) => h('tr', {},
          h('td', {}, h('b', {}, title)), h('td', {}, desc),
          h('td', { style: { whiteSpace: 'nowrap' } },
            h('a', { class: 'btn ghost', href: `downloads/${base}.csv`, download: '' }, 'CSV'), ' ',
            h('a', { class: 'btn ghost', href: `downloads/${base}.xlsx`, download: '' }, 'Excel')))))))));
}
