// The girl: a front/back rig (door, close-up, hilltop) and a side rig (running).
// Both are drawn in "units": 100 units = her full height, feet at (0, 0).
'use strict';
const SKIN = '#f7dcc8', SKIN_SH = '#e8b9a2', HAIR = '#3d2b27', HAIR_HI = '#86604f';
const DRESS = '#7ba7d8', DRESS_SH = '#567db1', DRESS_HI = '#b0cdee';
const SCARF = '#d9433b', SCARF_SH = '#9e2b2a', SOCK = '#fbf6ee', SHOE = '#7b4a32', INK = '#3a2630';

// Arm poses in "right arm" convention: [upper-arm angle, forearm angle],
// screen angles (0 = right, PI/2 = down). The left arm is mirrored.
const POSE = {
  down: [1.62, 1.56], side: [1.42, 1.38], chest: [2.0, -2.35], cup: [1.86, 2.62],
  upHold: [-1.35, -1.95], open: [-.42, -.72], neck: [1.2, -2.3], raise: [-.78, -1.0], reach: [-.2, -.42], hold: [1.95, -2.6]
};
const lerpPose = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];

function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }

function frontFace(p, hy) {
  const lx = p.look[0] * 1.3, ly = p.look[1] * 1.1, ey = hy + 2.4 + ly, ex = 5.1;
  ctx.fillStyle = 'rgba(240,128,128,.36)';
  for (const sx of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sx * 8.6 + lx * .3, hy + 6.9 + ly * .3, 2.8, 1.5, 0, 0, 6.2832); ctx.fill(); }
  ctx.strokeStyle = INK; ctx.lineCap = 'round';
  for (const sx of [-1, 1]) {
    const cx = sx * ex + lx;
    if (p.happy > .5) {
      ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(cx, ey + 1.4, 2.5, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
      continue;
    }
    const h = 3.4 * (1 + p.surprise * .2) * p.eye, wv = 2.5 * (1 + p.surprise * .1);
    if (p.eye < .15) { ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx - 2.3, ey + .6); ctx.quadraticCurveTo(cx, ey + 1.6, cx + 2.3, ey + .6); ctx.stroke(); continue; }
    ctx.fillStyle = '#3b2430'; ctx.beginPath(); ctx.ellipse(cx, ey, wv, h, 0, 0, 6.2832); ctx.fill();
    ctx.fillStyle = '#7a5040'; ctx.beginPath(); ctx.ellipse(cx, ey + h * .38, wv * .7, h * .42, 0, 0, 6.2832); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx - .75, ey - h * .38, .95, 0, 6.2832); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + .8, ey + h * .3, .42, 0, 6.2832); ctx.fill();
    // upper lid: a thick arc hugging the top of the eye, flicked up at the outer corner
    ctx.lineWidth = 1.25; ctx.beginPath(); ctx.ellipse(cx, ey + .2, wv * 1.08, h * 1.06, 0, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
    const ox = cx + sx * wv * 1.02, oy = ey - h * .45;
    ctx.lineWidth = .9; ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + sx * 1.1, oy - 1); ctx.stroke();
  }
  ctx.strokeStyle = SKIN_SH; ctx.lineWidth = .8; ctx.beginPath(); ctx.moveTo(lx * .6 - .3, hy + 5.4 + ly * .4); ctx.lineTo(lx * .6 + .3, hy + 6.2 + ly * .4); ctx.stroke();
  const my = hy + 9 + ly * .4, mx = lx * .6;
  const open = Math.max(p.mouth, p.surprise * .75);
  if (open > .08) {
    ctx.fillStyle = '#b04e4c'; ctx.beginPath(); ctx.ellipse(mx, my + .4, 1.5 + open * .5, .5 + open * 1.5, 0, 0, 6.2832); ctx.fill();
    ctx.fillStyle = '#e88a86'; ctx.beginPath(); ctx.ellipse(mx, my + .4 + open * .7, 1 + open * .3, .3 + open * .5, 0, 0, 6.2832); ctx.fill();
  } else {
    ctx.strokeStyle = INK; ctx.lineWidth = .9; ctx.beginPath(); ctx.moveTo(mx - 2.1, my); ctx.quadraticCurveTo(mx, my + 1 + p.smile * 1.7, mx + 2.1, my); ctx.stroke();
  }
}

