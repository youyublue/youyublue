// paint.js — the background artist. A small 3D layout of the drowned avenue is
// projected with each shot's camera and then painted in gouache: flat washes,
// broken brush daubs, painted edge highlights, atmospheric haze.
'use strict';
const SUN = V.norm([-.26, .29, -.92]);      // direction toward the sun (behind the robot, a little left)
const HAZE = '#d3ecf4';
const SHADE = '#7f8bc9';

// ---------- brushwork ----------
function daubs(g, poly, base, R, o) {
  o = o || {};
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const p of poly) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
  x0 = Math.max(x0, -20); y0 = Math.max(y0, -20); x1 = Math.min(x1, g.canvas.width + 20); y1 = Math.min(y1, g.canvas.height + 20);
  if (x1 <= x0 || y1 <= y0) return;
  const area = (x1 - x0) * (y1 - y0), n = Math.min(o.max || 2500, area / (o.density || 160) | 0);
  const ang = o.ang === undefined ? -Math.PI / 2 : o.ang, len = o.len || 14, wd = o.wd || 4, amt = o.amt || .09;
  g.save(); g.beginPath(); pathPoly(g, poly); g.clip();
  g.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const x = x0 + R() * (x1 - x0), y = y0 + R() * (y1 - y0);
    const a = ang + (R() - .5) * (o.spread || .5), l = len * (.5 + R());
    g.strokeStyle = jit(o.cols ? o.cols[(R() * o.cols.length) | 0] : base, R, amt);
    g.globalAlpha = (o.alpha || .32) * (.5 + R());
    g.lineWidth = wd * (.5 + R());
    g.beginPath(); g.moveTo(x, y);
    g.quadraticCurveTo(x + Math.cos(a) * l * .5 + (R() - .5) * 3, y + Math.sin(a) * l * .5 + (R() - .5) * 3, x + Math.cos(a) * l, y + Math.sin(a) * l);
    g.stroke();
  }
  g.restore();
}
function wash(g, poly, base, R, o) { fillPoly(g, poly, base); daubs(g, poly, base, R, o); }
// a broken painted edge line
function edge(g, a, b, col, w, R, alpha) {
  const n = Math.max(2, Math.hypot(b[0] - a[0], b[1] - a[1]) / 10 | 0);
  g.save(); g.strokeStyle = col; g.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    if (R() < .15) continue;
    const t0 = i / n, t1 = (i + .6 + R() * .5) / n;
    g.globalAlpha = (alpha || .8) * (.6 + .4 * R()); g.lineWidth = w * (.6 + .6 * R());
    g.beginPath(); g.moveTo(lerp(a[0], b[0], t0), lerp(a[1], b[1], t0)); g.lineTo(lerp(a[0], b[0], Math.min(1, t1)), lerp(a[1], b[1], Math.min(1, t1))); g.stroke();
  }
  g.restore();
}
function hazeK(cam, p) { const d = V.len(V.sub(p, cam.pos)); return 1 - Math.exp(-d / 420); }
function shadeOf(c, k) { return mix(c, SHADE, k === undefined ? .34 : k); }
function litOf(c, k) { return mix(c, '#fff6dc', k === undefined ? .3 : k); }

// ---------- sky & clouds ----------
function paintSky(g, cam, hgt, o) {
  o = o || {};
  const hy = cam.horizon();
  const gr = g.createLinearGradient(0, hy - 1500, 0, hy);
  gr.addColorStop(0, '#1f6fd0'); gr.addColorStop(.35, '#3a8fe2'); gr.addColorStop(.7, '#79bdee'); gr.addColorStop(.92, '#b9e0f4'); gr.addColorStop(1, '#dcf1f6');
  const wd = g.canvas.width; g.fillStyle = gr; g.fillRect(0, 0, wd, hgt);
  // sun glow
  const sp = cam.proj(V.add(cam.pos, V.mul(SUN, 5000)));
  if (sp[2] > 0) { radial(g, sp[0], sp[1], 900, '#fff8de', .55); radial(g, sp[0], sp[1], 260, '#ffffff', .6); }
  // brush texture on the sky
  const R = rng(o.seed || 5);
  daubs(g, [[0, 0], [wd, 0], [wd, hgt], [0, hgt]], '#5fa8ea', R, { density: 700, len: 60, wd: 14, alpha: .05, ang: 0, spread: .2, amt: .06, hmax: hgt });
  return sp;
}

