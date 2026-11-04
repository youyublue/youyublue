// fx.js — effects animation: the sunshower (deterministic drop events), ring
// ripples and crown splashes, sun glints, light shafts, the rainbow, floating
// petals and lily pads, fish, and the finishing (diffusion glow, grain).
'use strict';
// rain density (drops per m^2 per second)
function rainDens(t) {
  if (t < 25.2 || t > 58.4) return 0;
  if (t < 27.6) return lerp(.0, .22, ease((t - 25.2) / 2.4));
  if (t < 32.5) return lerp(.22, 1.05, ease((t - 27.6) / 4.9));
  if (t < 55.4) return 1.05;
  return lerp(1.05, 0, ease((t - 55.4) / 3));
}
const RAIN_V = 9.5, RAIN_TOP = 14;
// big early drops are fewer and fatter
const rainBig = t => clamp(1 - (t - 26) / 6, 0, 1);
// world-space drop events, sorted by impact time: [timp, x, z, size]
const DROPS = (() => {
  const R = rng(808), ev = [];
  const X0 = -32, X1 = 32, Z0 = -45, Z1 = 40, A = (X1 - X0) * (Z1 - Z0);
  for (let t = 25; t < 59; t += 1 / 480) {
    const n = rainDens(t) * A / 480; let k = Math.floor(n); if (R() < n - k) k++;
    for (let i = 0; i < k; i++) ev.push([t + R() / 480, X0 + R() * (X1 - X0), Z0 + R() * (Z1 - Z0), .6 + R() * .8 + rainBig(t) * 1.2]);
  }
  // denser local rain around the hands for the close-ups
  for (let t = 25; t < 59; t += 1 / 480) {
    const n = rainDens(t) * 6 * 9 / 480; let k = Math.floor(n); if (R() < n - k) k++;
    for (let i = 0; i < k; i++) ev.push([t + R() / 480, -1.3 + R() * 3, -.2 + R() * 3, .5 + R() * .6 + rainBig(t)]);
  }
  ev.sort((a, b) => a[0] - b[0]);
  return ev;
})();
function dropsBetween(t0, t1) {
  let lo = 0, hi = DROPS.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (DROPS[m][0] < t0) lo = m + 1; else hi = m; }
  const out = []; for (let i = lo; i < DROPS.length && DROPS[i][0] < t1; i++) out.push(DROPS[i]);
  return out;
}
// surface height where a drop lands: water, or the robot's umbrella hand
function landHeight(x, z, t, cover) {
  if (cover && cover(x, z, t)) return cover(x, z, t);
  return 0;
}

// ---- rain streaks (drawn in screen space from world drops) ----
function drawRain(g, cam, t, o) {
  o = o || {};
  const tq = Math.floor(t * 8) / 8; // effects on threes
  const ev = dropsBetween(tq - .02, tq + RAIN_TOP / RAIN_V);
  const sun = cam.proj(V.add(cam.pos, V.mul(SUN, 5000)));
  const sunOn = sun[2] > 0 ? 1 : 0;
  const wind = [.6, 0, .1];
  g.save(); g.lineCap = 'round';
  const maxD = o.maxD || 45;
  for (const e of ev) {
    const y = (e[0] - tq) * RAIN_V;
    if (y < (o.landY ? o.landY(e) : 0)) continue;
    const p = [e[1] - wind[0] * (e[0] - tq), y, e[2] - wind[2] * (e[0] - tq)];
    if (!cam.front(p, .4)) continue;
    const d = V.len(V.sub(p, cam.pos)); if (d > maxD || (o.minD && d < o.minD)) continue;
    const s0 = cam.proj(p), s1 = cam.proj([p[0] + wind[0] * .16, p[1] + RAIN_V * .16 * (1 + e[3] * .1), p[2]]);
    if (s0[0] < -50 || s0[0] > W + 50 || s0[1] < -100 || s0[1] > H + 50) continue;
    const pxm = cam.f / s0[2];
    // backlight: drops near the sun direction on screen sparkle
    let glow = .35;
    if (sunOn) { const dd = Math.hypot(s0[0] - sun[0], s0[1] - sun[1]); glow += .65 * Math.exp(-dd / 700) * (o.sunK || 1); }
    const a = clamp(glow * (1.3 - d / maxD) * 1.15, 0, 1) * (o.alpha || 1);
    const w = clamp(pxm * .014 * e[3], .7, 5);
    const big = rainBig(e[0]);
    g.strokeStyle = `rgba(255,255,255,${a * .75})`;
    g.lineWidth = w;
    g.beginPath(); g.moveTo(s0[0], s0[1]); g.lineTo(s1[0], s1[1]); g.stroke();
    if ((big > .3 || pxm > 140) && w > 1.6) { // fat sunlit drop: a bead with a highlight
      g.fillStyle = `rgba(230,250,255,${a})`; g.beginPath(); g.ellipse(s0[0], s0[1], w * 1.3, w * 2.1, 0, 0, TAU); g.fill();
      g.fillStyle = `rgba(255,255,255,${a})`; g.beginPath(); g.arc(s0[0] - w * .35, s0[1] - w * .6, w * .45, 0, TAU); g.fill();
      if (glow > .7) sparkle(g, s0[0], s0[1], w * 4, a * .8);
    }
  }
  g.restore();
}

