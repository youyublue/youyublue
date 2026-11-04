// shots.js — the film: timing, layouts (cameras), the acting, and compositing.
'use strict';
const C0 = document.getElementById('c'), G0 = C0.getContext('2d');
const DUR = 81; window.DUR = DUR;
const TW = t => Math.floor(t * 12 + 1e-6) / 12;   // characters on twos
const TH = t => Math.floor(t * 8 + 1e-6) / 8;     // effects on threes

// ---------- tracks ----------
function lerpAny(a, b, u) { return Array.isArray(a) ? a.map((v, i) => lerp(v, b[i], u)) : lerp(a, b, u); }
function track(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) { const a = keys[i], b = keys[i + 1]; if (t <= b[0]) return lerpAny(a[1], b[1], (b[2] || ease)((t - a[0]) / (b[0] - a[0]))); }
  return keys[keys.length - 1][1];
}
// one continuous arc through key positions, with a single slow-in/slow-out
function arc(pts, u) {
  const n = pts.length - 1, s = clamp(u, 0, 1) * n, i = Math.min(n - 1, Math.floor(s)), f = s - i;
  const P = k => pts[clamp(k, 0, n)];
  const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2), f2 = f * f, f3 = f2 * f;
  return [0, 1, 2].map(k => .5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * f + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * f2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * f3));
}
const blinkAt = (t, t0, d) => { const u = (t - t0) / (d || .25); return u < 0 || u > 1 ? 1 : Math.abs(1 - 2 * u) < .35 ? .05 : Math.abs(1 - 2 * u); };

// ---------- the robot's acting ----------
const R_REST = { wrist: [-1.32, -.2, .3], fdir: [.05, -1, .15], dors: [-1, 0, 0] };
const R_UMB = { wrist: [-.4, 1.72, 1.2], fdir: [1, -.28, .3], dors: [.12, 1, .05] };
const R_LIFT = [[-1.32, -.2, .3], [-1.3, -.36, .36], [-1.24, .35, .55], [-1.05, 1.22, .88], [-.7, 1.75, 1.12], [-.4, 1.82, 1.2], [-.4, 1.72, 1.2]];
function robotPose(t) {
  const P = defaultPose();
  P.head.pitch = track([[0, -.42], [21.3, -.42], [22.4, -.37], [34.95, -.37], [35.2, -.44], [36.35, .4, cushion], [36.8, .34], [41.3, .34], [43.2, -.28], [52.8, -.3], [53.4, -.38], [56.6, -.38], [58.2, .08], [62.8, .08], [63.8, -.22], [66.6, -.18], [67.3, .12], [70.4, .1], [72, .3], [81, .38]], t);
  P.head.roll = track([[0, 0], [21.4, 0], [22.6, .075], [24.6, .075], [25.6, 0], [53.2, 0], [54, .1], [55.8, .1], [56.8, 0], [71, 0], [72.5, -.06], [81, -.06]], t);
  P.head.yaw = track([[0, .04], [35, .04], [36.4, -.04], [41.3, -.04], [42.6, -.12], [43.4, .02], [70.5, .02], [72.5, -.18], [81, -.22]], t);
  P.eyes.open = Math.min(blinkAt(t, 23.55, .3), blinkAt(t, 33.3, .28), blinkAt(t, 44.2, .3), blinkAt(t, 60.2, .28), blinkAt(t, 66.3, .28), blinkAt(t, 74.3, .3));
  // the smile: eyes close softly into arcs
  const sm = env(t, 53.55, 54.0, 55.2, 55.75);
  if (sm > 0) { P.eyes.open = 1 - sm; P.eyes.smile = sm; }
  P.eyes.glow = 1 + .25 * sm;
  P.eyes.ly = track([[0, .5], [35, .5], [36.3, -.6], [41.5, -.6], [43, .4], [57.5, .4], [58.4, -.2], [63, -.2], [63.8, .4], [67, .2], [72, -.5], [81, -.5]], t);
  P.eyes.lx = track([[0, .3], [42, .3], [42.8, .0], [43.4, .3], [70.5, .3], [72.5, -.3], [81, -.4]], t);
  // right arm
  let R = Object.assign({}, R_REST, { pole: [-1, .1, -.5], curl: P.R.curl });
  if (t > 38.2 && t < 63) {
    const u = clamp((t - 38.2) / 5.6, 0, 1);
    const uu = u < .14 ? .14 * ease(u / .14) * .55 : lerp(.077, 1, cushion((u - .14) / .86));
    R.wrist = arc(R_LIFT, uu);
    // the hand trails, then leads: orientation follows a little late
    const v = clamp((t - 38.45) / 5.6, 0, 1), hv = cushion(v);
    R.fdir = V.norm(lerpAny(R_REST.fdir, R_UMB.fdir, sstep(.25, .95, hv)));
    R.dors = V.norm(lerpAny([-1, .1, 0], R_UMB.dors, sstep(.3, .9, hv)));
    R.pole = V.norm(lerpAny([-1, .1, -.5], [-.6, -1, -.2], sstep(.2, .8, hv)));
    R.curl = { base: lerpAny([.35, .4, .45, .5], [.32, .3, .3, .34], hv), mid: lerpAny([.4, .45, .5, .55], [.28, .3, .32, .36], hv), tip: lerpAny([.3, .3, .35, .35], [.2, .22, .24, .28], hv), thumb: .3, spread: 1 + .3 * hv };
    // weight settling over the bird
    const st = Math.sin(clamp((t - 43.6) / .9, 0, 1) * Math.PI) * .03;
    R.wrist = V.add(R.wrist, [0, -st, 0]);
  }
  if (t >= 63) { // the hand lifts away, then rests; then a small wave
    const u = cushion((t - 63) / 2.4);
    const away = arc([R_UMB.wrist, [-.55, 2.25, 1.05], [-1.0, 2.0, .72], [-1.35, .9, .45]], u);
    R.wrist = away; R.fdir = V.norm(lerpAny(R_UMB.fdir, [.1, -1, .25], u)); R.dors = V.norm(lerpAny(R_UMB.dors, [-1, 0, .1], u)); R.pole = V.norm(lerpAny([-.6, -1, -.2], [-1, -.3, -.4], u));
    if (t > 71.2) {
      const w = cushion((t - 71.2) / 1.3), back = ease((t - 76.6) / 1.6);
      const raise = w * (1 - back);
      R.wrist = V.lerp(away, [-1.2, 2.75, .65], raise);
      const wv = Math.sin(clamp((t - 72.4) / 3.6, 0, 1) * Math.PI * 4) * .55 * env(t, 72.2, 72.6, 75.6, 76.2);
      R.fdir = V.norm(lerpAny(R.fdir, [Math.sin(wv) * .6, 1, .12], raise));
      R.dors = V.norm(lerpAny(R.dors, [Math.cos(wv) * .15 - .1, 0, -1], raise));
      R.pole = V.norm(lerpAny(R.pole, [-1, -.6, -.2], raise));
      R.curl = { base: [.12, .1, .1, .14], mid: [.1, .1, .12, .14], tip: [.08, .08, .1, .1], thumb: .2, spread: 1.3 };
    }
  }
  P.R = R;
  // left hand: steady; a tiny dip when the bird hops and when it takes off
  const dip = .025 * (Math.exp(-Math.pow((t - 65.45) / .12, 2)) + Math.exp(-Math.pow((t - 71.1) / .1, 2)) * 1.4);
  P.L.wrist = V.add(P.L.wrist, [0, -dip, 0]);
  // beacons: two flashes
  const fl = (a) => clamp(1 - Math.abs(t - a) / .22, 0, 1);
  const b = Math.max(fl(67.75), fl(68.55));
  P.beacon = [b, b];
  return P;
}

