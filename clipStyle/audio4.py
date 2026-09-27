import json
exec(open('alib3.py').read())

# ---------- extra sounds ----------
def swoop(dur, f0, f1, amp=.35):
    t = ta(dur); f = f0 * (f1 / f0) ** (t / dur)
    return np.sin(TAU * np.cumsum(f) / SR) * np.sin(np.pi * t / dur) * amp

def s_crack():
    t = ta(.5)
    x = filt(rng.standard_normal(len(t)), 'high', 2500) * np.exp(-t * 25) * .7
    for k in range(6):
        b = bell(rng.uniform(2500, 6000), .4) * .5; i = int(k * .02 * SR); x[i:i + len(b)] += b[: len(x) - i]
    return x

def s_tink():
    return bell(3400, .6) * .9 + bell(5200, .6) * .4

def s_clatter():
    out = np.zeros(int(.8 * SR))
    for k, d in enumerate([0, .12, .21, .27, .31]):
        b = s_tink() * (.8 - k * .13); i = int(d * SR); out[i:i + len(b)] += b[: len(out) - i]
    return out

def s_blur():
    return sweep(rng.standard_normal(int(.9 * SR)), 6000, 300, 'low') * np.sin(np.pi * ta(.9) / .9) * .5 + swoop(.9, 600, 200, .2)

def s_nope(p=0):
    out = np.zeros(int(.35 * SR))
    for k, f in enumerate([420, 330]):
        t = ta(.14); x = np.sign(np.sin(TAU * f * t)) * np.exp(-t * 12) * .18; x = filt(x, 'low', 2000); i = int(k * .15 * SR); out[i:i + len(x)] += x
    return out

def s_slide():
    t = ta(.6); f = 1400 * (.35 ** (t / .6)) * (1 + .02 * np.sin(TAU * 6 * t))
    return np.sin(TAU * np.cumsum(f) / SR) * np.sin(np.pi * t / .6) * .35

def s_sigh():
    t = ta(.9); return sweep(rng.standard_normal(len(t)), 1800, 500, 'low') * np.sin(np.pi * t / .9) ** 2 * .25

def s_box():
    t = ta(.4); f = 55 + 60 * np.exp(-t * 30)
    x = np.sin(TAU * np.cumsum(f) / SR) * np.exp(-t * 12) + filt(rng.standard_normal(len(t)), 'band', [300, 2000]) * np.exp(-t * 25) * .5
    return np.tanh(1.5 * x) * .8

def s_stamp():
    t = ta(.3); x = s_box()[: len(t)] * .9; x[:200] += filt(rng.standard_normal(200), 'high', 3000) * .8
    return x

def s_flip():
    t = ta(.06); return filt(rng.standard_normal(len(t)), 'band', [2000, 7000]) * np.sin(np.pi * t / .06) * .35

def s_crash():
    out = np.zeros(int(1.0 * SR))
    for k, d in enumerate([0, .09, .16, .25, .33, .41]):
        b = s_box() * (1 - k * .1); i = int(d * SR); out[i:i + len(b)] += b[: len(out) - i]
    return out

def s_vibrate():
    t = ta(.7); x = np.sin(TAU * 160 * t) * (np.sin(TAU * 11 * t) > -.2) * .4
    return filt(x, 'low', 900) * (t < .3) + filt(x, 'low', 900) * (t > .4) * (t < .68)

def s_ping():
    out = np.zeros(int(1.3 * SR)); a = bell(midi(88), 1.0) * .8; b = bell(midi(95), 1.0) * .8
    out[: len(a)] += a; i = int(.12 * SR); out[i:i + len(b)] += b[: len(out) - i]; return out

def s_gasp():
    t = ta(.3); return sweep(rng.standard_normal(len(t)), 800, 3500, 'band' if False else 'low') * np.sin(np.pi * t / .3) * .2

def s_chime():
    out = np.zeros(int(1.6 * SR))
    for k, n in enumerate([77, 81, 84, 89]):
        b = bell(midi(n), 1.2) * .6; i = int(k * .06 * SR); out[i:i + len(b)] += b[: len(out) - i]
    return out

def s_plink(p=0):
    return marimba(midi(96 + p), .25, .6) * .8

def s_chord2():
    out = np.zeros(int(2.5 * SR))
    for k, n in enumerate([72, 76, 79, 84]):
        b = bell(midi(n), 2.2) * .55; i = int(k * .025 * SR); out[i:i + len(b)] += b[: len(out) - i]
    return out

