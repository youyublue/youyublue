"""Soundtrack for 《给云朵送一程》 (57.5 s, 44.1 kHz stereo).

Music: D major, 72 bpm, piano + string pad + bells, shaped to the shots.
Sound: cicadas, a distant train, the door, the little cloud's "啾", a raindrop,
footsteps in grass, wind and the scarf, the big cloud, rain, the petal, and
the two voice lines from voice/ (see voice.py).
Usage: python3 score.py out.wav
"""
import sys, wave, pathlib
import numpy as np

SR, DUR = 44100, 57.5
N = int(SR * DUR)
T = np.arange(N) / SR
rng = np.random.default_rng(11)
MUS = np.zeros((N, 2)); SFX = np.zeros((N, 2)); VOX = np.zeros((N, 2))
HERE = pathlib.Path(__file__).parent


def mtof(m): return 440.0 * 2 ** ((m - 69) / 12)


def env(t, a, b, c, d):
    return np.clip(np.minimum((t - a) / max(b - a, 1e-6), (d - t) / max(d - c, 1e-6)), 0, 1)


def add(bus, sig, t0, gain=1.0, pan=0.0):
    i0 = int(round(t0 * SR))
    if i0 >= N or len(sig) == 0:
        return
    if i0 < 0:
        sig = sig[-i0:]; i0 = 0
    sig = sig[: N - i0]
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    bus[i0:i0 + len(sig), 0] += sig * gain * l
    bus[i0:i0 + len(sig), 1] += sig * gain * r


def lowpass(x, fc):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    return np.fft.irfft(X / np.sqrt(1 + (f / fc) ** 4), len(x))


def bandpass(x, lo, hi):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    g = 1 / np.sqrt(1 + (f / hi) ** 4) / np.sqrt(1 + (lo / np.maximum(f, 1)) ** 4)
    return np.fft.irfft(X * g, len(x))


# ---------------- instruments ----------------
def piano(m, dur, vel=1.0):
    f = mtof(m); n = int((dur + 2.6) * SR); t = np.arange(n) / SR; s = np.zeros(n)
    for k in range(1, 8):
        fk = f * k * (1 + 0.0004 * k * k)
        if fk > 15000: break
        s += np.sin(2 * np.pi * fk * t) * (1 / k ** 1.6) * np.exp(-t * (0.9 + 0.55 * k) * (f / 440) ** 0.3)
    rel = np.clip(1 - (t - dur) / 0.7, 0, 1) ** 2
    return s * np.minimum(1, t / 0.004) * rel * vel


def bell(m, vel=1.0, dur=2.5):
    f = mtof(m); n = int(dur * SR); t = np.arange(n) / SR
    s = np.sin(2 * np.pi * f * t) + .45 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 4) + .2 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t * 8)
    return s * np.exp(-t * 2.2) * np.minimum(1, t / .002) * vel


def pad(ms, dur, vel=1.0, att=1.4, rel=2.0):
    n = int((dur + rel) * SR); t = np.arange(n) / SR; s = np.zeros(n)
    for m in ms:
        f = mtof(m)
        for d in (-0.13, 0.0, 0.12):
            ph = 2 * np.pi * f * (1 + d / 100) * t + 0.004 * np.sin(2 * np.pi * 5.2 * t)
            s += np.sin(ph) + .22 * np.sin(2 * ph) + .07 * np.sin(3 * ph)
    e = np.minimum(1, t / att) * np.clip(1 - (t - dur) / rel, 0, 1)
    return s * e * vel / (len(ms) * 3)


# ---------------- music ----------------
BPM = 72; BEAT = 60 / BPM; BAR = 4 * BEAT
D, Bm, G, A, Fsm, Em = (50, 'M'), (47, 'm'), (43, 'M'), (45, 'M'), (42, 'm'), (40, 'm')
prog = [D, Bm, G, A, D, Fsm, G, A, Bm, G, Em, A, D, Bm, G, Em, D]


def tones(root, q):
    third = 3 if q == 'm' else 4
    return [root, root + 7, root + 12, root + 12 + third, root + 19, root + 24]


def bar_t(b, beat=0.0): return b * BAR + beat * BEAT


