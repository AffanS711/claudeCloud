const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const { spawn } = require('child_process');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary' };
const srv = http.createServer((q, r) => {
  const f = path.join(__dirname, decodeURIComponent(q.url.split('?')[0]));
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); r.end(d); });
}).listen(8123);
(async () => {
  const mode = process.argv[2];
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  p.on('console', m => { if (m.type() === 'error') console.log('ERR', m.text()); });
  p.on('pageerror', e => console.log('PAGEERR', e.message));
  await p.goto('http://localhost:8123/' + (process.env.PAGE || 'index.html') + '?record');
  await p.waitForFunction(() => window.READY, null, { timeout: 60000 });
  await p.evaluate(() => document.fonts.ready);
  console.log('info', JSON.stringify(await p.evaluate(() => window.INFO)));
  console.log('fonts', await p.evaluate(() => [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family).join(',')));
  if (mode === 'stills') {
    for (const t of process.argv.slice(3).map(Number)) {
      const s = Date.now();
      await p.evaluate(t => window.renderAt(t), t);
      await p.screenshot({ path: `still_${t}.jpg`, type: 'jpeg', quality: 80 });
      console.log('t', t, Date.now() - s, 'ms');
    }
  } else {
    const fps = +(process.env.FPS || 30), dur = await p.evaluate(() => window.DUR);
    const ff = spawn(require('ffmpeg-static'), ['-y', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', process.env.CRF || '19', '-preset', 'medium', '-movflags', '+faststart', (process.env.OUT || 'out.mp4')], { stdio: ['pipe', 'ignore', 'inherit'] });
    const n = Math.round(dur * fps); const s0 = Date.now();
    for (let i = +(process.env.START || 0); i < n; i++) {
      await p.evaluate(t => window.renderAt(t), i / fps);
      const buf = await p.screenshot({ type: 'jpeg', quality: 93 });
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (i % 60 === 0) console.log('frame', i, '/', n, ((Date.now() - s0) / 1000).toFixed(0) + 's');
    }
    ff.stdin.end(); await new Promise(r => ff.on('close', r));
  }
  await b.close(); srv.close();
})();
