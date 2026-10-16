#!/bin/bash
# usage: shots.sh name T1,T2,T3,T4  -> sheet png in scratchpad
SP="C:/Users/LEGION/AppData/Local/Temp/claude/C--GPT-local/15032c33-6364-4942-ba7a-94ce87c2150e/scratchpad"
export FFMPEG="$SP/pylib/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe"
cd /c/GPT/local/tools/video
rm -rf "$SP/stills"; /c/GPT/local/node_modules/electron/dist/electron.exe render.js --stills "$SP/stills" "$2" 2>&1 | grep -iv "stills done" 
files=$(ls "$SP/stills"/*.png | sort)
./sheet.sh "$SP/$1.png" $files; echo "$SP/$1.png"