pattern = [0, 1, 2, 3, 4, 3, 2, 1]
for b, (root, q) in enumerate(prog):
    ts = tones(root, q)
    if b == 15:   # Em then A
        ts2 = tones(*A)
    if b == 16:
        for j, tn in enumerate(ts[:5]):
            add(MUS, piano(tn, 4.5, .34), bar_t(b) + j * .07, 1, -.35 + j * .15)
        continue
    if b in (2, 3):   # sparse at the door: chord on 1 and 3
        for beat in (0, 2):
            for j, tn in enumerate(ts[1:4]):
                add(MUS, piano(tn, 1.6, .2), bar_t(b, beat) + j * .03, 1, -.2 + j * .2)
        continue
    vel = .22 if b < 2 else .25 if b < 6 else .3 if b < 9 else .27 if b < 12 else .33 if b < 15 else .24
    for i, p in enumerate(pattern):
        src = ts2 if (b == 15 and i >= 4) else ts
        add(MUS, piano(src[p], BEAT / 2 * 1.7, vel * (1.15 if i == 0 else 1)), bar_t(b, i / 2), 1, -.35 + .12 * p)
    if 6 <= b <= 8:   # bright plucks while she runs
        for i in (1, 3, 5, 7):
            add(MUS, piano(src[4] + 12, .12, .12), bar_t(b, i / 2), 1, .4)

mel = [
    (4, 0, 69, 1.5), (4, 1.5, 71, .5), (4, 2, 74, 2),
    (5, 0, 73, 1.5), (5, 1.5, 71, .5), (5, 2, 69, 2),
    (6, 0, 71, 1), (6, 1, 74, 1), (6, 2, 79, 1.5), (6, 3.5, 78, .5),
    (7, 0, 76, 3), (7, 3, 73, 1),
    (8, 0, 74, 1), (8, 1, 73, .5), (8, 1.5, 74, .5), (8, 2, 78, 2),
    (9, 0, 79, 2.5), (9, 2.5, 78, .5), (9, 3, 76, 1),
    (10, 0, 74, 2), (10, 2, 71, 2),
    (11, 0, 73, 3), (11, 3, 76, 1),
    (12, 0, 78, 1.5), (12, 1.5, 79, .5), (12, 2, 81, 2),
    (13, 0, 83, 1.5), (13, 1.5, 81, .5), (13, 2, 78, 2),
    (14, 0, 79, 1), (14, 1, 78, 1), (14, 2, 76, 1), (14, 3, 74, 1),
    (15, 0, 71, 2), (15, 2, 73, 2),
    (16, 0, 74, 4),
]
for b, beat, m, d in mel:
    v = .5 if b < 12 else .58 if b < 15 else .42
    add(MUS, piano(m, d * BEAT, v), bar_t(b, beat), 1, .1)
    if 12 <= b <= 14:
        add(MUS, pad([m - 12], d * BEAT, .45, att=.3, rel=1.2), bar_t(b, beat), 1, -.1)

for b, (root, q) in enumerate(prog):
    if b < 4: continue
    third = 3 if q == 'm' else 4
    v = .12 if b < 9 else .2 if b < 12 else .26 if b < 15 else .16
    add(MUS, pad([root + 12, root + 19, root + 24 + third], BAR + (3.5 if b == 16 else .3), v), bar_t(b), 1, 0)

# little musical moments
for i, m in enumerate([81, 78]): add(MUS, bell(m, .16), 9.95 + i * .14, 1, .3)          # kid's chirp
add(MUS, bell(86, .2), 16.1, 1, .2)                                                    # lands in her hands
for i, m in enumerate([74, 78, 81, 86]): add(MUS, bell(m, .14), 32.7 + i * .16, 1, .2)  # rises
for i, m in enumerate([81, 78, 74]): add(MUS, bell(m, .1), 34.9 + i * .3, 1, .2)        # sinks back
for i, m in enumerate([62, 66, 69, 74, 78, 81, 86, 90, 93]): add(MUS, piano(m, 1.4, .2), 39.35 + i * .075, 1, -.6 + i * .15)
for i, m in enumerate([86, 90, 93, 98, 93]): add(MUS, bell(m, .18), 44.1 + i * .09, 1, -.3 + i * .15)
for i, m in enumerate([74, 78, 81, 85, 86]): add(MUS, bell(m, .1), 49.6 + i * .18, 1, .3 - i * .12)
add(MUS, bell(93, .16), 52.65, 1, -.2)

# ---------------- sound effects ----------------
def noise(n): return rng.standard_normal(n)


# cicadas 0–14 s
n = int(15 * SR); t = np.arange(n) / SR; cic = np.zeros(n)
for f, rate, ph in ((4300, 41, 0), (5200, 47, 1.3), (6100, 37, 2.1)):
    am = (0.5 + 0.5 * np.sin(2 * np.pi * rate * t + ph)) ** 3 * (0.55 + 0.45 * np.sin(2 * np.pi * .23 * t + ph))
    cic += np.sin(2 * np.pi * f * t + 3 * np.sin(2 * np.pi * 13 * t)) * am
