import { h, put, fmt, tabs, instTags, instLink, acr, csvButton, compareIds, toggleCompare, go, pageHead, panelBox, isValidated, DASH, dimText, themeText, reporters, usableText } from '../ui.js';
import { inventoryMatch, ALL, kindOf } from '../logic.js';
import { gridTable } from '../tables.js';
import { figureBox, bars, ageStrip, ageStripKey, objectiveHead, primaryNote } from '../figures.js';

const COLS = [
  ['Construct', i => i.construct],
  ['Sources using it', i => i.sources.length, true],
  ['Measures', i => i.nMeasures, true],
  ['Measurement-property evidence', i => i.master?.['Any measurement-property evidence']],
  ['COSMIN overall quality', i => i.master?.['COSMIN overall quality']],
  ['Validating sources', i => i.master?.['Validating sources'], true],
  ['Meets minimum-evidence condition', i => i.master?.['Meets minimum-evidence condition']],
  ['Self-report version', i => i.master?.['Self-report version']],
  ['Parent version', i => i.master?.['Parent version']],
  ['Usable in a survey', i => i.master?.['Usable in a survey (any use)']],
  ['Completion time reported', i => i.master?.['Completion time reported']],
];
const show = v => (v == null || v === '' ? DASH : v);

export default function inventory(el, params, DB) {
  const { band, theme } = DB.picker();
  const named = DB.instruments.filter(i => i.level === 'named');
  const nSystems = DB.instruments.filter(i => i.level === 'system').length;
  const nGeneric = DB.instruments.length - named.length - nSystems;
  const F = { q: params.q || '', generic: params.all === '1', construct: params.construct || '' };
  const constructs = [...new Set(DB.instruments.map(i => i.construct))].sort((a, b) => a.localeCompare(b));
  if (F.construct && !constructs.includes(F.construct)) F.construct = '';
  const byDefault = DB.funnel.usableByDefault;

  const match = i => inventoryMatch(i, F, band, theme, DB);

  const pillBar = h('span', {});
  const status = h('div', { class: 'row small', style: { margin: '0 0 8px' } });
  const tbody = h('tbody');
  const drawPills = () => pillBar.replaceChildren(tabs(['', ...constructs], F.construct, v => { F.construct = v; draw(); }, v => v || 'All constructs'));

  function drawRows() {
    const rows = DB.instruments.filter(match);
    const pool = F.generic ? DB.instruments.length : named.length;
    const cmp = compareIds();
    const narrowed = band !== ALL || theme;
    status.replaceChildren(
      h('span', {}, `Showing ${fmt(rows.length)} of ${fmt(pool)} ${F.generic ? 'named instruments, named tracking systems and types of study-specific items' : 'named instruments'}.`,
        narrowed ? ` The picker keeps those used at ${band === ALL ? 'any age' : `ages ${band.toLowerCase()}`}${theme ? ` and linked to ${DB.themeLabel(theme).toLowerCase()}` : ''}.` : ''),
      h('span', { class: 'spacer' }),
      h('button', { class: 'btn', disabled: cmp.length < 2, onclick: () => go('compare') }, `Compare selected (${cmp.length})`),
      csvButton('Download CSV', 'SMEPH261_inventory_shown.csv', () => [
        ['Instrument', 'Acronym', 'Type', ...COLS.map(c => c[0]), 'Usable at (validated exposure instruments)', 'Ages used', 'Ages validated', 'Reporters', 'Analytical dimensions', 'Health themes'],
        ...rows.map(i => [i.name, i.acronym, kindOf(i), ...COLS.map(c => c[1](i) ?? ''),
          usableText(i) ?? '', i.ages.join('; '), i.validAges.join('; '), reporters(i), dimText(i), themeText(i)])]));
    tbody.replaceChildren(...(rows.length ? rows.map(i => h('tr', {},
      h('td', {}, h('input', { type: 'checkbox', checked: cmp.includes(i.id), title: 'Add to compare', 'aria-label': `Compare ${i.name}`,
        onchange: e => { if (!toggleCompare(i.id)) e.target.checked = false; drawRows(); } })),
      h('td', {}, instLink(i), acr(i) ? h('span', { class: 'muted' }, acr(i)) : null, h('div', {}, instTags(i))),
      h('td', {}, ageStrip(i, DB)),
      COLS.map(([, f, num]) => h('td', { class: num ? 'n' : 'small' }, show(f(i))))))
      : [h('tr', {}, h('td', { colspan: COLS.length + 3, class: 'muted' }, 'No instrument matches this choice. Widen the picker, the construct or the search.'))]));
  }
  function draw() { drawPills(); drawRows(); }

  // ---- objective 3: the most used named instruments
  const kUse = 'Sources using it', nSources = Object.keys(DB.sources).length, TOP = 15;
  const ranked = [...named].sort((a, b) => b.master[kUse] - a.master[kUse] || a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
  const rankSlot = h('div', {}), moreBtn = h('button', { class: 'fig-switch', type: 'button' });
  let showAll = false;
  const drawRank = () => {
    rankSlot.replaceChildren(bars(showAll ? ranked : ranked.slice(0, TOP), { label: i => i.name + acr(i), n: i => i.master[kUse], N: () => nSources, unit: 'sources', scale: 'max',
      mark: i => (isValidated(i) ? 'validated' : null), onPick: i => go('instrument', { id: i.id }) }));
    moreBtn.textContent = showAll ? `Show the ${TOP} most used` : `Show all ${fmt(ranked.length)}`;
  };
  moreBtn.addEventListener('click', () => { showAll = !showAll; drawRank(); });
  drawRank();
  const mostUsed = figureBox({ title: 'The most used named instruments', note: `unit: sources using the instrument, of ${fmt(nSources)} sources · a source can use several instruments`,
    figure: h('div', {}, rankSlot, h('p', { class: 'note' }, `Of the ${fmt(named.length)} named instruments, ${fmt(DB.funnel['Named instruments used in one source'])} are used in a single source. `,
      'Bar lengths compare the instruments with each other. This figure shows every named instrument, whatever the picker is set to. Select a bar to open the instrument.')),
    table: () => gridTable(ranked, [{ key: 'name', label: 'Instrument', fmt: (v, i) => instLink(i) }, { key: 'acronym', label: 'Acronym' },
      { key: 'n', label: 'Sources using it', num: true, fmt: (v, i) => fmt(i.master[kUse]) }, { key: 'v', label: 'Meets the validation rule', fmt: (v, i) => (isValidated(i) ? 'Yes' : 'No') }]),
    extra: [moreBtn] });

  put(el,
    pageHead('Instrument inventory',
      `The inventory holds ${fmt(named.length)} named instruments, ${fmt(nSystems)} named tracking systems and ${fmt(nGeneric)} types of study-specific items, from ${fmt(Object.keys(DB.sources).length)} sources.`),
    primaryNote(),
    objectiveHead(DB.objectives.find(o => o.n === 3)), mostUsed,
    h('h2', { class: 'list-head' }, 'All instruments'),
    h('div', { class: 'filters' },
      h('input', { type: 'search', placeholder: 'Search name, acronym, health theme, country…', value: F.q, 'aria-label': 'Search the inventory',
        oninput: e => { F.q = e.target.value; drawRows(); } }),
      pillBar,
      h('label', { class: 'small' }, h('input', { type: 'checkbox', checked: F.generic, onchange: e => { F.generic = e.target.checked; draw(); } }),
        ` Include the ${fmt(nSystems)} named tracking systems and ${fmt(nGeneric)} types of study-specific items`)),
    status,
    panelBox('Instruments', 'one row per instrument',
      h('div', { class: 'scroll' }, h('table', { class: 'data' },
        h('thead', {}, h('tr', {}, h('th', {}), h('th', {}, 'Instrument'), h('th', {}, 'Age bands'), COLS.map(([l, , num]) => h('th', { class: num ? 'n' : null }, l)))),
        tbody)),
      h('div', { class: 'in' }, ageStripKey(), h('p', { class: 'note' },
        '"Usable in a survey" is the feasibility condition only: no app or device is needed, and completion takes 10 minutes or less or the time was not reported. ',
        `Of the ${fmt(DB.instruments.filter(isValidated).length)} validated instruments, ${fmt(byDefault)} meet it only because no completion time was reported. `,
        'It is not the same as "usable at" an age band, which needs all four readiness criteria.'))));
  draw();
}
