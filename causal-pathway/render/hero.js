#!/usr/bin/env node
/* Hero image (2400×1260) and explainer poster, drawn in code. Deterministic.
   node hero.js ../media/hero.png
   node hero.js ../media/poster-explainer.png --poster   (frame 1000 of the explainer at 1920×1080) */
"use strict";
const fs = require("fs");
const path = require("path");
const { createCanvas } = require("canvas");

const out = path.resolve(process.argv[2] || "../media/hero.png");
fs.mkdirSync(path.dirname(out), { recursive: true });

if (process.argv.includes("--poster")) {
  const UPE = require("../explainer.js");
  const c = createCanvas(1920, 1080), x = c.getContext("2d");
  UPE.drawFrame(x, 1920, 1080, 1000);
  fs.writeFileSync(out, c.toBuffer("image/png"));
  console.log("wrote", out);
  process.exit(0);
}

const W = 2400, H = 1260;
const canvas = createCanvas(W, H);
const ctx = canvas.getContext("2d");
const C = { bg: "#0B1019", bone: "#e6edf5", dim: "#8ea0b3", dimmer: "#5c6b7d", path: "#00E5FF", energy: "#FFD166", sense: "#9D4EDD", line: "#25324a" };
const FONT = "Inter, 'DejaVu Sans', Arial, sans-serif", MONO = "'JetBrains Mono', 'DejaVu Sans Mono', monospace";
const rgba = (hex, a) => `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${a})`;
const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >> 13)) * 1274126177; h ^= h >> 16; return ((h >>> 0) % 10000) / 10000; };

/* background */
ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
const vg = ctx.createRadialGradient(1500, 600, 100, 1500, 600, 1500);
vg.addColorStop(0, "#111c2c"); vg.addColorStop(1, C.bg);
ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
ctx.strokeStyle = "rgba(255,255,255,0.035)"; ctx.lineWidth = 1;
for (let g = 0; g <= W; g += 100) { ctx.beginPath(); ctx.moveTo(g, 0); ctx.lineTo(g, H); ctx.stroke(); }
for (let g = 0; g <= H; g += 100) { ctx.beginPath(); ctx.moveTo(0, g); ctx.lineTo(W, g); ctx.stroke(); }

/* ---- right: stylized section ---- */
const sx0 = 1240, sx1 = 2300;
const skinY = 420, i1 = 700, i2 = 920, botY = 1180;
const i2y = (x) => i2 + 40 * Math.sin((x - 1300) / 700 * Math.PI) - 10;
/* tissue layers */
const gA = ctx.createLinearGradient(0, skinY, 0, i1); gA.addColorStop(0, "#2d3545"); gA.addColorStop(1, "#262e3c");
ctx.fillStyle = gA; ctx.fillRect(sx0, skinY + 30, sx1 - sx0, i1 - skinY - 30);
ctx.fillStyle = "#303a4b"; ctx.beginPath(); ctx.moveTo(sx0, i1); ctx.lineTo(sx1, i1);
for (let x = sx1; x >= sx0; x -= 20) ctx.lineTo(x, i2y(x)); ctx.closePath(); ctx.fill();
ctx.fillStyle = "#1e2634"; ctx.beginPath(); ctx.moveTo(sx0, i2y(sx0));
for (let x = sx0; x <= sx1; x += 20) ctx.lineTo(x, i2y(x)); ctx.lineTo(sx1, botY); ctx.lineTo(sx0, botY); ctx.closePath(); ctx.fill();
ctx.strokeStyle = "rgba(255,255,255,0.05)";
for (let i = 0; i < 220; i++) {
  const tx = sx0 + hash(i, 1) * (sx1 - sx0), ty = skinY + 30 + hash(i, 2) * (botY - skinY - 30), len = 16 + hash(i, 3) * 40, ang = (hash(i, 4) - 0.5);
  ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx + Math.cos(ang) * len, ty + Math.sin(ang) * len); ctx.stroke();
}
/* skin */
const gs = ctx.createLinearGradient(0, skinY, 0, skinY + 30); gs.addColorStop(0, "#4d4b55"); gs.addColorStop(1, "#3c3b45");
ctx.fillStyle = gs; ctx.fillRect(sx0, skinY, sx1 - sx0, 30);
/* interfaces */
ctx.lineWidth = 2.5; ctx.strokeStyle = "rgba(230,237,245,0.4)";
ctx.beginPath(); ctx.moveTo(sx0, i1); ctx.lineTo(sx1, i1); ctx.stroke();
ctx.strokeStyle = "rgba(230,237,245,0.55)";
ctx.beginPath(); for (let x = sx0; x <= sx1; x += 10) (x === sx0 ? ctx.moveTo(x, i2y(x)) : ctx.lineTo(x, i2y(x))); ctx.stroke();
ctx.strokeStyle = "rgba(154,175,196,0.35)"; ctx.lineWidth = 2; ctx.strokeRect(sx0, skinY, sx1 - sx0, botY - skinY);