cic = cic * env(t, 0, 1.5, 11.5, 14.5) * .05
add(SFX, cic, 0, 1, .35); add(SFX, np.roll(cic, 2200), 0, .8, -.45)

# distant train: chugs and a soft whistle
n = int(6.5 * SR); t = np.arange(n) / SR
chug = lowpass(noise(n), 500) * (0.5 + 0.5 * np.sin(2 * np.pi * 3.8 * t)) ** 6 * env(t, 0, 1, 5.5, 6.5)
add(SFX, chug * .08, 0, 1, -.3)
n = int(1.2 * SR); t = np.arange(n) / SR
wh = (np.sin(2 * np.pi * 740 * t) + .7 * np.sin(2 * np.pi * 932 * t)) * env(t, 0, .15, .8, 1.2) + .3 * bandpass(noise(n), 600, 1400) * env(t, 0, .1, .7, 1.2)
add(SFX, lowpass(wh, 2500) * .035, 1.6, 1, -.3)

# door creak 6.7–7.6: a stick-slip pulse train ringing a wooden resonance
n = int(1.0 * SR); t = np.arange(n) / SR
rate = 55 + 40 * np.sin(2 * np.pi * .9 * t) + 15 * np.sin(2 * np.pi * 3.1 * t)
ph = np.cumsum(rate / SR); pulses = (np.diff(np.floor(ph), prepend=0) > 0).astype(float)
ir = np.sin(2 * np.pi * 820 * np.arange(int(.02 * SR)) / SR) * np.exp(-np.arange(int(.02 * SR)) / (.004 * SR))
creak = np.convolve(pulses * (0.6 + 0.4 * rng.random(n)), ir)[:n] * env(t, 0, .1, .7, 1.0)
add(SFX, creak[: int(.8 * SR)] * .12 * np.linspace(1, 0, int(.8 * SR)) ** .3, 6.6, 1, -.1)


def thud(level, f0=95, dur=.12):
    n = int(dur * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * f0 * t * (1 - .3 * t / dur)) * np.exp(-t / .03) + .3 * lowpass(noise(n), 1800) * np.exp(-t / .012)) * level


for tt in (7.35, 7.7, 8.1, 8.55): add(SFX, thud(.16), tt, 1, .15)

# the little cloud's "啾"
n = int(.22 * SR); t = np.arange(n) / SR
f = np.where(t < .07, 1900 + (3100 - 1900) * t / .07, 3100 - (700) * np.clip((t - .07) / .1, 0, 1))
jiu = np.sin(2 * np.pi * np.cumsum(f) / SR + 2 * np.sin(2 * np.pi * 30 * t)) * env(t, 0, .01, .12, .22)
add(SFX, jiu * .16, 10.0, 1, .25)

# raindrop on the step
n = int(.25 * SR); t = np.arange(n) / SR
f = 1300 + 900 * np.minimum(1, t / .015)
plink = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .045) + .3 * bandpass(noise(n), 2000, 6000) * np.exp(-t / .006)
add(SFX, plink * .2, 11.13, 1, .25)

# running: footsteps in grass + rustle
k = 0
while True:
    tt = 20.8 + (0.25 + k / 2) / 1.4; k += 1
    if tt > 30.6: break
    if tt < 21.0: continue
    n = int(.12 * SR); t = np.arange(n) / SR
    step = bandpass(noise(n), 300, 2500) * np.exp(-t / .03) * .22
    step[: int(.1 * SR)] += thud(.12, 80, .1)
    add(SFX, step * (1 if tt < 29.8 else .5), tt, 1, (-.2 if k % 2 else .2))
n = int(10 * SR); t = np.arange(n) / SR
rustle = bandpass(noise(n), 1800, 7000) * (0.45 + 0.55 * (0.5 + 0.5 * np.sin(2 * np.pi * 2.8 * t)) ** 2) * env(t, 0, .5, 9, 9.8)
add(SFX, rustle * .05, 20.9, 1, 0)

# wind over everything, following the picture's gusts
wind_amt = .15 + .1 * env(T, 20.8, 21.5, 29.5, 30.5) + .55 * env(T, 32.2, 33.0, 34.3, 35.3) + .85 * env(T, 37.8, 38.6, 43.8, 45.4) + .1 * env(T, 45, 46, 49, 51)
for side, pan in ((0, -.7), (1, .7)):
    nz = noise(N)
    w = (lowpass(nz, 380) * 2.8 + bandpass(nz, 900, 4000) * .5) * wind_amt ** 1.5 * (.8 + .2 * np.sin(2 * np.pi * T * (.11 + .04 * side) + side))
    add(SFX, w * env(T, 0, 2, 54, 57.5) * .12, 0, 1, pan)

