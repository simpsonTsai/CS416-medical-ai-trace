# Medical AI Evidence Trace

**Cleared, But How Visible Is the Evidence?**

A D3 narrative visualization examining the public evidence
traceability of FDA-listed AI-enabled medical devices.

This project was created for the CS416 Data Visualization
Final Project.

## Project Question

FDA authorization records are generally visible, but can a reader
continue from the regulatory record to a clearly identified
registered study and posted results?

The visualization measures public traceability rather than clinical
quality, product safety, or the completeness of evidence reviewed
by the FDA.

## Narrative Structure

The project uses an interactive slideshow with four scenes:

1. **Growth over time** — Shows the increase in FDA list records by
   final decision year.
2. **Concentration by specialty** — Regroups the same records by
   medical panel.
3. **Evidence trail** — Compares the public evidence trails of three
   manually audited devices.
4. **Reader-driven explorer** — Allows the full dataset to be
   regrouped by specialty, decision period, or authorization pathway.

## Project Scope

The dataset contains 1,524 FDA list records used in this project.
The FDA list is periodically updated and is not comprehensive.

Three devices received manual evidence tracing:

- Imagio Breast Imaging System
- GI Genius
- BriefCase

These cases illustrate different traceability outcomes and are not
a representative sample of all FDA-listed devices.

Records outside these three cases are labeled **not audited**, not
**no evidence**.

## Run Locally

Because the project loads local JSON files, run it through a local
HTTP server rather than opening `index.html` directly.

From the project directory, run:

```bash
python3 -m http.server 8001
```
Then open the local server in a browser:
http://localhost:8001

## Project Files
medical-ai-trace/
├── index.html
├── README.md
├── css/
│   └── styles.css
├── js/
│   └── main.js
└── data/
    ├── devices.json
    └── evidence-trails.json

index.html — Semantic page structure and project content
css/styles.css — Layout, visual styling, and SVG classes
js/main.js — Application state, D3 rendering, parameters, and triggers
data/devices.json — FDA list records used in the visualization
data/evidence-trails.json — Three manually audited evidence trails

## Data Sources

The project uses public information from:

FDA AI-Enabled Medical Device List
FDA device databases and public decision documents
ClinicalTrials.gov

Detailed source links and methodology are included in the
visualization.

Author

Chia Yang Tsai
CS416 Data Visualization
