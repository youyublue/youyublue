"""Synthesises the soundtrack for "The Wind Hill" (46 s, 44.1 kHz stereo WAV).

Piano arpeggios + melody in F major at 80 bpm, a soft string pad, wind noise
that follows the same gust curve as the picture, and a rising harp-like run
when the hat is blown away. Usage: python3 score.py out.wav
"""
import sys, wave
import numpy as np

SR, DUR = 44100, 46.0
N = int(SR * DUR)
T = np.arange(N) / SR
rng = np.random.default_rng(7)
L = np.zeros(N); R = np.zeros(N)

BEAT, START = 0.75, 0.5          # 80 bpm, music starts at 0.5 s
BAR = 4 * BEAT
HAT_T = 23.6


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def add(sig, t0, gain=1.0, pan=0.0):
    i0 = int(t0 * SR)
    if i0 >= N:
        return
    sig = sig[: N - i0]
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    L[i0:i0 + len(sig)] += sig * gain * l
    R[i0:i0 + len(sig)] += sig * gain * r


def piano(m, dur, vel=1.0):
    f = mtof(m)
    n = int((dur + 2.5) * SR)
    t = np.arange(n) / SR
    s = np.zeros(n)
    for k in range(1, 8):
        fk = f * k * (1 + 0.0004 * k * k)          # slight stiffness
        if fk > 16000:
            break
        s += np.sin(2 * np.pi * fk * t) * (1 / k ** 1.6) * np.exp(-t * (0.9 + 0.55 * k) * (f / 440) ** 0.3)
    env = np.minimum(1, t / 0.004)
    rel = np.clip(1 - (t - dur) / 0.6, 0, 1) ** 2 if dur < 3 else 1
    return s * env * rel * vel


def pad(ms, dur, vel=1.0):
    n = int((dur + 2.0) * SR)
    t = np.arange(n) / SR
    s = np.zeros(n)
    for m in ms:
        f = mtof(m)
        for d in (-0.12, 0.0, 0.13):              # detuned voices (cents-ish)
            ph = 2 * np.pi * f * (1 + d / 100) * t + 0.004 * np.sin(2 * np.pi * 5.1 * t)
            s += np.sin(ph) + 0.25 * np.sin(2 * ph) + 0.08 * np.sin(3 * ph)
    env = np.minimum(1, t / 1.2) * np.clip(1 - (t - dur) / 2.0, 0, 1)
    return s * env * vel / (len(ms) * 3)


# chords per bar: (root midi in octave 3, quality)
F, C, Dm, Bb = (53, 'M'), (48, 'M'), (50, 'm'), (46, 'M')
prog = [F, C, Dm, Bb, F, C, Bb, C, Dm, Bb, F, C, Bb, C, F]


def chord(root, q):
    third = 3 if q == 'm' else 4
    return [root, root + 7, root + 12, root + 12 + third, root + 19]


# left-hand arpeggios
pattern = [0, 1, 2, 3, 4, 3, 2, 1]
for b, (root, q) in enumerate(prog):
    tones = chord(root, q)
    t0 = START + b * BAR
    last = b == len(prog) - 1
    for i, p in enumerate(pattern):
        if last and i > 0:
            break
        v = 0.32 if b < 8 else 0.38
        if last:
            for j, tn in enumerate(tones):
                add(piano(tn, 3.5, 0.33), t0 + j * 0.06, 1, -0.3 + j * 0.12)
            break
        add(piano(tones[p], BEAT / 2 * 1.6, v * (1.1 if i == 0 else 1)), t0 + i * BEAT / 2, 1, -0.35 + 0.1 * p)