// ring ripples (drawn) and crown splashes; returns the near ripples for the shader
function drawRipples(g, cam, t, o) {
  o = o || {};
  const tq = Math.floor(t * 8) / 8;
  const ev = dropsBetween(tq - 1.25, tq + .001);
  const near = [];
  g.save(); g.lineCap = 'round';
  for (const e of ev) {
    const age = tq - e[0]; if (age < 0) continue;
    if (o.skip && o.skip(e)) continue;
    const c = [e[1], 0, e[2]]; if (!cam.front(c, 1)) continue;
    const sc = cam.proj(c); if (sc[0] < -200 || sc[0] > W + 200 || sc[1] < cam.horizon() - 5 || sc[1] > H + 200) continue;
    const pxm = cam.f / sc[2];
    const d = sc[2];
    if (near.length < 48 && d < 30) near.push([e[1], e[2], age, e[3]]);
    const R0 = (.06 + .55 * age) * (.7 + .3 * e[3]);
    if (R0 * pxm < 1.2) continue;
    const a = clamp(1 - age / 1.15, 0, 1) * (o.alpha || 1);
    for (let k = 0; k < 2; k++) {
      const r = R0 * (1 - k * .38); if (r <= 0) continue;
      const pts = []; const n = clamp(r * pxm / 3 | 0, 10, 48);
      for (let i = 0; i < n; i++) { const an = i / n * TAU; const s = cam.proj([c[0] + Math.cos(an) * r, 0, c[2] + Math.sin(an) * r]); pts.push([s[0], s[1]]); }
      const lw = clamp(pxm * .012, .5, 2.4) * (k ? .7 : 1);
      g.globalAlpha = a * (k ? .55 : .8);
      ink(g, pts, true, lw, { color: '#f4fdff', taper: 0, seed: (e[1] * 100) | 0 });
      if (pxm > 60 && !k) { g.globalAlpha = a * .25; ink(g, pts.map(p => [p[0], p[1] + lw * 1.5]), true, lw * .8, { color: '#2a7f99', taper: 0 }); }
    }
    // crown splash right after impact
    if (age < .2 && pxm > 45) { g.globalAlpha = .75 * (o.alpha || 1); drawCrown(g, sc[0], sc[1], pxm * .04 * e[3], age / .2, (e[1] * 1000) | 0); g.globalAlpha = 1; }
    else if (age < .15 && pxm > 8) { g.globalAlpha = .7; g.fillStyle = '#f4fdff'; g.beginPath(); g.ellipse(sc[0], sc[1] - pxm * .03, Math.max(.6, pxm * .006), Math.max(1, pxm * .03), 0, 0, TAU); g.fill(); g.globalAlpha = 1; }
  }
  g.restore();
  return near;
}
function drawCrown(g, x, y, s, k, seed) {
  const R = rng(seed);
  g.save();
  const h = s * (1.2 + 1.6 * Math.sin(k * Math.PI)), w = s * (1 + k * 1.2);
  g.fillStyle = 'rgba(240,252,255,.85)'; g.strokeStyle = 'rgba(40,110,140,.5)'; g.lineWidth = Math.max(.5, s * .06);
  g.beginPath(); g.moveTo(x - w, y);
  const n = 6;
  for (let i = 0; i <= n; i++) { const u = i / n, px = x - w + u * 2 * w, tip = (i % 2 === 0) ? h : h * .5; g.lineTo(px, y - tip * (.8 + .4 * R())); }
  g.lineTo(x + w, y); g.quadraticCurveTo(x, y + s * .35, x - w, y); g.fill(); g.stroke();
  // flying droplets
  for (let i = 0; i < 5; i++) { const a = -Math.PI * (.15 + .7 * R()), r = h * (1 + k * 1.2); g.beginPath(); g.arc(x + Math.cos(a) * r * .8, y + Math.sin(a) * r, Math.max(.6, s * .12), 0, TAU); g.fill(); }
  g.restore();
}

