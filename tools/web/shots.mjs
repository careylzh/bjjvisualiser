// shots.mjs — reproducible screenshots of the app on a phone (Chromium), an iPad (WebKit),
// a 13" laptop and a wide desktop monitor (Chromium).
// Headless: no window opens. Output: .shots/*.png (gitignored). `npm run shots`.
import { chromium, webkit, devices } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..", "..");
const out = path.join(root, ".shots");
await mkdir(out, { recursive: true });
const port = 4192;
const srv = spawn("python3", ["-m", "http.server", String(port), "--bind", "127.0.0.1", "--directory", path.join(root, "app")], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 800));

async function shoot(browserType, device, name) {
  const browser = await browserType.launch();
  const page = await (await browser.newContext({ ...device })).newPage();
  page.on("pageerror", (e) => console.log(`[${name}] pageerror:`, e.message));
  await page.goto(`http://127.0.0.1:${port}/`);
  await page.waitForSelector('[data-viewer-status="loaded"]', { timeout: 30000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/${name}-home.png` });
  await page.locator('#regionList button[data-region="shoulder"]').click();
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${out}/${name}-shoulder.png` });
  const kimuraBullet = page.locator('article[data-technique="kimura"] .tech > summary');
  if (await kimuraBullet.count()) await kimuraBullet.click(); // phone: open the bullet first
  await page.locator('article[data-technique="kimura"] button[data-demo]').click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${out}/${name}-kimura-demo.png` });
  await browser.close();
  console.log(`${name}: 3 screenshots in ${path.relative(root, out)}/`);
}
try {
  await shoot(chromium, devices["Pixel 7"], "phone");
  await shoot(webkit, devices["iPad Pro 11"], "ipad");
  await shoot(chromium, { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 768 } }, "laptop");
  await shoot(chromium, { ...devices["Desktop Chrome"], viewport: { width: 1920, height: 1080 } }, "desktop");
} finally {
  srv.kill();
}
