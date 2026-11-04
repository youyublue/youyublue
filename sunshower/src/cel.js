// cel.js — draws 3D "model sheet" parts as inked, cel-painted 2D shapes.
// Each part is a convex solid (rounded hexahedron, cylinder, ellipsoid). Its
// outline is the convex hull of its projected surface samples, inked with a
// pressure line; shading is a hard-edged cel shadow (silhouette offset toward the
// light, the way animators place shadow shapes) or per-face for flat panels.
'use strict';
function fibSphere(n) { const o = [], g = Math.PI * (3 - Math.sqrt(5)); for (let i = 0; i < n; i++) { const y = 1 - (i + .5) / n * 2, r = Math.sqrt(1 - y * y), a = g * i; o.push([Math.cos(a) * r, y, Math.sin(a) * r]); } return o; }
const SPH = fibSphere(30), SPH2 = fibSphere(90);
const HEXF = [[0, 3, 2, 1], [4, 5, 6, 7], [0, 4, 7, 3], [1, 2, 6, 5], [0, 1, 5, 4], [3, 7, 6, 2]];

// materials: [base, shadow, highlight]
const MAT = {
  white: { b: '#f3f1ea', s: '#aeb4d8', h: '#ffffff', d: '#8f95c4', line: 1 },
  black: { b: '#3b3e52', s: '#252737', h: '#7c88b4', d: '#1b1c29', line: 1 },
  grey: { b: '#8d92a8', s: '#5f637f', h: '#c9d0e6', line: 1 },
  steel: { b: '#bfc6d6', s: '#7d84a3', h: '#ffffff', line: .8 },
  red: { b: '#ee3b33', s: '#a8264a', h: '#ffb3a0', line: .9 },
  glass: { b: '#1d3e5c', s: '#13273f', h: '#8fd8ff', line: 1 },
  yellow: { b: '#f6c637', s: '#c98a3c', h: '#fff2b0', line: .8 },
};

function hexaPart(v, r, mat, o) { return Object.assign({ kind: 'hexa', v, r, mat }, o || {}); }
function boxPart(c, s, r, mat, o) {
  const [x, y, z] = c, [a, b, d] = [s[0] / 2, s[1] / 2, s[2] / 2];
  return hexaPart([[x - a, y - b, z - d], [x + a, y - b, z - d], [x + a, y + b, z - d], [x - a, y + b, z - d], [x - a, y - b, z + d], [x + a, y - b, z + d], [x + a, y + b, z + d], [x - a, y + b, z + d]], r, mat, o);
}
// tapered block: bottom (y0) and top (y1) rectangles [x0,x1,z0,z1]
function taperPart(y0, y1, B, T, r, mat, o) {
  return hexaPart([[B[0], y0, B[2]], [B[1], y0, B[2]], [T[1], y1, T[2]], [T[0], y1, T[2]], [B[0], y0, B[3]], [B[1], y0, B[3]], [T[1], y1, T[3]], [T[0], y1, T[3]]], r, mat, o);
}
function cylPart(p0, p1, r0, r1, mat, o) { return Object.assign({ kind: 'cyl', p0, p1, r0, r1, mat, n: 24 }, o || {}); }
function capPart(p0, p1, r0, r1, mat, o) { return Object.assign({ kind: 'cap', p0, p1, r0, r1, mat }, o || {}); }
function ellPart(c, rad, mat, o) { return Object.assign({ kind: 'ell', c, rad, mat }, o || {}); }