// a cumulus: a stack of masses, each a cluster of puffs (x,y,z,r) in world space.
function makeCumulus(seed, base, wid, hgt, dep) {
  const R = rng(seed), masses = [];
  const nm = 3 + (R() * 3 | 0);
  for (let m = 0; m < nm; m++) {
    const t = m / Math.max(1, nm - 1);
    const mw = wid * (1 - .55 * t) * (.75 + .35 * R());
    const cx = base[0] + (R() - .5) * wid * .3 * (1 - t * .5), cy = base[1] + t * hgt * .5;
    const P = [], n = 9 + (R() * 7 | 0);
    for (let i = 0; i < n; i++) {
      const u = (i / (n - 1)) * 2 - 1;
      const r = mw * (.17 + .12 * R()) * (1 - .35 * Math.abs(u));
      P.push([cx + u * mw * .45 + (R() - .5) * mw * .08, cy + r * (.5 + .6 * R()) + (1 - Math.abs(u)) * mw * .08, base[2] + (R() - .5) * dep, r]);
    }
    // a few small knobs on top
    for (let i = 0; i < 4; i++) { const u = (R() - .5) * 1.4; P.push([cx + u * mw * .35, cy + mw * (.18 + .12 * R()), base[2], mw * (.06 + .04 * R())]); }
    masses.push({ P, base: cy });
  }
  masses.sort((a, b) => b.base - a.base); // top masses first, lower ones overlap them
  return { masses, base: base[1], seed, P: masses.flatMap(m => m.P) };
}
function paintCumulus(g, cam, cl, o) {
  o = o || {};
  const R = rng(cl.seed + 99);
  const lsx = lightScreen(cam, SUN);
  const hzk = o.haze || 0;
  const cShadow = mix(o.shadow || '#aab3dc', HAZE, hzk), cDeep = mix('#99a4d4', HAZE, hzk), cMid = mix('#e1e5f4', HAZE, hzk * .6), cLit = mix(o.lit || '#fffdf6', HAZE, hzk * .3);
  const baseY = cam.proj([cl.P[0][0], cl.base, cl.P[0][2]])[1];
  for (const ms of cl.masses) {
    const C = [];
    for (const q of ms.P) { const s = cam.proj([q[0], q[1], q[2]]); if (s[2] < 1) continue; C.push([s[0], s[1], q[3] * cam.f / s[2]]); }
    if (!C.length) continue;
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const c of C) { x0 = Math.min(x0, c[0] - c[2]); x1 = Math.max(x1, c[0] + c[2]); y0 = Math.min(y0, c[1] - c[2]); y1 = Math.max(y1, c[1] + c[2]); }
    const by = Math.min(y1, cam.proj([ms.P[0][0], ms.base, ms.P[0][2]])[1] + (y1 - y0) * .12);
    const pad = 30, cw = Math.ceil(x1 - x0 + pad * 2), ch = Math.ceil(y1 - y0 + pad * 2);
    if (cw < 4 || ch < 4 || cw > 7000 || ch > 5000) continue;
    const cv = canvas(cw, ch), c = cv.getContext('2d');
    c.translate(pad - x0, pad - y0);
    const union = (dx, dy, k, bump) => {
      c.beginPath();
      for (const q of C) {
        const r = q[2] * k; if (r < 1) continue;
        const cx = q[0] + dx * q[2], cy = q[1] + dy * q[2];
        const m = Math.max(12, Math.min(56, r / 2.5 | 0));
        for (let i = 0; i <= m; i++) {
          const a = i / m * TAU, rr = r * (1 + bump * (Math.abs(Math.sin(a * 3 + q[0] * .013)) - .5) + bump * .5 * (Math.abs(Math.sin(a * 7 + q[1] * .02)) - .5));
          const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr; i ? c.lineTo(x, y) : c.moveTo(x, y);
        }
        c.closePath();
      }
    };
    c.fillStyle = cShadow; union(0, 0, 1, .08); c.fill('nonzero');
    c.globalCompositeOperation = 'source-atop';
    c.fillStyle = cDeep; union(-lsx.dx * .2, .42, .95, .08); c.fill('nonzero');
    c.fillStyle = cShadow; union(lsx.dx * .04, .02, .94, .1); c.fill('nonzero');
    if (o.backlit) {
      c.fillStyle = cLit; union(lsx.dx * .34, -.4, .72, .1); c.fill('nonzero');
    } else {
      c.fillStyle = cMid; union(lsx.dx * .12, -.16, .92, .1); c.fill('nonzero');
      c.fillStyle = cLit; union(lsx.dx * .2, -.32, .82, .12); c.fill('nonzero');
    }
    // gouache texture: short strokes that follow the forms
    for (let i = 0; i < Math.min(1400, C.length * 70); i++) {
      const q = C[(R() * C.length) | 0]; const a = R() * TAU, rr = Math.sqrt(R()) * q[2];
      const x = q[0] + Math.cos(a) * rr, y = q[1] + Math.sin(a) * rr;
      c.globalAlpha = .07; c.strokeStyle = R() < .5 ? '#ffffff' : cDeep; c.lineWidth = 2 + R() * 5; c.lineCap = 'round';
      c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + q[2] * .1, y - 3, x + q[2] * .22 * (.5 + R()), y + (R() - .5) * 3); c.stroke();
    }
    c.globalAlpha = 1;
    // the underside dissolves softly
    c.globalCompositeOperation = 'destination-out';
    const gr = c.createLinearGradient(0, by - 14, 0, by + 26); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.9)');
    c.fillStyle = gr; c.fillRect(x0 - pad, by - 14, cw, y1 - by + 200);
    g.save(); g.filter = 'blur(.5px)'; g.drawImage(cv, x0 - pad, y0 - pad); g.restore();
  }
  // a soft haze along the base of the whole cloud
  const gr = g.createLinearGradient(0, baseY - 60, 0, baseY + 40); gr.addColorStop(0, rgba(HAZE, 0)); gr.addColorStop(1, rgba(HAZE, .5 * (1 - hzk)));
}
// long thin cirrus / veil strokes
function paintWisps(g, R, x0, y0, x1, y1, n, col, a) {
  g.save(); g.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const x = x0 + R() * (x1 - x0), y = y0 + R() * (y1 - y0), l = 80 + R() * 260;
    g.strokeStyle = col; g.globalAlpha = a * (.4 + .6 * R()); g.lineWidth = 3 + R() * 10;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + l * .5, y - 6 - R() * 10, x + l, y + (R() - .5) * 8); g.stroke();
  }
  g.restore();
}

// ---------- city layout (world space) ----------
const STREET_Y = -3.8;
function cityModel() {
  const R = rng(2024), B = [];
  const pal = ['#ebe5d6', '#e2d6bd', '#d6d9dd', '#efe3c4', '#d7c3a5', '#c5d5cf', '#e9dccf', '#cfc6be', '#c99a7e', '#e6e0cf', '#dfe7e2', '#f0e9d8'];
  const signs = ['喫茶', '薬', 'ラーメン', '歯科', '不動産', '本', '理容', 'ホテル', '酒', 'カラオケ', '質', '眼鏡', '診療所', '中華', '銭湯', 'そば', '写真', '珈琲', '古書', '内科', '花', '米'];
  let si = 0;
  const mk = (xa, xb, za, zb, h, street) => {
    const kind = R() < .45 ? 'mansion' : R() < .6 ? 'office' : 'shop';
    B.push({ xa: Math.min(xa, xb), xb: Math.max(xa, xb), za: Math.min(za, zb), zb: Math.max(za, zb), h, col: pal[(R() * pal.length) | 0], kind, seed: (R() * 1e6) | 0, ivy: R(), roofTree: R() < .45, sign: signs[si++ % signs.length], sign2: signs[(si * 7) % signs.length], floor: 3 + R() * .5, street });
  };
  const hgt = far => (R() < .15 ? 36 + R() * 22 : 10 + R() * 22) * (far ? 1.2 : 1);
  // the avenue, behind the robot (-z) and across the plaza (+z)
  for (const dirz of [-1, 1]) for (const s of [-1, 1]) {
    let z = dirz < 0 ? -6 - R() * 2 : 25 + R() * 2;
    while (Math.abs(z) < 330) {
      const wz = 9 + R() * 14, x0 = s * (14 + R() * 1.5), d = 14 + R() * 10;
      mk(x0, x0 + s * d, z, z + dirz * wz, hgt(Math.abs(z) > 150), s < 0 ? '+x' : '-x');
      z += dirz * (wz + (R() < .2 ? 4 + R() * 6 : .3));
    }
  }
  // the cross street through the plaza (along x)
  for (const s of [-1, 1]) for (const side of [-1, 1]) {
    let x = s * (31 + R() * 3);
    while (Math.abs(x) < 160) {
      const wx = 10 + R() * 14, zf = side < 0 ? -5.5 - R() : 24.5 + R(), d = 14 + R() * 8;
      mk(x, x + s * wx, zf, zf + side * d, hgt(Math.abs(x) > 90) * .9, side < 0 ? '+z' : '-z');
      x += s * (wx + .4);
    }
  }
  const T = [];
  for (const dirz of [-1, 1]) for (const s of [-1, 1]) for (let z = dirz < 0 ? -14 - R() * 10 : 30 + R() * 10; Math.abs(z) < 220; z += dirz * (30 + R() * 45)) T.push({ x: s * (12.2 + R() * 1.2), z: z - R() * 5, h: 6 + R() * 8, r: 2.6 + R() * 2.6, seed: (R() * 1e6) | 0 });
  T.push({ x: -19, z: 14, h: 11, r: 5.5, seed: 4 }, { x: 19, z: 18, h: 9, r: 4.5, seed: 5 }, { x: -9, z: -8, h: 6, r: 3, seed: 6 }, { x: 24, z: -3, h: 8, r: 4, seed: 8 });
  const P = [];
  for (const dirz of [-1, 1]) for (const s of [-1, 1]) for (let z = dirz < 0 ? -4 : 26; Math.abs(z) < 260; z += dirz * (24 + R() * 6)) P.push({ x: s * (11.6 + R() * .5), z, lean: (R() - .5) * .16 + s * .03, lz: (R() - .5) * .08, h: 10.5 + R() * 1.5, line: dirz });
  return { B, T, P };
}
const CITY = cityModel();

