"""Build timeline.json + narration.wav (24 kHz mono) from narration audio.
  python -I make_timeline.py --per-line <dir with L0.wav..>  <out_dir>
  python -I make_timeline.py --single <narration.wav>        <out_dir>   (splits sentences at the longest pauses)
"""
import json, os, re, subprocess, sys, wave
here = os.path.dirname(os.path.abspath(__file__))
lines = json.load(open(os.path.join(here, 'lines.json'), encoding='utf-8'))
mode, src, out_dir = sys.argv[1], sys.argv[2], sys.argv[3]
FF = os.environ['FFMPEG']
RATE = 24000; LEAD = 1.0; GAP = 0.34; TAIL = 3.2
os.makedirs(out_dir, exist_ok=True)

def read(path):
    w = wave.open(path); assert w.getframerate() == RATE and w.getnchannels() == 1 and w.getsampwidth() == 2
    return w.readframes(w.getnframes())

pcm = bytearray(int(LEAD * RATE) * 2); tl = []
if mode == '--per-line':
    cur = LEAD
    for i, ln in enumerate(lines):
        data = read(os.path.join(src, f'L{i}.wav')); dur = len(data) / 2 / RATE
        pad = int(round(cur * RATE)) * 2
        if len(pcm) < pad: pcm += bytearray(pad - len(pcm))
        pcm += data
        tl.append({'cap': ln['cap'], 't0': round(cur, 3), 't1': round(cur + dur, 3)})
        cur += dur + GAP
else:
    wav = os.path.join(out_dir, '_single24k.wav')
    subprocess.run([FF, '-y', '-loglevel', 'error', '-i', src, '-ac', '1', '-ar', str(RATE), '-c:a', 'pcm_s16le', wav], check=True)
    data = read(wav); total = len(data) / 2 / RATE
    # trim leading/trailing silence, find pauses
    r = subprocess.run([FF, '-i', wav, '-af', 'silencedetect=n=-38dB:d=0.18', '-f', 'null', '-'], capture_output=True, text=True).stderr
    starts = [float(x) for x in re.findall(r'silence_start: ([\d.]+)', r)]
    ends = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', r)]
    gaps = []
    for k, s in enumerate(starts):
        e = ends[k] if k < len(ends) else total
        gaps.append((s, e))
    speech0 = gaps[0][1] if gaps and gaps[0][0] < 0.05 else 0.0
    speech1 = gaps[-1][0] if gaps and gaps[-1][1] >= total - 0.05 else total
    inner = [g for g in gaps if g[0] > speech0 + 0.1 and g[1] < speech1 - 0.1]
    n = len(lines) - 1
    # expected boundary positions by character share
    chars = [len(l['cap']) for l in lines]; cum = 0; exp = []
    for c in chars[:-1]:
        cum += c; exp.append(speech0 + (speech1 - speech0) * cum / sum(chars))
    # pick, for each expected boundary, the best gap near it (longest within +-12% of the span), keep order
    span = speech1 - speech0; chosen = []; last = speech0
    for e in exp:
        cand = [g for g in inner if g[0] > last and abs((g[0] + g[1]) / 2 - e) < 0.14 * span]
        if not cand: cand = [g for g in inner if g[0] > last]
        g = max(cand, key=lambda g: (g[1] - g[0]) - 2.5 * abs((g[0] + g[1]) / 2 - e) / span) if cand else (e, e)
        chosen.append(g); last = g[1]
    bounds = [speech0] + [None] * 0
    segs = []; a = speech0
    for g in chosen: segs.append((a, g[0])); a = g[1]
    segs.append((a, speech1))
    print('pauses used:', [round(g[1]-g[0], 2) for g in chosen])
    for i, (a, b) in enumerate(segs):
        t0 = LEAD + (a - speech0) + 0.0; t1 = LEAD + (b - speech0)
        tl.append({'cap': lines[i]['cap'], 't0': round(t0, 3), 't1': round(t1, 3)})
    s0 = int(speech0 * RATE) * 2; s1 = int(speech1 * RATE) * 2
    pcm += data[s0:s1]
end = tl[-1]['t1']; total = end + TAIL
need = int(round(total * RATE)) * 2
if len(pcm) < need: pcm += bytearray(need - len(pcm))
w = wave.open(os.path.join(out_dir, 'narration.wav'), 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(RATE); w.writeframes(bytes(pcm[:need])); w.close()
json.dump({'total': round(total, 3), 'lines': tl}, open(os.path.join(here, 'timeline.json'), 'w'), indent=1)
print('total', round(total, 2)); [print(i, l['t0'], l['t1'], l['cap'][:40]) for i, l in enumerate(tl)]
