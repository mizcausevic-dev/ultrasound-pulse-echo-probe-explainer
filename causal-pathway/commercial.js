/* Ultrasound Pulse-Echo Probe — Causal Pathway · 30-second commercial
   Pure function of frame index: drawFrame(ctx, W, H, frame). 900 frames at 30 fps.
   Reuses the explainer renderer (UPE) for the live product window, so what the
   commercial shows is the product, not a mock-up. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./explainer.js"));
  else root.UPE_COMMERCIAL = factory(root.UPE);
})(typeof self !== "undefined" ? self : this, function (UPE) {
  "use strict";
  var FPS = 30, FRAMES = 900;
  var C = UPE.COLORS;
  var FONT = "Inter, 'Segoe UI', 'DejaVu Sans', Arial, sans-serif";
  var MONO = "'JetBrains Mono', 'DejaVu Sans Mono', Menlo, Consolas, monospace";

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  function ramp(f, f0, len) { return smooth((f - f0) / Math.max(1, len)); }
  function win(f, fin, lin, fout, lout) { return ramp(f, fin, lin) * (1 - ramp(f, fout, lout)); }
  function alpha(hex, a) {
    var r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return "rgba(" + r + "," + g + "," + b + "," + clamp(a, 0, 1) + ")";
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function text(ctx, s, x, y, size, color, o) {
    o = o || {};
    ctx.font = (o.weight || 500) + " " + size + "px " + (o.mono ? MONO : FONT);
    ctx.fillStyle = color; ctx.textAlign = o.align || "left"; ctx.textBaseline = "alphabetic";
    ctx.fillText(s, x, y);
  }
  function wrap(ctx, s, x, y, maxW, lh, size, color, weight, align) {
    ctx.font = (weight || 400) + " " + size + "px " + FONT; ctx.fillStyle = color; ctx.textAlign = align || "left";
    var words = s.split(" "), line = "", yy = y, i;
    for (i = 0; i < words.length; i++) {
      var t = line ? line + " " + words[i] : words[i];
      if (ctx.measureText(t).width > maxW && line) { ctx.fillText(line, x, yy); line = words[i]; yy += lh; } else line = t;
    }
    if (line) ctx.fillText(line, x, yy);
    return yy + lh;
  }

  /* SHOTS (frames): 0-89 open · 90-239 reveal · 240-419 three promises · 420-599 three registers · 600-779 image build · 780-899 end card */
  var SHOTS = [
    { f0: 0, f1: 89, name: "open" }, { f0: 90, f1: 239, name: "reveal" }, { f0: 240, f1: 419, name: "promises" },
    { f0: 420, f1: 599, name: "registers" }, { f0: 600, f1: 779, name: "image" }, { f0: 780, f1: 899, name: "end" }
  ];

  /* product window: explainer frame mapped from commercial frame, so the window shows real product output */
  function explainerFrameFor(f) {
    if (f < 90) return 0;
    if (f < 240) return Math.round(lerp(150, 300, (f - 90) / 150));          /* transmit close-up */
    if (f < 420) return Math.round(lerp(330, 560, (f - 240) / 180));         /* reflection → first echo */
    if (f < 600) return Math.round(lerp(560, 749, (f - 420) / 180));         /* receive and depth */
    if (f < 780) return Math.round(lerp(760, 1019, (f - 600) / 180));        /* image build → overview */
    return 1019;
  }

  function productWindow(ctx, f, x, y, w, a) {
    if (a <= 0) return;
    var h = w * 9 / 16;
    ctx.save(); ctx.globalAlpha = a;
    /* frame */
    roundRect(ctx, x - 10, y - 10, w + 20, h + 20, 16);
    ctx.fillStyle = "#070b12"; ctx.fill(); ctx.strokeStyle = C.line; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.shadowColor = "rgba(0,229,255,0.25)"; ctx.shadowBlur = 40; ctx.stroke(); ctx.shadowBlur = 0;
    /* content: the actual explainer, drawn through a transform */
    ctx.save();
    roundRect(ctx, x, y, w, h, 8); ctx.clip();
    ctx.translate(x, y); ctx.scale(w / 1920, w / 1920);
    UPE.drawFrame(ctx, 1920, 1080, explainerFrameFor(f));
    ctx.restore();
    /* live badge */
    var ef = explainerFrameFor(f);
    text(ctx, "LIVE PRODUCT OUTPUT · frame " + String(ef).padStart(4, "0") + " / 1019", x + w, y + h + 34, 13, C.dim, { mono: true, align: "right", weight: 600 });
    ctx.restore();
  }

  function pulseLine(ctx, f, y, f0, color) {
    /* a short cyan pulse travelling left → right across the stage */
    var t = (f - f0) / 70;
    if (t < 0 || t > 1.2) return;
    var x = lerp(-100, 2020, t);
    ctx.save(); ctx.globalAlpha = 1 - smooth((t - 0.9) / 0.3);
    ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.shadowColor = color; ctx.shadowBlur = 18;
    var i;
    for (i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(x - i * 14, y - 18 + i * 2); ctx.lineTo(x - i * 14, y + 18 - i * 2); ctx.stroke(); }
    ctx.restore();
  }

  function kicker(ctx, s, x, y, color, a) {
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = a;
    ctx.fillStyle = color; ctx.fillRect(x, y - 13, 4, 16);
    text(ctx, s.toUpperCase(), x + 14, y, 14, C.dim, { mono: true, weight: 600 });
    ctx.restore();
  }

  function drawFrame(ctx, W, H, frame) {
    var f = clamp(Math.round(frame), 0, FRAMES - 1);
    var s = W / 1920;
    ctx.save();
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    ctx.scale(s, s);
    var vg = ctx.createRadialGradient(960, 540, 100, 960, 540, 1400);
    vg.addColorStop(0, "#101a29"); vg.addColorStop(1, C.bg);
    ctx.fillStyle = vg; ctx.fillRect(0, 0, 1920, 1080);
    /* subtle grid */
    ctx.strokeStyle = "rgba(255,255,255,0.03)"; ctx.lineWidth = 1;
    var g;
    for (g = 0; g <= 1920; g += 96) { ctx.beginPath(); ctx.moveTo(g, 0); ctx.lineTo(g, 1080); ctx.stroke(); }
    for (g = 0; g <= 1080; g += 96) { ctx.beginPath(); ctx.moveTo(0, g); ctx.lineTo(1920, g); ctx.stroke(); }

    var a;
    /* ---- SHOT 1: open (0–89) ---- */
    a = win(f, 6, 18, 74, 16);
    if (a > 0) {
      pulseLine(ctx, f, 540, 0, C.path);
      ctx.save(); ctx.globalAlpha = a;
      kicker(ctx, "Kinetic Gain · code-driven motion explainer", 960 - 330, 420, C.path, 1);
      text(ctx, "One pulse. One echo.", 960, 540, 72, C.bone, { align: "center", weight: 700 });
      text(ctx, "One line of the picture.", 960, 625, 72, C.bone, { align: "center", weight: 700 });
      ctx.restore();
    }
    /* ---- SHOT 2: reveal (90–239) ---- */
    a = win(f, 90, 20, 226, 14);
    if (a > 0) {
      ctx.save(); ctx.globalAlpha = a;
      kicker(ctx, "Medical technology · p108", 96, 150, C.path, 1);
      text(ctx, "Ultrasound Pulse-Echo Probe", 96, 226, 46, C.bone, { weight: 700 });
      text(ctx, "Causal Pathway", 96, 286, 46, C.path, { weight: 700 });
      wrap(ctx, "A 34-second, frame-locked explainer. Electrical drive becomes an acoustic pulse, the pulse splits at every impedance step, and arrival time becomes depth.", 96, 372, 560, 34, 24, C.dim, 400);
      text(ctx, "34 s · 30 fps · 1,020 frames · indexed 0–1019", 96, 540, 16, C.dimmer, { mono: true });
      ctx.restore();
      productWindow(ctx, f, 800, 200, 1020, a * ramp(f, 104, 22));
    }
    /* ---- SHOT 3: three promises (240–419) ---- */
    a = win(f, 240, 20, 406, 14);
    if (a > 0) {
      productWindow(ctx, f, 96, 150, 1000, a);
      var cards = [
        ["Frame-locked", "The same frame index always draws the same picture. No clocks, no randomness. Scrub it in the browser or render it frame-exact to video.", C.path],
        ["Every boundary, audited", "At each step the plate states what changes and what is conserved: energy form, frequency, timing, the energy ledger.", C.energy],
        ["Source-linked, not invented", "No device geometry, settings, measured performance, certifications or proprietary internals. Limits stay on the plate.", C.sense]
      ];
      var i;
      for (i = 0; i < cards.length; i++) {
        var ca = win(f, 262 + i * 26, 18, 406, 14);
        if (ca <= 0) continue;
        var cy = 150 + i * 210, cx = 1180;
        ctx.save(); ctx.globalAlpha = ca;
        ctx.translate(0, (1 - ca) * 20);
        roundRect(ctx, cx, cy, 644, 180, 14); ctx.fillStyle = "rgba(13,19,29,0.94)"; ctx.fill(); ctx.strokeStyle = C.line; ctx.lineWidth = 1.2; ctx.stroke();
        ctx.fillStyle = cards[i][2]; ctx.fillRect(cx + 22, cy + 28, 5, 34);
        text(ctx, cards[i][0], cx + 42, cy + 56, 30, C.bone, { weight: 700 });
        wrap(ctx, cards[i][1], cx + 42, cy + 96, 580, 28, 20, C.dim, 400);
        ctx.restore();
      }
    }
    /* ---- SHOT 4: three registers (420–599) ---- */
    a = win(f, 420, 20, 586, 14);
    if (a > 0) {
      ctx.save(); ctx.globalAlpha = a;
      kicker(ctx, "One mechanism · three registers", 96, 150, C.sense, 1);
      text(ctx, "Written for engineers, for product teams,", 96, 224, 48, C.bone, { weight: 700 });
      text(ctx, "and for everyone else.", 96, 282, 48, C.bone, { weight: 700 });
      var regs = [
        ["Engineers and developers", "Pure function of frame · stage table · boundary ledger · render loop", C.path],
        ["Product and business readers", "What it is, what it is not, how to use it without overclaiming", C.energy],
        ["Everyone else", "The canyon-echo version. Why gel. Why deeper is dimmer.", C.sense]
      ];
      var j;
      for (j = 0; j < regs.length; j++) {
        var ra = win(f, 450 + j * 24, 18, 586, 14);
        if (ra <= 0) continue;
        var ry = 350 + j * 150;
        ctx.save(); ctx.globalAlpha = ra; ctx.translate((1 - ra) * -20, 0);
        roundRect(ctx, 96, ry, 760, 120, 14); ctx.fillStyle = "rgba(13,19,29,0.94)"; ctx.fill(); ctx.strokeStyle = C.line; ctx.stroke();
        ctx.fillStyle = regs[j][2]; ctx.beginPath(); ctx.arc(140, ry + 60, 12, 0, Math.PI * 2); ctx.fill();
        text(ctx, regs[j][0], 174, ry + 52, 26, C.bone, { weight: 700 });
        text(ctx, regs[j][1], 174, ry + 86, 18, C.dim, { weight: 400 });
        ctx.restore();
      }
      ctx.restore();
      productWindow(ctx, f, 920, 300, 900, a);
    }
    /* ---- SHOT 5: image build (600–779) ---- */
    a = win(f, 600, 20, 766, 14);
    if (a > 0) {
      productWindow(ctx, f, 300, 120, 1320, a);
      ctx.save(); ctx.globalAlpha = a * ramp(f, 640, 20);
      text(ctx, "Ends on a stable overview, with the limits still on the plate.", 960, 952, 34, C.bone, { align: "center", weight: 600 });
      text(ctx, "Depth assumes a sound speed · no universal diagnosis · no perfect resolution · no clinical exposure settings", 960, 996, 17, C.dim, { align: "center", mono: true });
      ctx.restore();
    }
    /* ---- SHOT 6: end card (780–899) ---- */
    a = ramp(f, 780, 22);
    if (a > 0) {
      pulseLine(ctx, f, 330, 784, C.path);
      ctx.save(); ctx.globalAlpha = a;
      text(ctx, "Scrub it. Render it. Read it.", 960, 470, 64, C.bone, { align: "center", weight: 700 });
      ctx.font = "600 30px " + MONO;
      var url = "mizcausevic-dev.github.io/ultrasound-pulse-echo-probe-explainer/causal-pathway/";
      var uw = ctx.measureText(url).width + 56;
      roundRect(ctx, 960 - uw / 2, 520, uw, 64, 12); ctx.fillStyle = alpha(C.path, 0.12); ctx.fill(); ctx.strokeStyle = alpha(C.path, 0.6); ctx.lineWidth = 1.5; ctx.stroke();
      text(ctx, url, 960, 562, 30, C.path, { align: "center", mono: true, weight: 600 });
      text(ctx, "Interactive explainer · rendered video · diagram · mind map · article in three registers", 960, 640, 20, C.dim, { align: "center" });
      text(ctx, "KINETIC GAIN LLC · BOSTON · 2026", 960, 720, 15, C.dimmer, { align: "center", mono: true, weight: 600 });
      wrap(ctx, "Source-linked conceptual animation. Not a measurement, not a product claim, not clinical instruction. Mechanism reference: National Academies/NCBI, NBK593686.", 960, 980, 1200, 24, 15, C.dimmer, 400, "center");
      ctx.restore();
    }
    /* legend strip for colors, shots 2-5 */
    a = win(f, 100, 20, 776, 14);
    if (a > 0) {
      ctx.save(); ctx.globalAlpha = a;
      var sw = [[C.path, "primary path"], [C.energy, "energy / actuation"], [C.sense, "measurement / state"]], k, lx = 96;
      for (k = 0; k < sw.length; k++) {
        ctx.fillStyle = sw[k][0]; ctx.fillRect(lx, 1026, 18, 10);
        text(ctx, sw[k][1], lx + 26, 1036, 14, C.dim, { mono: true });
        lx += 26 + ctx.measureText(sw[k][1]).width + 40;
      }
      text(ctx, "color is explanatory, not literal emission", 1824, 1036, 14, C.dimmer, { mono: true, align: "right" });
      ctx.restore();
    }
    /* progress hairline */
    ctx.fillStyle = alpha(C.path, 0.35); ctx.fillRect(0, 1076, 1920 * (f / (FRAMES - 1)), 4);
    ctx.restore();
  }

  return { FPS: FPS, FRAMES: FRAMES, SHOTS: SHOTS, drawFrame: drawFrame, explainerFrameFor: explainerFrameFor };
});
