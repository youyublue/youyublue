"""Soundtrack for 天気雨 (Sunshower), 81 s, 44.1 kHz stereo.

Music: F major, 80 bpm (one bar = 3 s), piano, strings, flute, glockenspiel.
One motif (A C D | C A G F | G A C A | G) carries the whole film.
Sound: cicadas, sunshower on water, rain drumming on the metal hand, water
pouring off the rising arm, two short police-siren chirps, wingbeats and a
kingfisher's thin whistle -- all timed to the picture (see shots.js).
Usage: python3 score.py out.wav
"""
import sys, wave
import numpy as np

SR, DUR = 44100, 81.0
N = int(SR * DUR)
T = np.arange(N) / SR
rng = np.random.default_rng(7)
MUS = np.zeros((N, 2)); SFX = np.zeros((N, 2))
BPM = 80; BEAT = 60 / BPM; BAR = 4 * BEAT


def mtof(m): return 440.0 * 2 ** ((m - 69) / 12)


def add(bus, sig, t0, gain=1.0, pan=0.0):
    i0 = int(round(t0 * SR))
    if i0 >= N or len(sig) == 0: return
    if i0 < 0: sig = sig[-i0:]; i0 = 0
    sig = sig[: N - i0]
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    bus[i0:i0 + len(sig), 0] += sig * gain * l
    bus[i0:i0 + len(sig), 1] += sig * gain * r


def filt(x, lo=None, hi=None):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); g = np.ones_like(f)
    if hi: g /= np.sqrt(1 + (f / hi) ** 4)
    if lo: g /= np.sqrt(1 + (lo / np.maximum(f, 1)) ** 4)
    return np.fft.irfft(X * g, len(x))


def envl(t, a, d):  # attack/decay envelope arrays
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / d)


# ---------------- instruments ----------------
def piano(m, dur, vel=1.0):
    f = mtof(m); n = int((dur + 2.8) * SR); t = np.arange(n) / SR; s = np.zeros(n)
    for k in range(1, 9):
        fk = f * k * (1 + 0.0004 * k * k)
        if fk > 16000: break
        s += np.sin(2 * np.pi * fk * t + k) * (1 / k ** 1.5) * np.exp(-t * (0.8 + 0.6 * k) * (f / 440) ** 0.3)
    rel = np.clip(1 - (t - dur) / 0.8, 0, 1) ** 2
    ham = np.exp(-t * 60) * np.sin(2 * np.pi * f * 6.3 * t) * .05
    return (s + ham) * np.minimum(1, t / 0.003) * rel * vel


def glock(m, vel=1.0, dur=3.0):
    f = mtof(m); n = int(dur * SR); t = np.arange(n) / SR
    s = np.sin(2 * np.pi * f * t) + .35 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 5) + .18 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t * 9) + .1 * np.sin(2 * np.pi * f * 8.9 * t) * np.exp(-t * 14)
    return s * np.exp(-t * 1.6) * np.minimum(1, t / .0015) * vel


def strings(ms, dur, vel=1.0, att=1.2, rel=1.8, bright=1.0):
    n = int((dur + rel) * SR); t = np.arange(n) / SR; s = np.zeros(n)
    for m in ms:
        f = mtof(m)
        for d in (-.12, -.04, .05, .13):
            vib = .0035 * np.sin(2 * np.pi * (5.1 + d * 3) * t + d * 40) * np.minimum(1, t / 1.2)
            ph = 2 * np.pi * f * (1 + d / 100) * t + 2 * np.pi * f * np.cumsum(vib) / SR
            # band-limited saw-ish: a few harmonics with falling weight
            for k in range(1, 8):
                if f * k > 9000: break
                s += np.sin(k * ph) / k ** (1.25 / bright) * (1 if k == 1 else .8)
    e = np.minimum(1, (t / att) ** 1.5) * np.clip(1 - (t - dur) / rel, 0, 1)
    return s * e * vel / (len(ms) * 4 * 1.8)


def flute(m, dur, vel=1.0):
    f = mtof(m); n = int((dur + .5) * SR); t = np.arange(n) / SR
    vib = .006 * np.sin(2 * np.pi * 5.3 * t) * np.clip((t - .25) / .4, 0, 1)
    ph = 2 * np.pi * f * t + 2 * np.pi * f * np.cumsum(vib) / SR
    s = np.sin(ph) + .22 * np.sin(2 * ph) + .06 * np.sin(3 * ph)
    br = filt(rng.standard_normal(n), lo=f * .9, hi=f * 3) * .05
    e = np.minimum(1, t / .07) * np.clip(1 - (t - dur) / .35, 0, 1) * (1 - .15 * np.exp(-t * 8))
    return (s + br * (.5 + .5 * np.exp(-t * 6))) * e * vel