/* probe */
const pcx = 1770;
ctx.strokeStyle = "#2a3545"; ctx.lineWidth = 18; ctx.lineCap = "round";
ctx.beginPath(); ctx.moveTo(pcx, 40); ctx.lineTo(pcx, 110); ctx.stroke();
const rr = (x, y, w, h, r) => { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); };
const gh = ctx.createLinearGradient(pcx - 120, 0, pcx + 120, 0); gh.addColorStop(0, "#2b3646"); gh.addColorStop(0.5, "#3c4a5e"); gh.addColorStop(1, "#232d3b");
ctx.fillStyle = gh; rr(pcx - 120, 100, 240, 110, 26); ctx.fill(); ctx.strokeStyle = "#9aafc4"; ctx.lineWidth = 1.5; ctx.stroke();
const gb = ctx.createLinearGradient(pcx - 300, 0, pcx + 300, 0); gb.addColorStop(0, "#2a3443"); gb.addColorStop(0.45, "#3e4c60"); gb.addColorStop(1, "#222b38");
ctx.fillStyle = gb; ctx.beginPath(); ctx.moveTo(pcx - 170, 210); ctx.lineTo(pcx + 170, 210); ctx.lineTo(pcx + 300, 360); ctx.lineTo(pcx - 300, 360); ctx.closePath(); ctx.fill(); ctx.stroke();
ctx.fillStyle = "#171f2a"; ctx.fillRect(pcx - 280, 322, 560, 38);
for (let i = 0; i < 16; i++) {
  const ex = pcx - 272 + i * 34, on = i >= 5 && i <= 10;
  ctx.fillStyle = on ? rgba(C.energy, 0.5) : "#4a5b72"; ctx.fillRect(ex, 360, 30, 36);
  ctx.strokeStyle = on ? C.energy : "#6c7f98"; ctx.lineWidth = on ? 2 : 1; ctx.strokeRect(ex + 0.5, 360.5, 29, 35);
}
ctx.fillStyle = "#5a6c84"; ctx.fillRect(pcx - 280, 396, 560, 14);
/* gel */
ctx.fillStyle = rgba(C.path, 0.12); ctx.beginPath(); ctx.moveTo(pcx - 330, skinY); ctx.quadraticCurveTo(pcx - 300, 412, pcx - 270, 410); ctx.lineTo(pcx + 270, 410); ctx.quadraticCurveTo(pcx + 300, 412, pcx + 330, skinY); ctx.closePath(); ctx.fill();
ctx.strokeStyle = rgba(C.path, 0.35); ctx.lineWidth = 1.5; ctx.stroke();
/* gold drive */
ctx.strokeStyle = C.energy; ctx.lineWidth = 4; ctx.shadowColor = C.energy; ctx.shadowBlur = 16;
ctx.beginPath(); ctx.moveTo(pcx, 225); ctx.lineTo(pcx, 300); ctx.stroke();
ctx.beginPath(); ctx.moveTo(pcx - 90, 300); ctx.lineTo(pcx + 90, 300); ctx.stroke();
for (let i = 0; i < 6; i++) { const x = pcx - 90 + i * 36; ctx.beginPath(); ctx.moveTo(x, 300); ctx.lineTo(x, 356); ctx.stroke(); }
ctx.shadowBlur = 0;
/* beam envelope */
ctx.setLineDash([8, 10]); ctx.strokeStyle = rgba(C.path, 0.35); ctx.lineWidth = 1.5;
ctx.beginPath(); ctx.moveTo(pcx - 105, 410); ctx.lineTo(pcx - 80, 720); ctx.lineTo(pcx - 120, botY); ctx.stroke();
ctx.beginPath(); ctx.moveTo(pcx + 105, 410); ctx.lineTo(pcx + 80, 720); ctx.lineTo(pcx + 120, botY); ctx.stroke();
ctx.setLineDash([]);
/* pulse bands: outgoing (deep), echo 1 and echo 2 returning */
function band(y, w, a, k) {
  ctx.save(); ctx.globalAlpha = a; ctx.lineCap = "round"; ctx.shadowColor = C.path; ctx.shadowBlur = 14;
  for (let i = 0; i < 3; i++) { ctx.strokeStyle = C.path; ctx.lineWidth = 6 * (1 - i * 0.22); ctx.beginPath(); ctx.moveTo(pcx - w, y - k * i * 16); ctx.lineTo(pcx + w, y - k * i * 16); ctx.stroke(); }
  ctx.restore();
}
band(1040, 110, 0.55, 1);
band(840, 92, 0.35, -1);
band(560, 100, 0.75, -1);
/* interface flash on interface 1 */
ctx.save(); ctx.globalAlpha = 0.5; ctx.strokeStyle = C.bone; ctx.lineWidth = 3; ctx.shadowColor = C.path; ctx.shadowBlur = 24;
ctx.beginPath(); ctx.moveTo(pcx - 150, i1); ctx.lineTo(pcx + 150, i1); ctx.stroke(); ctx.restore();
/* violet receive */
ctx.save(); ctx.strokeStyle = C.sense; ctx.lineWidth = 4; ctx.shadowColor = C.sense; ctx.shadowBlur = 14;
ctx.beginPath(); ctx.moveTo(pcx + 140, 356); ctx.lineTo(pcx + 140, 300); ctx.lineTo(pcx + 230, 300); ctx.lineTo(pcx + 230, 240); ctx.stroke(); ctx.restore();
/* A-line card (mathematical inset, physically separate) */
const ax = 1270, ay = 470, aw = 380, ah = 190;
rr(ax, ay, aw, ah, 12); ctx.fillStyle = "rgba(13,19,29,0.94)"; ctx.fill(); ctx.strokeStyle = C.line; ctx.lineWidth = 1.5; ctx.stroke();
ctx.fillStyle = C.sense; ctx.fillRect(ax + 16, ay + 18, 4, 18);
ctx.font = `600 15px ${MONO}`; ctx.fillStyle = C.dim; ctx.textAlign = "left"; ctx.fillText("A-LINE · AMPLITUDE VS ARRIVAL TIME", ax + 30, ay + 33);
ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(ax + 30, ay + 120); ctx.lineTo(ax + aw - 30, ay + 120); ctx.stroke();
ctx.strokeStyle = C.sense; ctx.lineWidth = 2.5; ctx.shadowColor = C.sense; ctx.shadowBlur = 8; ctx.beginPath();
for (let i = 0; i <= 320; i++) {
  const u = i / 320; let v = 0;
  const d1 = (u - 0.42) * 60, d2 = (u - 0.78) * 60;
  if (d1 >= 0 && d1 < 14) v += 0.95 * Math.exp(-d1 / 4) * Math.sin(d1 * 2.2);
  if (d2 >= 0 && d2 < 14) v += 0.4 * Math.exp(-d2 / 4) * Math.sin(d2 * 2.2);
  const px = ax + 30 + u * (aw - 60), py = ay + 120 - v * 48;
  i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
}
ctx.stroke(); ctx.shadowBlur = 0;
ctx.font = `600 20px ${MONO}`; ctx.fillStyle = C.bone; ctx.fillText("d = c · t / 2", ax + 30, ay + 70);
ctx.font = `400 13px ${FONT}`; ctx.fillStyle = C.dimmer; ctx.fillText("c assumed, not measured", ax + 30, ay + 176);
ctx.font = `400 12px ${MONO}`; ctx.fillStyle = C.dim; ctx.fillText("t = 0", ax + 24, ay + 146); ctx.textAlign = "right"; ctx.fillText("arrival time →", ax + aw - 30, ay + 146);

