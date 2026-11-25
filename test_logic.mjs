// Tests of the hub's page rules (js/logic.js) against the built data.
// Run after build_data.py:  node analysis/hub/test_logic.mjs
// No expected numbers are typed here: each check compares the rule with the master output held in hub.json.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ALL, DEFAULT_BAND, normalisePicker, usableIds, cellTools, noneReasons, pickerMatch, validCompareIds, pctf, allAgesOnly, usableHeading, searchTarget, inventoryMatch, safeRender, notExposureText, noneExplain, choiceText, reach, dotOrder, stepCounts, dotState, stopReason, startStep, share, shade, inkOn, rove, onlyPickerChanged, countFrame, scrollPlan, funnelTable, tapAction, kindOf, approachGroups, byPathway, exploreRows, rowHas, passes, exploreCount, facetCounts, linkedIds, parseExplore, formatExplore, exploreHeadline, filtersFromLabels, exploreState, door } from './js/logic.js';

const DB = JSON.parse(readFileSync(new URL('./data/hub.json', import.meta.url), 'utf8'));
const CHECKS = JSON.parse(readFileSync(new URL('./test_fixtures/explore_checks.json', import.meta.url), 'utf8'));
DB.byId = Object.fromEntries(DB.instruments.map(i => [i.id, i]));
const bands = DB.labels.bands, themes = DB.labels.themes, dims = DB.labels.dims;
const set = xs => new Set(xs);
const cells = [];
for (const b of [ALL, ...bands]) for (const t of themes) for (const d of dims) cells.push([b, t.key, d.key]);

