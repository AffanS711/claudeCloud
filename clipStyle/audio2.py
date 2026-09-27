import json
import numpy as np
from scipy import signal
from scipy.io import wavfile

SR = 48000
DUR = 20.0
N = int(SR * DUR)
rng = np.random.default_rng(11)
TAU = 2 * np.pi

music = np.zeros((2, N))
drums = np.zeros((2, N))
sfx = np.zeros((2, N))
kick_times = []


def ta(d):
    return np.arange(int(d * SR)) / SR


def add(bus, x, at, gain=1.0, pan=0.0):
    i = int(round(at * SR))
    if i >= N or i + x.shape[-1] <= 0:
        return
    if i < 0:
        x = x[..., -i:]
        i = 0
    if x.ndim == 2:
        x = x[:, : N - i]
        bus[:, i:i + x.shape[1]] += x * gain
        return
    x = x[: N - i]
    th = (pan + 1) * np.pi / 4
    bus[0, i:i + len(x)] += x * np.cos(th) * gain
    bus[1, i:i + len(x)] += x * np.sin(th) * gain


def filt(x, kind, f, order=2):
    f = np.atleast_1d(f) / (SR / 2)
    b, a = signal.butter(order, f if len(f) > 1 else f[0], kind)
    return signal.lfilter(b, a, x)


def sweep(x, f0, f1, kind='low', q=1):
    out = np.zeros_like(x)
    zi = None
    chunk = 256
    n = len(x)
    for s in range(0, n, chunk):
        f = f0 * (f1 / f0) ** (s / max(1, n - 1))
        f = min(max(f, 40), SR / 2 - 800)
        b, a = signal.butter(2, f / (SR / 2), kind)
        if zi is None:
            zi = np.zeros(max(len(a), len(b)) - 1)
        out[s:s + chunk], zi = signal.lfilter(b, a, x[s:s + chunk], zi=zi)
    return out


def env_ad(t, a, d):
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-np.maximum(0, t - a) / d)


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def ir(seed, dur=2.2, damp=2.6):
    r = np.random.default_rng(seed)
    t = ta(dur)
    x = r.standard_normal(len(t)) * np.exp(-t * damp)
    x = filt(x, 'low', 7000)
    x[: int(.012 * SR)] *= np.linspace(0, 1, int(.012 * SR))
    return x / np.sqrt(np.sum(x ** 2))


IR_L, IR_R = ir(1), ir(2)


def reverb(bus, wet):
    out = bus.copy()
    for c, IRc in ((0, IR_L), (1, IR_R)):
        y = signal.fftconvolve(bus.mean(axis=0), IRc)[:N]
        out[c] = bus[c] * (1 - wet * .3) + y * wet
    return out


# ================= instruments =================
def marimba(f, dur=.55, bright=1.0):
    t = ta(dur)
    I = 1.8 * bright * np.exp(-t * 30)
    x = np.sin(TAU * f * t + I * np.sin(TAU * 4 * f * t)) * np.exp(-t * 7.5)
    x += .25 * np.sin(TAU * f * 2 * t) * np.exp(-t * 18)
    x[: 96] *= np.linspace(0, 1, 96)
    return x * .5


def bell(f, dur=2.0):
    t = ta(dur)
    parts = [(1, 1, 1.6), (2.76, .45, 3.2), (5.4, .25, 5.5), (8.93, .12, 8)]
    x = sum(a * np.sin(TAU * f * r * t) * np.exp(-t * d) for r, a, d in parts)
    x[: 48] *= np.linspace(0, 1, 48)
    return x * .3


def bass(f, dur):
    t = ta(dur)
    x = np.sin(TAU * f * t) + .35 * np.sin(TAU * 2 * f * t) + .15 * np.sin(TAU * 3 * f * t)
    x = np.tanh(1.6 * x) * env_ad(t, .004, dur * .55)
    return x * .5


def pad(freqs, dur, cutoff=1500):
    t = ta(dur)
    out = np.zeros((2, len(t)))
    for c in (0, 1):
        x = np.zeros(len(t))
        for f in freqs:
            for d in ((-.09, .05, .13) if c == 0 else (-.13, -.02, .09)):
                ph = rng.random()
                x += 2 * ((f * 2 ** (d / 12) * t + ph) % 1) - 1
        x = filt(x / (3 * len(freqs)), 'low', cutoff)
        out[c] = x * np.minimum(1, t / .35) * np.minimum(1, np.maximum(0, (dur - t)) / .4)
    return out


