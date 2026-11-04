# 天気雨 · Sunshower

An 81-second anime short in the style of hand-drawn Japanese summer films. It's a bright afternoon over a flooded, overgrown Tokyo. A giant white police labor (a fan tribute to the AV-98 Ingram "Alphonse") stands waist-deep at the mouth of a drowned avenue with a kingfisher on its palm. A sunshower begins, and the robot lifts its other hand over the bird like an umbrella. Then the sun comes back out, a rainbow rises over the city, the beacons flash twice and the bird flies off.

No people appear. Every frame is drawn by code, and the score and sound effects are synthesized. No external images or recordings are used.

> **Status: work in progress.** The source renders individual shots, but the full film has not been rendered yet, so `index.html` and `sunshower.mp4` don't exist yet. Known open issues: buildings are missing from the opening wide shot's background plate, the koban is drawn under the water layer, and the rainbow is too faint. Run `./build.sh` once these are fixed.

## Files

- [`index.html`](index.html): the film in one self-contained page. The video is embedded as base64, so it plays offline. The page has its own player with play/pause, seek, fullscreen and sound controls. Keys: `Space`/`K` play/pause, `←`/`→` skip 5 s, `M` mute, `F` fullscreen.
- [`sunshower.mp4`](sunshower.mp4): the same film as a regular video (1920×1040, about 1.85:1, 24 fps, H.264 + AAC).

## Shots

| Time | Picture | Sound |
|---|---|---|
| 0–8 s | The camera tilts down from towering cumulus to the drowned avenue, which has ivy, sagging wires, kanji signboards, a koban roof and its red lamp. The robot stands at the mouth of the avenue. Title. | Cicadas, piano arpeggios, a glockenspiel hint of the motif |
| 8–13 s | Looking down through clear turquoise water at the street: 止まれ, zebra crossings, sunken cars and bicycles, caustics, fish, lily pads, petals | Flute takes the motif |
| 13–20 s | Close on the palm: the kingfisher preens, nibbling into its wing | |
| 20–25 s | The robot's face; a thin cloud slides over the sun | Music thins |
| 25–31 s | The sunshower begins: big sunlit drops, rings on the water | Rain on water, plucked "raindrops" |
| 31–35 s | A drop hits the bird's head; it squints, then looks up | A tiny tap and a glockenspiel note |
| 35–38 s | The robot looks up into glittering backlit rain with the sun behind its head | |
| 38–45 s | The right hand rises from the water in an arc, pouring water, and settles over the bird | Surge and pour; strings climb |
| 45–53 s | Under the hand: curtains of rain stream off the fingertips. The bird shakes itself dry and puffs into a ball. | Rain drumming on metal |
| 53–57 s | The robot's eyes close softly into a smile | |
| 57–63 s | The rain stops, the sun bursts out, and a rainbow sweeps over the city (reverse angle) | Full motif: strings, flute, glockenspiel |
| 63–67 s | The hand lifts away; the bird hops to the fingertip | Wingbeats |
| 67–70 s | The shoulder beacons flash red twice | Two siren chirps |
| 70–81 s | The bird flies off into the rainbow; the robot gives a small wave | Farewell phrase, final sparkle |

## How it's made

The drawings come from small 3D "model sheets" so the characters stay on-model from every angle. Everything is then rendered as 2D cel animation:

| File | Role |
|---|---|
| `src/core.js` | Maths, camera, convex hulls and the inked pressure line: tapered ends, heavier on the shadow side, a little hand wobble |
| `src/cel.js` | Turns convex solids (rounded blocks, cylinders, capsules) into inked cels. It adds hard-edged lavender cel shadows, a crisp highlight stripe on round forms, a sun rim light, crease lines, and decals: panel lines, bolts, scratches, moss and hand-lettered markings |
| `src/robot.js` | The robot: helmet, jutting face housing with the visor sunk in it, camera lenses and eye lights behind the glass, vent pad, ear discs, neck pistons, antenna blade ("AV98 INGRAM"), beacon bars with siren horns, ▶1, 特車2-1, 警視庁, ALPHÔNSE. Arms use two-bone IK, and the hands are built from rounded knuckles and capsule finger segments. |
| `src/bird.js` | The kingfisher as a signed-distance maquette. The head and body melt together, so there is no neck. It is ray-marched into flat colour regions with hard cel shadows and drawn feather details, then outlined with the same ink line. The eyes are drawn by hand: open, blink, squint, happy-closed. |
| `src/paint.js` | The background painter. It lays out a drowned district in 3D and paints it per camera in gouache: brush daubs, painted edge highlights, windows, balconies, laundry, AC units, tategaki signboards, ivy, trees, leaning poles with sagging wires, the koban and layered cumulus |
| `src/street.js` | The drowned street, painted top-down: crossings, 止まれ, sunken cars, bicycles, leaves |
| `src/water.js` | WebGL pass. It traces each pixel to the surface, refracts down to the street, adds caustic nets, absorbs light to turquoise, smears a painted reflection and adds separate sun glints. Rain rings feed the surface normals. |
| `src/fx.js` | A deterministic sunshower (drop events), drawn ring ripples and crown splashes, glints, god rays, the rainbow, lily pads and petals, fish, diffusion glow and grain |
| `src/shots.js` | Layouts, timing and acting (characters on twos, effects on threes), and per-frame compositing |
| `src/score.py` | Score and sound design (numpy): F major, 80 bpm, IV–V–iii–vi, one motif, plus cicadas, rain, drumming on the metal hand, siren chirps, wingbeats |
| `src/render.js` | Renders frames in parallel headless Chromium and encodes them with ffmpeg |
| `src/player.html`, `src/pack.py` | The player page and the script that packs the video into `index.html` |
| `src/preview.js` | Debug helper that renders stills at given times |

To rebuild everything (python3 + numpy, node + Playwright with Chromium, ffmpeg):

```sh
./build.sh            # WORKERS=4 by default
```

## Credits

- Hand-lettered markings: [Yusei Magic](https://fonts.google.com/specimen/Yusei+Magic). Title: [Zen Old Mincho](https://fonts.google.com/specimen/Zen+Old+Mincho). Both are under the SIL Open Font License 1.1 and are subset into `src/fonts/`.
- The robot is a non-commercial fan tribute to the AV-98 Ingram from *Mobile Police Patlabor* (HEADGEAR). No original artwork, footage or audio is used.
