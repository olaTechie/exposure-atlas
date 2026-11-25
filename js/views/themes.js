import { h, put, fmt, pctf, pageHead, panelBox, relabel, href, doorHref } from '../ui.js';
import { gridTable } from '../tables.js';
import { renderMatrix, updateMatrix, legend, bandText } from '../matrix.js';
import { ALL } from '../logic.js';

const NO_THEME = 'Not linked to a health theme';
import { figureBox, bars, shadeGrid, modeSwitch, objectiveHead, countTo, tip, nOf } from '../figures.js';

export default function themes(el, params, DB) {
  let { band, theme } = DB.picker();
  const U = DB.themes.univariate, X = DB.themes.byDimension;
  const nMeasures = DB.funnel.Measures, nSources = DB.tables.sources.find(r => r.Characteristic === 'Source type').N;
  const order = [...DB.labels.bands, ALL];
  const sum = Object.fromEntries(DB.matrixSummary.map(r => [r['Age band'], r]));
  const G = 'Green (primary rule)', A = 'Amber (primary rule)';

  // ---- the matrix, which changes with the age band
  const nG = h('b', {}, '0'), nA = h('b', {}, '0'), nR = h('b', {}, '0');
  const bandName = h('b', {});
  const sentence = h('p', { class: 'mx-say', 'aria-live': 'polite' }, bandName, ': ', nG, ` of ${sum[band].Cells} combinations of health theme and analytical dimension have a validated instrument that can be used; `,
    nA, ' have instruments or methods in use but none that meets all four readiness criteria; ', nR, ' have no measure.');
  const bandBtns = order.map(b => {
    const r = sum[b];
    const btn = h('button', { class: 'band', type: 'button', onclick: () => { stop(); DB.setPicker({ band: b }); } },
      h('b', {}, b),
      h('span', { class: 'stack' }, h('i', { class: 's-green', style: { flexGrow: r[G] } }), h('i', { class: 's-amber', style: { flexGrow: r[A] } }), h('i', { class: 's-nored', style: { flexGrow: r.Red } })),
      h('small', {}, `${r[G]} of ${r.Cells}`));
    return tip(btn, () => ({ title: b === ALL ? 'All ages combined' : `Ages ${b.toLowerCase()}`, text: `${r[G]} green, ${r[A]} amber and ${r.Red} red of ${r.Cells} cells` }));
  });
  const matrixNode = renderMatrix(DB, band, { selTheme: theme });
  const play = h('button', { class: 'btn', type: 'button' }, 'Play through the age bands');
  let timer = null;
  // any press or key outside the play button stops the play, so it never overrides what the reader just did
  const onPress = e => { if (!play.contains(e.target)) stop(); };
  const listen = on => ['pointerdown', 'keydown'].forEach(t => document[on ? 'addEventListener' : 'removeEventListener'](t, onPress, true));
  function stop() { if (timer) { clearTimeout(timer); timer = null; } listen(false); play.textContent = 'Play through the age bands'; }
  play.addEventListener('click', () => {
    if (timer) return stop();
    const seq = DB.labels.bands; let k = 0;
    play.textContent = 'Stop'; listen(true);
    const step = () => { DB.setPicker({ band: seq[k] }); k += 1; timer = k < seq.length ? setTimeout(step, 1500) : (stop(), null); };
    step();
  });
  function showBand() {
    const r = sum[band];
    bandName.textContent = band === ALL ? 'All ages combined' : `Ages ${band.toLowerCase()}`;
    countTo(nG, r[G]); countTo(nA, r[A]); countTo(nR, r.Red);
    bandBtns.forEach((b, k) => b.setAttribute('aria-pressed', String(order[k] === band)));
    sens.forEach((li, k) => { li.style.fontWeight = sensOrder[k] === band ? 600 : ''; });
  }
  // one sentence per age band with the two sensitivity counts as text
  const sensOrder = [ALL, ...DB.labels.bands];
  const sens = sensOrder.map(b => { const r = sum[b]; return h('li', {},
    `${b === ALL ? 'All ages combined' : `Ages ${b.toLowerCase()}`}: ${r[G]} green, ${r[A]} amber and ${r.Red} red of ${r.Cells} cells. `,
    `Without the minimum-evidence condition ${r['Green without minimum-evidence condition']} would be green; if the main focus were also required, ${r['Green if main focus also required']}.`); });
  const matrix = h('section', { class: 'panelbox' },
    h('header', {}, h('span', { class: 't' }, 'Tailoring matrix by age band'), h('span', { class: 'note' }, 'unit: combinations of health theme and analytical dimension')),
    h('div', { class: 'in' }, sentence, h('div', { class: 'bands' }, bandBtns), h('p', {}, play),
      matrixNode, legend(),
      h('details', { class: 'more' }, h('summary', {}, 'The four readiness criteria behind a green cell'),
        h('p', {}, 'A cell is green when at least one validated exposure instrument linked to the health theme and covering the analytical dimension meets all four readiness criteria:'),
        h('ol', {},
          h('li', {}, 'it is validated with evidence from the age band;'),
          h('li', {}, 'it is usable in a survey (no app or device needed; 10 minutes or less, or completion time not reported);'),
          h('li', {}, 'it is available with the reporter for the age band;'),
          h('li', {}, 'it meets the minimum-evidence condition (validated in 2 or more sources, or at least one result rated sufficient with moderate or high GRADE quality).'))),
      h('details', { class: 'more' }, h('summary', {}, 'Cells by colour in each age band, with two sensitivity counts'), h('ul', {}, sens))));
  showBand();

  // the pathway a row belongs to, from its health theme label; rows that are not one of the seven themes come last
  const themeKey = Object.fromEntries(DB.labels.themes.map(t => [t.label, t.key]));
  const pathwayOf = label => { const p = DB.labels.pathways.find(x => x.themes.includes(themeKey[label])); return p ? p.label : null; };
  // ---- measures and sources by health theme
  const [kTheme, kMeasures, , kSources] = Object.keys(U[0]);
  const uniTable = () => gridTable(U, Object.keys(U[0]).map((k, n) => ({ key: k, num: n > 0, fmt: v => (k.startsWith('%') ? pctf(v) : typeof v === 'number' ? fmt(v) : v) })));
  const uniSlot = h('div', {});
  const drawUni = unit => uniSlot.replaceChildren(unit === 'measures'
    ? bars(U, { label: r => r[kTheme], n: r => r[kMeasures], N: () => nMeasures, unit: 'measures', group: r => pathwayOf(r[kTheme]) || NO_THEME, door: r => doorHref('measures', { theme: [r[kTheme]] }, r[kMeasures]) })
    : bars(U, { label: r => r[kTheme], n: r => r[kSources], N: () => nSources, unit: 'sources', group: r => pathwayOf(r[kTheme]) || NO_THEME, door: r => doorHref('sources', { theme: [r[kTheme]] }, r[kSources]) }));
  drawUni('measures');
  const uni = figureBox({ title: 'Measures and sources by health theme', note: 'a measure or source can be linked to several health themes, so categories overlap',
    figure: uniSlot, table: uniTable, extra: [modeSwitch([['measures', 'Measures'], ['sources', 'Sources']], 'measures', drawUni)] });

  // ---- health theme by main analytical dimension
  const xCols = Object.keys(X[0]), kTotal = xCols.at(-1);
  const gridCols = xCols.filter(k => k !== xCols[0] && k !== kTotal && !k.startsWith('Total'));
  const grid = shadeGrid(X, { rowKey: xCols[0], cols: gridCols, total: kTotal, colLabel: relabel, totalRow: r => /^All/.test(r[xCols[0]]), unit: 'measures', totalHead: 'Measures',
    rowGroup: r => (/^All/.test(r[xCols[0]]) ? null : pathwayOf(r[xCols[0]]) || NO_THEME),
    door: (r, c) => doorHref('measures', /^All/.test(r[xCols[0]]) ? { main: [c] } : { theme: [r[xCols[0]]], main: [c] }, r[c]) });
  const crossTable = () => gridTable(X, xCols.map((k, n) => ({ key: k, label: relabel(k), num: n > 0, fmt: v => (typeof v === 'number' ? fmt(v) : v) })),
    { rowClass: r => (/^(Total|All)/.test(r[xCols[0]]) ? 'total' : null) });
  const cross = figureBox({ title: 'Health theme by main analytical dimension', note: 'unit: measures linked to the theme, one main analytical dimension each; a measure can be linked to several themes',
    figure: grid.node, table: crossTable, extra: [modeSwitch([['share', 'Share of each row'], ['count', 'Number of measures']], 'share', grid.setMode)] });

  const gCols = Object.keys(DB.green[0]).filter(k => k !== 'id');
  const green = gridTable(DB.green, gCols.map(k => ({ key: k, num: typeof DB.green[0][k] === 'number',
    fmt: (v, r) => (k === 'Instrument' ? h('a', { href: href('instrument', { id: r.id }) }, v) : v) })));

  put(el,
    pageHead('Health themes', 'What is measured for each of the seven health themes, and where a validated exposure instrument can be used. A measure can be linked to several health themes.'),
    objectiveHead(DB.objectives.find(o => o.page === 'themes')),
    matrix,
    panelBox('Instruments behind the green cells', `${DB.green.length} instruments · unit: matrix cells filled`, green,
      h('div', { class: 'in' }, h('p', { class: 'note' }, `The green cells of the four age bands are filled by ${fmt(DB.funnel.usableInBand)} instruments; all ages combined counts ${fmt(DB.funnel.usableAllAges)}.`))),
    uni, cross);

  return {
    onPicker(p) { band = p.band; theme = p.theme; updateMatrix(matrixNode, DB, band, { selTheme: theme }); showBand(); },
    dispose() { if (timer) { clearTimeout(timer); timer = null; } listen(false); },
  };
}
