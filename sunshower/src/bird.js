// bird.js — the kingfisher. A small signed-distance "maquette" (head and body
// melt together, so no neck) is ray-marched into flat colour regions with hard
// cel shadows, then inked with the same pressure line as the robot.
'use strict';
const BC = { // [lit, shadow]
  crown: ['#1f86c4', '#18508f'], speck: ['#7fe3ff', '#3f8fc8'], cyan: ['#47e0f6', '#2a95c8'],
  mantle: ['#1a8ab0', '#155a8a'], wing: ['#1f93b8', '#165c8e'], wspot: ['#69d3ee', '#3a8cc2'], flight: ['#16608f', '#123f70'],
  orange: ['#f6893a', '#c8553f'], cheek: ['#f38a35', '#c45440'], white: ['#fbf6ea', '#b8b6d6'],
  beak: ['#2d2c38', '#17161f'], gape: ['#e0623e', '#a8414a'], foot: ['#f05d3d', '#b23a45'], tail: ['#1b62a0', '#173e78'],
};

function sdEll(px, py, pz, rx, ry, rz) {
  const k0 = Math.sqrt(px * px / (rx * rx) + py * py / (ry * ry) + pz * pz / (rz * rz));
  const k1 = Math.sqrt(px * px / (rx * rx * rx * rx) + py * py / (ry * ry * ry * ry) + pz * pz / (rz * rz * rz * rz));
  return k1 > 1e-9 ? k0 * (k0 - 1) / k1 : -Math.min(rx, ry, rz);
}
function smin(a, b, k) { const h = clamp(.5 + .5 * (b - a) / k, 0, 1); return lerp(b, a, h) - k * h * (1 - h); }
function sdCone(px, py, pz, ax, ay, az, bx, by, bz, ra, rb) { // round cone a->b
  const bax = bx - ax, bay = by - ay, baz = bz - az, pax = px - ax, pay = py - ay, paz = pz - az;
  const h = clamp((pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz), 0, 1);
  const dx = pax - bax * h, dy = pay - bay * h, dz = paz - baz * h;
  return Math.sqrt(dx * dx + dy * dy + dz * dz) - lerp(ra, rb, h);
}
// apply inverse of a rigid transform stored as {r,t}
function invAp(m, p) { const r = m.r, x = p[0] - m.t[0], y = p[1] - m.t[1], z = p[2] - m.t[2]; return [r[0] * x + r[3] * y + r[6] * z, r[1] * x + r[4] * y + r[7] * z, r[2] * x + r[5] * y + r[8] * z]; }

function defaultBird() { return { hy: 0, hp: 0, hr: 0, bp: 0, puff: 0, shake: 0, eye: 'open', eyeAmt: 1, wing: 0, wingFlap: 0, lean: 0, crouch: 0, wet: 0, shade: 0, look: 0 }; }

// Build the maquette for a pose. All lengths in metres (body ~0.17 m, beak 0.09 m).
function birdRig(b) {
  const pf = 1 + .26 * b.puff;
  const body = M.chain(M.tr(0, .071 - .02 * b.crouch + .01 * b.puff, -.02), M.rot('z', b.shake * .7 + b.lean), M.rot('x', -.55 + b.bp));
  const head = M.chain(M.tr(0, .146 - .025 * b.crouch + .014 * b.puff, .045), M.rot('z', b.shake), M.rot('y', b.hy), M.rot('x', b.hp), M.rot('z', b.hr));
  const wl = [], ws = b.wing;
  for (const s of [1, -1]) {
    // wings hinge at the shoulder; ws=0 folded, 1 raised
    const flap = b.wingFlap || 0;
    wl.push(M.chain(body, M.tr(s * .05 * pf, .025, .02), M.rot('z', s * (ws * (1.25 + .5 * flap))), M.rot('x', -ws * .25), M.tr(0, 0, -.06 - ws * .02)));
  }
  const tail = M.chain(body, M.tr(0, -.012, -.105), M.rot('x', .2 + b.bp * .3));
  return { body, head, wl, tail, pf, b };
}

