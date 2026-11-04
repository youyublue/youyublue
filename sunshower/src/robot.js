// robot.js — the patrol labor (a fan tribute to the AV-98 "Alphonse").
// Built as a model sheet of solids so it stays on-model from every angle;
// drawn by cel.js as inked cels. Units are metres, robot faces +z, +x is its left.
'use strict';
// hand-lettered markings (Yusei Magic, SIL OFL), with system fallbacks
const FLAT = '"Yusei Magic","DejaVu Sans Condensed","DejaVu Sans",sans-serif';
const FJP = '"Yusei Magic","IPAGothic","Noto Sans CJK JP",sans-serif';
const FMIN = '"Zen Old Mincho","IPAMincho",serif';

function frameZ(o, z, yHint) { z = V.norm(z); const x = V.norm(V.cross(yHint, z)); const y = V.cross(z, x); return M.basis(x, y, z, o); }
function ik2(S, T, a, b, pole) {
  const d = V.sub(T, S); let L = V.len(d); const dn = V.norm(d);
  L = clamp(L, Math.abs(a - b) + .01, (a + b) * .998);
  const cosA = (a * a + L * L - b * b) / (2 * a * L), sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
  const pp = V.norm(V.sub(pole, V.mul(dn, V.dot(pole, dn))));
  const E = V.add(S, V.add(V.mul(dn, a * cosA), V.mul(pp, a * sinA)));
  return { E, W: V.add(S, V.mul(dn, L)) };
}
function txt(o, u, v, h, str, font, col, extra) { // h = cap height in metres; font is drawn at 100px
  return Object.assign({ k: 'text', o, u: V.mul(u, h / 72), v: V.mul(v, h / 72), str, font: font, col, n: V.norm(V.cross(v, u)) }, extra || {});
}
const MOSS = ['#8cbf52', '#4f8a63'], MOSS2 = ['#a9d063', '#5f9a6a'];
const SCR_W = ['#d9dbe6', '#9096be'], SCR_B = ['#6a7396', '#3b3f58'];
function moss(c, n, r, seed, sx, sy) { // a little organic patch on a surface (local coords)
  const R = rng(seed), nn = V.norm(n); const t1 = V.norm(V.cross(nn, Math.abs(nn[1]) < .9 ? [0, 1, 0] : [1, 0, 0])), t2 = V.cross(nn, t1);
  const pts = []; const k = 11;
  for (let i = 0; i < k; i++) { const a = i / k * TAU, rr = r * (.65 + .55 * R()); pts.push(V.add(c, V.add(V.mul(t1, Math.cos(a) * rr * (sx || 1)), V.mul(t2, Math.sin(a) * rr * (sy || 1))))); }
  return { k: 'poly', pts, n, c, fill: R() < .5 ? MOSS : MOSS2, smooth: 2 };
}
function scratch3(a, b, n, col, seed) { return { k: 'line', pts: [a, V.lerp(a, b, .45 + .1 * hash(seed)), b], n, c: a, lw: .28, col: col || SCR_W, taper: 3, seed }; }