// ---------- the kingfisher's acting ----------
function birdAct(t) {
  const b = defaultBird();
  // preening: turns back into the wing, nibbles, comes back, looks around
  b.hy = track([[0, .25], [13.5, .25], [14.0, 2.25], [15.4, 2.3], [15.8, .2], [17.4, .2], [17.8, -.5], [19.2, -.5], [19.5, .25], [30, .25], [31.6, .25], [32.6, .1], [45, .1], [46, -.15], [53, -.15], [63.4, .2], [64.2, -.3], [64.7, .1], [66.2, .1], [66.6, -.45], [67.4, .3], [70.4, .2]], t);
  b.hp = track([[0, .05], [13.5, .05], [14.0, .45], [15.4, .5], [15.8, .02], [30, .02], [31.6, .02], [31.75, .35], [32.4, .3], [32.8, -.62, cushion], [34.5, -.6], [45, -.5], [46.4, -.4], [53, -.25], [63.4, -.6], [64.4, -.1], [70.4, -.2], [70.8, .25], [71, -.4]], t);
  if (t > 14.1 && t < 15.4) b.hp += .14 * (Math.floor(t * 6) % 2 ? 1 : -1); // nibbles, on twos
  if (t > 16.2 && t < 16.8) { b.hr = .3 * Math.sin((t - 16.2) * 30); b.puff = .35 * env(t, 16.2, 16.3, 16.6, 16.8); } // a quick ruffle
  b.eye = 'open'; b.eyeAmt = 1;
  const bl = Math.min(blinkAt(t, 19.0, .2), blinkAt(t, 24.2, .2), blinkAt(t, 33.6, .2), blinkAt(t, 45.6, .2), blinkAt(t, 65.9, .2), blinkAt(t, 69.6, .2));
  if (bl < 1) { b.eye = 'blink'; b.eyeAmt = bl; }
  if (t > 14.1 && t < 15.3) { b.eye = 'happy'; }
  // the drop: a squint and a duck
  if (t > 31.62 && t < 32.45) { b.eye = 'squint'; b.crouch = .28 * env(t, 31.62, 31.7, 32.2, 32.45); b.hr = .1 * Math.sin((t - 31.62) * 40) * Math.exp(-(t - 31.62) * 4); }
  // shake dry under the hand, puff into a ball
  if (t > 46.6 && t < 47.6) { const s = env(t, 46.6, 46.7, 47.4, 47.6); b.shake = (Math.floor(t * 12) % 2 ? 1 : -1) * .34 * s; b.wing = .18 * s; b.eye = 'squint'; }
  b.puff = Math.max(b.puff, track([[0, 0], [48.1, 0], [49.1, 1, cushion], [62.9, 1], [63.6, 0]], t));
  if (t > 48.9 && t < 51.9) b.eye = 'happy';
  if (t > 67.6 && t < 67.95 || t > 68.4 && t < 68.75) b.eye = 'squint';
  // the hop to the fingertip
  b.wing = Math.max(b.wing, .5 * env(t, 64.75, 64.9, 65.25, 65.45));
  b.crouch = Math.max(b.crouch, .35 * env(t, 64.5, 64.7, 64.72, 64.8), .3 * env(t, 65.4, 65.48, 65.5, 65.7), .45 * env(t, 70.7, 70.95, 71.0, 71.05));
  if (t > 71.05) { b.flying = true; b.wing = 1; b.wingFlap = Math.floor(t * 12) % 2 ? 1 : -.6; b.hp = -.2; b.eye = 'open'; b.puff = 0; b.crouch = 0; }
  b.shade = t > 43.7 && t < 63.2 ? 1 : 0;
  return b;
}
// where the bird is (world matrix)
function birdPlace(t, A) {
  const base = M.ap(A.handL, [0, -.13, .56]);
  const tipL = A.tipsL[1] ? V.add(A.tipsL[1], [0, .05, 0]) : M.ap(A.handL, [0, -.17, .9]);
  let p = base, yaw = -1.25;
  const hu = clamp((t - 64.78) / .62, 0, 1);
  if (hu > 0) { const u = ease(hu); p = V.lerp(base, tipL, u); p[1] += Math.sin(u * Math.PI) * .14; yaw = lerp(-1.25, -1.6, u); }
  if (t > 71.05) { // flight toward the rainbow: rises and banks away
    const u = (t - 71.05);
    const path = [tipL, V.add(tipL, [1.0, .7, .6]), V.add(tipL, [2.8, 2.3, 2.2]), V.add(tipL, [5.5, 5.5, 8]), V.add(tipL, [8.5, 10.5, 20]), V.add(tipL, [11, 16.5, 38])];
    p = arc(path, clamp(u / 6.2, 0, 1) * .999);
    yaw = .7 - .45 * clamp(u / 4, 0, 1);
  }
  return M.chain(M.tr(p[0], p[1], p[2]), M.rot('y', yaw));
}

