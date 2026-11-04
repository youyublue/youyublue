// core.js — maths, colour, camera, convex hulls and the hand-inked stroke.
'use strict';
// All 2D canvases are CPU-backed: under the software GL used for offline
// rendering, large GPU-backed canvases can silently lose their contents.
(() => { const gc = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (t, o) { return t === '2d' ? gc.call(this, t, Object.assign({ willReadFrequently: true }, o || {})) : gc.call(this, t, o); }; })();
const W = 1920, H = 1040, TAU = Math.PI * 2;
const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const ease = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const easeOut = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
const easeIn = t => Math.pow(clamp(t, 0, 1), 2.2);
// anime "slow-in / slow-out" with a longer cushion at the end
const cushion = t => { t = clamp(t, 0, 1); return 1 - Math.pow(1 - Math.pow(t, 1.6), 2.4); };
const ramp = (t, a, b) => ease((t - a) / (b - a));
function env(t, a, b, c, d) { if (t <= a || t >= d) return 0; if (t < b) return ease((t - a) / (b - a)); if (t <= c) return 1; return 1 - ease((t - c) / (d - c)); }

function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hash(n) { n = (n | 0) * 0x27d4eb2d; n = (n ^ (n >>> 15)) * 0x85ebca6b | 0; n = (n ^ (n >>> 13)) * 0xc2b2ae35 | 0; n ^= n >>> 16; return (n >>> 0) / 4294967296; }
const hash2 = (a, b) => hash(a * 73856093 ^ b * 19349663);
function vnoise(x, s) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash(i + s * 1013), hash(i + 1 + s * 1013), u) * 2 - 1; }
function vnoise2(x, y, s) {
  const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const k = s * 7919;
  return lerp(lerp(hash2(i + k, j), hash2(i + 1 + k, j), u), lerp(hash2(i + k, j + 1), hash2(i + 1 + k, j + 1), u), v) * 2 - 1;
}
function fbm2(x, y, s, o) { let a = 0, w = .5; for (let i = 0; i < (o || 4); i++) { a += w * vnoise2(x, y, s + i * 31); x *= 2.03; y *= 2.03; w *= .5; } return a; }

// ---------- colour ----------
const _hexc = {};
function hex(h) { if (_hexc[h]) return _hexc[h]; const c = [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; _hexc[h] = c; return c; }
const toHex = c => '#' + c.map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
function mix(a, b, t) { const A = hex(a), B = hex(b); return toHex([0, 1, 2].map(i => lerp(A[i], B[i], clamp(t, 0, 1)))); }
function rgba(h, a) { const c = hex(h); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; }
function jit(h, r, amt) { const c = hex(h), k = 1 + (r() - .5) * amt, hs = (r() - .5) * amt * 40; return toHex([c[0] * k + hs, c[1] * k, c[2] * k - hs * .6]); }
function mulc(h, k) { const c = hex(h); return toHex(c.map(v => v * k)); }

// ---------- canvases ----------
function canvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }
function ctx2(c) { return c.getContext('2d', { willReadFrequently: false }); }
const LAYERS = {};
function scratch(name, w, h) { let c = LAYERS[name]; if (!c || c.width !== (w || W) || c.height !== (h || H)) { c = LAYERS[name] = canvas(w || W, h || H); c.g = c.getContext('2d'); } c.g.setTransform(1, 0, 0, 1, 0, 0); c.g.globalAlpha = 1; c.g.globalCompositeOperation = 'source-over'; c.g.filter = 'none'; c.g.clearRect(0, 0, c.width, c.height); return c; }