// separate glints on the glitter path toward the sun
function drawGlints(g, cam, t, o) {
  o = o || {};
  const sun = cam.proj(V.add(cam.pos, V.mul(SUN, 5000)));
  const hy = cam.horizon();
  const tq = Math.floor(t * 8);
  const R = rng(tq * 13 + 5);
  const k = o.k === undefined ? 1 : o.k;
  if (k <= 0) return;
  for (let i = 0; i < (o.n || 90); i++) {
    const v = Math.pow(R(), 1.6); // more near the horizon
    const y = hy + 3 + v * (H - hy);
    const spread = 40 + v * 420;
    const x = (sun[2] > 0 ? sun[0] : W / 2) + (R() + R() + R() - 1.5) * spread;
    const s = (2 + R() * 7) * (.4 + v) * k;
    if (R() < .5) sparkle(g, x, y, s, .9 * k); else { g.fillStyle = `rgba(255,255,248,${.85 * k})`; g.beginPath(); g.ellipse(x, y, s * .7, s * .22, 0, 0, TAU); g.fill(); }
  }
}

// god rays from the sun through the rain
function drawShafts(g, cam, t, a) {
  if (a <= 0) return;
  const sun = cam.proj(V.add(cam.pos, V.mul(SUN, 5000)));
  const sx = sun[2] > 0 ? sun[0] : W * .2, sy = sun[2] > 0 ? sun[1] : -300;
  g.save(); g.globalCompositeOperation = 'screen';
  const R = rng(3);
  for (let i = 0; i < 9; i++) {
    const ang = Math.PI * .25 + R() * Math.PI * .5 + Math.sin(t * .1 + i) * .02, wd = .03 + R() * .06, L = 2600;
    const gr = g.createLinearGradient(sx, sy, sx + Math.cos(ang) * L, sy + Math.sin(ang) * L);
    gr.addColorStop(0, `rgba(255,250,225,${a * (.18 + R() * .12)})`); gr.addColorStop(1, 'rgba(255,250,225,0)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(sx, sy);
    g.lineTo(sx + Math.cos(ang - wd) * L, sy + Math.sin(ang - wd) * L); g.lineTo(sx + Math.cos(ang + wd) * L, sy + Math.sin(ang + wd) * L); g.closePath(); g.fill();
  }
  g.restore();
}

// rainbow: an arc about the anti-solar point, 42 degrees, painted as soft bands.
// `rise` sweeps it in from the left end over the top.
function drawRainbow(g, cam, k, rise) {
  if (k <= 0) return;
  const anti = V.mul(SUN, -1);
  const a1 = V.norm(V.cross(anti, [0, 1, 0])), a2 = V.cross(a1, anti);
  const bands = ['#e2473d', '#f49a3a', '#f7de58', '#86d36c', '#58aae8', '#7c6fd8'];
  const R42 = 42 * Math.PI / 180, bw = 2.7 * Math.PI / 180;
  const c = scratch('bow'); const cg = c.g;
  cg.lineCap = 'butt'; cg.lineJoin = 'round';
  for (let i = 0; i < bands.length; i++) {
    const r = R42 - (i - 2.5) / 6 * bw;
    cg.beginPath(); let first = true;
    for (let j = 0; j <= 180; j++) {
      const ph = Math.PI * (j / 180) * clamp(rise, 0, 1);
      const dir = V.norm(V.add(V.mul(anti, Math.cos(r)), V.mul(V.add(V.mul(a1, Math.cos(ph)), V.mul(a2, Math.sin(ph))), Math.sin(r))));
      if (dir[1] < -.02 || !cam.front(V.add(cam.pos, dir), .1)) { first = true; continue; }
      const s = cam.proj(V.add(cam.pos, V.mul(dir, 3000)));
      first ? cg.moveTo(s[0], s[1]) : cg.lineTo(s[0], s[1]); first = false;
    }
    cg.strokeStyle = bands[i]; cg.lineWidth = cam.f * bw / 6 * 1.25; cg.globalAlpha = .5; cg.stroke();
  }
  // soft and fading toward the horizon
  const hy = cam.horizon();
  cg.globalAlpha = 1; cg.globalCompositeOperation = 'destination-in';
  const gr = cg.createLinearGradient(0, hy - 360, 0, hy); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,.12)');
  cg.fillStyle = gr; cg.fillRect(0, 0, W, H);
  g.save(); g.globalCompositeOperation = 'screen'; g.globalAlpha = k; g.filter = 'blur(5px)'; g.drawImage(c, 0, 0); g.filter = 'blur(1.5px)'; g.globalAlpha = k * .6; g.drawImage(c, 0, 0); g.restore();
}

