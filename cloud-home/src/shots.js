// The sets, the shots and the timeline of 《给云朵送一程》.
'use strict';
const DUR = 57.5;
const EVE = [[0, '#8aa0d2'], [.38, '#d6b0c6'], [.66, '#f7c79f'], [.86, '#ffe2ad'], [1, '#fff0c8']];
const blinkAt = (t, list) => { let e = 1; for (const b of list) e = Math.min(e, 1 - env(t, b, b + .06, b + .1, b + .18)); return e; };

// =====================================================================
// 1. Valley at golden hour (0 – 6.3 s)
// =====================================================================
const V = {};
const vf1 = x => 500 - 55 * Math.sin(x * .0042 + .5) - 30 * Math.sin(x * .011 + 1) - 80 * gauss(x, 380, 260) - 60 * gauss(x, 1150, 220);
const vf2 = x => 590 - 42 * Math.sin(x * .0052 + 2) - 20 * Math.sin(x * .016 + 1) - 45 * gauss(x, 760, 200);
const vf3 = x => 652 - 150 * gauss(x, 280, 420) - 14 * Math.sin(x * .01);
const vf4 = x => 708 - 95 * gauss(x, 1780, 360);
const vTrack = x => 752 + 8 * Math.sin(x * .0025);
const vBank = x => 962 - 46 * gauss(x, 260, 520) + 12 * Math.sin(x * .004);
const POLES = [[1720, 1060, 1.0], [1505, 912, .6], [1372, 818, .38], [1292, 764, .25], [1240, 730, .17], [1206, 708, .12]];

