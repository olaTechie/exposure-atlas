import { h, store, go, href, closePanel, refreshCompareCount, bindDB } from './ui.js';
import { normalisePicker, safeRender, onlyPickerChanged, scrollPlan } from './logic.js';
import { hideTip } from './figures.js';
import { renderPicker } from './picker.js';
import overview from './views/overview.js';
import explore from './views/explore.js';
import inventory from './views/inventory.js';
import instrument from './views/instrument.js';
import compare from './views/compare.js';
import validated from './views/validated.js';
import measured from './views/measured.js';
import themes from './views/themes.js';
import gaps from './views/gaps.js';
import sources from './views/sources.js';
import downloads from './views/downloads.js';
import about from './views/about.js';

const VIEWS = { overview, explore, inventory, instrument, compare, validated, measured, themes, gaps, sources, downloads, about };
const view = document.getElementById('view');

let DB;
try {
  DB = await fetch('data/hub.json').then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
} catch (e) {
  view.replaceChildren(h('p', {}, 'The hub data could not be loaded. Rebuild them with build_data.py and reload this page.'));
  throw e;
}
DB.byId = Object.fromEntries(DB.instruments.map(i => [i.id, i]));
const labelOf = list => { const m = Object.fromEntries(list.map(x => [x.key, x.label])); return k => m[k] ?? k; };
DB.dimLabel = labelOf(DB.labels.dims);
DB.themeLabel = labelOf(DB.labels.themes);
bindDB(DB);

// the picker's choice: the address first, then what the browser stored, then the defaults
let current = { name: 'overview', params: {} };
let keepScroll = false;                // set when only the picker changed
let last = null;                       // the address last drawn: { path, params }
let handle = null;                     // what the page drawn last returned: { onPicker, dispose }, both optional
DB.picker = () => normalisePicker(current.params, store.get('picker', {}), DB);
DB.setPicker = next => {
  const p = { ...DB.picker(), ...next };
  store.set('picker', p);
  keepScroll = true;
  const target = href(current.name, { ...current.params, band: p.band, theme: p.theme });
  if (location.hash === target) route(); else location.hash = target;
};

document.getElementById('foot').replaceChildren(
  'SMEPH_261 scoping review for the Robert Koch Institute · ', DB.meta.dataNote, ' · ',
  h('a', { href: '#/about' }, 'Definitions and methods'));

function route() {
  const [path, query] = location.hash.replace(/^#\/?/, '').split('?');
  const name = Object.hasOwn(VIEWS, path) ? path : 'overview';
  const params = Object.fromEntries(new URLSearchParams(query || ''));
  current = { name, params };
  const next = { path: name, params };
  hideTip();                             // a tooltip never outlives the mark it belonged to
  // only the picker changed and the page can update itself: no redraw, so its figures can move
  if (handle && handle.onPicker && onlyPickerChanged(last, next)) {
    last = next; keepScroll = false;
    closePanel();
    renderPicker(document.getElementById('pickbar'), DB, name);
    if (safeRender(() => handle.onPicker(DB.picker()), e => console.error(e))) return;
  }
  if (handle && handle.dispose) safeRender(() => handle.dispose(), e => console.error(e));
  handle = null; last = next;
  document.querySelectorAll('#nav a[data-view]').forEach(a =>
    a.classList.toggle('on', a.dataset.view === name || (name === 'instrument' && a.dataset.view === 'inventory')));
  closePanel();
  renderPicker(document.getElementById('pickbar'), DB, name);
  const y = window.scrollY;
  view.replaceChildren();
  safeRender(() => { handle = VIEWS[name](view, params, DB) || null; }, e => {
    console.error(e);
    view.replaceChildren(h('h1', {}, 'This page could not be shown'),
      h('p', { class: 'lede' }, 'The hub data do not have the form this page expects. Rebuild them with build_data.py, run the tests, and reload.'),
      h('a', { class: 'btn', href: '#/overview' }, 'Back to the overview'));
  });
  const section = params.s && document.getElementById(params.s);
  const plan = scrollPlan({ section: !!section, keepScroll });
  if (plan === 'section') section.scrollIntoView({ block: 'start' }); else window.scrollTo(0, plan === 'keep' ? y : 0);
  keepScroll = false;
}
window.addEventListener('hashchange', route);
refreshCompareCount();
route();
