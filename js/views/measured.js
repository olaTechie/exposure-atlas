import { h, put, fmt, pctf, tabs, pageHead, panelBox, plural, relabel } from '../ui.js';
import { charTable, gridTable } from '../tables.js';
import { figureBox, bars, stacks, shadeGrid, modeSwitch, objectiveHead } from '../figures.js';

const APPROACH = { EMA: 'Ecological momentary assessment' };
const SEG = ['s-1', 's-2', 's-3', 's-other'];

export default function measured(el, params, DB) {
  const T = DB.tables.measures, X = DB.measured;
  const nMeasures = DB.funnel.Measures;
  const obj = n => objectiveHead(DB.objectives.find(o => o.n === n));
  const block = start => { const rs = T.filter(r => r.Characteristic.startsWith(start)); if (!rs.length) throw new Error(`The master tables hold no rows for "${start}"`); return rs; };

  // ---- objective 1: main analytical dimension, or every dimension a measure covers
  const main = block('Main analytical dimension (one per measure)'), cover = block('Analytical dimension covered');
  const nDims = DB.labels.dims.length, nCats = DB.labels.mainCats.length;
  const dimFig = h('div', {}), dimTable = h('div', {}), dimNote = h('p', { class: 'note' });
  const drawDims = mode => {
    const rs = mode === 'main' ? main : cover;
    dimFig.replaceChildren(bars(rs, { label: r => r.Category, n: r => r.n, N: r => r.N, unit: 'measures',
      rule: mode === 'main' ? { before: nDims, text: 'Not analytical dimensions' } : null }));
    dimTable.replaceChildren(charTable(rs));
    dimNote.textContent = mode === 'main'
      ? `Each measure sits in one category, so the categories do not overlap and sum to ${fmt(nMeasures)}. ${nDims} of the ${nCats} categories are the analytical dimensions. The other ${nCats - nDims} are not dimensions: `
        + 'measures with more than one main dimension; problematic-use symptom scales, which measure a construct and not a dimension of exposure; other constructs; and exposure measures whose items the source does not describe.'
      : `Categories overlap: one measure can cover several analytical dimensions, as its main focus or a secondary one. Counted this way the ${fmt(nMeasures)} measures make ${fmt(X.pairs)} pairs of measure and analytical dimension.`;
  };
  drawDims('main');
  const dims = figureBox({ title: 'What the measures capture', note: `N = ${fmt(nMeasures)} measures`, figure: dimFig, table: () => dimTable, foot: h('div', { class: 'in' }, dimNote),
    extra: [modeSwitch([['main', 'One main dimension per measure'], ['cover', 'Every dimension a measure covers']], 'main', drawDims)] });

  // ---- objective 2: dimension by approach, approach by reporter, agreement
  const approachCols = Object.keys(X.dimApproach[0]).filter(k => k !== 'Main dimension' && k !== 'Total');
  const isAll = r => /^All/.test(r['Main dimension']);
  const grid = shadeGrid(X.dimApproach.filter(r => !/^Total/.test(r['Main dimension'])), { rowKey: 'Main dimension', cols: approachCols, total: 'Total',
    rowLabel: relabel, colLabel: c => APPROACH[c] || c, totalRow: isAll, unit: 'measures', totalHead: 'Measures' });
  const cell = (v, r) => [fmt(v), h('span', { class: 'sub' }, r.Total ? pctf(v / r.Total) : '')];
  const dimApproachTable = () => gridTable(X.dimApproach, [
    { key: 'Main dimension', label: 'Main analytical dimension', fmt: v => relabel(v) },
    ...approachCols.map(k => ({ key: k, label: APPROACH[k] || k, num: true, fmt: cell })),
    { key: 'Total', num: true, fmt: v => fmt(v) }],
  { rowClass: r => (/^(Total|All)/.test(r['Main dimension']) ? 'total' : null) });
  const dimApproach = figureBox({ title: 'Main analytical dimension by measurement approach', note: `N = ${fmt(nMeasures)} measures · categories do not overlap`,
    figure: h('div', {}, grid.node, h('p', { class: 'note' }, 'Each row is the measures with that main analytical dimension; each cell is the part of the row using the approach. Point at a cell, or move to it with the arrow keys, to read it.')),
    table: dimApproachTable, extra: [modeSwitch([['share', 'Share of each row'], ['count', 'Number of measures']], 'share', grid.setMode)] });

  const repCols = Object.keys(X.approachReporter[0]).filter(k => k !== 'Approach' && !k.startsWith('Measures'));
  const kN = Object.keys(X.approachReporter[0]).find(k => k.startsWith('Measures'));
  const reporterTable = () => gridTable(X.approachReporter, [{ key: 'Approach', label: 'Measurement approach', fmt: v => APPROACH[v] || v },
    ...[kN, ...repCols].map(k => ({ key: k, num: true, fmt: v => fmt(v) }))], { rowClass: r => (/^(Total|All)/.test(r.Approach) ? 'total' : null) });
  const approachReporter = figureBox({ title: 'Measurement approach and who reports', note: 'unit: measures · one main reporter per measure, so categories do not overlap',
    figure: h('div', {}, stacks(X.approachReporter, { label: r => APPROACH[r.Approach] || r.Approach, keys: repCols.map((k, n) => ({ key: k, label: k, cls: SEG[n] || 's-other' })),
      total: r => r[kN], unit: 'measures', value: r => plural(r[kN], 'measure', 'measures') }),
    h('p', { class: 'note' }, 'Each bar is the measures using one approach, divided by main reporter. The bars are the same length whatever the number of measures, which is given at the right.')),
    table: reporterTable });

  // agreement: the comparisons as a table that the comparator pills filter
  const comps = X.comparisons;
  const types = [...new Set(comps.map(c => c['Compared with']))].sort((a, b) => comps.filter(c => c['Compared with'] === b).length - comps.filter(c => c['Compared with'] === a).length);
  const nSources = new Set(comps.map(c => c.Study_ID)).size;
  let type = '';
  const pillBar = h('span', {}), compBody = h('div', {});
  const drawComps = () => {
    pillBar.replaceChildren(tabs(['', ...types], type, v => { type = v; drawComps(); },
      v => (v ? `${v} ${comps.filter(c => c['Compared with'] === v).length}` : `All ${comps.length}`)));
    compBody.replaceChildren(gridTable(comps.filter(c => !type || c['Compared with'] === type), [
      { key: 'Source' }, { key: 'Measure' }, { key: 'Compared with' }, { key: 'Statistic type', label: 'Statistic' }, { key: 'Result' }, { key: 'Direction' }]));
  };
  drawComps();
  const agreement = panelBox('Agreement between ways of measuring', `${plural(comps.length, 'comparison', 'comparisons')} in ${plural(nSources, 'source', 'sources')}`,
    h('div', { class: 'in' }, h('div', { class: 'filters', style: { margin: 0 } }, h('span', { class: 'small muted' }, 'Compared with'), pillBar)),
    compBody,
    h('div', { class: 'in' }, h('p', { class: 'note' }, 'Unit: comparisons reported by the sources, one row each, in the statistic the source used. The results are listed and not pooled.')));
  agreement.id = 'agreement';

  // ---- objective 5: content exposure
  const C = X.content, kType = 'Content type', kM = Object.keys(C[0]).find(k => k.startsWith('Measures')), kS = Object.keys(C[0]).find(k => k.startsWith('Sources'));
  const kU = Object.keys(C[0]).find(k => k.startsWith('Usable in a survey')), kV = 'Validated exposure instruments';
  const allC = C.find(r => /^All/.test(r[kType])), types5 = C.filter(r => r !== allC);
  const contentCols = Object.keys(C[0]);
  const contentTable = () => gridTable(C, contentCols.map((k, n) => ({ key: k, num: n > 0 && k !== kV,
    fmt: v => (k.endsWith('(%)') ? pctf(v) : typeof v === 'number' ? fmt(v) : v) })), { rowClass: r => (/^All/.test(r[kType]) ? 'total' : null) });
  const content = figureBox({ title: 'Content exposure by type of content', note: `N = ${fmt(allC[kM])} measures covering content · a measure can cover several content types, so categories overlap`,
    figure: h('div', {}, bars(types5, { label: r => r[kType], n: r => r[kM], N: () => allC[kM], unit: 'measures covering content',
      sub: r => `${pctf(r[kU])} usable in a survey${r[kV] && r[kV] !== 'none' ? `; validated exposure instruments: ${r[kV]}` : ''}` }),
    h('p', { class: 'note' }, `${fmt(allC[kM])} measures in ${fmt(allC[kS])} sources cover content; ${pctf(allC[kU])} of them are usable in a survey (no app or device needed; 10 minutes or less, or completion time not reported). `,
      allC[kV] && allC[kV] !== 'none' ? `Validated exposure instruments that cover content: ${allC[kV]}.` : 'No validated exposure instrument covers content.')),
    table: contentTable });

  put(el,
    pageHead('How exposure is measured',
      `The ${fmt(nMeasures)} measures by what they capture, by measurement approach and reporter, how far different ways of measuring agree, and how content exposure is captured.`),
    obj(1), dims,
    obj(2), dimApproach, approachReporter, agreement,
    obj(5), content);
}