// ---------------- hands ----------------
// Hand frame: origin at the wrist, +z toward the fingers, +y the back of the hand.
function handParts(F, side, curl, tag, mat) {
  const k = 1.32; const S3 = a => a.map(q => Array.isArray(q) ? q.map(v => v * k) : q * k);
  const parts = [], ts = side > 0 ? -1 : 1; // thumb side in hand-local x
  const m = mat || 'black';
  const palm = taperPart(-.07 * k, .07 * k, S3([-.16, .16, .02, .34]), S3([-.155, .155, .03, .33]), .045 * k, m, { name: tag + 'palm', M: F, zb: -.02 });
  palm.decals = [].concat([
    { k: 'line', pts: [[-.1, .118, .1], [.1, .118, .1]], n: [0, 1, 0], lw: .35, col: ['#22232f', '#16171f'] },
    { k: 'circle', c: [ts * -.08, .117, .2], n: [0, 1, 0], r: .018, fill: ['#5b6180', '#2c2e40'], lw: .25 },
    { k: 'circle', c: [ts * .08, .117, .2], n: [0, 1, 0], r: .018, fill: ['#5b6180', '#2c2e40'], lw: .25 },
    scratch3([-.05, .118, .12], [.06, .118, .26], [0, 1, 0], SCR_B, 41),
    { k: 'line', pts: [[-.12, -.118, .12], [0, -.118, .14], [.12, -.118, .12]], n: [0, -1, 0], lw: .3, col: ['#22232f', '#16171f'], spline: 1 },
  ]).map(d => Object.assign({}, d, d.pts ? { pts: d.pts.map(q => q.map(v => v * k)) } : {}, d.c ? { c: d.c.map(v => v * k), r: d.r * k } : {}));
  parts.push(palm);
  const wristCuff = cylPart([0, 0, -.06], [0, 0, .04], .13 * k, .12 * k, 'grey', { name: tag + 'wrist', M: F, zb: -.03 });
  parts.push(wristCuff);
  const xs = [-.112, -.038, .038, .112].map(x => x * -ts * k), lens = [[.14, .105, .085], [.155, .115, .09], [.15, .11, .088], [.12, .09, .075]];
  for (let i = 0; i < 4; i++) {
    const x = xs[i], spr = (i - 1.5) * .05 * -ts * (curl.spread || 1);
    // knuckle cap on the back of the hand
    parts.push(boxPart([x, .06 * k, .325 * k], S3([.07, .05, .07]), .022 * k, m, { M: F, zb: .01, faces: false, shadeAmt: .6 }));
    let Fi = M.chain(F, M.tr(x, 0, .335 * k), M.rot('y', spr), M.rot('x', curl.base[i]));
    for (let j = 0; j < 3; j++) {
      const l = lens[i][j] * k, r0 = (.052 - j * .006) * k, r1 = (.05 - j * .006) * k;
      parts.push(capPart([0, 0, 0], [0, 0, l], r0, r1, m, { M: Fi, zb: .02 + j * .01, name: tag + 'f' + i + j }));
      if (j < 2) Fi = M.chain(Fi, M.tr(0, 0, l), M.rot('x', j === 0 ? curl.mid[i] : curl.tip[i]));
      else parts[parts.length - 1].tipF = M.chain(Fi, M.tr(0, 0, l));
    }
  }
  // thumb
  let Ft = M.chain(F, M.tr(ts * .15 * k, -.03 * k, .09 * k), M.rot('y', ts * (.85 + (curl.thumbOut || 0))), M.rot('x', curl.thumb || .35));
  parts.push(capPart([0, 0, 0], [0, 0, .13 * k], .058 * k, .055 * k, m, { M: Ft, zb: .015, name: tag + 't0' }));
  Ft = M.chain(Ft, M.tr(0, 0, .13 * k), M.rot('x', (curl.thumb || .35) * .8));
  parts.push(capPart([0, 0, 0], [0, 0, .1 * k], .052 * k, .046 * k, m, { M: Ft, zb: .02, name: tag + 't1' }));
  return parts;
}

// ---------------- the whole robot ----------------
function defaultPose() {
  return {
    pos: [0, 0, 0], yaw: 0,
    head: { pitch: 0, yaw: 0, roll: 0 },
    eyes: { open: 1, smile: 0, glow: 1, lx: 0, ly: 0 },
    torso: { lean: 0, twist: 0 },
    L: { wrist: [.42, 1.05, 1.02], pole: [1, -.8, -.4], fdir: [-.94, .08, .33], dors: [0, -1, 0], curl: { base: [.25, .22, .24, .3], mid: [.25, .22, .25, .3], tip: [.2, .2, .2, .25], thumb: .2, spread: .6 } },
    R: { wrist: [-1.32, -.2, .3], pole: [-1, .1, -.5], fdir: [.05, -1, .15], dors: [-1, 0, 0], curl: { base: [.35, .4, .45, .5], mid: [.4, .45, .5, .55], tip: [.3, .3, .35, .35], thumb: .4 } },
    beacon: [0, 0], wet: 0,
  };
}