# melody (bar, beat, midi, beats)
mel = [
    (2, 0, 69, 1.5), (2, 1.5, 72, .5), (2, 2, 74, 2),
    (3, 0, 77, 1.5), (3, 1.5, 76, .5), (3, 2, 74, 1), (3, 3, 72, 1),
    (4, 0, 72, 3), (4, 3, 69, 1),
    (5, 0, 67, 1), (5, 1, 69, 1), (5, 2, 72, 2),
    (6, 0, 74, 1.5), (6, 1.5, 72, .5), (6, 2, 70, 1), (6, 3, 69, 1),
    (7, 0, 67, 3), (7, 3, 72, 1),
    (8, 0, 81, 2), (8, 2, 79, 1), (8, 3, 77, 1),
    (9, 0, 77, 1.5), (9, 1.5, 79, .5), (9, 2, 74, 2),
    (10, 0, 72, 1), (10, 1, 77, 1), (10, 2, 81, 2),
    (11, 0, 79, 3), (11, 3, 76, 1),
    (12, 0, 77, 1.5), (12, 1.5, 74, .5), (12, 2, 70, 2),
    (13, 0, 72, 2), (13, 2, 76, 2),
    (14, 0, 77, 4),
]
for bar, beat, m, d in mel:
    t0 = START + bar * BAR + beat * BEAT
    add(piano(m, d * BEAT, 0.55 if bar >= 8 else 0.48), t0, 1, 0.1)
    if bar >= 8:   # strings double the melody an octave down in the climax
        add(pad([m - 12], d * BEAT, 0.5), t0, 1, -0.1)

# string pad under the chords
for b, (root, q) in enumerate(prog):
    if b < 2:
        continue
    tones = [root + 12, root + 19, root + 24 + (3 if q == 'm' else 4)]
    add(pad(tones, BAR + (2.5 if b == len(prog) - 1 else 0.2), 0.16 if b < 8 else 0.24), START + b * BAR, 1, 0)

# rising harp run when the hat flies
run = [65, 69, 72, 77, 81, 84, 89, 93]
for i, m in enumerate(run):
    add(piano(m, 1.2, 0.22), HAT_T - 0.15 + i * 0.085, 1, -0.6 + i * 0.17)


# wind: filtered noise following the picture's gust curve
def gust(t):
    return 0.35 + 0.65 * np.exp(-((t - 23.8) / 2.0) ** 2) + 0.15 * np.sin(t * 0.7) * np.sin(t * 0.31 + 1)


def smooth(x, a):
    """One-pole low-pass (y += a*(x-y)), done in the frequency domain."""
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    fc = a * SR / (2 * np.pi)
    X /= np.sqrt(1 + (f / fc) ** 2)
    return np.fft.irfft(X, len(x))


g = gust(T)
for side, pan in ((0, -0.7), (1, 0.7)):
    nz = rng.standard_normal(N)
    lo = smooth(nz, 0.02)                    # body of the wind
    hi = smooth(nz, 0.12) - smooth(nz, 0.03) # airy hiss
    wobble = 0.75 + 0.25 * np.sin(2 * np.pi * T * (0.13 + 0.05 * side) + side)
    w = (lo * 3.0 + hi * 0.8) * (g ** 1.6) * wobble
    fade = np.minimum(1, T / 2.0) * np.clip((DUR - T) / 3.0, 0, 1)
    add(w * fade * 0.11, 0, 1, pan)

# master: reverb via convolution with a decaying-noise impulse response
ir_n = int(2.4 * SR); ti = np.arange(ir_n) / SR
irL = rng.standard_normal(ir_n) * np.exp(-ti / 0.55); irR = rng.standard_normal(ir_n) * np.exp(-ti / 0.55)
irL[: int(.012 * SR)] = 0; irR[: int(.017 * SR)] = 0
irL /= np.sqrt((irL ** 2).sum()); irR /= np.sqrt((irR ** 2).sum())


def conv(x, ir):
    n = len(x) + len(ir)
    return np.fft.irfft(np.fft.rfft(x, n) * np.fft.rfft(ir, n), n)[: len(x)]


outL = L + 0.28 * conv(L, irL)
outR = R + 0.28 * conv(R, irR)
fade = np.minimum(1, T / 0.8) * np.clip((DUR - T) / 2.5, 0, 1)
out = np.stack([outL, outR], 1) * fade[:, None]
out = np.tanh(out / np.abs(out).max() * 1.1) * 0.84
pcm = (out * 32767).astype('<i2')
with wave.open(sys.argv[1] if len(sys.argv) > 1 else 'score.wav', 'wb') as wf:
    wf.setnchannels(2); wf.setsampwidth(2); wf.setframerate(SR); wf.writeframes(pcm.tobytes())
print('wrote', len(pcm) / SR, 's')