// ---------- vectors / matrices (3x3 rotation + translation) ----------
const V = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  mul: (a, k) => [a[0] * k, a[1] * k, a[2] * k], dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  len: a => Math.hypot(a[0], a[1], a[2]), norm: a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
  lerp: (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)],
};
const M = {
  id: () => ({ r: [1, 0, 0, 0, 1, 0, 0, 0, 1], t: [0, 0, 0] }),
  rot(ax, a) {
    const c = Math.cos(a), s = Math.sin(a);
    if (ax === 'x') return { r: [1, 0, 0, 0, c, -s, 0, s, c], t: [0, 0, 0] };
    if (ax === 'y') return { r: [c, 0, s, 0, 1, 0, -s, 0, c], t: [0, 0, 0] };
    return { r: [c, -s, 0, s, c, 0, 0, 0, 1], t: [0, 0, 0] };
  },
  tr: (x, y, z) => ({ r: [1, 0, 0, 0, 1, 0, 0, 0, 1], t: [x, y, z] }),
  mul(a, b) {
    const r = new Array(9), A = a.r, B = b.r;
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) r[i * 3 + j] = A[i * 3] * B[j] + A[i * 3 + 1] * B[3 + j] + A[i * 3 + 2] * B[6 + j];
    return { r, t: M.ap(a, b.t) };
  },
  ap(m, p) { const r = m.r; return [r[0] * p[0] + r[1] * p[1] + r[2] * p[2] + m.t[0], r[3] * p[0] + r[4] * p[1] + r[5] * p[2] + m.t[1], r[6] * p[0] + r[7] * p[1] + r[8] * p[2] + m.t[2]]; },
  dir(m, p) { const r = m.r; return [r[0] * p[0] + r[1] * p[1] + r[2] * p[2], r[3] * p[0] + r[4] * p[1] + r[5] * p[2], r[6] * p[0] + r[7] * p[1] + r[8] * p[2]]; },
  // basis from three column vectors
  basis(x, y, z, t) { return { r: [x[0], y[0], z[0], x[1], y[1], z[1], x[2], y[2], z[2]], t: t || [0, 0, 0] }; },
  chain(...ms) { return ms.reduce((a, b) => M.mul(a, b)); },
};

// ---------- camera ----------
// f is the focal length in pixels. A long lens keeps perspective gentle, like a
// layout drawn by hand rather than a CG camera.
function makeCam(pos, target, f, o) {
  o = o || {};
  const fwd = V.norm(V.sub(target, pos));
  let right = V.norm(V.cross(fwd, [0, 1, 0]));
  if (o.roll) { const up0 = V.cross(right, fwd); right = V.add(V.mul(right, Math.cos(o.roll)), V.mul(up0, Math.sin(o.roll))); }
  const up = V.cross(right, fwd);
  const cx = W / 2 + (o.sx || 0), cy = H / 2 + (o.sy || 0);
  const cam = {
    o, pos, target, f, fwd, right, up, cx, cy, mirror: false,
    proj(p) {
      const d = [p[0] - pos[0], (cam.mirror ? -p[1] : p[1]) - pos[1], p[2] - pos[2]];
      const z = d[0] * fwd[0] + d[1] * fwd[1] + d[2] * fwd[2];
      const zz = Math.max(z, .05);
      return [cx + f * (d[0] * right[0] + d[1] * right[1] + d[2] * right[2]) / zz, cy - f * (d[0] * up[0] + d[1] * up[1] + d[2] * up[2]) / zz, z];
    },
    // camera-space direction (x right, y up, z into the screen)
    dirc(v) { return [V.dot(v, right), V.dot(v, up), V.dot(v, fwd)]; },
    // clip a world-space polygon against the near plane, then project
    projPoly(P, near) {
      near = near || .6; const z = p => { const y = cam.mirror ? -p[1] : p[1]; return (p[0] - pos[0]) * fwd[0] + (y - pos[1]) * fwd[1] + (p[2] - pos[2]) * fwd[2]; };
      const out = [];
      for (let i = 0; i < P.length; i++) {
        const a = P[i], b = P[(i + 1) % P.length], za = z(a), zb = z(b);
        if (za >= near) out.push(a);
        if ((za >= near) !== (zb >= near)) { const t = (near - za) / (zb - za); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]); }
      }
      if (out.length < 3) return null;
      return out.map(p => { const s = cam.proj(p); return [s[0], s[1]]; });
    },
    front(p, near) { const y = cam.mirror ? -p[1] : p[1]; return (p[0] - pos[0]) * fwd[0] + (y - pos[1]) * fwd[1] + (p[2] - pos[2]) * fwd[2] > (near || .6); },
    scaleAt(p) { const z = V.dot(V.sub(p, pos), fwd); return f / Math.max(z, .05); },
    horizon() { // screen y of the vanishing line of the y=0 plane
      const d = [fwd[0], 0, fwd[2]]; const n = V.norm(d); return cam.proj(V.add(pos, V.mul(n, 1e5)))[1];
    },
    ray(sx, sy) { const x = (sx - cx) / f, y = -(sy - cy) / f; return V.norm(V.add(V.add(fwd, V.mul(right, x)), V.mul(up, y))); },
  };
  return cam;
}
function mirrored(c) { const m = makeCam(c.pos, c.target, c.f, c.o); m.mirror = true; return m; }