function rimStroke(f, x0, x1, col, w) { ctx.strokeStyle = col; ctx.lineWidth = w; strokeRidge(f, x0, x1, 8); ctx.stroke(); }
function streaks(list) {
  ctx.save(); ctx.filter = 'blur(4px)';
  for (const [x, y, w, h, a] of list) { ctx.fillStyle = `rgba(255,236,205,${a})`; ctx.beginPath(); ctx.ellipse(x, y, w / 2, h / 2, 0, 0, 6.2832); ctx.fill(); }
  ctx.restore();
}
function fields() {
  const r = rng(61), cols = ['#d3cb84', '#a9bf6c', '#e2cd8c', '#93b464', '#bfd389', '#d9b977', '#9cc070'];
  let y0 = 664;
  for (let j = 0; j < 7; j++) {
    const hg = 14 + j * j * 4 + j * 6, y1 = y0 + hg, sp = 1 + j * .07;
    let x = -300;
    while (x < W + 300) {
      const wd = 120 + r() * 240 + j * 50, x1 = x + wd;
      ctx.fillStyle = rgba(cols[(r() * cols.length) | 0], .78);
      ctx.beginPath(); ctx.moveTo(960 + (x - 960) * sp, y0); ctx.lineTo(960 + (x1 - 960) * sp, y0);
      ctx.lineTo(960 + (x1 - 960) * (sp + .07), y1); ctx.lineTo(960 + (x - 960) * (sp + .07), y1); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(90,110,60,.16)'; ctx.lineWidth = 1;
      for (let k = 1; k < 4; k++) { const yy = y0 + hg * k / 4; ctx.beginPath(); ctx.moveTo(960 + (x - 960) * sp, yy); ctx.lineTo(960 + (x1 - 960) * sp, yy); ctx.stroke(); }
      x = x1;
    }
    ctx.strokeStyle = 'rgba(70,100,55,.5)'; ctx.lineWidth = 2 + j * .9;
    ctx.beginPath(); for (let xx = -20; xx <= W + 20; xx += 20) { const yy = y1 + Math.sin(xx * .02 + j) * 1.2; xx === -20 ? ctx.moveTo(xx, yy) : ctx.lineTo(xx, yy); } ctx.stroke();
    for (let k = 0; k < 10; k++) { const xx = r() * W, rr = 4 + j * 2 + r() * 4; ctx.fillStyle = '#5f8a4a'; ctx.beginPath(); ctx.arc(xx, y1 - rr * .6, rr, 0, 6.2832); ctx.fill(); ctx.fillStyle = 'rgba(230,220,140,.55)'; ctx.beginPath(); ctx.arc(xx + rr * .3, y1 - rr, rr * .5, 0, 6.2832); ctx.fill(); }
    y0 = y1;
  }
}
function town() {
  const r = rng(71), roofs = ['#c9574a', '#5e8f95', '#8a5a45', '#d07a52', '#4f7a8a'], items = [];
  for (let i = 0; i < 20; i++) { const x = 110 + r() * 540; items.push({ k: 'h', x, y: vf3(x) + 14 + r() * 72, s: .8 + r() * .6, roof: roofs[(r() * 5) | 0] }); }
  for (let i = 0; i < 26; i++) { const x = 60 + r() * 640; items.push({ k: 't', x, y: vf3(x) + 8 + r() * 80, s: .7 + r() * .8 }); }
  items.sort((a, b) => a.y - b.y);
  for (const h of items) {
    if (h.k === 't') {
      const rr = 9 * h.s; ctx.fillStyle = '#56804a'; ctx.beginPath(); ctx.ellipse(h.x, h.y - rr, rr * .9, rr * 1.1, 0, 0, 6.2832); ctx.fill();
      ctx.fillStyle = 'rgba(232,214,140,.6)'; ctx.beginPath(); ctx.ellipse(h.x + rr * .3, h.y - rr * 1.4, rr * .45, rr * .5, 0, 0, 6.2832); ctx.fill();
      continue;
    }
    const w = 30 * h.s, hh = 19 * h.s, top = h.y - hh;
    ctx.fillStyle = '#f5e8d4'; ctx.fillRect(h.x - w / 2, top, w, hh);
    ctx.fillStyle = '#d3c1ae'; ctx.fillRect(h.x - w / 2, top, w * .34, hh);
    ctx.fillStyle = h.roof; ctx.beginPath(); ctx.moveTo(h.x - w / 2 - 3, top); ctx.lineTo(h.x - w / 2 + 4, top - 12 * h.s); ctx.lineTo(h.x + w / 2 - 4, top - 12 * h.s); ctx.lineTo(h.x + w / 2 + 3, top); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,230,190,.35)'; ctx.beginPath(); ctx.moveTo(h.x, top - 12 * h.s); ctx.lineTo(h.x + w / 2 - 4, top - 12 * h.s); ctx.lineTo(h.x + w / 2 + 3, top); ctx.lineTo(h.x + 2, top); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffd98a'; ctx.fillRect(h.x - w * .1, top + hh * .3, 4 * h.s, 4 * h.s); ctx.fillRect(h.x + w * .18, top + hh * .3, 4 * h.s, 4 * h.s);
  }
}
function road() {
  const P = [[1560, 1060], [1180, 900], [820, 780], [430, 700]];
  for (let i = 0; i <= 80; i++) {
    const u = i / 80, a = 1 - u;
    const x = a * a * a * P[0][0] + 3 * a * a * u * P[1][0] + 3 * a * u * u * P[2][0] + u * u * u * P[3][0];
    const y = a * a * a * P[0][1] + 3 * a * a * u * P[1][1] + 3 * a * u * u * P[2][1] + u * u * u * P[3][1];
    ctx.fillStyle = '#e8d4a4'; ctx.beginPath(); ctx.ellipse(x, y, lerp(34, 3, u), lerp(9, 1.2, u), -.35, 0, 6.2832); ctx.fill();
  }
}
function buildValley() {
  V.sky = layer(W, H, 1, () => {
    ctx.fillStyle = vgrad(0, 650, EVE); ctx.fillRect(0, 0, W, H);
    glow(1480, 590, 820, '#ffd49a', .6, 'source-over');
    glow(1480, 590, 140, '#fff4d8', .9, 'source-over');
    ctx.fillStyle = '#fff8e6'; ctx.beginPath(); ctx.arc(1480, 590, 40, 0, 6.2832); ctx.fill();
    streaks([[1180, 520, 560, 10, .5], [1640, 548, 420, 7, .45], [320, 470, 480, 9, .35], [820, 430, 380, 6, .3], [1500, 470, 300, 6, .35]]);
  });
  V.cloud = cloudSprite(900, 270, 21, PAL_EVE, LIGHT_RIGHT, 1);
  V.cloud2 = cloudSprite(380, 120, 22, PAL_EVE, LIGHT_RIGHT, 1);
  V.cloud3 = cloudSprite(280, 95, 23, PAL_EVE, LIGHT_RIGHT, 1);
  V.land = layer(W, H, 1, () => {
    ridge(vf1, -20, W + 20, 10, H); ctx.fillStyle = vgrad(420, 640, [[0, '#ab9cc6'], [1, '#e2bcc0']]); ctx.fill();
    rimStroke(vf1, -20, W + 20, 'rgba(255,226,180,.45)', 2.5);
    ctx.fillStyle = vgrad(520, 650, [[0, 'rgba(255,225,200,0)'], [1, 'rgba(255,225,200,.6)']]); ctx.fillRect(0, 520, W, 140);
    ridge(vf2, -20, W + 20, 10, H); ctx.fillStyle = vgrad(520, 680, [[0, '#9690b6'], [1, '#c9aab4']]); ctx.fill();
    rimStroke(vf2, -20, W + 20, 'rgba(255,215,170,.5)', 2);
    ctx.fillStyle = vgrad(640, 1040, [[0, '#c9c47e'], [.4, '#9fb566'], [1, '#6f9150']]); ctx.fillRect(0, 640, W, 400);
    fields();
    ctx.fillStyle = vgrad(640, 720, [[0, 'rgba(255,230,200,.55)'], [1, 'rgba(255,230,200,0)']]); ctx.fillRect(0, 640, W, 80);
    ridge(vf4, -20, W + 20, 10, H); ctx.fillStyle = vgrad(600, 900, [[0, '#a9ba6e'], [1, '#7c9a55']]); ctx.fill();
    rimStroke(vf4, 1300, W + 20, 'rgba(255,225,160,.55)', 3);
    ridge(vf3, -20, W + 20, 10, H); ctx.fillStyle = vgrad(480, 900, [[0, '#b4c275'], [1, '#86a05c']]); ctx.fill();
    rimStroke(vf3, -20, 900, 'rgba(255,225,160,.55)', 3);
    town();
    road();
    ctx.strokeStyle = '#6d7f4a'; ctx.lineWidth = 10; strokeRidge(vTrack, -20, W + 20, 10); ctx.stroke();
    ctx.strokeStyle = '#5a4a44'; ctx.lineWidth = 1.6; strokeRidge(x => vTrack(x) - 4, -20, W + 20, 10); ctx.stroke();
  });
  V.front = layer(W, H, 1, () => {
    // utility poles receding along the road
    for (let i = 0; i < POLES.length - 1; i++) {
      const [x0, b0, s0] = POLES[i], [x1, b1, s1] = POLES[i + 1];
      for (const off of [-30, 30]) {
        const ax = x0 + off * s0, ay = b0 - 540 * s0 + 18 * s0, bx = x1 + off * s1, by = b1 - 540 * s1 + 18 * s1;
        ctx.strokeStyle = 'rgba(70,55,65,.75)'; ctx.lineWidth = Math.max(.8, 2 * s0);
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo((ax + bx) / 2, (ay + by) / 2 + 26 * s0, bx, by); ctx.stroke();
      }
    }
    for (const [x, b, s] of POLES) {
      const top = b - 540 * s;
      ctx.fillStyle = '#5b4a4c'; ctx.fillRect(x - 7 * s, top, 14 * s, 540 * s);
      ctx.fillStyle = 'rgba(255,210,150,.5)'; ctx.fillRect(x + 3 * s, top, 4 * s, 540 * s);
      ctx.fillStyle = '#5b4a4c'; ctx.fillRect(x - 40 * s, top + 14 * s, 80 * s, 8 * s);
    }
    ridge(vBank, -20, W + 20, 10, H); ctx.fillStyle = vgrad(900, 1040, [[0, '#89a356'], [1, '#4f6c3a']]); ctx.fill();
    rimStroke(vBank, -20, W + 20, 'rgba(255,220,160,.5)', 3);
  });
  V.branch = layer(820, 480, 1, () => {
    const r = rng(81), lobes = [];
    ctx.strokeStyle = '#4b3a30'; ctx.lineWidth = 16; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-20, 40); ctx.quadraticCurveTo(260, 60, 560, 150); ctx.stroke();
    ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(300, 80); ctx.quadraticCurveTo(380, 170, 420, 250); ctx.stroke();
    const pts = [[60, 70, 90], [200, 120, 80], [330, 110, 85], [470, 170, 70], [400, 250, 60], [130, 190, 70], [560, 160, 50], [270, 220, 60]];
    for (const [x, y, R] of pts) for (let i = 0; i < 5; i++) { const a = r() * 6.28, d = r() * R * .6; lobes.push(makeLobe(r, x + Math.cos(a) * d, y + Math.sin(a) * d * .7, R * (.45 + r() * .3), 8)); }
    lobes.sort((a, b) => (a.y - a.R) - (b.y - b.R));
    ctx.filter = 'blur(1.4px)';
    paintLobes(ctx, lobes, { shadow: '#30502e', mid: '#557f40', hi: '#efd88e' }, LIGHT_RIGHT);
    ctx.filter = 'none';
  });
  const r = rng(91); V.blades = [];
  for (let i = 0; i < 900; i++) V.blades.push({ x: r() * (W + 40) - 20, d: r() * 70, h: 18 + r() * 40, c: r(), ph: r() * 6.28 });
  V.blades.sort((a, b) => a.d - b.d);
  V.fl = []; for (let i = 0; i < 70; i++) V.fl.push({ x: r() * W, d: 10 + r() * 60, c: ['#fffaf0', '#ffe27a', '#f6a6c1'][(r() * 3) | 0], ph: r() * 6.28, s: 3 + r() * 2 });
}
function bankGrass(t) {
  const cols = ['#4d6b3a', '#5f8143', '#76984e', '#95b360', '#c9cf7f'], paths = cols.map(() => new Path2D());
  for (const b of V.blades) {
    const y = vBank(b.x) + b.d, w = .45 + .35 * Math.sin(b.x * .004 - t * 1.8) + .1 * Math.sin(t * 3 + b.ph), bend = w * b.h * .5;
    const L = clamp(Math.floor((b.c * .6 + w * .5) * 5), 0, 4);
    paths[L].moveTo(b.x, y); paths[L].quadraticCurveTo(b.x + bend * .3, y - b.h * .6, b.x + bend, y - b.h + Math.abs(bend) * .3);
  }
  ctx.lineCap = 'round'; ctx.lineWidth = 2.6;
  paths.forEach((p, i) => { ctx.strokeStyle = cols[i]; ctx.stroke(p); });
  for (const f of V.fl) flower(f.x, vBank(f.x) + f.d - 16, f.s, f.c, t, f.ph, .5);
}
function train(x, t) {
  // steam first, so the engine sits in front of it
  const step = .2, n0 = Math.floor(t / step);
  for (let k = 0; k < 14; k++) {
    const te = (n0 - k) * step; if (te < 0) continue;
    const a = t - te, cx = (-300 + te * 235) - 22 - a * 26, cy = vTrack(-300 + te * 235) - 34 - a * 30 - a * a * 3;
    const rr = 5 + a * 10, al = .6 * (1 - a / 2.8); if (al <= 0) continue;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rr); g.addColorStop(0, `rgba(255,244,228,${al})`); g.addColorStop(1, 'rgba(255,244,228,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rr, 0, 6.2832); ctx.fill();
  }
  const y = vTrack(x);
  for (let k = 3; k >= 1; k--) {
    const x1 = x - 66 - (k - 1) * 62 - 4, x0 = x1 - 56, yy = vTrack(x0 + 28);
    ctx.fillStyle = '#7a6a5e'; ctx.fillRect(x0 - 1, yy - 26, 58, 4);
    ctx.fillStyle = '#efe1c2'; ctx.fillRect(x0, yy - 23, 56, 17);
    ctx.fillStyle = '#4f8a8b'; ctx.fillRect(x0, yy - 11, 56, 3);
    ctx.fillStyle = '#ffe1a0'; for (let w = 0; w < 4; w++) ctx.fillRect(x0 + 5 + w * 13, yy - 20, 8, 6);
    ctx.fillStyle = '#2f3438'; ctx.beginPath(); ctx.arc(x0 + 10, yy - 5, 3, 0, 6.2832); ctx.arc(x0 + 46, yy - 5, 3, 0, 6.2832); ctx.fill();
  }
  ctx.fillStyle = '#3a4850'; ctx.fillRect(x - 66, y - 31, 20, 25);
  ctx.fillStyle = '#ffe1a0'; ctx.fillRect(x - 62, y - 27, 9, 7);
  ctx.fillStyle = '#2f3a40'; ctx.beginPath(); ctx.roundRect(x - 48, y - 23, 46, 16, 6); ctx.fill();
  ctx.fillStyle = '#c4473a'; ctx.fillRect(x - 48, y - 12, 46, 2.5); ctx.fillRect(x - 3, y - 12, 5, 6);
  ctx.fillStyle = '#2f3a40'; ctx.fillRect(x - 26, y - 32, 7, 10);
  ctx.fillStyle = '#20262a'; for (const wx of [-58, -40, -22, -8]) { ctx.beginPath(); ctx.arc(x + wx, y - 5, 3.6, 0, 6.2832); ctx.fill(); }
  glow(x + 1, y - 16, 26, '#ffe2a0', .7);
}
function shotValley(t) {
  const z = lerp(1, 1.07, ease(t / 6.3));
  cam(960 + t * 5, 520, z);
  blit(V.sky);
  drawCloud(V.cloud, 1000 + t * 3, 330); drawCloud(V.cloud2, 300 + t * 5, 300); drawCloud(V.cloud3, 1640 + t * 4, 440, .9);
  blit(V.land);
  train(-300 + t * 235, t);
  blit(V.front);
  bankGrass(t);
  screen();
  ctx.save(); ctx.translate(-30, -40); ctx.rotate(.015 * Math.sin(t * 1.2)); ctx.drawImage(V.branch, 0, 0); ctx.restore();
  motes(t, 34, 5, .55);
}

