import { h, put, fmt, pageHead, panelBox, href } from '../ui.js';

export default function about(el, params, DB) {
  const F = DB.funnel, L = DB.labels;
  const nSources = Object.keys(DB.sources).length;
  const def = (term, ...text) => [h('b', {}, term), h('span', {}, ...text)];
  const list = xs => xs.map(x => x.label).join('; ');

  put(el,
    pageHead('About and methods',
      'The Interactive Data Exploration and Visualisation Hub presents the results of SMEPH_261, a scoping review of measurement tools for social media exposure in children and adolescents aged 0 to 17, carried out for the Robert Koch Institute.'),
    panelBox('How this hub is organised', 'by the objectives of the review',
      h('div', { class: 'in' },
        h('p', {}, 'The Overview, the instrument inventory, Compare and Sources serve the primary objective: to map and compare tools that measure social media exposure in children and adolescents aged 0 to 17, ',
          'with particular attention to instruments feasible for population-based surveys. Each of the seven secondary objectives has a section on one page, listed here with the protocol extraction domains that feed it.')),
      h('div', { class: 'scroll' }, h('table', { class: 'data' },
        h('thead', {}, h('tr', {}, ['Objective', 'As stated in the review', 'Question the hub answers', 'Protocol extraction domains'].map(t => h('th', {}, t)))),
        h('tbody', {}, DB.objectives.map(o => h('tr', {}, h('td', {}, o.n), h('td', {}, `To ${o.wording}.`),
          h('td', {}, h('a', { href: href(o.page, { s: o.section }) }, o.question)), h('td', {}, o.domains))))))),
    panelBox('What is counted', 'units used across the hub', h('div', { class: 'kv' },
      def('Source', `An included database study or grey literature document. The review includes ${fmt(nSources)} sources.`),
      def('Measure', `One tool used in one source to measure social media use. A source contributes one measure for each distinct tool it uses, however many analytical dimensions the tool covers. `,
        `For example, Woods and Scott (2016) used three tools (overall use, night-time use and emotional investment) and so contribute three measures. The review holds ${fmt(F.Measures)} measures.`),
      def('Named instrument', `A published, identifiable tool. There are ${fmt(F['Named instruments'])} named instruments.`),
      def('Study-specific items', 'Questions written for one study. They are grouped into types of item for counting and are never classed as validated.'),
      def('Exposure and problematic use', 'Exposure measures capture how long, on which platforms, why, in what context and with what content young people use social media. ',
        'Problematic-use scales capture symptoms of problematic use. They are a different construct and are not counted in the tailoring matrix.'),
      def('Analytical dimensions', `${list(L.dims)}. Each measure has one main category; a measure can also cover other dimensions.`),
      def('Health themes', `${list(L.themes)}. A measure can be linked to several health themes.`))),
    panelBox('When an instrument counts as validated and usable', 'rules applied to named instruments', h('div', { class: 'kv' },
      def('Validated', 'A named instrument with at least one reliability-type and at least one validity-type measurement property with a result rated sufficient against the COSMIN criteria, in a sample aged 0 to 17. ',
        `${fmt(F['Meet the validation rule'])} instruments meet this rule.`),
      def('Usable in a survey', 'The feasibility condition only: the tool needs no app or device, and takes 10 minutes or less to complete or its completion time was not reported.'),
      def('Minimum-evidence condition', 'The instrument is validated in 2 or more sources, or has at least one result rated sufficient with moderate or high GRADE quality.'),
      def('Usable in an age band', 'A validated exposure instrument that meets all four conditions in the age band: it is validated with evidence from the band; it is usable in a survey; ',
        'it is available with the reporter for the band; and it meets the minimum-evidence condition. In the tailoring matrix it must also be linked to the health theme and cover the analytical dimension.'),
      def('Age bands and reporters', `${L.bands.join(', ')} years. RKI's age convention for reporters: parent proxy up to age 10, self-report from 11.`),
      def('Tailoring matrix colours', 'Green: at least one validated exposure instrument meets all four conditions. Amber: tools exist, but none meets them. Red: no tool was identified.'))),
    panelBox('Exposure pathways', 'not a result of the review',
      h('div', { class: 'in' }, h('p', {}, 'The manuscript groups the health themes into exposure pathways. These are an interpretive frame set out after the data were charted and used in the Discussion. They are not a finding of the review, so the hub does not group or count results by pathway.'))),
    panelBox('Data and citation', null, h('div', { class: 'kv' },
      def('Data', DB.meta.dataNote),
      def('Checks', `Every number in the hub is read from the review's master tables. The hub is rebuilt only when all ${fmt(DB.meta.checks)} alignment checks of those tables pass.`),
      def('Citation', 'Citation to follow on publication.'),
      def('Commissioned by', 'Robert Koch Institute, Unit 27.'),
      def('Tables', h('a', { href: href('downloads') }, 'Download the tables behind the hub')))));
}
