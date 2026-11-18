// Page rules with no DOM, so they can be tested with Node (test_logic.mjs).
// These only select and combine what hub.json holds; they compute no review number of their own.

export const ALL = 'All ages';
export const DEFAULT_BAND = '11–14';

const byName = DB => (a, b) => DB.byId[a].name.localeCompare(DB.byId[b].name, 'en', { sensitivity: 'base' });
const themeKeys = DB => DB.labels.themes.map(t => t.key);
const dimKeys = DB => DB.labels.dims.map(d => d.key);

// Picker values: the address first, then what the browser stored, then the defaults. theme '' means any health theme.
export function normalisePicker(params, stored, DB) {
  const p = params || {}, s = stored || {};
  const okBand = b => b === ALL || DB.labels.bands.includes(b);
  const okTheme = t => t === '' || themeKeys(DB).includes(t);
  const band = okBand(p.band) ? p.band : okBand(s.band) ? s.band : DEFAULT_BAND;
  const theme = typeof p.theme === 'string' && okTheme(p.theme) ? p.theme : typeof s.theme === 'string' && okTheme(s.theme) ? s.theme : '';
  return { band, theme };
}

// Instruments usable in the age band for the health theme: the union of the matrix cells' instruments.
// With "All ages" this is the union over the four age bands, not the all-ages-combined matrix.
export function usableIds(DB, band, theme) {
  const bands = band === ALL ? DB.labels.bands : [band];
  const themes = theme ? [theme] : themeKeys(DB);
  const ids = new Set();
  for (const b of bands) for (const t of themes) for (const k of dimKeys(DB)) for (const id of DB.matrix[b][t][k].ids) ids.add(id);
  return [...ids].sort(byName(DB));
}

// Tools in one matrix cell, or in the whole row when dim is null. "All ages" reads the all-ages-combined matrix.
export function cellTools(DB, band, theme, dim) {
  const cells = (dim ? [dim] : dimKeys(DB)).map(k => DB.matrix[band][theme][k]);
  const usable = [...new Set(cells.flatMap(c => c.ids))].sort(byName(DB));
  const others = [...new Set(cells.flatMap(c => c.tools))].filter(id => !usable.includes(id)).sort(byName(DB));
  return { usable, others };
}

// Validated exposure instruments that are usable in no age band, with the reason, where the reason applies to this band.
export function noneReasons(DB, band) {
  return DB.instruments
    .filter(i => i.whyNot && (band === ALL || i.validAges.length === 0 || i.validAges.includes(band)))
    .map(i => ({ id: i.id, why: i.whyNot }));
}

// Lists (Inventory, Validated): keep instruments used at this age and linked to this health theme.
export function pickerMatch(inst, band, theme) {
  return (band === ALL || inst.ages.includes(band)) && (!theme || inst.themes.includes(theme));
}

export function validCompareIds(ids, DB) {
  return Array.isArray(ids) ? ids.filter(id => Object.hasOwn(DB.byId, id)) : [];
}

// A fraction from the master tables as a whole per cent, written as the manuscript writes it:
// below 0.5% is "<1%", and an exact half rounds to the even number (as Python's format does).
export function pctf(f) {
  if (f !== 0 && f < 0.005) return '<1%';
  const v = 100 * f;
  let r = Math.round(v);
  if (Math.abs(v - Math.trunc(v)) === 0.5 && r % 2 !== 0) r -= 1;
  return r + '%';
}

// "ages under 8", "ages 11–14"
export const agesText = band => `ages ${band.charAt(0).toLowerCase()}${band.slice(1)}`;
// the choice as it reads in the answer card; some = at least one instrument is usable
export const choiceText = (band, themeText, some) =>
  `${band === ALL ? (some ? 'in at least one age band' : 'in any age band') : `at ${agesText(band)}`} for ${themeText}`;

// Instruments the all-ages-combined matrix counts although they are usable in no age band.
export function allAgesOnly(DB) {
  const inBands = new Set(usableIds(DB, ALL, ''));
  const all = new Set();
  for (const t of themeKeys(DB)) for (const k of dimKeys(DB)) for (const id of DB.matrix[ALL][t][k].ids) all.add(id);
  return [...all].filter(id => !inBands.has(id)).sort(byName(DB));
}
// heading of the first list in the drill-down panel
export const usableHeading = (band, n) => (band === ALL ? `Meet the conditions with all ages combined (${n})` : `Usable instruments (${n})`);

// When nothing is usable for the choice: either instruments are usable at this age for other health themes,
// or none is usable at this age at all and the reasons are given.
export function noneExplain(DB, band, theme) {
  const elsewhere = theme ? usableIds(DB, band, '') : [];
  return { elsewhere, reasons: elsewhere.length ? [] : noneReasons(DB, band) };
}

// The search box in the picker bar looks in every instrument, so it clears the picker.
export const searchTarget = q => ({ view: 'inventory', params: { q: String(q).trim(), all: '1', band: ALL }, picker: { band: ALL, theme: '' } });

// Inventory rows kept for the filters F = {q, generic, construct} and the picker.
export function inventoryMatch(i, F, band, theme, DB) {
  if (!F.generic && i.level !== 'named') return false;
  if (!pickerMatch(i, band, theme)) return false;
  if (F.construct && i.construct !== F.construct) return false;
  if (F.q) {
    const label = Object.fromEntries(DB.labels.themes.map(t => [t.key, t.label]));
    const hay = [i.name, i.acronym, ...i.themes.map(t => label[t]), ...i.countries].join(' ').toLowerCase();
    if (!hay.includes(F.q.toLowerCase())) return false;
  }
  return true;
}