def pluck(m, vel=1.0):  # pizzicato-ish, for raindrops in the music
    f = mtof(m); n = int(1.2 * SR); t = np.arange(n) / SR
    s = sum(np.sin(2 * np.pi * f * k * t) * np.exp(-t * (6 + 3 * k)) / k for k in range(1, 6))
    return s * np.minimum(1, t / .002) * vel


# ---------------- harmony ----------------
F, Bb, C, Dm, Am, Gm = 53, 46, 48, 50, 45, 43
def chord(root, q):
    if q == 'M7': iv = [0, 7, 11, 16, 19]
    elif q == 'M': iv = [0, 7, 12, 16, 19]
    elif q == '7': iv = [0, 7, 10, 16, 19]
    elif q == 'm7': iv = [0, 7, 10, 15, 19]
    elif q == 'sus': iv = [0, 7, 12, 17, 19]
    else: iv = [0, 7, 12, 15, 19]
    return [root + i for i in iv]

# one chord per bar (27 bars)
prog = [(F, 'M7'), (Bb, 'M7'), (F, 'M7'), (Bb, 'M7'),          # 0-3  morning calm
        (Bb, 'M7'), (C, '7'), (Am, 'm7'), (Dm, 'm7'),          # 4-7  the bird (motif, flute)
        (Gm, 'm7'), (C, 'sus'),                                # 8-9  the veil
        (Dm, 'm'), (Bb, 'M7'), (C, 'sus'),                     # 10-12 rain begins
        (Bb, 'M7'), (C, '7'), (F, 'M'),                        # 13-15 the arm rises -> shelter (43.8 s ~ bar 14.6)
        (Bb, 'M7'), (Am, 'm7'), (Dm, 'm7'),                    # 16-18 tender, the smile
        (Bb, 'M7'), (C, '7'), (Am, 'm7'), (Dm, 'm7'),          # 19-22 rainbow (full motif)
        (Bb, 'M7'), (C, 'sus'),                                # 23-24 hop, beacons
        (F, 'M7'), (F, 'M')]                                    # 25-26 farewell
bt = lambda b, beat=0.0: b * BAR + beat * BEAT

arp = [0, 1, 2, 3, 4, 3, 2, 1]
for b, (r, q) in enumerate(prog):
    ts = chord(r, q)
    if b in (8, 9):   # veil: sparse, chord on 1 only
        for j, tn in enumerate(ts[1:]): add(MUS, piano(tn, 2.6, .17), bt(b) + j * .09, 1, -.3 + j * .2)
        continue
    if b >= 26:
        for j, tn in enumerate(ts): add(MUS, piano(tn, 4.0, .3), bt(b) + j * .11, 1, -.4 + j * .2)
        continue
    vel = .16 if b < 4 else .2 if b < 8 else .18 if b < 13 else .22 if b < 16 else .2 if b < 19 else .26 if b < 23 else .2
    pat = arp if b not in (10, 11, 12) else [0, 2, 4, 2, 1, 3, 4, 3]
    for i, p in enumerate(pat):
        add(MUS, piano(ts[p] + (12 if b >= 19 and i % 4 == 3 else 0), BEAT / 2 * 1.8, vel * (1.15 if i == 0 else 1)), bt(b, i / 2), 1, -.35 + .14 * p)
    add(MUS, piano(r - 12, BAR * .9, vel * .9), bt(b), 1, -.1)

# strings bed
pads = {4: 1, 5: 1, 6: 1, 7: 1, 10: .8, 11: .9, 12: 1, 13: 1.1, 14: 1.3, 15: 1.2, 16: .9, 17: .9, 18: .9, 19: 1.3, 20: 1.4, 21: 1.4, 22: 1.4, 23: 1, 24: 1, 25: 1.1, 26: 1}
for b, v in pads.items():
    r, q = prog[b]; ts = chord(r, q)
    add(MUS, strings([ts[0], ts[1], ts[3]], BAR * 1.02, .32 * v, att=1.0 if b != 13 else 2.2, bright=1 + .3 * (b >= 19)), bt(b), 1, 0)
