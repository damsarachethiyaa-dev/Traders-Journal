#!/usr/bin/env python3
"""ElevenLabs Voiceover Generator & Importer for Traders Journal.

Allows fetching studio-grade realistic human voiceovers using ElevenLabs API,
or importing downloaded ElevenLabs audio files, and converting them to
48kHz 16-bit mono PCM WAV for the video soundtrack pipeline.
"""

import os
import sys
import json
import argparse
import urllib.request
import urllib.error
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
STORYBOARD = ROOT / 'tools' / 'promo' / 'storyboard.json'
AUDIO_DIR = ROOT / 'media' / 'promo-audio'

VOICE_PRESETS = {
    'adam': 'pNInz6obpgDQGcFmaJgB',     # Deep, professional, engaging
    'rachel': '21m00Tcm4TlvDq8ikWAM',   # Calm, confident, corporate
    'antoni': 'ErXwobaYiN019PkySvjV',   # Clear, upbeat, modern
    'george': 'JBFqnCBsd6RMkjVDRZzb',   # Articulate, authoritative
    'charlotte': 'XB0fDUnXU5powFXDhCwa' # Warm, friendly
}

def load_storyboard():
    if not STORYBOARD.exists():
        print(f"Error: Storyboard not found at {STORYBOARD}")
        sys.exit(1)
    with open(STORYBOARD, 'r', encoding='utf-8') as f:
        return json.load(f)

def get_ffmpeg():
    candidates = [
        os.getenv('FFMPEG'),
        str(Path.home() / 'Downloads/new/.tools/ffmpeg.exe'),
        r'C:\Program Files\SteelSeries\GG\apps\moments\ffmpeg.exe',
        'ffmpeg'
    ]
    for p in candidates:
        if p and (Path(p).exists() or p == 'ffmpeg'):
            return p
    return 'ffmpeg'

def convert_to_wav(src_path: Path, dst_path: Path):
    """Converts any audio file to 48kHz 16-bit mono PCM WAV using ffmpeg."""
    cmd = [
        get_ffmpeg(), '-hide_banner', '-loglevel', 'error', '-y',
        '-i', str(src_path),
        '-ar', '48000',
        '-ac', '1',
        '-c:a', 'pcm_s16le',
        str(dst_path)
    ]
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if res.returncode != 0:
        raise RuntimeError(f"FFmpeg conversion failed: {res.stderr.decode('utf-8', errors='ignore')}")

def fetch_elevenlabs_voice(text: str, voice_id: str, api_key: str, out_wav: Path, model_id='eleven_turbo_v2_5'):
    """Calls ElevenLabs Text-to-Speech API and writes 48kHz mono WAV."""
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
    headers = {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": api_key
    }
    payload = {
        "text": text,
        "model_id": model_id,
        "voice_settings": {
            "stability": 0.50,
            "similarity_boost": 0.80,
            "style": 0.15,
            "use_speaker_boost": True
        }
    }
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers=headers, method='POST')

    temp_mp3 = out_wav.with_suffix('.temp.mp3')
    try:
        with urllib.request.urlopen(req) as resp:
            with open(temp_mp3, 'wb') as f:
                f.write(resp.read())
        convert_to_wav(temp_mp3, out_wav)
    finally:
        if temp_mp3.exists():
            temp_mp3.unlink()

def print_script(story):
    print("=" * 80)
    print("TRADERS JOURNAL — ELEVENLABS VOICEOVER SCRIPT")
    print(f"Title:   {story.get('title')}")
    print(f"Creator: {story.get('creator')}")
    print(f"Duration:{story.get('duration')}s")
    print("=" * 80)
    print("\nTo generate in browser (https://elevenlabs.io/app/speech-synthesis/text-to-speech):")
    print("1. Select a high quality voice (e.g., 'Adam', 'Rachel', or 'Antoni').")
    print("2. Copy and paste each scene's text below.")
    print("3. Download the audio as MP3 or WAV.")
    print(f"4. Save or import each file into '{AUDIO_DIR}' as {{scene_id}}.wav\n")
    print("-" * 80)
    for i, sc in enumerate(story['scenes'], 1):
        print(f"Scene {i:02d} [{sc['id']}]:  Duration: {sc['duration']}s  |  Label: {sc['label']}")
        print(f"Save as: {sc['id']}.wav (or {sc['id']}.mp3)")
        print(f"Text:\n\"{sc['voice']}\"")
        print("-" * 80)