// ---------- painting the city ----------
function quadS(cam, a, b, c, d) { return cam.projPoly([a, b, c, d]); }
const FACES = ['-x', '+x', '-z', '+z'];
const FN = { '-x': [-1, 0, 0], '+x': [1, 0, 0], '-z': [0, 0, -1], '+z': [0, 0, 1] };
// point on a face: u runs left->right as seen from outside, v up, out = offset along the normal
function facePt(b, face, u, v, out) {
  out = out || 0;
  if (face === '-x') return [b.xa - out, v, b.za + u];
  if (face === '+x') return [b.xb + out, v, b.zb - u];
  if (face === '-z') return [b.xb - u, v, b.za - out];
  return [b.xa + u, v, b.zb + out];
}
function faceLen(b, face) { return face[1] === 'x' ? b.zb - b.za : b.xb - b.xa; }
function facadeQuad(cam, b, face) { const L = faceLen(b, face); return quadS(cam, facePt(b, face, 0, 0), facePt(b, face, L, 0), facePt(b, face, L, b.h), facePt(b, face, 0, b.h)); }

function paintBuilding(g, cam, b, o) {
  const R = rng(b.seed);
  const ctr = [(b.xa + b.xb) / 2, b.h / 2, (b.za + b.zb) / 2];
  const hz = hazeK(cam, ctr);
  const camPos = cam.mirror ? [cam.pos[0], -cam.pos[1], cam.pos[2]] : cam.pos;
  for (const face of FACES) {
    const n = FN[face], L = faceLen(b, face);
    const fc = facePt(b, face, L / 2, b.h / 2);
    if (V.dot(n, V.sub(camPos, fc)) <= 0) continue;
    const lam = V.dot(n, SUN);
    const lit = lam > .05;
    let base = lit ? litOf(b.col, .2 + lam * .35) : shadeOf(b.col, .3);
    base = mix(base, HAZE, hz);
    const q = facadeQuad(cam, b, face); if (!q) continue;
    const qq = wobble(resample(q, 30, true), .8, b.seed % 97, true, .05);
    wash(g, qq, base, R, { density: 110, len: 16, wd: 5, alpha: .28, amt: .08, ang: -Math.PI / 2, spread: .25 });
    g.save(); g.beginPath(); pathPoly(g, qq); g.clip();
    if (cam.front(facePt(b, face, 0, b.h)) && cam.front(facePt(b, face, 0, 0))) {
      const top = cam.proj(facePt(b, face, 0, b.h)), bot = cam.proj(facePt(b, face, 0, 0));
      const gr = g.createLinearGradient(0, top[1], 0, bot[1]);
      gr.addColorStop(0, rgba('#ffffff', lit ? .16 : .1)); gr.addColorStop(.6, rgba('#ffffff', 0)); gr.addColorStop(1, rgba('#6fb7c8', .22));
      g.fillStyle = gr; g.fillRect(-100, Math.min(top[1], bot[1]) - 50, W + 200, Math.abs(bot[1] - top[1]) + 100);
    }
    g.restore();
    paintFacadeDetail(g, cam, b, face, base, lit, hz, R);
    if (!cam.front(facePt(b, face, 0, 0)) || !cam.front(facePt(b, face, L, b.h))) continue;
    const e0 = cam.proj(facePt(b, face, 0, 0)), e1 = cam.proj(facePt(b, face, 0, b.h)), f0 = cam.proj(facePt(b, face, L, b.h));
    const pk = cam.f / Math.max(10, V.len(V.sub(fc, cam.pos)));
    edge(g, [e1[0], e1[1]], [f0[0], f0[1]], mix('#fffbea', HAZE, hz * .5), clamp(3 * pk * .6, 1, 5), R, .85);
    if (!lit) edge(g, [e0[0], e0[1]], [e1[0], e1[1]], mix('#fff3d6', HAZE, hz * .5), clamp(2.2 * pk * .6, .8, 4), R, .6);
  }
  if (cam.front([b.xa, b.h, b.za]) && cam.front([b.xb, b.h, b.zb]) && cam.front([b.xa, b.h, b.zb]) && cam.front([b.xb, b.h, b.za])) paintRoof(g, cam, b, hz, R);
}