// world-space sample points of a part
function partPoints(p, m) {
  const P = [];
  if (p.kind === 'hexa') {
    const vw = p.v.map(q => M.ap(m, q)); p._vw = vw;
    const S = p.r > .06 ? SPH2 : SPH;
    for (const q of vw) { if (p.r <= 0) P.push(q); else for (const s of S) P.push([q[0] + s[0] * p.r, q[1] + s[1] * p.r, q[2] + s[2] * p.r]); }
  } else if (p.kind === 'cyl') {
    const a = M.ap(m, p.p0), b = M.ap(m, p.p1), ax = V.norm(V.sub(b, a));
    let t1 = V.norm(V.cross(ax, Math.abs(ax[1]) < .9 ? [0, 1, 0] : [1, 0, 0])), t2 = V.cross(ax, t1);
    p._a = a; p._b = b; p._ax = ax;
    const rr = p.round || 0;
    for (let i = 0; i < p.n; i++) {
      const an = i / p.n * TAU, c = Math.cos(an), s = Math.sin(an);
      const d = [t1[0] * c + t2[0] * s, t1[1] * c + t2[1] * s, t1[2] * c + t2[2] * s];
      P.push(V.add(a, V.mul(d, p.r0)), V.add(b, V.mul(d, p.r1)));
      if (rr) { P.push(V.add(V.add(a, V.mul(d, p.r0 * .7)), V.mul(ax, -rr)), V.add(V.add(b, V.mul(d, p.r1 * .7)), V.mul(ax, rr))); }
    }
  } else if (p.kind === 'cap') {
    const a = M.ap(m, p.p0), b = M.ap(m, p.p1); p._a = a; p._b = b;
    for (const s of SPH) { P.push([a[0] + s[0] * p.r0, a[1] + s[1] * p.r0, a[2] + s[2] * p.r0]); P.push([b[0] + s[0] * p.r1, b[1] + s[1] * p.r1, b[2] + s[2] * p.r1]); }
  } else if (p.kind === 'ell') {
    for (const s of SPH2) P.push(M.ap(m, [p.c[0] + s[0] * p.rad[0], p.c[1] + s[1] * p.rad[1], p.c[2] + s[2] * p.rad[2]]));
  }
  return P;
}

// the global lighting for character drawing
const LIGHT = {
  key: V.norm([-.35, .62, .7]),   // character key (front-left, high)
  sun: V.norm([.25, .5, -.85]),    // the sun, behind the robot: rim light
  keyK: 1, rimK: 1, rim: '#fffbe8', rimA: .95, shadowTint: null, dim: 0,
};

function projPart(cam, p, m, clampMode) {
  let P = partPoints(p, m);
  if (clampMode) {
    let ymin = 1e9, ymax = -1e9; for (const q of P) { ymin = Math.min(ymin, q[1]); ymax = Math.max(ymax, q[1]); }
    if (clampMode === 'above' && ymax <= 0.002) return null;
    if (clampMode === 'below' && ymin >= -0.002) return null;
    const lv = p.wl || 0;
    P = P.map(q => clampMode === 'above' ? (q[1] < lv ? [q[0], lv, q[2]] : q) : (q[1] > lv ? [q[0], lv, q[2]] : q));
    if (p.kind === 'hexa') p._vw = p._vw.map(q => clampMode === 'above' ? (q[1] < lv ? [q[0], lv, q[2]] : q) : (q[1] > lv ? [q[0], lv, q[2]] : q));
  }
  const S2 = P.map(q => cam.proj(q));
  let z = 0; for (const s of S2) z += s[2]; z /= S2.length;
  let h = hull(S2.map(s => [s[0], s[1]]));
  if (h.length < 3) return null;
  h = chaikin(h, 1, true);
  return { part: p, m, hull: h, z: z - (p.zb || 0), P };
}

// screen-space direction toward a world light, and how much it faces the camera
function lightScreen(cam, L) { const c = cam.dirc(L); const l = Math.hypot(c[0], c[1]) || 1; return { dx: c[0] / l, dy: -c[1] / l, front: -c[2], side: Math.hypot(c[0], c[1]) }; }
function extentAlong(h, dx, dy) { let a = 1e9, b = -1e9; for (const q of h) { const d = q[0] * dx + q[1] * dy; a = Math.min(a, d); b = Math.max(b, d); } return (b - a) / 2; }
function clipPath(g, h) { g.beginPath(); pathPoly(g, h); g.clip(); }
function xorFill(g, A, B, col) { g.beginPath(); pathPoly(g, A); pathPoly(g, B); g.fillStyle = col; g.fill('evenodd'); }