// ---------- light, weather ----------
function weather(t) {
  const veil = sstep(21.2, 25.2, t) * (1 - sstep(56.4, 57.4, t));
  const burst = env(t, 56.6, 57.0, 57.6, 59.6);
  const rain = rainDens(t) / 1.05;
  return { veil, burst, rain, sunK: (1 - .45 * veil) + burst * .5 };
}
function setLight(kind, wx) {
  LIGHT.key = V.norm([-.45, .6, .66]); LIGHT.sun = SUN; LIGHT.rimK = 1; LIGHT.rimA = .95; LIGHT.rim = '#fffbe8'; LIGHT.keyK = 1; LIGHT.dim = 0;
  if (kind === 'reverse') { LIGHT.key = V.norm([-.3, .55, -.78]); LIGHT.sun = V.norm([.2, .4, .9]); LIGHT.rimK = .5; LIGHT.rim = '#e6f6ff'; }
  if (kind === 'left') { LIGHT.key = V.norm([.5, .55, .66]); }
  if (wx) { LIGHT.rimA = .95 * (1 - .35 * wx.veil) + .05 * wx.burst; }
}

// ---------- cameras (layouts) ----------
const CAM = {
  A: { pos: [-5, 2.2, 22], tgt: [1.0, 3.9, 0], f: 1500, my: 620, mx: 80 },
  B: { pos: [-3.6, 1.15, 12.5], tgt: [.2, 2.75, 0], f: 1450, mx: 60, my: 40 },
  C: { pos: [-3.5, 1.45, 7.0], tgt: [-.3, 1.5, .5], f: 1450, mx: 60, my: 60 },
  C2: { pos: [3.7, 2.5, 4.6], tgt: [.6, 2.45, .2], f: 1650, mx: 40, my: 40, light: 'left' },
  D: { pos: [-1.65, 1.75, 4.6], tgt: [0, 2.5, .25], f: 2050, mx: 40, my: 40 },
  D2: { pos: [1.5, 1.35, 4.6], tgt: [.05, 2.85, .1], f: 1750, mx: 40, my: 40, light: 'left' },
  D3: { pos: [-.95, 2.75, 4.3], tgt: [.0, 2.55, .2], f: 2300, mx: 40, my: 40 },
  E: { pos: [-.95, 1.95, 2.75], tgt: [.02, 1.2, 1.2], f: 2600, mx: 30, my: 30 },
  E2: { pos: [-1.0, 1.42, 2.85], tgt: [.04, 1.5, 1.18], f: 2350, mx: 30, my: 30 },
  F: { pos: [-.62, 1.47, 2.25], tgt: [-.08, 1.3, 1.2], f: 3100, mx: 30, my: 30 },
  G: { pos: [-6.5, 4.6, 26], tgt: [-4.5, -3.8, 15], f: 1250, mx: 160, my: 40 },
  R: { pos: [-2.6, 1.6, -9.5], tgt: [1.6, 9.5, 40], f: 800, mx: 60, my: 160, light: 'reverse' },
};
function camFor(k, o) { // o: {px, py (pan in px), z (zoom)}
  const c = CAM[k]; o = o || {};
  const z = o.z || 1;
  return makeCam(c.pos, c.tgt, c.f * z, { sx: (o.px || 0) * z, sy: (o.py || 0) * z });
}
const PLATES = {};
function plateFor(k) {
  if (PLATES[k]) return PLATES[k];
  const c = CAM[k];
  const cam0 = makeCam(c.pos, c.tgt, c.f, { sx: c.mx, sy: c.my });
  const pw = W + 2 * c.mx, ph = H + 2 * c.my;
  const pl = paintPlates(cam0, { width: pw, height: ph, seed: k.charCodeAt(0) });
  const mc = mirrored(cam0);
  const rf = paintPlates(mc, { width: pw, height: ph, mirrorOf: pl, noKoban: false });
  return PLATES[k] = { pl, rf, cam0, c };
}
// draw a plate canvas into the frame for the frame camera
function blitPlate(g, P, cv, cam, blur) {
  const k = cam.f / P.cam0.f;
  g.save();
  if (blur) g.filter = `blur(${blur}px)`;
  g.translate(cam.cx, cam.cy); g.scale(k, k); g.translate(-P.cam0.cx, -P.cam0.cy);
  g.drawImage(cv, 0, 0);
  g.restore();
}

