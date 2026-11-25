# Exposure Atlas

Interactive data hub for SMEPH_261, a scoping review of measurement tools for social media exposure in children and
adolescents aged 0 to 17, carried out for the Robert Koch Institute (Unit 27).

**Live site:** https://olatechie.github.io/exposure-atlas/

## What it shows

- Which named instruments could go into a survey of children and adolescents, and why the others stop short.
- What the measures capture, how exposure is measured and who reports, by age band.
- Validated instruments and the evidence behind them.
- A tailoring matrix of health theme by analytical dimension for each age band.
- Gaps in the measurement landscape and the response each calls for.
- An Explore page where filters combine over the measures, the instruments and the sources; the address holds the view.
- The included sources, and tables to download.

## Data

Data as at 27 October 2026; instrument names harmonised 2 November 2026; dimension codes corrected 8 November 2026. Every number on the site is read from the review's master tables; the site holds no
counting rules of its own.

## How the site is updated

A push to `main` runs the page-rule tests (`node test_logic.mjs`, which also checks the Explore filters against the counts in `test_fixtures/`) and, if they pass, redeploys the site with GitHub
Pages. The site is static: `index.html`, `css/`, `js/`, `data/hub.json` and `downloads/`.

## Citation

Citation to follow on publication.
