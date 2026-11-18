import { h, put, fmt, tabs, instLink, acr, csvButton, pageHead, panelBox, isValidated, DASH, dimList, reporters, usableTag, usableText, tag, plural } from '../ui.js';
import { pickerMatch, ALL } from '../logic.js';
import { gridTable } from '../tables.js';
import { figureBox, stacks, ageStrip, ageStripKey, objectiveHead } from '../figures.js';

const RATING_CLS = { Sufficient: 's-green', Inconsistent: 's-amber', Insufficient: 's-red', Indeterminate: 's-mid', 'Not assessed': 's-none' };
const SEG = ['s-1', 's-2', 's-3', 's-other'];

export default function validated(el, params, DB) {
  const { band, theme } = DB.picker();
  const F = DB.funnel;
  const all = DB.instruments.filter(isValidated);
  const nNamed = DB.instruments.filter(i => i.level === 'named').length;
  // construct groups, with their counts from the master funnel
  const GROUPS = [
    ['', 'All', all.length],
    ['exposure', 'Exposure', F['Validated: exposure']],
    ['problematic', 'Problematic use', F['Validated: problematic use']],
    ['other', 'Other constructs', F['Validated: other constructs']],
  ];
  const groupOf = i => (i.usableAt != null ? 'exposure' : /problematic/i.test(i.construct) ? 'problematic' : 'other');
  let group = GROUPS.some(g => g[0] === params.group) ? params.group : '';

  const pillBar = h('span', {}), status = h('p', { class: 'small', style: { margin: '0 0 8px' } }), tbody = h('tbody');
  const dims = i => dimList(i).map(d => (d.main ? h('div', {}, d.label) : h('div', { class: 'muted' }, `${d.label} (secondary)`)));
  let rows = [];
  function draw() {
    pillBar.replaceChildren(tabs(GROUPS.map(g => g[0]), group, v => { group = v; draw(); }, v => { const g = GROUPS.find(x => x[0] === v); return `${g[1]} ${g[2]}`; }));
    rows = all.filter(i => (!group || groupOf(i) === group) && pickerMatch(i, band, theme));
    const narrowed = band !== ALL || theme;
    status.textContent = `Showing ${fmt(rows.length)} of ${fmt(all.length)} validated instruments.` +
      (narrowed ? ` The picker keeps those used at ${band === ALL ? 'any age' : `ages ${band.toLowerCase()}`}${theme ? ` and linked to ${DB.themeLabel(theme).toLowerCase()}` : ''}.` : '');
    tbody.replaceChildren(...(rows.length ? rows.map(i => h('tr', {},
      h('td', {}, i.acronym ? [h('b', {}, h('a', { href: instLink(i).getAttribute('href') }, i.acronym)), h('div', { class: 'muted small' }, i.name)] : h('b', {}, instLink(i))),
      h('td', { class: 'small' }, i.construct),
      h('td', { class: 'small' }, dims(i)),
      h('td', {}, ageStrip(i, DB), h('div', { class: 'small muted' }, i.validAges.length ? `validated at ${i.validAges.join(', ')}` : 'age band not reported')),
      h('td', { class: 'small' }, reporters(i)),
      h('td', { class: 'small' }, i.sufficientProps.join(' · ') || DASH),
      h('td', { class: 'n' }, i.master['Validating sources']),
      h('td', {}, usableTag(i) ?? h('span', { class: 'muted' }, DASH))))
      : [h('tr', {}, h('td', { colspan: 8, class: 'muted' }, 'No validated instrument matches this choice. Widen the picker or the construct.'))]));
  }

  // ---- objective 3: how far the named instruments have been tested, property by property
  const CS = DB.cosminSummary, kProp = 'Measurement property', kN = Object.keys(CS[0]).find(k => k.startsWith('Named instruments')), kAssessed = Object.keys(CS[0]).find(k => k.startsWith('Assessed'));
  const csCols = Object.keys(CS[0]).filter(k => !k.startsWith('Risk of bias'));
  const properties = figureBox({ title: 'Measurement properties of the named instruments', note: `N = ${fmt(CS[0][kN])} named instruments in every bar · categories do not overlap`,
    figure: h('div', {}, stacks(CS, { label: r => r[kProp], keys: DB.labels.ratings.map(k => ({ key: k, label: k, cls: RATING_CLS[k] || 's-mid' })),
      total: r => r[kN], unit: 'named instruments', value: r => `${fmt(r[kAssessed])} assessed` }),
    h('p', { class: 'note' }, 'Each bar is all the named instruments. For each measurement property an instrument has one rating against the COSMIN criteria, pooled across its results, or it was not assessed in any included source.')),
    table: () => gridTable(CS, csCols.map((k, n) => ({ key: k, num: n > 0, fmt: v => (typeof v === 'number' ? fmt(v) : v) }))) });

  // ---- objective 4: who reports, by age band
  const repRows = DB.tables.measures.filter(r => r.Characteristic.startsWith('Main reporter, measures in sources covering ages'));
  const repChars = [...new Set(repRows.map(r => r.Characteristic))], repCats = [...new Set(repRows.map(r => r.Category))];
  const byBand = repChars.map((c, k) => { const rs = repRows.filter(r => r.Characteristic === c);
    return { band: DB.labels.bands[k] ?? c, N: rs[0].N, ...Object.fromEntries(rs.map(r => [r.Category, r.n])) }; });
  const reporterFig = figureBox({ title: 'Who reports, by age band', note: 'unit: measures in sources covering the age band · one main reporter per measure, so categories do not overlap',
    figure: h('div', {}, stacks(byBand, { label: r => r.band, keys: repCats.map((k, n) => ({ key: k, label: k, cls: SEG[n] || 's-other' })), total: r => r.N, unit: 'measures', value: r => `N = ${fmt(r.N)}` }),
    h('p', { class: 'note' }, 'A source that covers several age bands counts in each, so the four bars overlap with each other. The bars are the same length whatever the N, which is given at the right.')),
    table: () => gridTable(byBand, [{ key: 'band', label: 'Age band' }, ...repCats.map(k => ({ key: k, num: true, fmt: v => fmt(v ?? 0) })), { key: 'N', label: 'Measures (N)', num: true, fmt: v => fmt(v) }]) });
  const obj = n => objectiveHead(DB.objectives.find(o => o.n === n));

  put(el,
    pageHead('Validated instruments',
      `${fmt(all.length)} of the ${fmt(nNamed)} named instruments meet the validation rule: at least one reliability-type and one validity-type measurement property with a result rated sufficient (COSMIN) in a sample aged 0 to 17. Unit: instruments.`),
    obj(3), properties,
    obj(4), reporterFig,
    h('h2', { class: 'list-head' }, 'The validated instruments'),
    h('div', { class: 'filters' }, pillBar, h('span', { class: 'spacer' }),
      csvButton('Download CSV', 'SMEPH261_validated_shown.csv', () => [
        ['Instrument', 'Acronym', 'Construct', 'Analytical dimensions covered', 'Ages validated', 'Reporter',
          'Measurement properties with a result rated sufficient (COSMIN)', 'Validating studies', 'Usable at (validated exposure instruments)'],
        ...rows.map(i => [i.name, i.acronym, i.construct, dimList(i).map(d => `${d.label}${d.main ? '' : ' (secondary)'}`).join('; '), i.validAges.join('; '),
          reporters(i), i.sufficientProps.join('; '), i.master['Validating sources'], usableText(i) ?? ''])])),
    status,
    panelBox('Validated instruments', 'one row per instrument',
      h('div', { class: 'scroll' }, h('table', { class: 'data' },
        h('thead', {}, h('tr', {}, ['Instrument', 'Construct', 'Analytical dimensions covered', 'Age bands', 'Reporter',
          'Measurement properties with a result rated sufficient (COSMIN)'].map(t => h('th', {}, t)), h('th', { class: 'n' }, 'Validating studies'), h('th', {}, 'Usable at'))),
        tbody)),
      h('div', { class: 'in' },
        ageStripKey(),
        h('p', { class: 'note' }, h('b', {}, 'Usable at '), 'is given for the instruments that measure exposure: the age bands in which the instrument meets all four conditions, or the reason it meets them in none.'),
        h('p', { class: 'note' }, h('b', {}, 'Problematic-use scales are not exposure measures. '),
          'They ask about symptoms of problematic use, such as loss of control or conflict, and not about how long, on which platforms, why, in what context or with what content young people use social media. They are therefore not counted in the tailoring matrix.'),
        h('p', { class: 'note' }, `${fmt(F['Validated in a single study'])} of the ${fmt(F['Meet the validation rule'])} validated instruments rest on a single validating study.`))));
  draw();
}