function buildRobot(pose) {
  const P = [], A = {};
  const root = M.mul(M.tr(...pose.pos), M.rot('y', pose.yaw || 0));
  const tor = M.chain(root, M.tr(0, -.2, 0), M.rot('x', pose.torso.lean || 0), M.rot('y', pose.torso.twist || 0), M.tr(0, .2, 0));
  const add = (p, m) => { p.M = m || tor; P.push(p); return p; };

  // ---- legs (seen through the water)
  for (const s of [1, -1]) {
    add(cylPart([s * .36, -.7, 0], [s * .42, -1.95, .1], .3, .27, 'black', { faces: false }), root);
    add(boxPart([s * .43, -2.05, .2], [.5, .45, .5], .08, 'white'), root);
    add(taperPart(-3.55, -2.1, [s * .43 - .3, s * .43 + .3, -.3, .32], [s * .43 - .27, s * .43 + .27, -.25, .38], .08, 'white'), root);
    add(boxPart([s * .45, -3.68, .25], [.5, .26, .95], .07, 'white'), root);
  }
  add(taperPart(-.85, -.22, [-.6, .6, -.4, .4], [-.62, .62, -.42, .44], .08, 'black', { name: 'hips' }), root);
  add(taperPart(-.95, -.3, [-.3, .3, .38, .5], [-.34, .34, .42, .6], .05, 'white'), root);

  // ---- torso
  const abd = add(boxPart([0, .06, .0], [.98, .5, .72], .07, 'black', { name: 'abd' }));
  abd.decals = [0, 1, 2].map(i => ({ k: 'line', pts: [[-.4, -.08 + i * .13, .432], [.4, -.08 + i * .13, .432]], n: [0, 0, 1], lw: .4, col: ['#1c1d28', '#111219'] }));
  const belt = add(boxPart([0, .42, .03], [1.32, .2, .92], .05, 'black'));
  belt.decals = [{ k: 'circle', c: [-.45, .42, .5], n: [0, 0, 1], r: .03, fill: ['#6a7092', '#2c2e40'], lw: .3 }, { k: 'circle', c: [.45, .42, .5], n: [0, 0, 1], r: .03, fill: ['#6a7092', '#2c2e40'], lw: .3 }];
  const fz = y => .42 + (y - .48) * (.13 / 1.42) + .12 + .003; // chest front plane
  const chest = add(taperPart(.48, 1.9, [-.64, .64, -.42, .42], [-.86, .86, -.5, .55], .12, 'white', { name: 'chest', thr: .02 }));
  const chestN = V.norm([0, -.0915, 1]);
  const ventF = ['#2c2f42', '#1a1b28'];
  chest.decals = [
    { k: 'line', pts: [[0, .56, fz(.56)], [0, 1.12, fz(1.12)]], n: chestN, lw: .45 },
    { k: 'line', pts: [[-.6, 1.2, fz(1.2)], [-.2, 1.2, fz(1.2)], [-.1, 1.12, fz(1.12)], [.1, 1.12, fz(1.12)], [.2, 1.2, fz(1.2)], [.62, 1.2, fz(1.2)]], n: chestN, lw: .5 },
    { k: 'poly', pts: [[-.66, 1.46, fz(1.46)], [-.2, 1.46, fz(1.46)], [-.24, 1.76, fz(1.76)], [-.68, 1.76, fz(1.76)]], n: chestN, fill: ventF, lw: .5, smooth: 1 },
    { k: 'poly', pts: [[.66, 1.46, fz(1.46)], [.2, 1.46, fz(1.46)], [.24, 1.76, fz(1.76)], [.68, 1.76, fz(1.76)]], n: chestN, fill: ventF, lw: .5, smooth: 1 },
    ...[0, 1, 2, 3].flatMap(i => { const y = 1.52 + i * .065; return [{ k: 'line', pts: [[-.63, y, fz(y) + .002], [-.23, y, fz(y) + .002]], n: chestN, lw: .32, col: ['#6c7398', '#3a3d55'], taper: 2 }, { k: 'line', pts: [[.23, y, fz(y) + .002], [.63, y, fz(y) + .002]], n: chestN, lw: .32, col: ['#6c7398', '#3a3d55'], taper: 2 }]; }),
    // police badge (a gold sun-star) between the vents
    { k: 'fn', n: chestN, c: [0, 1.6, fz(1.6)], fn: (g, cam, it, L, lit, lw) => {
      g.save(); const s = planeTx(g, cam, it, [0, 1.6, fz(1.6) + .003 + (it.part.name === 'plate' ? .055 : 0)], [1, 0, 0], [0, -1, -.09]);
      g.beginPath(); for (let i = 0; i < 10; i++) { const a = i / 10 * TAU - Math.PI / 2, r = i % 2 ? .055 : .12; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath();
      g.fillStyle = lit ? '#f4c23c' : '#c58a3e'; g.fill(); g.lineWidth = lw * .5 / s; g.strokeStyle = INK; g.stroke();
      g.beginPath(); g.arc(0, 0, .04, 0, TAU); g.fillStyle = lit ? '#fff3c0' : '#e2b25a'; g.fill(); g.restore();
    } },
    txt([-.37, .93, fz(.93) + .003], [1, 0, 0], [0, -1, -.09], .2, '警視庁', '700 100px ' + FJP, ['#22202c', '#1d1b2a']),
    txt([-.37, .74, fz(.74) + .003], [1, 0, 0], [0, -1, -.09], .07, 'METROPOLITAN POLICE', '700 100px ' + FLAT, ['#3a3850', '#2c2a40']),
    { k: 'circle', c: [-.55, .62, fz(.62) + .002], n: chestN, r: .025, fill: ['#d5d8e6', '#9399c2'], lw: .35 },
    { k: 'circle', c: [.55, .62, fz(.62) + .002], n: chestN, r: .025, fill: ['#d5d8e6', '#9399c2'], lw: .35 },
    { k: 'circle', c: [-.72, 1.85, fz(1.85) + .002], n: chestN, r: .025, fill: ['#d5d8e6', '#9399c2'], lw: .35 },
    { k: 'circle', c: [.72, 1.85, fz(1.85) + .002], n: chestN, r: .025, fill: ['#d5d8e6', '#9399c2'], lw: .35 },
    scratch3([.32, .62, fz(.62) + .003], [.5, .7, fz(.7) + .003], chestN, ['#c9ccdc', '#8d92bb'], 7),
    scratch3([-.6, 1.3, fz(1.3) + .003], [-.42, 1.33, fz(1.33) + .003], chestN, ['#c9ccdc', '#8d92bb'], 8),
    { k: 'line', pts: [[-.18, .58, fz(.58) + .003], [-.16, .5, fz(.5) + .003]], n: chestN, lw: .35, col: ['#b9b6a4', '#8b8fb5'], taper: 3 },
    moss([-.2, 1.2, fz(1.2) + .004], chestN, .045, 3, 1.6, .7),
    moss([.82, 1.84, fz(1.84) + .004], chestN, .05, 4, 1.3, .8),
    // side panel (+x): unit number
    txt([.865 + .09 + .004, 1.62, .3], [0, 0, -1], [0, -1, 0], .17, '特車2-1', '700 100px ' + FJP, ['#22202c', '#1d1b2a'], { n: [1, 0, 0], c: [.95, 1.5, 0] }),
    { k: 'line', pts: [[.95, 1.32, .44], [.95, 1.32, -.42]], n: [1, 0, 0], c: [.95, 1.32, 0], lw: .45 },
    txt([-.865 - .09 - .004, 1.62, -.3], [0, 0, 1], [0, -1, 0], .17, '特車2-1', '700 100px ' + FJP, ['#22202c', '#1d1b2a'], { n: [-1, 0, 0], c: [-.95, 1.5, 0] }),
    { k: 'line', pts: [[-.95, 1.32, -.42], [-.95, 1.32, .44]], n: [-1, 0, 0], c: [-.95, 1.32, 0], lw: .45 },
    { k: 'circle', c: [-.96, 1.8, .4], n: [-1, 0, 0], r: .022, fill: ['#d5d8e6', '#9399c2'], lw: .3 }, { k: 'circle', c: [.96, 1.8, .4], n: [1, 0, 0], r: .022, fill: ['#d5d8e6', '#9399c2'], lw: .3 },
  ];
  // upper chest armour plate, standing proud of the chest; vents and badge live on it
  {
    const d = .085;
    const plate = add(hexaPart([[-.66, 1.3, fz(1.3) - .14], [.66, 1.3, fz(1.3) - .14], [.84, 1.9, fz(1.9) - .14], [-.84, 1.9, fz(1.9) - .14], [-.64, 1.31, fz(1.31) - .12 + d], [.64, 1.31, fz(1.31) - .12 + d], [.8, 1.86, fz(1.86) - .12 + d], [-.8, 1.86, fz(1.86) - .12 + d]], .04, 'white', { name: 'plate', zb: .03, thr: .02 }));
    const mv = [], keep = [];
    for (const dc of chest.decals) { const q = dc.c || dc.o || dc.pts[0]; (q[1] > 1.4 && q[2] > .3 && q[1] < 1.84 ? mv : keep).push(dc); }
    const sh = q => [q[0], q[1], q[2] + d - .03];
    plate.decals = mv.map(dc => Object.assign({}, dc, dc.pts ? { pts: dc.pts.map(sh) } : {}, dc.c ? { c: sh(dc.c) } : {}, dc.o ? { o: sh(dc.o) } : {}));
    plate.decals.push({ k: 'line', pts: [[-.64, 1.4, fz(1.4) + d - .03], [.64, 1.4, fz(1.4) + d - .03]], n: chestN, c: [0, 1.4, fz(1.4) + d], lw: .35, col: ['#8d92b8', '#6d72a0'] });
    chest.decals = keep;
  }
  const pack = add(boxPart([0, 1.2, -.72], [1.1, 1.05, .5], .12, 'white', { name: 'pack' }));
  { const bz = -.72 - .25 - .12 - .003, bn = [0, 0, -1];
    pack.decals = [
      { k: 'line', pts: [[-.45, 1.5, bz], [.45, 1.5, bz]], n: bn, lw: .45 }, { k: 'line', pts: [[0, 1.5, bz], [0, .78, bz]], n: bn, c: [0, 1.1, bz], lw: .45 },
      { k: 'poly', pts: [[-.42, 1.44, bz], [-.08, 1.44, bz], [-.08, 1.0, bz], [-.42, 1.0, bz]], n: bn, fill: ['#2c2f42', '#1a1b28'], lw: .45, smooth: 1 },
      ...[0, 1, 2, 3, 4].map(i => ({ k: 'line', pts: [[-.4, 1.4 - i * .085, bz - .002], [-.1, 1.4 - i * .085, bz - .002]], n: bn, c: [-.25, 1.2, bz], lw: .3, col: ['#6c7398', '#3a3d55'], taper: 2 })),
      txt([.4, 1.38, bz], [-1, 0, 0], [0, -1, 0], .28, '1', '700 100px ' + FLAT, ['#22202c', '#1d1b2a'], { n: bn, c: [.2, 1.2, bz] }),
      { k: 'circle', c: [-.48, 1.62, bz], n: bn, r: .025, fill: ['#d5d8e6', '#9399c2'], lw: .3 }, { k: 'circle', c: [.48, 1.62, bz], n: bn, r: .025, fill: ['#d5d8e6', '#9399c2'], lw: .3 },
      { k: 'circle', c: [-.48, .8, bz], n: bn, r: .025, fill: ['#d5d8e6', '#9399c2'], lw: .3 }, { k: 'circle', c: [.48, .8, bz], n: bn, r: .025, fill: ['#d5d8e6', '#9399c2'], lw: .3 },
      moss([.3, 1.86, -.85], [0, 1, 0], .06, 41, 1.5, .8), scratch3([.1, .9, bz], [.3, .95, bz], bn, ['#c9ccdc', '#8d92bb'], 43),
    ];
  }
  // twin exhaust stubs on top of the pack
  for (const s of [1, -1]) add(cylPart([s * .3, 1.72, -.8], [s * .3, 1.95, -.82], .07, .065, 'grey', { faces: false }));
  add(boxPart([0, 1.97, .02], [.74, .14, .66], .05, 'black', { zb: .05 }));

  // ---- head
  const hp = pose.head;
  const neckBase = [0, 1.98, .06];
  const H0 = M.chain(tor, M.tr(0, 2.1, .1), M.rot('y', hp.yaw), M.rot('x', -hp.pitch), M.rot('z', hp.roll));
  add(cylPart([0, 1.96, .06], [0, 2.18, .1], .15, .14, 'black', { zb: -.05 }));
  for (const s of [1, -1]) { // neck pistons
    const a = [s * .2, 1.99, .22], bw = M.ap(H0, [s * .12, .12, .14]);
    const tinv = invRT(tor); const b = M.ap(tinv, bw);
    const mid = V.lerp(a, b, .55);
    add(cylPart(a, mid, .042, .042, 'grey', { zb: .02, faces: false }));
    add(cylPart(mid, b, .026, .026, 'steel', { zb: .03, faces: false }));
  }
  const helmet = add(ellPart([0, .42, -.08], [.37, .36, .38], 'white', { name: 'helmet', zb: .06 }), H0);
  helmet.decals = [
    { k: 'line', pts: [[-.1, .7, .1], [-.14, .71, -.1], [-.12, .66, -.3]], n: [0, 1, 0], c: [-.12, .71, -.1], lw: .4, spline: 1 },
    moss([-.2, .66, -.18], [-.4, 1, 0], .055, 12, 1.2, .9),
    scratch3([.16, .69, .0], [.24, .64, -.16], [.3, 1, 0], ['#c9ccdc', '#8d92bb'], 13),
    { k: 'circle', c: [.34, .5, -.22], n: [1, .3, 0], r: .02, fill: ['#d5d8e6', '#9399c2'], lw: .3 },
    { k: 'circle', c: [-.34, .5, -.22], n: [-1, .3, 0], r: .02, fill: ['#d5d8e6', '#9399c2'], lw: .3 },
  ];
  const skirt = add(taperPart(.04, .34, [-.37, .37, -.46, .1], [-.35, .35, -.44, .08], .08, 'white', { zb: .05 }), H0);
  skirt.decals = [{ k: 'line', pts: [[.455, .26, .1], [.455, .22, -.2], [.455, .12, -.42]], n: [1, 0, 0], c: [.45, .2, -.2], lw: .4, spline: 1 }];
  add(hexaPart([[-.03, .62, .12], [.03, .62, .12], [.03, .72, .05], [-.03, .72, .05], [-.03, .7, -.34], [.03, .7, -.34], [.03, .76, -.1], [-.03, .76, -.1]].map(q => [q[0], q[1], q[2]]), .02, 'white', { zb: .07 }), H0); // crest fin
  // face housing juts forward; the visor is sunk into it
  const face = add(hexaPart([[-.25, .06, -.02], [.25, .06, -.02], [.25, .48, -.02], [-.25, .48, -.02], [-.2, .1, .38], [.2, .1, .38], [.2, .45, .38], [-.2, .45, .38]], .06, 'black', { name: 'face', zb: .1 }), H0);
  face.decals = [{ k: 'fn', n: [0, 0, 1], c: [0, .3, .44], fn: (g, cam, it, L, lit, lw) => drawVisor(g, cam, it, L, lw, pose.eyes) }];
  // brow: the helmet's peak, overhanging the visor
  const brow = add(hexaPart([[-.3, .45, .06], [.3, .45, .06], [.28, .57, .02], [-.28, .57, .02], [-.235, .465, .45], [.235, .465, .45], [.225, .515, .43], [-.225, .515, .43]], .03, 'white', { zb: .14, name: 'brow' }), H0);
  brow.decals = [{ k: 'circle', c: [-.2, .54, .36], n: [0, 1, .3], r: .016, fill: ['#d5d8e6', '#9399c2'], lw: .25 }, { k: 'circle', c: [.2, .54, .36], n: [0, 1, .3], r: .016, fill: ['#d5d8e6', '#9399c2'], lw: .25 }];
  const vent = add(boxPart([0, .18, .44], [.28, .12, .07], .025, 'grey', { zb: .13, name: 'vent' }), H0);
  vent.decals = [-2, -1, 0, 1, 2].map(i => ({ k: 'line', pts: [[i * .048, .135, .478], [i * .048, .225, .478]], n: [0, 0, 1], lw: .35, col: ['#3a3d52', '#23253a'], taper: 2 }));
  for (const s of [1, -1]) {
    add(hexaPart([[s * .24, .05, .0], [s * .33, .05, -.04], [s * .33, .44, -.06], [s * .25, .44, .0], [s * .22, .08, .26], [s * .27, .08, .22], [s * .27, .38, .2], [s * .23, .4, .26]], .025, 'white', { zb: .11 }), H0);
    const ear = add(cylPart([s * .33, .32, -.1], [s * .45, .32, -.1], .165, .155, 'white', { zb: .09, faces: false, name: 'ear' + s }), H0);
    ear.decals = [
      { k: 'circle', c: [s * .452, .32, -.1], n: [s, 0, 0], r: .105, fill: ['#8a8fa8', '#5d6080'], lw: .45, seg: 20 },
      { k: 'circle', c: [s * .455, .32, -.1], n: [s, 0, 0], r: .05, fill: ['#3b3e52', '#252737'], lw: .35 },
      { k: 'circle', c: [s * .457, .345, -.075], n: [s, 0, 0], r: .012, fill: ['#ffffff', '#c9d0e6'] },
    ];
  }
  // antenna blade (folded up, swept back)
  const ant = add(hexaPart([[.1, .62, .14], [.13, .62, .14], [.13, .66, -.1], [.1, .66, -.1], [.1, 1.52, -.46], [.13, 1.52, -.46], [.13, 1.55, -.54], [.1, 1.55, -.54]], .01, 'black', { name: 'antenna', zb: .02, lwk: .8 }), H0);
  {
    const o = [.142, .72, .06], u = V.norm(V.sub([.14, 1.5, -.48], [.14, .64, .02])), v = V.norm(V.cross(u, [1, 0, 0]));
    ant.decals = [txt(V.add(o, V.mul(v, .03)), u, V.mul(v, 1), .075, 'AV98 INGRAM', '700 100px ' + FLAT, ['#ffffff', '#c9cbe0'], { n: [1, 0, 0], c: [.14, .9, -.2] })];
  }

  // ---- shoulders, beacons, sirens
  for (const s of [1, -1]) {
    const x0 = s > 0 ? .86 : -1.46, x1 = s > 0 ? 1.46 : -.86, xt0 = s > 0 ? .86 : -1.36, xt1 = s > 0 ? 1.36 : -.86;
    const sh = add(taperPart(1.48, 2.1, [x0, x1, -.48, .5], [xt0, xt1, -.42, .45], .08, 'white', { name: s > 0 ? 'shL' : 'shR', zb: s > 0 ? .02 : 0 }));
    const on = s > 0 ? pose.beacon[0] : pose.beacon[1];
    if (s > 0) sh.decals = [
      { k: 'fn', n: [1, .15, 0], c: [1.5, 1.8, 0], fn: (g, cam, it, L, lit, lw) => {
        g.save(); const sc = planeTx(g, cam, it, [1.545, 1.94, .3], [0, 0, -1], [-.15, -1, 0]);
        g.fillStyle = lit ? '#1f1d29' : '#1a1826';
        g.beginPath(); g.moveTo(.0, .04); g.lineTo(.2, .17); g.lineTo(0, .3); g.closePath(); g.fill();
        g.font = '700 100px ' + FLAT; g.save(); g.scale(.0034, .0034); g.fillText('1', 68, 88); g.restore();
        g.restore();
      } },
      { k: 'line', pts: [[1.53, 1.6, .5], [1.53, 1.6, -.4]], n: [1, .15, 0], c: [1.53, 1.6, 0], lw: .4 },
      { k: 'circle', c: [1.54, 1.66, .4], n: [1, .1, 0], r: .022, fill: ['#d5d8e6', '#9399c2'], lw: .3 },
      { k: 'circle', c: [1.54, 1.66, -.38], n: [1, .1, 0], r: .022, fill: ['#d5d8e6', '#9399c2'], lw: .3 },
      moss([1.3, 2.186, -.3], [0, 1, 0], .06, 21, 1.4, .8),
      scratch3([1.545, 1.86, -.32], [1.545, 1.78, -.1], [1, .1, 0], ['#c9ccdc', '#8d92bb'], 22),
    ];
    else sh.decals = [
      txt([-1.545, 1.92, -.36], [0, 0, 1], [.15, -1, 0], .16, 'ALPHÔNSE', 'italic 700 100px ' + FLAT, ['#22202c', '#1d1b2a'], { n: [-1, .15, 0], c: [-1.5, 1.8, 0] }),
      moss([-1.3, 2.186, .2], [0, 1, 0], .05, 23, 1.3, .8),
    ];
    const cx = s * 1.14;
    add(boxPart([cx, 2.21, .02], [.42, .05, .82], .015, 'black', { zb: .03, faces: true }));
    const bar = add(boxPart([cx, 2.3, .02], [.3, .13, .66], .055, 'red', { name: s > 0 ? 'beaconL' : 'beaconR', zb: .04, gloss: true, emit: on > .05 ? mix('#ee3b33', '#fff0e8', on * .55) : null }));
    bar.decals = [-2, -1, 0, 1, 2].map(i => ({ k: 'line', pts: [[cx - .1, 2.37, i * .11], [cx + .1, 2.37, i * .11]], n: [0, 1, 0], lw: .3, col: on > .05 ? ['#ffd7c8', '#ffd7c8'] : ['#b92a3a', '#7f1d3d'], taper: 2 }));
    bar.decals.push({ k: 'line', pts: [[cx - .08, 2.345, .345], [cx + .08, 2.345, .345]], n: [0, 0, 1], lw: .35, col: ['#ffd0c4', '#e98a8a'] });
    const horn = add(cylPart([cx + s * .09, 2.15, .28], [cx + s * .12, 2.11, .5], .04, .095, 'steel', { zb: .05, faces: false }));
    horn.decals = [{ k: 'circle', c: [cx + s * .12, 2.11, .505], n: [s * .12, -.15, 1], r: .07, fill: ['#2a2c3c', '#1c1d2a'], lw: .3 }];
    add(ellPart([s * .96, 1.66, 0], [.22, .22, .22], 'black', { zb: -.05 }));
  }

  // ---- arms
  for (const side of ['L', 'R']) {
    const s = side === 'L' ? 1 : -1, ap = pose[side];
    const S = [s * 1.12, 1.62, 0];
    // targets are given in robot (torso) space
    const { E, W } = ik2(S, ap.wrist, .95, .9, ap.pole);
    add(capPart(S, E, .23, .205, 'black', { name: 'ua' + side, zb: -.02 }));
    add(ellPart(E, [.2, .2, .2], 'grey', { zb: -.01 }));
    // forearm rolls with the hand
    const dors = V.norm(ap.dors);
    const Ff = frameZ(E, V.sub(W, E), dors);
    const lfa = V.len(V.sub(W, E));
    const fa = add(taperPart(.0, 1, [0, 0, 0, 0], [0, 0, 0, 0], .06, 'white', { name: 'fa' + side }), M.mul(tor, Ff));
    // build forearm verts along z: (taperPart is y-up; use a custom hexa along z)
    fa.v = [[-.24, -.22, .02], [.24, -.22, .02], [.24, .23, .02], [-.24, .23, .02], [-.2, -.19, lfa - .14], [.2, -.19, lfa - .14], [.2, .2, lfa - .14], [-.2, .2, lfa - .14]];
    fa.decals = [
      { k: 'line', pts: [[.0, .292, .1], [0, .262, lfa - .2]], n: [0, 1, 0], c: [0, .29, .4], lw: .4 },
      { k: 'line', pts: [[-.25, .2, lfa * .62], [-.25, -.18, lfa * .62]], n: [-1, 0, 0], c: [-.25, 0, .5], lw: .4 },
      { k: 'line', pts: [[.25, .2, lfa * .62], [.25, -.18, lfa * .62]], n: [1, 0, 0], c: [.25, 0, .5], lw: .4 },
      scratch3([.26, .1, .2], [.255, .03, .42], [1, 0, 0], ['#c9ccdc', '#8d92bb'], 31 + s),
      scratch3([-.26, -.05, .3], [-.255, .05, .5], [-1, 0, 0], ['#c9ccdc', '#8d92bb'], 33 + s),
      { k: 'circle', c: [0, .29, .08], n: [0, 1, 0], r: .02, fill: ['#d5d8e6', '#9399c2'], lw: .3 },
    ];
    if (s > 0) {
      fa.decals.push(txt([.312, .1, .1], [0, 0, 1], [0, -1, 0], .085, 'ALPHÔNSE', 'italic 700 100px ' + FLAT, ['#22202c', '#1d1b2a'], { n: [1, 0, 0], c: [.3, 0, .4] }));
      fa.decals.push(txt([-.312, -.06, .14], [0, 0, 1], [0, 1, 0], .085, 'ALPHÔNSE', 'italic 700 100px ' + FLAT, ['#22202c', '#1d1b2a'], { n: [-1, 0, 0], c: [-.3, 0, .4] }));
    }
    add(boxPart([0, 0, lfa - .08], [.4, .38, .14], .04, 'black', { zb: .01 }), M.mul(tor, Ff));
    // hand
    const Fh = frameZ(W, ap.fdir, dors);
    const tips = [];
    for (const hp2 of handParts(Fh, s, ap.curl, side, 'black')) { hp2.M = M.mul(tor, hp2.M); hp2.side = side; if (hp2.tipF) tips.push(M.mul(tor, hp2.tipF).t); P.push(hp2); }
    A['tips' + side] = tips;
    A['hand' + side] = M.mul(tor, Fh);
    A['wrist' + side] = M.ap(tor, W);
  }
  // un-nest: arm parts above were built in torso space; give them world matrices
  for (const p of P) if (p._armLocal) p.M = M.mul(tor, p.M);
  A.head = H0; A.tor = tor; A.root = root;
  return { parts: P, A };
}
function invRT(m) { // inverse of rotation+translation
  const r = m.r, t = m.t; const rt = [r[0], r[3], r[6], r[1], r[4], r[7], r[2], r[5], r[8]];
  const it = [-(rt[0] * t[0] + rt[1] * t[1] + rt[2] * t[2]), -(rt[3] * t[0] + rt[4] * t[1] + rt[5] * t[2]), -(rt[6] * t[0] + rt[7] * t[1] + rt[8] * t[2])];
  return { r: rt, t: it };
}

// The visor: recessed glass with the camera unit behind it. Eye "lights" can
// blink, squint and close into happy arcs.
function drawVisor(g, cam, it, L, lw, eyes) {
  g.save();
  const o = [-.205, .455, .466], s = planeTx(g, cam, it, o, [1, 0, 0], [0, -1, -.09]);
  const w = .41, h = .145, lpx = lw / s;
  const rr = (x, y, ww, hh, r) => { g.beginPath(); g.moveTo(x + r, y); g.lineTo(x + ww - r, y); g.quadraticCurveTo(x + ww, y, x + ww, y + r); g.lineTo(x + ww, y + hh - r); g.quadraticCurveTo(x + ww, y + hh, x + ww - r, y + hh); g.lineTo(x + r, y + hh); g.quadraticCurveTo(x, y + hh, x, y + hh - r); g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath(); };
  // recess
  rr(0, 0, w, h, .03); g.fillStyle = '#10121c'; g.fill();
  g.save(); rr(.008, .01, w - .016, h - .02, .025); g.clip();
  // camera unit behind the glass
  g.fillStyle = '#1b2233'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#262f45'; g.fillRect(.12, .045, .17, .055);
  const ex = [.105, .305], ey = .072 + (eyes.ly || 0) * .015, er = .043;
  for (let i = 0; i < 2; i++) {
    const x = ex[i] + (eyes.lx || 0) * .012;
    g.beginPath(); g.arc(x, ey, er, 0, TAU); g.fillStyle = '#0b0d16'; g.fill();
    if ((eyes.smile || 0) < .3) { g.lineWidth = lpx * .5; g.strokeStyle = '#4a5878'; g.stroke(); g.beginPath(); g.arc(x, ey, er * .72, 0, TAU); g.strokeStyle = '#33405e'; g.stroke(); }
    // the light of the eye
    const gl = eyes.glow === undefined ? 1 : eyes.glow, op = clamp(eyes.open === undefined ? 1 : eyes.open, 0, 1), sm = eyes.smile || 0;
    if (gl > 0) {
      g.save();
      g.globalCompositeOperation = 'lighter';
      const gr = g.createRadialGradient(x, ey, 0, x, ey, er * 2.4);
      gr.addColorStop(0, `rgba(150,255,240,${.55 * gl})`); gr.addColorStop(.35, `rgba(70,210,230,${.25 * gl * (.4 + .6 * op)})`); gr.addColorStop(1, 'rgba(40,120,200,0)');
      g.fillStyle = gr; g.fillRect(x - er * 2.5, ey - er * 2.5, er * 5, er * 5);
      g.restore();
      if (sm > .02 && op < .6) {
        // happy closed eye: a bright upward arc, like a smile
        g.beginPath(); g.ellipse(x, ey + er * .5, er * .85, er * .75 * sm + .002, 0, Math.PI * 1.12, Math.PI * 1.88);
        g.lineWidth = er * .5; g.lineCap = 'round'; g.strokeStyle = `rgba(225,255,250,${gl})`; g.stroke();
        g.lineWidth = er * .2; g.strokeStyle = `rgba(255,255,255,${gl})`; g.stroke();
      } else {
        const ry = er * .55 * Math.max(.08, op);
        g.beginPath(); g.ellipse(x, ey, er * .55, ry, 0, 0, TAU); g.fillStyle = `rgba(190,255,248,${gl})`; g.fill();
        g.beginPath(); g.ellipse(x - er * .12, ey - ry * .25, er * .2, Math.max(.002, ry * .35), 0, 0, TAU); g.fillStyle = `rgba(255,255,255,${gl})`; g.fill();
        if (op < .97) { // shutter lids
          g.fillStyle = '#0b0d16';
          g.fillRect(x - er, ey - er - .01, er * 2, er * (1 - op) * .9 + .01);
          g.fillRect(x - er, ey + er * (1 - (1 - op) * .9), er * 2, er);
        }
      }
    }
  }
  // glass tint and reflections
  const gg = g.createLinearGradient(0, 0, 0, h);
  gg.addColorStop(0, 'rgba(120,190,235,.55)'); gg.addColorStop(.35, 'rgba(40,90,150,.25)'); gg.addColorStop(1, 'rgba(20,40,80,.15)');
  g.fillStyle = gg; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(235,250,255,.55)';
  g.beginPath(); g.moveTo(.2, 0); g.lineTo(.26, 0); g.lineTo(.2, h); g.lineTo(.14, h); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(.285, 0); g.lineTo(.3, 0); g.lineTo(.24, h); g.lineTo(.225, h); g.closePath(); g.fill();
  g.fillStyle = 'rgba(255,255,255,.75)'; g.fillRect(.02, .014, w - .04, .008);
  g.restore();
  rr(0, 0, w, h, .03); g.lineWidth = lpx * .7; g.strokeStyle = INK; g.stroke();
  g.restore();
}