// ---------- 2D geometry ----------
function hull(P) {
  const p = P.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  up.pop(); lo.pop(); return lo.concat(up);
}
function polyArea(p) { let a = 0; for (let i = 0; i < p.length; i++) { const q = p[i], r = p[(i + 1) % p.length]; a += q[0] * r[1] - r[0] * q[1]; } return a / 2; }
function centroid(p) { let x = 0, y = 0; for (const q of p) { x += q[0]; y += q[1]; } return [x / p.length, y / p.length]; }
// Re-sample a polyline at roughly even spacing (closed or open).
function resample(p, step, closed) {
  if (p.length < 2) return p.slice();
  const out = [p[0]]; let carry = 0;
  const n = closed ? p.length : p.length - 1;
  for (let i = 0; i < n; i++) {
    const a = p[i], b = p[(i + 1) % p.length];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 1e-6) continue;
    let s = step - carry;
    while (s < L) { const t = s / L; out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); s += step; }
    carry = L - (s - step);
  }
  if (!closed) out.push(p[p.length - 1]);
  else if (out.length > 2) { const l = out[out.length - 1]; if (Math.hypot(l[0] - p[0][0], l[1] - p[0][1]) < step * .5) out.pop(); }
  return out;
}
// Chaikin corner cutting; rounds faceted hulls the way a pencil would.
function chaikin(p, it, closed) {
  for (let k = 0; k < it; k++) {
    const o = []; const n = p.length;
    for (let i = 0; i < (closed ? n : n - 1); i++) {
      const a = p[i], b = p[(i + 1) % n];
      o.push([a[0] * .75 + b[0] * .25, a[1] * .75 + b[1] * .25], [a[0] * .25 + b[0] * .75, a[1] * .25 + b[1] * .75]);
    }
    if (!closed) { o.unshift(p[0]); o.push(p[n - 1]); }
    p = o;
  }
  return p;
}
// Catmull-Rom through points -> dense polyline
function spline(pts, closed, seg) {
  seg = seg || 8; const o = []; const n = pts.length;
  const g = i => closed ? pts[(i + n) % n] : pts[clamp(i, 0, n - 1)];
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
    for (let s = 0; s < seg; s++) {
      const t = s / seg, t2 = t * t, t3 = t2 * t;
      o.push([0, 1].map(k => .5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)));
    }
  }
  if (!closed) o.push(pts[n - 1]);
  return o;
}
function normals(p, closed) {
  const n = p.length, N = new Array(n);
  for (let i = 0; i < n; i++) {
    const a = p[closed ? (i - 1 + n) % n : Math.max(0, i - 1)], b = p[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    N[i] = [dy / l, -dx / l];
  }
  return N;
}
// Hand wobble: tiny low-frequency displacement along the normal.
function wobble(p, amp, seed, closed, freq) {
  if (!amp) return p;
  const N = normals(p, closed); let s = 0; const o = [];
  for (let i = 0; i < p.length; i++) {
    if (i) s += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
    const d = vnoise(s * (freq || .02), seed) * amp;
    o.push([p[i][0] + N[i][0] * d, p[i][1] + N[i][1] * d]);
  }
  return o;
}
function pathPoly(g, p) { g.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) g.lineTo(p[i][0], p[i][1]); g.closePath(); }
function fillPoly(g, p, col) { if (!p || p.length < 3 || p.some(q => !q)) return; g.beginPath(); pathPoly(g, p); g.fillStyle = col; g.fill(); }
function offsetPoly(p, dx, dy) { return p.map(q => [q[0] + dx, q[1] + dy]); }

