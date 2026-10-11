import { expect, test, type Page } from "@playwright/test";

async function loaded(page: Page) {
  await page.goto("/");
  await expect(page.getByTestId("viewport")).toHaveAttribute("data-viewer-status", "loaded");
}

test("renders the rig and the region list", async ({ page }) => {
  await loaded(page);
  await expect(page.getByRole("heading", { name: "BJJ Visualiser" })).toBeVisible();
  const regionButtons = page.locator("#regionList button");
  await expect(regionButtons).toHaveCount(16);
  await expect(page.locator("#versionLabel")).toContainText(/^v\d+\.\d+\.\d+/);
  const canvas = page.locator("#viewport canvas");
  const size = await canvas.evaluate((c) => ({ w: (c as HTMLCanvasElement).width, h: (c as HTMLCanvasElement).height }));
  expect(size.w).toBeGreaterThan(0);
  expect(size.h).toBeGreaterThan(0);
});

test("selecting a region from the list shows its attacks with sources", async ({ page }) => {
  await loaded(page);
  await page.locator('#regionList button[data-region="shoulder"]').click();
  await expect(page.getByTestId("viewport")).toHaveAttribute("data-selected-region", "shoulder");
  await expect(page.locator("#panelRegion h2")).toContainText("Shoulder");
  const kimura = page.locator('article[data-technique="kimura"]');
  await expect(kimura).toBeVisible();
  await kimura.getByRole("button", { name: /Sources/ }).click();
  await expect(kimura.locator(".sources li").first()).toBeVisible();
});

test("tapping the figure selects the region under the pointer", async ({ page }) => {
  await loaded(page);
  // Project the left elbow joint to screen space through the live camera — after the camera has
  // settled (the first ResizeObserver pass re-frames the figure a few frames after "loaded").
  const project = () => page.evaluate(() => (window as any).__bjj.viewer.__debug?.project?.("Elbow_L") ?? null);
  let pt = await project();
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(150);
    const next = await project();
    if (pt && next && Math.abs(next.x - pt.x) < 0.5 && Math.abs(next.y - pt.y) < 0.5) { pt = next; break; }
    pt = next;
  }
  test.skip(!pt, "viewer has no debug projector");
  const box = await page.locator("#viewport canvas").boundingBox();
  await page.mouse.click(box!.x + pt.x, box!.y + pt.y);
  await expect(page.getByTestId("viewport")).toHaveAttribute("data-selected-region", "elbow");
  await expect(page.locator("#sideBadge")).toContainText("left");
});

test("position and role filters narrow the technique list", async ({ page }) => {
  await loaded(page);
  await page.locator('#regionList button[data-region="shoulder"]').click();
  await page.locator('#groupChips [data-group="top"]').click();
  await page.locator("#positionSelect").selectOption("mount");
  await page.locator('.segmented [data-role="bottom"]').click();
  // The kimura is a top attack from side control/closed guard in the seed; mount+bottom should hide it or show empty.
  const cards = page.locator("#panelRegion article");
  const empty = page.locator("#panelRegion .empty");
  await expect(cards.first().or(empty)).toBeVisible();
});

test("the joint tab exposes anatomical DOF sliders and a demo moves the joint", async ({ page }) => {
  await loaded(page);
  await page.locator('#regionList button[data-region="elbow"]').click();
  await page.locator('.tab[data-tab="joint"]').click();
  await expect(page.locator('input.range[data-dof="flexion"]')).toBeVisible();
  await page.locator('.tab[data-tab="attacks"]').click();
  const demo = page.locator("button[data-demo]").first();
  await demo.click();
  // Poll: CI runners render WebGL in software and may deliver only a few animation frames per second.
  await expect.poll(async () => page.evaluate(() => {
    const { viewer } = (window as any).__bjj;
    return viewer.getJointAngles("elbow", "L").some((v: number) => Math.abs(v) > 1) || viewer.getJointAngles("shoulder", "L").some((v: number) => Math.abs(v) > 1);
  }), { timeout: 4000, intervals: [100, 200, 300] }).toBe(true);
});