function paintFacadeDetail(g, cam, b, face, base, lit, hz, R) {
  const L = faceLen(b, face), fl = b.floor, nf = Math.max(1, Math.floor(b.h / fl));
  const dist = V.len(V.sub(facePt(b, face, L / 2, b.h / 2), cam.pos));
  const pxm = cam.f / dist; // pixels per metre
  const winW = b.kind === 'office' ? 1.8 : 1.4, gap = b.kind === 'office' ? .5 : 1.3;
  const nw = Math.max(1, Math.floor((L - 1) / (winW + gap)));
  const off = (L - nw * (winW + gap) + gap) / 2;
  const glass = mix(lit ? '#5c86b4' : '#4a6aa6', HAZE, hz * .85), glassHi = mix('#bfe4f6', HAZE, hz * .6);
  const frame = mix(lit ? '#fbf4e2' : '#c9cde6', HAZE, hz * .6);
  const balc = b.kind === 'mansion';
  const P = (u, v, out) => { const q = facePt(b, face, u, v, out); if (!cam.front(q)) return null; const s = cam.proj(q); return [s[0], s[1]]; };
  const quad = (u0, v0, u1, v1, out) => cam.projPoly([facePt(b, face, u0, v0, out), facePt(b, face, u1, v0, out), facePt(b, face, u1, v1, out), facePt(b, face, u0, v1, out)]);
  if (![[0, 0], [L, 0], [0, b.h], [L, b.h]].every(([u, v]) => cam.front(facePt(b, face, u, v, 1.2), 1.2) && cam.front(facePt(b, face, u, v, 0), 1.2))) { if (b.ivy > .25) paintIvy(g, cam, b, face, L, hz, R, pxm); return; }
  const shopTop = 4.2;
  for (let f = 1; f < nf; f++) {
    if (!balc && pxm > 3) { const sp = quad(0, f * fl - .1, L, f * fl + .25, .02); if (sp) { g.globalAlpha = .5; fillPoly(g, sp, mix(lit ? '#fff9ec' : '#c3c8e4', HAZE, hz * .6)); g.globalAlpha = 1; } }
    const v0 = f * fl + .7, v1 = v0 + fl * .55;
    if (v1 > b.h - .6) break;
    for (let i = 0; i < nw; i++) {
      const u0 = off + i * (winW + gap), u1 = u0 + winW;
      const wq = quad(u0, v0, u1, v1, -.01); if (!wq) continue;
      const gc = jit(glass, R, .14);
      { const gy0 = Math.min(...wq.map(q => q[1])), gy1 = Math.max(...wq.map(q => q[1])); const gr = g.createLinearGradient(0, gy1, 0, gy0); gr.addColorStop(0, mulc(gc, .78)); gr.addColorStop(1, mix(gc, glassHi, .35)); g.fillStyle = gr; g.beginPath(); pathPoly(g, wq); g.fill(); }
      if (pxm > 5) { const sl = quad(u0 - .1, v0 - .14, u1 + .1, v0, .06); if (sl) fillPoly(g, sl, frame); }
      if (pxm > 4 && R() < .3) { const st = quad(u0 + winW * R(), v0 - 1.2 - R(), u0 + winW * R() + .12, v0 - .15, .005); if (st) { g.globalAlpha = .12; fillPoly(g, st, '#5b5f80'); g.globalAlpha = 1; } }
      if (pxm > 4) {
        // sky reflection streak and frame
        g.save(); g.beginPath(); pathPoly(g, wq); g.clip();
        g.globalAlpha = .55; fillPoly(g, [P(u0, v1, 0), P(lerp(u0, u1, .45), v1, 0), P(u0 + winW * .1, v0, 0), P(u0 - winW * .3, v0, 0)], glassHi);
        g.restore();
        if (pxm > 9) { g.strokeStyle = frame; g.globalAlpha = .9; g.lineWidth = Math.max(.6, pxm * .06); g.beginPath(); pathPoly(g, wq); g.stroke(); g.globalAlpha = 1; }
        if (R() < .25) { // curtain
          fillPoly(g, quad(u0 + winW * .55, v0 + .05, u1 - .05, v1 - .05, -.005), mix(['#f2d6a8', '#e9b9a0', '#f4f0e6', '#b8d3c6'][(R() * 4) | 0], HAZE, hz * .7));
        }
      }
    }
    if (balc) { // balcony slab + railing
      const vb = f * fl;
      const slab = quad(0, vb, L, vb + .22, .9);
      fillPoly(g, slab, mix(lit ? '#fbf6ea' : '#d3d6ea', HAZE, hz * .6));
      const rail = quad(0, vb + .22, L, vb + 1.05, .95);
      g.save(); g.globalAlpha = .55; fillPoly(g, rail, mix(lit ? '#f2efe6' : '#b9bfdc', HAZE, hz * .6)); g.restore();
      if (pxm > 6) {
        g.strokeStyle = mix('#8a91b8', HAZE, hz); g.lineWidth = Math.max(.5, pxm * .03); g.globalAlpha = .7;
        g.beginPath(); for (let u = .3; u < L; u += .35) { const a = P(u, vb + .22, .95), c = P(u, vb + 1.05, .95); g.moveTo(a[0], a[1]); g.lineTo(c[0], c[1]); } g.stroke(); g.globalAlpha = 1;
        const top = [P(0, vb + 1.05, .95), P(L, vb + 1.05, .95)]; edge(g, top[0], top[1], mix('#ffffff', HAZE, hz * .5), Math.max(.8, pxm * .07), R, .9);
        // shadow under the slab
        fillPoly(g, quad(0, vb - .35, L, vb, .02), rgba('#5a63a8', .25));
      }
      // AC units, laundry, plants
      for (let i = 0; i < nw; i++) {
        const u = off + i * (winW + gap) + winW + gap * .5;
        if (R() < .45 && u < L - .5) {
          const ac = quad(u - .4, vb + .25, u + .4, vb + .85, 1.0); fillPoly(g, ac, mix(lit ? '#f4f1e8' : '#c7cbe2', HAZE, hz * .6));
          if (pxm > 8) { const c = P(u, vb + .55, 1.01); g.fillStyle = mix('#8a8fae', HAZE, hz); g.beginPath(); g.arc(c[0], c[1], pxm * .2, 0, TAU); g.fill(); }
        }
        if (R() < .3 && pxm > 3) { // laundry on a pole
          const u0 = off + i * (winW + gap) + .1;
          const lc = [P(u0, vb + 2.2, .7), P(u0 + winW, vb + 2.2, .7)];
          g.strokeStyle = mix('#9aa0c0', HAZE, hz); g.lineWidth = Math.max(.5, pxm * .03); g.beginPath(); g.moveTo(...lc[0]); g.lineTo(...lc[1]); g.stroke();
          for (let k = 0; k < 3; k++) {
            const uu = u0 + .15 + k * (winW - .3) / 2.5, ww = .3 + R() * .25, hh = .5 + R() * .5;
            const cl = ['#ffffff', '#f6b6b0', '#9fd0f0', '#f7e07a', '#f2f2f2', '#c8b6e8'][(R() * 6) | 0];
            fillPoly(g, quad(uu, vb + 2.2 - hh, uu + ww, vb + 2.2, .72), mix(lit ? cl : shadeOf(cl, .25), HAZE, hz * .6));
          }
        }
        if (R() < .25 && pxm > 3) { // potted plants
          const c = P(u - .2, vb + 1.15, 1.0); paintFoliageBlob(g, c[0], c[1], pxm * (.4 + R() * .3), R, hz, 1);
        }
      }
    }
  }
  // shop sign band above the water line and vertical signboards
  if (b.kind !== 'office' || R() < .5) {
    const sb = quad(.3, shopTop - 1.0, L - .3, shopTop, .3);
    const sc = ['#f6f1e4', '#f2cf4a', '#3a78c2', '#e45b48', '#5aa36a', '#f4f4f4'][(b.seed >> 3) % 6];
    fillPoly(g, sb, mix(lit ? sc : shadeOf(sc, .22), HAZE, hz * .7));
    if (pxm > 3) signText(g, cam, b, face, .9, shopTop - .15, Math.min(.85, (L - 1) / Math.max(2, b.sign2.length)), b.sign2, sc, hz, false);
  }
  if (face === b.street && b.h > 12 && cam.front(facePt(b, face, 1.2, 0, 2))) { // tategaki sign hanging off the corner, perpendicular to the street
    const u = 1.2, hgt = Math.min(b.h - 4, 4 + b.sign.length * 1.6), v0 = Math.min(b.h - 1.5, 6 + hgt);
    const a = cam.proj(facePt(b, face, u, v0, .2)), c = cam.proj(facePt(b, face, u, v0, 1.6)), d = cam.proj(facePt(b, face, u, v0 - hgt, 1.6)), e = cam.proj(facePt(b, face, u, v0 - hgt, .2));
    const sc = ['#f6f1e4', '#e5463b', '#f4cd3a', '#2f6fb7', '#ffffff', '#3d9a62'][(b.seed >> 5) % 6];
    const qp = [[a[0], a[1]], [c[0], c[1]], [d[0], d[1]], [e[0], e[1]]];
    fillPoly(g, qp, mix(lit ? sc : shadeOf(sc, .15), HAZE, hz * .6));
    const ed = mix('#2a2231', HAZE, hz * .7); g.strokeStyle = ed; g.lineWidth = Math.max(.6, pxm * .05); g.beginPath(); pathPoly(g, qp); g.stroke();
    if (pxm > 2.5) {
      const tc = (sc === '#f6f1e4' || sc === '#ffffff' || sc === '#f4cd3a') ? '#c43a2e' : '#ffffff';
      const n = b.sign.length, step = hgt / (n + .4);
      g.fillStyle = mix(tc, HAZE, hz * .6);
      for (let i = 0; i < n; i++) {
        const p = cam.proj(facePt(b, face, u, v0 - step * (i + .85), .9));
        const fs = step * .78 * pxm;
        g.font = `700 ${fs.toFixed(1)}px ${FJP}`; g.textAlign = 'center';
        g.fillText(b.sign[i], p[0], p[1] + fs * .35);
      }
      g.textAlign = 'left';
    }
  }
  // ivy climbing from the water
  if (b.ivy > .25) paintIvy(g, cam, b, face, L, hz, R, pxm);
}
function signText(g, cam, b, face, u, v, sz, str, bg, hz) {
  const dark = ['#f6f1e4', '#f2cf4a', '#f4f4f4'].includes(bg);
  g.save(); g.fillStyle = mix(dark ? '#2b2a3a' : '#ffffff', HAZE, hz * .6);
  const pa = cam.proj(facePt(b, face, u, v, .35)), pb = cam.proj(facePt(b, face, u + 1, v, .35));
  if (pb[0] < pa[0]) str = [...str].reverse().join('');
  for (let i = 0; i < str.length; i++) {
    const q3 = facePt(b, face, u + i * sz * 1.1 + sz * .5, v - sz * .1, .35); if (!cam.front(q3, 2)) continue;
    const p = cam.proj(q3);
    const fs = sz * cam.f / p[2];
    g.font = `700 ${fs.toFixed(1)}px ${FJP}`; g.textAlign = 'center'; g.fillText(str[i], p[0], p[1]);
  }
  g.restore();
}

