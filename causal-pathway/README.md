# Ultrasound Pulse-Echo Probe · Causal Pathway

A focused editorial variant of the [p108 mechanism brief](../brief-Cursor.md). One primary input-to-output pathway, with what changes and what is conserved stated at every boundary. Not a claim about a new device.

Live: https://mizcausevic-dev.github.io/ultrasound-pulse-echo-probe-explainer/causal-pathway/

## What is here

| Path | What it is |
|---|---|
| `index.html` | Player page: play, scrub, jump stages, keyboard control, reduced-motion aware. Loads JSON-LD from `article/seo.json`. |
| `explainer.js` | The explainer. `drawFrame(ctx, W, H, frame)` is a pure function of the frame index. 34 s, 30 fps, 1,020 frames (0–1019). UMD: `window.UPE` in a browser, `module.exports` in Node. |
| `commercial.js` | 30-second commercial (900 frames). Its product window draws the real explainer through a transform, so the ad shows the product, not a mock-up. |
| `media/explainer.mp4` | Frame-exact render of the explainer with a synthesized score and pulse cues (1920×1080, H.264, AAC). |
| `media/commercial.mp4` | Frame-exact render of the commercial (1920×1080, H.264, AAC). |
| `media/hero.png` | Hero image, 2400×1260, drawn in code (`render/hero.js`). |
| `media/poster-explainer.png` | Frame 1000 of the explainer, used as the video poster. |
| `media/diagram-causal-pathway.svg` | Eight-node pathway with seven boundary cards (changes / conserved). |
| `media/mindmap.svg` | Orbital ring layout mind map: hub, seven sectors, two rings. |
| `article/medium-article.md` | Medium article in three registers (engineers, product, everyone), FAQ, sources and scope. |
| `article/seo.json` | Title, meta, keywords, OG/Twitter, JSON-LD (Article, two VideoObjects, FAQPage). |
| `article/social-release.md` | LinkedIn, X thread, Instagram/TikTok, Reddit, YouTube description with chapters, newsletter, boilerplate. |
| `article/commercial-script.md` | 30-second script: timecode, on-screen text, visual, audio note. |
| `render/` | `render.js` (node-canvas → ffmpeg), `score.py` (deterministic audio), `hero.js`, `diagrams.js`, `package.json`. |

## Stages (from the brief, unchanged)

| Frames | Seconds | Beat |
|---|---|---|
| 0–149 | 0–5 | Reveal array coupling and tissue section; full assembly, then a measured three-quarter push toward the active region |
| 150–299 | 5–10 | Transmit a timed acoustic pulse; sectional close-up, only the components this mechanism needs |
| 300–509 | 10–17 | Reflect at differing acoustic interfaces; track the primary pathway, keep inputs, outputs and control overlays distinct |
| 510–749 | 17–25 | Receive echoes and estimate depth; readable labels and a qualitative A-line inset |
| 750–1019 | 25–34 | Build an illustrative image; pull back to a stable overview with losses and limits visible |

Internal timing table (derived from one propagation constant in `explainer.js`, so audio cues and labels cannot drift from the picture): launch 230 · interface 1 hit 384 · interface 2 hit 476 · echo 1 received 538 · echo 2 received 722 · sweep 790–950 · stable from 960.

## Color grammar

Stage `#0B1019`. Cyan `#00E5FF` primary path (pulse and echo). Gold `#FFD166` energy or actuation (electrical drive). Violet `#9D4EDD` measurement or state (received signal, timing, image). Color is explanatory, not literal emission. Physical parts live in the section view; mathematical diagrams live in the right-hand insets.

## Technical limits carried on the plate

Travel-time depth assumes a sound speed. No universal diagnosis or perfect resolution. No clinical exposure settings. Axial detail limited by pulse length, lateral by beam width; attenuation grows with depth.

## What this does not claim

No device geometry, settings, measured performance, clinical outcomes, safety certifications, or proprietary internals. Graphs are qualitative. The energy ledger shares are drawn, not measured. The A-line is illustrative. The image inset is derived from the drawn geometry, not from data. Not clinical instruction.

## Run locally

```bash
# player
cd causal-pathway && python3 -m http.server 8080
# open http://localhost:8080/

# renders (Node 18+, ffmpeg on PATH, python3 with numpy)
cd causal-pathway/render && npm install && npm run all
```

Each render is reproducible: the same frame index yields the same pixels (see `VERIFICATION.md`).

## Reference

Mechanism reference as given in the brief: National Academies/NCBI, diagnostic imaging, https://www.ncbi.nlm.nih.gov/books/NBK593686/. Reference scope: source-linked conceptual animation, not independent validation of a specific product or simulation. Camera moves, palette, cutaways and timing are original illustrative directions.