// ---------- the world, composited for one frame ----------
function drawWorld(g, t, key, view, o) {
  o = o || {};
  const tc = TW(t), tq = TH(t), wx = weather(t);
  const P = plateFor(key);
  const cam = camFor(key, view);
  setLight(CAM[key].light, wx);
  const pose = robotPose(tc);
  if (o.pose) o.pose(pose, tc);
  const Rb = buildRobot(pose);
  const umb = t > 43.7 && t < 63.2;
  for (const p of Rb.parts) if (p.side === 'L' && umb && o.handShade !== false) p.inShade = true;
  const bA = birdAct(tc), bM = birdPlace(tc, Rb.A);
  const lw = o.lw || 2.4;
  const blur = o.blur || 0;

  // sky plate, veil, rainbow, city plate
  blitPlate(g, P, P.pl.sky, cam, blur * .6);
  const sun = cam.proj(V.add(cam.pos, V.mul(SUN, 5000)));
  if (sun[2] > 0 && wx.veil > 0) { // a thin cloud slides over the sun
    const vx = sun[0] + lerp(500, -60, sstep(21.2, 25.2, t)) + (t - 25) * 4, vy = sun[1];
    g.save(); g.globalAlpha = .82 * wx.veil;
    for (let i = 0; i < 7; i++) { const R = rng(i + 4); radial(g, vx + (R() - .5) * 600, vy + (R() - .5) * 160, 260 + R() * 220, '#eef2fb', .9); }
    paintWisps(g, rng(9), vx - 700, vy - 160, vx + 500, vy + 140, 26, '#f6f8ff', .5);
    g.restore();
  }
  if (o.rainbow) drawRainbow(g, cam, o.rainbow.k, o.rainbow.rise);
  let cityDrawn = false;

  // reflection texture: mirrored plates + mirrored robot
  const hy = cam.horizon();
  if (hy < H + 50 && !o.noWater) {
    const rf = scratch('refl'); const mc = mirrored(cam);
    blitPlate(rf.g, P, P.rf.sky, cam, 0);
    if (o.rainbow) { rf.g.save(); rf.g.translate(0, 2 * hy); rf.g.scale(1, -1); drawRainbow(rf.g, cam, o.rainbow.k * .7, o.rainbow.rise); rf.g.restore(); }
    blitPlate(rf.g, P, P.rf.city, cam, 0);
    drawParts(rf.g, mc, Rb.parts, { lw: lw * .8, clamp: 'above', noDecals: true });
    const sub = scratch('sub');
    drawFish(sub.g, cam, t);
    drawParts(sub.g, cam, Rb.parts, { lw: lw * .8, clamp: 'below', noRim: true });
    const ripples = drawRippleList(cam, tq);
    const wcv = GLW.render({ cam, refl: rf, sub, t: tq, tq, rain: wx.rain, ripples, glit: o.glit === undefined ? 1 : o.glit, sunK: wx.sunK * (o.sunK || 1), caus: .55 * (1 - .4 * wx.veil) + .3 * wx.burst, dim: 0 });
    g.save(); if (blur) g.filter = `blur(${blur * .7}px)`; g.drawImage(wcv, 0, 0); g.restore();
    // everything standing on the water is in front of the surface
    blitPlate(g, P, P.pl.city, cam, blur); cityDrawn = true;
    // on the surface
    drawFloaters(g, cam, t);
    if (wx.rain > 0) drawRipples(g, cam, t, { alpha: o.ripA || 1 });
    if (o.glints !== false && sun[2] > 0) drawGlints(g, cam, t, { k: clamp(wx.sunK, 0, 1.4) * (o.glintK || 1), n: o.glintN });
    waterline(g, cam, Rb, t, lw);
  }
  if (!cityDrawn) blitPlate(g, P, P.pl.city, cam, blur);
  // far rain (behind the robot), the robot, the bird, near rain
  const rd = V.len(V.sub([0, 2, 0], cam.pos));
  if (wx.rain > 0) drawRain(g, cam, t, { minD: rd, sunK: wx.sunK, alpha: .8, maxD: o.rainMax || 45, far: true, landY: o.landY });
  if (o.birdBehind && !o.noBird) drawBird(g, cam, bM, bA, { lw: o.birdLw || lw * .95 });
  const info = drawParts(g, cam, Rb.parts, { lw, clamp: hy < H + 50 ? 'above' : null });
  if (o.after) o.after(g, cam, Rb, info);
  if (!o.noBird && !o.birdBehind) {
    if (!bA.flying) contactShadow(g, cam, bM, info, bA);
    drawBird(g, cam, bM, bA, { lw: o.birdLw || lw * .95 });
  }
  if (o.afterBird) o.afterBird(g, cam, Rb, info, bM, bA);
  if (wx.rain > 0) drawRain(g, cam, t, { maxD: Math.min(rd, o.rainMax || 45), sunK: wx.sunK, landY: o.landY });
  if (o.shafts) drawShafts(g, cam, t, o.shafts);
  if (pose.beacon[0] > 0) beaconGlow(g, cam, info, pose.beacon[0], hy);
  return { cam, Rb, info, sun, wx, bM, bA };
}
function drawRippleList(cam, tq) {
  const ev = dropsBetween(tq - 1.2, tq + .001), out = [];
  for (const e of ev) { const c = [e[1], 0, e[2]]; if (!cam.front(c, 1)) continue; const s = cam.proj(c); if (s[0] < -100 || s[0] > W + 100 || s[1] > H + 100) continue; out.push([e[1], e[2], tq - e[0], e[3]]); }
  return out.slice(-48);
}
// a little ring of disturbed water where the robot meets the surface
function waterline(g, cam, Rb, t, lw) {
  const tq = TH(t);
  const ring = (cx, cz, rx, rz, a) => {
    const pts = []; for (let i = 0; i < 40; i++) { const an = i / 40 * TAU; const p = [cx + Math.cos(an) * rx, .01, cz + Math.sin(an) * rz]; if (!cam.front(p, .5)) return; const s = cam.proj(p); pts.push([s[0], s[1]]); }
    g.globalAlpha = a; ink(g, pts, true, lw * .7, { color: '#f4feff', taper: 0, wob: 1.2, seed: (tq * 8) | 0 }); g.globalAlpha = 1;
  };
  const ph = (tq * .9) % 1;
  ring(0, 0, .85 + ph * .5, .62 + ph * .4, .7 * (1 - ph));
  ring(0, 0, .85 + ((ph + .5) % 1) * .5, .62 + ((ph + .5) % 1) * .4, .7 * (1 - (ph + .5) % 1));
  ring(0, 0, .78, .56, .9);
}
function contactShadow(g, cam, bM, info, b) {
  const c = cam.proj(M.ap(bM, [0, 0, -.01])), s = cam.scaleAt(M.ap(bM, [0, 0, 0]));
  g.save();
  g.beginPath(); for (const k in info) if (k[0] === 'L' && (k.includes('palm') || k.includes('f'))) pathPoly(g, info[k].hull); g.clip();
  g.fillStyle = 'rgba(16,16,40,.45)'; g.beginPath(); g.ellipse(c[0] + s * .01, c[1] + s * .004, s * .08, s * .03, 0, 0, TAU); g.fill();
  g.restore();
}
function beaconGlow(g, cam, info, k, hy) {
  g.save(); g.globalCompositeOperation = 'lighter';
  for (const n of ['beaconL', 'beaconR']) {
    const it = info[n]; if (!it) continue;
    const c = centroid(it.hull), r = Math.sqrt(Math.abs(polyArea(it.hull)));
    radial(g, c[0], c[1], r * 5 * k, '#ff3020', .55 * k); radial(g, c[0], c[1], r * 1.6, '#ffd0c0', .7 * k);
    // the sweep: a fan of red light across the wet air and water
    const gr = g.createLinearGradient(c[0], c[1], c[0] + 900, Math.max(hy, c[1]) + 300);
    gr.addColorStop(0, `rgba(255,60,40,${.35 * k})`); gr.addColorStop(1, 'rgba(255,60,40,0)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(c[0], c[1]); g.lineTo(c[0] + 1400, c[1] + 300); g.lineTo(c[0] + 900, c[1] + 1100); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(c[0], c[1]); g.lineTo(c[0] - 1500, c[1] + 400); g.lineTo(c[0] - 700, c[1] + 1100); g.closePath(); g.fill();
  }
  g.restore();
}

// streams of rain pouring off the umbrella hand's fingertips
function fingertipCurtains(g, cam, Rb, t, a, toY) {
  if (a <= 0) return;
  const tq = TH(t), tips = Rb.A.tipsR || [];
  g.save(); g.lineCap = 'round';
  for (let i = 0; i < tips.length; i++) {
    const p = tips[i];
    for (let k = 0; k < 3; k++) {
      const R = rng(i * 31 + k * 7 + Math.floor(tq * 8) * 101);
      const off = [(k - 1) * .035 + (R() - .5) * .01, -.04, (R() - .5) * .03];
      const top = V.add(p, off), y1 = toY(top);
      const s0 = cam.proj(top), s1 = cam.proj([top[0], y1, top[2]]);
      const w = clamp(cam.scaleAt(top) * .006, .8, 5);
      // a wavering sparkling stream
      const pts = []; const n = 14;
      for (let j = 0; j <= n; j++) { const u = j / n; pts.push([lerp(s0[0], s1[0], u) + Math.sin(u * 9 + tq * 7 + i) * w * .6 * u, lerp(s0[1], s1[1], u)]); }
      g.globalAlpha = a * .8; ink(g, pts, false, w, { color: '#effcff', taper: w * 6, seed: i * 3 + k });
      g.globalAlpha = a * .5; ink(g, pts.map(q => [q[0] + w * .5, q[1]]), false, w * .35, { color: '#ffffff', taper: 4 });
      // beads breaking off
      for (let j = 0; j < 4; j++) { const u = (R() + tq * 1.7 + j * .25) % 1; const q = [lerp(s0[0], s1[0], u), lerp(s0[1], s1[1], u)]; g.globalAlpha = a; g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(q[0] + (R() - .5) * w * 2, q[1], w * .7, w * 1.2, 0, 0, TAU); g.fill(); if (R() < .3) sparkle(g, q[0], q[1], w * 3.5, a); }
    }
  }
  g.restore();
}
// water pouring off the arm as it leaves the water
function armStreams(g, cam, Rb, t) {
  const age = t - 40.5; if (age < 0 || age > 2.2) return;
  const a = clamp(1 - age / 2.2, 0, 1);
  const pts = (Rb.A.tipsR || []).concat([Rb.A.wristR]);
  const tq = TH(t);
  g.save();
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]; if (p[1] < .05) continue;
    const s0 = cam.proj(p), s1 = cam.proj([p[0], 0, p[2]]);
    const w = clamp(cam.scaleAt(p) * .012, 1, 7) * a;
    const q = []; for (let j = 0; j <= 10; j++) { const u = j / 10; q.push([lerp(s0[0], s1[0], u) + Math.sin(u * 6 + tq * 9 + i) * w * .8, lerp(s0[1], s1[1], u)]); }
    g.globalAlpha = .85 * a; ink(g, q, false, w, { color: '#e8fbff', taper: w * 3, seed: i });
    g.globalAlpha = a; drawCrown(g, s1[0], s1[1], w * 1.6, (tq * 3 + i * .3) % 1, i + (tq * 8 | 0));
  }
  g.restore();
}

