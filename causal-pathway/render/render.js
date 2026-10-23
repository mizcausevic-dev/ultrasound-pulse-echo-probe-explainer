#!/usr/bin/env node
/* Frame-exact renderer for the causal-pathway explainer and the commercial.
   Usage:
     node render.js --module ../explainer.js --out ../media/explainer.mp4 [--width 1920 --height 1080] [--audio score.wav]
     node render.js --module ../explainer.js --stills 0,150,300,510,750,1019 --outdir ./stills
   Requires: npm install canvas (node-canvas) and ffmpeg on PATH.
   Deterministic: the same frame index always yields the same pixels. */
"use strict";
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const { createCanvas } = require("canvas");

const args = process.argv.slice(2);
function arg(name, def) { const i = args.indexOf("--" + name); return i >= 0 ? args[i + 1] : def; }

const modPath = path.resolve(arg("module", "../explainer.js"));
const W = parseInt(arg("width", "1920"), 10);
const H = parseInt(arg("height", "1080"), 10);
const mod = require(modPath);
const FPS = mod.FPS, FRAMES = mod.FRAMES;

const canvas = createCanvas(W, H);
const ctx = canvas.getContext("2d");

const stills = arg("stills", null);
if (stills) {
  const outdir = path.resolve(arg("outdir", "./stills"));
  fs.mkdirSync(outdir, { recursive: true });
  for (const s of stills.split(",")) {
    const f = parseInt(s, 10);
    mod.drawFrame(ctx, W, H, f);
    const file = path.join(outdir, `frame-${String(f).padStart(4, "0")}.png`);
    fs.writeFileSync(file, canvas.toBuffer("image/png"));
    console.log("wrote", file);
  }
  process.exit(0);
}

const out = path.resolve(arg("out", "../media/out.mp4"));
const audio = arg("audio", null);
fs.mkdirSync(path.dirname(out), { recursive: true });
const ff = [
  "-y", "-f", "rawvideo", "-pix_fmt", "bgra", "-s", `${W}x${H}`, "-r", String(FPS), "-i", "pipe:0"
];
if (audio) ff.push("-i", path.resolve(audio));
ff.push("-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-movflags", "+faststart");
if (audio) ff.push("-c:a", "aac", "-b:a", "160k", "-shortest");
ff.push(out);
const proc = spawn("ffmpeg", ff, { stdio: ["pipe", "inherit", "inherit"] });
let f = 0;
function pump() {
  let ok = true;
  while (f < FRAMES && ok) {
    mod.drawFrame(ctx, W, H, f);
    ok = proc.stdin.write(canvas.toBuffer("raw"));
    f++;
    if (f % 120 === 0) process.stderr.write(`rendered ${f}/${FRAMES}\n`);
  }
  if (f < FRAMES) proc.stdin.once("drain", pump);
  else proc.stdin.end();
}
proc.on("close", (code) => { console.log("ffmpeg exit", code, "->", out, `(${FRAMES} frames @ ${FPS} fps)`); process.exit(code); });
pump();
