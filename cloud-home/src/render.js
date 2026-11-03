// Renders scene.html frame by frame and encodes it with the soundtrack.
// Usage: node render.js <score.wav> <out.mp4> [fps]
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');

(async () => {
  const [wav, out, fpsArg] = process.argv.slice(2);
  const fps = +(fpsArg || 24);
  const ff = spawn('ffmpeg', [
    '-y', '-v', 'error',
    '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-i', wav,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '21', '-tune', 'animation', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', out
  ], { stdio: ['pipe', 'inherit', 'inherit'] });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1040 } });
  page.on('pageerror', e => { console.error('page error:', e.message); process.exit(1); });
  await page.goto('file://' + path.resolve(__dirname, 'scene.html'), { waitUntil: 'commit' });
  await page.waitForFunction(() => window.ready, null, { timeout: 0 });
  await page.evaluate(() => window.ready);
  const dur = await page.evaluate(() => window.DUR);
  const frames = Math.round(dur * fps);
  const t0 = Date.now();
  for (let i = 0; i < frames; i++) {
    const data = await page.evaluate(t => { renderFrame(t); return document.getElementById('c').toDataURL('image/jpeg', 0.96); }, i / fps);
    const buf = Buffer.from(data.slice(data.indexOf(',') + 1), 'base64');
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 120 === 0) console.log(`frame ${i}/${frames}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end();
  await browser.close();
  await new Promise((res, rej) => ff.on('close', c => c ? rej(new Error('ffmpeg exit ' + c)) : res()));
  console.log('done', out);
})();
