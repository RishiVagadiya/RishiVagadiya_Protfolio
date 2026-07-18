import puppeteer from 'puppeteer-core';
import fs from 'fs';

const OUT = 'C:/Users/rishi/AppData/Local/Temp/shots';
fs.mkdirSync(OUT, { recursive: true });

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
await page.keyboard.press('Space');
await new Promise(r => setTimeout(r, 800));
await page.waitForFunction(() => {
  const l = document.getElementById('loader');
  return l && (l.style.display === 'none' || getComputedStyle(l).opacity === '0' || l.classList.contains('hidden'));
}, { timeout: 60000 }).catch(() => errors.push('loader never hid'));
await new Promise(r => setTimeout(r, 3500));

async function ride(clicks, name) {
  for (let i = 0; i < clicks; i++) { await page.mouse.wheel({ deltaY: 380 }); await new Promise(r => setTimeout(r, 25)); }
  await new Promise(r => setTimeout(r, 2200));
  await page.screenshot({ path: `${OUT}/${name}.png` });
}
await ride(3, 'fix_a');
await ride(8, 'fix_b');
await ride(6, 'fix_c');

console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'ERRORS: none');
await browser.close();
