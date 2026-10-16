# Traders Journal — app video and desktop intro

Completed 16 October 2026 for **Chethiya Rathnasekara**.

## Project coverage

Inventoried first-party application source, configuration, utilities and assets. The scan covered the Electron shell and preload, dashboard, trade logging, daily journal, the four analytics tabs, KING settings, local Node service, Google Calendar integration, Python direct MT5 sync, the MQL5 Expert Advisor connector, bundled fonts, startup launchers, existing video tools and Windows build configuration. The capture-time text inventory contains 50 files with byte counts, line counts and SHA-256 hashes in `media/promo-assets/source-inventory.json`.

This is a project-content and integration scan for the film, not a new exhaustive security audit of dependencies, binaries or live broker integration. Existing `PROJECT_SCAN.md` is a separate earlier review and was not overwritten.

## Film delivered

`media/traders-journal-promo.mp4` is a complete **120-second, 1920 × 1080, 30 fps** product film with 3,600 frames, H.264 video, 48 kHz stereo AAC audio, English subtitles and chapter metadata.

The 14 scenes cover the opening identity, product overview, dashboard, trade logging, daily journal, performance, strategy edge, behavior, progress, trading-day routine, MT5 connectivity, local records/backups, KING Edition and creator credit. Motion includes kinetic typography, orbital graphics, floating screen frames, animated charts, moving candles, a perspective grid, particles, speed lines and diagonal shutter transitions. Audio includes an original synthesized electronic score, bass impacts, stereo risers, bright accents and Windows-voice narration. All music and effects were created procedurally; no stock music or samples were used.

Eleven real application screens were captured in a disposable Electron partition with 190 synthetic demonstration trades. The filming server does not open the production backend, real terminal connections, saved account database or saved browser profile. Demonstration screens are identified inside the film. The exact creator credit is **Created by Chethiya Rathnasekara**.

Separate editable assets include the storyboard, deterministic frame renderer, original WAV stems/master, subtitle files and a local canvas preview. See `tools/promo/README.md`.

## Native desktop integration

The desktop shell now starts with a separate **10-second native intro window**. It has an immediate Enter app button, Enter/Escape shortcuts, a sound toggle and a progress bar. Audio starts muted. The dashboard loads behind it and opens after skip or completion. Errors, stalled playback and a main-process timeout release the dashboard. Reduced-motion mode briefly shows a still poster. Tray reopen, Windows hidden startup and `--skip-intro` bypass the video.

The tray includes **Watch app film**; the application Help menu includes the full film too. Packaged apps copy the bundled film into their local cache before opening a system video player, which cannot read a virtual ASAR path directly.

`index.html` is unchanged, verified against its capture-time SHA-256 hash and the final packaged copy. New intro files are independent of the dashboard.

## Windows app delivered

Built a separate release under `dist/video-edition` to avoid overwriting the running older application:

- `win-unpacked/Traders Journal.exe`
- `Traders-Journal-Setup-1.0.0.exe`
- `Traders-Journal-Portable-1.0.0.exe`

The project shortcut, desktop shortcut, batch launchers and VBS launcher now target the new unpacked executable. An older already-running instance must be quit from its tray before reopening the updated shortcut; closing its window alone leaves it running. No installer was run.

## Verification

| Check | Result |
| --- | --- |
| App-screen capture | 11 captures, 190 synthetic trades, zero renderer errors |
| Complete MP4 decode | Passed; 3,600 frames and 120.00 seconds |
| Audio loudness | −16.0 LUFS integrated, −1.5 dBFS true peak, stereo |
| Film visual review | Opening, features and credit inspected; final encoded contact sheet checked |
| Intro unit checks | Five passed: sender validation/cleanup, close, renderer failure, load failure, timeout |
| Real native intro | 1080p local MP4 decoded; exact credit, sound toggle and skip passed |
| Packaged ASAR intro | Same decode, bridge, sound and skip checks passed |
| Packaged normal startup | Intro holds dashboard, skip opens/maximizes it; passed with isolated backend/profile |
| Packaged hidden startup | No intro, hidden until tray open; passed with isolated backend/profile |
| Packaged full-film action | Real-file extraction and tray action passed |
| Required packaged assets/source | Intro/video/poster/preload included; packaged application sources match workspace |
| Dashboard unchanged | Source hash and packaged `index.html` match the original |
| Installer + portable build | Both completed successfully |

The existing `npm run test:local` suite failed its unrelated trade-count assertion at `tools/local-sync.test.js:66` (`48 !== 1`). The current backend has a hard-coded fallback to the project's database even when the test supplies a temporary data directory, so that assertion is not isolated from existing records. This video work does not modify `server.js`, MT5 sync code or the existing test. Its failure is not counted as a passing check. New startup tests replace the backend with a disposable stub and use fresh profiles.

An actual broker session, execution of the Windows installer, and an interactive restart of the already-running older application were not performed. Native playback and launch behavior were verified against the built application archive in isolated Electron checks.