def kick(dec=.28, f0=160, f1=45):
    t = ta(dec * 2.5)
    f = f1 + (f0 - f1) * np.exp(-t * 30)
    x = np.sin(TAU * np.cumsum(f) / SR) * np.exp(-t / dec)
    x[:100] += rng.standard_normal(100) * .35 * np.linspace(1, 0, 100)
    return np.tanh(1.8 * x) * .9


def clap():
    t = ta(.35)
    e = np.zeros(len(t))
    for d in (0, .01, .021, .03):
        i = int(d * SR)
        e[i:] += np.exp(-t[: len(t) - i] * 70)
    e += np.exp(-t * 15) * .5
    return filt(rng.standard_normal(len(t)), 'band', [900, 5500]) * e * .6


def hat(dec=70):
    t = ta(.08)
    return filt(rng.standard_normal(len(t)), 'high', 7000) * np.exp(-t * dec) * .35


def shaker():
    t = ta(.07)
    return filt(rng.standard_normal(len(t)), 'band', [4000, 11000]) * np.sin(np.pi * t / .07) ** 2 * .2


def snare():
    t = ta(.2)
    tone = np.sin(TAU * 190 * t) * np.exp(-t * 30) * .5
    nz = filt(rng.standard_normal(len(t)), 'band', [1500, 8000]) * np.exp(-t * 22)
    return (tone + nz) * .55


def noise_sweep(dur, f0, f1, kind='low', shape=1.5):
    t = ta(dur)
    x = sweep(rng.standard_normal(len(t)), f0, f1, kind)
    return x * np.sin(np.pi * np.clip(t / dur, 0, 1)) ** shape


# ---- sound effects ----
def s_pop(p=0):
    t = ta(.12)
    f0 = 700 * 2 ** (p / 12)
    f = f0 * (0.45 + .55 * np.exp(-t * 60))
    x = np.sin(TAU * np.cumsum(f) / SR) * np.exp(-t * 32)
    x[:60] += rng.standard_normal(60) * .3
    return x * .8


def s_tick(p=0):
    t = ta(.05)
    f = 1500 * 2 ** (p / 12)
    return (np.sin(TAU * f * t) * np.exp(-t * 90) + filt(rng.standard_normal(len(t)), 'high', 3000) * np.exp(-t * 250) * .4) * .5


def s_squish():
    t = ta(.2)
    f = 140 + 120 * np.sin(np.pi * t / .2)
    return np.sin(TAU * np.cumsum(f) / SR) * np.sin(np.pi * t / .2) * .6


def s_swish(dur=.35, bright=6000):
    return noise_sweep(dur, 500, bright, 'low', 1.2) * .7


def s_whoosh(dur=.55):
    return noise_sweep(dur, 250, 9000, 'low', 1.4) * .9


def s_swoosh():
    return noise_sweep(.4, 9000, 400, 'low', .9) * .8


def s_zip():
    t = ta(.4)
    f = 250 * (8 ** (t / .4))
    x = (2 * ((np.cumsum(f) / SR) % 1) - 1) * np.sin(np.pi * t / .4)
    return filt(x, 'band', [600, 6000]) * .35


def s_bubble():
    out = np.zeros(int(.5 * SR))
    for k in range(6):
        t0 = k * .065 + rng.random() * .02
        t = ta(.07)
        f = (500 + k * 110) * (1 + 1.2 * t / .07)
        x = np.sin(TAU * np.cumsum(f) / SR) * np.sin(np.pi * t / .07)
        i = int(t0 * SR)
        out[i:i + len(x)] += x[: len(out) - i] * .35
    return out


def s_sparkle():
    out = np.zeros(int(1.0 * SR))
    for k in range(9):
        f = midi(rng.choice([84, 88, 91, 96, 100]))
        b = bell(f, .7) * .5
        i = int(k * .04 * SR)
        out[i:i + len(b)] += b[: len(out) - i]
    return out


