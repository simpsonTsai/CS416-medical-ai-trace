# Medical AI Evidence Trace — Wireframe Step 1

This milestone validates the page layout, four-scene narrative state machine,
D3 rendering, parameters, triggers, and responsive structure before real data is
connected.

## Run locally

Opening `index.html` directly should work for this step because no local data
files are fetched yet.

For the later data-loading steps, run a local HTTP server:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Expected behavior

- The page opens on Scene 1.
- Previous is disabled.
- Next moves through four scenes.
- The progress indicator updates.
- Scene 4 reveals two select controls.
- Changing either control updates the D3 wireframe.
- The layout stacks vertically on a narrower browser window.

## Files

- `index.html`: semantic page structure
- `css/styles.css`: layout, responsive styling, and SVG classes
- `js/main.js`: application state, triggers, rendering, and D3 wireframes

Real FDA data will be introduced in Step 2.
