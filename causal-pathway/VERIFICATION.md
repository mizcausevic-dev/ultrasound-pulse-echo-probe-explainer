# Verification record · causal-pathway

Labels: **Observed** (directly inspected) · **Executed** (command ran, result available) · **Verified** (acceptance evidence passed) · **Predicted** (expected, not yet run) · **Blocked** (insufficient access or evidence).

Date: 2026-10-22 (America/New_York). Workspace: Anthropic cloud session, Node v22.22.0, Python 3.13.17, ffmpeg 6.1.1, node-canvas 3.x.

## Explainer

- **Executed** `node -e "require('./explainer.js')"`: module loads; `FRAMES=1020`, `FPS=30`, stages `0-149 150-299 300-509 510-749 750-1019`.
- **Executed** timing table from the single propagation constant: launch 230, interface 1 hit 384.02, interface 2 hit 475.98, echo 1 received 538.05, echo 2 received 721.95 (frames).
- **Verified** determinism: frame 500 rendered twice (with frame 123 drawn in between) produced byte-identical raw buffers (`determinism frame 500 identical: true`).
- **Observed** stills at frames 0, 100, 149, 250, 330, 400, 480, 560, 730, 870, 1000 (1920×1080) reviewed visually; label clamping keeps all callouts inside the section viewport; ledger, insets and limits panel render without overlap at the checked frames.
- **Executed** render: `media/explainer.mp4` = h264 1920×1080, `r_frame_rate=30/1`, `nb_frames=1020`, duration 34.000000 s, AAC audio; size 3,584,662 bytes before audio re-mux (re-muxed with video stream copied, frame count unchanged at 1020).

## Commercial

- **Executed** `media/commercial.mp4` = h264 1920×1080, 30 fps, `nb_frames=900`, duration 30.000000 s, AAC audio, 3,178,406 bytes.
- **Observed** stills at frames 40, 150, 330, 500, 700, 850 reviewed; the product window draws the explainer through a transform (live product output, not a mock-up); the end card carries the live URL.
- **Observed** extracted frame at t=26.5 s from the MP4 matches the end-card design.

## Audio

- **Executed** `render/score.py` produces 44.1 kHz 16-bit stereo WAV for both pieces; cue times are derived from the explainer timing table (384, 476, 538, 722) and from the commercial shot list. No random numbers.

## Images

- **Executed** `render/hero.js` → `media/hero.png` 2400×1260 (330,440 bytes) and `media/poster-explainer.png` (frame 1000).
- **Executed** `render/diagrams.js` → `media/diagram-causal-pathway.svg` and `media/mindmap.svg` (orbital ring layout, 7 sectors, interleaved two-ring fan, staggered alternate sectors). **Observed** rasterized previews reviewed; remaining label proximity is cosmetic, no text overlaps at the final parameters as far as the reviewed raster shows.

## Article package

- **Executed** scan: 0 em dashes in `article/*.md` and `article/seo.json`; no unit-bearing numbers (MHz, mm, dB, %, user counts) found by grep; `seo.json` parses as JSON.
- **Observed** the only numbers present are the ones the brief allows (34 s, 30 fps, 1,020 frames, frame ranges, hex colors, the three formulas, and the conventional ≈1540 m/s value labelled as an assumption).

## Reference check

- **Blocked** `https://www.ncbi.nlm.nih.gov/books/NBK593686/` returned a browser-check (reCAPTCHA) page from this workspace, so no text was extracted or quoted from it. The reference is cited exactly as given in the brief; the physics shown (piezoelectric transduction, impedance Z = ρ·c, intensity reflection coefficient, d = c·t/2 with c assumed, attenuation with depth) is standard textbook mechanism, not a claim about the reference's wording. Re-check the page in a normal browser before public release copy quotes it.

## Repository and publication

- **Observed** this session's GitHub credential can push to `mizcausevic-dev/ultrasound-pulse-echo-probe-explainer` (public). It cannot create new repositories (`gh auth status`: token invalid), so a new private repository could not be created from here.
- Branch and live-URL evidence: see the "Publication" section appended below after the push.

## Publication (appended after push)

- **Executed** `git push`: `causal-pathway`, `main` and `pages` all at commit `6f4cc04` on `origin` (`git ls-remote --heads origin` shows the three refs at `6f4cc046a7987618d821b57c8cd0013f156fcc90`).
- **Verified** live URL `https://mizcausevic-dev.github.io/ultrasound-pulse-echo-probe-explainer/causal-pathway/` returned HTTP 404 at 22:24:21 ET (Pages build pending) and HTTP 200 at 22:24:36 ET with the new `<title>`.
- **Verified** every asset serves from the live host with the expected content type and byte size: `explainer.js` 47,707 B (live sha256 `774cec89…b6ef6` equals local), `commercial.js`, `media/explainer.mp4` 3,582,496 B, `media/commercial.mp4` 3,178,406 B, `media/hero.png` 330,440 B, `media/poster-explainer.png`, both SVGs, `article/seo.json`, `article/medium-article.md`.
- **Observed** in the user's Chrome (Claude in Chrome): the live page renders, the plate auto-plays and scrubs, both `<video>` elements load their posters and report 0:30 and 0:34 durations, and the console reported no errors or exceptions after a reload.
- **Blocked** repository visibility: the brief asked for a private repository. This session's GitHub credential can push to the existing public repository but `gh auth status` reports the token invalid for account-level operations, so it could not create a new private repository or change visibility. Switching visibility is a one-click action in the repository Settings → Danger zone, and is a decision for the owner.
