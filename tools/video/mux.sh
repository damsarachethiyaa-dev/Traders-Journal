#!/bin/bash
# Concatenate rendered chunks, add the narration track, write media/connect-mt5.mp4
# usage: FFMPEG=<ffmpeg.exe> tools/video/mux.sh <chunks_dir> <narration.wav> <out.mp4>
set -e
CH="$1"; WAV="$2"; OUT="$3"
LIST="$CH/list.txt"
: > "$LIST"
for f in c0 c1 c2 c3; do echo "file '$CH/$f.mp4'" >> "$LIST"; done
"$FFMPEG" -y -loglevel error -f concat -safe 0 -i "$LIST" -i "$WAV" \
  -map 0:v -map 1:a -c:v copy \
  -af "highpass=f=70,acompressor=threshold=-20dB:ratio=3:attack=5:release=120,loudnorm=I=-16:TP=-1.5:LRA=9,aresample=48000" \
  -c:a aac -b:a 160k -movflags +faststart -shortest "$OUT"
ls -la "$OUT"