// ---------- shot list ----------
// each: [t0, t1, fn(g, t, u)]  (u = 0..1 through the shot)
const SHOTS = [
  [0, 8, (g, t, u) => { // establishing: tilt down from the clouds to the drowned avenue
    const py = 620 * (1 - cushion(clamp((t - .4) / 6.4, 0, 1)));
    drawWorld(g, t, 'A', { py, px: 0 }, { lw: 1.5, glintN: 120 });
  }],
  [8, 13, (g, t, u) => { // under the surface
    drawWorld(g, t, 'G', { px: lerp(-120, 120, u) }, { lw: 1.6, glintN: 40, glintK: .5 });
  }],
  [13, 20, (g, t, u) => { // the hand and the bird, preening
    drawWorld(g, t, 'E', { z: lerp(1, 1.03, u) }, { lw: 2.6, blur: 3.5, birdLw: 2.6 });
  }],
  [20, 25.2, (g, t, u) => { // the face; a thin cloud veils the sun
    drawWorld(g, t, 'D', { z: lerp(1, 1.025, u) }, { lw: 2.6, blur: 2 });
  }],
  [25.2, 30.6, (g, t, u) => { // sunshower begins
    drawWorld(g, t, 'B', { z: lerp(1, 1.02, u) }, { lw: 1.9, shafts: .5 * sstep(26, 29, t), glintN: 70 });
  }],
  [30.6, 34.6, (g, t, u) => { // a drop hits the bird
    const r = drawWorld(g, t, 'F', {}, { lw: 2.8, blur: 5, birdLw: 3, rainMax: 4, afterBird: (g2, cam, Rb, info, bM, bA) => {
      if (t > 31.45 && t < 31.75) { // the drop arrives and bursts on her head
        const hp = cam.proj(M.ap(bM, [0, .21, .04])); const k = (t - 31.45) / .3;
        if (k < .45) { const y = lerp(hp[1] - 420, hp[1], k / .45); g2.fillStyle = 'rgba(235,252,255,.95)'; g2.beginPath(); g2.ellipse(hp[0], y, 9, 15, 0, 0, TAU); g2.fill(); g2.fillStyle = '#fff'; g2.beginPath(); g2.arc(hp[0] - 3, y - 5, 4, 0, TAU); g2.fill(); }
        else drawCrown(g2, hp[0], hp[1], 26, (k - .45) / .55, 5);
      }
    } });
  }],
  [34.6, 38.2, (g, t, u) => { // the robot looks up into the glittering rain
    drawWorld(g, t, 'D2', { z: lerp(1, 1.03, u) }, { lw: 2.5, shafts: .8, noBird: true, blur: 1 });
  }],
  [38.2, 45, (g, t, u) => { // the right hand rises from the water and settles over the bird
    drawWorld(g, t, 'C', {}, { lw: 2.2, shafts: .4, after: (g2, cam, Rb) => armStreams(g2, cam, Rb, t), afterBird: (g2, cam, Rb) => fingertipCurtains(g2, cam, Rb, t, sstep(43.4, 44.4, t), p => 1.25) });
  }],
  [45, 53.3, (g, t, u) => { // under the hand: curtains of rain; shake; puff
    drawWorld(g, t, 'E2', { z: lerp(1, 1.04, u) }, { lw: 2.6, blur: 4, birdLw: 2.6, rainMax: 6, landY: e => (Math.abs(e[1] - .1) < .3 && Math.abs(e[2] - 1.15) < .25) ? 2.0 : 0, afterBird: (g2, cam, Rb, info, bM, bA) => {
      fingertipCurtains(g2, cam, Rb, t, 1, p => 1.1);
      handDrums(g2, cam, Rb, t);
      if (t > 46.6 && t < 47.8) shakeDrops(g2, cam, bM, t);
    } });
  }],
  [53.3, 56.6, (g, t, u) => { // the eyes smile
    drawWorld(g, t, 'D3', { z: lerp(1, 1.03, u) }, { lw: 2.6, blur: 2 });
  }],
  [56.6, 63.2, (g, t, u) => { // rain stops, the sun bursts out, a rainbow rises
    const rise = sstep(57.4, 61.8, t);
    const r = drawWorld(g, t, 'R', { py: lerp(60, -60, cushion(u)) }, { lw: 1.9, rainbow: { k: sstep(57.2, 59, t), rise }, glints: false, birdBehind: true });
  }],
  [63.2, 67.2, (g, t, u) => { // the hand lifts away, the bird hops to the fingertip
    drawWorld(g, t, 'E', { z: 1.0, px: 20 }, { lw: 2.6, blur: 3.5, birdLw: 2.6 });
  }],
  [67.2, 70.2, (g, t, u) => { // beacons flash twice
    drawWorld(g, t, 'C2', { z: lerp(1, 1.02, u) }, { lw: 2.3, blur: 1 });
  }],
  [70.2, 81, (g, t, u) => { // the bird flies off into the rainbow; a small wave
    drawWorld(g, t, 'R', { py: -60 + lerp(0, -40, ease(u)) }, { lw: 1.9, rainbow: { k: 1, rise: 1 }, glints: false, birdBehind: true, afterBird: (g2, cam, Rb, info, bM, bA) => {
      if (t < 71.1) return;
      // a faint glitter trail so the eye can follow her into the rainbow
      for (let k = 1; k <= 10; k++) {
        const tt = TW(t) - k * .07; if (tt < 71.05) break;
        const q = cam.proj(M.ap(birdPlace(tt, Rb.A), [0, .08, 0]));
        sparkle(g2, q[0] + Math.sin(k * 2.1) * 4, q[1] + Math.cos(k * 1.7) * 4, 12 - k * .8, .9 * (1 - k / 11));
      }
    } });
  }],
];

