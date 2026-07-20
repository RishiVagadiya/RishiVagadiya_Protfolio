import puppeteer from 'puppeteer-core';

// FPS probe: measures frame rate while idle and while riding, on a software
// (swiftshader) GPU so results approximate a weak iGPU machine.
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: 'new',
  args: ['--window-size=1360,720', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox']
});
const page = await browser.newPage();
await page.setViewport({ width: 1360, height: 720 });
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await new Promise(r => setTimeout(r, 1500));
await page.keyboard.press('Space'); // dismiss intro
await new Promise(r => setTimeout(r, 800));
await page.waitForFunction(() => {
  const l = document.getElementById('loader');
  return l && (l.style.display === 'none' || getComputedStyle(l).opacity === '0' || l.classList.contains('hide') || l.classList.contains('hidden'));
}, { timeout: 60000 }).catch(() => errors.push('loader never hid'));
await new Promise(r => setTimeout(r, 3000));

async function fps(ms) {
  return page.evaluate((ms) => new Promise(res => {
    let n = 0;
    const t0 = performance.now();
    function tick() {
      n++;
      if (performance.now() - t0 < ms) requestAnimationFrame(tick);
      else res((n / (performance.now() - t0)) * 1000);
    }
    requestAnimationFrame(tick);
  }), ms);
}

async function rideAndMeasure(clicks, ms) {
  const p = page.evaluate((ms) => new Promise(res => {
    let n = 0;
    const t0 = performance.now();
    function tick() {
      n++;
      if (performance.now() - t0 < ms) requestAnimationFrame(tick);
      else res((n / (performance.now() - t0)) * 1000);
    }
    requestAnimationFrame(tick);
  }), ms);
  for (let i = 0; i < clicks; i++) { await page.mouse.wheel({ deltaY: 380 }); await new Promise(r => setTimeout(r, 120)); }
  return p;
}

const idleFps = await fps(4000);
const rideFps1 = await rideAndMeasure(20, 5000);
await new Promise(r => setTimeout(r, 1000));
const rideFps2 = await rideAndMeasure(25, 5000);
await new Promise(r => setTimeout(r, 1500));

const info = await page.evaluate(() => {
  const r = window.__renderer;
  return r ? { calls: r.info.render.calls, tris: r.info.render.triangles, programs: r.info.programs.length } : null;
});

console.log(JSON.stringify({
  idleFps: +idleFps.toFixed(1),
  rideFps1: +rideFps1.toFixed(1),
  rideFps2: +rideFps2.toFixed(1),
  rendererInfo: info,
  errors: errors.slice(0, 8)
}, null, 2));
await browser.close();
