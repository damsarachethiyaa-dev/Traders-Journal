#!/bin/bash
# FFMPEG=<exe> mux.sh <chunks_dir> <mix.wav> <out.mp4>
set -e
CH="$1"; MIX="$2"; OUT="$3"; : > "$CH/list.txt"
for f in c0 c1 c2 c3; do echo "file '$CH/$f.mp4'" >> "$CH/list.txt"; done
"$FFMPEG" -y -loglevel error -f concat -safe 0 -i "$CH/list.txt" -i "$MIX" -map 0:v -map 1:a -c:v copy \
  -af "loudnorm=I=-14:TP=-1.5:LRA=9,aresample=48000" -c:a aac -b:a 192k -movflags +faststart -shortest "$OUT"
ls -la "$OUT"