function hairBack(hy, flow, w, t, full) {
  const fw = Math.sin(t * 6) * w * 1.6 + flow;
  ctx.fillStyle = HAIR;
  ctx.beginPath(); ctx.ellipse(0, hy - 1, 17.4, 18, 0, Math.PI, 0);
  ctx.lineTo(17.4, hy + 5);
  const by = full ? hy + 17 : hy + 15.5;
  ctx.quadraticCurveTo(18.5 + fw, by - 1, 13.5 + fw, by);
  for (let i = 1; i <= 4; i++) { const x1 = lerp(13.5, -13.5, i / 4) + fw; ctx.quadraticCurveTo(lerp(13.5, -13.5, (i - .5) / 4) + fw * 1.1, by + 2 + Math.sin(t * 7 + i) * w, x1, by - .5); }
  ctx.quadraticCurveTo(-18.5 + fw, by - 1, -17.4, hy + 5); ctx.closePath(); ctx.fill();
}

// Front (or back) view. Returns hand positions in the caller's coordinates.
function girlFront(x, y, S, p) {
  p = Object.assign({ back: false, crouch: 0, R: POSE.down, L: POSE.down, tilt: 0, look: [0, 0], eye: 1, happy: 0, mouth: 0, smile: .35, surprise: 0,
    scarf: 'neck', scarfDir: 1.3, scarfAmp: .25, scarfLen: 22, scarfSpeed: 4, wind: 0, t: 0, light: 1, rim: 0, headLift: 0, alpha: 1 }, p);
  ctx.save(); ctx.translate(x, y); ctx.scale(S, S); ctx.globalAlpha = p.alpha;
  const c = p.crouch, dy = c * 21, t = p.t, w = p.wind, L = p.light;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // legs
  if (c < .5) {
    for (const sx of [-1, 1]) {
      ctx.strokeStyle = SKIN; ctx.lineWidth = 4.6; ctx.beginPath(); ctx.moveTo(sx * 4.6, -31); ctx.lineTo(sx * 5.2, -8); ctx.stroke();
      ctx.strokeStyle = SOCK; ctx.lineWidth = 4.9; ctx.beginPath(); ctx.moveTo(sx * 5.2, -11); ctx.lineTo(sx * 5.4, -4); ctx.stroke();
      ctx.fillStyle = SHOE; ctx.beginPath(); ctx.ellipse(sx * 5.8, -2.4, 4.4, 2.6, 0, 0, 6.2832); ctx.fill();
    }
  } else {
    for (const sx of [-1, 1]) {
      ctx.fillStyle = SHOE; ctx.beginPath(); ctx.ellipse(sx * 8.5, -2.4, 4.6, 2.6, 0, 0, 6.2832); ctx.fill();
      ctx.fillStyle = SOCK; ctx.fillRect(sx * 8.5 - 2.4, -9, 4.8, 6);
      ctx.fillStyle = SKIN; ctx.beginPath(); ctx.ellipse(sx * 7, -12.5, 5.6, 5, 0, 0, 6.2832); ctx.fill();
    }
  }
  // dress
  const shY = -61 + dy, hemY = -29 + dy + c * 13, hw = 18 + c * 5, fx = w * 3;
  const fl = i => Math.sin(t * 7 + i * 1.3) * w * 1.6;
  ctx.beginPath(); ctx.moveTo(-9.5, shY); ctx.lineTo(9.5, shY);
  ctx.quadraticCurveTo(11.5, shY + 12, hw + fx, hemY + fl(0));
  for (let i = 1; i <= 4; i++) {
    const x0 = lerp(hw + fx, -hw + fx * .6, (i - 1) / 4), x1 = lerp(hw + fx, -hw + fx * .6, i / 4);
    ctx.quadraticCurveTo((x0 + x1) / 2, hemY + 2.4 + fl(i), x1, hemY + fl(i + 1) * .6);
  }
  ctx.quadraticCurveTo(-11.5, shY + 12, -9.5, shY); ctx.closePath();
  const dg = ctx.createLinearGradient(-hw, 0, hw, 0);
  dg.addColorStop(0, L > 0 ? DRESS_SH : DRESS_HI); dg.addColorStop(.5, DRESS); dg.addColorStop(1, L > 0 ? DRESS_HI : DRESS_SH);
  ctx.fillStyle = dg; ctx.fill();
  ctx.strokeStyle = rgba(DRESS_SH, .6); ctx.lineWidth = .7;
  for (const f of [-7, 0, 7]) { ctx.beginPath(); ctx.moveTo(f * .45, shY + 13); ctx.quadraticCurveTo(f * .9, hemY - 7, f * 1.35 + fx * .6, hemY + 1); ctx.stroke(); }
  if (!p.back) { ctx.fillStyle = '#fbf6ee'; ctx.beginPath(); ctx.moveTo(-6, shY); ctx.quadraticCurveTo(0, shY + 6, 6, shY); ctx.closePath(); ctx.fill(); }
  // arms
  const hands = {};
  const arm = (sx, a) => {
    const sh = [sx * 10, -58 + dy];
    const a1 = sx > 0 ? a[0] : Math.PI - a[0], a2 = sx > 0 ? a[1] : Math.PI - a[1];
    const el = [sh[0] + Math.cos(a1) * 12.5, sh[1] + Math.sin(a1) * 12.5];
    const hd = [el[0] + Math.cos(a2) * 11.5, el[1] + Math.sin(a2) * 11.5];
    ctx.strokeStyle = SKIN; ctx.lineWidth = 4.2; ctx.beginPath(); ctx.moveTo(sh[0], sh[1]); ctx.lineTo(el[0], el[1]); ctx.lineTo(hd[0], hd[1]); ctx.stroke();
    ctx.strokeStyle = rgba(SKIN_SH, .7); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(el[0] - sx * .8, el[1] + 1); ctx.lineTo(hd[0] - sx * .8, hd[1] + 1); ctx.stroke();
    ctx.fillStyle = SKIN; ctx.beginPath(); ctx.arc(hd[0], hd[1], 3.1, 0, 6.2832); ctx.fill();
    ctx.fillStyle = sx * L > 0 ? DRESS_HI : DRESS; ctx.beginPath(); ctx.ellipse(sh[0] + Math.cos(a1) * 2.6, sh[1] + Math.sin(a1) * 2.6, 5.4, 4.7, a1, 0, 6.2832); ctx.fill();
    hands[sx > 0 ? 'R' : 'L'] = [x + hd[0] * S, y + hd[1] * S];
  };
  const nkY = -63 + dy;
  const scarfBand = () => {
    ctx.fillStyle = SCARF; roundRect(-10.5, nkY - 2.6, 21, 7.2, 3.6); ctx.fill();
    ctx.fillStyle = SCARF_SH; roundRect(-10.5, nkY + 2.4, 21, 2.2, 1.1); ctx.fill();
    ctx.strokeStyle = 'rgba(255,210,190,.45)'; ctx.lineWidth = .8; ctx.beginPath(); ctx.moveTo(-8, nkY - 1.2); ctx.lineTo(8, nkY - 1.2); ctx.stroke();
  };
  const scarfTails = () => {
    const kx = p.back ? 7 : 5.6, ky = nkY + 3.4;
    ribbon(kx, ky, p.scarfLen, 5.2, p.scarfDir, t, { amp: p.scarfAmp, speed: p.scarfSpeed, col: SCARF, shade: SCARF_SH });
    ribbon(kx - 1, ky + .5, p.scarfLen * .82, 4.6, p.scarfDir + .25, t + .7, { amp: p.scarfAmp * 1.1, speed: p.scarfSpeed, col: SCARF, shade: SCARF_SH });
    if (!p.back) { ctx.fillStyle = SCARF; ctx.beginPath(); ctx.arc(kx, ky, 3.1, 0, 6.2832); ctx.fill(); }
  };
  if (p.back && p.scarf === 'neck') scarfTails();
  arm(-1, p.L); arm(1, p.R);
  if (p.scarf === 'neck') { scarfBand(); if (!p.back) scarfTails(); }
  // head
  ctx.save(); ctx.translate(0, nkY - p.headLift); ctx.rotate(p.tilt);
  ctx.fillStyle = SKIN_SH; ctx.fillRect(-3.4, -4, 6.8, 6.5);
  const hy = -16;
  if (!p.back) {
    hairBack(hy, 0, w, t, false);
    ctx.fillStyle = SKIN;
    for (const sx of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sx * 13.3, hy + 1.5, 2.4, 3, 0, 0, 6.2832); ctx.fill(); }
    const fg = ctx.createLinearGradient(-13, 0, 13, 0);
    fg.addColorStop(0, L > 0 ? '#f0cbb3' : '#fde9da'); fg.addColorStop(.5, '#fae0cd'); fg.addColorStop(1, L > 0 ? '#fde9da' : '#f0cbb3');
    ctx.fillStyle = fg; ctx.beginPath(); ctx.ellipse(0, hy + .6, 13, 13.6, 0, 0, 6.2832); ctx.fill();
    frontFace(p, hy);
    // bangs: arch over the forehead with pointed tips
    ctx.fillStyle = HAIR; ctx.beginPath(); ctx.ellipse(0, hy - 1.5, 15.7, 16.4, 0, Math.PI, 0);
    const tips = [14.6, 10.2, 5.2, .2, -4.8, -9.8, -14.6];
    ctx.lineTo(14.6, hy - .5);
    for (let i = 1; i < tips.length; i++) {
      const x0 = tips[i - 1], x1 = tips[i];
      ctx.quadraticCurveTo((x0 + x1) / 2, hy - 7.5 + Math.abs(i - 3.5) * .5, x1, hy - (i === tips.length - 1 ? .5 : 2.4 + (i % 2) * .8));
    }
    ctx.closePath(); ctx.fill();
    for (const sx of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(sx * 15.2, hy - 4); ctx.quadraticCurveTo(sx * 15.5 + Math.sin(t * 5) * w, hy + 6, sx * 12.4, hy + 11);
      ctx.quadraticCurveTo(sx * 13.2, hy + 3, sx * 12.6, hy - 3); ctx.closePath(); ctx.fill();
    }
    ctx.strokeStyle = rgba(HAIR_HI, .75); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, hy - 1.5, 12.6, Math.PI * (L > 0 ? 1.6 : 1.12), Math.PI * (L > 0 ? 1.86 : 1.4)); ctx.stroke();
  } else {
    hairBack(hy, w * 2.5, w, t, true);
    ctx.strokeStyle = rgba(HAIR_HI, .7); ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(0, hy - 1, 13.5, Math.PI * 1.2, Math.PI * 1.55); ctx.stroke();
  }
  if (p.rim > 0) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `rgba(255,205,140,${.55 * p.rim})`; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(0, hy - 1, 17.6, Math.PI * 1.55, Math.PI * 2.05); ctx.stroke(); ctx.restore();
  }
  ctx.restore();
  ctx.restore();
  return hands;
}