function birdSDF(R, p, out, smooth) {
  const b = R.b, pf = R.pf;
  const pb = invAp(R.body, p);
  let dB = sdEll(pb[0], pb[1], pb[2], .058 * pf, .062 * pf, .086 * pf);
  if (b.puff > .01 && !smooth) dB -= b.puff * .006 * (vnoise2(pb[0] * 120 + pb[2] * 60, pb[1] * 120, 3) * .5 + .5);
  const ph = invAp(R.head, p);
  let dH = Math.sqrt(ph[0] * ph[0] + ph[1] * ph[1] + ph[2] * ph[2]) - .056 * (1 + .1 * b.puff);
  if (b.puff > .01 && !smooth) dH -= b.puff * .004 * (vnoise2(ph[0] * 150, ph[1] * 150 + ph[2] * 80, 5) * .5 + .5);
  const dBk = sdCone(ph[0], ph[1] * 1.15, ph[2], 0, -.01, .03, 0, -.022, .158, .0175, .0012) / 1.08;
  let d = smin(dB, dH, .03);
  let id = dH < dB ? 1 : 0;
  // beak blends in a little at the base
  const d2 = smin(d, dBk, .006); if (dBk < d) id = 2; d = d2;
  const pt = invAp(R.tail, p);
  const dT = sdCone(pt[0] * 1.6, pt[1] * 2.2, pt[2], 0, 0, .02, 0, 0, -.065, .03, .018) / 2.2;
  const d3 = smin(d, dT, .008); if (dT < d && dT < .004) id = 3; d = d3;
  for (let i = 0; i < 2; i++) {
    const pw = invAp(R.wl[i], p);
    const wlen = .1 + b.wing * .07, fl = 2.6 - b.wing * .6;
    const dW = sdCone(pw[0] * fl, pw[1], pw[2], 0, .006, .055, 0, -.004, .055 - wlen - .03, .042 + .004 * b.puff + b.wing * .012, .009) / fl * 1.4;
    if (dW < d) { d = dW; id = 4 + i; }
  }
  // feet: short legs and toes curled over the perch (local y=0)
  if (!b.flying) for (const s of [1, -1]) {
    const fx = s * .017;
    let dF = sdCone(p[0], p[1], p[2], fx, .024, .0, fx, .005, .012, .0062, .005);
    dF = Math.min(dF, sdCone(p[0], p[1], p[2], fx, .004, .01, fx + s * .006, -.007, .036, .0045, .0032));
    dF = Math.min(dF, sdCone(p[0], p[1], p[2], fx, .004, .01, fx - s * .008, -.008, .031, .0042, .003));
    dF = Math.min(dF, sdCone(p[0], p[1], p[2], fx, .004, .01, fx, -.006, -.012, .0042, .003));
    if (dF < d) { d = dF; id = 6; }
  }
  if (out) { out.id = id; out.pb = pb; out.ph = ph; }
  return d;
}

