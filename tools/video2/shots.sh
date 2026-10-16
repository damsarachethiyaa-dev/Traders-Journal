#!/bin/bash
# usage: shots.sh name T1,T2,T3,T4  -> 4-up sheet in scratchpad
SP="C:/Users/LEGION/AppData/Local/Temp/claude/C--GPT-local/15032c33-6364-4942-ba7a-94ce87c2150e/scratchpad"
export FFMPEG="$SP/pylib/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe"
cd /c/GPT/local/tools/video2
rm -rf "$SP/s2"; /c/GPT/local/node_modules/electron/dist/electron.exe render.js --stills "$SP/s2" "$1" 2>&1 | grep -v "stills done"
files=$(ls "$SP/s2"/*.png | sort | tr '\n' ' ')
inputs=""; fc=""; n=0; for f in $files; do inputs="$inputs -i $f"; fc="$fc[$n:v]scale=360:-1[v$n];"; n=$((n+1)); done
stack=""; for i in $(seq 0 $((n-1))); do stack="$stack[v$i]"; done
"$FFMPEG" -y -loglevel error $inputs -filter_complex "${fc}${stack}hstack=inputs=$n" "$SP/$2.png"; echo "$SP/$2.png"