function faceNormal(vw, f) {
  const a = vw[f[0]], b = vw[f[1]], c = vw[f[2]];
  return V.norm(V.cross(V.sub(b, a), V.sub(c, a)));
}

// Draw a list of parts with a camera. opts: {lw, clamp, wob, light, under}
function drawParts(g, cam, parts, opts) {
  opts = opts || {};
  const L = opts.light || LIGHT;
  const items = [];
  for (const p of parts) {
    if (p.hidden) continue;
    const it = projPart(cam, p, p.M, opts.clamp);
    if (it) items.push(it);
  }
  items.sort((a, b) => b.z - a.z);
  const ks = lightScreen(cam, L.key), ss = lightScreen(cam, L.sun);
  const lw = opts.lw || 2.4;
  const info = {};
  for (const it of items) {
    drawItem(g, cam, it, opts, L, ks, ss, lw);
    if (it.part.name) info[it.part.name] = it;
  }
  return info;
}

function matOf(p, L) { const m = typeof p.mat === 'string' ? MAT[p.mat] : p.mat; return m; }

function drawItem(g, cam, it, opts, L, ks, ss, lw) {
  const p = it.part, mat = matOf(p, L), h = it.hull;
  const camPos = cam.mirror ? [cam.pos[0], -cam.pos[1], cam.pos[2]] : cam.pos;
  const R = Math.max(extentAlong(h, ks.dx, ks.dy), 1);
  const base = p.emit ? p.emit : mat.b;
  g.save();
  fillPoly(g, h, base);
  clipPath(g, h);
  // --- shading
  const shK = (p.shadeK === undefined ? 1 : p.shadeK) * L.keyK;
  let faceInfo = null;
  if (p.kind === 'hexa' && p.faces !== false) {
    faceInfo = [];
    const vw = p._vw;
    let ctr = [0, 0, 0]; for (const q of vw) ctr = V.add(ctr, q); ctr = V.mul(ctr, 1 / 8);
    for (let fi = 0; fi < 6; fi++) {
      const f = HEXF[fi]; let n = faceNormal(vw, f);
      const fc = V.mul(V.add(V.add(vw[f[0]], vw[f[1]]), V.add(vw[f[2]], vw[f[3]])), .25);
      if (V.dot(n, V.sub(fc, ctr)) < 0) n = V.mul(n, -1);
      const nW = cam.mirror ? [n[0], -n[1], n[2]] : n;
      const fcW = cam.mirror ? [fc[0], -fc[1], fc[2]] : fc;
      const vis = V.dot(nW, V.sub(camPos, fcW)) > 0;
      const lam = V.dot(n, L.key);
      faceInfo.push({ f, n, vis, lam });
      if (!vis) continue;
      if (p.emit) continue;
      const poly = f.map(i => { const q = V.add(vw[i], V.mul(n, p.r)); return cam.proj(q); }).map(s => [s[0], s[1]]);
      const thr = p.thr === undefined ? .08 : p.thr;
      if (lam * shK < thr || L.dim > .5 || p.inShade) fillPoly(g, chaikin(poly, 1, true), mat.s);
      else if (lam > .82 && mat.h && p.gloss) fillPoly(g, chaikin(poly, 1, true), mix(mat.b, mat.h, .5));
    }
    // bevel shadow on the side away from the key light, so edges read as rounded
    if (!p.emit && L.dim <= .5 && !p.inShade) {
      const d = Math.min(R * .14, 7 + R * .02) * (1 - .4 * ks.front);
      g.globalAlpha = .9;
      xorFill(g, h, offsetPoly(h, ks.dx * d, ks.dy * d), mat.s);
      g.globalAlpha = 1;
    }
  } else if (!p.emit) {
    if (L.dim > .5 || p.inShade) fillPoly(g, h, mat.s);
    else {
      const k = (1 - .78 * Math.max(0, ks.front)) * (p.shadeAmt || 1) * shK;
      const d = R * (.18 + .55 * k);
      xorFill(g, h, offsetPoly(h, ks.dx * d, ks.dy * d), mat.s);
      // crisp highlight stripe on round forms
      if (mat.h && p.gloss !== false && (p.kind === 'cyl' || p.kind === 'cap' || p.kind === 'ell' || p.gloss)) {
        const a = R * .12, b = R * .32;
        g.save(); clipPath(g, offsetPoly(h, -ks.dx * a, -ks.dy * a));
        g.globalAlpha = p.kind === 'ell' ? .55 : .7;
        xorFill(g, h, offsetPoly(h, -ks.dx * b, -ks.dy * b), mat.h);
        g.restore();
      }
    }
  }
  // --- decals
  if (p.decals && !opts.noDecals) for (const d of p.decals) drawDecal(g, cam, it, d, L, faceInfo, lw);
  if (p.draw) p.draw(g, cam, it, L, lw);
  // --- rim light from the sun (thin crescent on the sun side)
  if (L.rimK > 0 && !opts.noRim && p.rim !== false) {
    const Rs = Math.max(extentAlong(h, ss.dx, ss.dy), 1);
    const d = Math.min(Rs * .1, 2.2 + Rs * .035) * L.rimK * (p.rimK || 1);
    g.globalAlpha = L.rimA * (p.emit ? .3 : 1);
    xorFill(g, h, offsetPoly(h, -ss.dx * d, -ss.dy * d), L.rim);
    g.globalAlpha = 1;
  }
  g.restore();
  // --- creases between visible faces
  if (faceInfo && p.creases !== false) {
    const vw = p._vw, done = {};
    for (let a = 0; a < 6; a++) for (let b = a + 1; b < 6; b++) {
      const A = faceInfo[a], B = faceInfo[b];
      if (!A.vis || !B.vis) continue;
      const sh = A.f.filter(i => B.f.includes(i)); if (sh.length !== 2) continue;
      if (V.dot(A.n, B.n) > .93) continue;
      const nn = V.norm(V.add(A.n, B.n));
      const e = sh.map(i => cam.proj(V.add(vw[i], V.mul(nn, p.r))));
      const pts = [[e[0][0], e[0][1]], [e[1][0], e[1][1]]];
      // shorten a little so the crease meets the outline like a drawn line
      const ins = .06;
      const q0 = [lerp(pts[0][0], pts[1][0], ins), lerp(pts[0][1], pts[1][1], ins)], q1 = [lerp(pts[0][0], pts[1][0], 1 - ins), lerp(pts[0][1], pts[1][1], 1 - ins)];
      ink(g, [q0, q1], false, lw * .55 * (p.lwk || 1), { seed: a * 7 + b, taper: 6, color: p.creaseCol || INK });
    }
  }
  // --- outline
  ink(g, h, true, lw * (mat.line || 1) * (p.lwk || 1), { heavy: [-ks.dx, -ks.dy], hk: .5, wob: opts.wob === undefined ? .35 : opts.wob, seed: (p.seed || 11), color: p.lineCol || INK });
}