function handDrums(g, cam, Rb, t) { // splashes on the metal hand
  const tq = TH(t), R = rng(Math.floor(tq * 8) * 7 + 3);
  g.save(); g.fillStyle = 'rgba(240,252,255,.9)';
  for (let i = 0; i < 9; i++) {
    const p = M.ap(Rb.A.handR, [(R() - .5) * .38, .1, .1 + R() * .55]);
    const s = cam.proj(p), k = cam.scaleAt(p) * .004;
    for (let j = 0; j < 4; j++) { const a = -Math.PI * (.1 + .8 * R()), r = k * (2 + R() * 4); g.beginPath(); g.ellipse(s[0] + Math.cos(a) * r, s[1] + Math.sin(a) * r, k * .5, k * .7, 0, 0, TAU); g.fill(); }
    if (R() < .4) sparkle(g, s[0], s[1] - k * 2, k * 4, .8);
  }
  g.restore();
}
function shakeDrops(g, cam, bM, t) {
  const tq = TW(t), R = rng(Math.floor(tq * 12) + 9), c = cam.proj(M.ap(bM, [0, .1, 0])), s = cam.scaleAt(M.ap(bM, [0, .1, 0]));
  g.save(); g.fillStyle = 'rgba(240,252,255,.95)';
  for (let i = 0; i < 18; i++) { const a = R() * TAU, r = s * (.09 + R() * .14); const x = c[0] + Math.cos(a) * r, y = c[1] + Math.sin(a) * r * .8; g.beginPath(); g.ellipse(x, y, s * .006, s * .01, a, 0, TAU); g.fill(); if (R() < .3) sparkle(g, x, y, s * .02, .9);
    g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x - Math.cos(a) * s * .03, y - Math.sin(a) * s * .025); g.lineTo(x, y); g.stroke(); }
  g.restore();
}

