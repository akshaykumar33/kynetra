/* global window, document, requestAnimationFrame -- used inside page.evaluate, which runs in the browser */
// Opens the floor in a visible Chromium window and reports frame rate over 10 seconds.
//   node scripts/measure-fps.mjs [email]
// Run while the web app (npm run dev) and API are up, e.g. during scripts/load-presence.mjs.
import { chromium } from '@playwright/test';

const email = process.argv[2] ?? 'tomas@northgate.test';
const browser = await chromium.launch({ headless: false, args: ['--window-size=1440,900'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:5173/');
await page.evaluate(
  e =>
    fetch('/auth/dev/login', {
      method: 'POST',
      headers: { 'x-knovra-csrf': '1', 'content-type': 'application/json' },
      body: JSON.stringify({ email: e }),
    }),
  email,
);
await page.reload();
await page.waitForFunction(() => window.__office?.useOffice.getState().connection === 'live', null, {
  timeout: 30_000,
});
await page.waitForTimeout(3000); // let shaders compile and avatars appear
const result = await page.evaluate(async () => {
  let frames = 0;
  let worst = 0;
  const t0 = performance.now();
  let last = t0;
  await new Promise(done => {
    const f = now => {
      frames++;
      worst = Math.max(worst, now - last);
      last = now;
      if (now - t0 < 10_000) requestAnimationFrame(f);
      else done();
    };
    requestAnimationFrame(f);
  });
  const gl = document.createElement('canvas').getContext('webgl2');
  const info = gl.getExtension('WEBGL_debug_renderer_info');
  return {
    onlineColleagues: Object.keys(window.__office.useOffice.getState().online).length,
    fps: Number((frames / ((last - t0) / 1000)).toFixed(1)),
    worstFrameMs: Number(worst.toFixed(1)),
    gpu: info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : 'unknown',
  };
});
console.log(JSON.stringify(result, null, 2));
await browser.close();
