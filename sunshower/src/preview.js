// Usage: node preview.js outDir t1 t2 ...   (env CAM=..., LW=...)
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
(async () => {
  const [out, ...ts] = process.argv.slice(2);
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1920, height: 1040 } });
  p.on('console', m => console.log('page:', m.text())); p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('file://' + path.resolve(__dirname, process.env.SCENE || 'scene.html') + (process.env.Q || ''), { waitUntil: 'commit' });
  await p.waitForFunction(() => window.ready, null, { timeout: 0 }); await p.evaluate(() => window.ready);
  if (process.env.CAM) await p.evaluate(c => window.CAM = c, process.env.CAM);
  for (const t of ts) {
    const ms = await p.evaluate(t => { const a = performance.now(); renderFrame(+t); return performance.now() - a; }, t);
    const d = await p.evaluate(() => document.getElementById('c').toDataURL('image/jpeg', .9));
    fs.writeFileSync(path.join(out, `${process.env.CAM||''}t${t}.jpg`), Buffer.from(d.split(',')[1], 'base64'));
    console.log('t', t, ms.toFixed(0) + 'ms');
  }
  await b.close();
})();