// ---------- frame ----------
function shotAt(t) { for (let i = 0; i < SHOTS.length; i++) if (t < SHOTS[i][1] || i === SHOTS.length - 1) return i; }
window.renderFrame = function (t) {
  const g = G0; g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none';
  const i = shotAt(t), S = SHOTS[i];
  const u = (t - S[0]) / (S[1] - S[0]);
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  S[2](g, t, u);
  // finishing: diffusion glow, grade, grain
  const wx = weather(t);
  diffusion(g, .22 + .12 * wx.burst, .12 * (1 - wx.veil * .6));
  if (wx.veil > 0) { g.save(); g.globalCompositeOperation = 'soft-light'; g.fillStyle = rgba('#7fa6e6', .25 * wx.veil * (1 - wx.burst)); g.fillRect(0, 0, W, H); g.restore(); }
  if (wx.burst > 0 && (i === 10)) { const cam = camFor('R'); }
  vignette(g, .18);
  grain(g, t, .05);
  // fades
  const fin = 1 - sstep(0, 1.4, t), fout = sstep(78.4, 80.6, t);
  if (fin > 0) { g.fillStyle = `rgba(255,255,255,${fin})`; g.fillRect(0, 0, W, H); }
  if (fout > 0) { g.fillStyle = `rgba(255,253,246,${fout})`; g.fillRect(0, 0, W, H); }
  const ta = env(t, 3.2, 4.4, 6.6, 7.6); if (ta > 0) title(g, ta, '天気雨', 'SUNSHOWER');
  const te = sstep(79.3, 80.2, t); if (te > 0) title(g, te, 'おわり', '', true);
};
function title(g, a, jp, en, dark) {
  g.save(); g.globalAlpha = a; g.textAlign = 'center';
  g.fillStyle = dark ? '#4a5a7a' : '#ffffff'; g.shadowColor = dark ? 'rgba(0,0,0,0)' : 'rgba(30,60,110,.45)'; g.shadowBlur = 18;
  g.font = `500 92px ${FMIN}`; g.fillText(jp, W / 2, H * .42);
  if (en) { g.font = `500 26px ${FMIN}`; g.fillText(en.split('').join(' '), W / 2, H * .42 + 56); }
  g.restore();
}
window.ready = Promise.all([document.fonts.load('40px "Yusei Magic"', '警視庁特車ALPHÔNSE'), document.fonts.load('40px "Zen Old Mincho"', '天気雨おわり')]).then(() => true);
