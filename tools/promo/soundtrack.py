"""Original 120 BPM electronic score, stereo effects, timed narration and captions.
No sampled music or third-party audio. Requires numpy; writes 48 kHz PCM WAVs.
"""
from pathlib import Path
import json, wave
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'media' / 'promo-audio'
STORY = json.loads((ROOT / 'tools/promo/storyboard.json').read_text(encoding='utf-8'))
SR = 48000
D = STORY['duration']
N = SR * D
rng = np.random.default_rng(1080)
music = np.zeros((N, 2), dtype=np.float32)
effects = np.zeros_like(music)
voice = np.zeros(N, dtype=np.float32)
duck = np.ones(N, dtype=np.float32)

def add(track, at, signal, gain=1., pan=0.):
    i = int(at * SR)
    if i < 0:
        signal = signal[-i:]; i = 0
    n = min(len(signal), len(track)-i)
    if n <= 0: return
    if track.ndim == 1: track[i:i+n] += signal[:n] * gain
    else:
        track[i:i+n, 0] += signal[:n] * gain * np.sqrt((1-pan)/2)
        track[i:i+n, 1] += signal[:n] * gain * np.sqrt((1+pan)/2)

def times(d): return np.arange(int(d*SR), dtype=np.float32)/SR
def note(m): return 440*2**((m-69)/12)
def sine(f,t): return np.sin(2*np.pi*f*t)
def pluck(m,d=.7):
    t=times(d); f=note(m)
    return (sine(f,t)+.28*sine(f*2,t)+.12*sine(f*3,t))*np.exp(-t*8)*np.minimum(t/.008,1)
def kick():
    t=times(.42); phase=2*np.pi*(44*t+105*.024*(1-np.exp(-t/.024)))
    return np.tanh(np.sin(phase)*2)*np.exp(-t*10)*np.minimum(t/.002,1)
def snare():
    t=times(.22); noise=rng.normal(0,1,len(t)).astype(np.float32)
    noise=np.r_[noise[0], np.diff(noise)]
    return (noise*.3+sine(185,t)*.22)*np.exp(-t*22)*np.minimum(t/.002,1)
def hat(opened=False):
    t=times(.22 if opened else .07);noise=rng.normal(0,1,len(t)).astype(np.float32)
    return np.r_[0,np.diff(noise)]*np.exp(-t*(25 if opened else 85))*.14