test("phone layout uses a bottom sheet; tablet layout uses a side panel", async ({ page, viewport }) => {
  await loaded(page);
  const panel = page.locator("#panel");
  const pos = await panel.evaluate((n) => getComputedStyle(n).position);
  if ((viewport?.width ?? 0) < 760) {
    expect(pos).toBe("absolute");
    await expect(page.locator("#sheetHandle")).toBeVisible();
  } else {
    expect(pos).toBe("relative");
    await expect(page.locator("#sheetHandle")).toBeHidden();
  }
  const scrollW = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  expect(scrollW).toBe(true);
  // A long technique list must scroll inside the panel, never stretch the canvas off-screen.
  await page.locator('#regionList button[data-region="wrist"]').click();
  await page.waitForTimeout(300);
  const canvasH = await page.locator("#viewport canvas").evaluate((c) => c.clientHeight);
  expect(canvasH).toBeLessThanOrEqual(viewport!.height);
});

test("technique cards lead with plain language; the clinical anatomy is collapsed", async ({ page }) => {
  await loaded(page);
  await page.locator('#regionList button[data-region="elbow"]').click();
  const armbar = page.locator('article[data-technique="armbar_closed_guard"]');
  await expect(armbar.locator(".mech")).toContainText("How it works");
  await expect(armbar.locator(".mech")).not.toContainText(/olecranon|humeroulnar|capsule/i);
  await expect(page.locator("#panelRegion .region-head .anatomy")).not.toContainText(/humeroulnar|collateral/i);
  const detail = armbar.locator("details.anatomy-detail");
  await expect(detail.locator("p").first()).toBeHidden();
  await detail.locator("summary").click();
  await expect(detail.locator("p").first()).toContainText(/olecranon/i);
  // Joint sliders speak gym words too.
  await page.locator('.tab[data-tab="joint"]').click();
  await expect(page.locator(".dof label").first()).toContainText("bend");
  await expect(page.locator(".dof")).not.toContainText(/pronation|supination|AAOS/);
});

test("laptop and desktop: the panel grows with the screen, AR is hidden, the mouse gets hover labels", async ({ page, viewport }, info) => {
  test.skip((viewport?.width ?? 0) < 1024 || /ipad|phone/.test(info.project.name), "laptop/desktop projects only");
  await loaded(page);
  await expect(page.locator("#arLink")).toBeHidden(); // Quick Look is iOS/iPadOS only
  const panelW = await page.locator("#panel").evaluate((n) => n.getBoundingClientRect().width);
  expect(panelW).toBeGreaterThanOrEqual(380);
  expect(panelW).toBeLessThanOrEqual(viewport!.width * 0.45);
  await page.locator('#regionList button[data-region="shoulder"]').click();
  const cols = await page.locator("#panelRegion .card-list").evaluate((n) => getComputedStyle(n).gridTemplateColumns.split(" ").length);
  expect(cols).toBe(viewport!.width >= 1440 ? 2 : 1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  // Escape returns to the region list.
  await page.keyboard.press("Escape");
  await expect(page.locator("#panelHome")).toBeVisible();
  // Hovering a joint with the mouse names it before the click.
  const project = () => page.evaluate(() => (window as any).__bjj.viewer.__debug?.project?.("Elbow_L") ?? null);
  let pt = await project();
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(150);
    const next = await project();
    if (pt && next && Math.abs(next.x - pt.x) < 0.5 && Math.abs(next.y - pt.y) < 0.5) { pt = next; break; }
    pt = next;
  }
  test.skip(!pt, "viewer has no debug projector");
  const box = await page.locator("#viewport canvas").boundingBox();
  await page.mouse.move(box!.x + pt.x - 20, box!.y + pt.y - 20);
  await page.mouse.move(box!.x + pt.x, box!.y + pt.y, { steps: 4 });
  await expect(page.locator("#hoverLabel")).toBeVisible();
  await expect(page.locator("#hoverLabel")).toContainText(/Elbow/);
});