function decalVisible(cam, it, d) {
  if (!d.n) return true;
  const camPos = cam.mirror ? [cam.pos[0], -cam.pos[1], cam.pos[2]] : cam.pos;
  let n = M.dir(it.m, d.n); const c = M.ap(it.m, d.c || d.o || d.pts[0]);
  if (cam.mirror) { n = [n[0], -n[1], n[2]]; c[1] = -c[1]; }
  return V.dot(n, V.norm(V.sub(camPos, c))) > (d.minVis || .08);
}
function decalLit(it, d, L) { if (it.part.inShade) return false; if (!d.n) return true; return V.dot(V.norm(M.dir(it.m, d.n)), L.key) * L.keyK > (d.thr === undefined ? .08 : d.thr) && L.dim <= .5; }
function pj(cam, it, q) { const s = cam.proj(M.ap(it.m, q)); return [s[0], s[1]]; }

// circle in the plane with normal n
function circle3(c, n, r, k) {
  const nn = V.norm(n); const t1 = V.norm(V.cross(nn, Math.abs(nn[1]) < .9 ? [0, 1, 0] : [1, 0, 0])), t2 = V.cross(nn, t1);
  const o = []; for (let i = 0; i < (k || 16); i++) { const a = i / (k || 16) * TAU; o.push(V.add(c, V.add(V.mul(t1, Math.cos(a) * r), V.mul(t2, Math.sin(a) * r)))); }
  return o;
}