// colour key for a hit
function dots(u, v, cell, rad, seed) { // clean round spots on a grid, jittered
  const i = Math.floor(u / cell), j = Math.floor(v / cell);
  for (let a = -1; a <= 1; a++) for (let c = -1; c <= 1; c++) {
    const ci = i + a, cj = j + c, h = hash2(ci + seed * 31, cj);
    if (h > .7) continue;
    const cx = (ci + .2 + .6 * hash2(ci, cj + seed)) * cell, cy = (cj + .2 + .6 * hash2(cj + 7, ci + seed)) * cell;
    if (Math.hypot(u - cx, (v - cy) * 1.25) < rad * cell * (.6 + .5 * h)) return true;
  }
  return false;
}
function featherLine(reg, q) {
  if ((reg === 'wing' || reg === 'wspot') && q.pw) {
    const u = q.pw[2] * 70 + Math.sin(q.pw[1] * 140) * .35; const f = u - Math.floor(u);
    return f < .09 && q.pw[2] > -.03 ? 1 : 0;
  }
  if (reg === 'flight' && q.pw) { const u = q.pw[1] * 150; const f = u - Math.floor(u); return f < .12 ? 1 : 0; }
  if (reg === 'orange' && q.pb) { const u = q.pb[1] * 90 + Math.abs(Math.sin(q.pb[0] * 120)) * .5; const f = u - Math.floor(u); return f < .05 && q.pb[1] < -.01 && q.pb[1] > -.05 ? .6 : 0; }
  return 0;
}
function birdRegion(id, q) {
  if (id === 2) { // beak; the lower mandible base is warm (she is a female)
    const ph = q.ph; return (ph[1] < -.016 && ph[2] < .085) ? 'gape' : 'beak';
  }
  if (id === 3) return 'tail';
  if (id === 6) return 'foot';
  if (id === 4 || id === 5) {
    const pw = q.pw;
    if (pw && pw[2] < -.035) return 'flight';
    if (pw && dots(pw[2], pw[1], .011, .27, 9)) return 'wspot';
    return 'wing';
  }
  if (id === 1) {
    const ph = q.ph, l = Math.hypot(ph[0], ph[1], ph[2]) || 1, x = ph[0] / l, y = ph[1] / l, z = ph[2] / l, side = Math.abs(x);
    if (y > .44 - .2 * z) return dots(Math.atan2(x, z) * 1.0, y, .17, .2, 4) ? 'speck' : 'crown';
    if (y > -.16) {
      if (z < -.55) return side > .35 ? 'white' : 'crown';
      if (side > .25 || z > .6) return 'cheek';
      return 'crown';
    }
    if (y > -.42 && side > .4 && z < .7) return 'crown';
    if (y < -.2 && z > .4 && side < .4) return 'white';
    if (z < -.3 && y > -.5) return 'white';
    return 'white';
  }
  // body
  const pb = q.pb, ny = pb[1] / .062, nx = pb[0] / .058;
  if (ny > .62 && Math.abs(nx) < .32) return 'cyan';
  if (ny > .1 - .25 * (pb[2] / .086)) return 'mantle';
  return 'orange';
}

