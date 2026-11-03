// Shared helpers: maths, colour, cloud painting, the little cloud, and the
// watercolour post-process. Everything draws into the global `ctx`, which
// shots.js swaps to an offscreen buffer when it needs to cross-fade.
'use strict';
const W = 1920, H = 1040;
const mainCanvas = document.getElementById('c');
const mainCtx = mainCanvas.getContext('2d');
let ctx = mainCtx;

// ---------- maths ----------
function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const ease3 = t => { t = clamp(t, 0, 1); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const easeOut = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
const easeIn = t => Math.pow(clamp(t, 0, 1), 2);
const ramp = (t, a, b) => ease((t - a) / (b - a));
// 0 before a, rises to 1 by b, holds to c, falls to 0 by d
function env(t, a, b, c, d) { if (t <= a || t >= d) return 0; if (t < b) return ease((t - a) / (b - a)); if (t <= c) return 1; return 1 - ease((t - c) / (d - c)); }
const gauss = (x, m, s) => Math.exp(-Math.pow((x - m) / s, 2));

// ---------- colour ----------
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
function mix(a, b, t, al) { const A = hex(a), B = hex(b); const c = [0, 1, 2].map(i => Math.round(lerp(A[i], B[i], clamp(t, 0, 1)))); return al === undefined ? `rgb(${c})` : `rgba(${c},${al})`; }
function rgba(h, a) { const c = hex(h); return `rgba(${c},${a})`; }

// ---------- canvases ----------
function canvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }
// Pre-render a static layer at `sf` times resolution (for shots that zoom in).
function layer(w, h, sf, draw) {
  const c = canvas(w * sf, h * sf), g = c.getContext('2d');
  g.scale(sf, sf);
  const prev = ctx; ctx = g; draw(g); ctx = prev;
  c.lw = w; c.lh = h; return c;
}
function blit(c, x, y, a) { if (a !== undefined) ctx.globalAlpha = a; ctx.drawImage(c, x || 0, y || 0, c.lw || c.width, c.lh || c.height); ctx.globalAlpha = 1; }
function cam(cx, cy, z) { ctx.setTransform(z, 0, 0, z, W / 2 - cx * z, H / 2 - cy * z); }
// Same, but keeps the view inside a painted layer of size bw x bh.
function camIn(cx, cy, z, bw, bh) {
  const hw = W / 2 / z, hh = H / 2 / z;
  cam(clamp(cx, hw, (bw || W) - hw), clamp(cy, hh, (bh || H) - hh), z);
}
function screen() { ctx.setTransform(1, 0, 0, 1, 0, 0); }
function vgrad(y0, y1, stops) { const g = ctx.createLinearGradient(0, y0, 0, y1); for (const s of stops) g.addColorStop(s[0], s[1]); return g; }
function glow(x, y, r, color, a, comp) {
  ctx.save(); ctx.globalCompositeOperation = comp || 'lighter';
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(color, a)); g.addColorStop(.35, rgba(color, a * .45)); g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
}
function ridge(f, x0, x1, step, bottom) {
  ctx.beginPath(); ctx.moveTo(x0, bottom);
  for (let x = x0; x <= x1 + step; x += step) ctx.lineTo(x, f(x));
  ctx.lineTo(x1 + step, bottom); ctx.closePath();
}
function strokeRidge(f, x0, x1, step) { ctx.beginPath(); for (let x = x0; x <= x1 + step; x += step) x === x0 ? ctx.moveTo(x, f(x)) : ctx.lineTo(x, f(x)); }

