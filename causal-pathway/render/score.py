#!/usr/bin/env python3
"""Synthesized score and cue track for the explainer (34 s) and the commercial (30 s).
Everything is derived from frame timing, so the audio lines up with the picture by construction.
Deterministic: no random numbers. Output: 44.1 kHz, 16-bit stereo WAV.
Usage: python3 score.py explainer out.wav | python3 score.py commercial out.wav
"""
import sys, math, struct, wave
import numpy as np

SR = 44100
FPS = 30

def seconds(frames): return frames / FPS

def pad(t, dur, freqs, gain=0.12, attack=1.5, release=2.0):
    """Soft detuned-sine pad with slow amplitude movement."""
    n = len(t)
    env = np.minimum(1.0, t / attack) * np.minimum(1.0, (dur - t) / release)
    env = np.clip(env, 0, 1)
    sig = np.zeros(n)
    for i, f in enumerate(freqs):
        lfo = 0.5 + 0.5 * np.sin(2 * math.pi * (0.07 + 0.013 * i) * t + i)
        sig += (np.sin(2 * math.pi * f * t) + 0.5 * np.sin(2 * math.pi * f * 1.003 * t)) * (0.6 + 0.4 * lfo)
    return gain * env * sig / max(1, len(freqs))

def ping(t, at, freq, gain=0.5, decay=0.35, sweep=0.0):
    """Short sine ping with exponential decay; sweep lowers pitch slightly over the tail."""
    tt = t - at
    m = tt >= 0
    out = np.zeros_like(t)
    tau = tt[m]
    fr = freq * (1 - sweep * (1 - np.exp(-tau / decay)))
    out[m] = gain * np.exp(-tau / decay) * np.sin(2 * math.pi * fr * tau)
    return out

def thump(t, at, gain=0.6):
    tt = t - at
    m = tt >= 0
    out = np.zeros_like(t)
    tau = tt[m]
    out[m] = gain * np.exp(-tau / 0.22) * np.sin(2 * math.pi * (58 + 40 * np.exp(-tau / 0.05)) * tau)
    return out

def tick(t, at, gain=0.18):
    tt = t - at
    m = (tt >= 0) & (tt < 0.03)
    out = np.zeros_like(t)
    out[m] = gain * np.exp(-tt[m] / 0.008) * np.sin(2 * math.pi * 2400 * tt[m])
    return out

def explainer(dur=34.0):
    t = np.arange(int(dur * SR)) / SR
    left = pad(t, dur, [110.0, 164.81, 220.0])          # A2, E3, A3
    right = pad(t, dur, [130.81, 196.0, 261.63], gain=0.10)  # C3, G3, C4
    mono = np.zeros_like(t)
    # stage boundaries: a low thump at each stage start (frames 0,150,300,510,750)
    for f in (150, 300, 510, 750):
        mono += thump(t, seconds(f), 0.35)
    # transmit: electrical trigger (frame 182) then pulse launch (frame 230)
    mono += tick(t, seconds(182), 0.3)
    mono += ping(t, seconds(230), 1320, gain=0.42, decay=0.28, sweep=0.15)
    # interface hits (frames 384 and 476, from the explainer timing table): short bright pings, second one softer (larger step, but deeper)
    mono += ping(t, seconds(384), 988, gain=0.28, decay=0.25)
    mono += ping(t, seconds(476), 880, gain=0.22, decay=0.25)
    # echoes received (frames 538 and 722): lower, the second one quieter (attenuation)
    mono += ping(t, seconds(538), 660, gain=0.40, decay=0.45, sweep=0.1)
    mono += ping(t, seconds(722), 587, gain=0.22, decay=0.5, sweep=0.1)
    # scan-line ticks during the image build (frames 790..950, 16 lines)
    for i in range(16):
        mono += tick(t, seconds(790 + i * 10), 0.12)
    # resolve: gentle high ping at the stable overview (frame 960)
    mono += ping(t, seconds(960), 1760, gain=0.18, decay=0.9)
    return np.stack([left + mono, right + mono], axis=1)

def commercial(dur=30.0):
    t = np.arange(int(dur * SR)) / SR
    left = pad(t, dur, [98.0, 146.83, 196.0], gain=0.13)     # G2, D3, G3
    right = pad(t, dur, [123.47, 185.0, 246.94], gain=0.11)  # B2, F#3, B3
    mono = np.zeros_like(t)
    # opening pulse sweep (frame 0..70) and end-card sweep (frame 784)
    mono += ping(t, seconds(6), 1320, gain=0.4, decay=0.5, sweep=0.2)
    mono += ping(t, seconds(784), 1320, gain=0.4, decay=0.6, sweep=0.2)
    # shot changes: 90, 240, 420, 600, 780
    for f in (90, 240, 420, 600, 780):
        mono += thump(t, seconds(f), 0.4)
    # feature cards (262, 288, 314) and register cards (450, 474, 498): soft ticks
    for f in (262, 288, 314, 450, 474, 498):
        mono += tick(t, seconds(f), 0.22)
    # pulse-echo motif during the product window: launch and two echoes, scaled from the explainer timing
    for f0 in (110, 300):
        mono += ping(t, seconds(f0), 1320, gain=0.25, decay=0.28, sweep=0.15)
        mono += ping(t, seconds(f0 + 60), 660, gain=0.22, decay=0.4)
        mono += ping(t, seconds(f0 + 96), 587, gain=0.12, decay=0.45)
    # a rising pad swell into the end card
    swell = np.clip((t - seconds(700)) / 3.0, 0, 1) * np.clip((seconds(870) - t) / 1.5, 0, 1)
    left += 0.06 * swell * np.sin(2 * math.pi * 392.0 * t)
    right += 0.06 * swell * np.sin(2 * math.pi * 493.88 * t)
    return np.stack([left + mono, right + mono], axis=1)

def write(path, stereo):
    peak = np.max(np.abs(stereo)) or 1.0
    stereo = stereo / peak * 0.8          # simple peak normalization, leaves headroom
    pcm = (stereo * 32767).astype("<i2")
    with wave.open(path, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(pcm.tobytes())

if __name__ == "__main__":
    which, out = sys.argv[1], sys.argv[2]
    write(out, explainer() if which == "explainer" else commercial())
    print("wrote", out)