# the rising arm: a long climbing line in the violins (bars 13-15)
for k, (m, d) in enumerate([(65, 1.5), (67, 1.5), (69, 1.5), (70, 1.5), (72, 2.0), (74, 1.0), (77, 3.0)]):
    st = 38.4 + sum(x[1] for x in [(65, 1.5), (67, 1.5), (69, 1.5), (70, 1.5), (72, 2.0), (74, 1.0), (77, 3.0)][:k]) * .85
    add(MUS, strings([m], d * .9, .55, att=.35, rel=1.2, bright=1.3), st, 1, .2)

# ---------------- the motif ----------------
MOTIF = [(69, 1), (72, .5), (74, 1.5), (72, 1), (69, .5), (67, .5), (65, 2), (67, 1), (69, .5), (72, 1.5), (69, 1), (67, 4)]
ANSWER = [(69, 1), (72, .5), (74, 1.5), (77, 1), (76, 1), (74, 1), (72, 1), (69, 1), (67, 1), (69, 2), (72, 1), (74, 1), (72, 2), (65, 4)]
def play(seq, b0, inst, vel, pan=0, oct=0, dur_k=1.0):
    t = bt(b0)
    for m, d in seq:
        if inst == 'flute': add(MUS, flute(m + oct, d * BEAT * .95 * dur_k, vel), t, 1, pan)
        elif inst == 'glock': add(MUS, glock(m + oct + 12, vel), t, 1, pan)
        elif inst == 'piano': add(MUS, piano(m + oct, d * BEAT, vel), t, 1, pan)
        elif inst == 'str': add(MUS, strings([m + oct], d * BEAT * .98, vel, att=.25, rel=.9, bright=1.2), t, 1, pan)
        t += d * BEAT

play(MOTIF[:7], 2, 'glock', .13, .3)            # a hint in the intro (6 s)
play(MOTIF, 4, 'flute', .2, -.1)                # the bird preening (12 s)
play(MOTIF[:7], 16, 'piano', .2, .15, oct=12)   # under the hand, tender (48 s)
play(MOTIF[:3], 17.85, 'glock', .1, .35)        # the smile (54 s)
play(MOTIF, 19, 'str', .34, 0)                  # the rainbow, full (57 s)
play(MOTIF, 19, 'flute', .16, -.2, oct=12)
play(MOTIF, 19, 'glock', .07, .4)
play(ANSWER, 23, 'flute', .19, -.1)             # hop, beacons, farewell (69 s)
play(ANSWER, 23, 'str', .22, .1, oct=-12)
for i, m in enumerate([77, 81, 84, 89]):         # last sparkle
    add(MUS, glock(m, .09), 79.6 + i * .16, 1, -.3 + .2 * i)

# rain in the music: little plucks, denser with the rain
pr = np.random.default_rng(3)
scale = [65, 67, 69, 70, 72, 74, 76, 77, 79, 81]
for t0 in np.arange(26.5, 56, .375):
    dens = min(1, (t0 - 26.5) / 5) * (1 if t0 < 54 else (56 - t0) / 2)
    if pr.random() < .55 * dens: add(MUS, pluck(scale[pr.integers(0, len(scale))] + 12, .12), t0 + pr.random() * .05, 1, pr.uniform(-.7, .7))
add(MUS, glock(84, .16), 31.62, 1, .2)           # the drop on her head
add(MUS, glock(91, .05), 31.66, 1, .3)
for i, m in enumerate([72, 76, 79, 84, 88]):     # the sun bursts out
    add(MUS, glock(m, .1), 56.7 + i * .09, 1, -.4 + .2 * i)
# a soft cymbal swell into the sun burst
sw = filt(rng.standard_normal(int(2.2 * SR)), lo=3000, hi=12000); tt = np.arange(len(sw)) / SR
add(MUS, sw * (tt / 2.2) ** 2.5 * np.exp(-np.maximum(0, tt - 2.0) * 20) * .05, 54.7, 1, 0)