// Ray-march the bird into a canvas. Returns {cv, x, y, w, h, eye:[...], mask}
function renderBird(cam, Mw, b, opts) {
  opts = opts || {};
  const R = birdRig(b);
  // bounds: project a bounding box
  const corners = [];
  for (const x of [-.2, .2]) for (const y of [-.06, .3]) for (const z of [-.25, .34]) corners.push(cam.proj(M.ap(Mw, [x, y, z])));
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const c of corners) { x0 = Math.min(x0, c[0]); x1 = Math.max(x1, c[0]); y0 = Math.min(y0, c[1]); y1 = Math.max(y1, c[1]); }
  x0 = Math.floor(clamp(x0, -50, W + 50)); y0 = Math.floor(clamp(y0, -50, H + 50)); x1 = Math.ceil(clamp(x1, -50, W + 50)); y1 = Math.ceil(clamp(y1, -50, H + 50));
  const ss = opts.ss || ((x1 - x0) * (y1 - y0) > 250000 ? 1.25 : 2);
  const w = Math.max(2, Math.round((x1 - x0) * ss)), h = Math.max(2, Math.round((y1 - y0) * ss));
  const cv = canvas(w, h), g = cv.getContext('2d'), img = g.createImageData(w, h), D = img.data;
  const mask = new Float32Array(w * h), idm = new Int8Array(w * h).fill(-1);
  const origin = invAp(Mw, cam.pos);
  const Lk = V.norm(invAp({ r: Mw.r, t: [0, 0, 0] }, LIGHT.key)), Ls = V.norm(invAp({ r: Mw.r, t: [0, 0, 0] }, LIGHT.sun));
  const q = {};
  const shade = b.shade || 0; // 0 sunlit, 1 under the robot's hand
  const cols = {}; for (const k in BC) cols[k] = [hex(BC[k][0]), hex(BC[k][1])];
  const bounce = hex('#6fe0e6'), rimc = hex(LIGHT.rim);
  const eps = .0007;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const sx = x0 + (i + .5) / ss, sy = y0 + (j + .5) / ss;
    const rw = cam.ray(sx, sy); const rd = invAp({ r: Mw.r, t: [0, 0, 0] }, rw);
    // bounding sphere
    const ox = origin[0], oy = origin[1] - .1, oz = origin[2];
    const bq = ox * rd[0] + oy * rd[1] + oz * rd[2], cq = ox * ox + oy * oy + oz * oz - .3 * .3, disc = bq * bq - cq;
    if (disc < 0) continue;
    let t = Math.max(0, -bq - Math.sqrt(disc)); const tmax = -bq + Math.sqrt(disc);
    let hit = false, p = null;
    for (let k = 0; k < 64 && t < tmax; k++) {
      p = [origin[0] + rd[0] * t, origin[1] + rd[1] * t, origin[2] + rd[2] * t];
      const d = birdSDF(R, p, null);
      if (d < .0004) { hit = true; break; }
      t += d * .9;
    }
    if (!hit) continue;
    birdSDF(R, p, q);
    if (q.id === 4 || q.id === 5) q.pw = invAp(R.wl[q.id - 4], p);
    const nx = birdSDF(R, [p[0] + eps, p[1], p[2]], null, true) - birdSDF(R, [p[0] - eps, p[1], p[2]], null, true);
    const ny = birdSDF(R, [p[0], p[1] + eps, p[2]], null, true) - birdSDF(R, [p[0], p[1] - eps, p[2]], null, true);
    const nz = birdSDF(R, [p[0], p[1], p[2] + eps], null, true) - birdSDF(R, [p[0], p[1], p[2] - eps], null, true);
    const nl = Math.hypot(nx, ny, nz) || 1, n = [nx / nl, ny / nl, nz / nl];
    const reg = birdRegion(q.id, q);
    const lam = V.dot(n, Lk) * LIGHT.keyK;
    const lit = shade < .5 && lam > .02 && !(opts.selfShadow && opts.selfShadow(p));
    let c = cols[reg][lit ? 0 : 1];
    let r = c[0], gg = c[1], bb = c[2];
    if (lit) { // crisp glossy highlight
      const hv = V.norm(V.sub(Lk, rd)); const sp = V.dot(n, hv);
      if (sp > .993 && (reg !== 'orange' || sp > .996)) { r = lerp(r, 255, .45); gg = lerp(gg, 255, .45); bb = lerp(bb, 255, .45); }
    }
    if (shade > .5 && n[1] < -.6 && -V.dot(n, rd) < .45) { // turquoise bounce light from the water, a thin rim underneath
      r = lerp(r, bounce[0], .45); gg = lerp(gg, bounce[1], .45); bb = lerp(bb, bounce[2], .45);
    }
    // drawn feather detail: covert scallops on the wing, a few breast feathers, primaries
    const fd = featherLine(reg, q);
    if (fd > 0) { const dk = lit ? .82 : .86; r *= lerp(1, dk, fd); gg *= lerp(1, dk, fd); bb *= lerp(1, dk * 1.03, fd); }
    // rim light from the sun behind
    const nv = -V.dot(n, rd);
    if (LIGHT.rimK > 0 && nv < .32 && V.dot(n, Ls) > .15 && shade < .5) { const a = .85 * LIGHT.rimK; r = lerp(r, rimc[0], a); gg = lerp(gg, rimc[1], a); bb = lerp(bb, rimc[2], a); }
    const o = (j * w + i) * 4; D[o] = r; D[o + 1] = gg; D[o + 2] = bb; D[o + 3] = 255;
    mask[j * w + i] = 1; idm[j * w + i] = q.id === 1 ? 0 : (q.id === 4 || q.id === 5) ? 4 : q.id;
  }
  g.putImageData(img, 0, 0);
  // eyes: the one on the camera side, if not hidden
  const eyes = [];
  for (const s of [1, -1]) {
    const el = [s * .042, .012, .03]; const pw = M.ap(Mw, M.ap(R.head, el));
    const nw = V.norm(V.sub(pw, M.ap(Mw, R.head.t)));
    const sc = cam.proj(pw);
    const facing = V.dot(nw, V.norm(V.sub(cam.pos, pw)));
    if (facing < .12) continue;
    const ix = Math.round((sc[0] - x0) * ss), iy = Math.round((sc[1] - y0) * ss);
    if (ix < 0 || iy < 0 || ix >= w || iy >= h || idm[iy * w + ix] !== 0) continue;
    // orientation: head forward axis on screen
    const fw = cam.proj(M.ap(Mw, M.ap(R.head, [s * .042, .012, .06])));
    const up = cam.proj(M.ap(Mw, M.ap(R.head, [s * .042, .042, .03])));
    eyes.push({ x: sc[0], y: sc[1], fx: fw[0] - sc[0], fy: fw[1] - sc[1], ux: up[0] - sc[0], uy: up[1] - sc[1], facing, sz: cam.scaleAt(pw) * .0135 });
  }
  return { cv, x: x0, y: y0, w, h, ss, mask, idm, eyes };
}

