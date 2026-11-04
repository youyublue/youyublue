// Usage: node cover.js outDir [t]  — writes cover.png (clean) and cover-title.png
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
(async () => {
  const out = process.argv[2], t = +(process.argv[3] || 26.7);
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1920, height: 1040 } });
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('file://' + path.resolve(__dirname, 'scene.html'));
  await p.waitForFunction(() => window.ready); await p.evaluate(() => window.ready);
  const r = await p.evaluate(t => {
    renderFrame(t);
    const c = document.getElementById('c'), g = c.getContext('2d');
    const clean = c.toDataURL('image/png');
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none';
    // title block, set in the sky at upper left
    const x = 150, y = 250;
    g.save();
    const gr = g.createRadialGradient(x + 170, y - 40, 20, x + 170, y - 40, 420);
    gr.addColorStop(0, 'rgba(20,60,120,.22)'); gr.addColorStop(1, 'rgba(20,60,120,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 900, 600);
    g.fillStyle = '#ffffff'; g.shadowColor = 'rgba(25,55,110,.55)'; g.shadowBlur = 22;
    g.font = `500 150px ${FMIN}`; g.textBaseline = 'alphabetic'; g.fillText('天気雨', x, y);
    g.shadowBlur = 12;
    g.font = `500 34px ${FMIN}`; const en = 'S U N S H O W E R'; g.fillText(en, x + 8, y + 70);
    g.fillRect(x + 8, y + 96, 120, 2);
    g.font = `500 22px ${FMIN}`; g.globalAlpha = .92; g.fillText('ある夏の午後、水没した東京で', x + 8, y + 136);
    g.restore();
    return [clean, c.toDataURL('image/png')];
  }, t);
  fs.writeFileSync(path.join(out, 'cover.png'), Buffer.from(r[0].split(',')[1], 'base64'));
  fs.writeFileSync(path.join(out, 'cover-title.png'), Buffer.from(r[1].split(',')[1], 'base64'));
  await b.close();
})();
