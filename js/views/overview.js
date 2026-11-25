import { h, put, fmt, tag, panelBox, instLink, acr, reporters, dimList, plural, lowerFirst, setCompare, go, href, doorHref } from '../ui.js';
import { usableIds, noneExplain, allAgesOnly, choiceText, agesText, ALL, funnelTable, stepCounts } from '../logic.js';
import { gridTable } from '../tables.js';
import { renderMatrix, updateMatrix, openCellPanel, legend, bandText } from '../matrix.js';
import { dotField, primaryNote } from '../figures.js';

const short = i => i.acronym || i.name;

// The answer for the picker's choice: the usable instruments, or why there is none.
function answerCard(DB, band, theme) {
  const F = DB.funnel;
  const ids = usableIds(DB, band, theme);
  const themeText = theme ? lowerFirst(DB.themeLabel(theme)) : 'any health theme';
  const bands = band === ALL ? DB.labels.bands : [band];
  const themes = theme ? [theme] : DB.labels.themes.map(t => t.key);
  const emptyDims = DB.labels.dims.filter(d => !bands.some(b => themes.some(t => DB.matrix[b][t][d.key].ids.length)));
  const allOnly = allAgesOnly(DB).map(id => DB.byId[id]);
  const seeAll = theme
    ? h('button', { class: 'btn', onclick: () => openCellPanel(DB, band, theme, null) }, 'See everything in use')
    : h('a', { class: 'btn', href: href('inventory') }, 'See everything in use');
  let answer;
  if (ids.length) {
    answer = h('section', { class: 'ans' },
      h('h3', {}, `${plural(ids.length, 'validated instrument is', 'validated instruments are')} usable ${choiceText(band, themeText, true)}`,
        h('span', { class: 'acts' },
          ids.length > 1 ? h('button', { class: 'btn ghost', onclick: () => { setCompare(ids); go('compare'); } }, 'Compare these') : null, seeAll)),
      h('div', { class: 'cards' }, ids.map(id => {
        const i = DB.byId[id], n = i.master['Validating sources'];
        return h('div', { class: 'icard' }, h('b', {}, instLink(i), acr(i)),
          dimList(i).map(d => tag('blue', d.label, d.main ? 'Main dimension' : 'Secondary dimension')),
          tag('blue', reporters(i)), tag(n === 1 ? 'amber' : 'blue', `validated in ${plural(n, 'study', 'studies')}`),
          band === ALL ? tag('green', `usable at ${i.usableAt.join(', ')}`) : null);
      })),
      emptyDims.length ? h('p', {}, `No usable instrument for ${emptyDims.map(d => lowerFirst(d.label)).join(' or ')} for this choice.`) : null,
      band === ALL && allOnly.length ? h('p', {},
        `The matrix below is for all ages combined, which also counts ${allOnly.map(i => `${short(i)} (${i.whyNot})`).join(' and ')}: `,
        `${fmt(F.usableAllAges)} instruments in all, against ${fmt(F.usableInBand)} usable in a specific age band.`) : null);
  } else {
    const { elsewhere, reasons } = noneExplain(DB, band, theme);
    answer = h('section', { class: 'ans none' },
      h('h3', {}, `No instrument is usable ${choiceText(band, themeText, false)}`, h('span', { class: 'acts' }, seeAll)),
      h('p', {}, 'No validated exposure instrument meets all four readiness criteria for this choice.',
        elsewhere.length ? ` For other health themes, ${plural(elsewhere.length, 'instrument is', 'instruments are')} usable ${band === ALL ? 'in at least one age band' : `at ${agesText(band)}`}: ${elsewhere.map(id => short(DB.byId[id])).join(', ')}.` : '',
        reasons.length ? ' Validated exposure instruments that are usable in no age band:' : ''),
      reasons.length ? h('ul', {}, reasons.map(r => h('li', {}, instLink(DB.byId[r.id]), acr(DB.byId[r.id]), `: ${r.why}.`))) : null,
      h('p', {}, h('a', { href: href('gaps') }, 'See the gaps and the response each calls for →')));
  }

  return answer;
}