// ---------- clouds (lobe painter) ----------
// A lobe is a rounded clump of circles, painted shadow first, then the lit
// side, then a soft highlight, so each clump reads as one soft mass.
function makeLobe(r, x, y, R, k) {
  const cs = [{ x, y, r: R * .78 }], n = k || 9;
  for (let i = 0; i < n; i++) {
    const a = Math.PI * (0.92 + 1.16 * i / (n - 1)) + (r() - .5) * .25;
    cs.push({ x: x + Math.cos(a) * R * .6, y: y + Math.sin(a) * R * .55, r: R * (.34 + .18 * r()) });
  }
  return { x, y, R, cs };
}
function circlesPath(g, cs, dx, dy, k) {
  g.beginPath();
  for (const c of cs) { const x = c.x + dx * c.r, y = c.y + dy * c.r; g.moveTo(x + c.r * k, y); g.arc(x, y, c.r * k, 0, 6.2832); }
}
function paintLobes(g, lobes, pal, o) {
  o = Object.assign({ ox: -.07, oy: -.16, hx: -.38, hy: -.5, hiA: .85, k: .95 }, o || {});
  for (const L of lobes) {
    g.fillStyle = pal.shadow; circlesPath(g, L.cs, 0, 0, 1); g.fill();
    g.save(); circlesPath(g, L.cs, 0, 0, 1); g.clip();
    g.fillStyle = pal.mid; circlesPath(g, L.cs, o.ox, o.oy, o.k); g.fill();
    const hx = L.x + L.R * o.hx, hy = L.y + L.R * o.hy, rg = g.createRadialGradient(hx, hy, 0, hx, hy, L.R * 1.05);
    rg.addColorStop(0, pal.hi); rg.addColorStop(1, rgba(pal.hi, 0));
    g.globalAlpha = o.hiA; g.fillStyle = rg; g.fillRect(L.x - L.R * 2, L.y - L.R * 2, L.R * 4, L.R * 4);
    g.restore();
  }
}
function cumulusLobes(w, h, seed, pad, rows) {
  const r = rng(seed), base = h + pad, lobes = [];
  const m = Math.max(4, Math.round(w / (h * .42)));
  for (let row = 0; row < (rows || 2); row++) for (let i = 0; i < m + row; i++) {
    const u = clamp((i + .5 + (r() - .5) * .5) / (m + row), .06, .94);
    const prof = Math.pow(Math.sin(Math.PI * u), .8);
    const R = h * (row ? .3 : .4) * (.7 + .45 * r()) * (.5 + .5 * prof);
    const top = row ? prof * h * .55 : prof * h;
    lobes.push(makeLobe(r, pad + u * w, Math.min(base - R * .35, base - top + R * .95), R, 8));
  }
  return lobes.sort((a, b) => (a.y - a.R) - (b.y - b.R));
}
// Returns {c, pad, w, h}; draw with drawCloud(sprite, x, baseY).
function cloudSprite(w, h, seed, pal, light, sf, rows) {
  sf = sf || 1;
  const pad = 90, c = canvas((w + pad * 2) * sf, (h + pad * 2) * sf), g = c.getContext('2d');
  g.scale(sf, sf);
  const base = h + pad, lobes = cumulusLobes(w, h, seed, pad, rows);
  g.save(); g.beginPath(); g.rect(0, 0, w + pad * 2, base); g.clip();
  g.filter = `blur(${1.6 * sf}px)`;
  paintLobes(g, lobes, pal, light);
  g.filter = 'none';
  g.globalCompositeOperation = 'source-atop';
  const ug = g.createLinearGradient(0, base - Math.min(h * .4, 170), 0, base);
  ug.addColorStop(0, 'rgba(0,0,0,0)'); ug.addColorStop(1, pal.under);
  g.globalAlpha = .6; g.fillStyle = ug; g.fillRect(0, 0, w + pad * 2, h + pad * 2);
  g.restore();
  return { c, pad, w, h, lobes };
}
function drawCloud(s, x, baseY, a) {
  ctx.globalAlpha = a === undefined ? 1 : a;
  ctx.drawImage(s.c, x - s.pad, baseY - s.h - s.pad, s.w + s.pad * 2, s.h + s.pad * 2);
  ctx.globalAlpha = 1;
}
// Evening palette, lit from the low sun on the right.
const PAL_EVE = { shadow: '#9585b6', mid: '#f6c3a6', hi: '#fff4d6', under: '#b98aa4' };
const LIGHT_RIGHT = { ox: .08, oy: -.1, hx: .4, hy: -.32, hiA: .9 };

