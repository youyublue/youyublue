#!/usr/bin/env bash
# Rebuilds everything: soundtrack -> frames + encode -> poster -> index.html
# Needs: python3 + numpy, node + playwright (with Chromium), ffmpeg.
set -euo pipefail
cd "$(dirname "$0")"
tmp=$(mktemp -d)
python3 src/score.py "$tmp/score.wav"
node src/render.js "$tmp/score.wav" wind-hill.mp4 24
ffmpeg -v error -y -ss 12 -i wind-hill.mp4 -frames:v 1 -vf scale=1280:-1 -q:v 4 "$tmp/poster.jpg"
python3 src/pack.py wind-hill.mp4 "$tmp/poster.jpg" index.html
rm -rf "$tmp"