# ---------------- sound effects ----------------
def noise(n): return rng.standard_normal(n)
# cicadas (minmin-zemi style pulsing, plus a steady higher shimmer), quieter in the rain
def cicada(t0, dur, f0, rate, gain, pan):
    n = int(dur * SR); t = np.arange(n) / SR
    car = filt(noise(n), lo=f0 * .8, hi=f0 * 1.25)
    am = (.5 + .5 * np.sin(2 * np.pi * rate * t)) ** 3 * (.6 + .4 * np.sin(2 * np.pi * .23 * t + pan))
    e = np.minimum(1, t / 1.5) * np.minimum(1, (dur - t) / 1.5)
    add(SFX, car * am * e * gain, t0, 1, pan)
cy = np.clip(1 - (np.arange(0, DUR, 1)), 0, 1)
for (a, b, g) in [(0, 26, .06), (56.5, 81, .05), (26, 56.5, .012)]:
    cicada(a, b - a, 5200, 13, g, -.5); cicada(a, b - a, 6400, 17, g * .8, .55); cicada(a, b - a, 4300, 7, g * .5, .1)

# the rain: density follows the picture's rain; louder up close
def rain_dens(t):
    if t < 25.2 or t > 58.4: return 0
    if t < 27.6: return .22 * (t - 25.2) / 2.4
    if t < 32.5: return .22 + .83 * (t - 27.6) / 4.9
    if t < 55.4: return 1.05
    return 1.05 * (1 - (t - 55.4) / 3)
rd = np.array([rain_dens(t) for t in T[::441]]); rd = np.interp(T, T[::441], rd) / 1.05
hiss = filt(noise(N), lo=1500, hi=9000) * .03 * rd
add(SFX, hiss, 0, 1, -.2); add(SFX, np.roll(hiss, 9000), 0, 1, .2)
# individual drops on the water ("plip")
def plip(f, vel):
    n = int(.09 * SR); t = np.arange(n) / SR
    fr = f * (1 + 1.6 * np.exp(-t * 60)); return np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t * 55) * vel
for t0 in np.arange(25.3, 58.4, 1 / 60):
    d = rain_dens(t0)
    if rng.random() < d * .55: add(SFX, plip(rng.uniform(900, 3200), rng.uniform(.01, .05) * (1.6 if t0 < 28 else 1)), t0, 1, rng.uniform(-.8, .8))
# big early drops
for t0 in [25.6, 26.1, 26.5, 26.8, 27.2, 27.5, 27.9, 28.2]: add(SFX, plip(rng.uniform(600, 1400), .09), t0, 1, rng.uniform(-.6, .6))
# the drop on the bird's head: a tiny tap
add(SFX, plip(2200, .12), 31.62, 1, .1)
# drumming on the metal hand (from the moment it shelters the bird)
def ping(vel):
    n = int(.22 * SR); t = np.arange(n) / SR
    s = sum(np.sin(2 * np.pi * f * t) * np.exp(-t * dd) * a for f, dd, a in [(1830, 28, 1), (2970, 34, .7), (4410, 45, .45), (6150, 60, .3)])
    s += filt(noise(n), lo=2000, hi=8000) * np.exp(-t * 120) * .5
    return s * vel
for t0 in np.arange(43.8, 56.4, 1 / 40):
    near = 1.0 if 45 < t0 < 53.3 else .45
    if rng.random() < .55 * min(1, (t0 - 43.8) / .6) * (1 if t0 < 55 else (56.4 - t0) / 1.4): add(SFX, ping(rng.uniform(.015, .05) * near), t0, 1, rng.uniform(-.3, .3))
# streams of water off the fingertips (soft trickle) under the hand
tr = filt(noise(int(8.3 * SR)), lo=500, hi=3000); tt = np.arange(len(tr)) / SR
add(SFX, tr * (.5 + .5 * np.sin(2 * np.pi * 3.1 * tt) ** 2) * .03 * np.minimum(1, tt / .8) * np.minimum(1, (8.3 - tt) / .8), 45, 1, 0)
# the arm rising out of the water: a heavy surge, then pouring water
n = int(3.4 * SR); tt = np.arange(n) / SR
surge = filt(noise(n), lo=80, hi=900) * np.exp(-((tt - .45) / .35) ** 2) * .5
pour = filt(noise(n), lo=600, hi=5000) * np.clip((tt - .3) / .3, 0, 1) * np.exp(-np.maximum(0, tt - .6) * 1.3) * .14
low = np.sin(2 * np.pi * 52 * tt) * np.exp(-((tt - .5) / .4) ** 2) * .2
add(SFX, surge + pour + low, 40.0, 1, -.3)
for k in range(9): add(SFX, plip(rng.uniform(400, 1200), .08 * (1 - k / 10)), 40.7 + k * .13 + rng.random() * .05, 1, -.3)
# servo whir under the lift and the hand's settle (very soft)
def whir(dur, f0, f1, vel):
    n = int(dur * SR); t = np.arange(n) / SR; f = np.linspace(f0, f1, n)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) + .4 * np.sin(4 * np.pi * np.cumsum(f) / SR)
    return filt(s, hi=1200) * np.sin(np.pi * t / dur) ** 2 * vel