KICK=kick(); SNARE=snare()
beat=60/STORY['bpm']
chords=[[40,47,55,59],[36,43,52,55],[43,50,59,62],[38,45,54,57]]
# Warm evolving chords with stereo movement and sidechain-style breathing.
for bar in range(int(D/2)):
    at=bar*2.;ch=chords[(bar//2)%4];t=times(2.4)
    fade=np.minimum(t/.3,1)*np.minimum((2.4-t)/.6,1)
    breath=.55+.45*np.minimum((t%beat)/.16,1)
    for k,m in enumerate(ch):
        sig=(sine(note(m+12),t)+.22*sine(note(m+12)*1.003,t)+.12*sine(note(m+24),t))*fade*breath
        add(music,at,sig,.035,(-.6+.4*k))
for b in range(int(D/beat)):
    at=b*beat;section=at//8
    active=14<=at<112
    intensity=.5 if 68<=at<76 else 1.
    if active:
        add(music,at,KICK,.34*intensity)
        if b%2: add(music,at,SNARE,.29*intensity,.06)
        add(music,at,hat(),.29,-.28)
        add(music,at+.25,hat(b%4==3),.25,.33)
        root=chords[(int(at)//4)%4][0]
        t=times(.41);f=note(root-12)
        bass=(sine(f,t)+.35*sine(f*2,t)+.12*sine(f*3,t))*np.minimum(t/.008,1)*np.minimum((.41-t)/.1,1)
        add(music,at+.07,bass,.18*intensity)
    # Sequenced sparkling lead, restrained under narration.
    if 6<=at<116:
        ch=chords[(int(at)//4)%4]
        for sub in range(2):
            m=ch[(b*2+sub)%4]+24
            vol=.065 if active else .032
            p=np.sin((b*2+sub)*.7)*.7
            sig=pluck(m)
            add(music,at+sub*.25,sig,vol,p)
            add(music,at+sub*.25+.375,sig,vol*.23,-p)

start=0.; scene_info=[]
for scene in STORY['scenes']:
    # A stereo riser leading into each chapter, then sub impact and bright click.
    if start:
        t=times(.75);noise=rng.normal(0,1,len(t)).astype(np.float32)
        smooth=np.convolve(noise,np.ones(9)/9,'same').astype(np.float32)
        env=(t/.75)**2*np.minimum((.75-t)/.04,1)
        add(effects,start-.65,smooth*env,.33,-.6)
        add(effects,start-.58,smooth*env,.27,.6)
        t=times(.7)
        impact=sine(40,t)*np.exp(-t*7)+.15*sine(80,t)*np.exp(-t*16)
        add(effects,start,impact,.4)
        add(effects,start,pluck(88,.2),.07,.2)
    else:
        t=times(2.3);add(effects,0,sine(42,t)*np.exp(-t*1.8),.24)
    with wave.open(str(OUT/(scene['id']+'.wav')),'rb') as w:
        assert w.getframerate()==SR and w.getnchannels()==1
        a=np.frombuffer(w.readframes(w.getnframes()),dtype='<i2').astype(np.float32)/32768
    # Fit the narration to the scene if a system voice runs longer than expected.
    available=scene['duration']-1.5
    if len(a)/SR > available:
        a=np.interp(np.linspace(0,len(a)-1,int(available*SR)),np.arange(len(a)),a).astype(np.float32)
    peak=max(float(np.max(np.abs(a))),.01)
    a=a*(.66/peak)
    at=start+.8
    add(voice,at,a)
    a0=max(0,int((at-.15)*SR));a1=min(N,int((at+len(a)/SR+.25)*SR))
    duck[a0:a1]=.39
    scene_info.append({**scene,'start':start,'voiceStart':at,'voiceEnd':at+len(a)/SR})
    print(scene['id'],'voice',round(len(a)/SR,2),'sec')
    start+=scene['duration']
assert start==D
# Smooth gain ramps avoid clicks. Give the final identity a clean musical resolve.
kernel=np.ones(int(.08*SR),dtype=np.float32)/(int(.08*SR))
duck=np.convolve(duck,kernel,'same').astype(np.float32)
fade=np.minimum(np.arange(N)/SR/2,1)*np.minimum((D-np.arange(N)/SR)/2.2,1)
score=music*fade[:,None]
mix=score*duck[:,None]+effects*.75+voice[:,None]*.84
mix=np.tanh(mix*1.15)*.91
mix*=np.minimum((D-np.arange(N)/SR)/.55,1)[:,None]

def write(name,a):
    with wave.open(str(OUT/name),'wb') as w:
        w.setnchannels(2 if a.ndim==2 else 1);w.setsampwidth(2);w.setframerate(SR)
        w.writeframes((np.clip(a,-1,1)*32767).astype('<i2').tobytes())
write('music.wav',score);write('effects.wav',effects);write('narration.wav',voice);write('master.wav',mix)
STORY['scenes']=scene_info
(OUT/'timeline.json').write_text(json.dumps(STORY,indent=2),encoding='utf-8')

def stamp(t):
    msec=round(t*1000);h,msec=divmod(msec,3600000);m,msec=divmod(msec,60000);s,ms=divmod(msec,1000)
    return f'{h:02}:{m:02}:{s:02},{ms:03}'
srt=[];vtt=['WEBVTT','']
for i,s in enumerate(scene_info,1):
    a,b=stamp(s['voiceStart']),stamp(s['voiceEnd'])
    srt.extend([str(i),a+' --> '+b,s['voice'],''])
    vtt.extend([a.replace(',','.')+' --> '+b.replace(',','.'),s['voice'],''])
(ROOT/'media/traders-journal-promo.srt').write_text('\n'.join(srt),encoding='utf-8')
(ROOT/'media/traders-journal-promo.vtt').write_text('\n'.join(vtt),encoding='utf-8')
print('Original soundtrack and master complete:',D,'seconds, 48 kHz stereo')