export function notExposureText(construct) {
  if (construct === 'Exposure') return '';
  const what = construct === 'Other' ? 'another construct' : construct.toLowerCase();
  return `This instrument measures ${what}, not exposure, so it is not counted in the tailoring matrix.`;
}

// Run a page; if it throws, hand the error to onError instead of leaving a blank page.
export function safeRender(render, onError) {
  try { render(); return true; } catch (e) { onError(e); return false; }
}

// ---------------------------------------------------------------- figures that respond
// How far a named instrument gets on the way from "named" to "usable in an age band":
// 0 no measurement-property evidence; 1 evidence, validation rule not met; 2 validated, not an exposure instrument;
// 3 validated exposure instrument usable in no age band; 4 usable in at least one age band.
export function reach(i) {
  const m = i.master || {};
  if (m['Any measurement-property evidence'] !== 'Yes') return 0;
  if (m['Meets validation rule'] !== 'Yes') return 1;
  if (i.usableAt == null) return 2;
  return i.usableAt.length ? 4 : 3;
}
// Named instruments in the order the dots are drawn: those that get furthest first, then by name.
export function dotOrder(DB) {
  return DB.instruments.filter(i => i.level === 'named')
    .sort((a, b) => reach(b) - reach(a) || a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
}
// Instruments still in at each of the five steps.
export function stepCounts(DB) {
  const r = dotOrder(DB).map(reach);
  return [0, 1, 2, 3, 4].map(s => r.filter(x => x >= s).length);
}
// What a dot shows. Steps 0 to 3: in or out. Step 4: the instruments usable in an age band stay ('use'); those usable
// for the picker's choice are marked ('pick'); with all ages chosen, the ones that qualify only combined get a ring.
export function dotState(i, step, picker, DB) {
  const r = reach(i);
  if (step < 4) return r >= step ? 'in' : 'out';
  if (r === 4) return usableIds(DB, picker.band, picker.theme).includes(i.id) ? 'pick' : 'use';
  return picker.band === ALL && allAgesOnly(DB).includes(i.id) ? 'combined' : 'out';
}
// One sentence on where an instrument stops, for its dot.
export function stopReason(i, DB) {
  const r = reach(i);
  if (r === 0) return 'No measurement-property evidence was reported in the included sources.';
  if (r === 1) return 'Tested, but it does not meet the validation rule.';
  if (r === 2) return `Validated, but it measures ${i.construct === 'Other' ? 'another construct' : i.construct.toLowerCase()}, not exposure.`;
  if (r === 3) return `Validated exposure instrument, usable in no age band: ${i.whyNot}.`
    + (allAgesOnly(DB).includes(i.id) ? ' It meets the conditions only with all ages combined.' : '');
  return `Usable at ${i.usableAt.join(' and ')}: it meets all four conditions.`;
}
// The Overview opens on its last step when movement is unwanted or the reader has already seen the steps play.
export const startStep = (calm, seen) => (calm || seen ? 4 : 0);

export const share = (n, N) => (N ? n / N : 0);
// Depth of a shaded cell, 0 to 100: nothing for zero, and a square-root scale so small values stay visible.
export function shade(v, max) {
  if (!v || !max) return 0;
  return Math.min(100, 8 + Math.round(92 * Math.sqrt(Math.min(1, v / max))));
}
// Text colour on a shade: light text on the deep shades only.
export const inkOn = p => (p > 52 ? 'light' : 'dark');

// Arrow-key movement inside a figure laid out in rows of `cols` marks. A move that would leave the figure stays put.
export function rove(index, key, count, cols) {
  const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -cols, ArrowDown: cols }[key];
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  if (step === undefined) return index;
  const next = index + step;
  return next < 0 || next >= count ? index : next;
}

// True when two addresses differ only in the picker's choice, so the page can update in place.
export function onlyPickerChanged(prev, next) {
  if (!prev || !next || prev.path !== next.path) return false;
  const rest = p => JSON.stringify(Object.entries(p || {}).filter(([k]) => k !== 'band' && k !== 'theme').sort());
  return rest(prev.params) === rest(next.params);
}

// The number shown part-way through a count from one value to another. k is the progress: at or below 0 the old
// value, at or above 1 the new one, never outside the two.
export function countFrame(from, to, k) {
  const p = Math.max(0, Math.min(1, k));
  return Math.round(from + (to - from) * (1 - (1 - p) ** 3));
}

// Where the page goes after it is drawn. A picker change keeps the reader where they are, even on an address that
// names a section; otherwise a named section is scrolled to, and a new page starts at the top.
export const scrollPlan = ({ section, keepScroll }) => (keepScroll ? 'keep' : section ? 'section' : 'top');

// The five steps of the Overview, and the table that stands behind its dots: the count at each step, the validated
// exposure instruments usable in an age band, and those usable in none with the reason.
export const STEP_LABELS = ['Named instruments', 'Any measurement-property evidence', 'Meet the validation rule', 'Measure exposure', 'Usable in an age band'];
export function funnelTable(DB) {
  const order = dotOrder(DB), n = stepCounts(DB);
  return {
    steps: STEP_LABELS.map((label, s) => ({ label, n: n[s] })),
    usable: order.filter(i => reach(i) === 4).map(i => ({ id: i.id, name: i.name, acronym: i.acronym, at: i.usableAt })),
    dropped: order.filter(i => reach(i) === 3).map(i => ({ id: i.id, name: i.name, acronym: i.acronym, why: i.whyNot })),
  };
}

// On a touch screen there is no hover: the first tap on a mark shows its text, the second does what the mark does.
export const tapAction = ({ coarse, shown }) => (coarse && !shown ? 'show' : 'open');