def s_tape():
    t = ta(.35); x = filt(rng.standard_normal(len(t)), 'band', [800, 5000]) * (.6 + .4 * np.sign(np.sin(TAU * 45 * t)))
    return x * np.sin(np.pi * t / .35) * .4

def s_dingdong():
    out = np.zeros(int(1.8 * SR)); a = bell(midi(76), 1.4); b = bell(midi(72), 1.4)
    out[: len(a)] += a; i = int(.42 * SR); out[i:i + len(b)] += b[: len(out) - i]; return out * 1.2

def s_choir():
    p = pad([midi(n) for n in (65, 69, 72, 77)], 1.6, 3000); t = ta(1.6); env = (t / 1.6) ** 1.5
    return (p * env).mean(axis=0) * 1.6 + swoop(1.6, 400, 1600, .06)

def s_focus():
    h = s_hit(); sp = s_sparkle(); out = np.zeros(max(len(h), len(sp))); out[: len(h)] += h * .5; out[: len(sp)] += sp * .6
    return out

SFX = {
    'pop': lambda p: s_pop(p), 'tick': lambda p: s_tick(p), 'squish': lambda p: s_squish(), 'swish': lambda p: s_swish(),
    'whoosh': lambda p: s_whoosh(), 'swoosh': lambda p: s_swoosh(), 'zip': lambda p: s_zip(), 'bubble': lambda p: s_bubble(),
    'sparkle': lambda p: s_sparkle(), 'scribble': lambda p: s_scribble(), 'thump': lambda p: s_thump(), 'hit': lambda p: s_hit(),
    'swipe': lambda p: s_swipe(), 'bonk': lambda p: s_bonk(p), 'wahwah': lambda p: s_wahwah(), 'boing': lambda p: s_boing(p * 2),
    'stretch': lambda p: s_stretch(p * 3), 'scan': lambda p: s_scan(), 'ruler': lambda p: s_ruler(), 'ding': lambda p: s_ding(p),
    'ding2': lambda p: s_ding2(), 'click': lambda p: s_click(), 'confetti': lambda p: s_confetti(), 'riser': lambda p: s_riser(),
    'shimmer': lambda p: s_shimmer(), 'whoomp': lambda p: s_hit(),
    'iris': lambda p: swoop(.6, 200, 900), 'irisin': lambda p: swoop(.4, 250, 900, .3), 'irisout': lambda p: swoop(.5, 900, 150, .35),
    'wave': lambda p: s_chime() * .5, 'crack': lambda p: s_crack(), 'tink': lambda p: s_tink(), 'clatter': lambda p: s_clatter(),
    'blur': lambda p: s_blur(), 'nope': lambda p: s_nope(p), 'slide': lambda p: s_slide(), 'sigh': lambda p: s_sigh(),
    'scroll': lambda p: np.concatenate([s_tick(k % 5) * .5 for k in range(22)]), 'box': lambda p: s_box(), 'stamp': lambda p: s_stamp(),
    'flip': lambda p: s_flip(), 'crash': lambda p: s_crash(), 'thud': lambda p: s_box() * .8, 'vibrate': lambda p: s_vibrate(),
    'ping': lambda p: s_ping(), 'gasp': lambda p: s_gasp(), 'chime': lambda p: s_chime(), 'plink': lambda p: s_plink(p),
    'chord2': lambda p: s_chord2(), 'tape': lambda p: s_tape(), 'dingdong': lambda p: s_dingdong(), 'choir': lambda p: s_choir(),
    'focus': lambda p: s_focus(), 'wink': lambda p: s_tink() * .6,
}
LEAD = {'whoosh': .3, 'swoosh': .08, 'swish': .12}
STABS = [[58, 62, 65, 70], [60, 64, 67, 72], [62, 65, 69, 74], [62, 65, 69, 72], [67, 71, 74, 77], [62, 65, 69, 74], [57, 60, 64, 69], [60, 64, 67, 72], [57, 60, 64, 69], [55, 59, 62, 67]]
cues = json.load(open('cues8.json'))['cues']
for c in cues:
    t, typ, v, p = c['t'], c['type'], c['v'], c['p']
    pan = float(.45 * np.sin(t * 12.9 + p))
    if typ == 'slam':
        add(drums, kick(.3, 170, 45), t, .8 * v); add(drums, clap(), t, .6 * v); add(sfx, stab(STABS[p % len(STABS)]), t, .75 * v); kick_times.append(t); continue
    if typ == 'chord':
        for n in (53, 57, 60, 67, 72): add(music, bell(midi(n + 12), 3.0), t + (n - 53) * .004, .32, pan=(n - 60) / 20)
        add(drums, kick(.5, 140, 40), t, .8); kick_times.append(t); continue
    add(sfx, SFX[typ](p), t - LEAD.get(typ, 0), v, pan)