// a cluster of leafy clumps (gouache foliage)
function paintFoliageBlob(g, x, y, r, R, hz, k, light) {
  const L = light || [-.5, -.85];
  const lit = mix('#a9d35b', HAZE, hz * .7), mid = mix('#5fa846', HAZE, hz * .7), dk = mix('#2f7d63', HAZE, hz * .6), deep = mix('#235f5e', HAZE, hz * .5);
  const n = Math.max(3, Math.min(14, r / 3 | 0));
  const C = [];
  for (let i = 0; i < n; i++) { const a = R() * TAU, d = Math.sqrt(R()) * r * .7; C.push([x + Math.cos(a) * d, y + Math.sin(a) * d * .8, r * (.35 + .3 * R())]); }
  const leafy = (cx, cy, rr, col, off) => {
    g.fillStyle = col; g.beginPath();
    const m = Math.max(6, Math.min(26, rr / 1.5 | 0));
    for (let i = 0; i <= m; i++) { const a = i / m * TAU, rad = rr * (.86 + .22 * Math.abs(Math.sin(a * 3.5 + off))) * (1 + (R() - .5) * .12); const px = cx + Math.cos(a) * rad, py = cy + Math.sin(a) * rad; i ? g.lineTo(px, py) : g.moveTo(px, py); }
    g.fill();
  };
  for (const c of C) leafy(c[0], c[1], c[2] * 1.08, deep, R() * 6);
  for (const c of C) leafy(c[0] + L[0] * c[2] * .12, c[1] + L[1] * c[2] * .12, c[2] * .92, dk, R() * 6);
  for (const c of C) leafy(c[0] + L[0] * c[2] * .3, c[1] + L[1] * c[2] * .3, c[2] * .66, mid, R() * 6);
  for (const c of C) if (R() < .8) leafy(c[0] + L[0] * c[2] * .5, c[1] + L[1] * c[2] * .5, c[2] * .36, lit, R() * 6);
  if (r > 10) { // leaf daubs on the edges
    g.save();
    for (let i = 0; i < r * 2.2; i++) { const c = C[(R() * C.length) | 0], a = R() * TAU; const px = c[0] + Math.cos(a) * c[2] * 1.02, py = c[1] + Math.sin(a) * c[2] * .95;
      g.fillStyle = R() < .5 ? (Math.sin(a) < 0 ? lit : mid) : dk; g.beginPath(); g.ellipse(px, py, 1.4 + R() * r * .05, .8 + R() * r * .03, a, 0, TAU); g.fill(); }
    g.restore();
  }
}