export default function overview(el, params, DB) {
  const F = DB.funnel;
  const nSources = DB.tables.sources.find(r => r.Characteristic === 'Source type').N;
  let { band, theme } = DB.picker();

  const stepsTable = () => {
    const T = funnelTable(DB), link = r => h('a', { href: href('instrument', { id: r.id }) }, r.name + (r.acronym && !r.name.includes(`(${r.acronym})`) ? ` (${r.acronym})` : ''));
    return h('div', {},
      gridTable(T.steps, [{ key: 'label', label: 'Step' }, { key: 'n', label: 'Named instruments still in', num: true, fmt: v => fmt(v) }]),
      h('h3', {}, `The ${fmt(T.usable.length + T.dropped.length)} validated instruments that measure exposure`),
      gridTable([...T.usable, ...T.dropped], [{ key: 'name', label: 'Instrument', fmt: (v, r) => link(r) },
        { key: 'at', label: 'Usable in an age band', fmt: (v, r) => (r.at ? `Yes: ${r.at.join(', ')}` : `No: ${r.why}`) }]));
  };
  const n = stepCounts(DB), named = 'Named instrument', exposure = (DB.instruments.find(i => i.usableAt != null) || {}).construct;
  const stepLabels = [{ kind: [named] }, { kind: [named], evidence: ['At least one result'] }, { kind: [named], validated: ['Yes'] },
    { kind: [named], validated: ['Yes'], construct: [exposure] }, { kind: [named], usable: DB.labels.bands }];
  const field = dotField(DB, { picker: { band, theme }, onOpen: id => go('instrument', { id }), table: stepsTable, door: s => doorHref('instruments', stepLabels[s], n[s]) });
  field.node.append(h('p', { class: 'note' }, 'Usable in an age band: validated with evidence from the band, usable in a survey, ',
    'available with the reporter for the band, and meeting the minimum-evidence condition. ', h('a', { href: href('about') }, 'Definitions')));

  const answerSlot = h('div', {}, answerCard(DB, band, theme));

  const questions = h('section', { class: 'block' },
    h('h2', {}, 'Seven questions the review answers'),
    h('p', { class: 'sub' }, "The review's seven secondary objectives, each with its short answer and the page that shows it."),
    h('ol', { class: 'q' }, DB.objectives.map(o => h('li', {}, h('a', { href: href(o.page, { s: o.section }) },
      h('span', { class: 'k' }, o.n), h('span', { class: 't' }, o.question), h('span', { class: 'a' }, o.answer),
      h('span', { class: 'p' }, PAGE[o.page]))))));

  const matrixNode = renderMatrix(DB, band, { selTheme: theme });
  const mTitle = h('span', {}), mNote = h('span', {});
  const matrix = panelBox(mTitle, mNote, h('div', { class: 'in' }, matrixNode, legend(),
    h('p', { class: 'note' }, h('a', { href: href('themes') }, 'The matrix in every age band, with the four readiness criteria'))));
  const labelMatrix = () => {
    const r = DB.matrixSummary.find(x => x['Age band'] === band);
    mTitle.textContent = `Tailoring matrix · ${bandText(band)}`;
    mNote.textContent = `${r['Green (primary rule)']} of ${r.Cells} cells green`;
  };
  labelMatrix();

  put(el,
    h('div', { class: 'ttl' }, h('h1', {}, 'Which instruments could go into a survey of children and adolescents?')),
    h('p', { class: 'lede' }, `The review found ${fmt(F.Measures)} measures in ${fmt(nSources)} sources. They rest on ${fmt(F['Named instruments'])} named instruments, `,
      `${fmt(DB.instruments.filter(i => i.level === 'system').length)} named tracking systems and study-specific items. Step through what happens to the named instruments.`),
    primaryNote(),
    field.node, answerSlot, questions, matrix);

  return {
    onPicker(p) {
      band = p.band; theme = p.theme;
      field.setPicker(p);
      answerSlot.replaceChildren(answerCard(DB, band, theme));
      updateMatrix(matrixNode, DB, band, { selTheme: theme });
      labelMatrix();
    },
    dispose: field.dispose,
  };
}

const PAGE = { measured: 'How measured', inventory: 'Inventory', validated: 'Validated', themes: 'Health themes', gaps: 'Gaps' };
