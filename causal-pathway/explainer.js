/* Ultrasound Pulse-Echo Probe — Causal Pathway
   Frame-locked motion explainer. drawFrame(ctx, W, H, frame) is a pure function
   of the frame index: no clocks, no randomness, no accumulated state.
   34 s · 30 fps · 1,020 frames (0–1019). Source brief p108.
   Works in a browser (window.UPE) and in Node (module.exports) for frame-exact render. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.UPE = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var FPS = 30;
  var FRAMES = 1020;

  var C = {
    bg: "#0B1019",
    bg2: "#0e1521",
    metal: "#344257",
    metalHi: "#9aafc4",
    metalLo: "#1b2431",
    bone: "#e6edf5",
    dim: "#8ea0b3",
    dimmer: "#5c6b7d",
    path: "#00E5FF",
    energy: "#FFD166",
    sense: "#9D4EDD",
    line: "#25324a"
  };

  var FONT = "Inter, 'Segoe UI', 'DejaVu Sans', Arial, sans-serif";
  var MONO = "'JetBrains Mono', 'DejaVu Sans Mono', Menlo, Consolas, monospace";

  var STAGES = [
    { f0: 0, f1: 149, title: "Reveal array coupling and tissue section",
      detail: "Full assembly, then a measured three-quarter push toward the active region." },
    { f0: 150, f1: 299, title: "Transmit a timed acoustic pulse",
      detail: "Sectional close-up. Only the components this mechanism needs are named." },
    { f0: 300, f1: 509, title: "Reflect at differing acoustic interfaces",
      detail: "The primary pathway splits at each impedance step. Inputs, outputs and control stay distinct." },
    { f0: 510, f1: 749, title: "Receive echoes and estimate depth",
      detail: "Arrival time becomes depth through an assumed sound speed. Qualitative A-line inset." },
    { f0: 750, f1: 1019, title: "Build an illustrative image",
      detail: "Pull back to a stable overview. Losses and limits stay on the plate." }
  ];

  /* ---------- math helpers ---------- */
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  function ramp(f, f0, len) { return smooth((f - f0) / Math.max(1, len)); }
  function window01(f, fin, lenIn, fout, lenOut) {
    return smooth((f - fin) / Math.max(1, lenIn)) * (1 - smooth((f - fout) / Math.max(1, lenOut)));
  }
  /* deterministic hash noise, so texture never changes between renders */
  function hash(x, y) {
    var h = (x * 374761393 + y * 668265263) | 0;
    h = (h ^ (h >> 13)) * 1274126177;
    h = h ^ (h >> 16);
    return ((h >>> 0) % 10000) / 10000;
  }

  function stageIndex(f) {
    for (var i = STAGES.length - 1; i >= 0; i--) if (f >= STAGES[i].f0) return i;
    return 0;
  }

  /* ---------- world geometry (logical 1920×1080) ---------- */
  var G = {
    probeCx: 960,
    handle: { x: 860, y: 46, w: 200, h: 94 },
    housingTop: 140, housingBot: 300, housingTopW: 300, housingBotW: 520,
    backing: { y0: 266, y1: 300 },
    elements: { n: 16, w: 26, gap: 4, y0: 300, y1: 332 },
    matching: { y0: 332, y1: 346 },
    gel: { y0: 346, y1: 374 },
    skin: { y0: 374, y1: 398 },
    tissueTop: 398,
    iface1: 600,     /* first acoustic interface, nearly flat */
    iface2: 760,     /* second, curved reflector */
    tissueBot: 1010,
    apertureX0: 870, apertureX1: 1050
  };
  var ELEM_X0 = G.probeCx - (G.elements.n * (G.elements.w + G.elements.gap) - G.elements.gap) / 2;

  /* pulse kinematics (world px per frame). All timing derives from these two numbers. */
  var V = 1.74;          /* illustrative propagation speed in the plate, not a physical value */
  var F_LAUNCH = 230;    /* frame at which the pulse leaves the array face */
  function frontY(f) { return G.elements.y1 + V * (f - F_LAUNCH); }
  function hitFrame(y) { return F_LAUNCH + (y - G.elements.y1) / V; }
  var F_HIT1 = hitFrame(G.iface1);                       /* ≈385 */
  var F_HIT2 = hitFrame(G.iface2);                       /* ≈477 */
  var F_ECHO1 = F_HIT1 + (G.iface1 - G.elements.y1) / V; /* ≈540 */
  var F_ECHO2 = F_HIT2 + (G.iface2 - G.elements.y1) / V; /* ≈724 */

  /* curved second interface */
  function iface2Y(x) { return G.iface2 + 38 * Math.sin((x - 700) / 520 * Math.PI) - 10; }
  function iface1Y(x) { return G.iface1 + 6 * Math.sin((x - 600) / 300); }

  /* ---------- camera ---------- */
  var VIEW = { x0: 450, y0: 118, x1: 1390, y1: 958 };
  var VCX = (VIEW.x0 + VIEW.x1) / 2, VCY = (VIEW.y0 + VIEW.y1) / 2;

  function camera(f) {
    /* keyframes: [frame, cx, cy, zoom] with smooth holds between */
    var k = [
      [0, 960, 540, 0.84],
      [30, 960, 540, 0.84],
      [149, 950, 470, 1.18],
      [195, 960, 400, 2.15],
      [299, 960, 400, 2.15],
      [345, 960, 600, 1.20],
      [509, 960, 600, 1.20],
      [555, 960, 580, 1.20],
      [749, 960, 580, 1.20],
      [805, 960, 540, 0.84],
      [1019, 960, 540, 0.84]
    ];
    var i;
    for (i = 0; i < k.length - 1; i++) {
      if (f <= k[i + 1][0]) {
        var t = smooth((f - k[i][0]) / Math.max(1, k[i + 1][0] - k[i][0]));
        return { cx: lerp(k[i][1], k[i + 1][1], t), cy: lerp(k[i][2], k[i + 1][2], t), z: lerp(k[i][3], k[i + 1][3], t) };
      }
    }
    var l = k[k.length - 1];
    return { cx: l[1], cy: l[2], z: l[3] };
  }

  /* ---------- drawing primitives ---------- */
  function roundRect(ctx, x, y, w, h, r) {
    var rr = Math.max(0, Math.min(r, Math.min(w, h) / 2));
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function text(ctx, s, x, y, size, color, opts) {
    opts = opts || {};
    ctx.font = (opts.weight || 500) + " " + size + "px " + (opts.mono ? MONO : FONT);
    ctx.fillStyle = color;
    ctx.textAlign = opts.align || "left";
    ctx.textBaseline = opts.baseline || "alphabetic";
    if (opts.spacing) {
      /* manual letter spacing for small caps labels */
      var cx = x, i, chars = s.split("");
      if (ctx.textAlign === "center") {
        var tw = 0;
        for (i = 0; i < chars.length; i++) tw += ctx.measureText(chars[i]).width + opts.spacing;
        cx = x - tw / 2; ctx.textAlign = "left";
      }
      for (i = 0; i < chars.length; i++) {
        ctx.fillText(chars[i], cx, y);
        cx += ctx.measureText(chars[i]).width + opts.spacing;
      }
      return;
    }
    ctx.fillText(s, x, y);
  }

  function wrapText(ctx, s, x, y, maxW, lineH, size, color, weight) {
    ctx.font = (weight || 400) + " " + size + "px " + FONT;
    ctx.fillStyle = color;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    var words = s.split(" "), line = "", yy = y, i;
    for (i = 0; i < words.length; i++) {
      var test = line ? line + " " + words[i] : words[i];
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line, x, yy); line = words[i]; yy += lineH;
      } else line = test;
    }
    if (line) ctx.fillText(line, x, yy);
    return yy + lineH;
  }

  function withAlpha(hex, a) {
    var r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return "rgba(" + r + "," + g + "," + b + "," + clamp(a, 0, 1) + ")";
  }

  /* ---------- scene (world space) ---------- */
  function drawTissue(ctx, f) {
    var x0 = 560, x1 = 1360;
    /* layer A */
    var gA = ctx.createLinearGradient(0, G.tissueTop, 0, G.iface1);
    gA.addColorStop(0, "#2d3545"); gA.addColorStop(1, "#262e3c");
    ctx.fillStyle = gA;
    ctx.beginPath(); ctx.moveTo(x0, G.tissueTop); ctx.lineTo(x1, G.tissueTop);
    var x;
    for (x = x1; x >= x0; x -= 20) ctx.lineTo(x, iface1Y(x));
    ctx.closePath(); ctx.fill();
    /* layer B */
    ctx.fillStyle = "#303a4b";
    ctx.beginPath(); ctx.moveTo(x0, iface1Y(x0));
    for (x = x0; x <= x1; x += 20) ctx.lineTo(x, iface1Y(x));
    for (x = x1; x >= x0; x -= 20) ctx.lineTo(x, iface2Y(x));
    ctx.closePath(); ctx.fill();
    /* layer C */
    ctx.fillStyle = "#1e2634";
    ctx.beginPath(); ctx.moveTo(x0, iface2Y(x0));
    for (x = x0; x <= x1; x += 20) ctx.lineTo(x, iface2Y(x));
    ctx.lineTo(x1, G.tissueBot); ctx.lineTo(x0, G.tissueBot);
    ctx.closePath(); ctx.fill();
    /* deterministic fiber texture */
    ctx.strokeStyle = "rgba(255,255,255,0.045)"; ctx.lineWidth = 1;
    var i;
    for (i = 0; i < 140; i++) {
      var tx = x0 + hash(i, 1) * (x1 - x0), ty = G.tissueTop + hash(i, 2) * (G.tissueBot - G.tissueTop);
      var len = 14 + hash(i, 3) * 36, ang = (hash(i, 4) - 0.5) * 0.9;
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx + Math.cos(ang) * len, ty + Math.sin(ang) * len); ctx.stroke();
    }
    /* interfaces */
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(230,237,245,0.35)";
    ctx.beginPath(); for (x = x0; x <= x1; x += 10) { if (x === x0) ctx.moveTo(x, iface1Y(x)); else ctx.lineTo(x, iface1Y(x)); } ctx.stroke();
    ctx.strokeStyle = "rgba(230,237,245,0.5)";
    ctx.beginPath(); for (x = x0; x <= x1; x += 10) { if (x === x0) ctx.moveTo(x, iface2Y(x)); else ctx.lineTo(x, iface2Y(x)); } ctx.stroke();
    /* section cut edges */
    ctx.strokeStyle = "rgba(154,175,196,0.35)"; ctx.lineWidth = 2;
    ctx.strokeRect(x0, G.tissueTop, x1 - x0, G.tissueBot - G.tissueTop);
  }

  function drawSkinGel(ctx, f) {
    var x0 = 560, x1 = 1360;
    /* skin */
    var gs = ctx.createLinearGradient(0, G.skin.y0, 0, G.skin.y1);
    gs.addColorStop(0, "#4d4b55"); gs.addColorStop(1, "#3c3b45");
    ctx.fillStyle = gs; ctx.fillRect(x0, G.skin.y0, x1 - x0, G.skin.y1 - G.skin.y0);
    /* coupling gel: only under the probe face */
    var gx0 = ELEM_X0 - 30, gx1 = ELEM_X0 + G.elements.n * (G.elements.w + G.elements.gap) - G.elements.gap + 30;
    ctx.fillStyle = "rgba(0,229,255,0.10)";
    ctx.beginPath(); ctx.moveTo(gx0 - 16, G.gel.y1);
    ctx.quadraticCurveTo(gx0 - 4, G.gel.y0 + 6, gx0 + 20, G.gel.y0);
    ctx.lineTo(gx1 - 20, G.gel.y0);
    ctx.quadraticCurveTo(gx1 + 4, G.gel.y0 + 6, gx1 + 16, G.gel.y1);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(0,229,255,0.28)"; ctx.lineWidth = 1.5; ctx.stroke();
  }

  function drawProbe(ctx, f, activeAlpha, scanIndex) {
    var cx = G.probeCx;
    /* cable */
    ctx.strokeStyle = "#2a3545"; ctx.lineWidth = 14; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(cx, 20); ctx.lineTo(cx, G.handle.y + 10); ctx.stroke();
    /* handle */
    var gh = ctx.createLinearGradient(G.handle.x, 0, G.handle.x + G.handle.w, 0);
    gh.addColorStop(0, "#2b3646"); gh.addColorStop(0.5, "#3c4a5e"); gh.addColorStop(1, "#232d3b");
    ctx.fillStyle = gh; roundRect(ctx, G.handle.x, G.handle.y, G.handle.w, G.handle.h, 22); ctx.fill();
    ctx.strokeStyle = C.metalHi; ctx.lineWidth = 1.5; ctx.stroke();
    /* housing: trapezoid */
    var gb = ctx.createLinearGradient(cx - G.housingBotW / 2, 0, cx + G.housingBotW / 2, 0);
    gb.addColorStop(0, "#2a3443"); gb.addColorStop(0.45, "#3e4c60"); gb.addColorStop(1, "#222b38");
    ctx.fillStyle = gb;
    ctx.beginPath();
    ctx.moveTo(cx - G.housingTopW / 2, G.housingTop);
    ctx.lineTo(cx + G.housingTopW / 2, G.housingTop);
    ctx.lineTo(cx + G.housingBotW / 2, G.housingBot);
    ctx.lineTo(cx - G.housingBotW / 2, G.housingBot);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = C.metalHi; ctx.lineWidth = 1.5; ctx.stroke();
    /* backing block */
    ctx.fillStyle = "#171f2a";
    ctx.fillRect(ELEM_X0 - 6, G.backing.y0, G.elements.n * (G.elements.w + G.elements.gap) - G.elements.gap + 12, G.backing.y1 - G.backing.y0);
    /* elements */
    var i;
    for (i = 0; i < G.elements.n; i++) {
      var ex = ELEM_X0 + i * (G.elements.w + G.elements.gap);
      var inAperture = ex + G.elements.w / 2 > G.apertureX0 && ex + G.elements.w / 2 < G.apertureX1;
      var on = inAperture ? activeAlpha : 0;
      if (scanIndex >= 0) on = Math.abs(i - scanIndex) <= 1 ? 1 : 0;
      ctx.fillStyle = on ? withAlpha(C.energy, 0.18 + 0.4 * on) : "#4a5b72";
      ctx.fillRect(ex, G.elements.y0, G.elements.w, G.elements.y1 - G.elements.y0);
      ctx.strokeStyle = on ? withAlpha(C.energy, 0.5 + 0.5 * on) : "#6c7f98";
      ctx.lineWidth = on ? 2 : 1;
      ctx.strokeRect(ex + 0.5, G.elements.y0 + 0.5, G.elements.w - 1, G.elements.y1 - G.elements.y0 - 1);
    }
    /* matching layer */
    ctx.fillStyle = "#5a6c84";
    ctx.fillRect(ELEM_X0 - 6, G.matching.y0, G.elements.n * (G.elements.w + G.elements.gap) - G.elements.gap + 12, G.matching.y1 - G.matching.y0);
    ctx.strokeStyle = "rgba(230,237,245,0.25)"; ctx.lineWidth = 1;
    ctx.strokeRect(ELEM_X0 - 6, G.matching.y0, G.elements.n * (G.elements.w + G.elements.gap) - G.elements.gap + 12, G.matching.y1 - G.matching.y0);
  }

  /* electrical excitation (gold) from backing down into active elements */
  function drawExcitation(ctx, f) {
    /* active in stage 2 from f=180 to ~250: a short pulse train travels down the feed into the aperture */
    var a = window01(f, 182, 10, 246, 18);
    if (a <= 0) return;
    var i, n = 6;
    var ex0 = G.apertureX0, ex1 = G.apertureX1;
    ctx.save();
    ctx.globalAlpha = a;
    /* feed bus inside housing */
    ctx.strokeStyle = C.energy; ctx.lineWidth = 3; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(G.probeCx, G.housingTop + 10); ctx.lineTo(G.probeCx, G.backing.y0 - 16); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ex0 + 10, G.backing.y0 - 16); ctx.lineTo(ex1 - 10, G.backing.y0 - 16); ctx.stroke();
    for (i = 0; i < n; i++) {
      var x = lerp(ex0 + 20, ex1 - 20, i / (n - 1));
      ctx.beginPath(); ctx.moveTo(x, G.backing.y0 - 16); ctx.lineTo(x, G.elements.y0 + 4); ctx.stroke();
    }
    /* travelling spark: a bright dot moving down the feed, frames 186..226 */
    var t = clamp((f - 186) / 40, 0, 1);
    var sy = lerp(G.housingTop + 10, G.elements.y0 + 6, t);
    ctx.fillStyle = C.energy;
    ctx.shadowColor = C.energy; ctx.shadowBlur = 18;
    ctx.beginPath(); ctx.arc(G.probeCx, Math.min(sy, G.backing.y0 - 16), 6, 0, Math.PI * 2); ctx.fill();
    if (t > 0.6) {
      for (i = 0; i < n; i++) {
        var xx = lerp(ex0 + 20, ex1 - 20, i / (n - 1));
        ctx.beginPath(); ctx.arc(xx, lerp(G.backing.y0 - 16, G.elements.y0 + 6, (t - 0.6) / 0.4), 4.5, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  }

  /* piezo element thickness oscillation, visible in close-up only */
  function drawVibration(ctx, f) {
    var a = window01(f, 222, 6, 262, 20);
    if (a <= 0) return;
    var i;
    ctx.save(); ctx.globalAlpha = a;
    for (i = 0; i < G.elements.n; i++) {
      var ex = ELEM_X0 + i * (G.elements.w + G.elements.gap);
      if (ex + G.elements.w / 2 < G.apertureX0 || ex + G.elements.w / 2 > G.apertureX1) continue;
      var ph = Math.sin((f - 222) * 0.9) * 3;
      ctx.strokeStyle = C.energy; ctx.lineWidth = 2;
      ctx.strokeRect(ex + 0.5, G.elements.y0 - ph, G.elements.w - 1, G.elements.y1 - G.elements.y0 + ph * 2);
    }
    ctx.restore();
  }

  /* acoustic pulse band: three cycles, cyan. yFront = leading edge, dir = +1 down / -1 up */
  function drawPulseBand(ctx, yFront, dir, alpha, x0, x1, widthPx) {
    if (alpha <= 0.01) return;
    var cycles = 3, spacing = 11, i;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.lineCap = "round";
    for (i = 0; i < cycles; i++) {
      var y = yFront - dir * i * spacing;
      var w = widthPx || 4;
      ctx.strokeStyle = C.path;
      ctx.lineWidth = w * (1 - i * 0.22);
      ctx.shadowColor = C.path; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
    }
    ctx.restore();
  }

  function beamEdges(y) {
    /* a gently narrowing then widening aperture; purely illustrative beam envelope */
    var mid = G.iface1 + 20;
    var half0 = (G.apertureX1 - G.apertureX0) / 2;
    var half = half0 * (0.62 + 0.38 * Math.abs((y - mid) / 380));
    half = clamp(half, half0 * 0.55, half0 * 1.15);
    return { x0: G.probeCx - half, x1: G.probeCx + half };
  }

  function drawBeamEnvelope(ctx, f) {
    var a = window01(f, 236, 14, 930, 40);
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = a * 0.35;
    ctx.setLineDash([6, 8]); ctx.strokeStyle = C.path; ctx.lineWidth = 1.2;
    var y, side;
    for (side = 0; side < 2; side++) {
      ctx.beginPath();
      for (y = G.matching.y1; y <= G.tissueBot; y += 12) {
        var e = beamEdges(y);
        var x = side === 0 ? e.x0 : e.x1;
        if (y === G.matching.y1) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  function attenuation(dist) { return Math.exp(-dist / 900); }

  /* The primary pathway: outgoing pulse, split at interface 1, split at interface 2, two returning echoes. */
  function drawPulses(ctx, f) {
    if (f < F_LAUNCH) return;
    var y = frontY(f);
    var e;
    /* close-up spherical wavelets from each active element, just after launch */
    var wl = window01(f, F_LAUNCH, 4, F_LAUNCH + 40, 24);
    if (wl > 0) {
      ctx.save(); ctx.globalAlpha = wl * 0.5; ctx.strokeStyle = C.path; ctx.lineWidth = 1.6;
      var i, k;
      for (i = 0; i < G.elements.n; i++) {
        var ex = ELEM_X0 + i * (G.elements.w + G.elements.gap) + G.elements.w / 2;
        if (ex < G.apertureX0 || ex > G.apertureX1) continue;
        for (k = 0; k < 3; k++) {
          var r = (f - F_LAUNCH) * V + 2 - k * 11;
          if (r <= 1) continue;
          ctx.beginPath(); ctx.arc(ex, G.elements.y1, r, 0.12 * Math.PI, 0.88 * Math.PI); ctx.stroke();
        }
      }
      ctx.restore();
    }
    /* outgoing front (becomes transmitted part past each interface) */
    if (y < G.tissueBot + 40) {
      e = beamEdges(y);
      var amp = attenuation(y - G.elements.y1);
      if (y > G.iface1) amp *= 0.82;                 /* part of the energy left as echo 1 */
      if (y > iface2Y(G.probeCx)) amp *= 0.60;       /* stronger mismatch at interface 2 */
      var leadIn = ramp(f, F_LAUNCH + 6, 18);
      drawPulseBand(ctx, y, 1, amp * leadIn * 0.95, e.x0, e.x1, 4.5);
    }
    /* echo 1: reflected at interface 1, moving up */
    if (f > F_HIT1) {
      var y1 = G.iface1 - V * (f - F_HIT1);
      if (y1 > G.elements.y1 - 4) {
        e = beamEdges(y1);
        var a1 = attenuation((G.iface1 - G.elements.y1) + (G.iface1 - y1)) * 0.42;
        drawPulseBand(ctx, y1, -1, a1, e.x0, e.x1, 4);
      }
    }
    /* echo 2: reflected at interface 2 */
    if (f > F_HIT2) {
      var y2 = G.iface2 - V * (f - F_HIT2);
      if (y2 > G.elements.y1 - 4) {
        e = beamEdges(y2);
        var a2 = attenuation((G.iface2 - G.elements.y1) + (G.iface2 - y2)) * 0.6;
        drawPulseBand(ctx, y2, -1, a2, e.x0, e.x1, 4);
      }
    }
    /* interface flashes at the moment of incidence */
    var fl1 = window01(f, F_HIT1 - 2, 3, F_HIT1 + 10, 16);
    var fl2 = window01(f, F_HIT2 - 2, 3, F_HIT2 + 10, 16);
    if (fl1 > 0 || fl2 > 0) {
      ctx.save();
      var x;
      if (fl1 > 0) {
        ctx.globalAlpha = fl1 * 0.9; ctx.strokeStyle = C.bone; ctx.lineWidth = 3; ctx.shadowColor = C.path; ctx.shadowBlur = 16;
        ctx.beginPath(); for (x = G.apertureX0 - 30; x <= G.apertureX1 + 30; x += 10) { if (x === G.apertureX0 - 30) ctx.moveTo(x, iface1Y(x)); else ctx.lineTo(x, iface1Y(x)); } ctx.stroke();
      }
      if (fl2 > 0) {
        ctx.globalAlpha = fl2 * 0.9; ctx.strokeStyle = C.bone; ctx.lineWidth = 3; ctx.shadowColor = C.path; ctx.shadowBlur = 16;
        ctx.beginPath(); for (x = G.apertureX0 - 30; x <= G.apertureX1 + 30; x += 10) { if (x === G.apertureX0 - 30) ctx.moveTo(x, iface2Y(x)); else ctx.lineTo(x, iface2Y(x)); } ctx.stroke();
      }
      ctx.restore();
    }
  }

  /* receive highlight (violet) on the elements when an echo arrives, plus a signal line up the feed */
  function drawReceive(ctx, f) {
    var r1 = window01(f, F_ECHO1 - 2, 3, F_ECHO1 + 14, 22);
    var r2 = window01(f, F_ECHO2 - 2, 3, F_ECHO2 + 14, 22);
    var a = Math.max(r1, r2);
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = a;
    var i;
    for (i = 0; i < G.elements.n; i++) {
      var ex = ELEM_X0 + i * (G.elements.w + G.elements.gap);
      if (ex + G.elements.w / 2 < G.apertureX0 || ex + G.elements.w / 2 > G.apertureX1) continue;
      ctx.fillStyle = withAlpha(C.sense, 0.45);
      ctx.fillRect(ex, G.elements.y0, G.elements.w, G.elements.y1 - G.elements.y0);
      ctx.strokeStyle = C.sense; ctx.lineWidth = 2;
      ctx.strokeRect(ex + 0.5, G.elements.y0 + 0.5, G.elements.w - 1, G.elements.y1 - G.elements.y0 - 1);
    }
    ctx.strokeStyle = C.sense; ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.shadowColor = C.sense; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.moveTo(G.probeCx, G.backing.y0 - 4); ctx.lineTo(G.probeCx, G.housingTop + 8); ctx.stroke();
    ctx.restore();
  }

  /* stage 5 sweep: elements fire one line at a time, a thin cyan line marks each scan line (time compressed) */
  function sweepState(f) {
    var f0 = 790, f1 = 950;
    if (f < f0) return { idx: -1, prog: 0 };
    var p = clamp((f - f0) / (f1 - f0), 0, 1);
    return { idx: Math.min(G.elements.n - 1, Math.floor(p * G.elements.n)), prog: p };
  }

  function drawSweep(ctx, f) {
    var s = sweepState(f);
    if (s.idx < 0) return;
    var ex = ELEM_X0 + s.idx * (G.elements.w + G.elements.gap) + G.elements.w / 2;
    var a = 1 - smooth((f - 950) / 30);
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = a;
    /* scan line */
    ctx.strokeStyle = withAlpha(C.path, 0.9); ctx.lineWidth = 2.5; ctx.shadowColor = C.path; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.moveTo(ex, G.matching.y1); ctx.lineTo(ex, G.tissueBot - 10); ctx.stroke();
    /* a short pulse and its echoes as dots along the line (time compressed) */
    var ph = (f - 790) % 10 / 10;
    var yy = lerp(G.matching.y1, G.tissueBot - 10, ph);
    ctx.fillStyle = C.path; ctx.beginPath(); ctx.arc(ex, yy, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C.sense;
    ctx.beginPath(); ctx.arc(ex, iface1Y(ex), 5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(ex, iface2Y(ex), 5, 0, Math.PI * 2); ctx.fill();
    /* previously scanned lines, faint */
    var i;
    ctx.shadowBlur = 0; ctx.lineWidth = 1; ctx.strokeStyle = withAlpha(C.path, 0.18);
    for (i = 0; i < s.idx; i++) {
      var px = ELEM_X0 + i * (G.elements.w + G.elements.gap) + G.elements.w / 2;
      ctx.beginPath(); ctx.moveTo(px, G.matching.y1); ctx.lineTo(px, G.tissueBot - 10); ctx.stroke();
    }
    ctx.restore();
  }

  /* ---------- screen-space overlays ---------- */
  function card(ctx, x, y, w, h, title, accent) {
    ctx.save();
    roundRect(ctx, x, y, w, h, 10);
    ctx.fillStyle = "rgba(13,19,29,0.94)"; ctx.fill();
    ctx.strokeStyle = C.line; ctx.lineWidth = 1.2; ctx.stroke();
    if (title) {
      ctx.fillStyle = accent || C.dim;
      ctx.fillRect(x + 14, y + 16, 4, 16);
      text(ctx, title.toUpperCase(), x + 26, y + 29, 14, C.dim, { mono: true, weight: 600, spacing: 1.2 });
    }
    ctx.restore();
  }

  var LEDGER = [
    { title: "Boundary: probe face ↔ tissue", accent: C.path,
      changes: ["Medium: sound speed and impedance step at every layer", "Matching layer + gel shrink the mismatch so more energy enters"],
      conserved: ["Pulse frequency across the boundary", "Transmit time t = 0 (the timing reference)"] },
    { title: "Boundary: electrical → mechanical", accent: C.energy,
      changes: ["Energy form: voltage pulse → element thickness vibration", "Short pulse: backing damps the ring-down"],
      conserved: ["Trigger time t = 0", "Center frequency set by the element"] },
    { title: "Boundary: tissue interface (Z1 → Z2)", accent: C.path,
      changes: ["Amplitude splits: part reflects, part transmits", "Reflected part reverses direction"],
      conserved: ["Frequency", "Energy ledger: incident = reflected + transmitted + absorbed"] },
    { title: "Boundary: mechanical → electrical", accent: C.sense,
      changes: ["Energy form: echo pressure → element voltage vs time", "Deeper echo: later and weaker (attenuation)"],
      conserved: ["Arrival order and arrival times", "Depth = c · t / 2 only if c is assumed"] },
    { title: "Boundary: signal → image", accent: C.sense,
      changes: ["Time axis becomes depth axis", "Amplitude becomes brightness, line by line"],
      conserved: ["Causal order inside every scan line", "Not conserved: detail lost to attenuation and resolution limits"] }
  ];

  function drawLedger(ctx, f, si) {
    var L = LEDGER[si];
    var fade = ramp(f, STAGES[si].f0, 14);
    var x = 36, y = 130, w = 392, h = 420;
    ctx.save(); ctx.globalAlpha = 0.92;
    card(ctx, x, y, w, h, "What changes · what is conserved", L.accent);
    ctx.globalAlpha = fade;
    var yy = wrapText(ctx, L.title, x + 20, y + 68, w - 40, 26, 21, C.bone, 600) + 14;
    text(ctx, "CHANGES", x + 20, yy, 13, L.accent, { mono: true, weight: 600, spacing: 1.4 });
    yy += 10;
    var i;
    for (i = 0; i < L.changes.length; i++) {
      ctx.fillStyle = L.accent; ctx.fillRect(x + 20, yy + 10, 6, 6);
      yy = wrapText(ctx, L.changes[i], x + 36, yy + 18, w - 60, 22, 17, C.bone, 400) + 2;
    }
    yy += 16;
    text(ctx, "CONSERVED", x + 20, yy, 13, C.dim, { mono: true, weight: 600, spacing: 1.4 });
    yy += 10;
    for (i = 0; i < L.conserved.length; i++) {
      ctx.strokeStyle = C.dim; ctx.lineWidth = 1.5; ctx.strokeRect(x + 20.5, yy + 10.5, 6, 6);
      yy = wrapText(ctx, L.conserved[i], x + 36, yy + 18, w - 60, 22, 17, C.bone, 400) + 2;
    }
    ctx.restore();
  }

  function drawLegend(ctx, x, y, w, alpha) {
    if (alpha <= 0) return;
    ctx.save(); ctx.globalAlpha = alpha;
    card(ctx, x, y, w, 350, "Color grammar", C.dim);
    var rows = [[C.path, "Cyan", "primary path: the acoustic pulse out and the echo back"], [C.energy, "Gold", "energy or actuation: the electrical drive into the element"], [C.sense, "Violet", "measurement or state: received signal, timing, image data"]];
    var i, yy = y + 70;
    for (i = 0; i < rows.length; i++) {
      ctx.fillStyle = rows[i][0]; ctx.fillRect(x + 20, yy - 13, 22, 13);
      text(ctx, rows[i][1], x + 54, yy, 18, C.bone, { weight: 600 });
      yy = wrapText(ctx, rows[i][2], x + 54, yy + 24, w - 74, 20, 15, C.dim, 400) + 18;
    }
    yy += 6;
    text(ctx, "PLATE CONVENTIONS", x + 20, yy, 12, C.dim, { mono: true, weight: 600, spacing: 1.2 });
    yy = wrapText(ctx, "Physical parts sit in the section view. Mathematical diagrams sit in these insets. Color is explanatory, not literal emission.", x + 20, yy + 24, w - 40, 20, 15, C.dimmer, 400);
    ctx.restore();
  }

  /* mathematical inset: impedance mismatch and the energy split (qualitative) */
  function drawImpedanceInset(ctx, f, x, y, w, alpha) {
    if (alpha <= 0) return;
    var h = 350;
    ctx.save(); ctx.globalAlpha = alpha;
    card(ctx, x, y, w, h, "Diagram · reflection at an impedance step", C.path);
    text(ctx, "Z = ρ · c   (density × sound speed)", x + 20, y + 68, 17, C.bone, { mono: true });
    text(ctx, "R = ((Z₂ − Z₁) / (Z₂ + Z₁))²   intensity reflected", x + 20, y + 94, 15, C.dim, { mono: true });
    /* two impedance bars */
    var bx = x + 20, by = y + 124, bw = 120, bh = 16;
    text(ctx, "Z₁", bx, by - 6, 14, C.dim, { mono: true });
    ctx.fillStyle = "#3b4a5f"; ctx.fillRect(bx + 30, by - 18, bw * 0.55, bh);
    text(ctx, "Z₂", bx + 190, by - 6, 14, C.dim, { mono: true });
    ctx.fillStyle = "#54657d"; ctx.fillRect(bx + 220, by - 18, bw * 0.95, bh);
    text(ctx, "larger step → larger reflected share", x + 20, by + 22, 14, C.dimmer);
    /* energy ledger bars, animated after the first hit */
    var split = ramp(f, F_HIT1, 30);
    var lx = x + 20, ly = y + 196, lw = w - 40;
    text(ctx, "ENERGY LEDGER (qualitative, not measured)", lx, ly - 10, 12, C.dim, { mono: true, spacing: 1.2 });
    ctx.fillStyle = withAlpha(C.path, 0.9); ctx.fillRect(lx, ly, lw, 14);
    text(ctx, "incident", lx, ly + 32, 14, C.dim);
    var refl = 0.18 * split, absb = 0.08 * split, trans = 1 - refl - absb;
    var yy = ly + 46;
    ctx.fillStyle = withAlpha(C.path, 0.75); ctx.fillRect(lx, yy, lw * trans, 14);
    ctx.fillStyle = withAlpha(C.path, 0.4); ctx.fillRect(lx + lw * trans, yy, lw * refl, 14);
    ctx.fillStyle = withAlpha(C.dim, 0.55); ctx.fillRect(lx + lw * (trans + refl), yy, lw * absb, 14);
    text(ctx, "transmitted", lx, yy + 32, 14, C.dim);
    if (split > 0.2) {
      text(ctx, "reflected", lx + lw * trans + lw * refl / 2, yy + 32, 14, withAlpha(C.path, 0.9), { align: "center" });
      text(ctx, "absorbed", lx + lw, yy + 54, 14, C.dim, { align: "right" });
    }
    text(ctx, "The sum is conserved. The shares are drawn, not measured.", lx, y + h - 20, 14, C.dimmer);
    ctx.restore();
  }

  /* mathematical inset: A-line (amplitude vs arrival time → depth) */
  function drawAlineInset(ctx, f, x, y, w, alpha) {
    if (alpha <= 0) return;
    var h = 350;
    ctx.save(); ctx.globalAlpha = alpha;
    card(ctx, x, y, w, h, "Inset · A-line, amplitude vs arrival time", C.sense);
    var px = x + 30, py = y + 236, pw = w - 60, ph = 90;
    /* axes */
    ctx.strokeStyle = C.line; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + pw, py); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(px, py - ph / 2); ctx.lineTo(px, py + ph / 2); ctx.stroke();
    text(ctx, "t = 0", px, py + ph / 2 + 40, 13, C.dim, { mono: true, align: "center" });
    text(ctx, "arrival time →", px + pw, py + ph / 2 + 40, 13, C.dim, { mono: true, align: "right" });
    /* map frames to plot: time axis spans F_LAUNCH .. F_ECHO2 + 40 */
    var tA = F_LAUNCH, tB = F_ECHO2 + 40;
    /* separate the two annotations: echo 1 label above the trace, echo 2 label below */
    function tx(fr) { return px + pw * clamp((fr - tA) / (tB - tA), 0, 1); }
    /* baseline noise-free trace, with two damped bursts appearing at their arrival frames */
    ctx.strokeStyle = C.sense; ctx.lineWidth = 2; ctx.shadowColor = C.sense; ctx.shadowBlur = 8;
    ctx.beginPath();
    var fr, first = true;
    var cut = Math.min(f, tB);
    for (fr = tA; fr <= cut; fr += 1.5) {
      var v = 0;
      var d1 = fr - F_ECHO1, d2 = fr - F_ECHO2;
      if (d1 >= 0 && d1 < 26) v += 0.95 * Math.exp(-d1 / 9) * Math.sin(d1 * 1.25);
      if (d2 >= 0 && d2 < 26) v += 0.42 * Math.exp(-d2 / 9) * Math.sin(d2 * 1.25);
      var yy = py - v * (ph / 2);
      if (first) { ctx.moveTo(tx(fr), yy); first = false; } else ctx.lineTo(tx(fr), yy);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
    /* markers */
    if (f > F_ECHO1 + 4) {
      ctx.strokeStyle = withAlpha(C.sense, 0.5); ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(tx(F_ECHO1), py - ph / 2 - 6); ctx.lineTo(tx(F_ECHO1), py + ph / 2 + 4); ctx.stroke();
      ctx.setLineDash([]);
      text(ctx, "t₁ shallow · early · strong", tx(F_ECHO1) - 6, py - ph / 2 - 10, 13, C.bone, { mono: true, align: "right" });
    }
    if (f > F_ECHO2 + 4) {
      ctx.strokeStyle = withAlpha(C.sense, 0.5); ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(tx(F_ECHO2), py - ph / 2 - 6); ctx.lineTo(tx(F_ECHO2), py + ph / 2 + 4); ctx.stroke();
      ctx.setLineDash([]);
      text(ctx, "t₂ deep · late · weak", tx(F_ECHO2) - 6, py + ph / 2 + 14, 13, C.bone, { mono: true, align: "right" });
    }
    /* depth mapping */
    text(ctx, "d = c · t / 2", x + 20, y + 72, 20, C.bone, { mono: true, weight: 600 });
    wrapText(ctx, "c is assumed, not measured here (soft-tissue imaging convention ≈ 1540 m/s). Any error in c becomes an error in d.", x + 20, y + 98, w - 40, 20, 15, C.dim, 400);
    text(ctx, "Round trip: the ÷2 is the there-and-back path.", x + 20, y + h - 20, 14, C.dimmer);
    ctx.restore();
  }

  /* image inset: B-mode columns assembled from the drawn geometry, line by line */
  function drawImageInset(ctx, f, x, y, w, alpha) {
    if (alpha <= 0) return;
    var h = 350;
    ctx.save(); ctx.globalAlpha = alpha;
    card(ctx, x, y, w, h, "Illustrative image · one column per scan line", C.sense);
    var ix = x + 20, iy = y + 56, iw = w - 40, ih = 210;
    ctx.fillStyle = "#05080d"; ctx.fillRect(ix, iy, iw, ih);
    var s = sweepState(f);
    var cols = G.elements.n, cw = iw / cols, i, r, rows = 42, rh = ih / rows;
    var fadeCols = clamp((f - 790) / 160, 0, 1) * cols;
    for (i = 0; i < cols; i++) {
      var show = clamp(fadeCols - i, 0, 1);
      if (show <= 0) continue;
      var ex = ELEM_X0 + i * (G.elements.w + G.elements.gap) + G.elements.w / 2;
      var d1 = (iface1Y(ex) - G.tissueTop) / (G.tissueBot - G.tissueTop);
      var d2 = (iface2Y(ex) - G.tissueTop) / (G.tissueBot - G.tissueTop);
      for (r = 0; r < rows; r++) {
        var depth = (r + 0.5) / rows;
        var b = 0.05 + 0.06 * hash(i, r);                     /* speckle-like texture, deterministic */
        var att = Math.exp(-depth * 1.6);                      /* visible loss with depth */
        if (Math.abs(depth - d1) < 0.03) b = 0.85;
        if (Math.abs(depth - d2) < 0.035) b = 0.95;
        b *= att;
        ctx.fillStyle = "rgba(230,237,245," + (b * show) + ")";
        ctx.fillRect(ix + i * cw, iy + r * rh, cw - 1, rh);
      }
    }
    /* current column cursor */
    if (s.idx >= 0 && f < 960) {
      ctx.strokeStyle = C.path; ctx.lineWidth = 2;
      ctx.strokeRect(ix + s.idx * cw + 0.5, iy + 0.5, cw - 1, ih - 1);
    }
    ctx.strokeStyle = C.line; ctx.strokeRect(ix, iy, iw, ih);
    text(ctx, "depth ↓   brightness ∝ echo amplitude", ix, iy + ih + 24, 13, C.dim, { mono: true });
    wrapText(ctx, "Deeper rows are dimmer because the pulse and the echo both attenuate. Not a measurement. Not a diagnosis.", ix, iy + ih + 48, iw, 18, 14, C.dimmer, 400);
    ctx.restore();
  }

  function drawLimitsPanel(ctx, f, x, y, w, alpha) {
    if (alpha <= 0) return;
    ctx.save(); ctx.globalAlpha = alpha;
    card(ctx, x, y, w, 230, "Limits that stay on the plate", C.energy);
    var items = [
      "Depth from travel time assumes a sound speed.",
      "Axial detail is limited by pulse length; lateral detail by beam width.",
      "Attenuation grows with depth; deep echoes are weaker.",
      "No universal diagnosis. No perfect resolution.",
      "No clinical exposure settings are shown or implied."
    ];
    var i, yy = y + 62;
    for (i = 0; i < items.length; i++) {
      ctx.fillStyle = C.energy; ctx.fillRect(x + 20, yy - 9, 6, 6);
      yy = wrapText(ctx, items[i], x + 36, yy, w - 56, 20, 15, C.bone, 400) + 4;
    }
    ctx.restore();
  }

  function drawRail(ctx, f) {
    var nodes = [
      ["Trigger", C.energy, 180], ["Element", C.energy, 222], ["Pulse", C.path, 236],
      ["Interface", C.path, F_HIT1], ["Echo", C.path, F_HIT1 + 6], ["Receive", C.sense, F_ECHO1],
      ["Depth", C.sense, F_ECHO1 + 20], ["Image", C.sense, 800]
    ];
    var x0 = 60, x1 = 1860, y = 1008, i, n = nodes.length;
    ctx.save();
    roundRect(ctx, 36, 972, 1848, 76, 10); ctx.fillStyle = "rgba(13,19,29,0.94)"; ctx.fill(); ctx.strokeStyle = C.line; ctx.lineWidth = 1.2; ctx.stroke();
    text(ctx, "CAUSAL PATHWAY", 56, 998, 12, C.dim, { mono: true, weight: 600, spacing: 1.4 });
    var sx = 230, ex = 1840, step = (ex - sx) / (n - 1);
    for (i = 0; i < n; i++) {
      var nx = sx + i * step, lit = ramp(f, nodes[i][2], 10);
      if (i < n - 1) {
        var lit2 = ramp(f, nodes[i + 1][2], 10);
        ctx.strokeStyle = withAlpha(nodes[i][1], 0.15 + 0.7 * lit2); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(nx + 10, y); ctx.lineTo(nx + step - 10, y); ctx.stroke();
        /* arrow head */
        ctx.fillStyle = withAlpha(nodes[i][1], 0.15 + 0.7 * lit2);
        ctx.beginPath(); ctx.moveTo(nx + step - 12, y - 5); ctx.lineTo(nx + step - 4, y); ctx.lineTo(nx + step - 12, y + 5); ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = lit > 0 ? withAlpha(nodes[i][1], 0.25 + 0.75 * lit) : "#1a2331";
      ctx.strokeStyle = withAlpha(nodes[i][1], 0.35 + 0.65 * lit); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(nx, y, 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      text(ctx, nodes[i][0], nx, y + 30, 14, lit > 0.5 ? C.bone : C.dimmer, { align: "center", weight: 500 });
    }
    ctx.restore();
  }

  /* leader-line label at a projected world point */
  function label(ctx, proj, wx, wy, dx, dy, txt, color, alpha, mono) {
    if (alpha <= 0.01) return;
    var p = proj(wx, wy);
    /* anchors that the camera has pushed outside the viewport are not labelled */
    if (p.x < VIEW.x0 + 2 || p.x > VIEW.x1 - 2 || p.y < VIEW.y0 + 2 || p.y > VIEW.y1 - 2) return;
    ctx.font = "500 17px " + (mono ? MONO : FONT);
    var tw = ctx.measureText(txt).width;
    var sx = p.x + dx, sy = p.y + dy;
    var bx = dx >= 0 ? sx + 6 : sx - tw - 18;
    /* keep the label box inside the viewport: flip side first, then clamp */
    if (bx + tw + 18 > VIEW.x1 - 8) { dx = -Math.abs(dx); sx = p.x + dx; bx = sx - tw - 18; }
    if (bx < VIEW.x0 + 8) { dx = Math.abs(dx); sx = p.x + dx; bx = sx + 6; }
    if (bx + tw + 18 > VIEW.x1 - 8) { bx = VIEW.x1 - 8 - tw - 18; sx = bx - 6; }
    if (sy < VIEW.y0 + 24) sy = VIEW.y0 + 24;
    if (sy > VIEW.y1 - 16) sy = VIEW.y1 - 16;
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.strokeStyle = withAlpha(color, 0.8); ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(sx, sy); ctx.stroke();
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill();
    roundRect(ctx, bx, sy - 15, tw + 12, 26, 5); ctx.fillStyle = "rgba(11,16,25,0.9)"; ctx.fill();
    ctx.strokeStyle = withAlpha(color, 0.5); ctx.lineWidth = 1; ctx.stroke();
    text(ctx, txt, bx + 6, sy + 4, 17, C.bone, { weight: 500, mono: mono });
    ctx.restore();
  }

  /* ---------- the frame ---------- */
  function drawFrame(ctx, W, H, frame) {
    var f = clamp(Math.round(frame), 0, FRAMES - 1);
    var s = W / 1920;
    ctx.save();
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    ctx.scale(s, s);
    /* stage background: subtle vignette */
    var vg = ctx.createRadialGradient(960, 540, 200, 960, 540, 1300);
    vg.addColorStop(0, "#0f1724"); vg.addColorStop(1, C.bg);
    ctx.fillStyle = vg; ctx.fillRect(0, 0, 1920, 1080);

    var si = stageIndex(f);
    var cam = camera(f);
    function proj(wx, wy) { return { x: VCX + (wx - cam.cx) * cam.z, y: VCY + (wy - cam.cy) * cam.z }; }

    /* ---- world ---- */
    ctx.save();
    ctx.beginPath(); ctx.rect(VIEW.x0, VIEW.y0, VIEW.x1 - VIEW.x0, VIEW.y1 - VIEW.y0); ctx.clip();
    ctx.translate(VCX, VCY); ctx.scale(cam.z, cam.z); ctx.translate(-cam.cx, -cam.cy);
    /* faint grid behind the section, to read scale changes */
    ctx.strokeStyle = "rgba(255,255,255,0.035)"; ctx.lineWidth = 1;
    var gx, gy;
    for (gx = 400; gx <= 1520; gx += 80) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, 1080); ctx.stroke(); }
    for (gy = 0; gy <= 1080; gy += 80) { ctx.beginPath(); ctx.moveTo(400, gy); ctx.lineTo(1520, gy); ctx.stroke(); }

    drawTissue(ctx, f);
    drawSkinGel(ctx, f);
    drawBeamEnvelope(ctx, f);
    var activeAlpha = window01(f, 150, 20, 262, 40);
    var sw = sweepState(f);
    drawProbe(ctx, f, activeAlpha, f >= 790 && f < 960 ? sw.idx : -1);
    drawExcitation(ctx, f);
    drawVibration(ctx, f);
    drawPulses(ctx, f);
    drawReceive(ctx, f);
    drawSweep(ctx, f);
    ctx.restore();

    /* viewport frame */
    ctx.strokeStyle = C.line; ctx.lineWidth = 1.2;
    ctx.strokeRect(VIEW.x0 + 0.5, VIEW.y0 + 0.5, VIEW.x1 - VIEW.x0 - 1, VIEW.y1 - VIEW.y0 - 1);

    /* ---- world labels (screen space, projected) ---- */
    var a;
    /* stage 1: full assembly labels */
    a = window01(f, 20, 14, 120, 24);
    label(ctx, proj, G.handle.x + G.handle.w, G.handle.y + 40, 70, -20, "Probe handle", C.metalHi, a);
    label(ctx, proj, G.probeCx + G.housingBotW / 2 - 20, G.housingTop + 60, 90, -10, "Housing", C.metalHi, a);
    label(ctx, proj, ELEM_X0 + G.elements.n * (G.elements.w + G.elements.gap), G.elements.y0 + 16, 90, 10, "Element array", C.energy, a);
    label(ctx, proj, ELEM_X0 - 6, G.gel.y0 + 10, -80, -34, "Coupling gel", C.path, a);
    label(ctx, proj, 600, G.skin.y0 + 12, -40, 44, "Skin", C.metalHi, a);
    label(ctx, proj, 1360, 500, 70, -10, "Tissue section", C.metalHi, a);
    label(ctx, proj, 1360, iface1Y(1360), 70, 20, "Interface 1", C.path, a);
    label(ctx, proj, 1360, iface2Y(1360), 70, 20, "Interface 2", C.path, a);
    label(ctx, proj, G.probeCx + 90, 120, 80, -30, "Cable: drive in, signal out", C.sense, a);
    /* stage 2: close-up, only required components */
    a = window01(f, 196, 14, 296, 20);
    label(ctx, proj, ELEM_X0 + 7 * (G.elements.w + G.elements.gap) + 13, G.elements.y0 + 16, 150, -70, "Element (piezoelectric)", C.energy, a);
    label(ctx, proj, G.apertureX1 + 40, G.matching.y0 + 7, 120, 30, "Matching layer", C.metalHi, a);
    label(ctx, proj, G.apertureX1 + 60, G.gel.y0 + 14, 120, 60, "Coupling gel", C.path, a);
    label(ctx, proj, G.apertureX1 + 80, G.skin.y0 + 12, 120, 90, "Skin", C.metalHi, a);
    label(ctx, proj, G.probeCx, G.housingTop + 30, -180, -40, "TX trigger · t = 0", C.energy, window01(f, 182, 8, 296, 20), true);
    label(ctx, proj, G.apertureX0 - 20, G.elements.y1 + 26, -150, 40, "Pressure pulse leaves the face", C.path, window01(f, F_LAUNCH + 4, 10, 296, 20));
    /* stage 3 */
    a = window01(f, 330, 14, 505, 18);
    label(ctx, proj, G.apertureX1 + 16, frontY(Math.min(f, F_HIT1 - 2)), 120, -30, "Incident pulse", C.path, a * (f < F_HIT1 ? 1 : 0.0));
    label(ctx, proj, 1200, iface1Y(1200), 90, -30, "Interface 1: Z₁ → Z₂", C.path, window01(f, F_HIT1 - 20, 10, 505, 18), true);
    label(ctx, proj, 1200, iface2Y(1200), 90, 30, "Interface 2: larger step", C.path, window01(f, F_HIT2 - 20, 10, 505, 18), true);
    if (f > F_HIT1 + 8 && f < 505) {
      var ye1 = G.iface1 - V * (f - F_HIT1);
      if (ye1 > G.elements.y1) label(ctx, proj, G.apertureX0 - 16, ye1, -110, -24, "Reflected part (echo 1)", C.path, window01(f, F_HIT1 + 8, 10, 505, 18));
      var yt = frontY(f);
      if (yt < G.tissueBot) label(ctx, proj, G.apertureX1 + 16, yt, 110, 24, "Transmitted part continues", C.path, window01(f, F_HIT1 + 8, 10, 505, 18));
    }
    if (f > F_HIT2 + 8 && f < 505) {
      var ye2 = G.iface2 - V * (f - F_HIT2);
      if (ye2 > G.elements.y1) label(ctx, proj, G.apertureX0 - 16, ye2, -110, 24, "Echo 2 (weaker)", C.path, window01(f, F_HIT2 + 8, 10, 505, 18));
    }
    /* stage 4 */
    label(ctx, proj, G.apertureX0 - 20, G.elements.y0 + 16, -150, -50, "Receive on the same elements", C.sense, window01(f, F_ECHO1 - 4, 8, 745, 18));
    label(ctx, proj, G.probeCx, G.backing.y0 - 12, 170, -30, "Signal out: voltage vs time", C.sense, window01(f, F_ECHO1 + 6, 10, 745, 18));
    a = window01(f, 560, 14, 745, 18);
    label(ctx, proj, 1200, iface1Y(1200), 90, -24, "d₁ = c · t₁ / 2", C.sense, a, true);
    label(ctx, proj, 1200, iface2Y(1200), 90, 24, "d₂ = c · t₂ / 2", C.sense, window01(f, F_ECHO2 + 6, 10, 745, 18), true);
    /* stage 5 */
    label(ctx, proj, ELEM_X0 + G.elements.n * (G.elements.w + G.elements.gap), G.elements.y0 + 16, 90, -30, "Scan line by line across the array", C.path, window01(f, 795, 12, 955, 24));
    a = ramp(f, 960, 24);
    label(ctx, proj, 1360, 470, 70, -10, "Tissue section (schematic)", C.metalHi, a);
    label(ctx, proj, ELEM_X0 + G.elements.n * (G.elements.w + G.elements.gap), G.elements.y0 + 16, 90, 10, "Array: drive and receive", C.energy, a);
    label(ctx, proj, ELEM_X0 - 6, G.gel.y0 + 10, -80, -34, "Coupling gel", C.path, a);

    /* ---- header ---- */
    text(ctx, "ULTRASOUND PULSE-ECHO PROBE", 36, 44, 15, C.dim, { mono: true, weight: 600, spacing: 1.6 });
    text(ctx, "Causal pathway", 36, 84, 34, C.bone, { weight: 700 });
    text(ctx, "Stage " + (si + 1) + " of 5", 470, 44, 15, C.path, { mono: true, weight: 600, spacing: 1.6 });
    text(ctx, STAGES[si].title, 470, 84, 26, C.bone, { weight: 600 });
    wrapText(ctx, STAGES[si].detail, 470, 108, 900, 18, 15, C.dim, 400);
    /* frame readout */
    var secs = (f / FPS).toFixed(2);
    text(ctx, "f " + String(f).padStart(4, "0") + " / 1019", 1884, 44, 15, C.dim, { mono: true, align: "right", weight: 600 });
    text(ctx, secs + " s · 30 fps", 1884, 68, 15, C.dim, { mono: true, align: "right" });
    /* scale / time labels */
    var tl;
    if (si === 0) tl = "CAMERA PUSH ×" + cam.z.toFixed(2) + " · SCHEMATIC, NOT TO SCALE";
    else if (si === 1) tl = "SECTION ×" + cam.z.toFixed(2) + " · SLOW MOTION: microsecond events over seconds";
    else if (si === 2 || si === 3) tl = "SLOW MOTION · microsecond events shown over seconds · not to scale";
    else tl = f < 960 ? "TIME COMPRESSED · many pulse-echo lines shown in seconds" : "OVERVIEW · stable · schematic, not to scale";
    ctx.save();
    ctx.font = "600 13px " + MONO;
    var tlw = ctx.measureText(tl).width + 24;
    roundRect(ctx, 1884 - tlw, 80, tlw, 26, 6); ctx.fillStyle = withAlpha(si >= 1 && si <= 3 ? C.energy : C.dim, 0.14); ctx.fill();
    ctx.strokeStyle = withAlpha(si >= 1 && si <= 3 ? C.energy : C.dim, 0.5); ctx.lineWidth = 1; ctx.stroke();
    text(ctx, tl, 1884 - 12, 98, 13, si >= 1 && si <= 3 ? C.energy : C.dim, { mono: true, align: "right", weight: 600 });
    ctx.restore();

    /* ---- left ledger ---- */
    drawLedger(ctx, f, si);
    /* stage progress strip under the ledger */
    var i, px0 = 36, pw = 392;
    for (i = 0; i < 5; i++) {
      var sx = px0 + i * (pw / 5), on = i === si;
      ctx.fillStyle = on ? C.path : i < si ? withAlpha(C.path, 0.35) : "#1a2331";
      ctx.fillRect(sx, 566, pw / 5 - 4, 4);
      text(ctx, String(i + 1), sx, 590, 13, on ? C.bone : C.dimmer, { mono: true });
    }
    text(ctx, "Frames " + STAGES[si].f0 + "–" + STAGES[si].f1 + " · " + (STAGES[si].f0 / FPS).toFixed(0) + "–" + ((STAGES[si].f1 + 1) / FPS).toFixed(0) + " s", 36, 616, 14, C.dim, { mono: true });

    /* ---- right insets ---- */
    var rx = 1412, rw = 472, ry = 130;
    var legendA = window01(f, 0, 1, 330, 24);
    var impA = window01(f, 330, 20, 560, 24);
    var alA = window01(f, 560, 20, 820, 24);
    var imgA = ramp(f, 820, 20);
    drawLegend(ctx, rx, ry, rw, legendA);
    drawImpedanceInset(ctx, f, rx, ry, rw, impA);
    drawAlineInset(ctx, f, rx, ry, rw, alA);
    drawImageInset(ctx, f, rx, ry, rw, imgA);
    drawLimitsPanel(ctx, f, rx, ry + 372, rw, ramp(f, 880, 24));
    /* in earlier stages the lower-right block carries the scope note instead of the limits panel */
    var scopeA = window01(f, 0, 1, 880, 24);
    if (scopeA > 0) {
      ctx.save(); ctx.globalAlpha = scopeA;
      card(ctx, rx, ry + 372, rw, 230, "Scope", C.dim);
      var yy = ry + 434;
      yy = wrapText(ctx, "Source-linked conceptual animation of the pulse-echo mechanism. Not an independent validation of any product or simulation.", rx + 20, yy, rw - 40, 20, 15, C.bone, 400);
      yy = wrapText(ctx, "No device geometry, settings, measured performance, clinical outcomes, certifications or proprietary internals are claimed.", rx + 20, yy + 6, rw - 40, 20, 15, C.dim, 400);
      wrapText(ctx, "Not clinical instruction.", rx + 20, yy + 10, rw - 40, 20, 15, C.dim, 400);
      ctx.restore();
    }

    /* ---- rail + footer ---- */
    drawRail(ctx, f);
    text(ctx, "Source brief p108 · Mechanism reference: National Academies/NCBI, NBK593686 · Kinetic Gain LLC · 2026", 36, 1068, 12, C.dimmer, { mono: true });
    ctx.restore();
  }

  return {
    FPS: FPS, FRAMES: FRAMES, STAGES: STAGES, COLORS: C,
    drawFrame: drawFrame, camera: camera, stageIndex: stageIndex,
    timing: { launch: F_LAUNCH, hit1: F_HIT1, hit2: F_HIT2, echo1: F_ECHO1, echo2: F_ECHO2 }
  };
});
