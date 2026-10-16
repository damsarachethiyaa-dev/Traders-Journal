"""Build timeline.json (scene timings) and narration.wav from lines.json + per-sentence wavs.
usage: python -I timeline.py <wav_dir> <out_dir>"""
import json, sys, wave, os

wav_dir, out_dir = sys.argv[1], sys.argv[2]
here = os.path.dirname(os.path.abspath(__file__))
scenes = json.load(open(os.path.join(here, 'lines.json'), encoding='utf-8'))

LEAD = {'intro': 1.6}
TAIL = {'outro': 3.0, 'intro': 1.2}
GAP = 0.38
RATE = 24000

pcm = bytearray()
t = 0.0
timeline = []
for sc in scenes:
    lead = LEAD.get(sc['id'], 0.8)
    tail = TAIL.get(sc['id'], 1.5)
    cur = lead
    lines = []
    chunks = []
    for i, ln in enumerate(sc['lines']):
        w = wave.open(os.path.join(wav_dir, f"{sc['id']}_{i}.wav"))
        assert w.getframerate() == RATE and w.getnchannels() == 1 and w.getsampwidth() == 2
        dur = w.getnframes() / RATE
        data = w.readframes(w.getnframes())
        lines.append({'cap': ln['cap'], 't0': round(cur, 3), 't1': round(cur + dur, 3)})
        chunks.append((cur, data))
        cur += dur + GAP
    D = cur - GAP + tail
    # assemble this scene's pcm
    n_samples = int(round(D * RATE))
    buf = bytearray(n_samples * 2)
    for at, data in chunks:
        o = int(round(at * RATE)) * 2
        buf[o:o + len(data)] = data
    pcm += buf
    timeline.append({'id': sc['id'], 'tag': sc['tag'], 'start': round(t, 3), 'dur': round(D, 3), 'lines': lines})
    t += D

os.makedirs(out_dir, exist_ok=True)
out = wave.open(os.path.join(out_dir, 'narration.wav'), 'wb')
out.setnchannels(1); out.setsampwidth(2); out.setframerate(RATE)
out.writeframes(bytes(pcm)); out.close()
json.dump({'total': round(t, 3), 'scenes': timeline}, open(os.path.join(here, 'timeline.json'), 'w'), indent=1)
print('total seconds', round(t, 1))
for s in timeline:
    print(s['id'], s['dur'], [(l['t0'], l['t1']) for l in s['lines']])