/* ---- left: type ---- */
ctx.textAlign = "left";
ctx.fillStyle = C.path; ctx.fillRect(120, 236, 6, 22);
ctx.font = `600 22px ${MONO}`; ctx.fillStyle = C.dim; ctx.fillText("MEDICAL TECHNOLOGY · CODE-DRIVEN MOTION EXPLAINER", 142, 256);
ctx.font = `700 96px ${FONT}`; ctx.fillStyle = C.bone;
ctx.fillText("Ultrasound", 120, 380); ctx.fillText("Pulse-Echo Probe", 120, 490);
ctx.fillStyle = C.path; ctx.fillText("Causal Pathway", 120, 600);
ctx.font = `400 34px ${FONT}`; ctx.fillStyle = C.dim;
const lines = ["What changes, and what is conserved,", "at every boundary from trigger to image."];
lines.forEach((l, i) => ctx.fillText(l, 122, 690 + i * 46));
ctx.font = `500 22px ${MONO}`; ctx.fillStyle = C.dimmer;
ctx.fillText("34 s · 30 fps · 1,020 frames · pure function of frame · source-linked", 122, 810);
/* color grammar chips */
const chips = [[C.path, "primary path"], [C.energy, "energy / actuation"], [C.sense, "measurement / state"]];
let cx = 122;
chips.forEach(([col, lab]) => {
  ctx.fillStyle = col; ctx.fillRect(cx, 880, 26, 14);
  ctx.font = `500 22px ${MONO}`; ctx.fillStyle = C.dim; ctx.fillText(lab, cx + 38, 894);
  cx += 38 + ctx.measureText(lab).width + 48;
});
ctx.font = `500 20px ${MONO}`; ctx.fillStyle = C.dimmer;
ctx.fillText("KINETIC GAIN LLC · BOSTON · 2026", 122, 1150);
ctx.textAlign = "right";
ctx.fillText("not a measurement · not a product claim · not clinical instruction", 2300, 1230);

fs.writeFileSync(out, canvas.toBuffer("image/png"));
console.log("wrote", out, W + "x" + H);
