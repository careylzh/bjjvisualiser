import { expect, test } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.resolve(currentDir, "../public/models/simple-box.usdz");

test("keeps the restored review layout visible", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "BJJ Visualiser" })).toBeVisible();
  await expect(page.getByText("USDZ-first scene review")).toBeVisible();
  await expect(page.getByText("Current file")).toBeVisible();
  await expect(page.getByText("Drop USDZ to inspect")).toBeVisible();
  await expect(page.getByRole("button", { name: "Reset View" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Rotate Left" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Rotate Right" })).toBeDisabled();
});

test("loads a USDZ file into the browser viewport and enables horizontal rotation", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("Load USDZ").setInputFiles(fixturePath);

  await expect(page.getByText("simple-box.usdz", { exact: true })).toBeVisible();
  await expect(page.getByTestId("viewer-status")).toContainText("USDZ loaded in the browser");
  await expect(page.getByTestId("usdz-viewport")).toHaveAttribute("data-viewer-status", "loaded");
  const canvas = page.locator("canvas");
  await expect(canvas).toBeVisible();
  const drawingBufferSize = await canvas.evaluate((element) => ({
    width: (element as HTMLCanvasElement).width,
    height: (element as HTMLCanvasElement).height
  }));
  expect(drawingBufferSize.width).toBeGreaterThan(0);
  expect(drawingBufferSize.height).toBeGreaterThan(0);
  const canvasBox = await canvas.boundingBox();
  expect(canvasBox?.width).toBeGreaterThan(0);
  expect(canvasBox?.height).toBeGreaterThan(0);

  const rotateRight = page.getByRole("button", { name: "Rotate Right" });
  await expect(rotateRight).toBeEnabled();
  await rotateRight.click();
  await expect(page.getByTestId("usdz-viewport")).toHaveAttribute("data-rotation-ticks", "1");

  await page.getByRole("button", { name: "Reset View" }).click();
  await expect(page.getByTestId("usdz-viewport")).toHaveAttribute("data-rotation-ticks", "0");
});

test("keeps controls readable on mobile", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile-only layout coverage");

  await page.goto("/");

  await expect(page.getByText("Load a `.usdz` file")).toBeVisible();
  await expect(page.locator(".desktop-help")).toBeHidden();
  await expect(page.getByLabel("Horizontal rotation controls")).toBeVisible();

  const loadButton = page.getByText("Load USDZ", { exact: true });
  const resetButton = page.getByRole("button", { name: "Reset View" });
  const viewportBox = await page.getByTestId("usdz-viewport").boundingBox();
  const loadBox = await loadButton.boundingBox();
  const resetBox = await resetButton.boundingBox();

  expect(viewportBox?.width).toBeGreaterThan(300);
  expect(viewportBox?.height).toBeGreaterThan(300);
  expect(loadBox?.height).toBeGreaterThanOrEqual(44);
  expect(resetBox?.height).toBeGreaterThanOrEqual(44);
});

test("scales layout without horizontal overflow", async ({ page }) => {
  await page.goto("/");

  const metrics = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    titleFontSize: parseFloat(getComputedStyle(document.querySelector("h1")!).fontSize),
    controlHeight: document.querySelector("button")!.getBoundingClientRect().height,
    viewport: document.querySelector('[data-testid="usdz-viewport"]')!.getBoundingClientRect()
  }));

  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.innerWidth + 1);
  expect(metrics.titleFontSize).toBeGreaterThan(18);
  expect(metrics.controlHeight).toBeGreaterThan(38);
  expect(metrics.viewport.width).toBeGreaterThan(300);
  expect(metrics.viewport.height).toBeGreaterThan(250);
});