# ---------- score ----------
# (start, end, chord tones for arps, bass root, style)
SECT = [
    (0, 2, [65, 69, 72, 76], 41, 'intro'), (2, 4, [62, 65, 69, 72], 38, 'intro'), (4, 5, [58, 62, 65, 69], 34, 'intro'), (5, 6, [60, 64, 67, 72], 36, 'intro'),
    (6, 8, [62, 65, 69, 72], 38, 'store'), (8, 10, [55, 59, 62, 65], 43, 'store'), (10, 12, [62, 65, 69, 72], 38, 'store'), (12, 13.2, [55, 59, 62, 65], 43, 'store'),
    (13.2, 14.6, [58, 62, 65, 69], 34, 'sad'), (14.6, 15.95, [57, 60, 64, 67], 33, 'sad'),
    (16, 18, [57, 60, 64, 69], 33, 'online'), (18, 20, [53, 57, 60, 65], 29, 'online'), (20, 22, [55, 60, 64, 67], 36, 'online'), (22, 23.9, [55, 59, 62, 67], 31, 'online'),
    (24, 28, [53, 57, 60, 64], 29, 'night'),
    (28, 30, [65, 69, 72, 77], 41, 'muse'), (30, 32, [60, 64, 67, 72], 36, 'muse'), (32, 34, [62, 65, 69, 74], 38, 'muse'), (34, 36, [58, 62, 65, 70], 34, 'muse'), (36, 38, [65, 69, 72, 77], 41, 'muse'), (38, 40, [60, 64, 67, 72], 36, 'muse'),
    (40, 42, [65, 69, 72, 77], 41, 'muse'), (42, 44, [60, 64, 67, 72], 36, 'muse'), (44, 46, [62, 65, 69, 74], 38, 'muse'), (46, 48, [58, 62, 65, 70], 34, 'build'),
    (48, 50, [65, 69, 72, 77], 41, 'chorus'), (50, 52, [60, 64, 67, 72], 36, 'chorus'), (52, 54, [62, 65, 69, 74], 38, 'chorus'), (54, 55, [58, 62, 65, 70], 34, 'chorus'), (55, 56, [60, 64, 67, 72], 36, 'chorus'),
    (56, 59.6, [65, 67, 69, 72, 77], 41, 'end'),
]
ARP = [0, 1, 2, 3, 2, 1, 0, 2]
for a, b, chord, root, st in SECT:
    step = {'intro': .25, 'store': .25, 'sad': .5, 'online': .125, 'night': .5, 'muse': .125, 'build': .125, 'chorus': .125, 'end': .25}[st]
    vel0 = {'intro': .5, 'store': .45, 'sad': .35, 'online': .38, 'night': .3, 'muse': .45, 'build': .42, 'chorus': .5, 'end': .45}[st]
    k, tt = 0, a
    while tt < b - 1e-6:
        n = chord[ARP[k % 8] % len(chord)] + (12 if st in ('muse', 'chorus', 'build') and (k // 8) % 2 else 0)
        if not (st == 'store' and k % 4 == 3):
            add(music, marimba(midi(n), .5, 1.0 if st != 'night' else .5), tt, vel0 * (1.2 if k % 4 == 0 else 1) * (.7 if k % 2 else 1), pan=.35 * np.sin(k * .9))
        tt += step; k += 1
    padg = {'intro': .12, 'store': .1, 'sad': .28, 'online': .12, 'night': .3, 'muse': .18, 'build': .25, 'chorus': .25, 'end': .3}[st]
    add(music, pad([midi(n) for n in chord[:3]], b - a + .25, 900 if st in ('sad', 'night') else 1600), a, padg)
    if st in ('store',):
        walk = [0, 3, 5, 7, 10, 7, 5, 3]
        for j, tt in enumerate(np.arange(a, b - 1e-6, .25)): add(music, bass(midi(root + walk[j % 8]), .22), tt, .6)
    elif st in ('online', 'muse', 'build', 'chorus'):
        for j, tt in enumerate(np.arange(a, b - 1e-6, .25)): add(music, bass(midi(root + (12 if j % 4 == 3 else 0)), .2), tt, .55 if st != 'online' else .5)
    elif st in ('intro', 'end', 'sad'):
        for tt in np.arange(a, b - 1e-6, 1.0): add(music, bass(midi(root), .6), tt, .5)
    elif st == 'night':
        add(music, bass(midi(root), 3.5), a, .45)
    if st == 'chorus':
        for tt in np.arange(a, b - 1e-6, 1.0): add(sfx, stab([n + 12 for n in chord[:3]] if False else chord[:4]), tt, .4)

# ---------- drums ----------
def beat_idx(t): return int(round(t / .5))
for t in np.arange(0, 60, .5):
    st = next((s[4] for s in SECT if s[0] <= t < s[1]), None)
    bi = beat_idx(t) % 4
    if st == 'intro' and t >= .7:
        if bi in (1, 3): add(drums, clap() * .5, t, .45)
        add(drums, shaker(), t + .25, .5, pan=-.3)
    if st == 'store':
        if bi in (0, 2): add(drums, kick(.22), t, .8); kick_times.append(t)
        if bi in (1, 3): add(drums, clap(), t, .55)
        add(drums, hat(), t + .25, .35, pan=.3)
        if bi == 3: add(drums, s_tick(-5) * 1.2, t + .25, .35, pan=.4)
    if st in ('online',):
        if t >= 18.5 or bi in (0, 2): add(drums, kick(.22), t, .85); kick_times.append(t)
        if bi in (1, 3): add(drums, clap(), t, .55)
    if st in ('muse', 'build', 'chorus'):
        if not (st == 'build' and t >= 47.5): add(drums, kick(), t, .9 if st == 'chorus' else .8); kick_times.append(t)
        if bi in (1, 3): add(drums, clap(), t, .6 if st == 'chorus' else .5)
        add(drums, hat(), t + .25, .45 if st == 'chorus' else .35, pan=.3)
    if st == 'night' and t in (24.0, 24.35, 26.0, 26.35):
        add(drums, kick(.35, 90, 40), t, .5)
for s in np.arange(16, 23.9, .125): add(drums, shaker(), s, .45, pan=-.35)
for s in np.arange(28, 48, .125): add(drums, shaker(), s, .35, pan=-.35)
for s in np.arange(48, 56, .125): add(drums, shaker(), s, .45, pan=-.35)
for i, s in enumerate(np.arange(47.5, 48, .0625)): add(drums, snare(), s, .2 + .6 * i / 8, pan=-.1)
add(sfx, s_riser(1.2), 26.8, .5); add(sfx, s_riser(.8), 47.2, .5)
for t0 in (28.0, 48.0):
    x = filt(rng.standard_normal(int(1.0 * SR)), 'high', 6500) * np.exp(-ta(1.0) * 5.0) * .2; add(drums, x, t0, .8, pan=.2)

# ---------- master fx ----------
kenv = np.zeros(N)
for kt in kick_times:
    i = int(kt * SR); e = np.exp(-ta(.25) / .09); kenv[i:i + len(e)] = np.maximum(kenv[i:i + len(e)], e[: N - i])
duck = 1 - .4 * kenv
T = np.arange(N) / SR
# "blurry" music while Sam can't see
muff = np.clip(np.minimum((T - 3.6) / .6, (5.8 - T) / .4), 0, 1) + np.clip(np.minimum((T - 47.9) / .1, (48.55 - T) / .06), 0, 1)
muff = np.clip(muff, 0, 1)
mus = music * duck
mus_lp = filt(mus, 'low', 650)
mus = mus * (1 - muff) + mus_lp * muff
mix_md = reverb(mus, .32) * .55 + reverb(drums, .12) * .6
# tape stop into the night scene
a0, a1 = int(23.5 * SR), int(24.0 * SR)
seglen = a1 - a0; sp = np.linspace(1, 0, seglen) ** 1.3; pos = a0 + np.cumsum(sp)
for c in (0, 1):
    mix_md[c, a0:a1] = np.interp(pos, np.arange(N), mix_md[c]) * np.linspace(1, .2, seglen)
mix_md[:, int(24.0 * SR):int(24.05 * SR)] *= np.linspace(0, 1, int(.05 * SR))
# silence gap for the iris-out
g0, g1 = int(15.95 * SR), int(16.02 * SR); mix_md[:, g0:g1] *= 0
mix = mix_md + reverb(sfx, .2) * .85
mix = filt(mix, 'high', 28)
fade = np.ones(N); fs = int(59.3 * SR); fade[fs:] = np.linspace(1, 0, N - fs) ** 1.4; mix *= fade
mix = np.tanh(mix * 1.25) / np.tanh(1.25)
mix /= np.max(np.abs(mix)) * 1.1
wavfile.write('soundtrack4.wav', SR, (mix.T * 32767).astype(np.int16))
print('ok', len(cues), 'cues', float(20 * np.log10(np.sqrt(np.mean(mix ** 2)))), 'dBFS rms')
