// street.js — the drowned street, painted top-down (like a BG artist's ground
// plate), later seen through the water. Two plates: a wide one and a detailed
// one for the intersection where the robot stands.
'use strict';
const GROUND = { x0: -48, x1: 48, z0: -260, z1: 48, ppm: 10 };
const GHI = { x0: -18, x1: 18, z0: -10, z1: 34, ppm: 52 };

function paintStreet(rect, hi) {
  const w = Math.round((rect.x1 - rect.x0) * rect.ppm), h = Math.round((rect.z1 - rect.z0) * rect.ppm);
  const cv = canvas(w, h), g = cv.getContext('2d'), R = rng(hi ? 61 : 60);
  const X = x => (x - rect.x0) * rect.ppm, Z = z => (z - rect.z0) * rect.ppm, S = m => m * rect.ppm;
  const rectM = (x0, z0, x1, z1) => [[X(x0), Z(z0)], [X(x1), Z(z0)], [X(x1), Z(z1)], [X(x0), Z(z1)]];
  const asphalt = '#8b91a4';
  // sidewalks / building plots everywhere, then roads
  wash(g, rectM(rect.x0, rect.z0, rect.x1, rect.z1), '#a9a58f', R, { density: 120, len: S(.5), wd: S(.2), alpha: .3, amt: .12 });
  // paving tiles on the sidewalks
  if (hi || true) {
    g.strokeStyle = 'rgba(80,80,70,.25)'; g.lineWidth = Math.max(1, S(.03));
    g.beginPath();
    for (let x = Math.ceil(rect.x0); x < rect.x1; x += 1) { g.moveTo(X(x), 0); g.lineTo(X(x), h); }
    for (let z = Math.ceil(rect.z0); z < rect.z1; z += 1) { g.moveTo(0, Z(z)); g.lineTo(w, Z(z)); }
    g.stroke();
  }
  const road = (x0, z0, x1, z1) => wash(g, rectM(x0, z0, x1, z1), asphalt, R, { density: 60, len: S(.6), wd: S(.18), alpha: .35, amt: .14, ang: 0, spread: 3 });
  road(-11.5, rect.z0, 11.5, rect.z1);   // the avenue
  road(rect.x0, -2, rect.x1, 22);        // the cross street
  // curbs
  g.fillStyle = '#c9c6b4';
  for (const s of [-1, 1]) { g.fillRect(X(s > 0 ? 11.5 : -11.8), Z(rect.z0), S(.3), Z(-2) - Z(rect.z0)); g.fillRect(X(s > 0 ? 11.5 : -11.8), Z(22), S(.3), Z(rect.z1) - Z(22)); g.fillRect(X(s > 0 ? 11.5 : rect.x0), Z(-2.3), s > 0 ? X(rect.x1) - X(11.5) : X(-11.5) - X(rect.x0), S(.3)); g.fillRect(X(s > 0 ? 11.5 : rect.x0), Z(22), s > 0 ? X(rect.x1) - X(11.5) : X(-11.5) - X(rect.x0), S(.3)); }
  const paint = '#f2efe4', paintY = '#eec34a';
  const worn = (poly, col) => { fillPoly(g, poly, col); daubs(g, poly, asphalt, R, { density: 70, len: S(.25), wd: S(.08), alpha: .35, spread: 3 }); };
  const stripe = (x0, z0, x1, z1, col) => worn(rectM(x0, z0, x1, z1), col || paint);
  // lane lines along the avenue
  for (let z = rect.z0; z < -4; z += 8) { stripe(-.08, z, .08, z + 5, paintY); }
  for (const x of [-5.7, 5.7]) for (let z = rect.z0; z < -4; z += 10) stripe(x - .07, z, x + .07, z + 6);
  for (const x of [-11, 11]) stripe(x - .1, rect.z0, x + .1, -4);
  // zebra crossings: across the avenue (behind the robot) and across the cross street
  for (let x = -10.5; x < 10.5; x += .9) stripe(x, -7.5, x + .45, -3.5);
  for (let x = -10.5; x < 10.5; x += .9) stripe(x, 23.5, x + .45, 27.5);
  for (const sx of [-14.5, 14.5]) for (let z = -1; z < 21; z += .9) stripe(sx - 2, z, sx + 2, z + .45);
  // stop line and 止まれ in the near lane, readable from the camera side
  stripe(-10.8, 21.2, -.3, 21.6);
  {
    g.save(); g.fillStyle = paint;
    const chars = ['止', 'ま', 'れ'];
    for (let i = 0; i < chars.length; i++) {
      const cx = X(-5.4), cz = Z(12.6 + i * 3.1);
      g.save(); g.translate(cx, cz); g.scale(1.15, 1.75); g.font = `700 ${S(2.4)}px ${FJP}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.strokeStyle = paint; g.lineWidth = S(.26); g.lineJoin = 'round'; g.strokeText(chars[i], 0, 0); g.fillText(chars[i], 0, 0); g.restore();
    }
    g.restore();
    // wear the paint a little
    g.save(); g.globalCompositeOperation = 'source-atop'; g.restore();
  }
  // arrows in the far lanes
  for (let z = -30; z > rect.z0; z -= 46) for (const x of [-3, 3]) {
    g.save(); g.translate(X(x), Z(z)); g.fillStyle = paint;
    g.beginPath(); g.moveTo(0, -S(2.6)); g.lineTo(S(.7), -S(1.2)); g.lineTo(S(.22), -S(1.2)); g.lineTo(S(.22), S(2)); g.lineTo(-S(.22), S(2)); g.lineTo(-S(.22), -S(1.2)); g.lineTo(-S(.7), -S(1.2)); g.closePath(); g.fill(); g.restore();
  }
  // manholes
  for (const [x, z] of [[2.5, 9], [-8, -16], [7, -40], [-2, 30], [9, 12]]) {
    const c = [X(x), Z(z)], r = S(.35);
    g.fillStyle = '#585a68'; g.beginPath(); g.arc(c[0], c[1], r, 0, TAU); g.fill();
    g.strokeStyle = '#8a8c98'; g.lineWidth = Math.max(1, S(.04)); for (let k = 1; k < 4; k++) { g.beginPath(); g.arc(c[0], c[1], r * k / 4, 0, TAU); g.stroke(); }
  }
  // sunken cars (seen from above) and fallen bicycles
  const car = (x, z, ang, col, len) => {
    g.save(); g.translate(X(x), Z(z)); g.rotate(ang);
    const L = S(len || 3.6), Wd = S(1.6);
    g.fillStyle = 'rgba(30,40,60,.35)'; g.beginPath(); g.ellipse(S(.15), S(.2), Wd * .62, L * .56, 0, 0, TAU); g.fill();
    const body = (x0, y0, ww, hh, r) => { g.beginPath(); g.moveTo(x0 + r, y0); g.arcTo(x0 + ww, y0, x0 + ww, y0 + hh, r); g.arcTo(x0 + ww, y0 + hh, x0, y0 + hh, r); g.arcTo(x0, y0 + hh, x0, y0, r); g.arcTo(x0, y0, x0 + ww, y0, r); g.closePath(); };
    body(-Wd / 2, -L / 2, Wd, L, S(.35)); g.fillStyle = col; g.fill(); g.lineWidth = Math.max(1, S(.05)); g.strokeStyle = '#3a3b4c'; g.stroke();
    body(-Wd * .4, -L * .18, Wd * .8, L * .42, S(.2)); g.fillStyle = mix(col, '#ffffff', .25); g.fill(); g.stroke();
    g.fillStyle = '#3e5878'; body(-Wd * .38, -L * .3, Wd * .76, L * .14, S(.12)); g.fill(); body(-Wd * .36, L * .26, Wd * .72, L * .1, S(.1)); g.fill();
    // silt and algae
    g.globalAlpha = .45; daubs(g, [[-Wd / 2, -L / 2], [Wd / 2, -L / 2], [Wd / 2, L / 2], [-Wd / 2, L / 2]], '#7f9a63', R, { density: 30, len: S(.3), wd: S(.12), alpha: .5, spread: 3 }); g.globalAlpha = 1;
    g.restore();
  };
  car(8.2, 4, .25, '#f1f0ea'); car(-7.8, -14, -.1, '#e9584a'); car(4, -26, .05, '#8fc3e0', 4.3); car(-3.8, -52, .3, '#f4e7c2'); car(7.5, -80, -.2, '#ffffff', 4.4); car(-9, 8, 1.4, '#9ac39a', 3.3);
  car(-30, 14, 1.6, '#e3e3e8', 4.4);
  const bike = (x, z, ang, col) => {
    g.save(); g.translate(X(x), Z(z)); g.rotate(ang); g.strokeStyle = col; g.lineWidth = Math.max(1, S(.06));
    const r = S(.34); g.beginPath(); g.arc(-S(.55), 0, r, 0, TAU); g.moveTo(S(.55) + r, 0); g.arc(S(.55), 0, r, 0, TAU); g.stroke();
    g.beginPath(); g.moveTo(-S(.55), 0); g.lineTo(-S(.1), -S(.4)); g.lineTo(S(.35), -S(.4)); g.lineTo(S(.55), 0); g.moveTo(-S(.1), -S(.4)); g.lineTo(S(.05), 0); g.lineTo(S(.35), -S(.4)); g.moveTo(-S(.15), -S(.5)); g.lineTo(-S(.02), -S(.5)); g.moveTo(S(.35), -S(.4)); g.lineTo(S(.3), -S(.6)); g.stroke();
    g.fillStyle = '#e4e0c8'; g.fillRect(-S(.75), -S(.15) - r, S(.4), S(.25)); g.restore();
  };
  bike(-10.2, 2, .4, '#d04a3c'); bike(-9.4, 3.4, -.2, '#3c6fb0'); bike(10.4, -9, 1.2, '#e8d9b0'); bike(3, 17.5, 2.6, '#5ba36a'); bike(-12.8, 18, .8, '#e5e5ea');
  // a sunken road sign and traffic cone
  g.save(); g.translate(X(6.2), Z(18)); g.rotate(.7); g.fillStyle = '#2d63b5'; g.fillRect(-S(.45), -S(.45), S(.9), S(.9)); g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(0, -S(.3)); g.lineTo(S(.25), S(.2)); g.lineTo(-S(.25), S(.2)); g.closePath(); g.fill(); g.fillStyle = '#8a8c98'; g.fillRect(-S(.05), S(.45), S(.1), S(2.4)); g.restore();
  // drifted sand, water weeds, fallen leaves
  for (let i = 0; i < (hi ? 120 : 400); i++) {
    const x = rect.x0 + R() * (rect.x1 - rect.x0), z = rect.z0 + R() * (rect.z1 - rect.z0);
    const r = S(.2 + R() * .5), col = R() < .55 ? '#b9b28a' : '#6f9a5a';
    const poly = ellipsePts(X(x), Z(z), r, r * (.4 + R() * .5), 14, R() * 3).map(p => [p[0] + (R() - .5) * r * .3, p[1] + (R() - .5) * r * .3]);
    g.globalAlpha = .1 + R() * .12; fillPoly(g, chaikin(poly, 2, true), col);
    daubs(g, poly, col, R, { density: 8, len: S(.15), wd: S(.06), alpha: .5, spread: 3 });
  }
  g.globalAlpha = 1;
  for (let i = 0; i < (hi ? 900 : 1500); i++) { // leaves and petals on the bottom
    const x = rect.x0 + R() * (rect.x1 - rect.x0), z = rect.z0 + R() * (rect.z1 - rect.z0), r = S(.08 + R() * .1);
    g.fillStyle = ['#c98f4a', '#9fbf5a', '#e6b9c6', '#d9c07a'][(R() * 4) | 0]; g.globalAlpha = .8;
    g.beginPath(); g.ellipse(X(x), Z(z), r, r * .45, R() * 3, 0, TAU); g.fill();
  }
  g.globalAlpha = 1;
  // weed tufts along the curbs
  for (let i = 0; i < (hi ? 200 : 400); i++) {
    const s = R() < .5 ? -1 : 1, x = s * (11.5 + R() * 1.2), z = rect.z0 + R() * (rect.z1 - rect.z0);
    paintFoliageBlob(g, X(x), Z(z), S(.12 + R() * .22), R, 0, 1);
  }
  return cv;
}