// =====================================================================
// 2–3. The front door (6.3 – 16.6 s)
// =====================================================================
const D = {};
const DOOR = { x0: 900, x1: 1190, y0: 338, y1: 875 };
const STEP2_TOP = 922, KID_HOME = [1152, 900];
function planks() {
  const r = rng(101);
  for (let x = 560; x < W; x += 64) {
    const c = mix('#e4c69c', '#d6b384', r());
    ctx.fillStyle = c; ctx.fillRect(x, 60, 64, 830);
    ctx.strokeStyle = 'rgba(150,110,75,.55)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, 60); ctx.lineTo(x, 890); ctx.stroke();
    ctx.lineWidth = 1;
    for (let k = 0; k < 4; k++) {
      ctx.strokeStyle = `rgba(${r() < .5 ? '170,130,90' : '245,225,195'},.35)`;
      const gx = x + 8 + r() * 48; ctx.beginPath(); ctx.moveTo(gx, 60);
      for (let y = 60; y < 890; y += 40) ctx.lineTo(gx + Math.sin(y * .02 + k) * 2.5, y); ctx.stroke();
    }
    if (r() < .5) { ctx.fillStyle = 'rgba(120,85,60,.35)'; ctx.beginPath(); ctx.ellipse(x + 20 + r() * 24, 200 + r() * 600, 4, 7, 0, 0, 6.2832); ctx.fill(); }
  }
}
function buildDoor() {
  D.bg = layer(W, H, 2, () => {
    // garden glimpse on the left
    ctx.fillStyle = vgrad(0, 860, EVE); ctx.fillRect(0, 0, 600, 1040);
    glow(120, 640, 520, '#ffd9a0', .5, 'source-over');
    ridge(x => 650 - 40 * Math.sin(x * .008) - 60 * gauss(x, 230, 170), -20, 620, 10, 1040); ctx.fillStyle = '#a49dc0'; ctx.fill();
    ridge(x => 730 - 26 * Math.sin(x * .01 + 1), -20, 620, 10, 1040); ctx.fillStyle = vgrad(690, 900, [[0, '#9fb46e'], [1, '#7b9a55']]); ctx.fill();
    const r = rng(111);
    ctx.fillStyle = '#4b3a30'; ctx.fillRect(110, 520, 14, 300);
    const tl = []; for (let i = 0; i < 14; i++) tl.push(makeLobe(r, 117 + (r() - .5) * 180, 480 + (r() - .5) * 140, 40 + r() * 26, 8));
    tl.sort((a, b) => (a.y - a.R) - (b.y - b.R)); paintLobes(ctx, tl, { shadow: '#3c6436', mid: '#64924a', hi: '#e8dc8e' }, { ox: -.08, oy: -.12, hx: -.38, hy: -.3 });
    for (let x = 6; x < 580; x += 36) {
      ctx.fillStyle = '#f2ece1'; ctx.beginPath(); ctx.moveTo(x, 870); ctx.lineTo(x, 772); ctx.lineTo(x + 10, 760); ctx.lineTo(x + 20, 772); ctx.lineTo(x + 20, 870); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#d4cabb'; ctx.fillRect(x + 13, 772, 7, 98);
    }
    ctx.fillStyle = '#e6dccd'; ctx.fillRect(0, 792, 580, 8); ctx.fillRect(0, 840, 580, 8);
    ctx.fillStyle = vgrad(860, 1040, [[0, '#8ba95c'], [1, '#5f7e45']]); ctx.fillRect(0, 862, 600, 180);
    for (let i = 0; i < 46; i++) flower(r() * 560, 800 + r() * 130, 5 + r() * 4, ['#f6a6c1', '#fffaf0', '#f08aa0', '#ffe27a'][(r() * 4) | 0], 0, r() * 6, 0);
    // wall
    planks();
    ctx.fillStyle = vgrad(60, 170, [[0, 'rgba(70,40,25,.45)'], [1, 'rgba(70,40,25,0)']]); ctx.fillRect(560, 60, W, 110);
    const lg = ctx.createLinearGradient(560, 0, 1700, 0); lg.addColorStop(0, 'rgba(255,196,120,.32)'); lg.addColorStop(1, 'rgba(255,196,120,0)');
    ctx.fillStyle = lg; ctx.fillRect(560, 60, W, 830);
    ctx.fillStyle = '#5b4036'; ctx.fillRect(520, 0, W, 66);
    ctx.fillStyle = '#6f4d41'; for (let x = 560; x < W; x += 120) ctx.fillRect(x, 54, 34, 22);
    ctx.fillStyle = '#6a4a3a'; ctx.fillRect(552, 0, 40, 905);
    ctx.fillStyle = 'rgba(255,200,130,.4)'; ctx.fillRect(552, 0, 8, 905);
    // window
    ctx.fillStyle = '#efe6d6'; ctx.fillRect(1408, 348, 324, 304);
    ctx.fillStyle = vgrad(362, 640, [[0, '#b9cfe6'], [.6, '#f2d2b6'], [1, '#e9b998']]); ctx.fillRect(1424, 364, 292, 272);
    ctx.fillStyle = 'rgba(255,248,236,.85)';
    ctx.beginPath(); ctx.moveTo(1424, 364); ctx.quadraticCurveTo(1470, 480, 1440, 636); ctx.lineTo(1424, 636); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(1716, 364); ctx.quadraticCurveTo(1670, 480, 1700, 636); ctx.lineTo(1716, 636); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.moveTo(1500, 364); ctx.lineTo(1560, 364); ctx.lineTo(1470, 636); ctx.lineTo(1430, 636); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#efe6d6'; ctx.fillRect(1565, 364, 10, 272); ctx.fillRect(1424, 496, 292, 10);
    ctx.fillStyle = '#8a5a3c'; ctx.fillRect(1396, 652, 348, 34);
    for (let i = 0; i < 26; i++) { const x = 1410 + r() * 320, y = 646 + r() * 10; ctx.fillStyle = '#4f7d3e'; ctx.beginPath(); ctx.ellipse(x, y + 4, 10, 6, r() * 3, 0, 6.2832); ctx.fill(); }
    for (let i = 0; i < 16; i++) { const x = 1414 + r() * 312, y = 632 + r() * 12; ctx.fillStyle = r() < .6 ? '#d9473f' : '#f08aa0'; ctx.beginPath(); ctx.arc(x, y, 7 + r() * 4, 0, 6.2832); ctx.fill(); }
    // lamp
    ctx.fillStyle = '#3a3330'; ctx.fillRect(1282, 320, 6, 40); ctx.fillRect(1268, 356, 34, 6);
    ctx.fillStyle = '#ffe3a0'; ctx.beginPath(); ctx.roundRect(1272, 362, 26, 40, 5); ctx.fill();
    ctx.strokeStyle = '#3a3330'; ctx.lineWidth = 3; ctx.stroke();
    // door frame and interior
    ctx.fillStyle = '#7a5a44'; ctx.fillRect(878, 316, 334, 562);
    ctx.fillStyle = 'rgba(255,205,140,.35)'; ctx.fillRect(878, 316, 8, 562);
    const ig = ctx.createRadialGradient(1045, 520, 20, 1045, 600, 420); ig.addColorStop(0, '#ffe0a4'); ig.addColorStop(.6, '#e8a866'); ig.addColorStop(1, '#9a5a32');
    ctx.fillStyle = ig; ctx.fillRect(DOOR.x0, DOOR.y0, 290, 537);
    ctx.fillStyle = '#b77a48'; ctx.fillRect(DOOR.x0, 780, 290, 95);
    ctx.strokeStyle = 'rgba(110,65,35,.5)'; ctx.lineWidth = 2;
    for (let k = -4; k <= 4; k++) { ctx.beginPath(); ctx.moveTo(1045 + k * 12, 780); ctx.lineTo(1045 + k * 60, 875); ctx.stroke(); }
    ctx.fillStyle = '#7a4a2c'; ctx.fillRect(908, 690, 64, 92); ctx.fillStyle = '#93603c'; ctx.fillRect(912, 696, 56, 6);
    ctx.fillStyle = 'rgba(80,45,30,.55)'; ctx.beginPath(); ctx.ellipse(1160, 470, 16, 40, 0, 0, 6.2832); ctx.fill();
    glow(1045, 372, 140, '#fff1c8', .7, 'source-over');
    // foundation, steps and path
    ctx.fillStyle = '#b5a58f'; ctx.fillRect(560, 878, W, 30);
    const stone = (x0, x1, top, faceTop, bot) => {
      ctx.fillStyle = '#ddd1bd'; ctx.fillRect(x0, top, x1 - x0, faceTop - top);
      ctx.fillStyle = vgrad(faceTop, bot, [[0, '#b2a490'], [1, '#97897a']]); ctx.fillRect(x0, faceTop, x1 - x0, bot - faceTop);
      ctx.fillStyle = 'rgba(255,215,160,.35)'; ctx.fillRect(x0, top, (x1 - x0) * .4, faceTop - top);
      for (let i = 0; i < 60; i++) { ctx.fillStyle = `rgba(${r() < .5 ? '90,80,70' : '240,230,210'},.25)`; ctx.fillRect(x0 + r() * (x1 - x0), faceTop + r() * (bot - faceTop), 2 + r() * 3, 1.5); }
      ctx.fillStyle = 'rgba(110,150,80,.6)'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.ellipse(x0 + r() * (x1 - x0), bot - 2, 6 + r() * 10, 3, 0, 0, 6.2832); ctx.fill(); }
    };
    stone(860, 1230, 875, 884, 920); stone(805, 1285, 920, 929, 968);
    ctx.fillStyle = vgrad(966, 1040, [[0, '#cdbca2'], [1, '#b6a387']]); ctx.fillRect(560, 966, W, 80);
    ctx.fillStyle = vgrad(966, 1040, [[0, '#86a35a'], [1, '#62813f']]);
    ctx.beginPath(); ctx.moveTo(560, 966); ctx.lineTo(760, 966); ctx.lineTo(640, 1040); ctx.lineTo(560, 1040); ctx.fill();
    ctx.beginPath(); ctx.moveTo(1330, 966); ctx.lineTo(W, 966); ctx.lineTo(W, 1040); ctx.lineTo(1450, 1040); ctx.fill();
    for (let i = 0; i < 90; i++) { ctx.fillStyle = `rgba(${r() < .5 ? '150,135,115' : '235,225,205'},.5)`; ctx.beginPath(); ctx.ellipse(700 + r() * 760, 975 + r() * 60, 3 + r() * 5, 2 + r() * 2, 0, 0, 6.2832); ctx.fill(); }
    // pots
    for (const [px, fl] of [[760, '#f08aa0'], [1360, '#d9473f']]) {
      ctx.fillStyle = '#c46e4c'; ctx.beginPath(); ctx.moveTo(px - 38, 900); ctx.lineTo(px + 38, 900); ctx.lineTo(px + 28, 968); ctx.lineTo(px - 28, 968); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#d9845f'; ctx.fillRect(px - 42, 896, 84, 12);
      ctx.fillStyle = 'rgba(255,210,160,.35)'; ctx.fillRect(px - 36, 908, 18, 56);
      for (let i = 0; i < 22; i++) { ctx.fillStyle = r() < .5 ? '#4f7d3e' : '#6a9a4c'; ctx.beginPath(); ctx.ellipse(px + (r() - .5) * 90, 880 - r() * 60, 13, 7, r() * 3, 0, 6.2832); ctx.fill(); }
      for (let i = 0; i < 12; i++) { ctx.fillStyle = fl; ctx.beginPath(); ctx.arc(px + (r() - .5) * 80, 846 - r() * 50, 7 + r() * 5, 0, 6.2832); ctx.fill(); }
    }
    // ivy along the door frame
    for (let i = 0; i < 40; i++) { const y = 330 + i * 14 + r() * 8, x = 862 + Math.sin(i * .7) * 10; ctx.fillStyle = r() < .5 ? '#4f7d3e' : '#6e9e4e'; ctx.beginPath(); ctx.ellipse(x, y, 9, 6, r() * 3, 0, 6.2832); ctx.fill(); }
  });
}
function doorSlab(a) {
  const { x0, x1, y0, y1 } = DOOR, wd = x1 - x0, k = 1 / (1 + .22 * Math.sin(a)), ex = x0 + wd * Math.cos(a), hz = 600;
  const P = (u, v) => [lerp(x0, ex, u), hz + (lerp(y0, y1, v) - hz) * lerp(1, k, u)];
  const quad = (u0, v0, u1, v1) => { const a1 = P(u0, v0), b = P(u1, v0), c = P(u1, v1), d = P(u0, v1); ctx.beginPath(); ctx.moveTo(a1[0], a1[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.closePath(); };
  if (a > .02) { const e0 = P(1, 0), e1 = P(1, 1), th = 16 * Math.sin(a); ctx.fillStyle = '#5d8a86'; ctx.fillRect(e0[0] - th, e0[1], th, e1[1] - e0[1]); }
  quad(0, 0, 1, 1); ctx.fillStyle = mix('#41716e', '#2c5150', Math.sin(a)); ctx.fill();
  ctx.strokeStyle = 'rgba(20,45,45,.55)'; ctx.lineWidth = 3;
  quad(.12, .4, .88, .63); ctx.stroke(); quad(.12, .69, .88, .93); ctx.stroke();
  quad(.18, .07, .82, .32); ctx.fillStyle = 'rgba(255,214,150,.9)'; ctx.fill(); ctx.stroke();
  const m1 = P(.5, .07), m2 = P(.5, .32), m3 = P(.18, .195), m4 = P(.82, .195);
  ctx.beginPath(); ctx.moveTo(m1[0], m1[1]); ctx.lineTo(m2[0], m2[1]); ctx.moveTo(m3[0], m3[1]); ctx.lineTo(m4[0], m4[1]); ctx.stroke();
  const kn = P(.88, .56); ctx.fillStyle = '#d4a85a'; ctx.beginPath(); ctx.arc(kn[0], kn[1], 7 * lerp(1, k, .88), 0, 6.2832); ctx.fill();
}
function doorGirl(t) {
  // she walks in from the side of the hallway, then steps forward onto the threshold
  const side = ease3((t - 7.15) / .75), enter = ease3((t - 7.9) / .8);
  const walking = side > 0 && side < 1 || enter > 0 && enter < 1;
  const S = lerp(3.55, 4.0, enter), gy = lerp(856, 875, enter) - (walking ? Math.abs(Math.sin(t * 9)) * 4 : 0), gx = lerp(1250, 1045, side);
  const lookK = ramp(t, 8.6, 9.0) * (1 - ramp(t, 13.2, 13.7)), sur = env(t, 8.75, 9.0, 9.5, 9.9);
  const chest = env(t, 8.8, 9.1, 11.3, 12.1), cup = ramp(t, 13.6, 14.5), upK = ramp(t, 16.0, 16.45);
  const kidDown = ramp(t, 13.3, 13.8) * (1 - upK);
  const tilt = .12 * lookK - .09 * env(t, 11.2, 11.8, 12.5, 13.1) + .05 * kidDown;
  const look = [lerp(lerp(0, 1.2, lookK), .4, kidDown + upK), lerp(lerp(0, 1.7, lookK), 1.9, kidDown) * (1 - upK) - 2.3 * upK];
  let R = lerpPose(POSE.down, POSE.chest, chest), L = lerpPose(POSE.down, POSE.chest, chest);
  R = lerpPose(R, POSE.cup, cup); L = lerpPose(L, POSE.cup, cup);
  if (t < 7.15) return { L: [gx, gy], R: [gx, gy] };
  const clip = enter < .35;
  if (clip) { ctx.save(); ctx.beginPath(); ctx.rect(DOOR.x0, 0, DOOR.x1 - DOOR.x0, 900); ctx.clip(); }
  const hands = girlFront(gx, gy, S, {
    crouch: ramp(t, 12.95, 13.9), R, L, tilt, look, surprise: sur, smile: .3 + .45 * ramp(t, 11.3, 11.9) + .25 * ramp(t, 16.1, 16.5),
    eye: blinkAt(t, [7.85, 12.25, 15.3]), t, light: -1, rim: .5, headLift: upK * 1.4, scarfDir: 1.38, scarfAmp: .12, scarfSpeed: 2
  });
  if (clip) ctx.restore();
  return hands;
}
function kidDoor(t) {
  let x = KID_HOME[0], y = KID_HOME[1] - Math.sin(t * 2.2) * 2;
  const hover = 22 * ramp(t, 9.3, 9.8) * (1 - ramp(t, 11.4, 12.0));
  y -= hover; x += env(t, 9.6, 9.7, 10.3, 10.45) * Math.sin(t * 48) * 5;
  const f = ease3((t - 14.6) / 1.45);
  if (f > 0) { x = lerp(KID_HOME[0], 1045, f); y = lerp(KID_HOME[1], 778, f) - Math.sin(f * Math.PI) * 60; }
  y += env(t, 16.02, 16.12, 16.16, 16.45) * 6;
  let look = [-.8, -1];
  if (t > 10.7 && t < 11.7) look = [0, 1];
  if (t > 14.4) look = [-.2, -1.1];
  const squeeze = env(t, 9.6, 9.7, 10.35, 10.5);
  return { x, y, o: {
    grey: 1, t, look, eye: ramp(t, 7.5, 7.9) * blinkAt(t, [9.0, 12.9, 15.1]) * (1 - .9 * squeeze), squash: env(t, 9.95, 10.02, 10.1, 10.3) * -1 + env(t, 10.3, 10.4, 10.45, 10.6) * .8,
    sad: env(t, 9.0, 9.4, 11.6, 12.3) * .9, happy: ramp(t, 16.05, 16.2), blush: ramp(t, 15.8, 16.3)
  } };
}
function drawDrop(t, kx, ky) {
  if (t > 10.3 && t < 11.13) {
    const grow = ease((t - 10.3) / .4), fall = easeIn((t - 10.75) / .38);
    const x = KID_HOME[0], y = lerp(ky + 34, STEP2_TOP - 4, fall), r = 3 + 4 * grow;
    ctx.fillStyle = 'rgba(175,205,240,.92)'; ctx.beginPath(); ctx.moveTo(x, y - r * 2.2); ctx.quadraticCurveTo(x + r * 1.1, y - r * .3, x, y + r); ctx.quadraticCurveTo(x - r * 1.1, y - r * .3, x, y - r * 2.2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.arc(x - r * .3, y - r * .3, r * .3, 0, 6.2832); ctx.fill();
  }
  const u = (t - 11.13) / .55;
  if (u > 0 && u < 1) {
    const x = KID_HOME[0], y = STEP2_TOP;
    ctx.strokeStyle = `rgba(200,225,250,${.8 * (1 - u)})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(x, y, 5 + 34 * u, (5 + 34 * u) * .22, 0, 0, 6.2832); ctx.stroke();
    ctx.fillStyle = `rgba(190,220,250,${1 - u})`;
    for (const [dx, h] of [[-1, 1], [0, 1.4], [1, 1]]) { ctx.beginPath(); ctx.arc(x + dx * 16 * u, y - Math.sin(u * Math.PI) * 18 * h, 2.4, 0, 6.2832); ctx.fill(); }
  }
}
function doorScene(t, z) {
  blit(D.bg);
  const a = 1.38 * ease3((t - 6.6) / .8), open = a / 1.38;
  doorSlab(a);
  if (open > 0) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = vgrad(875, 1000, [[0, `rgba(255,190,120,${.3 * open})`], [1, 'rgba(255,190,120,0)']]);
    ctx.beginPath(); ctx.moveTo(DOOR.x0, 875); ctx.lineTo(DOOR.x1, 875); ctx.lineTo(1290, 1000); ctx.lineTo(800, 1000); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  glow(1285, 384, 150, '#ffd38a', .4);
  const k = kidDoor(t);
  // the cloud sits on the step in front of her until it floats into her hands
  if (t < 14.9) { drawKid(k.x, k.y, 58, Object.assign(k.o, { px: z })); drawDrop(t, k.x, k.y); doorGirl(t); }
  else { const hands = doorGirl(t); drawKid(k.x, k.y, 58, Object.assign(k.o, { px: z }));
    if (t > 15.9) { ctx.fillStyle = SKIN; for (const h of [hands.L, hands.R]) { ctx.beginPath(); ctx.ellipse(h[0], h[1] + 4, 12, 8, 0, 0, 6.2832); ctx.fill(); } } }
}
function shotDoor(t) { const z = lerp(1.02, 1.08, ease((t - 6.3) / 6.7)); camIn(1060, 640, z); doorScene(t, z); screen(); motes(t, 22, 7, .45); }
function shotHands(t) {
  const u = ease((t - 13) / 3.6), z = lerp(1.68, 1.8, u);
  camIn(lerp(1110, 1095, u), lerp(760, 735, u), z); doorScene(t, z); screen(); motes(t, 18, 8, .45);
}

// =====================================================================
// 3b. Looking up at the mountain (16.6 – 18.4 s)
// =====================================================================
const PV = {};
const pvHill = x => 700 - 140 * gauss(x, 1120, 250) - 10 * Math.sin(x * .02);
function buildPOV() {
  PV.cloud = cloudSprite(1150, 360, 31, PAL_EVE, LIGHT_RIGHT, 1);
  PV.bg = layer(W, H + 160, 1, () => {
    ctx.fillStyle = vgrad(0, 860, EVE); ctx.fillRect(0, 0, W, H + 160);
    glow(1950, 700, 900, '#ffd49a', .55, 'source-over');
    streaks([[1400, 560, 600, 10, .45], [500, 520, 420, 8, .35]]);
  });
  PV.land = layer(W, H + 160, 1, () => {
    ridge(x => 690 - 30 * Math.sin(x * .005 + 1) - 40 * gauss(x, 400, 200), -20, W + 20, 10, H + 160); ctx.fillStyle = vgrad(600, 760, [[0, '#a99cc4'], [1, '#d8b4b8']]); ctx.fill();
    ridge(pvHill, -20, W + 20, 8, H + 160); ctx.fillStyle = vgrad(560, 820, [[0, '#a6bd6c'], [1, '#7f9c57']]); ctx.fill();
    rimStroke(pvHill, 800, 1500, 'rgba(255,225,160,.7)', 3);
    const r = rng(121);
    for (let i = 0; i < 160; i++) { const x = 860 + r() * 520, y = pvHill(x) + 4 + r() * 60; ctx.fillStyle = ['#fffaf0', '#ffe27a', '#f6a6c1', '#c9a6f0'][(r() * 4) | 0]; ctx.beginPath(); ctx.arc(x, y, 1.6, 0, 6.2832); ctx.fill(); }
    ctx.fillStyle = vgrad(760, 1200, [[0, '#86a258'], [1, '#55743e']]); ctx.fillRect(0, 790, W, 400);
    ctx.save(); ctx.filter = 'blur(9px)';
    for (let i = 0; i < 26; i++) { const x = r() * W, y = 930 + r() * 160; ctx.fillStyle = r() < .5 ? '#3f6a38' : '#55803f'; ctx.beginPath(); ctx.ellipse(x, y, 90 + r() * 80, 60 + r() * 40, 0, 0, 6.2832); ctx.fill(); }
    for (let i = 0; i < 60; i++) { ctx.fillStyle = ['#f6a6c1', '#fffaf0', '#ffe27a'][(r() * 3) | 0]; ctx.beginPath(); ctx.arc(r() * W, 900 + r() * 200, 8 + r() * 8, 0, 6.2832); ctx.fill(); }
    ctx.restore();
    // the eave above the viewer
    ctx.fillStyle = '#4a3530'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(820, 0); ctx.lineTo(600, 96); ctx.lineTo(0, 210); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#5e4339'; for (let i = 0; i < 6; i++) { const x = 40 + i * 110; ctx.fillRect(x, 150 - i * 22, 30, 26); }
    const tl = []; for (let i = 0; i < 18; i++) tl.push(makeLobe(r, 60 + r() * 520, 150 + r() * 120 - i * 4, 30 + r() * 26, 8));
    tl.sort((a, b) => (a.y - a.R) - (b.y - b.R)); paintLobes(ctx, tl, { shadow: '#30502e', mid: '#557f40', hi: '#efd88e' }, LIGHT_RIGHT);
  });
}
function birds(t, x0, y0, n, sp, col) {
  ctx.strokeStyle = col || 'rgba(80,60,80,.8)'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const x = x0 + t * sp + (i % 3) * 34 + i * 12, y = y0 + (i % 2) * 18 + i * 6 + Math.sin(t * 1.3 + i) * 6, s = 9 + (i % 3) * 2, f = Math.sin(t * 8 + i * 1.7) * .6;
    ctx.beginPath(); ctx.moveTo(x - s, y - s * f); ctx.quadraticCurveTo(x - s * .4, y - s * .3 * f - 3, x, y); ctx.quadraticCurveTo(x + s * .4, y - s * .3 * f - 3, x + s, y - s * f); ctx.stroke();
  }
}
function shotPOV(t) {
  const u = ease((t - 16.6) / 1.8);
  camIn(960, lerp(600, 540, u), lerp(1.02, 1.06, u), W, H + 160);
  blit(PV.bg);
  drawCloud(PV.cloud, 560 + (t - 16) * 6, 470);
  blit(PV.land);
  birds(t - 16.6, 1300, 300, 5, -40);
  screen(); motes(t, 26, 9, .55);
}

// =====================================================================
// 3c. Close-up: "我送你回家" (18.4 – 21.2 s)
// =====================================================================
const CL = {};
function buildClose() {
  CL.bg = layer(W, H, 1, () => {
    ctx.fillStyle = vgrad(0, H, [[0, '#f0c39a'], [.55, '#e3aa83'], [1, '#a5735a']]); ctx.fillRect(0, 0, W, H);
    const r = rng(131);
    ctx.save(); ctx.filter = 'blur(22px)';
    for (let x = 0; x < W; x += 90) { ctx.fillStyle = r() < .5 ? 'rgba(200,150,105,.35)' : 'rgba(250,210,160,.3)'; ctx.fillRect(x, 0, 60, H); }
    ctx.fillStyle = 'rgba(120,80,60,.55)'; ctx.fillRect(120, 0, 120, H);
    ctx.fillStyle = 'rgba(255,240,200,.55)'; ctx.fillRect(1480, 120, 360, 420);
    ctx.fillStyle = 'rgba(80,120,70,.55)'; ctx.beginPath(); ctx.ellipse(220, 980, 420, 220, 0, 0, 6.2832); ctx.fill();
    ctx.beginPath(); ctx.ellipse(1800, 1000, 380, 200, 0, 0, 6.2832); ctx.fill();
    ctx.restore();
    for (let i = 0; i < 46; i++) {
      const x = r() * W, y = r() * H * .85, rr = 18 + r() * 60, a = .12 + r() * .22;
      const g = ctx.createRadialGradient(x, y, rr * .2, x, y, rr); g.addColorStop(0, `rgba(255,236,190,${a * .6})`); g.addColorStop(.85, `rgba(255,236,190,${a})`); g.addColorStop(1, 'rgba(255,236,190,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rr, 0, 6.2832); ctx.fill();
    }
  });
}
function shotClose(t) {
  const u = ease((t - 18.4) / 2.8), z = lerp(1, 1.05, u);
  cam(960, 520, z); blit(CL.bg);
  const toKid = ramp(t, 18.85, 19.3), speak = t > 19.05 && t < 20.25 ? Math.abs(Math.sin(Math.PI * 4.35 * (t - 19.05))) : 0;
  const S = 12.5, X = 960, Y = 1392;
  const hands = girlFront(X, Y, S, {
    R: POSE.hold, L: POSE.hold, look: [lerp(1.1, 0, toKid), lerp(-1.6, 1.3, toKid)], tilt: lerp(.06, -.05, toKid), happy: ramp(t, 20.25, 20.4),
    smile: .5 + .5 * toKid, mouth: speak * .85, eye: blinkAt(t, [18.7]), t, light: 1, rim: 1, wind: .25, scarfDir: 1.25, scarfAmp: .18, scarfSpeed: 2.5
  });
  drawKid(X, Y - 51 * S, 136, { grey: .78, t, look: [0, -1.1], eye: blinkAt(t, [19.6]), happy: ramp(t, 20.3, 20.45), blush: .8, px: z });
  ctx.fillStyle = SKIN;
  for (const h of [hands.L, hands.R]) {
    ctx.fillStyle = SKIN; ctx.beginPath(); ctx.ellipse(h[0], h[1] - 4, 2.7 * S, 1.9 * S, 0, 0, 6.2832); ctx.fill();
    ctx.strokeStyle = rgba(SKIN_SH, .9); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(h[0], h[1] - 4, 2.7 * S, 1.9 * S, 0, .2, 2.9); ctx.stroke();
  }
  screen(); motes(t, 30, 11, .6);
}

// =====================================================================
// 4. Running to the hill (21.2 – 30.3 s)
// =====================================================================
const RN = {};
const RUN_T0 = 20.8, RUN_V = 420;
const runX = t => 300 + (t - RUN_T0) * RUN_V;
const runG = x => 860 - .4 * 250 * Math.log(1 + Math.exp((x - 2300) / 250));
const runPhase = t => (t - RUN_T0) * 1.4 * 6.2832;
function buildRun() {
  const r = rng(141);
  RN.cloud = cloudSprite(820, 260, 51, PAL_EVE, LIGHT_RIGHT, 1);
  RN.blades = [];
  for (let i = 0; i < 6400; i++) { const d = Math.pow(r(), 1.4) * 260; RN.blades.push({ x: r() * 5600 - 100, d, h: 9 + d * .13 + r() * 13, c: r(), ph: r() * 6.28 }); }
  RN.blades.sort((a, b) => a.d - b.d);
  RN.flowers = [];
  const cols = ['#fffaf0', '#ffe27a', '#f6a6c1', '#c9a6f0', '#9fd0f5', '#fff3d6'];
  for (let i = 0; i < 2600; i++) { const x = 900 + r() * 4700; if (r() > clamp((x - 1600) / 1400, .08, 1)) continue; const d = r() * 250; RN.flowers.push({ x, d, s: 2.6 + d * .024 + r() * 1.4, c: cols[(r() * cols.length) | 0], ph: r() * 6.28 }); }
  RN.flowers.sort((a, b) => a.d - b.d);
  RN.tufts = [];
  for (let k = 0; k < 4; k++) RN.tufts.push(layer(300, 620, 1, () => {
    const rr = rng(150 + k); ctx.filter = 'blur(5px)'; ctx.lineCap = 'round';
    for (let i = 0; i < 11; i++) {
      const h = 260 + rr() * 330, bx = 150 + (rr() - .5) * 90, tip = bx + (rr() - .3) * 170;
      ctx.strokeStyle = rr() < .5 ? '#2c5329' : '#3f6c35'; ctx.lineWidth = 9 + rr() * 8;
      ctx.beginPath(); ctx.moveTo(bx, 640); ctx.quadraticCurveTo(bx + (tip - bx) * .2, 640 - h * .6, tip, 640 - h); ctx.stroke();
    }
  }));
  RN.fg = []; for (let i = 0; i < 26; i++) RN.fg.push({ x: i * 660 + r() * 300, k: (r() * 4) | 0, s: .38 + r() * .4, flip: r() < .5 });
}
function shotRun(t) {
  const gx = runX(t), cX = gx - 760, cY = runG(gx) - 860;
  const P = (f, p) => sx => f(sx + cX * p) - cY * p;
  screen();
  ctx.fillStyle = vgrad(-cY * .05, 700 - cY * .05, EVE); ctx.fillRect(0, 0, W, H);
  glow(1700, 640 - cY * .05, 900, '#ffd49a', .55, 'source-over');
  drawCloud(RN.cloud, 1050 - cX * .02, 330 - cY * .04);
  ridge(P(x => 600 - 55 * Math.sin(x * .0035) - 35 * Math.sin(x * .009 + 1), .05), -20, W + 20, 12, H); ctx.fillStyle = vgrad(480, 760, [[0, '#aa9bc6'], [1, '#dfb8bc']]); ctx.fill();
  ridge(P(x => 720 - 40 * Math.sin(x * .006 + 2) - 25 * Math.sin(x * .013), .2), -20, W + 20, 12, H + 400); ctx.fillStyle = vgrad(640, 900, [[0, '#a3ae8e'], [1, '#b6be86']]); ctx.fill();
  ridge(P(x => 800 - 25 * Math.sin(x * .004 + 1), .5), -20, W + 20, 12, H + 800); ctx.fillStyle = vgrad(760, 1000 - cY * .5, [[0, '#adc36f'], [1, '#8eac5c']]); ctx.fill();
  const G = P(runG, 1);
  ridge(G, -20, W + 20, 10, H + 1200); ctx.fillStyle = vgrad(600, 1100, [[0, '#9cbf64'], [1, '#5f8a44']]); ctx.fill();
  ctx.strokeStyle = 'rgba(255,225,160,.5)'; ctx.lineWidth = 3; strokeRidge(G, -20, W + 20, 10); ctx.stroke();
  const greens = ['#4c7a3a', '#5f8f44', '#77a650', '#95bf62', '#c4dd8a'], paths = greens.map(() => new Path2D());
  for (const b of RN.blades) {
    const sx = b.x - cX; if (sx < -40 || sx > W + 40) continue;
    const sy = runG(b.x) + b.d - cY; if (sy > H + 40 || sy < -20) continue;
    const w = .5 + .35 * Math.sin(b.x * .004 - t * 2.2) + .12 * Math.sin(t * 3 + b.ph), bend = w * b.h * .55;
    const L = clamp(Math.floor((b.c * .55 + w * .45 + (1 - b.d / 260) * .2) * 5), 0, 4);
    paths[L].moveTo(sx, sy); paths[L].quadraticCurveTo(sx + bend * .3, sy - b.h * .6, sx + bend, sy - b.h + Math.abs(bend) * .3);
  }
  ctx.lineCap = 'round'; ctx.lineWidth = 2.4; paths.forEach((p, i) => { ctx.strokeStyle = greens[i]; ctx.stroke(p); });
  for (const f of RN.flowers) {
    const sx = f.x - cX; if (sx < -20 || sx > W + 20) continue;
    const sy = runG(f.x) + f.d - cY - f.s * 2; if (sy > H + 20) continue;
    flower(sx, sy, f.s, f.c, t, f.ph, .6);
  }
  const slope = clamp((gx - 2200) / 600, 0, 1);
  girlSide(760, 860, 3.2, { phase: runPhase(t), t, lean: .12 + .12 * slope, smile: .8 }, (lx, ly) => drawKid(lx + 1, ly + 6 + Math.sin(runPhase(t) * 2) * .6, 12, { grey: .7, t, look: [.6, -.4], happy: 1, blush: .8, px: 3.2 }));
  for (const f of RN.fg) {
    const span = 26 * 660, sx = ((f.x - cX * 1.6) % span + span) % span - 300; if (sx < -320 || sx > W + 20) continue;
    const tf = RN.tufts[f.k]; ctx.save(); ctx.translate(sx + 150, H + 40); ctx.scale(f.flip ? -f.s : f.s, f.s); ctx.globalAlpha = .8; ctx.drawImage(tf, -150, -640); ctx.restore();
  }
  ctx.globalAlpha = 1;
  motes(t, 30, 13, .5);
}

// =====================================================================
// 5–7. The hilltop: release, rain, rainbow (30.3 – 57.5 s)
// =====================================================================
const HL = {};
const hillY = x => 560 + .00062 * (x - 600) * (x - 600);
const GHX = 600, GHS = 1.55, MERGE = [1240, 318];
const hr1 = x => 728 - 18 * Math.sin(x * .006 + 1) - 46 * gauss(x, 1250, 180) - 30 * gauss(x, 1800, 150);
const hr2 = x => 772 - 14 * Math.sin(x * .009) - 30 * gauss(x, 1500, 200);
const HILL_SKY = [[0, '#7f89c6'], [.3, '#c5a3c6'], [.58, '#f3b6a0'], [.8, '#ffd29a'], [1, '#ffeab8']];
function buildHill() {
  const r = rng(161);
  HL.sky = layer(2600, 1500, 1, () => {
    ctx.translate(300, 300);
    ctx.fillStyle = vgrad(-120, 760, HILL_SKY); ctx.fillRect(-300, -300, 2600, 1500);
    glow(1600, 712, 1100, '#ffcf92', .65, 'source-over');
    glow(1600, 712, 160, '#fff3d2', .9, 'source-over');
    ctx.fillStyle = '#fff8e8'; ctx.beginPath(); ctx.arc(1600, 712, 44, 0, 6.2832); ctx.fill();
    streaks([[1350, 640, 700, 12, .5], [1750, 670, 500, 8, .5], [900, 600, 500, 9, .35], [400, 520, 380, 8, .3]]);
    ridge(hr1, -300, 2300, 10, 1200); ctx.fillStyle = vgrad(640, 780, [[0, '#a08fb8'], [1, '#d9aab2']]); ctx.fill();
    ctx.strokeStyle = 'rgba(255,220,170,.55)'; ctx.lineWidth = 2; strokeRidge(hr1, -300, 2300, 10); ctx.stroke();
    ctx.fillStyle = vgrad(690, 790, [[0, 'rgba(255,214,190,0)'], [1, 'rgba(255,214,190,.55)']]); ctx.fillRect(-300, 690, 2600, 100);
    ridge(hr2, -300, 2300, 10, 1200); ctx.fillStyle = vgrad(720, 860, [[0, '#8a83ab'], [1, '#b49aae']]); ctx.fill();
  });
  HL.cloud = cloudSprite(1060, 380, 41, PAL_EVE, LIGHT_RIGHT, 2);
  HL.glow = canvas(HL.cloud.c.width / 2, HL.cloud.c.height / 2);
  { const g = HL.glow.getContext('2d'); g.filter = 'blur(18px) brightness(1.15)'; g.drawImage(HL.cloud.c, 0, 0, HL.glow.width, HL.glow.height); }
  HL.cloud2 = cloudSprite(360, 120, 42, PAL_EVE, LIGHT_RIGHT, 1);
  HL.cloud3 = cloudSprite(300, 100, 43, PAL_EVE, LIGHT_RIGHT, 1);
  HL.flowers = [];
  const cols = ['#fffaf0', '#ffe27a', '#f6a6c1', '#c9a6f0', '#9fd0f5', '#fff3d6', '#f6a6c1'];
  for (let i = 0; i < 1500; i++) { const x = -300 + r() * 1800, d = Math.pow(r(), .8) * 520; if (hillY(x) + d > 1120) continue; HL.flowers.push({ x, d, s: 1.8 + d * .011 + r() * 1.2, c: cols[(r() * cols.length) | 0], ph: r() * 6.28, sp: r() < .3 }); }
  HL.flowers.sort((a, b) => a.d - b.d);
  HL.blades = [];
  for (let i = 0; i < 3800; i++) { const x = -300 + r() * 1900, d = Math.pow(r(), 1.6) * 480; if (hillY(x) + d > 1120) continue; HL.blades.push({ x, d, h: 5 + d * .03 + r() * 7, c: r(), ph: r() * 6.28 }); }
  HL.blades.sort((a, b) => a.d - b.d);
  HL.rain = []; for (let i = 0; i < 700; i++) HL.rain.push({ x: 150 + r() * 2000, ph: r(), sp: 560 + r() * 260, len: 14 + r() * 14, a: .4 + r() * .6 });
}
function hillCam(t) {
  const K = [[0, 660, 500, 2.0], [30.0, 660, 500, 2.0], [40.0, 690, 478, 2.15], [44.6, 1010, 340, 1.32], [49.0, 680, 505, 1.8], [55.0, 960, 520, 1.0], [99, 960, 520, 1.0]];
  for (let i = 0; i < K.length - 1; i++) if (t < K[i + 1][0]) { const u = ease3((t - K[i][0]) / (K[i + 1][0] - K[i][0])); return [lerp(K[i][1], K[i + 1][1], u), lerp(K[i][2], K[i + 1][2], u), lerp(K[i][3], K[i + 1][3], u)]; }
  return [960, 520, 1];
}
const hillWind = t => .25 + .55 * env(t, 32.2, 33.0, 34.3, 35.3) + .85 * env(t, 37.8, 38.6, 43.8, 45.4) + .12 * Math.sin(t * .9);
function kidHill(t) {
  let x = GHX, y = lerp(412, 392, ramp(t, 31.0, 32.0)) + Math.sin(t * 2) * 3 * ramp(t, 31, 32);
  const up = env(t, 32.5, 34.4, 34.6, 36.3);
  x += 18 * up + Math.sin(t * 5) * 6 * up; y -= 105 * up;
  if (t > 39.4) { const u = ease3((t - 39.4) / 4.8); x = lerp(GHX, MERGE[0], u) + 50 * Math.sin(u * Math.PI * 2) * (1 - u); y = lerp(399, MERGE[1], u) - 170 * Math.sin(u * Math.PI); }
  const sad = env(t, 34.7, 35.2, 37.6, 38.3);
  return { x, y, s: 27 * (1 - .35 * ramp(t, 43.7, 44.4)), o: {
    grey: lerp(.85, 0, ramp(t, 40.2, 43.6)), t, look: t < 39.4 ? [.2, -.6] : [.6, -.8], eye: blinkAt(t, [30.8, 36.7]), happy: Math.max(env(t, 32.6, 32.9, 34.2, 34.6), ramp(t, 39.6, 40)), sad,
    glow: ramp(t, 41, 43.8), alpha: 1 - ramp(t, 44.0, 44.5), rot: t > 39.4 ? .3 * Math.sin((t - 39.4) * 3) : 0, blush: .6
  } };
}
function hillGirl(t, z) {
  let R = POSE.upHold, L = POSE.upHold;
  const open = ramp(t, 31.0, 31.9); R = lerpPose(R, POSE.open, open); L = lerpPose(L, POSE.open, open);
  const down = ramp(t, 35.8, 36.5); R = lerpPose(R, POSE.down, down); L = lerpPose(L, POSE.down, down);
  const neck = env(t, 36.5, 37.1, 37.3, 37.8); R = lerpPose(R, POSE.neck, neck); L = lerpPose(L, POSE.neck, neck);
  R = lerpPose(R, POSE.raise, ramp(t, 37.6, 38.4) * (1 - ramp(t, 44.8, 46.4)));
  R = lerpPose(R, POSE.side, ramp(t, 44.8, 46.4));
  L = lerpPose(L, POSE.reach, env(t, 51.2, 52.3, 53.0, 54.0));
  L = lerpPose(L, POSE.hold, ramp(t, 53.0, 54.0));
  const w = hillWind(t), onNeck = t < 37.3;
  const hands = girlFront(GHX, hillY(GHX) + 1, GHS, { back: true, R, L, t, wind: w, light: 1, scarf: onNeck ? 'neck' : 'none', scarfDir: .25, scarfAmp: .5, scarfLen: 24, scarfSpeed: 8, headLift: .8 * ramp(t, 44.8, 46) });
  if (!onNeck) {
    const h = hands.R, strong = clamp((w - .3) / .7, 0, 1);
    ribbon(h[0], h[1], 78 * GHS * lerp(.75, 1, strong), 6.5 * GHS, lerp(1.0, -.32, strong), t, { amp: lerp(.35, .55, strong), speed: lerp(4, 10, strong), k: 1.4, taper: .25, col: SCARF, shade: SCARF_SH, segs: 22 });
  }
  return hands;
}
function windStreaks(t, k, x0, x1, y0, y1, seed) {
  if (k <= 0) return;
  const r = rng(seed); ctx.lineCap = 'round';
  for (let i = 0; i < 16; i++) {
    const per = 1.6 + r() * 1.2, ph = r() * per, u = ((t + ph) % per) / per;
    const sx = lerp(x0, x1, r()) + u * 420 - 200, sy = lerp(y0, y1, r()) - u * 60, len = 180 + r() * 140;
    const a = k * Math.sin(u * Math.PI) * .55;
    for (let s = 0; s < 8; s++) {
      const v0 = s / 8, v1 = (s + 1) / 8, al = a * Math.sin(Math.PI * (v0 + v1) / 2);
      ctx.strokeStyle = `rgba(255,250,240,${al})`; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(sx + len * v0, sy - Math.sin(v0 * 3) * 18); ctx.lineTo(sx + len * v1, sy - Math.sin(v1 * 3) * 18); ctx.stroke();
    }
  }
}
function rainbow(x, y, R, a) {
  if (a <= 0) return;
  const cols = ['#ff6b6b', '#ffa65c', '#ffe27a', '#8fdc8a', '#7ec8f0', '#8f9cf0', '#c39cf0'];
  ctx.save(); ctx.globalAlpha = a * .62; ctx.filter = 'blur(2px)'; ctx.lineWidth = 4.2;
  cols.forEach((c, i) => { ctx.strokeStyle = c; ctx.beginPath(); ctx.arc(x, y, R - i * 3.8, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke(); });
  ctx.restore();
}
function shotHill(t) {
  const [cx, cy, z] = hillCam(t);
  cam(cx, cy, z);
  ctx.drawImage(HL.sky, -300, -300);
  const rays = .55 + .15 * Math.sin(t * .4);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 9; i++) {
    const a = Math.PI + .25 + i * .2 + Math.sin(t * .2 + i) * .02;
    ctx.fillStyle = `rgba(255,215,160,${.05 * rays})`; ctx.beginPath(); ctx.moveTo(1600, 712);
    ctx.lineTo(1600 + Math.cos(a - .04) * 2200, 712 + Math.sin(a - .04) * 2200); ctx.lineTo(1600 + Math.cos(a + .04) * 2200, 712 + Math.sin(a + .04) * 2200); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  drawCloud(HL.cloud2, 120 + t * 4, 260, .9); drawCloud(HL.cloud3, 1650 - t * 2, 520, .85);
  const cl = HL.cloud, bx = 860 + (t - 30) * 1.5;
  drawCloud(cl, bx, 410);
  const pulse = .1 + .26 * env(t, 44.0, 44.5, 45.3, 46.8);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = pulse;
  ctx.drawImage(HL.glow, bx - cl.pad, 410 - cl.h - cl.pad, cl.w + cl.pad * 2, cl.h + cl.pad * 2); ctx.restore();
  // hill
  ridge(hillY, -400, 2400, 8, 1400); ctx.fillStyle = vgrad(560, 1120, [[0, '#a9c06e'], [.45, '#6f9450'], [1, '#4b6f3e']]); ctx.fill();
  ctx.strokeStyle = 'rgba(255,215,150,.65)'; ctx.lineWidth = 3.2; strokeRidge(hillY, -400, 2400, 8); ctx.stroke();
  const w = hillWind(t);
  const greens = ['#4c7a3a', '#5f8f44', '#77a650', '#95bf62', '#c9df8c'], paths = greens.map(() => new Path2D());
  for (const b of HL.blades) {
    const y = hillY(b.x) + b.d, ww = w * (.6 + .4 * Math.sin(b.x * .01 - t * 2.4)) + .08 * Math.sin(t * 3 + b.ph), bend = ww * b.h * .8;
    const L = clamp(Math.floor((b.c * .55 + ww * .4 + (1 - b.d / 480) * .25) * 5), 0, 4);
    paths[L].moveTo(b.x, y); paths[L].quadraticCurveTo(b.x + bend * .3, y - b.h * .6, b.x + bend, y - b.h + Math.abs(bend) * .3);
  }
  ctx.lineCap = 'round'; ctx.lineWidth = 1.3; paths.forEach((p, i) => { ctx.strokeStyle = greens[i]; ctx.stroke(p); });
  const spark = Math.max(env(t, 45.4, 46.6, 50.5, 53.5), 0);
  for (const f of HL.flowers) {
    const y = hillY(f.x) + f.d - f.s * 2;
    flower(f.x, y, f.s, f.c, t, f.ph, .3 + w * .6);
    if (f.sp && spark > 0) sparkle(f.x + .5, y - f.s * .4, f.s * .55, spark * Math.pow(Math.max(0, Math.sin(t * 2.6 + f.ph * 7)), 3));
  }
  rainbow(GHX, 405, 96, ramp(t, 49.4, 50.9));
  windStreaks(t, env(t, 32.3, 32.9, 34.2, 35.0), 300, 900, 300, 560, 7);
  windStreaks(t, env(t, 37.9, 38.6, 43.8, 44.8), 350, 1200, 230, 560, 8);
  const k = kidHill(t), hands = hillGirl(t, z);
  drawKid(k.x, k.y, k.s, Object.assign(k.o, { px: z }));
  // sparkles where the little cloud meets the big one
  const bu = (t - 44.05) / 1.3;
  if (bu > 0 && bu < 1) for (let i = 0; i < 14; i++) { const a = i * .449, d = 20 + 130 * easeOut(bu); sparkle(MERGE[0] + Math.cos(a) * d, MERGE[1] + Math.sin(a) * d * .7, 4.5, (1 - bu) * .9); }
  // the petal
  if (t > 51.3) {
    const u = ease((t - 51.3) / 1.35), h = hands.L;
    const px = u < 1 ? lerp(390, h[0], u) + Math.sin(u * 9) * 14 * (1 - u) : h[0], py = u < 1 ? lerp(330, h[1] - 3, u) + Math.sin(u * 6) * 10 * (1 - u) : h[1] - 3;
    ctx.save(); ctx.translate(px, py); ctx.rotate(t * (u < 1 ? 4 : 0) + .6); ctx.fillStyle = '#f7a9c0';
    ctx.beginPath(); ctx.ellipse(0, 0, 6, 3.4, 0, 0, 6.2832); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.ellipse(-1.4, -.7, 2.4, 1.1, 0, 0, 6.2832); ctx.fill(); ctx.restore();
    if (u >= 1) sparkle(px, py, 3, env(t, 52.65, 52.75, 52.9, 53.4) * .8);
  }
  // rain from the big cloud
  const rk = env(t, 44.7, 45.6, 48.4, 49.8);
  if (rk > 0) {
    ctx.lineCap = 'round';
    for (const d of HL.rain) {
      const y = 330 + ((d.ph * 900 + t * d.sp) % 900), x = d.x + (y - 330) * .12;
      ctx.strokeStyle = `rgba(255,248,236,${.75 * rk * d.a})`; ctx.lineWidth = 1.7;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + d.len * .12, y + d.len); ctx.stroke();
    }
  }
  screen();
  if (t > 49) birds(t - 49, 1500, 260, 6, -26, 'rgba(90,60,80,.7)');
  motes(t, 36, 15, .6);
}

// =====================================================================
// Timeline
// =====================================================================
const SHOTS = [[0, shotValley], [6.3, shotDoor], [13, shotHands], [16.6, shotPOV], [18.4, shotClose], [21.2, shotRun], [30.3, shotHill]];
const XF = { 1: .8, 5: .4, 6: .7 };   // shots that dissolve in, and how long the dissolve lasts
const buf = canvas(W, H), bufCtx = buf.getContext('2d');
function bloomAt(t) { return t < 6.3 ? .34 : t < 18.4 ? .22 : t < 21.2 ? .28 : t < 30.3 ? .3 : .36 + .2 * env(t, 44, 44.5, 45.3, 46.8); }
function captions(t) {
  caption('给云朵送一程', env(t, 1.3, 2.4, 4.6, 5.6), { y: 250, size: 96, spacing: 24, shadow: 'rgba(130,60,50,.55)' });
  caption('我送你回家。', env(t, 19.0, 19.25, 20.6, 20.95), { size: 46 });
  caption('有时候，温柔就是陪你走一段路。', env(t, 50.0, 50.4, 53.6, 54.2), { size: 46 });
  const e = ramp(t, 54.3, 55.3);
  if (e > 0) { screen(); ctx.fillStyle = `rgba(36,22,40,${.5 * e})`; ctx.fillRect(0, 0, W, H); }
  caption('愿每一朵迷路的云，都能找到回家的风。', ramp(t, 54.7, 55.7) * (1 - ramp(t, 56.8, 57.4)), { y: 330, size: 58, spacing: 6, shadow: 'rgba(30,10,30,.6)' });
  const f = Math.max(1 - ramp(t, 0, 1.2), ramp(t, 56.9, 57.5));
  if (f > 0) { screen(); ctx.fillStyle = `rgba(0,0,0,${f})`; ctx.fillRect(0, 0, W, H); }
}
window.renderFrame = function (t) {
  ctx = mainCtx; screen(); ctx.clearRect(0, 0, W, H);
  let i = 0; while (i + 1 < SHOTS.length && t >= SHOTS[i + 1][0]) i++;
  let done = false;
  for (const j in XF) {
    const tj = SHOTS[j][0], d = XF[j];
    if (t >= tj - d / 2 && t < tj + d / 2) {
      const u = ease((t - (tj - d / 2)) / d);
      SHOTS[j - 1][1](t);
      ctx = bufCtx; screen(); ctx.clearRect(0, 0, W, H); SHOTS[j][1](t);
      ctx = mainCtx; screen(); ctx.globalAlpha = u; ctx.drawImage(buf, 0, 0); ctx.globalAlpha = 1;
      done = true; break;
    }
  }
  if (!done) SHOTS[i][1](t);
  ctx = mainCtx; post(bloomAt(t), .05);
  captions(t);
};
window.DUR = DUR;
window.ready = (async () => {
  await new Promise(r => setTimeout(r, 0));
  await document.fonts.load(`60px ${FONT}`, '给云朵送一程我送你回家。有时候，温柔就是陪你走一段路。愿每一朵迷路的云，都能找到回家的风。');
  paper = makePaper();
  buildValley(); buildDoor(); buildPOV(); buildClose(); buildRun(); buildHill();
  window.renderFrame(0);
  return true;
})();