// floating things on the surface: lily pads, petals, leaves (bob gently)
const FLOATERS = (() => { const R = rng(55), o = []; for (let i = 0; i < 260; i++) o.push({ x: -26 + R() * 52, z: -60 + R() * 100, k: R() < .35 ? 'pad' : R() < .6 ? 'petal' : 'leaf', r: R(), s: R(), a: R() * TAU }); return o; })();
function drawFloaters(g, cam, t, o) {
  o = o || {};
  const tq = Math.floor(t * 12) / 12;
  for (const f of FLOATERS) {
    const dx = Math.sin(tq * .3 + f.a) * .25 + tq * .05, dz = Math.cos(tq * .25 + f.a * 2) * .2;
    const c = [f.x + dx, 0, f.z + dz]; if (!cam.front(c, 1)) continue;
    const sc = cam.proj(c); if (sc[0] < -100 || sc[0] > W + 100 || sc[1] < cam.horizon() || sc[1] > H + 100) continue;
    const pxm = cam.f / sc[2];
    if (f.k === 'pad') {
      const r = (.35 + f.s * .55); if (r * pxm < 2) continue;
      const pts = []; const n = 28;
      for (let i = 0; i < n; i++) { const an = f.a + (i / n) * (TAU - .5) + .25; pts.push(cam.proj([c[0] + Math.cos(an) * r, .01, c[2] + Math.sin(an) * r])); }
      const p2 = [[sc[0], sc[1]]].concat(pts.map(p => [p[0], p[1]]));
      fillPoly(g, p2, '#5fa84a');
      g.save(); g.beginPath(); pathPoly(g, p2); g.clip();
      fillPoly(g, p2.map(p => [p[0] + pxm * r * .12, p[1] - pxm * r * .06]), '#8fca5a');
      g.strokeStyle = 'rgba(60,120,70,.6)'; g.lineWidth = Math.max(.5, pxm * .015);
      for (let i = 0; i < 6; i++) { const an = f.a + i / 6 * TAU; const q = cam.proj([c[0] + Math.cos(an) * r * .9, .01, c[2] + Math.sin(an) * r * .9]); g.beginPath(); g.moveTo(sc[0], sc[1]); g.lineTo(q[0], q[1]); g.stroke(); }
      g.restore();
      if (pxm > 25) ink(g, p2, true, clamp(pxm * .02, .6, 2), { color: '#2d5a45', taper: 0 });
      // soft shadow on the water
      if (f.r < .25 && pxm > 30) { const fl = cam.proj([c[0] + .35 * r, .01, c[2] + .35 * r]); g.fillStyle = '#f3a3c4'; g.beginPath(); g.ellipse(fl[0], fl[1] - pxm * .08, pxm * .14, pxm * .1, 0, 0, TAU); g.fill(); g.fillStyle = '#ffe8f0'; g.beginPath(); g.ellipse(fl[0] - pxm * .03, fl[1] - pxm * .12, pxm * .06, pxm * .05, 0, 0, TAU); g.fill(); }
    } else {
      const r = f.k === 'petal' ? .05 + f.s * .04 : .07 + f.s * .06; if (r * pxm < 1) continue;
      const col = f.k === 'petal' ? (f.r < .5 ? '#f7c6d4' : '#fff1f4') : (f.r < .5 ? '#a8c95a' : '#d7a85a');
      g.fillStyle = col; g.beginPath(); g.ellipse(sc[0], sc[1], r * pxm, r * pxm * Math.abs(cam.up[1]) * .5 + r * pxm * .15, f.a + tq * .2, 0, TAU); g.fill();
      if (pxm > 40) { g.strokeStyle = 'rgba(80,60,80,.5)'; g.lineWidth = .8; g.stroke(); }
    }
  }
}