const tests = {
  usable_instruments_follow_the_exposure_table() {
    for (const b of bands) {
      const want = DB.exposure.filter(r => r['Meets all four criteria at ages'].split(', ').includes(b)).map(r => r.id);
      assert.deepEqual(set(usableIds(DB, b, '')), set(want), b);
    }
    assert.equal(usableIds(DB, ALL, '').length, DB.funnel.usableInBand);
  },
  usable_instruments_are_sorted_by_name() {
    const names = usableIds(DB, ALL, '').map(id => DB.byId[id].name.toLowerCase());
    assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b)));
  },
  a_theme_choice_narrows_to_that_matrix_row() {
    for (const b of bands) for (const t of themes) {
      const u = usableIds(DB, b, t.key), any = usableIds(DB, b, '');
      assert.ok(u.every(id => any.includes(id)));
      assert.deepEqual(set(u), set(cellTools(DB, b, t.key, null).usable));
    }
  },
  all_ages_with_a_theme_is_the_union_of_the_four_bands() {
    for (const t of themes) assert.deepEqual(set(usableIds(DB, ALL, t.key)), set(bands.flatMap(b => usableIds(DB, b, t.key))));
  },
  a_band_with_no_usable_instrument_gives_reasons() {
    for (const b of bands) {
      const r = noneReasons(DB, b);
      assert.ok(Array.isArray(r));
      for (const x of r) { assert.ok(DB.byId[x.id] && x.why); assert.ok(!usableIds(DB, b, '').includes(x.id)); }
    }
    const withWhy = DB.instruments.filter(i => i.whyNot);
    assert.deepEqual(set(noneReasons(DB, ALL).map(x => x.id)), set(withWhy.map(i => i.id)));
  },
  a_red_cell_gives_two_empty_lists() {
    const red = cells.find(([b, t, d]) => DB.matrix[b][t][d].colour === 'Red');
    assert.ok(red, 'the data hold at least one red cell');
    assert.deepEqual(cellTools(DB, ...red), { usable: [], others: [] });
  },
  cell_tools_partition_the_cell() {
    for (const [b, t, d] of cells) {
      const { usable, others } = cellTools(DB, b, t, d), c = DB.matrix[b][t][d];
      assert.deepEqual(set([...usable, ...others]), set(c.inUse));
      assert.equal(usable.length + others.length, c.inUse.length);
      assert.deepEqual(set(usable), set(c.ids));
    }
  },
  bad_picker_values_fall_back() {
    assert.deepEqual(normalisePicker({ band: 'xyz', theme: 'nope' }, {}, DB), { band: DEFAULT_BAND, theme: '' });
    assert.deepEqual(normalisePicker({}, { band: ALL, theme: themes[0].key }, DB), { band: ALL, theme: themes[0].key });
    assert.deepEqual(normalisePicker({ band: bands[0] }, { band: ALL, theme: themes[1].key }, DB), { band: bands[0], theme: themes[1].key });
    assert.deepEqual(normalisePicker({ theme: '' }, { theme: themes[1].key }, DB), { band: DEFAULT_BAND, theme: '' });
    assert.deepEqual(normalisePicker({}, null, DB), { band: DEFAULT_BAND, theme: '' });
    assert.ok(bands.includes(DEFAULT_BAND));
  },
  unknown_compare_ids_are_dropped() {
    assert.deepEqual(validCompareIds(['nope', DB.instruments[0].id, 'G99'], DB), [DB.instruments[0].id]);
    assert.deepEqual(validCompareIds(null, DB), []);
    assert.deepEqual(validCompareIds('not a list', DB), []);
  },
  picker_match_uses_ages_used_and_themes_linked() {
    for (const i of DB.instruments) {
      assert.equal(pickerMatch(i, ALL, ''), true);
      for (const b of bands) assert.equal(pickerMatch(i, b, ''), i.ages.includes(b));
      for (const t of themes) assert.equal(pickerMatch(i, ALL, t.key), i.themes.includes(t.key));
    }
  },
  instrument_ids_survive_the_address() {
    for (const i of DB.instruments) assert.equal(new URLSearchParams(new URLSearchParams({ id: i.id }).toString()).get('id'), i.id);
  },
  percentages_round_as_the_manuscript_does() {                 // review finding 1
    assert.equal(pctf(0.004), '<1%'); assert.equal(pctf(0.006), '1%'); assert.equal(pctf(5 / 850), '1%');
    assert.equal(pctf(0), '0%'); assert.equal(pctf(1), '100%'); assert.equal(pctf(0.125), '12%'); assert.equal(pctf(0.375), '38%'); assert.equal(pctf(0.444), '44%');
  },
  all_ages_combined_adds_only_instruments_usable_in_no_band() { // review finding 3
    const extra = allAgesOnly(DB);
    assert.equal(extra.length, DB.funnel.usableAllAges - DB.funnel.usableInBand);
    for (const id of extra) { assert.deepEqual(DB.byId[id].usableAt, []); assert.ok(DB.byId[id].whyNot); }
    assert.ok(/all ages combined/i.test(usableHeading(ALL, 2)));
    assert.ok(!/usable instruments/i.test(usableHeading(ALL, 2)));
    assert.ok(/usable instruments \(2\)/i.test(usableHeading(bands[0], 2)));
  },
  the_bar_search_finds_every_instrument_by_name() {            // review finding 4
    for (const i of DB.instruments) {
      const t = searchTarget(i.name);
      assert.equal(t.view, 'inventory');
      const F = { q: t.params.q, generic: t.params.all === '1', construct: '' };
      assert.ok(inventoryMatch(i, F, t.picker.band, t.picker.theme, DB), i.name);
      assert.deepEqual(normalisePicker(t.params, t.picker, DB), t.picker);
    }
  },
  a_page_that_throws_is_reported_not_blank() {                 // review finding 5
    let seen = null;
    assert.equal(safeRender(() => { throw new Error('boom'); }, e => { seen = e.message; }), false);
    assert.equal(seen, 'boom');
    assert.equal(safeRender(() => 1, () => { throw new Error('not called'); }), true);
  },
  the_not_exposure_note_reads_as_a_sentence() {
    for (const c of new Set(DB.instruments.map(i => i.construct))) {
      if (c === 'Exposure') { assert.equal(notExposureText(c), ''); continue; }
      const t = notExposureText(c);
      assert.ok(t.endsWith('.') && !/measures other,/i.test(t) && /not exposure/.test(t), t);
    }
    assert.ok(/another construct/.test(notExposureText('Other')));
  },
  an_empty_answer_says_where_instruments_are_usable() {
    let seenElsewhere = false;
    for (const b of [ALL, ...bands]) for (const t of ['', ...themes.map(x => x.key)]) {
      if (usableIds(DB, b, t).length) continue;
      const x = noneExplain(DB, b, t), any = usableIds(DB, b, '');
      assert.deepEqual(x.elsewhere, t ? any : []);
      if (x.elsewhere.length) { seenElsewhere = true; assert.deepEqual(x.reasons, []); } else assert.deepEqual(x.reasons, noneReasons(DB, b));
    }
    assert.ok(seenElsewhere, 'the data hold a choice that is empty only because of the health theme');
    assert.equal(choiceText(ALL, 'mental health', false), 'in any age band for mental health');
    assert.equal(choiceText(ALL, 'mental health', true), 'in at least one age band for mental health');
    assert.equal(choiceText('Under 8', 'any health theme', true), 'at ages under 8 for any health theme');
  },
  // ---- figures that respond
  steps_match_the_master_funnel() {
    const F = DB.funnel;
    assert.deepEqual(stepCounts(DB), [F['Named instruments'], F['With any measurement-property evidence'], F['Meet the validation rule'], F['Validated: exposure'], F.usableInBand]);
  },
  dots_are_ordered_so_each_step_keeps_the_front() {
    const r = dotOrder(DB).map(reach);
    assert.deepEqual(r, [...r].sort((a, b) => b - a));
    assert.equal(r.length, DB.funnel['Named instruments']);
  },
  the_picker_marks_what_usableIds_gives() {
    for (const [b, t] of [[ALL, ''], ...bands.flatMap(b => ['', ...themes.map(x => x.key)].map(t => [b, t]))]) {
      const picked = dotOrder(DB).filter(i => dotState(i, 4, { band: b, theme: t }, DB) === 'pick').map(i => i.id);
      assert.deepEqual(set(picked), set(usableIds(DB, b, t)), `${b} ${t}`);
      const shown = dotOrder(DB).filter(i => ['pick', 'use'].includes(dotState(i, 4, { band: b, theme: t }, DB)));
      assert.equal(shown.length, DB.funnel.usableInBand);          // the headline never changes
    }
  },
  all_ages_marks_the_instruments_that_qualify_only_combined() {
    const c = dotOrder(DB).filter(i => dotState(i, 4, { band: ALL, theme: '' }, DB) === 'combined').map(i => i.id);
    assert.deepEqual(set(c), set(allAgesOnly(DB)));
    assert.ok(dotOrder(DB).every(i => dotState(i, 4, { band: bands[0], theme: '' }, DB) !== 'combined'));
  },
  every_dot_can_say_why_it_stopped() {
    for (const i of dotOrder(DB)) { const s = stopReason(i, DB); assert.ok(s && !/undefined|null|measures other,/.test(s), i.id); }
  },
  an_empty_row_draws_nothing_and_says_nought() {
    assert.equal(share(0, 0), 0); assert.equal(shade(0, 10), 0); assert.equal(shade(5, 0), 0);
    assert.equal(shade(10, 10), 100); assert.ok(shade(1, 1000) >= 8);
    assert.ok(shade(2, 10) < shade(3, 10));
    assert.equal(inkOn(52), 'dark'); assert.equal(inkOn(53), 'light');
  },
  reduced_motion_or_a_second_visit_opens_on_the_last_step() {
    assert.equal(startStep(true, false), 4); assert.equal(startStep(false, true), 4); assert.equal(startStep(false, false), 0);
  },
  arrow_keys_move_inside_a_figure_and_stop_at_its_edges() {
    assert.equal(rove(0, 'ArrowRight', 5, 3), 1); assert.equal(rove(4, 'ArrowRight', 5, 3), 4); assert.equal(rove(0, 'ArrowLeft', 5, 3), 0);
    assert.equal(rove(1, 'ArrowDown', 5, 3), 4); assert.equal(rove(2, 'ArrowDown', 5, 3), 2); assert.equal(rove(4, 'ArrowUp', 5, 3), 1);
    assert.equal(rove(3, 'Home', 5, 3), 0); assert.equal(rove(1, 'End', 5, 3), 4); assert.equal(rove(2, 'Tab', 5, 3), 2);
  },
  a_counting_number_never_leaves_the_range_between_old_and_new() {
    assert.equal(countFrame(0, 12, -0.3), 0); assert.equal(countFrame(0, 12, 0), 0);
    assert.equal(countFrame(0, 12, 1), 12); assert.equal(countFrame(0, 12, 1.7), 12);
    assert.equal(countFrame(16, 1, -1), 16); assert.equal(countFrame(16, 1, 2), 1);
    for (const k of [0.1, 0.4, 0.8]) { const v = countFrame(16, 1, k); assert.ok(v <= 16 && v >= 1 && Number.isInteger(v)); }
    assert.ok(countFrame(0, 100, 0.2) < countFrame(0, 100, 0.6));
  },
  a_picker_change_never_jumps_to_a_section() {
    assert.equal(scrollPlan({ section: true, keepScroll: true }), 'keep');
    assert.equal(scrollPlan({ section: true, keepScroll: false }), 'section');
    assert.equal(scrollPlan({ section: false, keepScroll: true }), 'keep');
    assert.equal(scrollPlan({ section: false, keepScroll: false }), 'top');
  },
  the_steps_have_a_table_with_the_reason_each_instrument_stops() {
    const T = funnelTable(DB);
    assert.deepEqual(T.steps.map(r => r.n), stepCounts(DB));
    assert.ok(T.steps.every(r => r.label));
    const none = DB.exposure.filter(r => r['If none, why']);
    assert.deepEqual(set(T.dropped.map(r => r.id)), set(none.map(r => r.id)));
    for (const r of T.dropped) assert.equal(r.why, DB.exposure.find(x => x.id === r.id)['If none, why']);
    assert.deepEqual(set(T.usable.map(r => r.id)), set(usableIds(DB, ALL, '')));
    for (const r of T.usable) assert.equal(r.at.join(', '), DB.exposure.find(x => x.id === r.id)['Meets all four criteria at ages']);
    assert.equal(T.usable.length + T.dropped.length, DB.funnel['Validated: exposure']);
  },
  on_touch_the_first_tap_shows_the_text_and_the_second_opens() {
    assert.equal(tapAction({ coarse: true, shown: false }), 'show');
    assert.equal(tapAction({ coarse: true, shown: true }), 'open');
    assert.equal(tapAction({ coarse: false, shown: false }), 'open');
    assert.equal(tapAction({ coarse: false, shown: true }), 'open');
  },
  every_entry_has_one_of_three_kinds() {
    const kinds = DB.instruments.map(kindOf);
    assert.equal(kinds.filter(k => k === 'Named instrument').length, DB.funnel['Named instruments']);
    assert.equal(kinds.filter(k => k === 'Named tracking system').length, DB.instruments.filter(i => i.level === 'system').length);
    assert.ok(kinds.every(k => ['Named instrument', 'Named tracking system', 'Type of study-specific items'].includes(k)));
  },
  approaches_fall_into_two_groups_that_cover_the_grid() {
    const cols = Object.keys(DB.measured.dimApproach[0]).filter(k => k !== 'Main dimension' && k !== 'Total' && k !== 'Not reported');
    const g = approachGroups(DB);
    assert.deepEqual(g.map(x => x.label), ['Question-based', 'Digital-trace']);
    assert.deepEqual(g.flatMap(x => x.approaches).sort(), [...cols].sort());
    assert.ok(g.every(x => x.approaches.length));
  },
  themes_are_grouped_under_their_pathways_in_order() {
    const rows = DB.labels.themes.map(t => ({ t: t.key }));
    const g = byPathway(DB, rows, r => r.t);
    assert.deepEqual(g.map(x => x.pathway.label), DB.labels.pathways.map(p => p.label));
    assert.deepEqual(g.flatMap(x => x.rows.map(r => r.t)), DB.labels.themes.map(t => t.key));
  },
  // ---- Explore
  explore_counts_equal_the_check_file() {
    assert.ok(CHECKS.length > 300);
    for (const c of CHECKS) assert.equal(exploreCount(DB, c.tab, c.f, null), c.n, JSON.stringify(c));
  },
  a_filters_own_counts_ignore_its_own_choice() {
    for (const tab of ['measures', 'instruments', 'sources']) for (const flt of DB.explore[tab]) {
      const alone = facetCounts(DB, tab, {}, flt.key, null), chosen = facetCounts(DB, tab, { [flt.key]: [0] }, flt.key, null);
      assert.deepEqual(alone, chosen, flt.key);
      alone.forEach((n, k) => assert.equal(n, exploreCount(DB, tab, { [flt.key]: [k] }, null), `${flt.key} ${k}`));
    }
  },
  an_address_round_trips_and_a_broken_one_still_parses() {
    for (const tab of ['measures', 'instruments', 'sources']) {
      const F = DB.explore[tab], f = Object.fromEntries(F.slice(0, 3).map(x => [x.key, [0, x.cats.length - 1].filter((v, k, a) => a.indexOf(v) === k)]));
      const prop = F.find(x => x.key.includes(':')); if (prop) f[prop.key] = [1];
      const s = { tab, f, mf: tab === 'measures' ? null : { [DB.explore.measures[0].key]: [0] } };
      assert.deepEqual(parseExplore(formatExplore(s, DB), DB), s, tab);
      const viaAddress = Object.fromEntries(new URLSearchParams(new URLSearchParams(formatExplore(s, DB)).toString()));
      assert.deepEqual(parseExplore(viaAddress, DB), s, `${tab} through an address`);
    }
    const flt = DB.explore.measures[0];
    for (const p of [{}, { tab: 'nope' }, { tab: 'measures', f: 'zzz:whatever' }, { f: ';;:' }, { f: '%E0%A4%A:%' }, { tab: 'sources', f: `${flt.key}:${encodeURIComponent(flt.cats[0])}|not a label`, mf: 'x:y' }]) {
      const got = parseExplore(p, DB); assert.ok(['measures', 'instruments', 'sources'].includes(got.tab));
      assert.ok(Object.entries(got.f).every(([k, v]) => DB.explore[got.tab].some(x => x.key === k) && v.length));
      assert.ok(Number.isInteger(exploreCount(DB, got.tab, got.f, got.mf)));
    }
    assert.deepEqual(parseExplore({ tab: 'measures', f: `${flt.key}:${encodeURIComponent(flt.cats[0])}|not a label` }, DB).f, { [flt.key]: [0] });
  },
  nothing_left_is_a_count_of_zero_not_an_error() {
    const zero = CHECKS.find(c => c.n === 0); assert.ok(zero);
    const head = exploreHeadline(DB, zero.tab, zero.f, null); assert.equal(head.n, 0); assert.ok(head.N > 0);
    DB.explore[zero.tab].forEach(x => facetCounts(DB, zero.tab, zero.f, x.key, null).forEach(n => assert.ok(Number.isInteger(n) && n >= 0)));
    assert.equal(pctf(head.n / head.N), '0%');
  },
  the_instruments_headline_follows_the_kinds_chosen() {
    const kind = DB.explore.instruments.find(x => x.key === 'kind'), k = l => kind.cats.indexOf(l);
    const one = exploreHeadline(DB, 'instruments', { kind: [k('Named instrument')] }, null);
    assert.equal(one.N, DB.funnel['Named instruments']); assert.equal(one.unit, 'named instruments'); assert.equal(one.n, one.N);
    const two = exploreHeadline(DB, 'instruments', { kind: [k('Named instrument'), k('Named tracking system')] }, null);
    assert.equal(two.N, DB.instruments.filter(i => i.level !== 'generic').length); assert.ok(/named instruments and named tracking systems/.test(two.unit));
    assert.equal(exploreHeadline(DB, 'instruments', {}, null).N, DB.instruments.length);
    assert.equal(exploreHeadline(DB, 'measures', {}, null).unit, 'measures');
    assert.equal(exploreHeadline(DB, 'sources', {}, null).N, Object.keys(DB.sources).length);
  },
  measures_lead_to_their_sources_and_instruments() {
    const g = DB.explore.measures.find(x => x.key === 'group'), mf = { group: [g.cats.indexOf('Digital-trace')] };
    const picked = DB.measures.filter(r => r.c.group.includes(mf.group[0]));
    assert.deepEqual(linkedIds(DB, 'sources', mf), new Set(picked.map(r => r.s)));
    assert.equal(exploreCount(DB, 'sources', {}, mf), new Set(picked.map(r => r.s)).size);
    assert.equal(exploreCount(DB, 'instruments', {}, mf), new Set(picked.map(r => r.i)).size);
    assert.ok(exploreRows(DB, 'sources').every(r => r.id && DB.sources[r.id]));
    assert.ok(passes(DB, 'measures', picked[0], mf, null) && rowHas(picked[0], 'measures', 'group').length === 1);
  },
  labels_become_filters_or_nothing() {
    const main = DB.explore.measures.find(x => x.key === 'main');
    assert.deepEqual(filtersFromLabels(DB, 'measures', { main: [main.cats[1], main.cats[0]] }), { main: [0, 1] });
    assert.equal(filtersFromLabels(DB, 'measures', { main: ['not a category'] }), null);
    assert.equal(filtersFromLabels(DB, 'measures', { nope: [main.cats[0]] }), null);
    assert.deepEqual(filtersFromLabels(DB, 'sources', {}), {});
  },
  the_instruments_tab_opens_on_named_instruments() {
    const kind = DB.explore.instruments.find(x => x.key === 'kind'), named = kind.cats.indexOf('Named instrument');
    assert.deepEqual(exploreState({ tab: 'instruments' }, DB).f, { kind: [named] });                       // no filter in the address
    assert.deepEqual(exploreState({ tab: 'instruments', any: '1' }, DB).f, {});                             // the reader cleared the kind
    const v = DB.explore.instruments.find(x => x.key === 'validated');
    const viaAddress = Object.fromEntries(new URLSearchParams(formatExplore({ tab: 'instruments', f: { validated: [v.cats.indexOf('Yes')] }, mf: null }, DB)));
    assert.deepEqual(exploreState(viaAddress, DB).f, { validated: [v.cats.indexOf('Yes')] });               // an address without a kind is kept as it is
    assert.equal(formatExplore({ tab: 'instruments', f: {}, mf: null }, DB).any, '1');
    assert.equal(formatExplore({ tab: 'measures', f: {}, mf: null }, DB).any, undefined);
    assert.deepEqual(exploreState({}, DB), { tab: 'measures', f: {}, mf: null });
    assert.deepEqual(exploreState({ tab: 'instruments', f: 'nokey:x' }, DB).f, { kind: [named] });               // a wholly stale address falls back too
    assert.deepEqual(exploreState({ tab: 'instruments', f: 'kind:' }, DB).f, { kind: [named] });
  },
  a_door_opens_only_on_the_number_it_showed() {
    const main = DB.tables.measures.filter(r => r.Characteristic.startsWith('Main analytical dimension'));
    for (const r of main) assert.equal(door(DB, 'measures', { main: [r.Category] }, r.n)?.tab, 'measures', r.Category);
    assert.equal(door(DB, 'measures', { main: [main[0].Category] }, main[0].n + 1), null);
    assert.equal(door(DB, 'measures', { nope: ['x'] }, 3), null);
    assert.equal(door(DB, 'measures', { main: ['not a category'] }, 3), null);
    const d = door(DB, 'measures', { main: [main[0].Category] }, main[0].n);
    assert.equal(exploreCount(DB, d.tab, d.f, d.mf), main[0].n);
  },
  the_planned_doors_all_open() {
    const F = DB.funnel, exposure = DB.instruments.find(i => i.usableAt != null).construct;
    const steps = [[{ kind: ['Named instrument'] }, F['Named instruments']], [{ kind: ['Named instrument'], evidence: ['At least one result'] }, F['With any measurement-property evidence']],
      [{ kind: ['Named instrument'], validated: ['Yes'] }, F['Meet the validation rule']], [{ kind: ['Named instrument'], validated: ['Yes'], construct: [exposure] }, F['Validated: exposure']],
      [{ kind: ['Named instrument'], usable: DB.labels.bands }, F.usableInBand]];
    for (const [labels, n] of steps) assert.ok(door(DB, 'instruments', labels, n), JSON.stringify(labels));
    for (const r of DB.measured.dimApproach.filter(r => !/^(Total|All|Not shown)/.test(r['Main dimension'])))
      for (const a of Object.keys(r).filter(k => !['Main dimension', 'Total'].includes(k))) if (r[a]) assert.ok(door(DB, 'measures', { main: [r['Main dimension']], approach: [a] }, r[a]), `${r['Main dimension']} ${a}`);
    for (const r of DB.cosminSummary) for (const rating of DB.labels.ratings) assert.ok(door(DB, 'instruments', { kind: ['Named instrument'], ['prop:' + r['Measurement property']]: [rating] }, r[rating]), `${r['Measurement property']} ${rating}`);
    for (const r of DB.themes.univariate) {
      assert.ok(door(DB, 'measures', { theme: [r['Health theme']] }, r['Measures (n)']), r['Health theme']);
      // the seven themes open on sources too; "none of the seven" is counted differently in the theme table and the source table, so it may not
      if (DB.labels.themes.some(t => t.label === r['Health theme'])) assert.ok(door(DB, 'sources', { theme: [r['Health theme']] }, r['Sources (n)']), `sources ${r['Health theme']}`);
    }
    for (const r of DB.tables.measures.filter(r => r.Characteristic.startsWith('Analytical dimension covered'))) assert.ok(door(DB, 'measures', { covers: [r.Category] }, r.n), r.Category);
    const rep = DB.tables.measures.filter(r => r.Characteristic.startsWith('Main reporter, question-based measures in sources covering ages'));
    const chars = [...new Set(rep.map(r => r.Characteristic))];
    for (const r of rep) assert.ok(door(DB, 'measures', { group: ['Question-based'], band: [DB.labels.bands[chars.indexOf(r.Characteristic)]], reporter: [r.Category] }, r.n), `${r.Characteristic} ${r.Category}`);
    for (const o of [...DB.objectives, ...DB.gaps.rows]) if (o.door) assert.ok(door(DB, o.door.tab, o.door.f, o.door.n), JSON.stringify(o.door));
    assert.ok([...DB.objectives, ...DB.gaps.rows].filter(o => o.door).length >= 4);
  },
  only_a_picker_change_updates_in_place() {
    const a = { path: 'themes', params: { band: '8–10' } };
    assert.ok(onlyPickerChanged(a, { path: 'themes', params: { band: '11–14', theme: 'Mental health' } }));
    assert.ok(!onlyPickerChanged(a, { path: 'overview', params: { band: '11–14' } }));
    assert.ok(!onlyPickerChanged(a, { path: 'themes', params: { band: '11–14', s: 'obj6' } }));
  },
};
for (const [name, fn] of Object.entries(tests)) { fn(); console.log('ok', name); }
