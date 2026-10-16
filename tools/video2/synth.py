"""Synthesize music + SFX synced to cues.json, mix with narration.wav, write mix.wav (48 kHz stereo).
usage: python synth.py <narration.wav> <cues.json> <out.wav>   (needs numpy)"""
import json, sys, wave
import numpy as np

SR = 48000
narr_path, cues_path, out_path = sys.argv[1:4]
w = wave.open(narr_path); nsr = w.getframerate()
voice = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768.0
TOTAL = len(voice) / nsr
N = int((TOTAL + 0.5) * SR)
# resample voice 24k -> 48k (linear)
vx = np.arange(N) / SR * nsr
voice48 = np.interp(vx, np.arange(len(voice)), voice, right=0).astype(np.float32)
rng = np.random.default_rng(7)

def tt(d): return np.arange(int(d * SR)) / SR
def add(buf, t0, sig, gain=1.0, pan=0.0):
    i = int(t0 * SR)
    if i >= N: return
    j = min(N, i + len(sig)); seg = sig[:j - i] * gain
    l = np.cos((pan + 1) * np.pi / 4); r = np.sin((pan + 1) * np.pi / 4)
    buf[0, i:j] += seg * l; buf[1, i:j] += seg * r
def lp(x, a):  # one-pole lowpass, a in (0,1) higher = brighter
    y = np.empty_like(x); s = 0.0
    for k in range(len(x)): s += a * (x[k] - s); y[k] = s
    return y
def lp_sweep(x, a0, a1):
    y = np.empty_like(x); s = 0.0; n = len(x)
    for k in range(n):
        a = a0 + (a1 - a0) * (k / n) ** 1.5; s += a * (x[k] - s); y[k] = s
    return y
def hp(x, a): return x - lp(x, a)

# ---------- SFX ----------
def sfx_hit():
    t = tt(0.7); f = 38 + 90 * np.exp(-t * 22)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 6.5)
    n = lp(rng.standard_normal(len(t)).astype(np.float32), 0.35) * np.exp(-t * 18) * 0.9
    click = np.sin(2 * np.pi * 1800 * t) * np.exp(-t * 90) * 0.25
    return (body * 1.1 + n + click).astype(np.float32)
def sfx_stamp():
    t = tt(0.6); f = 70 + 140 * np.exp(-t * 30)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9)
    crack = hp(rng.standard_normal(len(t)).astype(np.float32), 0.25) * np.exp(-t * 40) * 0.8
    metal = (np.sin(2 * np.pi * 620 * t) + np.sin(2 * np.pi * 1450 * t) * .6) * np.exp(-t * 14) * 0.22
    return (body + crack + metal).astype(np.float32)
def sfx_slash():
    t = tt(0.5); n = rng.standard_normal(len(t)).astype(np.float32)
    s = lp_sweep(n, 0.04, 0.9) * np.exp(-((t - .12) ** 2) / .004) * 1.2
    zing = np.sin(2 * np.pi * (2400 + 3200 * t) * t) * np.exp(-t * 12) * .18
    return (s + zing).astype(np.float32)
def sfx_whoosh():
    t = tt(0.55); n = rng.standard_normal(len(t)).astype(np.float32)
    s = lp_sweep(n, 0.03, 0.55); env = np.sin(np.pi * np.clip(t / 0.55, 0, 1)) ** 1.6
    return (s * env * 1.5).astype(np.float32)
def sfx_pop():
    t = tt(0.22); f = 520 + 900 * np.exp(-t * 40)
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 20) * .9).astype(np.float32)
def sfx_click():
    t = tt(0.12); n = hp(rng.standard_normal(len(t)).astype(np.float32), 0.3) * np.exp(-t * 90)
    return (n * 1.1 + np.sin(2 * np.pi * 1200 * t) * np.exp(-t * 70) * .4).astype(np.float32)
def sfx_tick():
    t = tt(0.05); n = hp(rng.standard_normal(len(t)).astype(np.float32), 0.35) * np.exp(-t * 160)
    return (n * 0.7 + np.sin(2 * np.pi * 2400 * t) * np.exp(-t * 150) * .2).astype(np.float32)
def sfx_ding():
    t = tt(1.1); s = 0
    for k, f in enumerate([1046.5, 1318.5, 1568.0, 2093.0]):
        s = s + np.sin(2 * np.pi * f * t) * np.exp(-t * (4 + k)) * (.5 / (k + 1) ** .4)
    return (s * .8).astype(np.float32)
def sfx_riser(d):
    t = tt(d); n = rng.standard_normal(len(t)).astype(np.float32)
    s = lp_sweep(n, 0.02, 0.8) * (t / d) ** 2.2
    tone = np.sin(2 * np.pi * np.cumsum(120 + 900 * (t / d) ** 2) / SR) * (t / d) ** 2 * .3
    return (s * 1.2 + tone).astype(np.float32)

lib = {'hit': (sfx_hit(), 1.0, 0), 'stamp': (sfx_stamp(), .95, 0), 'slash': (sfx_slash(), .9, 0.25), 'whoosh': (sfx_whoosh(), .85, -0.2),
       'pop': (sfx_pop(), .55, 0), 'click': (sfx_click(), .7, 0.15), 'tick': (sfx_tick(), .5, 0.1), 'ding': (sfx_ding(), .5, 0)}
fx = np.zeros((2, N), np.float32)
cues = json.load(open(cues_path))
for c in cues:
    if c['type'] in lib:
        sig, g, pan = lib[c['type']]; add(fx, c['t'], sig, g, pan)
    if c['type'] == 'click': add(fx, c['t'] + .03, lib['pop'][0], .25, 0.15)
