#!/usr/bin/env node
/* Generates media/diagram-causal-pathway.svg and media/mindmap.svg from code.
   The mind map uses the orbital ring layout: K sectors around a hub, each fanned over one or two rings.
   node diagrams.js ../media */
"use strict";
const fs = require("fs");
const path = require("path");
const outDir = path.resolve(process.argv[2] || "../media");
fs.mkdirSync(outDir, { recursive: true });

const C = { bg: "#0B1019", panel: "#111823", line: "#25324a", bone: "#e6edf5", dim: "#8ea0b3", dimmer: "#5c6b7d", path: "#00E5FF", energy: "#FFD166", sense: "#9D4EDD", metal: "#9aafc4" };
const FONT = "Inter, 'Segoe UI', 'DejaVu Sans', Arial, sans-serif";
const MONO = "'JetBrains Mono', 'DejaVu Sans Mono', Menlo, monospace";
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/* ---------- 1. causal pathway diagram ---------- */
function diagram() {
  const W = 1920, H = 900;
  const nodes = [
    ["Trigger", "electrical pulse, t = 0", C.energy],
    ["Element", "piezoelectric, voltage → vibration", C.energy],
    ["Pulse", "short pressure pulse out", C.path],
    ["Interface", "impedance step Z₁ → Z₂", C.path],
    ["Echo", "reflected part returns", C.path],
    ["Receive", "vibration → voltage vs time", C.sense],
    ["Depth", "d = c · t / 2, c assumed", C.sense],
    ["Image", "one column per scan line", C.sense]
  ];
  const boundaries = [
    { title: "electrical → mechanical", changes: "energy form", conserved: "trigger time, center frequency" },
    { title: "element → gel → skin", changes: "medium: impedance, sound speed", conserved: "frequency; matching layer + gel reduce mismatch" },
    { title: "tissue interface", changes: "amplitude splits; reflected part reverses", conserved: "frequency; incident = reflected + transmitted + absorbed" },
    { title: "return path", changes: "amplitude decays (attenuation)", conserved: "arrival order" },
    { title: "mechanical → electrical", changes: "energy form", conserved: "arrival times" },
    { title: "time → depth", changes: "time axis becomes depth axis", conserved: "the mapping, if c is assumed" },
    { title: "signal → image", changes: "amplitude becomes brightness", conserved: "causal order per line; detail lost to limits" }
  ];
  const x0 = 120, x1 = 1800, y = 300, step = (x1 - x0) / (nodes.length - 1);
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="t d">
<title id="t">Ultrasound pulse-echo probe: causal pathway</title>
<desc id="d">Eight-node primary pathway from electrical trigger to image, with what changes and what is conserved at each of the seven boundaries.</desc>
<rect width="${W}" height="${H}" fill="${C.bg}"/>
<text x="60" y="70" font-family="${MONO}" font-size="16" font-weight="600" letter-spacing="2" fill="${C.dim}">ULTRASOUND PULSE-ECHO PROBE · CAUSAL PATHWAY</text>
<text x="60" y="118" font-family="${FONT}" font-size="36" font-weight="700" fill="${C.bone}">One primary pathway, seven boundaries</text>
<text x="60" y="152" font-family="${FONT}" font-size="18" fill="${C.dim}">Cyan: primary acoustic path · Gold: energy or actuation · Violet: measurement or state · colors are explanatory, not literal emission</text>
<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0 0L10 5L0 10z" fill="${C.metal}"/></marker></defs>\n`;
  nodes.forEach((n, i) => {
    const x = x0 + i * step;
    if (i < nodes.length - 1) s += `<line x1="${x + 46}" y1="${y}" x2="${x + step - 46}" y2="${y}" stroke="${n[2]}" stroke-width="3" opacity="0.7" marker-end="url(#ah)"/>\n`;
    s += `<circle cx="${x}" cy="${y}" r="40" fill="${C.panel}" stroke="${n[2]}" stroke-width="4"/>
<circle cx="${x}" cy="${y}" r="14" fill="${n[2]}"/>
<text x="${x}" y="${y + 78}" text-anchor="middle" font-family="${FONT}" font-size="24" font-weight="700" fill="${C.bone}">${esc(n[0])}</text>
<text x="${x}" y="${y + 106}" text-anchor="middle" font-family="${FONT}" font-size="15" fill="${C.dim}">${esc(n[1])}</text>\n`;
  });
  /* boundary cards, alternating above-row and below-row to stay readable */
  boundaries.forEach((b, i) => {
    const x = x0 + (i + 0.5) * step, w = 236, h = 180, bx = x - w / 2;
    const by = i % 2 === 0 ? 470 : 680;
    s += `<line x1="${x}" y1="${y + 118}" x2="${x}" y2="${by}" stroke="${C.line}" stroke-width="1.5" stroke-dasharray="4 6"/>
<rect x="${bx}" y="${by}" width="${w}" height="${h}" rx="12" fill="${C.panel}" stroke="${C.line}" stroke-width="1.5"/>
<rect x="${bx + 16}" y="${by + 18}" width="4" height="16" fill="${C.path}"/>
<text x="${bx + 28}" y="${by + 31}" font-family="${MONO}" font-size="12" font-weight="600" letter-spacing="1" fill="${C.dim}">BOUNDARY ${i + 1}</text>
<text x="${bx + 16}" y="${by + 58}" font-family="${FONT}" font-size="17" font-weight="700" fill="${C.bone}">${esc(b.title)}</text>
<text x="${bx + 16}" y="${by + 86}" font-family="${MONO}" font-size="11" font-weight="600" letter-spacing="1" fill="${C.path}">CHANGES</text>
${wrapSvg(b.changes, bx + 16, by + 106, w - 32, 15, 17, C.bone)}
<text x="${bx + 16}" y="${by + 140}" font-family="${MONO}" font-size="11" font-weight="600" letter-spacing="1" fill="${C.dim}">CONSERVED</text>
${wrapSvg(b.conserved, bx + 16, by + 160, w - 32, 13, 15, C.dim)}\n`;
  });
  s += `<text x="60" y="${H - 30}" font-family="${MONO}" font-size="13" fill="${C.dimmer}">Source brief p108 · Mechanism reference: National Academies/NCBI NBK593686 · conceptual, not a measurement or product claim · Kinetic Gain LLC 2026</text>
</svg>`;
  fs.writeFileSync(path.join(outDir, "diagram-causal-pathway.svg"), s);
}

