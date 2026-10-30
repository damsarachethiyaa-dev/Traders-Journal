import os
import sys
import json
import urllib.request
import urllib.error
import wave
from pathlib import Path

ROOT = Path(r"C:\Users\LEGION\OneDrive\Desktop\Traders-Journal")
AUDIO_DIR = ROOT / 'media' / 'promo-audio'
AUDIO_DIR.mkdir(parents=True, exist_ok=True)

# API Key (loaded from environment variable)
API_KEY = os.getenv("ELEVENLABS_API_KEY", "")
VOICE_ID = "pNInz6obpgDQGcFmaJgB" # Adam - Cinematic Deep Voice
MODEL_ID = "eleven_multilingual_v2"

# 12 Scenes from A to Z, including Login!
SCENES = [
    {
        "id": "intro",
        "duration": 6,
        "label": "THE TRADING WORKSPACE",
        "title": ["TRADERS JOURNAL", "TUTORIAL & GUIDE."],
        "accent": "#b7ff5c",
        "voice": "Welcome to Traders Journal, the complete desktop trading workspace created by Chethiya Rathnasekara."
    },
    {
        "id": "login",
        "duration": 8,
        "label": "00 / SECURE LOCAL LOGIN",
        "title": ["THE PRIVATE GATE.", "LOCAL AUTHENTICATION."],
        "accent": "#b7ff5c",
        "image": "login",
        "chips": ["Zero cloud tracking", "Local scrypt hashing", "Multi-trader PC support"],
        "voice": "Every trading record stays locked and private on your PC, protected by local authentication with zero cloud tracking."
    },
    {
        "id": "overview",
        "duration": 8,
        "label": "FULL PROJECT OVERVIEW",
        "title": ["EVERY TRADE.", "IN FULL FOCUS."],
        "accent": "#b7ff5c",
        "image": "dashboard",
        "chips": ["Real-time metrics", "Instant clarity", "Dark minimalist UI"],
        "voice": "Traders Journal gives you full control of your trading performance, journal entries, and broker connections in one private desktop application."
    },
    {
        "id": "mt5",
        "duration": 14,
        "label": "01 / QUICK MT5 CONNECTION GUIDE",
        "title": ["ONE-CLICK.", "QUICK MT5 SYNC."],
        "accent": "#72dfff",
        "image": "connect",
        "chips": ["1-Click Quick Connect", "Direct local sync", "Read-only connection"],
        "voice": "Connecting MetaTrader five is fast and seamless. Simply run the one-click sync command to automatically link your live terminal and stream trade history with zero manual configuration."
    },
    {
        "id": "scanner",
        "duration": 12,
        "label": "02 / MULTI-ACCOUNT MANAGER",
        "title": ["DISCOVER &", "CHOOSE ACCOUNTS."],
        "accent": "#ffd47a",
        "image": "scanner",
        "chips": ["Account discovery scanner", "Selective account sync", "Permanent deletion guard"],
        "voice": "Scan your computer to detect all active MT5 accounts. Choose which trading accounts you want in your journal, and safely remove deleted accounts with permanent protection."
    },
    {
        "id": "dashboard",
        "duration": 12,
        "label": "03 / COMMAND CENTER & METRICS",
        "title": ["LESS NOISE.", "MORE CLARITY."],
        "accent": "#b7ff5c",
        "image": "dashboard",
        "chips": ["Interactive equity curve", "Net P&L and win rate", "Profit factor & drawdown"],
        "voice": "The Command Center provides instant clarity on your net profit, win rate, profit factor, and equity curve, updated in real time across all your trading accounts."
    },
    {
        "id": "logging",
        "duration": 10,
        "label": "04 / TRADE LOGGING & CALENDAR",
        "title": ["CAPTURE", "EVERY DETAIL."],
        "accent": "#72dfff",
        "image": "logging",
        "chips": ["Entries & exits", "Commissions & lots", "Trading calendar"],
        "voice": "Log every position with precision. Capture your entries, exits, fees, and strategy tags, and track your daily consistency on the trading calendar."
    },
    {
        "id": "journal",
        "duration": 12,
        "label": "05 / DAILY JOURNAL & PSYCHOLOGY",
        "title": ["REPLAY. REFLECT.", "BUILD DISCIPLINE."],
        "accent": "#c5a2ff",
        "image": "journal",
        "chips": ["Chart screenshots", "Emotional mindset", "Rule break tracking"],
        "voice": "Master trader psychology with the daily journal. Attach chart screenshots, record your execution rating, and track mistakes to build unbreakable discipline."
    },
    {
        "id": "analytics",
        "duration": 12,
        "label": "06 / PERFORMANCE & EDGE",
        "title": ["DISCOVER", "YOUR EDGE."],
        "accent": "#b7ff5c",
        "image": "performance",
        "chips": ["Growth curves", "Strategy breakdown", "Drawdown recovery"],
        "voice": "Deep dive into performance analytics. Compare strategies, symbols, and session times to uncover your true statistical edge and eliminate losing habits."
    },
    {
        "id": "privacy",
        "duration": 10,
        "label": "07 / 100% LOCAL PC SECURITY",
        "title": ["YOUR DATA.", "100% PRIVATE."],
        "accent": "#72dfff",
        "image": "privacy",
        "chips": ["100% Offline PC storage", "Instant JSON backups", "Zero cloud leaks"],
        "voice": "Your financial data and trading records stay entirely on your local machine. Create encrypted JSON backups anytime with complete privacy and zero third-party cloud tracking."
    },
    {
        "id": "king",
        "duration": 10,
        "label": "08 / KING EDITION WORKSPACE",
        "title": ["OWN YOUR", "WORKSPACE."],
        "accent": "#ffd47a",
        "image": "king",
        "chips": ["Custom trader profile", "Monthly profit targets", "No recurring fees"],
        "voice": "Make the journal uniquely yours with KING Edition. Personalize themes, configure monthly targets, and enjoy lifetime ownership with no subscriptions."
    },
    {
        "id": "outro",
        "duration": 14,
        "label": "TRADERS JOURNAL",
        "title": ["YOUR TRADES.", "YOUR PROCESS.", "YOUR STORY."],
        "accent": "#b7ff5c",
        "voice": "Traders Journal. Master your trades, elevate your discipline, and own your journey. Created by Chethiya Rathnasekara."
    }
]

