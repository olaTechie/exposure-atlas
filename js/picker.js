// The picker bar: age band, health theme and search. The choice is kept in the address and in the browser.
import { h, go, fill, store } from './ui.js';
import { ALL, searchTarget } from './logic.js';

export const USES_PICKER = new Set(['overview', 'themes', 'inventory', 'validated']);
export const NO_PICKER = new Set(['downloads', 'about', 'explore']);
const DOES = {
  overview: 'The picker sets the age band of the matrix and the health theme of the answer below.',
  themes: 'The picker sets the age band of the tailoring matrix and highlights the health theme.',
  inventory: 'The picker keeps the instruments used at this age and linked to this health theme.',
  validated: 'The picker keeps the instruments used at this age and linked to this health theme.',
};

let closeMenu = null;
document.addEventListener('click', () => closeMenu && closeMenu());
document.addEventListener('keydown', e => { if (e.key === 'Escape' && closeMenu) closeMenu(); });

export function renderPicker(el, DB, viewName) {
  el.hidden = NO_PICKER.has(viewName);
  if (el.hidden) return;
  const active = USES_PICKER.has(viewName);
  el.classList.toggle('dim', !active);
  const { band, theme } = DB.picker();

  const menu = h('div', { class: 'menu', hidden: true },
    [['', 'Any health theme'], ...DB.labels.themes.map(t => [t.key, t.label])].map(([key, label]) =>
      h('button', { class: key === theme ? 'on' : '', onclick: () => DB.setPicker({ theme: key }) }, label)));
  closeMenu = () => { menu.hidden = true; };
  const themeBtn = h('button', { class: 'pill' + (theme ? ' on' : ''), 'aria-haspopup': 'true',
    onclick: e => { e.stopPropagation(); menu.hidden = !menu.hidden; } }, (theme ? DB.themeLabel(theme) : 'Any health theme') + ' ▾');

  fill(el,
    h('div', { class: 'ctl' },
      h('span', { class: 'choice ctl', inert: !active, 'aria-disabled': active ? null : 'true' },
        h('span', { class: 'lab' }, 'Age band'),
        [ALL, ...DB.labels.bands].map(b => h('button', { class: 'pill' + (b === band ? ' on' : ''), tabindex: active ? null : '-1', onclick: () => DB.setPicker({ band: b }) }, b)),
        h('span', { class: 'lab' }, 'Health theme'),
        h('span', { class: 'menuwrap' }, themeBtn, menu)),
      h('form', { onsubmit: e => { e.preventDefault(); const t = searchTarget(e.target.q.value); store.set('picker', t.picker); go(t.view, t.params); } },
        h('input', { name: 'q', type: 'search', placeholder: 'Search all instruments…', 'aria-label': 'Search all instruments', title: 'Searches every instrument and sets the picker to all ages and any health theme' }))),
    h('p', { class: 'does' }, active ? DOES[viewName] : 'The picker does not change this page.'));
}