// marching squares on a 0/1 grid -> closed polylines in grid coords
function contours(mask, w, h, keep) {
  const segs = new Map(), key = (x, y) => (Math.round(x * 2) * 100003 + Math.round(y * 2));
  const v = (i, j) => (i < 0 || j < 0 || i >= w || j >= h) ? 0 : (keep ? keep(mask[j * w + i]) : mask[j * w + i]);
  const edges = [];
  for (let j = -1; j < h; j++) for (let i = -1; i < w; i++) {
    const a = v(i, j), b = v(i + 1, j), c = v(i + 1, j + 1), d = v(i, j + 1);
    const code = a | b << 1 | c << 2 | d << 3;
    if (code === 0 || code === 15) continue;
    const T = [i + .5 + .5, j + .5], R = [i + 1 + .5, j + .5 + .5], B = [i + .5 + .5, j + 1 + .5], L = [i + .5, j + .5 + .5];
    const add = (p, q) => edges.push([p, q]);
    switch (code) {
      case 1: add(L, T); break; case 2: add(T, R); break; case 3: add(L, R); break; case 4: add(R, B); break;
      case 5: add(L, T); add(R, B); break; case 6: add(T, B); break; case 7: add(L, B); break; case 8: add(B, L); break;
      case 9: add(B, T); break; case 10: add(T, R); add(B, L); break; case 11: add(B, R); break; case 12: add(R, L); break;
      case 13: add(R, T); break; case 14: add(T, L); break;
    }
  }
  const adj = new Map(), push = (k, e) => { if (!adj.has(k)) adj.set(k, []); adj.get(k).push(e); };
  for (const e of edges) { push(key(...e[0]), e); push(key(...e[1]), e); }
  const used = new Set(), loops = [];
  for (const e of edges) {
    if (used.has(e)) continue;
    used.add(e); const loop = [e[0], e[1]]; let end = e[1];
    for (;;) {
      const ke = key(...end); const f = (adj.get(ke) || []).find(x => !used.has(x)); if (!f) break;
      used.add(f); end = key(...f[0]) === ke ? f[1] : f[0]; loop.push(end);
    }
    if (loop.length > 6) loops.push(loop);
  }
  return loops;
}