def main():
    parser = argparse.ArgumentParser(description="ElevenLabs Narration Tool for Traders Journal")
    parser.add_argument('--api-key', help="ElevenLabs API key (or ELEVENLABS_API_KEY env var)")
    parser.add_argument('--voice', default='adam', help="Preset name (adam, rachel, antoni, george) or raw Voice ID")
    parser.add_argument('--model', default='eleven_turbo_v2_5', help="ElevenLabs model ID")
    parser.add_argument('--import-dir', help="Directory containing downloaded ElevenLabs audio files to import")
    parser.add_argument('--script-only', action='store_true', help="Print the formatted script and instructions")
    args = parser.parse_args()

    story = load_storyboard()
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)

    if args.script_only:
        print_script(story)
        return

    api_key = args.api_key or os.getenv('ELEVENLABS_API_KEY')

    # Import mode from downloaded files
    if args.import_dir:
        import_path = Path(args.import_dir)
        if not import_path.exists():
            print(f"Error: Import directory {import_path} does not exist.")
            sys.exit(1)
        print(f"Scanning {import_path} for scene audio files...")
        imported_count = 0
        for sc in story['scenes']:
            sid = sc['id']
            # Search for sid.wav, sid.mp3, sid.m4a, etc.
            found = None
            for ext in ['.wav', '.mp3', '.m4a', '.ogg', '.aac']:
                candidate = import_path / f"{sid}{ext}"
                if candidate.exists():
                    found = candidate
                    break
            if found:
                out_file = AUDIO_DIR / f"{sid}.wav"
                convert_to_wav(found, out_file)
                print(f"✓ Converted & Imported: {found.name} -> {out_file.name}")
                imported_count += 1
            else:
                print(f"✗ Not found: {sid}.*")

        print(f"\nImported {imported_count}/{len(story['scenes'])} scenes.")
        if imported_count > 0:
            print("Running soundtrack synthesizer to rebuild master audio...")
            subprocess.run([sys.executable, str(ROOT / 'tools' / 'promo' / 'soundtrack.py')])
        return

    # API generation mode
    if api_key:
        voice_id = VOICE_PRESETS.get(args.voice.lower(), args.voice)
        print(f"Connecting to ElevenLabs API...")
        print(f"Voice ID: {voice_id} ({args.voice})")
        print(f"Model:    {args.model}")
        print(f"Generating {len(story['scenes'])} scenes...")

        for i, sc in enumerate(story['scenes'], 1):
            sid = sc['id']
            text = sc['voice']
            out_wav = AUDIO_DIR / f"{sid}.wav"
            print(f"[{i:02d}/{len(story['scenes']):02d}] Generating {sid} ({sc['duration']}s)...", end='', flush=True)
            try:
                fetch_elevenlabs_voice(text, voice_id, api_key, out_wav, model_id=args.model)
                print(" Done!")
            except Exception as e:
                print(f"\nError generating {sid}: {e}")
                sys.exit(1)

        print("\nAll ElevenLabs voice lines downloaded successfully!")
        print("Re-running soundtrack synthesis...")
        subprocess.run([sys.executable, str(ROOT / 'tools' / 'promo' / 'soundtrack.py')])
        print("\nReady! Run `npm run video` to produce the final MP4.")
        return

    # If neither import nor API key is passed:
    print("\n[!] No ElevenLabs API key or import folder specified.")
    print("You can:")
    print("  1. Set your API key:")
    print("     python tools/promo/elevenlabs_narrate.py --api-key YOUR_KEY --voice adam\n")
    print("  2. Download voice lines from https://elevenlabs.io/app/speech-synthesis/text-to-speech")
    print("     and import them:")
    print("     python tools/promo/elevenlabs_narrate.py --import-dir C:/Users/YourName/Downloads\n")
    print("Printing voiceover script now...\n")
    print_script(story)

if __name__ == '__main__':
    main()
