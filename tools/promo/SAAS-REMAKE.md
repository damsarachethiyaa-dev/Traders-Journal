# Traders Journal SaaS animation remake

The new desktop intro is `media/traders-journal-intro.mp4`, also delivered separately as `media/traders-journal-saas-720p.mp4`. It uses Higgsfield's native Higgsedit renderer without Adobe After Effects. The app's native window still requests 1280×720 and fits the desktop work area when necessary.

## Export and design

- 1280×720, 60 fps, 24 seconds, 1,440 video frames.
- H.264, BT.709, stereo AAC 48 kHz; music fades out during the final 1.3 seconds.
- Measured audio: −14.1 LUFS integrated, −1.8 dBFS true peak.
- App palette: charcoal #09090b, blue #3b82f6, KING gold #e8be6b, green #19d38a, purple #8b5cf6.
- App fonts: Space Grotesk, Inter and JetBrains Mono, bundled into the editable project.
- Existing original project music and synthetic demonstration app captures. No saved account database was used as a filming asset.
- Creator credit: Chethiya Rathnasekara.

## Editable deliverables

`tools/promo/saas-edit.js` is the authoring source. `media/traders-journal-saas-editable.zip` contains the self-contained native project, source, fonts, screenshots, soundtrack, README and export probe. Its extracted copy is in `media/saas-editable/`.

The project has 84 editable text layers and 138 animation tracks. Titles, graphic interface overlays, screen frames, logo paths and choreography remain editable native layers. The captured application screens are raster assets; their internal text and controls are edited in the app source or replaced with fresh captures. This is a native Higgsedit project, not an After Effects project.

Rebuild with a matching Higgsedit runtime, setting `TJ_SAAS_ROOT` to the extracted folder. The README in the archive contains commands. Build only the supplied project: a whole-script build replaces its own timeline.

## Sequence

| Seconds | Content |
| --- | --- |
| 0–3 | Layered screen cards, notebook logo and animated journal headline |
| 3–7 | Entire dashboard plus its calendar/history section |
| 7–10 | Trade logging |
| 10–13 | Daily journal and review |
| 13–18 | Performance, edge, behavior and progress analytics |
| 18–20 | MetaTrader 5 connections |
| 20–21.5 | Preferences and privacy |
| 21.5–24 | KING Edition, final logo reveal and creator credit |

## App integration and checks

The native intro shell matches the new palette and leaves the video content area visible. Sound remains off until enabled; Enter, Escape and Enter app skip immediately. The film ends automatically, with independent renderer/main-process fallbacks at 27 seconds. Reduced motion keeps the static poster and a short exit timer. No main dashboard markup was changed for this remake.

Verified: sender-checked IPC and failure/timeout cleanup (5 unit checks); real Electron video decode, size, duration, creator, shell layout, sound and skip; isolated normal/hidden startup; those checks against packaged ASAR; all 16 editable-project assets available by project-relative paths; actual rebuilt desktop intro displayed and Sound on toggle exercised through Windows Computer Use.

Both `dist/win-unpacked` and `dist/video-edition/win-unpacked` contain the same rebuilt app, so existing shortcuts and launchers use the new intro. The installer and portable exports were also refreshed. Previous intro media and shell source are retained in `media/intro-before-saas/`.
