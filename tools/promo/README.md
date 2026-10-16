# Traders Journal app film

The newer 30-second Katana promo is `media/traders-journal-katana.mp4`. It was rendered natively in Higgsfield with the custom composition in `tools/promo/katana-edit.js`, fresh demonstration screens in `media/katana-inputs`, and the existing original soundtrack. `media/katana-production.json` records confirmed remote media IDs, the final URL and verification: 1920 × 1080, 30 fps, 900 frames, stereo AAC, −14.1 LUFS and −1.8 dBFS true peak. It is a separate finished video; the desktop startup intro was not replaced.

Created for Chethiya Rathnasekara. The feature film is 120 seconds, 1920 × 1080, 30 fps, with an original 120 BPM electronic score, synthesized narration, stereo sound effects, subtitles, and 14 chapters. The native app uses a separate 10-second intro with a sound toggle and immediate skip.

## Outputs

- `media/traders-journal-promo.mp4`: full product film, H.264 / AAC, chapter metadata and an English subtitle track.
- `media/traders-journal-intro.mp4`: desktop startup identity sting, with music and no narration.
- `media/traders-journal-poster.jpg`: poster / reduced-motion fallback.
- `media/traders-journal-promo.srt` and `.vtt`: editable caption files.
- `media/promo-audio/`: separate music, effects, narration and mixed master WAVs.
- `media/promo-assets/`: actual app screenshots made with synthetic demonstration trades; no saved account data is used.
- `media/app-intro-preview.png`: native intro verification image.

## Rebuild the film

Use Node, the existing Electron dependency, Windows System.Speech, Python with numpy, and an FFmpeg build with libx264. Set `FFMPEG` to its executable path. Optionally set `TJ_VIDEO_PYTHON` to a Python executable with numpy. Run `npm run video`. Run `node tools/promo/build.cjs --render-only` to reuse captured screens and audio. The renderer runs two independent halves and joins them without dropping frames.

Edit `storyboard.json` for copy and timing (scene durations must total 120), `film.js` for motion and design, and `soundtrack.py` for music and effects. All music and effects are synthesized from scratch; no stock music or audio samples are used. Narration uses an installed Windows voice. The editable canvas preview is `tools/promo/promo.html`; serve the project root with any local development server and open that URL to play/seek the film with its audio.

## Desktop integration

`main.js` opens `app-intro.html` in its own sandboxed native window. The dashboard starts loading behind it. Enter/Escape, the Enter app button, video completion, an error, or a 12-second timeout releases the dashboard. Sound starts muted and can be enabled by the user. Reduced-motion mode displays the poster briefly. Tray reopen, `--hidden`, and `--skip-intro` bypass the intro. Help → Watch Traders Journal film opens the full local MP4 in the system video player. `index.html` is unchanged.

`npm run dist` includes the intro, poster, feature film and captions in both the installer and portable app. `npm run dist:video` builds into `dist/video-edition` so an already-running older app is not overwritten. The project and desktop shortcuts now target `dist/video-edition/win-unpacked/Traders Journal.exe`. Quit an already-running older app from its tray before opening the updated shortcut.

## Verification

`node --test tools/promo/intro.test.cjs` checks sender validation, dismissal, cleanup, failure recovery, and timeout recovery. Run `tools/promo/check-intro.cjs` with Electron for real local MP4 decoding, creator credit, sound toggle, and the sandboxed skip bridge. It optionally takes an absolute or relative app.asar path. `check-startup.cjs` verifies normal/hidden startup and film extraction with a disposable backend and profile; pass `--app-root=dist/video-edition/win-unpacked/resources/app.asar` for the packaged build and `--hidden` for background startup.

The existing local-sync regression suite currently fails a trade-count assertion because the backend falls back to an existing project database. See `VIDEO_PROJECT_SCAN.md` for the exact result. It was not changed as part of the video feature.

The source inventory in `media/promo-assets/source-inventory.json` lists first-party text files read in the scan. Installed dependencies and distribution binaries are inventoried as packaging inputs; their internals are outside the video-content scan. Saved databases, terminal credentials and user profiles are excluded from filming.