// ---------- the inked line ----------
// A brush line with pressure: tapered ends, heavier on the shadow side, a little
// irregularity along its length. `o.heavy` is a screen direction that gets the
// thicker line (the side away from the light), like an animator's trace.
const INK = '#2a2231';
function ink(g, pts, closed, w, o) {
  o = o || {};
  if (!pts || pts.length < 2 || w <= 0) return;
  let p = resample(pts, o.step || Math.max(1.5, w * 1.2), closed);
  if (p.length < 2) return;
  if (o.wob) p = wobble(p, o.wob, o.seed || 1, closed, o.wf);
  const n = p.length, N = normals(p, closed);
  // arc length
  const S = [0]; for (let i = 1; i < n; i++) S.push(S[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]));
  const Lt = S[n - 1] + (closed ? Math.hypot(p[0][0] - p[n - 1][0], p[0][1] - p[n - 1][1]) : 0);
  const hv = o.heavy, seed = o.seed || 3, tp = o.taper === undefined ? Math.min(Lt * .3, w * 7) : o.taper;
  const ws = new Array(n);
  for (let i = 0; i < n; i++) {
    let k = 1 + .16 * vnoise(S[i] * .03, seed + 7) + .08 * vnoise(S[i] * .13, seed + 9);
    if (hv) k *= 1 + (o.hk || .45) * (N[i][0] * hv[0] + N[i][1] * hv[1]);
    if (!closed && tp > 0) k *= Math.pow(clamp(Math.min(S[i], Lt - S[i]) / tp, 0, 1), .55) * .85 + .15;
    if (o.wfn) k *= o.wfn(S[i] / Lt, p[i]);
    ws[i] = Math.max(.12, w * k * .5);
  }
  g.beginPath();
  if (closed) {
    g.moveTo(p[0][0] + N[0][0] * ws[0], p[0][1] + N[0][1] * ws[0]);
    for (let i = 1; i < n; i++) g.lineTo(p[i][0] + N[i][0] * ws[i], p[i][1] + N[i][1] * ws[i]);
    g.closePath();
    g.moveTo(p[n - 1][0] - N[n - 1][0] * ws[n - 1], p[n - 1][1] - N[n - 1][1] * ws[n - 1]);
    for (let i = n - 2; i >= 0; i--) g.lineTo(p[i][0] - N[i][0] * ws[i], p[i][1] - N[i][1] * ws[i]);
    g.closePath();
  } else {
    g.moveTo(p[0][0] + N[0][0] * ws[0], p[0][1] + N[0][1] * ws[0]);
    for (let i = 1; i < n; i++) g.lineTo(p[i][0] + N[i][0] * ws[i], p[i][1] + N[i][1] * ws[i]);
    for (let i = n - 1; i >= 0; i--) g.lineTo(p[i][0] - N[i][0] * ws[i], p[i][1] - N[i][1] * ws[i]);
    g.closePath();
  }
  g.fillStyle = o.color || INK; g.fill('nonzero');
}
// Simple thin brush line through points (for hatching, wires, details)
function line(g, pts, w, col, o) { ink(g, pts, false, w, Object.assign({ color: col }, o || {})); }

// ---------- misc drawing ----------
function radial(g, x, y, r, col, a, comp) {
  g.save(); if (comp) g.globalCompositeOperation = comp;
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, rgba(col, a)); gr.addColorStop(.4, rgba(col, a * .45)); gr.addColorStop(1, rgba(col, 0));
  g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); g.restore();
}
function ellipsePts(cx, cy, rx, ry, n, rot) {
  const o = [], c = Math.cos(rot || 0), s = Math.sin(rot || 0);
  for (let i = 0; i < n; i++) { const a = i / n * TAU, x = Math.cos(a) * rx, y = Math.sin(a) * ry; o.push([cx + x * c - y * s, cy + x * s + y * c]); }
  return o;
}
// four-point anime sparkle
function sparkle(g, x, y, s, a, col) {
  if (a <= 0 || s <= 0) return;
  g.save(); g.globalAlpha = a; g.fillStyle = col || '#ffffff';
  g.beginPath();
  g.moveTo(x, y - s); g.quadraticCurveTo(x, y, x + s * .62, y); g.quadraticCurveTo(x, y, x, y + s); g.quadraticCurveTo(x, y, x - s * .62, y); g.quadraticCurveTo(x, y, x, y - s);
  g.fill(); g.restore();
}
