#!/usr/bin/env bash
# Rebuilds everything: soundtrack -> frames + encode -> poster -> index.html
# Needs: python3 + numpy, node + playwright (with Chromium), ffmpeg, and
# `npm install` here for the LXGW WenKai font used in the captions.
# The voice lines in src/voice/ are pre-generated; see src/voice.py to redo them.
set -euo pipefail
cd "$(dirname "$0")"
[ -d node_modules/lxgw-wenkai-webfont ] || npm install --no-audit --no-fund
tmp=$(mktemp -d)
python3 src/score.py "$tmp/score.wav"
node src/render.js "$tmp/score.wav" cloud-home.mp4 24
ffmpeg -v error -y -ss 15.8 -i cloud-home.mp4 -frames:v 1 -vf scale=1280:-1 -q:v 4 "$tmp/poster.jpg"
python3 src/pack.py cloud-home.mp4 "$tmp/poster.jpg" index.html
rm -rf "$tmp"
