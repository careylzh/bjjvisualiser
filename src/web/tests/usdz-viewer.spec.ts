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
