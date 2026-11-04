// Renders scene.html frame by frame (in parallel browsers) and encodes it with the soundtrack.
// Usage: node render.js <score.wav> <out.mp4> [fps] [workers]
const { chromium } = require('playwright');
const { spawn, execFileSync } = require('child_process');
const path = require('path'), fs = require('fs'), os = require('os');

async function worker(id, frames, fps, dir) {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1040 } });
  page.on('pageerror', e => { console.error('page error:', e.message); process.exit(1); });
  await page.goto('file://' + path.resolve(__dirname, 'scene.html'), { waitUntil: 'commit' });
  await page.waitForFunction(() => window.ready, null, { timeout: 0 });
  await page.evaluate(() => window.ready);
  const t0 = Date.now();
  for (let k = 0; k < frames.length; k++) {
    const i = frames[k];
    const out = path.join(dir, `f${String(i).padStart(5, '0')}.jpg`);
    if (fs.existsSync(out)) continue;
    const data = await page.evaluate(t => { renderFrame(t); return document.getElementById('c').toDataURL('image/jpeg', .95); }, i / fps);
    fs.writeFileSync(out + '.tmp', Buffer.from(data.slice(data.indexOf(',') + 1), 'base64'));
    fs.renameSync(out + '.tmp', out);
    if (k % 24 === 0) console.log(`[w${id}] ${k}/${frames.length} frame ${i}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  await browser.close();
}

(async () => {
  const [wav, out, fpsArg, wArg] = process.argv.slice(2);
  const fps = +(fpsArg || 24), nw = +(wArg || Math.max(1, os.cpus().length));
  const dir = process.env.FRAMES || fs.mkdtempSync(path.join(os.tmpdir(), 'sunshower-'));
  fs.mkdirSync(dir, { recursive: true });
  const dur = 81, total = Math.round(dur * fps);
  // contiguous chunks keep each worker on few shots (fewer background plates to paint)
  const chunks = []; const per = Math.ceil(total / nw);
  for (let w = 0; w < nw; w++) { const a = []; for (let i = w * per; i < Math.min(total, (w + 1) * per); i++) a.push(i); chunks.push(a); }
  await Promise.all(chunks.map((c, i) => worker(i, c, fps, dir)));
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-framerate', String(fps), '-i', path.join(dir, 'f%05d.jpg'), '-i', wav,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '19', '-tune', 'animation', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out], { stdio: 'inherit' });
  console.log('done', out, 'frames in', dir);
})();