// ---------- the little cloud ----------
const KID_LOBES = [[-.6, .1, .4], [-.27, -.2, .5], [.2, -.28, .53], [.6, 0, .42], [.04, .14, .56], [-.36, .24, .38], [.4, .24, .38]];
// o: grey (1 = dusty grey, 0 = clean white), t (time for wobble), eye (0 closed
// .. 1 open), happy (closed smiling eyes), look [x,y], squash, glow, alpha, blush
function drawKid(x, y, s, o) {
  o = Object.assign({ grey: 1, t: 0, eye: 1, happy: 0, look: [0, 0], squash: 0, glow: 0, alpha: 1, blush: 0, sad: 0, rot: 0, px: 1 }, o || {});
  if (o.alpha <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot);
  if (o.glow > 0) glow(0, 0, s * 2.6, '#ffe3a8', .55 * o.glow * o.alpha);
  ctx.globalAlpha = o.alpha;
  ctx.scale(1 + o.squash * .14, 1 - o.squash * .14);
  const p = new Path2D();
  KID_LOBES.forEach((L, i) => { const w = 1 + .045 * Math.sin(o.t * 3.1 + i * 1.7); p.moveTo(L[0] * s + L[2] * s * w, L[1] * s); p.arc(L[0] * s, L[1] * s, L[2] * s * w, 0, 6.2832); });
  const top = mix('#fffaf2', '#cfd1dc', o.grey), bot = mix('#f0d4df', '#8d90a4', o.grey);
  // soft outer halo so the edge reads like vapour, not a sticker
  ctx.save(); ctx.filter = `blur(${Math.max(.8, s * o.px * .05)}px)`;   // filter radii are in device pixels
  const gr = ctx.createLinearGradient(0, -s * .85, 0, s * .75); gr.addColorStop(0, top); gr.addColorStop(1, bot);
  ctx.fillStyle = gr; ctx.fill(p); ctx.restore();
  ctx.save(); ctx.clip(p);
  let hg = ctx.createRadialGradient(-s * .25, -s * .5, 0, -s * .25, -s * .5, s * .9);
  hg.addColorStop(0, 'rgba(255,255,255,.75)'); hg.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = hg; ctx.fillRect(-s * 2, -s * 2, s * 4, s * 4);
  ctx.restore();
  // face
  const ex = .2 * s, ey = .04 * s + o.look[1] * s * .05, lx = o.look[0] * s * .06;
  ctx.fillStyle = '#3b3442'; ctx.strokeStyle = '#3b3442'; ctx.lineCap = 'round';
  for (const sx of [-1, 1]) {
    const cx = sx * ex + lx;
    if (o.happy > .5) {
      ctx.lineWidth = Math.max(1.2, s * .035);
      ctx.beginPath(); ctx.arc(cx, ey + s * .03, s * .055, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    } else if (o.eye < .15) {
      ctx.lineWidth = Math.max(1.2, s * .03);
      ctx.beginPath(); ctx.moveTo(cx - s * .05, ey); ctx.quadraticCurveTo(cx, ey + s * .035, cx + s * .05, ey); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.ellipse(cx, ey, s * .052, s * .075 * o.eye, 0, 0, 6.2832); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(cx - s * .015, ey - s * .03 * o.eye, s * .018, 0, 6.2832); ctx.fill();
      ctx.fillStyle = '#3b3442';
      if (o.sad > 0) { ctx.lineWidth = Math.max(1, s * .022); ctx.beginPath(); ctx.moveTo(cx - sx * s * .07, ey - s * .1); ctx.lineTo(cx + sx * s * .02, ey - s * .13 + s * .03 * o.sad); ctx.stroke(); }
    }
  }
  if (o.blush > 0) {
    ctx.fillStyle = `rgba(240,140,150,${.45 * o.blush})`;
    for (const sx of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sx * s * .36 + lx, ey + s * .13, s * .08, s * .045, 0, 0, 6.2832); ctx.fill(); }
  }
  ctx.restore();
}

