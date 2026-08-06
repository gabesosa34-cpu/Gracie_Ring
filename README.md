# The Grace Collection — Engagement Ring Customizer

A single-page engagement ring customizer: a five-step wizard (stone, setting,
metal, matching wedding band, band design) with a persistent live preview —
the band/setting/prongs as layered SVG, the center diamond as a real-time,
procedurally faceted 3D render (three.js) you can drag to rotate — a running
price total, and a closing "request a quote" form. No checkout, no backend —
mock diamond inventory only.

## How it's built

The whole app is one **self-contained `index.html`** — plain React
(`React.createElement`, no JSX/Babel) with React 18 and ReactDOM 18 embedded
inline, plus the Fraunces variable typeface embedded as base64 `@font-face`
data. There's no build step or npm install needed to run it: the file opens
straight from disk or works dropped into any static host or iframe embed
(e.g. Streamlit).

One exception to "zero external requests": the 3D diamond viewer
(`diamond3d.js`) loads three.js and its OrbitControls/RoomEnvironment addons
from the unpkg CDN via an import map in `shell_template.html`, since vendoring
a full three.js build inline wasn't practical. Everything else — React,
fonts, app logic, data — stays inlined and offline-capable as before.

Source is split for readability and reassembled by `build.py`:

| File | Purpose |
|---|---|
| `app.css` | Design tokens, layout, component styles (light + dark theme) |
| `app.js` | App logic: mock diamond data, pricing, SVG ring rendering, wizard |
| `diamond3d.js` | 3D diamond viewer: procedural faceted gem geometry (all 7 shapes), PBR glass material, scene/lighting/orbit controls — loaded as an ES module |
| `shell_template.html` | HTML skeleton with placeholders |
| `react.production.min.js` / `react-dom.production.min.js` | Vendored React 18 UMD builds |
| `fraunces-normal.b64` / `fraunces-italic.b64` | Base64 Fraunces variable font (woff2) |
| `build.py` | Inlines everything above into `index.html` |
| `index.html` | **Generated** — the final self-contained app (committed, since Streamlit reads it directly) |

If you edit `app.css` or `app.js`, rebuild with:

```bash
python build.py
```

## Run locally

Just open `index.html` in a browser — or serve it:

```bash
python -m http.server 8000
# then visit http://localhost:8000/index.html
```

## Run with Streamlit

`streamlit_app.py` embeds `index.html` via `st.components.v1.html`.

```bash
pip install -r requirements.txt
streamlit run streamlit_app.py
```

## Deploy to Streamlit Community Cloud

1. Push this repo to GitHub (already done if you're reading this from the repo).
2. Go to [share.streamlit.io](https://share.streamlit.io) and sign in with GitHub.
3. Click **New app**, pick this repo/branch, and set the main file to
   `streamlit_app.py`.
4. Deploy. Streamlit installs `requirements.txt` and runs the app — no other
   config needed, since `index.html` is already a finished, self-contained
   build.

## Notes

- Diamond inventory (~30 stones across all 7 shapes), pricing, and the quote
  form are all mock/prototype — nothing is charged and no email is actually
  sent.
- Third-party assets embedded in `index.html`: [React](https://react.dev)
  (MIT) and [Fraunces](https://github.com/undercasetype/Fraunces) by
  Undercase Type (SIL Open Font License).
- The 3D diamond viewer needs an internet connection (to fetch three.js from
  unpkg) even when running `index.html` straight from disk. Everything else
  in the app works fully offline.