function wrapSvg(text, x, y, maxW, size, lh, fill, anchor) {
  /* approximate wrapping: average glyph width ≈ 0.55 em for Inter */
  const maxChars = Math.max(8, Math.floor(maxW / (size * 0.55)));
  const words = text.split(" "), lines = []; let line = "";
  for (const w of words) { const t = line ? line + " " + w : w; if (t.length > maxChars && line) { lines.push(line); line = w; } else line = t; }
  if (line) lines.push(line);
  return lines.map((l, i) => `<text x="${x}" y="${y + i * lh}" ${anchor ? `text-anchor="${anchor}"` : ""} font-family="${FONT}" font-size="${size}" fill="${fill}">${esc(l)}</text>`).join("\n");
}

/* ---------- 2. mind map: orbital ring layout ---------- */
function layoutSectors(items, groupIds, opt) {
  /* Group N items into K sectors around a center. Fan each sector across one or two concentric rings
     using radius and angle spread to avoid overlap. Returns {x,y} per item plus the hub. */
  const { hubRadius, innerRing, outerRing, maxSpreadDeg, splitAt } = opt;
  const stagger = opt.stagger || 0;
  const groups = [...new Set(groupIds)];
  const K = groups.length, sectorDeg = 360 / K;
  const pos = new Array(items.length);
  groups.forEach((g, gi) => {
    const idx = items.map((_, i) => i).filter((i) => groupIds[i] === g);
    const center = -90 + gi * sectorDeg;                  /* first sector at top, clockwise */
    const spread = Math.min(maxSpreadDeg, sectorDeg * 0.82);
    const shift = (gi % 2) * stagger;   /* alternate sectors sit on shifted rings so neighbours never touch */
    const useTwo = idx.length > splitAt;
    const inner = useTwo ? idx.filter((_, k) => k % 2 === 0) : idx;
    const outer = useTwo ? idx.filter((_, k) => k % 2 === 1) : [];
    const place = (list, r, frac) => list.forEach((i, k) => {
      const sp = spread * frac;           /* inner ring uses a narrower fan so rings interleave in angle */
      const a = list.length === 1 ? center : center - sp / 2 + (sp * k) / (list.length - 1);
      const rad = (a * Math.PI) / 180;
      pos[i] = { x: Math.cos(rad) * r, y: Math.sin(rad) * r, angle: a, ring: r < outerRing ? 0 : 1, group: g };
    });
    place(inner, innerRing + shift, useTwo ? 0.72 : 1); place(outer, outerRing + shift, 1.0);
  });
  return { positions: pos, hub: { x: 0, y: 0, r: hubRadius } };
}