function drawDecal(g, cam, it, d, L, faceInfo, lw) {
  if (d.when && !d.when()) return;
  if (!decalVisible(cam, it, d)) return;
  const lit = decalLit(it, d, L);
  const col = c => Array.isArray(c) ? (lit ? c[0] : c[1]) : c;
  if (d.k === 'poly') {
    let s = d.pts.map(q => pj(cam, it, q)); if (d.smooth) s = chaikin(s, d.smooth, true);
    if (d.fill) fillPoly(g, s, col(d.fill));
    if (d.lw) ink(g, s, true, lw * d.lw, { seed: 5, wob: .2, color: d.line ? col(d.line) : INK });
  } else if (d.k === 'line') {
    const s = d.pts.map(q => pj(cam, it, q));
    ink(g, d.spline ? spline(s, false, 6) : s, !!d.closed, lw * (d.lw || .5), { seed: d.seed || 9, taper: d.taper === undefined ? 5 : d.taper, color: d.col ? col(d.col) : INK, wob: .15 });
  } else if (d.k === 'circle') {
    const s = circle3(d.c, d.n, d.r, d.seg || 14).map(q => pj(cam, it, q));
    if (d.fill) fillPoly(g, s, col(d.fill));
    if (d.lw) ink(g, s, true, lw * d.lw, { seed: 3, color: d.line ? col(d.line) : INK });
    if (d.dot) { const c = pj(cam, it, d.c); g.fillStyle = col(d.dot); g.beginPath(); g.arc(c[0] - 1, c[1] - 1, Math.max(.6, lw * .3), 0, TAU); g.fill(); }
  } else if (d.k === 'text') {
    const o = pj(cam, it, d.o), u = pj(cam, it, V.add(d.o, d.u)), v = pj(cam, it, V.add(d.o, d.v));
    g.save();
    g.font = d.font;
    const det = (u[0] - o[0]) * (v[1] - o[1]) - (u[1] - o[1]) * (v[0] - o[0]);
    if (det < 0 && !d.vertical) { // seen from behind the plane: keep it readable like a painted decal
      const tw = g.measureText(d.str).width + (d.spacing || 0) * d.str.length;
      g.transform(u[0] - o[0], u[1] - o[1], v[0] - o[0], v[1] - o[1], o[0], o[1]);
      g.translate(tw, 0); g.scale(-1, 1);
    } else g.transform(u[0] - o[0], u[1] - o[1], v[0] - o[0], v[1] - o[1], o[0], o[1]);
    g.fillStyle = col(d.col); g.textBaseline = 'alphabetic';
    if (d.vertical) { let y = 0; for (const ch of d.str) { g.fillText(ch, 0, y); y += d.lh || 1.05; } }
    else { if (d.spacing) { let x = 0; for (const ch of d.str) { g.fillText(ch, x, 0); x += g.measureText(ch).width + d.spacing; } } else g.fillText(d.str, 0, 0); }
    g.restore();
  } else if (d.k === 'fn') d.fn(g, cam, it, L, lit, lw);
}

// Map 2D drawing coordinates onto a plane of the part: local point o + x*u + y*v.
// Returns px-per-unit so callers can keep line widths in screen pixels.
function planeTx(g, cam, it, o, u, v) {
  const a = pj(cam, it, o), b = pj(cam, it, V.add(o, u)), c = pj(cam, it, V.add(o, v));
  g.transform(b[0] - a[0], b[1] - a[1], c[0] - a[0], c[1] - a[1], a[0], a[1]);
  return Math.sqrt(Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])));
}