// Side view, facing right, running or walking. kidDraw(x, y, s) is called
// between the body and the near arm so the cloud sits in her arms.
function girlSide(x, y, S, p, kidDraw) {
  p = Object.assign({ phase: 0, run: 1, t: 0, lean: .12, eye: 1, smile: .7, wind: 1 }, p);
  ctx.save(); ctx.translate(x, y); ctx.scale(S, S); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const ph = p.phase, t = p.t, bob = -Math.abs(Math.cos(ph)) * 2.4 * p.run + 1.2 * p.run;
  const hip = [0, -30.5 + bob];
  const leg = (phi, far) => {
    const th = .62 * Math.sin(phi) * p.run;
    const kb = (.12 + .95 * Math.max(0, Math.sin(phi - 1.5))) * p.run;
    const knee = [hip[0] + Math.sin(th) * 14, hip[1] + Math.cos(th) * 14];
    const sa = th - kb * 1.5, foot = [knee[0] + Math.sin(sa) * 13.5, knee[1] + Math.cos(sa) * 13.5];
    ctx.strokeStyle = far ? SKIN_SH : SKIN; ctx.lineWidth = 4.4;
    ctx.beginPath(); ctx.moveTo(hip[0], hip[1]); ctx.lineTo(knee[0], knee[1]); ctx.lineTo(foot[0], foot[1]); ctx.stroke();
    const sk = [lerp(knee[0], foot[0], .55), lerp(knee[1], foot[1], .55)];
    ctx.strokeStyle = far ? '#e2d8ca' : SOCK; ctx.lineWidth = 4.7; ctx.beginPath(); ctx.moveTo(sk[0], sk[1]); ctx.lineTo(foot[0], foot[1]); ctx.stroke();
    ctx.fillStyle = far ? '#5f3926' : SHOE; ctx.beginPath(); ctx.ellipse(foot[0] + 2, foot[1] + .6, 4.7, 2.5, -sa * .5, 0, 6.2832); ctx.fill();
  };
  leg(ph + Math.PI, true); leg(ph, false);
  ctx.save(); ctx.translate(hip[0], hip[1]); ctx.rotate(p.lean); ctx.translate(-hip[0], -hip[1]);
  const armSide = (far) => {
    const sh = [far ? -1 : 1.5, -57.5 + bob], sw = Math.sin(ph) * .12 * (far ? -1 : 1);
    const el = [sh[0] + 4 + sw * 8, -47.5 + bob], hd = [far ? 11 : 14, -52 + bob];
    ctx.strokeStyle = far ? SKIN_SH : SKIN; ctx.lineWidth = 4.1;
    ctx.beginPath(); ctx.moveTo(sh[0], sh[1]); ctx.lineTo(el[0], el[1]); ctx.lineTo(hd[0], hd[1]); ctx.stroke();
    ctx.fillStyle = far ? SKIN_SH : SKIN; ctx.beginPath(); ctx.arc(hd[0], hd[1], 3, 0, 6.2832); ctx.fill();
    ctx.fillStyle = far ? DRESS_SH : DRESS; ctx.beginPath(); ctx.ellipse(sh[0] + 1, sh[1] + 2.5, 5, 4.6, .9, 0, 6.2832); ctx.fill();
  };
  armSide(true);
  // scarf tails stream back
  ribbon(-4.5, -60 + bob, 27, 5.2, Math.PI - .18, t, { amp: .55, speed: 13, k: 1.8, col: SCARF, shade: SCARF_SH });
  ribbon(-4, -59 + bob, 22, 4.6, Math.PI - .02, t + .5, { amp: .6, speed: 13, k: 1.8, col: SCARF, shade: SCARF_SH });
  // dress
  const hf = Math.sin(t * 11) * 1.4 * p.wind;
  ctx.beginPath(); ctx.moveTo(-5.5, -61 + bob); ctx.lineTo(6, -61 + bob);
  ctx.quadraticCurveTo(9, -46 + bob, 10, -29.5 + bob);
  ctx.quadraticCurveTo(0, -27 + bob + hf * .5, -14 - p.wind * 2 + hf, -28.5 + bob + hf);
  ctx.quadraticCurveTo(-10, -45 + bob, -5.5, -61 + bob); ctx.closePath();
  const dg = ctx.createLinearGradient(-12, 0, 10, 0); dg.addColorStop(0, DRESS_SH); dg.addColorStop(.6, DRESS); dg.addColorStop(1, DRESS_HI);
  ctx.fillStyle = dg; ctx.fill();
  ctx.strokeStyle = rgba(DRESS_SH, .6); ctx.lineWidth = .7;
  ctx.beginPath(); ctx.moveTo(0, -48 + bob); ctx.quadraticCurveTo(-3, -38 + bob, -6 + hf * .5, -29 + bob); ctx.stroke();
  // scarf band
  ctx.fillStyle = SCARF; ctx.save(); ctx.translate(1, -62 + bob); ctx.rotate(-.08); roundRect(-7, -2.8, 15, 7, 3.4); ctx.fill(); ctx.restore();
  // head
  ctx.save(); ctx.translate(2, -63 + bob); ctx.rotate(-p.lean * .6);
  const hy = -16, flow = Math.sin(t * 9) * 1.2;
  ctx.fillStyle = HAIR;
  ctx.beginPath(); ctx.ellipse(-1, hy - 1, 16.4, 17.4, 0, Math.PI * .55, Math.PI * 2.1);
  ctx.quadraticCurveTo(-8, hy + 14, -15 + flow, hy + 15);
  ctx.quadraticCurveTo(-21 + flow, hy + 12, -20 + flow, hy + 4); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#fae0cd'; ctx.beginPath(); ctx.ellipse(4.2, hy + 1.2, 11.8, 13, 0, 0, 6.2832); ctx.fill();
  ctx.fillStyle = SKIN; ctx.beginPath(); ctx.ellipse(-1.5, hy + 2, 2.4, 3, 0, 0, 6.2832); ctx.fill();
  ctx.fillStyle = HAIR;
  ctx.beginPath(); ctx.moveTo(-14, hy - 4); ctx.quadraticCurveTo(-6, hy - 22, 9, hy - 15);
  ctx.quadraticCurveTo(15.5, hy - 11, 15, hy - 4); ctx.quadraticCurveTo(13, hy - 7.5, 12, hy - 3); ctx.quadraticCurveTo(10.5, hy - 7, 8.5, hy - 2.6);
  ctx.quadraticCurveTo(6, hy - 7, 3.5, hy - 4); ctx.quadraticCurveTo(-2, hy - 6, -3.5, hy + 2); ctx.quadraticCurveTo(-8, hy + 2, -14, hy - 4); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = rgba(HAIR_HI, .75); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(-1, hy - 1, 13, Math.PI * 1.25, Math.PI * 1.6); ctx.stroke();
  ctx.fillStyle = 'rgba(240,128,128,.4)'; ctx.beginPath(); ctx.ellipse(9.5, hy + 7, 2.6, 1.5, 0, 0, 6.2832); ctx.fill();
  ctx.fillStyle = '#3b2430'; ctx.beginPath(); ctx.ellipse(10, hy + 2.4, 1.5, 2.6 * p.eye, 0, 0, 6.2832); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(9.6, hy + 1.4, .55, 0, 6.2832); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = .9; ctx.beginPath(); ctx.moveTo(8.4, hy - .5); ctx.quadraticCurveTo(10.5, hy - 1.6, 12, hy - .2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(12.8, hy + 8.6); ctx.quadraticCurveTo(14, hy + 9.6 + p.smile, 15.2, hy + 8.4); ctx.stroke();
  ctx.restore();
  if (kidDraw) kidDraw(19, -58 + bob);
  armSide(false);
  ctx.restore();
  ctx.restore();
}
