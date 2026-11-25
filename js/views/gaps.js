import { h, put, fill, fmt, pageHead, panelBox, href, tag, doorHref } from '../ui.js';
import { charBlock } from '../tables.js';
import { objectiveHead } from '../figures.js';

const PAGE = { overview: 'Overview', themes: 'Health themes', validated: 'Validated instruments', measured: 'How exposure is measured', sources: 'Sources', inventory: 'Instrument inventory' };

export default function gaps(el, params, DB) {
  const G = DB.gaps, LIMIT = 15;
  const countryList = h('div', { class: 'in' });
  const drawCountries = all => fill(countryList,
    h('p', {}, (all ? G.countries : G.countries.slice(0, LIMIT)).map(([c, n]) => h('span', { class: 'tag t-blue' }, `${c} ${n}`))),
    !all && G.countries.length > LIMIT ? h('a', { href: '#', onclick: e => { e.preventDefault(); drawCountries(true); } }, `Show all ${G.countries.length} countries`) : null,
    h('p', { class: 'note' }, 'Unit: sources. A source can report data from several countries, so the counts overlap.'));
  drawCountries(false);

  put(el,
    pageHead('Gaps', 'Gaps in the measurement landscape and the response each calls for. Where no measure exists, new instruments are needed. Far more often instruments exist but are untested, and the priority is to validate, compare and harmonise them.'),
    objectiveHead(DB.objectives.find(o => o.page === 'gaps')),
    panelBox('Gaps and the response each calls for', 'units as labelled in each row',
      h('div', { class: 'scroll' }, h('table', { class: 'data' },
        h('thead', {}, h('tr', {}, ['Gap', 'What is missing', 'Evidence from this review', 'Response'].map(t => h('th', {}, t)))),
        h('tbody', {}, G.rows.map(r => h('tr', {},
          h('td', {}, h('b', {}, r.gap)),
          h('td', {}, r.missing),
          h('td', {}, r.evidence, '. ', h('a', { href: href(r.link, r.params), class: 'small', title: PAGE[r.link] }, `See it in ${PAGE[r.link]}`),
            r.door && doorHref(r.door.tab, r.door.f, r.door.n) ? [' ', h('a', { href: doorHref(r.door.tab, r.door.f, r.door.n), class: 'small' }, `Open the ${fmt(r.door.n)} ${r.door.tab} in Explore`)] : null),
          h('td', {}, tag('green', r.response)))))))),
    h('div', { class: 'cols2' },
      charBlock(DB.tables.sources, 'Age band covered', { title: 'Sources by age band covered', unit: 'sources' }),
      charBlock(DB.tables.sources, 'WHO region', { title: 'Sources by WHO region', unit: 'sources' })),
    panelBox('Sources by country', `${fmt(G.countries.length)} countries`, countryList));
}
