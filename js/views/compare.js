import { h, compareIds, toggleCompare, instLink, instLabel, csvButton, MAX_COMPARE, href, join, fill, pageHead, panelBox, isValidated, DASH, dimText, themeText, reporters, usableText } from '../ui.js';
import { primaryNote } from '../figures.js';
import { kindOf } from '../logic.js';

export default function compare(el, params, DB) {
  const m = (i, k) => (i.master ? i.master[k] : DASH);
  const ROWS = [
    ['Status', i => (i.level !== 'named' ? kindOf(i) : isValidated(i) ? 'Validated' : 'Not validated')],
    ['Construct', i => i.construct],
    ['COSMIN overall quality', i => m(i, 'COSMIN overall quality')],
    ['Validating sources', i => String(m(i, 'Validating sources'))],
    ['Usable in a survey', i => m(i, 'Usable in a survey (any use)')],
    ['Usable at (validated exposure instruments)', i => usableText(i) ?? DASH],
    ['Ages used', i => join(i.ages)],
    ['Ages validated', i => (i.validAges.length ? i.validAges.join(', ') : DASH)],
    ['Reporter', i => reporters(i)],
    ['Items', i => join(i.items)],
    ['Completion time (minutes)', i => join(i.burden)],
    ['Measurement properties with a result rated sufficient', i => (i.sufficientProps.length ? i.sufficientProps.join(', ') : 'none')],
    ['Analytical dimensions', i => dimText(i)],
    ['Health themes linked', i => themeText(i)],
    ['Countries (n)', i => String(i.countries.length)],
    ['Sources using it (n)', i => String(i.sources.length)],
  ];
  const draw = () => {
    const sel = compareIds().map(id => DB.byId[id]);
    const picker = h('select', { 'aria-label': 'Add an instrument', onchange: e => { if (e.target.value) { toggleCompare(e.target.value); draw(); } } },
      h('option', { value: '' }, sel.length >= MAX_COMPARE ? `Maximum ${MAX_COMPARE} instruments` : '+ Add an instrument…'),
      DB.instruments.filter(i => !sel.includes(i)).slice().sort((a, b) => a.name.localeCompare(b.name)).map(i => h('option', { value: i.id }, instLabel(i))));
    picker.disabled = sel.length >= MAX_COMPARE;
    fill(el,
      pageHead('Compare instruments', `Choose 2 to ${MAX_COMPARE} instruments here, from the inventory or from a matrix cell. Rows that differ are highlighted.`),
      primaryNote(),
      h('div', { class: 'row', style: { margin: '0 0 10px' } }, picker, h('span', { class: 'spacer' }),
        sel.length ? csvButton('Download comparison (CSV)', 'SMEPH261_comparison.csv', () => [['', ...sel.map(instLabel)], ...ROWS.map(([l, f]) => [l, ...sel.map(f)])]) : null),
      sel.length < 2 ? h('p', { class: 'note' }, sel.length ? 'Add at least one more instrument to compare. ' : 'No instruments selected yet. ',
        h('a', { href: href('validated') }, 'Pick from the validated instruments →')) : null,
      sel.length ? panelBox('Side by side', `${sel.length} instruments`, h('div', { class: 'scroll' }, h('table', { class: 'data' },
        h('thead', {}, h('tr', {}, h('th', { style: { width: '200px' } }), sel.map(i => h('th', {}, i.acronym || i.name)))),
        h('tbody', {},
          h('tr', {}, h('td', {}, h('b', {}, 'Instrument')), sel.map(i => h('td', {}, instLink(i), ' ',
            h('a', { href: '#', class: 'small', onclick: e => { e.preventDefault(); toggleCompare(i.id); draw(); } }, '(remove)')))),
          ROWS.map(([l, f]) => { const vals = sel.map(f); return h('tr', { class: sel.length > 1 && new Set(vals).size > 1 ? 'diff' : '' }, h('td', {}, h('b', {}, l)), vals.map(v => h('td', {}, v))); }))))) : null);
  };
  draw();
}