// little fish in the submerged layer
function drawFish(g, cam, t) {
  const tq = Math.floor(t * 12) / 12;
  const R = rng(91);
  for (let i = 0; i < 16; i++) {
    const cx = -12 + R() * 24, cz = -10 + R() * 40, sp = .4 + R() * .5, rad = 2 + R() * 4, ph = R() * TAU, dep = -1 - R() * 2.2;
    const a = ph + tq * sp / rad * (i % 2 ? 1 : -1);
    const p = [cx + Math.cos(a) * rad, dep, cz + Math.sin(a) * rad];
    if (!cam.front(p, 1)) continue;
    const s = cam.proj(p), pxm = cam.f / s[2], L = (.22 + R() * .18) * pxm; if (L < 2) continue;
    const dir = [-Math.sin(a) * (i % 2 ? 1 : -1), 0, Math.cos(a) * (i % 2 ? 1 : -1)];
    const s2 = cam.proj(V.add(p, V.mul(dir, .3))); const ang = Math.atan2(s2[1] - s[1], s2[0] - s[0]);
    const wig = Math.sin(tq * 9 + i) * .25;
    g.save(); g.translate(s[0], s[1]); g.rotate(ang); g.scale(1, .55 + .45 * Math.abs(cam.up[1]));
    g.fillStyle = i % 3 ? '#3e6f86' : '#c9784a';
    g.beginPath(); g.moveTo(L * .5, 0); g.quadraticCurveTo(0, -L * .22, -L * .3, 0); g.quadraticCurveTo(0, L * .22, L * .5, 0); g.fill();
    g.beginPath(); g.moveTo(-L * .28, 0); g.lineTo(-L * .55, -L * .16 + wig * L * .2); g.lineTo(-L * .55, L * .16 + wig * L * .2); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(L * .1, -L * .05, L * .2, L * .04, 0, 0, TAU); g.fill();
    g.restore();
  }
}

// ---------- finishing ----------
function diffusion(g, amt, warm) {
  // theatrical "para" glow: blurred bright copy screened over the frame
  const s = scratch('glow', W / 4, H / 4);
  s.g.filter = 'blur(6px) brightness(1.1)';
  s.g.drawImage(g.canvas, 0, 0, W / 4, H / 4);
  g.save(); g.globalCompositeOperation = 'screen'; g.globalAlpha = amt;
  g.drawImage(s, 0, 0, W, H); g.restore();
  if (warm) { g.save(); g.globalCompositeOperation = 'soft-light'; const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, rgba('#ffe7b0', warm)); gr.addColorStop(1, rgba('#8fb8ff', warm * .5)); g.fillStyle = gr; g.fillRect(0, 0, W, H); g.restore(); }
}
function vignette(g, a) { const gr = g.createRadialGradient(W / 2, H / 2, H * .45, W / 2, H / 2, H * 1.15); gr.addColorStop(0, 'rgba(40,50,90,0)'); gr.addColorStop(1, `rgba(40,50,90,${a})`); g.fillStyle = gr; g.fillRect(0, 0, W, H); }
let _grain = null;
function grain(g, t, a) {
  if (!_grain) { _grain = []; for (let k = 0; k < 4; k++) { const c = canvas(480, 260), cg = c.getContext('2d'), d = cg.createImageData(480, 260), R = rng(k + 3); for (let i = 0; i < d.data.length; i += 4) { const v = 128 + (R() - .5) * 120; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; } cg.putImageData(d, 0, 0); _grain.push(c); } }
  g.save(); g.globalCompositeOperation = 'overlay'; g.globalAlpha = a; g.imageSmoothingEnabled = true;
  g.drawImage(_grain[Math.floor(t * 12) % 4], 0, 0, W, H); g.restore();
}
function lensFlare(g, x, y, a) {
  if (a <= 0) return;
  radial(g, x, y, 600, '#fff6d8', .5 * a, 'screen'); radial(g, x, y, 140, '#ffffff', .9 * a, 'screen');
  g.save(); g.globalCompositeOperation = 'screen';
  const dx = W / 2 - x, dy = H / 2 - y;
  const ghosts = [[.4, 40, '#ffd9a0', .25], [.7, 18, '#a0e0ff', .3], [1.1, 70, '#c8b0ff', .12], [1.4, 26, '#b0ffd0', .2], [1.8, 110, '#ffe0b0', .08]];
  for (const [k, r, c, al] of ghosts) radial(g, x + dx * k * 2, y + dy * k * 2, r * 2, c, al * a);
  // star streaks
  g.globalAlpha = .5 * a; g.fillStyle = '#ffffff';
  g.beginPath(); g.ellipse(x, y, 700, 2.2, -.05, 0, TAU); g.fill();
  g.beginPath(); g.ellipse(x, y, 2, 160, 0, 0, TAU); g.fill();
  g.restore();
}
