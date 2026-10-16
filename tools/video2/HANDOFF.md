# Handoff: vertical "Connect MT5 in 1 click" video

Goal: a 9:16 (1080x1920, 30 fps) ~60 s video in the style of `C:\Users\LEGION\Downloads\6237835562397475906.mp4`
(warm-lit laptop on a desk, neon-lime kinetic text on a dark dot-grid screen, stamps, glow, caption on top,
real app UI on the laptop screen). Topic: one-click multi-account MT5 connection in Traders Journal.
Voice: ElevenLabs (user offered browser access; they must sign in themselves). Higgsfield was also offered
(connector not visible in the first session, check it in the new one).

## State
- `lines.json`: 12 narration sentences (speak/cap).
- `make_timeline.py`: builds `timeline.json` + `narration.wav`. `--per-line <dir>` (SAPI dev voice) or
  `--single <narration.wav>` (one ElevenLabs file, split at the longest pauses).
- `scenes2.html`: the whole film, deterministic `seek(t)`; uses real screenshots from `media/promo-assets/`.
- `render.js`: Electron offscreen renderer. `shots.sh "t1,t2,t3,t4" name` makes a 4-up still sheet.
  Video: `electron render.js --video out.mp4 FROM TO 30` (run 4 chunks in parallel, then concat + mux audio;
  see `tools/video/mux.sh` for the pattern). Needs `FFMPEG` env var
  (imageio-ffmpeg binary was installed under the previous session's scratchpad `pylib`).
- Placeholder timeline from the Windows voice (Zira) is in the scratchpad `v2/dev`.

## Known fixes still to do
1. Laptop is too small / low in frame; a dark band covers the bottom: reframe `#world` camera and the desk.
2. Review every beat with `shots.sh` (the app sequence and end card have not been checked yet).
3. Real voice from ElevenLabs, re-run `make_timeline.py --single`.
4. Audio: synth music + SFX (hits on slams/stamps, whooshes on cuts, clicks) mixed under the voice, -16 LUFS.
5. Render 4 chunks, concat, mux, review frames, save to `media/connect-mt5-vertical.mp4`.

## Facts to keep accurate (from the app UI)
Buttons: "Auto-Connect All MT5 Accounts", "Scan & Choose Accounts", "Sync Now", "Live Auto-Sync (Every 3s)",
dialog "MetaTrader 5 Accounts on this PC" with "Save & Sync Selected". UI text: "Zero manual EA or WebRequest needed".
Screens in `media/promo-assets` contain synthetic demo data only.