def s_scribble():
    t = ta(.35)
    m = (np.sin(TAU * 13 * t) > 0).astype(float) * .7 + .3
    return filt(rng.standard_normal(len(t)), 'band', [1200, 5000]) * m * np.sin(np.pi * t / .35) * .35


def s_thump():
    t = ta(.6)
    f = 40 + 120 * np.exp(-t * 18)
    x = np.sin(TAU * np.cumsum(f) / SR) * np.exp(-t * 5)
    return np.tanh(2 * x) * .9


def s_hit():
    t = ta(1.2)
    f = 38 + 110 * np.exp(-t * 14)
    sub = np.sin(TAU * np.cumsum(f) / SR) * np.exp(-t * 3.2)
    nz = filt(rng.standard_normal(len(t)), 'high', 3500) * np.exp(-t * 9) * .35
    return np.tanh(1.6 * (sub + nz)) * .9


def s_swipe():
    return noise_sweep(.2, 2000, 9000, 'low', .8) * .4


def s_bonk(p=0):
    t = ta(.25)
    f0 = 330 * 2 ** (-p / 12)
    f = f0 * (0.7 + .3 * np.exp(-t * 25))
    x = np.sin(TAU * np.cumsum(f) / SR) * np.exp(-t * 16) + .4 * np.sin(TAU * np.cumsum(f * 2.7) / SR) * np.exp(-t * 30)
    return x * .6


def s_wahwah():
    out = np.zeros(int(1.3 * SR))
    notes = [(0, .22, 58), (.25, .22, 57), (.5, .22, 56), (.75, .5, 55)]
    for t0, d, n in notes:
        t = ta(d)
        vib = 1 + (.012 * np.sin(TAU * 7 * t) if d > .3 else 0)
        f = midi(n) * vib
        saw = 2 * ((np.cumsum(f) / SR) % 1) - 1
        x = filt(saw, 'low', 1100) * env_ad(t, .02, d * .8)
        i = int(t0 * SR)
        out[i:i + len(x)] += x * .45
    return out


def s_boing(p=0):
    t = ta(.45)
    f0 = 330 * 2 ** (p / 12)
    f = f0 * (1 + .5 * np.exp(-t * 7) * np.sin(TAU * 11 * t))
    return np.sin(TAU * np.cumsum(f) / SR) * np.exp(-t * 6) * .45


def s_stretch(p=0):
    t = ta(.4)
    f = 180 * 2 ** (p / 12) * (1 + 1.3 * (t / .4) ** 1.5) * (1 + .03 * np.sin(TAU * 16 * t))
    return np.sin(TAU * np.cumsum(f) / SR) * np.sin(np.pi * t / .4) * .45


def s_scan():
    t = ta(.9)
    f = 700 + 500 * np.sin(TAU * .7 * t)
    x = np.sin(TAU * np.cumsum(f) / SR) * (.55 + .45 * np.sin(TAU * 16 * t))
    return x * np.sin(np.pi * t / .9) * .25


def s_ruler():
    out = np.zeros(int(.4 * SR))
    for k in range(10):
        x = s_tick(k) * .6
        i = int(k * .03 * SR)
        out[i:i + len(x)] += x
    return out


def s_ding(p=0):
    return bell(midi(84 + p * 3), 1.2) * .8


def s_ding2():
    out = np.zeros(int(1.5 * SR))
    a, b = bell(midi(84), 1.3), bell(midi(91), 1.3)
    out[: len(a)] += a
    i = int(.09 * SR)
    out[i:i + len(b)] += b[: len(out) - i]
    return out * .8


def s_click():
    t = ta(.12)
    x = np.sin(TAU * 1800 * t) * np.exp(-t * 120) * .5 + np.sin(TAU * 140 * t) * np.exp(-t * 35) * .7
    x[:30] += rng.standard_normal(30) * .5
    return x


def s_confetti():
    out = np.zeros(int(1.0 * SR))
    for k in range(40):
        x = filt(rng.standard_normal(int(.012 * SR)), 'high', 4000) * np.exp(-ta(.012) * 300) * rng.uniform(.1, .35)
        i = int(rng.uniform(0, .8) * SR)
        out[i:i + len(x)] += x
    return out + s_sparkle()[: len(out)] * .4