add(SFX, whir(5.2, 110, 170, .025), 38.4, 1, -.2)
add(SFX, whir(.9, 160, 90, .02), 43.4, 1, -.1)
add(SFX, whir(2.4, 150, 100, .02), 63.0, 1, -.2)
add(SFX, whir(1.8, 120, 180, .018), 71.2, 1, -.3)
# head turns (soft servo)
for t0, d in [(35.1, 1.3), (57.9, 1.0), (71.5, 1.2)]: add(SFX, whir(d, 220, 300, .012), t0, 1, 0)
# two short police-siren chirps with the beacon flashes
def chirp(dur):
    n = int(dur * SR); t = np.arange(n) / SR
    f = 650 + 900 * np.sin(np.pi * np.clip(t / dur, 0, 1)) ** .8
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sign(np.sin(ph)) * .4 + np.sin(ph) * .6
    s = filt(s, lo=300, hi=3500)
    return s * np.minimum(1, t / .01) * np.minimum(1, (dur - t) / .04)
for t0 in (67.62, 68.42): add(SFX, chirp(.3) * .16, t0, 1, .15)
# wingbeats: the hop, the shake, the take-off
def flap(vel):
    n = int(.07 * SR); t = np.arange(n) / SR
    return filt(noise(n), lo=150, hi=1800) * np.sin(np.pi * t / .07) ** 2 * vel
for t0 in (64.8, 64.9, 65.0): add(SFX, flap(.18), t0, 1, .1)
for i in range(12): add(SFX, flap(.07), 46.6 + i * .085, 1, 0)   # the shake (feathers)
for i in range(22): add(SFX, flap(.22 * (1 - i / 26)), 71.05 + i * .085, 1, .1 - i * .02)
# the kingfisher's thin whistle
def tsee(f0, dur, vel):
    n = int(dur * SR); t = np.arange(n) / SR; f = f0 * (1 + .08 * np.sin(np.pi * t / dur))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / dur) ** 2 * vel
for t0 in (17.9, 18.15): add(SFX, tsee(6200, .14, .05), t0, 1, .2)
for t0 in (32.7,): add(SFX, tsee(5800, .12, .04), t0, 1, .1)
for t0 in (49.2, 49.4): add(SFX, tsee(5600, .1, .03), t0, 1, 0)
for t0 in (65.6, 71.3, 71.55): add(SFX, tsee(6400, .13, .05), t0, 1, .2)
# a quiet breeze through the whole film
br = filt(noise(N), lo=100, hi=700) * .03 * (.6 + .4 * np.sin(2 * np.pi * .07 * T))
add(SFX, br, 0, 1, 0)

# ---------------- mix ----------------
def reverb(x, dec=2.4, mix_=.25):
    n = int(dec * SR); t = np.arange(n) / SR
    out = np.zeros_like(x)
    for ch in range(2):
        ir = rng.standard_normal(n) * np.exp(-t * 6.9 / dec); ir[: int(.012 * SR)] = 0
        ir = filt(ir, hi=6000); ir /= np.sqrt(np.sum(ir ** 2))
        L = len(x) + n; F = 1 << int(np.ceil(np.log2(L)))
        out[:, ch] = np.fft.irfft(np.fft.rfft(x[:, ch], F) * np.fft.rfft(ir, F), F)[: len(x)]
    return x * (1 - mix_) + out * mix_ * 1.4

mus = reverb(MUS, 2.6, .3)
sfx = reverb(SFX, 1.2, .12)
mix = mus * .9 + sfx * 1.0
fade = np.minimum(1, T / 1.2) * np.clip((DUR - T) / 1.0, 0, 1)
mix *= fade[:, None]
mix /= np.max(np.abs(mix)) / .89
pcm = (mix * 32767).astype(np.int16)
with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('wrote', sys.argv[1])