total_dur = sum(s['duration'] for s in SCENES)
story_data = {
    "title": "Traders Journal — Full Tutorial & MT5 Connection Guide",
    "creator": "Chethiya Rathnasekara",
    "width": 1920,
    "height": 1080,
    "fps": 30,
    "duration": total_dur,
    "bpm": 120,
    "scenes": SCENES
}

with open(ROOT / 'tools/promo/storyboard.json', 'w', encoding='utf-8') as f:
    json.dump(story_data, f, indent=2)
print(f"Updated storyboard.json with {len(SCENES)} scenes (total {total_dur}s)")

def generate_voice(text, out_wav):
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}?output_format=pcm_48000"
    payload = {
        "text": text,
        "model_id": MODEL_ID,
        "voice_settings": {
            "stability": 0.40,
            "similarity_boost": 0.82,
            "style": 0.25,
            "use_speaker_boost": True
        }
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode('utf-8'),
        headers={"xi-api-key": API_KEY, "Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        pcm = resp.read()
    
    with wave.open(str(out_wav), 'wb') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(48000)
        wf.writeframes(pcm)

for idx, sc in enumerate(SCENES, 1):
    sid = sc['id']
    target_wav = AUDIO_DIR / f"{sid}.wav"
    print(f"[{idx:02d}/{len(SCENES):02d}] Generating {sid} ({sc['duration']}s): \"{sc['voice'][:35]}...\"", end='', flush=True)
    try:
        generate_voice(sc['voice'], target_wav)
        print(" [OK]")
    except Exception as e:
        print(f" [FAIL] Error: {e}")
        sys.exit(1)

print("\nAll 12 ElevenLabs voice tracks generated successfully into media/promo-audio!")
