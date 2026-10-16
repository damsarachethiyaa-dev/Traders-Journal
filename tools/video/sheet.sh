#!/bin/bash
# usage: sheet.sh out.png in1 in2 [in3 in4]
FF="$FFMPEG"; out="$1"; shift
n=$#; inputs=(); for f in "$@"; do inputs+=(-i "$f"); done
if [ $n -eq 1 ]; then "$FF" -y "${inputs[@]}" -vf scale=1600:-1 "$out" -loglevel error; exit; fi
fc=""; for i in $(seq 0 $((n-1))); do fc+="[$i:v]scale=960:540[v$i];"; done
if [ $n -eq 2 ]; then fc+="[v0][v1]vstack[o]"; elif [ $n -eq 3 ]; then fc+="[v0][v1]hstack[a];[v2]pad=1920:540[b];[a][b]vstack[o]"; else fc+="[v0][v1]hstack[a];[v2][v3]hstack[b];[a][b]vstack[o]"; fi
"$FF" -y "${inputs[@]}" -filter_complex "$fc" -map "[o]" "$out" -loglevel error