def stab(notes, dur=.5):
    t = ta(dur)
    x = np.zeros(len(t))
    for n in notes:
        for d in (-.08, .08):
            x += 2 * ((midi(n) * 2 ** (d / 12) * t) % 1) - 1
    x = sweep(x / (2 * len(notes)), 6000, 700, 'low')
    return x * env_ad(t, .005, .22) * .7


def s_riser(dur=.8):
    t = ta(dur)
    x = sweep(rng.standard_normal(len(t)), 400, 12000, 'low') * (t / dur) ** 2
    tone = np.sin(TAU * np.cumsum(300 * 4 ** (t / dur)) / SR) * (t / dur) ** 3 * .3
    return (x + tone) * .7


def s_shimmer():
    t = ta(.9)
    x = sweep(rng.standard_normal(len(t)), 3000, 12000, 'high') * np.sin(np.pi * t / .9) * .1
    return x + s_sparkle()[: len(t)] * .5


SFX = {
    'pop': lambda p: s_pop(p), 'tick': lambda p: s_tick(p), 'squish': lambda p: s_squish(), 'swish': lambda p: s_swish(),
    'whoosh': lambda p: s_whoosh(), 'swoosh': lambda p: s_swoosh(), 'zip': lambda p: s_zip(), 'bubble': lambda p: s_bubble(),
    'sparkle': lambda p: s_sparkle(), 'scribble': lambda p: s_scribble(), 'thump': lambda p: s_thump(), 'hit': lambda p: s_hit(),
    'swipe': lambda p: s_swipe(), 'bonk': lambda p: s_bonk(p), 'wahwah': lambda p: s_wahwah(), 'boing': lambda p: s_boing(p * 2),
    'stretch': lambda p: s_stretch(p * 3), 'scan': lambda p: s_scan(), 'ruler': lambda p: s_ruler(), 'ding': lambda p: s_ding(p),
    'ding2': lambda p: s_ding2(), 'click': lambda p: s_click(), 'confetti': lambda p: s_confetti(), 'riser': lambda p: s_riser(),
    'shimmer': lambda p: s_shimmer(), 'whoomp': lambda p: s_hit(),
}
# lead-ins: sounds whose peak should land on the cue
LEAD = {'whoosh': .3, 'swoosh': .08, 'swish': .12, 'riser': 0.0}

cues = json.load(open('cues.json'))['cues']
for c in cues:
    t, typ, v, p = c['t'], c['type'], c['v'], c['p']
    pan = float(.45 * np.sin(t * 12.9 + p))
    if typ == 'slam':
        chords = [[58, 62, 65, 70], [60, 64, 67, 72], [62, 65, 69, 74]]
        add(drums, kick(.35, 180, 42), t, 1.0)
        add(drums, clap(), t, .8)
        add(sfx, stab(chords[p]), t, .9)
        add(sfx, s_hit() * .5, t, .6)
        kick_times.append(t)
        continue
    if typ == 'chord':
        for n in (53, 57, 60, 67, 72):
            add(music, bell(midi(n + 12), 3.0), t + (n - 53) * .004, .35, pan=(n - 60) / 20)
        add(drums, kick(.5, 140, 40), t, .8)
        kick_times.append(t)
        continue
    x = SFX[typ](p)
    add(sfx, x, t - LEAD.get(typ, 0), v, pan)

