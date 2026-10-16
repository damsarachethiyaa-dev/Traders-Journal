# Traders Journal whiteboard film

A 30-second, 1920 × 1080, 30 fps whiteboard-style walkthrough of Traders Journal: collaboration cursors, sticky-note reveals, hand-drawn circles/underlines/stars and connecting arrows that guide the viewer through the app's five screens and the MT5 → local sync → journal flow.

Built as editable HTML/SVG instead of After Effects (After Effects was not available on this PC). Output: `media/traders-journal-whiteboard.mp4`.

## Files

- `index.html`, `board.css` — the board, screens, sticky notes, cursors (all real DOM text and SVG).
- `board.js` — layout, sticky text, stroke shapes, cursor choreography and camera keyframes. `seek(t)` is deterministic.
- `render.cjs` — renders frames through Electron (offscreen) and pipes them into FFmpeg.
- Screens come from `media/promo-assets/*.png` (synthetic demonstration trades, not real account data).
- Music is the project's own synthesized score, `media/promo-audio/music.wav`.

## Edit

- Preview and scrub: serve the project root with any static server and open `/tools/whiteboard/index.html`.
- Copy and timing: `STICKIES`, `FRAMES` and the `write(...)` calls near the top of `board.js`.
- Annotations: `ellipseOn`, `stroke`, `arrowPaths` calls under "Choreography". Cursor paths are built from the strokes they draw, so moving a stroke moves its cursor.
- Camera moves: the `CAM` list (`[time, centerX, centerY, zoom]`).
- The handwritten look uses the Windows font **Ink Free** (falls back to Segoe Print).

## Rebuild

```
set FFMPEG=C:\path\to\ffmpeg.exe
node_modules\.bin\electron tools\whiteboard\render.cjs video media\whiteboard\silent.mp4 0 30 30
ffmpeg -i media\whiteboard\silent.mp4 -ss 12 -t 30 -i media\promo-audio\music.wav ^
  -filter_complex "[1:a]afade=t=in:d=0.6,afade=t=out:st=28.3:d=1.7,loudnorm=I=-16:TP=-1.5:LRA=9,aresample=48000[a]" ^
  -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -movflags +faststart -t 30 media\traders-journal-whiteboard.mp4
```

Test single frames with `render.cjs stills <outDir> 4,12,27`.
