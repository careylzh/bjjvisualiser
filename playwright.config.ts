import { defineConfig, devices } from "@playwright/test";

// Surfaces the app must work on: a phone (bottom sheet), an iPad in Safari-like dimensions
// (side panel), and laptop/desktop browsers at 1280, 1366 and 1920 px wide. WebKit is included so Safari-specific
// breakage (import maps, dvh, pointer events) is caught before it reaches the user's iPad.
export default defineConfig({
  testDir: "./e2e",
  timeout: 45_000,
  expect: { timeout: 15_000 },
  use: { baseURL: "http://127.0.0.1:4173", trace: "on-first-retry" },
  webServer: {
    command: "npm run build && python3 -m http.server 4173 --bind 127.0.0.1 --directory app",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  },
  projects: [
    { name: "phone-chromium", use: { ...devices["Pixel 7"] } },
    { name: "ipad-chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1024, height: 768 }, hasTouch: true } },
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "laptop-chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 768 } } },
    { name: "desktop-wide-chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1920, height: 1080 } } },
    { name: "ipad-webkit", use: { ...devices["iPad Pro 11"] } }
  ]
});