# ================= music bed =================
SECT = [
    (0.0, 2.5, [65, 69, 72, 76], None, 'sparse'),
    (2.5, 3.75, [62, 65, 69, 72], 38, 'full'), (3.75, 5.0, [58, 62, 65, 69], 34, 'full'),
    (5.0, 6.0, [65, 69, 72, 77], 41, 'full'), (6.0, 7.0, [60, 64, 67, 72], 40, 'full'),
    (7.0, 8.0, [65, 69, 72, 76], 41, 'full'), (8.0, 9.0, [57, 60, 64, 69], 33, 'full'),
    (9.0, 10.0, [58, 62, 65, 69], 34, 'full'), (10.0, 11.0, [60, 64, 67, 72], 36, 'full'),
    (11.0, 12.0, [65, 69, 72, 76], 41, 'full'), (12.0, 13.0, [62, 65, 69, 72], 38, 'full'),
    (13.0, 14.0, [58, 62, 65, 69], 34, 'full'), (14.0, 14.4, [60, 64, 67, 72], 36, 'full'),
    (17.0, 20.0, [65, 67, 69, 72, 77], 41, 'sparse'),
]
ARP = [0, 1, 2, 3, 2, 1, 0, 2]
for a, b, chord, root, dens in SECT:
    step = .25 if dens == 'sparse' else .125
    k = 0
    tt = a
    while tt < b - 1e-6:
        if dens == 'sparse' and a >= 17 and tt > 19.2:
            break
        n = chord[ARP[k % len(ARP)] % len(chord)] + (12 if (k // 8) % 2 and dens == 'full' else 0)
        vel = (.55 if k % 2 == 0 else .38) * (1.15 if k % 4 == 0 else 1)
        add(music, marimba(midi(n), .5, 1 if dens == 'full' else .8), tt, vel, pan=.35 * np.sin(k * .9))
        tt += step
        k += 1
    if root:
        add(music, pad([midi(n) for n in chord[:3]], b - a + .3, 1300), a, .22)
        pattern = [(0, .38, 0), (.75, .18, 0), (1.0, .38, 0), (1.5, .2, 12), (1.75, .18, 0)]
        for off, d, oc in pattern:
            if a + off < b:
                add(music, bass(midi(root + oc), d), a + off, .7)
# intro pad + outro pad
add(music, pad([midi(n) for n in (53, 57, 60, 64)], 2.6, 1000), 0.0, .16)
add(music, pad([midi(n) for n in (53, 57, 60, 67)], 3.0, 1500), 17.0, .22)

# ================= drums =================
def grid(a, b, step):
    return np.arange(a, b - 1e-6, step)

for bt in grid(2.5, 14.4, .5):
    if 4.75 <= bt < 5.0:
        continue
    beat_in_bar = int(round(bt / .5)) % 4
    if beat_in_bar in (0, 2):
        add(drums, kick(), bt, .95)
        kick_times.append(bt)
    if beat_in_bar in (1, 3):
        add(drums, clap(), bt, .6, pan=.05)
    if beat_in_bar == 2:
        add(drums, kick(.2), bt + .25, .55)
        kick_times.append(bt + .25)
    add(drums, hat(), bt + .25, .45, pan=.3)
for s in grid(2.5, 14.4, .125):
    if 4.75 <= s < 5.0:
        continue
    add(drums, shaker(), s, .5 + .3 * ((round(s / .125) % 2) == 0), pan=-.35)
# crash / accents at big moments
for t0 in (5.0, 7.0, 11.0):
    x = filt(rng.standard_normal(int(1.0 * SR)), 'high', 6500) * np.exp(-ta(1.0) * 5.0) * .2
    add(drums, x, t0, .8, pan=.2)
# fill into the end card
for i, s in enumerate(grid(16.5, 17.0, .0625)):
    add(drums, snare(), s, .25 + .6 * i / 8, pan=-.1)

# ================= mix =================
kenv = np.zeros(N)
for kt in kick_times:
    i = int(kt * SR)
    t = ta(.25)
    e = np.exp(-t / .09)
    kenv[i:i + len(e)] = np.maximum(kenv[i:i + len(e)], e[: N - i])
duck = 1 - .45 * kenv

music_w = reverb(music, .35) * duck
drums_w = reverb(drums, .12)
sfx_w = reverb(sfx, .22)
mix = music_w * .55 + drums_w * .62 + sfx_w * .85
mix = filt(mix, 'high', 28)
fade = np.ones(N)
fs = int(19.45 * SR)
fade[fs:] = np.linspace(1, 0, N - fs) ** 1.4
mix *= fade
mix = np.tanh(mix * 1.25) / np.tanh(1.25)
mix /= np.max(np.abs(mix)) * 1.1
wavfile.write('soundtrack2.wav', SR, (mix.T * 32767).astype(np.int16))
print('ok', len(cues), 'cues', float(20 * np.log10(np.sqrt(np.mean(mix ** 2)))), 'dBFS rms')
