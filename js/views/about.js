import { h, put, fmt, pageHead, panelBox, href } from '../ui.js';

export default function about(el, params, DB) {
  const F = DB.funnel, L = DB.labels;
  const nSources = Object.keys(DB.sources).length;
  const nSystems = DB.instruments.filter(i => i.level === 'system').length;
  const def = (term, ...text) => [h('b', {}, term), h('span', {}, ...text)];

  put(el,
    pageHead('About and methods',
      'The Exposure Atlas presents the results of SMEPH_261, a scoping review of the instruments and methods used to measure social media exposure in children and adolescents aged 0 to 17, carried out for the Robert Koch Institute.'),
    panelBox('How this hub is organised', 'by the objectives of the review',
      h('div', { class: 'in' },
        h('p', {}, 'The Overview, the instrument inventory, Compare and Sources serve the primary objective: to map and compare the instruments and methods used to measure social media exposure in children and adolescents aged 0 to 17, ',
          'with particular attention to instruments feasible for population-based surveys. Each of the seven secondary objectives has a section on one page, listed here with the protocol extraction domains that feed it.')),
      h('div', { class: 'scroll' }, h('table', { class: 'data' },
        h('thead', {}, h('tr', {}, ['Objective', 'As stated in the review', 'Question the hub answers', 'Protocol extraction domains'].map(t => h('th', {}, t)))),
        h('tbody', {}, DB.objectives.map(o => h('tr', {}, h('td', {}, o.n), h('td', {}, `To ${o.wording}.`),
          h('td', {}, h('a', { href: href(o.page, { s: o.section }) }, o.question)), h('td', {}, o.domains))))))),
    panelBox('Key definitions', 'as in the review', h('div', { class: 'kv' },
      def('Source', `an included database study or grey literature document.`),
      def('Measurement approach', `how data on the young person's social media use were collected. Question-based approaches are surveys, ecological momentary assessment (EMA), and qualitative or mixed methods. Digital-trace approaches are passive sensing (use recorded without the participant's input, by device or app logs or by cameras), data donation (participants share records or screenshots from their device or platform) and screen capture (recordings or screenshots of what appears on the screen, including Screenomics). Results are grouped by approach wherever the two kinds differ.`),
      def('Logged use', `usage recorded by the device's operating system or an app. It is one form of passive sensing and is the comparator when self-report is checked against recorded data.`),
      def('Instrument', `a question or set of questions on the young person's social media use, asked in a question-based approach. A named instrument is published and can be identified across sources, such as the Social Media Disorder Scale; it is counted once, however many sources use it. Study-specific items are questions written or adapted for one study. Only named instruments are judged against the validation rule (below).`),
      def('Trace metric', `a usage value derived from recorded digital data in a digital-trace approach, such as logged time on social media apps or content recorded through screen capture. It is the counterpart of an instrument in question-based approaches. A named tracking system, such as Screenomics, is the counterpart of a named instrument; tracking systems are reported with the digital-trace measures and are not counted as named instruments.`),
      def('Measure', `our counting unit: one use of an instrument, or of a digital-trace method, in one source. A source contributes at least one measure, and one for each distinct instrument or method it uses. A measure that covers several analytical dimensions is still one measure; it has one main dimension and is also counted under every dimension it covers. For example, a study of Scottish adolescents used three sets of study-specific items, on overall use, night-time use and emotional investment in social media, and so contributed three measures; the first (overall use) covers three dimensions and is counted under all three (Woods and Scott, 2016).`),
      def('Analytical dimensions', `screen time/duration (how long or how often); platform engagement (which platforms and what young people do on them); motivations for use (why, such as social interaction, entertainment or education); content exposure (what young people see, such as health-related content, advertising, violence or body image); contextual factors (when, where and with whom).`),
      def('Exposure', `the young person's use of social media on any of the five analytical dimensions. Problematic use: symptom-like patterns of compulsive use measured with symptom scales; a construct, not an exposure dimension.`),
      def('Reliability properties', `whether an instrument gives consistent results (internal consistency, reliability and measurement error). Validity properties: whether it measures what it claims to (structural validity, criterion validity, hypotheses testing, and cross-cultural validity or measurement invariance).`),
      def('Validation rule', `applied to named instruments; at least one reliability property and one validity property rated sufficient against COSMIN (Consensus-based Standards for the Selection of Health Measurement Instruments) criteria in a sample aged 0 to 17 years. One sufficient result is enough for a property to count, even when another result for the same property is insufficient. Minimum-evidence condition: validated in two or more sources, or at least one sufficient result of moderate or high quality under modified GRADE.`),
      def('Usable in a survey', `a survey measure that needs no app, device, data export or screen capture and takes 10 minutes or less; measures whose completion time is not reported count as usable.`),
      def('Age bands and reporter', `under 8, 8 to 10, 11 to 14 and 15 to 17 years; a source is counted in every band its sample spans. In the text, children are those under 11 years and adolescents those aged 11 to 17 years. An instrument is judged against parent report up to age 10 and self-report from age 11.`),
      def('In this review', `The review holds ${fmt(nSources)} sources, ${fmt(F.Measures)} measures, ${fmt(F['Named instruments'])} named instruments and ${fmt(nSystems)} named tracking systems.`))),
    panelBox('Readiness for use in a survey', 'how the tailoring matrix is read', h('div', { class: 'kv' },
      def('Readiness criteria', 'A validated exposure instrument is usable in an age band when it meets all four readiness criteria there: it is validated with evidence from the band; it is usable in a survey; ',
        'it is available with the reporter for the band; and it meets the minimum-evidence condition. In the tailoring matrix it must also be linked to the health theme and cover the analytical dimension.'),
      def('Tailoring matrix colours', 'Green: at least one validated exposure instrument meets all four readiness criteria. Amber: instruments or methods are in use, but none meets them. Red: no measure was identified.'),
      def('Health themes', `${L.pathways.map(p => `${p.label}: ${p.themes.map(t => DB.themeLabel(t).toLowerCase()).join('; ')}`).join('. ')}. A measure can be linked to several health themes.`))),
    panelBox('Exposure pathways', 'not a result of the review',
      h('div', { class: 'in' }, h('p', {}, 'The manuscript groups the health themes into exposure pathways. These are an interpretive frame set out after the data were charted and used in the Discussion. They are not a finding of the review, so the hub does not group or count results by pathway.'))),
    panelBox('Data and citation', null, h('div', { class: 'kv' },
      def('Data', DB.meta.dataNote),
      def('Checks', `Every number in the hub is read from the review's master tables. The hub is rebuilt only when all ${fmt(DB.meta.checks)} alignment checks of those tables pass.`),
      def('Explore', 'The Explore page counts measures, instruments and sources by the categories the review assigned to them. Choosing several categories of one filter keeps rows with any of them; ',
        'choosing categories of different filters keeps rows that meet all of them. With a single category chosen, each count equals the corresponding number in the review\'s tables.'),
      def('Citation', 'Citation to follow on publication.'),
      def('Commissioned by', 'Robert Koch Institute, Unit 27.'),
      def('Tables', h('a', { href: href('downloads') }, 'Download the tables behind the hub')))));
}
