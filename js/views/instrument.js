import { h, put, tag, instTags, join, itemsTime, csvButton, compareIds, toggleCompare, href, acr, panelBox, isValidated, DASH, dimList, themeText, reporters, fileSafe, plural } from '../ui.js';
import { gridTable } from '../tables.js';
import { notExposureText } from '../logic.js';
import { ageStrip } from '../figures.js';

const RATING_TAG = { Sufficient: 'green', Inconsistent: 'amber', Insufficient: 'red', Indeterminate: 'blue' };

export default function instrument(el, params, DB) {
  const i = Object.hasOwn(DB.byId, params.id ?? '') ? DB.byId[params.id] : null;
  if (!i) {
    put(el, h('h1', {}, 'Instrument not found'),
      h('p', { class: 'lede' }, 'This address does not match an instrument in the current data.'),
      h('a', { class: 'btn', href: href('inventory') }, 'Back to the inventory'));
    return;
  }
  const src = i.sources.map(id => ({ id, ...DB.sources[id] })).sort((a, b) => String(b.year || '').localeCompare(String(a.year || '')));
  const LIMIT = 12;
  const countries = h('span', {}, i.countries.length > LIMIT
    ? [i.countries.slice(0, LIMIT).join(', '), ' … ', h('a', { href: '#', onclick: e => { e.preventDefault(); countries.textContent = i.countries.join(', '); } }, `show all ${i.countries.length}`)]
    : join(i.countries));
  const label = () => (compareIds().includes(i.id) ? 'Remove from compare' : 'Add to compare');
  const cmpBtn = h('button', { class: 'btn ghost', onclick: () => { toggleCompare(i.id); cmpBtn.textContent = label(); } }, label());
  const kv = pairs => h('div', { class: 'kv' }, pairs.filter(Boolean).map(([k, v]) => [h('b', {}, k), h('span', {}, v == null || v === '' ? DASH : v)]));
  const usable = i.usableAt == null ? null
    : i.usableAt.length ? `Usable at ages ${i.usableAt.join(' and ')}: it meets all four conditions there.`
      : `Not usable in any age band: ${i.whyNot}.`;

  put(el,
    h('p', { class: 'small' }, h('a', { href: href('inventory') }, '← Instrument inventory')),
    h('div', { class: 'row' }, h('h1', {}, i.name, acr(i) ? h('span', { class: 'muted', style: { fontWeight: 400 } }, acr(i)) : null), h('span', { class: 'spacer' }), cmpBtn),
    h('div', { style: { margin: '4px 0 12px' } }, instTags(i)),
    i.level !== 'named' ? h('div', { class: 'banner' }, 'A type of study-specific items: questions written for individual studies, grouped by what they ask. Study-specific items are never validated.') : null,
    i.level === 'named' && notExposureText(i.construct) ? h('div', { class: 'banner' }, notExposureText(i.construct)) : null,
    usable ? h('div', { class: 'banner', style: i.usableAt.length ? { background: 'var(--t-green-bg)', color: 'var(--t-green)' } : { background: 'var(--t-red-bg)', color: 'var(--t-red)' } }, usable) : null,

    h('div', { class: 'cols2' },
      panelBox('What it measures and for whom', null, kv([
        ['Construct', i.construct],
        ['Analytical dimensions', dimList(i).length ? dimList(i).map(d => `${d.label} (${d.main ? 'main' : 'secondary'})`).join(', ') : 'not classified'],
        ['Health themes linked', themeText(i)],
        ['Ages used', [join(i.ages), ' ', ageStrip(i, DB)]],
        isValidated(i) ? ['Ages validated', i.validAges.length ? i.validAges.join(', ') : 'age band not reported'] : null,
        ['Reporter', reporters(i)],
        ['Measurement approach', join(i.approaches)],
        ['Items and completion time', itemsTime(i)],
        [`Countries (${i.countries.length})`, countries],
      ])),
      i.master ? panelBox('Use and evidence', 'from the master tables',
        kv(Object.entries(i.master).filter(([k]) => !['Instrument', 'Acronym', 'Construct'].includes(k)))) : null),

    i.level === 'named' ? panelBox('Rating per measurement property, pooled across studies', 'COSMIN · unit: results',
      isValidated(i) ? h('div', { class: 'in' }, h('p', {}, h('b', {}, 'Measurement properties with a result rated sufficient: '), i.sufficientProps.join(' · ') || 'none')) : null,
      h('div', { class: 'in' }, i.cosmin.filter(c => RATING_TAG[c.rating]).map(c => tag(RATING_TAG[c.rating], `${c.prop}: ${c.rating.toLowerCase()}`)),
        i.cosmin.some(c => RATING_TAG[c.rating]) ? null : h('span', { class: 'muted' }, 'No measurement property was assessed in the included sources.')),
      gridTable(i.cosmin, [
        { key: 'prop', label: 'Measurement property' }, { key: 'results', label: 'Results (n)', num: true }, { key: 'sources', label: 'Sources (n)', num: true },
        { key: 'rating', label: 'Rating against COSMIN criteria (pooled)' }, { key: 'rob', label: 'Risk of bias (best-rated study)' }],
      { rowClass: r => (r.rating === 'Not assessed' ? 'muted' : null) }),
      h('div', { class: 'in' }, h('p', { class: 'note' }, 'The pooled rating combines every result for the property. A single result rated sufficient and the pooled rating can therefore differ.'))) : null,

    panelBox(`Used in ${plural(src.length, 'source', 'sources')}`, null,
      gridTable(src, [
        { key: 'author', label: 'Source', fmt: (v, s) => `${s.author} ${s.year}` },
        { key: 'title', label: 'Title', fmt: (v, s) => [s.title, s.journal ? h('span', { class: 'muted' }, `. ${s.journal}`) : null,
          s.doi ? [' ', h('a', { href: 'https://doi.org/' + s.doi, target: '_blank', rel: 'noopener' }, 'DOI ↗')] : null] },
        { key: 'countries', label: 'Country', fmt: v => join(v) }, { key: 'ageGroups', label: 'Age bands', fmt: v => join(v) },
        { key: 'design', label: 'Design', fmt: v => v || 'not reported' }]),
      h('div', { class: 'in' }, csvButton('Download sources (CSV)', fileSafe(`SMEPH261_sources_${i.acronym || i.name}.csv`), () => [
        ['ID', 'Author', 'Year', 'Title', 'Journal', 'DOI', 'Countries', 'Age bands', 'Design', 'MMAT category', 'Reporting quality'],
        ...src.map(s => [s.id, s.author, s.year, s.title, s.journal, s.doi, s.countries.join('; '), s.ageGroups.join('; '), s.design, s.mmat, s.reporting])]))));
}