function paintIvy(g, cam, b, face, L, hz, R, pxm) {
  const P = (u, v) => { const q = facePt(b, face, u, v, .2); if (!cam.front(q)) return null; const s = cam.proj(q); return [s[0], s[1]]; };
  const ivyCol = mix('#4f9a4c', HAZE, hz * .65), ivyLit = mix('#8fc653', HAZE, hz * .65), ivyDk = mix('#2c6e5c', HAZE, hz * .6);
  const n = Math.max(2, L / 6 | 0);
  for (let i = 0; i < n; i++) {
    if (R() > b.ivy) continue;
    const uc = (i + R()) / n * L, wd = 2 + R() * 5, top = Math.min(b.h - .5, 2 + R() * R() * b.h * .6);
    const pts3 = [];
    const m = 14;
    for (let k = 0; k <= m; k++) { const t = k / m, u = uc - wd / 2 + wd * t; const hh = top * Math.pow(Math.sin(t * Math.PI), .6) * (.7 + .5 * hash(i * 31 + k)); pts3.push(facePt(b, face, clamp(u, 0, L), hh, .2)); }
    pts3.push(facePt(b, face, clamp(uc + wd / 2, 0, L), -.3, .2), facePt(b, face, clamp(uc - wd / 2, 0, L), -.3, .2));
    const poly = cam.projPoly(pts3); if (!poly || poly.length < 4) continue;
    fillPoly(g, poly, ivyDk);
    daubs(g, poly, ivyCol, R, { cols: [ivyCol, ivyLit, ivyDk, ivyCol], density: 14, len: Math.max(2, pxm * .5), wd: Math.max(1.5, pxm * .35), alpha: .8, spread: 6, amt: .1, max: 1500 });
    // leafy scallops along the top edge
    for (let k = 1; k < m; k += 1) { const c = P(clamp(uc - wd / 2 + wd * k / m, 0, L), top * Math.pow(Math.sin(k / m * Math.PI), .6) * (.7 + .5 * hash(i * 31 + k))); if (c) paintFoliageBlob(g, c[0], c[1], Math.max(1.5, pxm * (.5 + R() * .5)), R, hz, 1); }
  }
  // hanging vines from the roof edge
  if (pxm > 2) {
    g.save(); g.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      if (R() > b.ivy * .8) continue;
      const u = R() * L, v0 = b.h - .2, len = 1.5 + R() * b.h * .35;
      const a = P(u, v0), c = P(u + (R() - .5) * .8, v0 - len); if (!a || !c) continue;
      g.strokeStyle = R() < .5 ? ivyCol : ivyDk; g.lineWidth = Math.max(.8, pxm * .12);
      g.beginPath(); g.moveTo(a[0], a[1]); g.quadraticCurveTo(lerp(a[0], c[0], .5) + (R() - .5) * pxm, lerp(a[1], c[1], .5), c[0], c[1]); g.stroke();
      for (let k = 0; k < len * 2.5; k++) { const t = Math.pow(R(), .7), px = lerp(a[0], c[0], t), py = lerp(a[1], c[1], t); g.fillStyle = R() < .45 ? ivyLit : R() < .5 ? ivyCol : ivyDk; g.beginPath(); g.ellipse(px + (R() - .5) * pxm * .5, py, pxm * .24 * (1.2 - t), pxm * .16 * (1.2 - t), R() * 3, 0, TAU); g.fill(); }
      const tp = P(u, v0); if (tp) paintFoliageBlob(g, tp[0], tp[1], pxm * (.8 + R()), R, hz, 1);
    }
    g.restore();
  }
}
function paintRoof(g, cam, b, hz, R) {
  const ctr = [(b.xa + b.xb) / 2, b.h, (b.za + b.zb) / 2];
  const pxm = cam.f / V.len(V.sub(ctr, cam.pos));
  const rp = () => [lerp(b.xa + 1, b.xb - 1, R()), b.h, lerp(b.za + 1, b.zb - 1, R())];
  if (R() < .5) {
    const p = cam.proj(rp());
    const w = 2.4 * pxm, hgt = 2.2 * pxm;
    const col = mix(R() < .5 ? '#d8dbe9' : '#9fb0d2', HAZE, hz);
    fillPoly(g, [[p[0] - w / 2, p[1]], [p[0] + w / 2, p[1]], [p[0] + w / 2, p[1] - hgt], [p[0] - w / 2, p[1] - hgt]], col);
    fillPoly(g, ellipsePts(p[0], p[1] - hgt, w / 2, w / 8, 12), mix('#f6f6fb', HAZE, hz));
  }
  if (R() < .35 && b.h > 15) {
    const f = b.street || '+x', L = faceLen(b, f);
    const p = cam.proj(facePt(b, f, 1, b.h, -1.5)), q = cam.proj(facePt(b, f, Math.min(L - 1, 9), b.h, -1.5));
    const hh = 3.2 * pxm;
    fillPoly(g, [[p[0], p[1] - hh * .3], [q[0], q[1] - hh * .3], [q[0], q[1] - hh * 1.3], [p[0], p[1] - hh * 1.3]], mix(['#f5e7b8', '#e8f0f4', '#f3c6b8'][b.seed % 3], HAZE, hz * .8));
    g.strokeStyle = mix('#7a7f9e', HAZE, hz); g.lineWidth = Math.max(.6, pxm * .1);
    g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(p[0], p[1] - hh * .3); g.moveTo(q[0], q[1]); g.lineTo(q[0], q[1] - hh * .3); g.stroke();
  }
  if (b.roofTree) {
    for (let k = 0; k < 2 + (R() * 3 | 0); k++) {
      const p = cam.proj(rp());
      const r = (2.5 + R() * 3) * pxm;
      paintFoliageBlob(g, p[0], p[1] - r * .55, r, R, hz, 1);
    }
  }
}
function paintTree(g, cam, t) {
  const R = rng(t.seed);
  if (!cam.front([t.x, 0, t.z], 2)) return;
  const base = cam.proj([t.x, 0, t.z]), top = cam.proj([t.x, t.h, t.z]);
  const pxm = cam.f / Math.max(1, base[2]);
  const hz = hazeK(cam, [t.x, t.h / 2, t.z]);
  // trunk
  const tw = Math.max(1.5, .45 * pxm);
  g.fillStyle = mix('#6b5a66', HAZE, hz * .7);
  g.beginPath(); g.moveTo(base[0] - tw, base[1]); g.quadraticCurveTo(base[0] - tw * .5, lerp(base[1], top[1], .5), top[0] - tw * .3, lerp(base[1], top[1], .7)); g.lineTo(top[0] + tw * .3, lerp(base[1], top[1], .7)); g.quadraticCurveTo(base[0] + tw * .6, lerp(base[1], top[1], .5), base[0] + tw, base[1]); g.fill();
  const up = top[1] < base[1] ? -1 : 1; // mirrored views flip
  const rr = t.r * pxm;
  for (let k = 0; k < 5; k++) {
    const cx = lerp(base[0], top[0], .9) + (R() - .5) * rr * 1.2, cy = lerp(base[1], top[1], .78 + R() * .25);
    paintFoliageBlob(g, cx, cy, rr * (.55 + R() * .35), R, hz, 1, [-.45, -.85 * up]);
  }
}

function paintPole(g, cam, p, Rr) {
  const R = rng((p.z * 100 | 0) + 7);
  const top = [p.x + Math.sin(p.lean) * p.h, p.h, p.z + Math.sin(p.lz) * p.h];
  const a = cam.proj([p.x, -.2, p.z]), b = cam.proj(top);
  if (a[2] < 1) return null;
  const pxm = cam.f / a[2], hz = hazeK(cam, top);
  const w = Math.max(1, .32 * pxm);
  const col = mix('#8a8aa2', HAZE, hz * .8), lit = mix('#e6e6f0', HAZE, hz * .6);
  const nx = -(b[1] - a[1]), ny = b[0] - a[0], nl = Math.hypot(nx, ny) || 1;
  const q = [[a[0] + nx / nl * w, a[1] + ny / nl * w], [b[0] + nx / nl * w * .7, b[1] + ny / nl * w * .7], [b[0] - nx / nl * w * .7, b[1] - ny / nl * w * .7], [a[0] - nx / nl * w, a[1] - ny / nl * w]];
  fillPoly(g, q, col);
  fillPoly(g, [q[0], q[1], [lerp(q[1][0], q[2][0], .35), lerp(q[1][1], q[2][1], .35)], [lerp(q[0][0], q[3][0], .35), lerp(q[0][1], q[3][1], .35)]], lit);
  if (pxm > 4) ink(g, q, true, Math.max(.6, Math.min(1.8, pxm * .05)), { color: mix(INK, HAZE, hz), taper: 0 });
  // cross arms and transformer
  const arms = [];
  for (const k of [.93, .82]) {
    const c = [lerp(p.x, top[0], k), lerp(-.2, top[1], k), lerp(p.z, top[2], k)];
    if (!cam.front([c[0] - 1.1, c[1], c[2]]) || !cam.front([c[0] + 1.1, c[1], c[2]])) { arms.push(c); continue; }
    const A = [cam.proj([c[0] - 1.1, c[1], c[2]]), cam.proj([c[0] + 1.1, c[1], c[2]])];
    g.strokeStyle = col; g.lineWidth = Math.max(.8, .16 * pxm); g.beginPath(); g.moveTo(A[0][0], A[0][1]); g.lineTo(A[1][0], A[1][1]); g.stroke();
    arms.push([c[0], c[1], c[2]]);
  }
  if (pxm > 3) {
    const c = cam.proj([lerp(p.x, top[0], .72), lerp(0, p.h, .72), lerp(p.z, top[2], .72)]);
    const tw = .55 * pxm, th = 1.1 * pxm;
    fillPoly(g, [[c[0] + w, c[1] - th / 2], [c[0] + w + tw, c[1] - th / 2], [c[0] + w + tw, c[1] + th / 2], [c[0] + w, c[1] + th / 2]], mix('#b7bccf', HAZE, hz * .8));
    fillPoly(g, [[c[0] + w, c[1] - th / 2], [c[0] + w + tw * .35, c[1] - th / 2], [c[0] + w + tw * .35, c[1] + th / 2], [c[0] + w, c[1] + th / 2]], mix('#eef0f6', HAZE, hz * .6));
    // vines up the pole
    if (R() < .6) for (let k = 0; k < 3; k++) { const t = R() * .25; const px = lerp(a[0], b[0], t), py = lerp(a[1], b[1], t); paintFoliageBlob(g, px + (R() - .5) * w * 2, py, Math.max(2, pxm * (.5 + R() * .5)), R, hz, 1); }
  }
  return { top, arms };
}