// ---------- particles / small things ----------
function motes(t, n, seed, a, col) {
  const r = rng(seed);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const x0 = r() * W, y0 = r() * H, sp = 8 + r() * 26, ph = r() * 6.28, sz = 1.2 + r() * 2.4;
    const x = (x0 + t * sp) % W, y = y0 + Math.sin(t * .5 + ph) * 26 - t * 4 * r();
    const al = a * (.4 + .6 * Math.max(0, Math.sin(t * 1.3 + ph)));
    ctx.fillStyle = rgba(col || '#ffe9b8', al); ctx.beginPath(); ctx.arc(x, ((y % H) + H) % H, sz, 0, 6.2832); ctx.fill();
  }
  ctx.restore();
}
function flower(x, y, s, col, t, ph, sway) {
  const bx = x + Math.sin(t * 1.7 + ph) * sway * s * 1.2;
  ctx.strokeStyle = '#4f7d3e'; ctx.lineWidth = Math.max(.8, s * .22);
  ctx.beginPath(); ctx.moveTo(x, y + s * 3); ctx.quadraticCurveTo(x, y + s * 1.5, bx, y); ctx.stroke();
  ctx.fillStyle = col;
  for (let k = 0; k < 5; k++) { const a = k * 1.2566 + ph; ctx.beginPath(); ctx.arc(bx + Math.cos(a) * s * .62, y + Math.sin(a) * s * .62, s * .55, 0, 6.2832); ctx.fill(); }
  ctx.fillStyle = '#f5c542'; ctx.beginPath(); ctx.arc(bx, y, s * .38, 0, 6.2832); ctx.fill();
}
function sparkle(x, y, s, a) {
  if (a <= 0) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(x, y);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 1.6); g.addColorStop(0, `rgba(255,250,225,${a})`); g.addColorStop(1, 'rgba(255,240,200,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, s * 1.6, 0, 6.2832); ctx.fill();
  ctx.fillStyle = `rgba(255,255,240,${a})`;
  ctx.beginPath(); ctx.moveTo(0, -s * 2.6); ctx.quadraticCurveTo(s * .18, -s * .18, s * 2.6, 0); ctx.quadraticCurveTo(s * .18, s * .18, 0, s * 2.6);
  ctx.quadraticCurveTo(-s * .18, s * .18, -s * 2.6, 0); ctx.quadraticCurveTo(-s * .18, -s * .18, 0, -s * 2.6); ctx.fill();
  ctx.restore();
}
// A flowing ribbon (scarf tail): heading wave travels from root to tip.
function ribbon(x0, y0, len, wd, dir, t, o) {
  o = Object.assign({ amp: .5, k: 2.2, speed: 7, segs: 16, taper: .45, col: '#d8403a', shade: '#9e2a2a', droop: 0 }, o || {});
  const pts = [[x0, y0]]; let x = x0, y = y0, ph = [];
  for (let i = 1; i <= o.segs; i++) {
    const u = i / o.segs, w = Math.sin(o.k * u * 6.2832 - t * o.speed);
    const ang = dir + o.amp * u * w + o.droop * u * u;
    x += Math.cos(ang) * len / o.segs; y += Math.sin(ang) * len / o.segs;
    pts.push([x, y]); ph.push(Math.cos(o.k * u * 6.2832 - t * o.speed));
  }
  for (let i = 0; i < o.segs; i++) {
    const a = pts[i], b = pts[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    const nx = -dy / l, ny = dx / l, wa = wd * (1 - o.taper * i / o.segs) / 2, wb = wd * (1 - o.taper * (i + 1) / o.segs) / 2;
    ctx.fillStyle = mix(o.col, o.shade, .5 - .5 * ph[i]);
    ctx.beginPath(); ctx.moveTo(a[0] + nx * wa, a[1] + ny * wa); ctx.lineTo(b[0] + nx * wb, b[1] + ny * wb);
    ctx.lineTo(b[0] - nx * wb, b[1] - ny * wb); ctx.lineTo(a[0] - nx * wa, a[1] - ny * wa); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = .8; ctx.stroke();
  }
  return pts[pts.length - 1];
}

// ---------- text ----------
const FONT = '"LXGW WenKai", "WenQuanYi Zen Hei", serif';
function caption(text, a, o) {
  if (a <= 0) return;
  o = Object.assign({ x: W / 2, y: H - 92, size: 44, spacing: 4, col: '#fffaf0', shadow: 'rgba(40,20,30,.7)' }, o || {});
  ctx.save(); screen(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `${o.size}px ${FONT}`; ctx.letterSpacing = o.spacing + 'px'; ctx.fillStyle = o.col;
  for (const b of [26, 8]) { ctx.shadowColor = o.shadow; ctx.shadowBlur = b; ctx.fillText(text, o.x + o.spacing / 2, o.y); }
  ctx.restore();
}

// ---------- watercolour post-process ----------
let paper;
function makePaper() {
  const c = canvas(W, H), g = c.getContext('2d'), r = rng(1234);
  g.fillStyle = '#808080'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 320; i++) {
    const x = r() * W, y = r() * H, rad = 40 + r() * 280, v = r() < .5 ? 40 : 230;
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, `rgba(${v},${v},${v},${.04 + r() * .05})`); gr.addColorStop(1, `rgba(${v},${v},${v},0)`);
    g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  g.lineWidth = 1;
  for (let i = 0; i < 2600; i++) {
    const x = r() * W, y = r() * H, a = r() * 6.28, l = 6 + r() * 22, v = r() < .5 ? 60 : 210;
    g.strokeStyle = `rgba(${v},${v},${v},.06)`; g.beginPath(); g.moveTo(x, y);
    g.quadraticCurveTo(x + Math.cos(a + .6) * l * .5, y + Math.sin(a + .6) * l * .5, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  const d = g.getImageData(0, 0, W, H), D = d.data;
  for (let i = 0; i < D.length; i += 4) { const n = (r() - .5) * 26; D[i] += n; D[i + 1] += n; D[i + 2] += n; }
  g.putImageData(d, 0, 0);
  return c;
}
const bloomC = canvas(384, 208), bloomG = bloomC.getContext('2d');
function post(amountBloom, warm) {
  screen();
  // glow: blurred, contrast-squared copy screened back on top
  bloomG.globalCompositeOperation = 'copy'; bloomG.filter = 'blur(5px)';
  bloomG.drawImage(mainCanvas, 0, 0, 384, 208); bloomG.filter = 'none';
  bloomG.globalCompositeOperation = 'multiply'; bloomG.drawImage(bloomC, 0, 0); bloomG.drawImage(bloomC, 0, 0);
  ctx.save();
  ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = amountBloom; ctx.drawImage(bloomC, 0, 0, W, H);
  ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = .6; ctx.drawImage(paper, 0, 0);
  ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 1; ctx.fillStyle = `rgba(255,236,214,${warm})`; ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over';
  const v = ctx.createRadialGradient(W / 2, H / 2, H * .42, W / 2, H / 2, H * 1.05);
  v.addColorStop(0, 'rgba(40,20,40,0)'); v.addColorStop(1, 'rgba(40,20,40,.36)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  ctx.restore();
}