# scarf: untie rustle, then flapping in the wind
n = int(.5 * SR); t = np.arange(n) / SR
add(SFX, bandpass(noise(n), 1500, 6000) * env(t, 0, .1, .3, .5) * .05, 37.0, 1, .1)
n = int(8 * SR); t = np.arange(n) / SR
flap_rate = 8 + 1.5 * np.sin(2 * np.pi * .4 * t)
flap = bandpass(noise(n), 250, 1800) * (0.5 + 0.5 * np.sin(2 * np.pi * np.cumsum(flap_rate) / SR)) ** 4 * env(t, 0, .8, 6.2, 8)
add(SFX, flap * .16, 37.7, 1, .3)

# swell into the big cloud, then rain
n = int(1.6 * SR); t = np.arange(n) / SR
swell = bandpass(noise(n), 3000, 12000) * (t / 1.6) ** 3
add(SFX, swell * .05, 42.6, 1, .2)
n = int(5.6 * SR); t = np.arange(n) / SR
hiss = bandpass(noise(n), 2500, 11000) * env(t, 0, .9, 3.8, 5.6)
add(SFX, hiss * .016, 44.6, 1, -.3); add(SFX, np.roll(hiss, 999) * .016, 44.6, 1, .3)
for i in range(240):
    tt = 44.8 + rng.random() * 4.6
    a = env(np.array([tt]), 44.7, 45.6, 48.4, 49.8)[0]
    nn = int(.05 * SR); tq = np.arange(nn) / SR; f0 = 2200 + rng.random() * 3500
    drop = np.sin(2 * np.pi * f0 * tq * (1 + 2 * tq)) * np.exp(-tq / .008)
    add(SFX, drop * .035 * a * (.4 + .6 * rng.random()), tt, 1, rng.random() * 1.6 - .8)

# ---------------- voices ----------------
def load(name):
    w = wave.open(str(HERE / 'voice' / f'{name}.wav'))
    x = np.frombuffer(w.readframes(w.getnframes()), '<i2').astype(float) / 32767
    if w.getframerate() != SR:
        x = np.interp(np.arange(0, len(x), w.getframerate() / SR), np.arange(len(x)), x)
    e = np.abs(x); on = int(np.argmax(e > .03 * e.max()))
    return x[max(0, on - int(.03 * SR)):]


def warmth(x):
    n = int(.9 * SR); ti = np.arange(n) / SR
    ir = rng.standard_normal(n) * np.exp(-ti / .18); ir[: int(.01 * SR)] = 0; ir /= np.sqrt((ir ** 2).sum())
    wet = np.fft.irfft(np.fft.rfft(x, len(x) + n) * np.fft.rfft(ir, len(x) + n), len(x) + n)
    return np.concatenate([x, np.zeros(n)]) + .12 * wet


girl, narr = warmth(load('girl')), warmth(load('narr'))
add(VOX, girl, 19.05, 1.5, .05)
add(VOX, narr, 50.2, 1.5, 0)

# ---------------- mix ----------------
duck = 1 - .45 * np.clip(np.maximum(env(T, 18.8, 19.0, 20.3, 20.7), env(T, 50.0, 50.2, 53.3, 53.8)), 0, 1)
ir_n = int(2.6 * SR); ti = np.arange(ir_n) / SR
rev = []
for s in (0, 1):
    ir = rng.standard_normal(ir_n) * np.exp(-ti / .6); ir[: int((.012 + .005 * s) * SR)] = 0; ir /= np.sqrt((ir ** 2).sum())
    rev.append(ir)


def conv(x, ir):
    n = len(x) + len(ir)
    return np.fft.irfft(np.fft.rfft(x, n) * np.fft.rfft(ir, n), n)[: len(x)]


wetbus = MUS + SFX * .5
for c in (0, 1):
    MUS[:, c] = MUS[:, c] * duck + .3 * conv(wetbus[:, c], rev[c]) * duck
out = MUS + SFX + VOX
out *= (np.minimum(1, T / .8) * np.clip((DUR - T) / 1.2, 0, 1))[:, None]
out = np.tanh(out / np.abs(out).max() * 1.15) * .86
with wave.open(sys.argv[1] if len(sys.argv) > 1 else 'score.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((out * 32767).astype('<i2').tobytes())
print('wrote', DUR, 's')