// sagging wires between consecutive poles
function paintWires(g, cam, poles) {
  for (let i = 0; i + 1 < poles.length; i++) {
    const A = poles[i], B = poles[i + 1]; if (!A || !B) continue;
    for (let k = 0; k < Math.min(A.arms.length, B.arms.length); k++) for (const off of [-.9, 0, .9]) {
      const a = V.add(A.arms[k], [off, 0, 0]), b = V.add(B.arms[k], [off, 0, 0]);
      const pts = [];
      const sag = .7 + k * .35 + hash((i * 7 + k * 3) + off * 10) * .5;
      for (let j = 0; j <= 20; j++) { const t = j / 20; const p = V.lerp(a, b, t); p[1] -= (4 * t * (1 - t)) * sag; if (!cam.front(p, 1)) { if (pts.length) break; else continue; } const s = cam.proj(p); pts.push([s[0], s[1]]); }
      if (pts.length < 21) continue;
      const span = Math.hypot(pts[20][0] - pts[0][0], pts[20][1] - pts[0][1]);
      const sagPx = Math.hypot(pts[10][0] - (pts[0][0] + pts[20][0]) / 2, pts[10][1] - (pts[0][1] + pts[20][1]) / 2);
      if (span < 60 || sagPx > span * .45) continue; // seen end-on: reads as a tangle, an artist would leave it out
      const pxm = cam.f / Math.max(1, cam.proj(a)[2]);
      const hz = hazeK(cam, a);
      line(g, pts, Math.max(.7, Math.min(2.4, pxm * .04)), mix('#3c3a52', HAZE, hz * .85), { taper: 0, seed: i * 3 + k });
    }
  }
}

// the koban (police box): flat roof and its round red lamp above the water
function paintKoban(g, cam, o) {
  const K = { xa: -14.7, xb: -10.3, za: 10.2, zb: 13.8, h: 1.1 };
  const ctr = [(K.xa + K.xb) / 2, 0, (K.za + K.zb) / 2];
  if (!cam.front([K.xa, 0, K.za], 2) || !cam.front([K.xb, 0, K.zb], 2) || !cam.front([K.xa, 0, K.zb], 2) || !cam.front([K.xb, 0, K.za], 2)) return null;
  const R = rng(31), hz = hazeK(cam, ctr);
  const camPos = cam.mirror ? [cam.pos[0], -cam.pos[1], cam.pos[2]] : cam.pos;
  const box = (xa, xb, ya, yb, za, zb, cols, line) => {
    const V8 = (x, y, z) => [x, y, z];
    const faces = [
      { n: [-1, 0, 0], q: [V8(xa, ya, zb), V8(xa, ya, za), V8(xa, yb, za), V8(xa, yb, zb)] },
      { n: [1, 0, 0], q: [V8(xb, ya, za), V8(xb, ya, zb), V8(xb, yb, zb), V8(xb, yb, za)] },
      { n: [0, 0, -1], q: [V8(xa, ya, za), V8(xb, ya, za), V8(xb, yb, za), V8(xa, yb, za)] },
      { n: [0, 0, 1], q: [V8(xb, ya, zb), V8(xa, ya, zb), V8(xa, yb, zb), V8(xb, yb, zb)] },
      { n: [0, 1, 0], q: [V8(xa, yb, za), V8(xb, yb, za), V8(xb, yb, zb), V8(xa, yb, zb)] },
    ];
    for (const f of faces) {
      const fc = V.mul(f.q.reduce((s, q) => V.add(s, q), [0, 0, 0]), .25);
      if (V.dot(f.n, V.sub(camPos, fc)) <= 0) continue;
      const poly = cam.projPoly(f.q); if (!poly) continue;
      const lam = V.dot(f.n, SUN);
      wash(g, poly, mix(f.n[1] > 0 ? cols[2] : lam > .05 ? cols[0] : cols[1], HAZE, hz), R, { density: 60 });
      if (line) ink(g, poly, true, 1.3, { color: INK, taper: 0, wob: .3 });
      f.poly = poly;
    }
    return faces;
  };
  const walls = box(K.xa, K.xb, -.2, K.h, K.za, K.zb, ['#f1ebdc', '#bfc2dc', '#e9e4d6'], false);
  // the sign on the street side (+x)
  if (walls[1].poly) {
    const sb = cam.projPoly([[K.xb + .02, .45, K.za + .8], [K.xb + .02, .45, K.zb - .8], [K.xb + .02, .95, K.zb - .8], [K.xb + .02, .95, K.za + .8]]);
    if (sb) fillPoly(g, sb, '#f8f6ef');
    const p = cam.proj([K.xb + .05, .58, (K.za + K.zb) / 2]), fs = .4 * cam.f / p[2];
    g.save(); g.fillStyle = '#25305f'; g.font = `700 ${fs.toFixed(1)}px ${FJP}`; g.textAlign = 'center';
    const pa = cam.proj([K.xb, .6, K.za]), pb = cam.proj([K.xb, .6, K.zb]);
    if (pb[0] > pa[0]) { g.fillText('交番', p[0] - fs * .55, p[1]); g.font = `700 ${(fs * .5).toFixed(1)}px ${FLAT}`; g.fillText('KOBAN', p[0] + fs * 1.0, p[1] - fs * .1); }
    g.restore();
  }
  const ov = .35, rh = .35;
  const roof = box(K.xa - ov, K.xb + ov, K.h, K.h + rh, K.za - ov, K.zb + ov, ['#9aa0c4', '#7b80aa', '#cdd3de'], true);
  if (roof[4].poly) for (let i = 0; i < 6; i++) { const q = cam.proj([lerp(K.xa, K.xb, R()), K.h + rh, lerp(K.za, K.zb, R())]); paintFoliageBlob(g, q[0], q[1] - 3, 4 + R() * 6, R, hz, 1); }
  // the red lamp on a short arm above the door (street side)
  const lp = cam.proj([K.xb + .1, K.h + rh + .45, (K.za + K.zb) / 2]);
  const lr = .28 * cam.f / lp[2];
  const lb = cam.proj([K.xb + .1, K.h + rh, (K.za + K.zb) / 2]);
  g.strokeStyle = '#4a4a5e'; g.lineWidth = Math.max(1, lr * .25); g.beginPath(); g.moveTo(lb[0], lb[1]); g.lineTo(lp[0], lp[1] + lr * .8); g.stroke();
  g.fillStyle = '#e33a31'; g.beginPath(); g.ellipse(lp[0], lp[1], lr, lr * 1.1, 0, 0, TAU); g.fill();
  g.fillStyle = '#ff9a86'; g.beginPath(); g.ellipse(lp[0] - lr * .3, lp[1] - lr * .35, lr * .35, lr * .3, 0, 0, TAU); g.fill();
  g.fillStyle = '#ffe9e0'; g.beginPath(); g.ellipse(lp[0] - lr * .35, lp[1] - lr * .45, lr * .12, lr * .1, 0, 0, TAU); g.fill();
  ink(g, ellipsePts(lp[0], lp[1], lr, lr * 1.1, 24), true, 1.5, { color: INK, taper: 0 });
  return { lamp: lp, r: lr };
}