// Draw a rendered bird into g, with ink lines and drawn eyes.
function drawBird(g, cam, Mw, b, opts) {
  opts = opts || {};
  const r = renderBird(cam, Mw, b, opts);
  const lw = opts.lw || 2.2;
  g.save();
  g.imageSmoothingEnabled = true;
  g.drawImage(r.cv, r.x, r.y, r.w / r.ss, r.h / r.ss);
  const toS = p => [r.x + p[0] / r.ss, r.y + p[1] / r.ss];
  const ks = lightScreen(cam, LIGHT.key);
  // inner lines: wing edges, beak base, feet
  const inner = [[v => v === 4 ? 1 : 0, .62], [v => v === 2 ? 1 : 0, .55], [v => v === 3 ? 1 : 0, .5], [v => v === 6 ? 1 : 0, .45]];
  for (const [f, k] of inner) {
    for (const l of contours(r.idm, r.w, r.h, f)) {
      let p = chaikin(l.map(toS), 2, true); if (p.length < 8) continue;
      ink(g, p, true, lw * k, { heavy: [-ks.dx, -ks.dy], seed: 17, color: INK });
    }
  }
  // silhouette
  for (const l of contours(r.mask, r.w, r.h)) {
    let p = chaikin(l.map(toS), 2, true); if (p.length < 8) continue;
    ink(g, p, true, lw, { heavy: [-ks.dx, -ks.dy], hk: .5, seed: 13, color: INK, wob: .2 });
  }
  // feathery tufts when puffed
  // eyes
  for (const e of r.eyes) drawBirdEye(g, e, b, lw);
  g.restore();
  return r;
}

function drawBirdEye(g, e, b, lw) {
  const s = Math.max(1.2, e.sz) * (1 + .1 * b.puff);
  const fl = Math.hypot(e.fx, e.fy) || 1, ang = Math.atan2(e.fy, e.fx);
  const st = b.eye, amt = b.eyeAmt === undefined ? 1 : b.eyeAmt;
  g.save(); g.translate(e.x, e.y); g.rotate(ang);
  const sx = clamp(e.facing * 1.15, .45, 1);
  g.scale(sx, 1);
  const lwe = Math.max(.8, lw * .55);
  if (st === 'open' || st === 'blink') {
    const op = st === 'blink' ? amt : 1;
    if (op > .15) {
      g.beginPath(); g.ellipse(0, 0, s * 1.05, s * 1.05 * op, 0, 0, TAU); g.fillStyle = '#1a1420'; g.fill();
      g.lineWidth = lwe; g.strokeStyle = INK; g.stroke();
      g.beginPath(); g.ellipse(-s * .25, -s * .35 * op, s * .38, s * .38 * op, 0, 0, TAU); g.fillStyle = '#ffffff'; g.fill();
      g.beginPath(); g.ellipse(s * .35, s * .38 * op, s * .14, s * .14 * op, 0, 0, TAU); g.fillStyle = 'rgba(255,255,255,.8)'; g.fill();
      if (op < .98) { g.beginPath(); g.moveTo(-s * 1.2, -s * 1.05 * op); g.lineTo(s * 1.2, -s * 1.05 * op); g.lineWidth = lwe * 1.2; g.stroke(); }
    } else { g.beginPath(); g.moveTo(-s * 1.1, 0); g.quadraticCurveTo(0, s * .25, s * 1.1, 0); g.lineWidth = lwe * 1.5; g.lineCap = 'round'; g.strokeStyle = INK; g.stroke(); }
  } else if (st === 'squint') { // ">" tight squint
    g.beginPath(); g.moveTo(-s * 1.1, -s * .7); g.lineTo(s * .7, 0); g.lineTo(-s * 1.1, s * .55);
    g.lineWidth = lwe * 1.6; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = INK; g.stroke();
  } else if (st === 'happy') { // closed, curved up
    g.beginPath(); g.moveTo(-s * 1.15, s * .3); g.quadraticCurveTo(0, -s * .95, s * 1.15, s * .3);
    g.lineWidth = lwe * 1.7; g.lineCap = 'round'; g.strokeStyle = INK; g.stroke();
  }
  g.restore();
}