function mindmap() {
  const W = 2200, H = 2000, cx = 1100, cy = 1040;
  const sectors = [
    { id: "s1", label: "1 · Reveal", color: C.metal, items: ["Housing + array", "Matching layer + gel", "Skin + tissue section", "Two acoustic interfaces"] },
    { id: "s2", label: "2 · Transmit", color: C.energy, items: ["TX trigger, t = 0", "Piezo: voltage → vibration", "Backing damps ring", "Short pressure pulse"] },
    { id: "s3", label: "3 · Reflect", color: C.path, items: ["Z = ρ · c", "R = ((Z₂−Z₁)/(Z₂+Z₁))²", "Reflect + transmit split", "Energy ledger conserved"] },
    { id: "s4", label: "4 · Receive", color: C.sense, items: ["Same elements receive", "A-line: amplitude vs time", "d = c · t / 2, c assumed", "Deeper: later, weaker"] },
    { id: "s5", label: "5 · Image", color: C.sense, items: ["Scan line by line", "Column per line", "Brightness ∝ amplitude", "Stable overview"] },
    { id: "lim", label: "Limits", color: C.energy, items: ["Depth assumes c", "Axial: pulse length", "Lateral: beam width", "No diagnosis, no settings"] },
    { id: "build", label: "Build", color: C.path, items: ["34 s · 30 fps · 1,020 f", "Pure function of frame", "Player + MP4 + ad", "Source-linked"] }
  ];
  const items = [], groupIds = [];
  sectors.forEach((s) => s.items.forEach((it) => { items.push(it); groupIds.push(s.id); }));
  const L = layoutSectors(items, groupIds, { hubRadius: 150, innerRing: 540, outerRing: 760, maxSpreadDeg: 36, splitAt: 2, stagger: 90 });
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="t d">
<title id="t">Mind map: ultrasound pulse-echo probe causal pathway explainer</title>
<desc id="d">Orbital ring layout. Hub: the pulse-echo mechanism. Seven sectors: five stages, limits, and build facts.</desc>
<rect width="${W}" height="${H}" fill="${C.bg}"/>
<text x="60" y="64" font-family="${MONO}" font-size="16" font-weight="600" letter-spacing="2" fill="${C.dim}">MIND MAP · ORBITAL RING LAYOUT</text>
<text x="60" y="108" font-family="${FONT}" font-size="34" font-weight="700" fill="${C.bone}">Ultrasound Pulse-Echo Probe · Causal Pathway</text>
<circle cx="${cx}" cy="${cy}" r="540" fill="none" stroke="${C.line}" stroke-width="1" stroke-dasharray="3 8"/>
<circle cx="${cx}" cy="${cy}" r="760" fill="none" stroke="${C.line}" stroke-width="1" stroke-dasharray="3 8"/>\n`;
  /* sector spokes and labels */
  sectors.forEach((sec, gi) => {
    const a = (-90 + gi * (360 / sectors.length)) * Math.PI / 180;
    const lx = cx + Math.cos(a) * 262, ly = cy + Math.sin(a) * 262;
    s += `<line x1="${cx + Math.cos(a) * 152}" y1="${cy + Math.sin(a) * 152}" x2="${cx + Math.cos(a) * 400}" y2="${cy + Math.sin(a) * 400}" stroke="${sec.color}" stroke-width="2" opacity="0.35"/>
<rect x="${lx - 70}" y="${ly - 20}" width="140" height="40" rx="20" fill="${C.panel}" stroke="${sec.color}" stroke-width="2"/>
<text x="${lx}" y="${ly + 6}" text-anchor="middle" font-family="${FONT}" font-size="17" font-weight="700" fill="${C.bone}">${esc(sec.label)}</text>\n`;
  });
  /* items */
  L.positions.forEach((p, i) => {
    const sec = sectors.find((q) => q.id === p.group);
    const x = cx + p.x, y = cy + p.y;
    const w = Math.min(290, 9.2 * items[i].length + 36), h = 38;
    s += `<line x1="${cx + Math.cos(p.angle * Math.PI / 180) * 262}" y1="${cy + Math.sin(p.angle * Math.PI / 180) * 262}" x2="${x}" y2="${y}" stroke="${sec.color}" stroke-width="1.5" opacity="0.5"/>
<rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="8" fill="${C.panel}" stroke="${sec.color}" stroke-width="1.5"/>
<text x="${x}" y="${y + 6}" text-anchor="middle" font-family="${FONT}" font-size="16" fill="${C.bone}">${esc(items[i])}</text>\n`;
  });
  /* hub */
  s += `<circle cx="${cx}" cy="${cy}" r="150" fill="${C.panel}" stroke="${C.path}" stroke-width="3"/>
<text x="${cx}" y="${cy - 26}" text-anchor="middle" font-family="${MONO}" font-size="13" font-weight="600" letter-spacing="2" fill="${C.dim}">MECHANISM</text>
<text x="${cx}" y="${cy + 6}" text-anchor="middle" font-family="${FONT}" font-size="24" font-weight="700" fill="${C.bone}">Pulse-echo</text>
<text x="${cx}" y="${cy + 36}" text-anchor="middle" font-family="${FONT}" font-size="16" fill="${C.dim}">trigger → pulse → echo →</text>
<text x="${cx}" y="${cy + 58}" text-anchor="middle" font-family="${FONT}" font-size="16" fill="${C.dim}">time → depth → image</text>
<text x="60" y="${H - 30}" font-family="${MONO}" font-size="13" fill="${C.dimmer}">Source brief p108 · conceptual map of the explainer, not a device specification · Kinetic Gain LLC 2026</text>
</svg>`;
  fs.writeFileSync(path.join(outDir, "mindmap.svg"), s);
}

diagram(); mindmap();
console.log("wrote", path.join(outDir, "diagram-causal-pathway.svg"), "and", path.join(outDir, "mindmap.svg"));
