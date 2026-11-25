// Explore: filters that combine over the measures, the instruments and the sources.
// Every count comes from logic.js, which counts rows by the categories the master tables put on them.
import { h, fmt, pctf, href, instLink, acr, csvDownload, fileSafe, compareIds, toggleCompare, go, pageHead, DASH, plural, isValidated } from '../ui.js';
import { EXPLORE_TABS, exploreState, formatExplore, exploreMatches, exploreHeadline, facetCounts, linkedIds, rowHas, filtersFromLabels, kindOf, exploreRows, ALL } from '../logic.js';

const TAB_LABEL = { measures: 'Measures', instruments: 'Instruments', sources: 'Sources' };
const PAGE = 40;

export default function explore(el, params, DB) {
  let S = exploreState(params, DB), shown = PAGE;
  const filtersOf = tab => DB.explore[tab];
  const cats = (tab, key) => filtersOf(tab).find(x => x.key === key).cats;
  const named = () => filtersFromLabels(DB, 'instruments', { kind: ['Named instrument'] });
  const has = f => Object.values(f || {}).some(v => v.length);

  const tabsEl = h('div', { class: 'ex-tabs', role: 'group', 'aria-label': 'What to explore' }), startsEl = h('div', { class: 'ex-starts' });
  const facetsEl = h('div', { class: 'ex-facets' }), sumEl = h('p', { class: 'ex-sum', 'aria-live': 'polite', tabindex: '-1' });
  const chipsEl = h('div', { class: 'ex-chips' }), table = h('table', { class: 'data' }), moreEl = h('div', { class: 'in' });
  // on a narrow screen the filters fold away, so the result is not pushed off the screen
  const filtersBox = h('details', { class: 'ex-filters' }, h('summary', {}, 'Filters'), facetsEl);
  filtersBox.open = !(typeof matchMedia === 'function' && matchMedia('(max-width: 760px)').matches);
  const tabBtns = EXPLORE_TABS.map(t => {
    const b = h('button', { class: 'pill', type: 'button', 'aria-pressed': 'false' }, `${TAB_LABEL[t]} ${fmt(t === 'instruments' ? DB.funnel['Named instruments'] : exploreRows(DB, t).length)}`);
    if (t === 'instruments') b.title = 'Named instruments. Named tracking systems and types of study-specific items can be added with the Kind filter.';
    b.addEventListener('click', () => open(t, t === 'instruments' ? named() : {}));
    return b;
  });
  tabsEl.append(...tabBtns);
  let facetNodes = [];                     // [{filter, rows: [{btn, cnt, fill}]}] for the tab now shown

  // ---- starting views: ready-made questions, given by label so they follow the data
  const bands = DB.labels.bands, dim = k => DB.labels.dims.find(d => d.key === k).label;
  const reporter = filtersOf('measures').find(x => x.key === 'reporter').cats;
  const starts = [
    [`Validated instruments usable at ${bands[2]}`, 'instruments', { kind: ['Named instrument'], validated: ['Yes'], usable: [bands[2]] }],
    [`Content exposure measured at ages ${bands[1]}`, 'measures', { covers: [dim('content')], band: [bands[1]] }],
    ['Digital-trace measures', 'measures', { group: ['Digital-trace'] }],
    [`Parent-reported measures in sources covering ages ${bands[0].toLowerCase()}`, 'measures', { reporter: reporter.filter(c => /^Parent/.test(c)), band: [bands[0]] }],
  ].map(([label, tab, labels]) => [label, tab, filtersFromLabels(DB, tab, labels)]).filter(x => x[2]);
  const picker = DB.picker();
  const fromPicker = filtersFromLabels(DB, 'instruments', { kind: ['Named instrument'], usable: picker.band === ALL ? bands : [picker.band], ...(picker.theme ? { theme: [DB.themeLabel(picker.theme)] } : {}) });
  if (fromPicker) starts.push([`Usable ${picker.band === ALL ? 'in an age band' : `at ${picker.band}`}${picker.theme ? ` for ${DB.themeLabel(picker.theme).toLowerCase()}` : ''} (the choice made on the other pages)`, 'instruments', fromPicker]);

  function set(next, push = false) { S = { ...S, ...next }; shown = PAGE; history[push ? 'pushState' : 'replaceState'](null, '', href('explore', formatExplore(S, DB))); }
  function open(tab, f, mf = null) { set({ tab, f, mf }, true); buildFacets(); draw(); }

  // ---- filters: built once per tab, then only their numbers, bars and pressed state change
  function buildFacets() {
    const F = filtersOf(S.tab), total = exploreRows(DB, S.tab).length;
    const node = filter => {
      const rows = filter.cats.map((c, k) => {
        const cnt = h('span', { class: 'cnt' }), fill = h('span', { class: 'fil' });
        const btn = h('button', { class: 'ex-row', type: 'button', 'aria-pressed': 'false' }, h('span', { class: 'lab' }, c), cnt, h('span', { class: 'trk' }, fill));
        btn.addEventListener('click', () => {
          const now = new Set(S.f[filter.key] || []); now.has(k) ? now.delete(k) : now.add(k);
          const f = { ...S.f, [filter.key]: [...now].sort((a, b) => a - b) }; if (!f[filter.key].length) delete f[filter.key];
          set({ f }); draw();
        });
        return { btn, cnt, fill };
      });
      const note = [filter.overlap ? 'can be several' : '', filter.N !== total ? `of ${fmt(filter.N)}` : ''].filter(Boolean).join(' · ');
      const box = h('div', { class: 'ex-facet', role: 'group', 'aria-label': filter.title }, h('h3', {}, h('span', {}, filter.title), note ? h('small', {}, note) : null), rows.map(r => r.btn));
      return { filter, rows, box };
    };
    facetNodes = F.map(node);
    const more = facetNodes.filter(n => !n.filter.open);
    const details = h('details', { class: 'ex-more' }, h('summary', {}, `${more.length} more filters`), more.map(n => n.box));
    if (more.some(n => (S.f[n.filter.key] || []).length)) details.open = true;
    facetsEl.replaceChildren(...facetNodes.filter(n => n.filter.open).map(n => n.box), more.length ? details : '');
  }

  function draw() {
    const had = document.activeElement, key = had && had.dataset ? had.dataset.fk : null, within = had && el.contains(had);
    paint();
    if (!within || document.activeElement === had && had.isConnected) return;
    const again = key ? [...el.querySelectorAll('[data-fk]')].find(x => x.dataset.fk === key) : null;
    (again || sumEl).focus();
  }
  function paint() {
    const rows = exploreMatches(DB, S.tab, S.f, S.mf), head = exploreHeadline(DB, S.tab, S.f, S.mf);
    // tabs
    tabBtns.forEach((b, k) => b.setAttribute('aria-pressed', String(EXPLORE_TABS[k] === S.tab)));
    // filters
    for (const { filter, rows: R } of facetNodes) {
      const n = facetCounts(DB, S.tab, S.f, filter.key, S.mf), top = Math.max(1, ...n), picked = S.f[filter.key] || [];
      R.forEach((r, k) => {
        r.cnt.textContent = fmt(n[k]); r.fill.style.width = `${100 * n[k] / top}%`;
        r.btn.classList.toggle('on', picked.includes(k)); r.btn.classList.toggle('zero', !n[k]);
        r.btn.setAttribute('aria-pressed', String(picked.includes(k)));
        r.btn.setAttribute('aria-label', `${filter.cats[k]}: ${fmt(n[k])} ${S.tab}${picked.includes(k) ? ', chosen' : ''}`);
      });
    }
    // headline, with the way from measures to their sources and instruments
    const pivot = [];
    if (S.tab === 'measures' && has(S.f)) {
      const src = linkedIds(DB, 'sources', S.f).size, linked = [...linkedIds(DB, 'instruments', S.f)].map(id => DB.byId[id].level);
      const ins = linked.filter(l => l === 'named').length, sys = linked.filter(l => l === 'system').length;
      const link = (text, tab, f) => { const b = h('button', { class: 'ex-link', type: 'button' }, text); b.addEventListener('click', () => { open(tab, f, S.f); sumEl.focus(); }); return b; };
      const kinds = [ins ? link(plural(ins, 'named instrument', 'named instruments'), 'instruments', named()) : null,
        sys ? link(plural(sys, 'named tracking system', 'named tracking systems'), 'instruments', filtersFromLabels(DB, 'instruments', { kind: ['Named tracking system'] })) : null].filter(Boolean);
      pivot.push(' in ', link(plural(src, 'source', 'sources'), 'sources', {}), ...(kinds.length ? [', using ', kinds[0], ...(kinds[1] ? [' and ', kinds[1]] : [])] : [', all with study-specific items']));
    }
    sumEl.replaceChildren(h('b', {}, `${fmt(head.n)} of ${fmt(head.N)} ${head.unit}`), h('small', {}, ` (${pctf(head.N ? head.n / head.N : 0)})`, ...pivot));
    // chips
    const chips = [];
    if (S.mf) {
      const text = Object.entries(S.mf).map(([key, v]) => v.map(k => cats('measures', key)[k]).join(' or ')).join('; ');
      const c = h('button', { class: 'ex-chip via', type: 'button', 'data-fk': 'chip:via', title: 'Remove this link to the measures' }, h('b', {}, 'With at least one measure matching:'), ` ${text} ×`);
      c.addEventListener('click', () => { set({ mf: null }); draw(); }); chips.push(c);
    }
    for (const { filter } of facetNodes) for (const k of S.f[filter.key] || []) {
      const c = h('button', { class: 'ex-chip', type: 'button', 'data-fk': `chip:${filter.key}:${k}`, title: 'Remove this filter' }, h('b', {}, `${filter.title.split(/[,(:]/)[0].trim()}:`), ` ${filter.cats[k]} ×`);
      c.addEventListener('click', () => { const f = { ...S.f, [filter.key]: S.f[filter.key].filter(x => x !== k) }; if (!f[filter.key].length) delete f[filter.key]; set({ f }); draw(); });
      chips.push(c);
    }
    if (chips.length) {
      const clear = h('button', { class: 'ex-link', type: 'button', 'data-fk': 'clear' }, 'Clear all'); clear.addEventListener('click', () => { set({ f: {}, mf: null }); draw(); });
      const copy = h('button', { class: 'ex-link', type: 'button', 'data-fk': 'copy' }, 'Copy link to this view');
      copy.addEventListener('click', () => { const done = () => { copy.textContent = 'Link copied'; }; (navigator.clipboard ? navigator.clipboard.writeText(location.href).then(done, () => { copy.textContent = 'Copy the address from the address bar'; }) : (copy.textContent = 'Copy the address from the address bar')); });
      chips.push(clear, copy);
    }
    chipsEl.replaceChildren(...(chips.length ? chips : [h('span', { class: 'muted small' }, 'No filter chosen: everything is shown.')]));
    // rows
    const label = (key, r) => rowHas(r, S.tab, key).map(k => cats(S.tab, key)[k]).join('; ') || DASH;
    const inst = id => { const i = DB.byId[id]; return [instLink(i), acr(i)]; };
    const cmp = compareIds();
    const COLS = {
      measures: [['Source', r => `${DB.sources[r.s].author} ${DB.sources[r.s].year}`], ['Instrument or trace metric', r => inst(r.i)], ['Measurement approach', r => label('approach', r)],
        ['Main analytical dimension', r => label('main', r)], ['Health theme', r => label('theme', r)]],
      instruments: [['', r => { const box = h('input', { type: 'checkbox', 'data-fk': `cmp:${r.id}`, 'aria-label': `Compare ${r.name}` }); box.checked = cmp.includes(r.id);
        box.addEventListener('change', () => { if (!toggleCompare(r.id)) box.checked = false; draw(); }); return box; }],
      ['Instrument', r => inst(r.id)], ['Kind', r => kindOf(r)], ['Construct', r => r.construct], ['Meets the validation rule', r => (r.level === 'named' ? (isValidated(r) ? 'Yes' : 'No') : DASH)],
      ['Usable at', r => (r.usableAt && r.usableAt.length ? r.usableAt.join(', ') : DASH)], ['Sources', r => fmt(r.sources.length), true]],
      sources: [['Source', r => `${r.author} ${r.year}`], ['Title', r => [r.title, r.doi ? [' ', h('a', { href: 'https://doi.org/' + r.doi, target: '_blank', rel: 'noopener' }, 'DOI')] : null]],
        ['Country', r => r.countries.join(', ') || 'not reported'], ['Age bands', r => r.ageGroups.join(', ') || 'not reported'], ['Measures', r => fmt(r.nMeasures), true]],
    }[S.tab];
    table.replaceChildren(h('thead', {}, h('tr', {}, COLS.map(([t, , num]) => h('th', { class: num ? 'n' : null }, t)))),
      h('tbody', {}, rows.length ? rows.slice(0, shown).map(r => h('tr', {}, COLS.map(([, cell, num]) => h('td', { class: num ? 'n' : null }, cell(r)))))
        : h('tr', {}, h('td', { colspan: COLS.length, class: 'muted' }, 'Nothing matches these filters together. Remove one to widen the view.'))));
    // below the rows
    const moreBtn = rows.length > shown ? h('button', { class: 'btn ghost', type: 'button', 'data-fk': 'more' }, `Show ${Math.min(PAGE, rows.length - shown)} more (${fmt(rows.length - shown)} left)`) : null;
    if (moreBtn) moreBtn.addEventListener('click', () => { shown += PAGE; draw(); });
    const csv = h('button', { class: 'btn ghost', type: 'button', 'data-fk': 'csv' }, 'Download this selection (CSV)');
    csv.addEventListener('click', () => {
      const F = filtersOf(S.tab), lead = { measures: [['Source ID', r => r.s], ['Source', r => `${DB.sources[r.s].author} ${DB.sources[r.s].year}`], ['Instrument or trace metric', r => DB.byId[r.i].name]],
        instruments: [['Instrument', r => r.name], ['Acronym', r => r.acronym], ['Sources using it', r => r.sources.length]],
        sources: [['Source ID', r => r.id], ['Author', r => r.author], ['Year', r => r.year], ['Title', r => r.title], ['DOI', r => r.doi]] }[S.tab];
      csvDownload(fileSafe(`SMEPH261_explore_${S.tab}.csv`), [[...lead.map(x => x[0]), ...F.map(x => x.title)],
        ...rows.map(r => [...lead.map(x => x[1](r)), ...F.map(x => rowHas(r, S.tab, x.key).map(k => x.cats[k]).join('; '))])]);
    });
    const compareBtn = S.tab === 'instruments' ? h('button', { class: 'btn', type: 'button', 'data-fk': 'compare', disabled: cmp.length < 2 }, `Compare selected (${cmp.length})`) : null;
    if (compareBtn) compareBtn.addEventListener('click', () => go('compare'));
    moreEl.replaceChildren(h('div', { class: 'row' }, moreBtn, rows.length ? csv : null, compareBtn,
      h('span', { class: 'muted small' }, rows.length && !moreBtn ? `All ${fmt(rows.length)} shown.` : '')));
  }

  startsEl.replaceChildren(h('span', {}, 'Start from a question:'), ...starts.map(([label, tab, f]) => { const b = h('button', { type: 'button' }, label); b.addEventListener('click', () => open(tab, f)); return b; }));
  el.append(...pageHead('Explore', 'Combine filters to narrow the measures, the instruments or the sources. The number beside each category is how many rows have it among those the other filters leave. ',
      'Every category is one the review assigned; the address holds the view, so it can be sent to someone.').filter(Boolean),
    tabsEl, startsEl,
    h('div', { class: 'ex-cols' }, filtersBox, h('div', {}, sumEl, chipsEl, h('section', { class: 'panelbox' }, h('div', { class: 'scroll' }, table), moreEl))));
  buildFacets(); draw();
}