// distant skyline & tower in the haze
function paintSkyline(g, cam) {
  const R = rng(9);
  for (let i = 0; i < 140; i++) {
    const x = -260 + R() * 520, z = (i % 2 ? 1 : -1) * (420 + R() * 380), w = 10 + R() * 30, h = 15 + R() * 70;
    const q = quadS(cam, [x, 0, z], [x + w, 0, z], [x + w, h, z], [x, h, z]); if (!q || q.length < 4) continue;
    const hz = hazeK(cam, [x, h, z]);
    fillPoly(g, q, mix(R() < .5 ? '#a9b8de' : '#bcc8e6', HAZE, .25 + hz * .5));
    if (R() < .6) { g.globalAlpha = .4; fillPoly(g, [q[0], [lerp(q[0][0], q[1][0], .3), q[0][1]], [lerp(q[3][0], q[2][0], .3), q[3][1]], q[3]], '#e6eef8'); g.globalAlpha = 1; }
  }
  // the old tower, far off, red and white
  const tx = -150, tz = -700, th = 300;
  if (!cam.front([tx, 0, tz], 5) || !cam.front([tx, th, tz], 5)) return;
  const base = cam.proj([tx, 0, tz]), top = cam.proj([tx, th, tz]);
  if (base[2] > 0) {
    const pxm = cam.f / base[2];
    const hw = (y) => (1 - y / th) * 50 + 4;
    const P = [];
    for (let y = 0; y <= th; y += 20) P.push([y, cam.proj([tx - hw(y), y, tz]), cam.proj([tx + hw(y), y, tz])]);
    for (let i = 0; i + 1 < P.length; i++) {
      const col = (i % 2) ? '#f0dcd6' : '#e78a74';
      fillPoly(g, [[P[i][1][0], P[i][1][1]], [P[i][2][0], P[i][2][1]], [P[i + 1][2][0], P[i + 1][2][1]], [P[i + 1][1][0], P[i + 1][1][1]]], mix(col, HAZE, .55));
    }
    g.strokeStyle = mix('#c86a5a', HAZE, .5); g.lineWidth = 1;
    g.beginPath(); for (let i = 0; i + 1 < P.length; i++) { g.moveTo(P[i][1][0], P[i][1][1]); g.lineTo(P[i + 1][2][0], P[i + 1][2][1]); g.moveTo(P[i][2][0], P[i][2][1]); g.lineTo(P[i + 1][1][0], P[i + 1][1][1]); } g.stroke();
    const ob = cam.proj([tx, th * .45, tz]); fillPoly(g, [[ob[0] - 40 * pxm, ob[1] - 4], [ob[0] + 40 * pxm, ob[1] - 4], [ob[0] + 40 * pxm, ob[1] + 4], [ob[0] - 40 * pxm, ob[1] + 4]], mix('#d9dfef', HAZE, .5));
    // greenery creeping up its legs
    for (let i = 0; i < 12; i++) { const y = R() * th * .35; const p = cam.proj([tx + (R() - .5) * hw(y) * 2, y, tz]); paintFoliageBlob(g, p[0], p[1], 3 + R() * 4, R, .6, 1); }
  }
}

// Background plates for a camera: sky (sky + clouds) and city (transparent).
// o.width/o.height give a plate larger than the frame for pans.
function paintPlates(cam, o) {
  o = o || {};
  const wd = o.width || W, hgt = o.height || H;
  const sky = canvas(wd, hgt), g = sky.getContext('2d');
  const R = rng(o.seed || 3);
  if (o.mirrorOf) { const hy = cam.horizon(); g.save(); g.translate(0, 2 * hy); g.scale(1, -1); g.drawImage(o.mirrorOf.sky, 0, 0); g.restore(); }
  else {
    paintSky(g, cam, hgt, o);
    for (const cl of (o.clouds || CLOUDS)) paintCumulus(g, cam, cl, { haze: cl.haze || .15, backlit: cl.backlit });
    paintWisps(g, R, -100, 40, wd, cam.horizon() - 260, 14, '#ffffff', .18);
    paperGrain(g, wd, hgt, .05);
  }
  const city = canvas(wd, hgt), c = city.getContext('2d');
  if (!o.noCity) {
    paintSkyline(c, cam);
    const items = [];
    for (const b of CITY.B) { const cx = clamp(cam.pos[0], b.xa, b.xb), cz = clamp(cam.pos[2], b.za, b.zb); items.push({ d: V.len(V.sub([cx, 0, cz], cam.pos)) + 4, f: () => paintBuilding(c, cam, b) }); }
    for (const t of CITY.T) items.push({ d: V.len(V.sub([t.x, 0, t.z], cam.pos)) - 2, f: () => paintTree(c, cam, t) });
    const poleInfo = { '-1-1': [], '1-1': [], '-11': [], '11': [] };
    for (const q of CITY.P) items.push({ d: V.len(V.sub([q.x, 0, q.z], cam.pos)) - 3, f: () => { const r = paintPole(c, cam, q); poleInfo[Math.sign(q.x) + '' + q.line].push(r); } });
    items.sort((a, b) => b.d - a.d);
    for (const it of items) it.f();
    for (const k in poleInfo) paintWires(c, cam, poleInfo[k].filter(Boolean).sort((a, b) => a.top[2] - b.top[2]));
    city.koban = o.noKoban ? null : paintKoban(c, cam);
    c.save(); c.globalCompositeOperation = 'source-atop'; paperGrain(c, wd, hgt, .06); c.restore();
  }
  return { sky, city, cam };
}
let _paper = null;
function paperGrain(g, w, h, a) {
  if (!_paper) {
    _paper = canvas(512, 512); const pg = _paper.getContext('2d'), d = pg.createImageData(512, 512), R = rng(77);
    for (let i = 0; i < d.data.length; i += 4) { const v = 128 + (R() - .5) * 90 + vnoise2((i / 4) % 512 * .05, ((i / 4) / 512 | 0) * .05, 2) * 30; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
    pg.putImageData(d, 0, 0);
  }
  g.save(); g.globalAlpha = a; if (g.globalCompositeOperation === 'source-over') g.globalCompositeOperation = 'overlay';
  g.fillStyle = g.createPattern(_paper, 'repeat'); g.fillRect(0, 0, w, h); g.restore();
}

const CLOUDS = [
  makeCumulus(11, [-900, 120, -2600], 900, 900, 200),
  makeCumulus(12, [700, 80, -2400], 1100, 1200, 300),
  makeCumulus(13, [1800, 100, -2100], 700, 700, 200),
  makeCumulus(14, [-2000, 60, -2000], 800, 600, 200),
  makeCumulus(15, [200, 200, -3200], 600, 400, 150),
  makeCumulus(16, [-1300, 60, 2600], 1000, 1000, 250),
  makeCumulus(17, [900, 90, 2900], 1200, 1300, 250),
  makeCumulus(18, [2200, 60, 2300], 700, 600, 200),
  makeCumulus(19, [-200, 300, 3600], 500, 300, 150),
];