end_t = max(c['t'] for c in cues if c['type'] == 'whoosh')
# riser into the end card
lines_end = None
try:
    tl = json.load(open(sys.argv[4] if len(sys.argv) > 4 else 'timeline.json'))
    last = tl['lines'][-1]['t0']; add(fx, last - 2.0, sfx_riser(2.0), .8, 0); add(fx, last - 0.02, sfx_hit(), 1.15, 0)
except Exception as e:
    print('no riser', e)

# ---------- music ----------
BPM = 122; beat = 60 / BPM
mus = np.zeros((2, N), np.float32)
def midi(m): return 440 * 2 ** ((m - 69) / 12)
prog_ = [(57, [57, 60, 64]), (53, [53, 57, 60]), (48, [48, 52, 55]), (55, [55, 59, 62])]  # Am F C G (root, chord)
nbeats = int(TOTAL / beat) + 2
kick_t = tt(0.32); kick = (np.sin(2 * np.pi * np.cumsum(45 + 110 * np.exp(-kick_t * 28)) / SR) * np.exp(-kick_t * 9)).astype(np.float32)
clap_t = tt(0.2); clap = (lp(hp(rng.standard_normal(len(clap_t)).astype(np.float32), .2), .6) * np.exp(-clap_t * 28)).astype(np.float32)
hat_t = tt(0.06); hat = (hp(rng.standard_normal(len(hat_t)).astype(np.float32), .45) * np.exp(-hat_t * 90)).astype(np.float32)
_pc={}
def pluck(f, d=.22):
    k=(round(f,2),d)
    if k in _pc: return _pc[k]
    t = tt(d); _pc[k] = ((np.sin(2 * np.pi * f * t) + .4 * np.sin(4 * np.pi * f * t) + .2 * np.sin(6 * np.pi * f * t)) * np.exp(-t * 16)).astype(np.float32); return _pc[k]
_bc={}
def bass(f, d):
    k=(round(f,2),round(d,3))
    if k in _bc: return _bc[k]
    t = tt(d); s = sum(np.sin(2 * np.pi * f * h * t) / h for h in (1, 2, 3, 4)); _bc[k] = (lp(s.astype(np.float32), .09) * np.exp(-t * 4.5) * 1.6).astype(np.float32); return _bc[k]
for b in range(nbeats):
    t0 = 0.6 + b * beat
    if t0 >= TOTAL: break
    bar = (b // 4) % 4; root, chord = prog_[bar]
    inten = np.clip((t0 - 1.0) / 3.5, 0, 1)
    add(mus, t0, kick, .95 * inten, 0)
    if b % 4 in (1, 3): add(mus, t0, clap, .5 * inten, 0)
    add(mus, t0 + beat / 2, hat, .35 * inten, .2);
    if b % 2: add(mus, t0 + beat / 4, hat, .2 * inten, -.2)
    add(mus, t0, bass(midi(root - 12), beat * .9), .55 * inten, 0)
    add(mus, t0 + beat / 2, bass(midi(root - 12), beat * .45), .45 * inten, 0)
    if t0 > 4.0:
        for k in range(4):
            note = chord[(k + b) % 3] + (12 if k % 2 else 24)
            add(mus, t0 + k * beat / 4, pluck(midi(note)), .22, (-.4 if k % 2 else .4))
# pad
for bar in range(int(TOTAL / (beat * 4)) + 2):
    t0 = 0.6 + bar * beat * 4; root, chord = prog_[bar % 4]; d = beat * 4.1; t = tt(d)
    pad = sum(np.sin(2 * np.pi * midi(n + 12) * t + i) + np.sin(2 * np.pi * midi(n + 12) * 1.004 * t) for i, n in enumerate(chord)) / 6
    env = np.minimum(1, t / .4) * np.minimum(1, (d - t) / .4); add(mus, t0, (pad * env * .35).astype(np.float32), 1, 0)

# ---------- mix with ducking ----------
def mavg(a, win):
    c = np.cumsum(np.concatenate([np.zeros(1), a.astype(np.float64)])); h = win // 2
    idx = np.arange(len(a)); lo = np.clip(idx - h, 0, len(a)); hi = np.clip(idx + h, 0, len(a))
    return ((c[hi] - c[lo]) / np.maximum(1, hi - lo)).astype(np.float32)
def smooth_env(x, win):
    return mavg(np.abs(x), win)
venv = smooth_env(voice48, int(0.12 * SR)); venv = np.clip(venv / (np.percentile(venv, 98) + 1e-6), 0, 1)
venv = mavg(venv, int(.25 * SR))
duck = 1 - 0.62 * np.clip(venv * 1.6, 0, 1)
mus *= duck * 0.62
fx *= (1 - 0.30 * np.clip(venv * 1.6, 0, 1))
fade = np.ones(N, np.float32); fo = int(1.4 * SR); fade[-fo:] = np.linspace(1, 0, fo)
mix = np.zeros((2, N), np.float32)
mix += mus; mix += fx * 0.95
vs = np.tanh(voice48 * 1.15) * 1.0
mix[0] += vs * 1.15; mix[1] += vs * 1.15
mix *= fade
peak = np.max(np.abs(mix)); mix = mix / max(1.0, peak / 0.92)
pcm = (np.clip(mix, -1, 1).T * 32767).astype(np.int16)
o = wave.open(out_path, 'wb'); o.setnchannels(2); o.setsampwidth(2); o.setframerate(SR); o.writeframes(pcm.tobytes()); o.close()
print('mix written', out_path, round(TOTAL, 2), 's', 'peak', round(float(peak), 2))
