import { describe, expect, it } from "vitest";
import { generateBlenderPrompt } from "../src/blender/generateBlenderPrompt";
import { parseBjjNote } from "../src/parser/parseBjjNote";

describe("generateBlenderPrompt", () => {
  it("mentions visual rules, stance, actor roles, USDZ export, and body constraints", () => {
    const scene = parseBjjNote("Triangle choke from closed guard");
    const prompt = generateBlenderPrompt(scene, {
      exportTarget: "src/web/public/models/triangle.usdz"
    });

    expect(prompt).toContain("two grapplers");
    expect(prompt).toContain("beige skin");
    expect(prompt).toContain("blue gi");
    expect(prompt).toContain("black gi");
    expect(prompt).toContain("ground");
    expect(prompt).toContain("bottom player (attacker)");
    expect(prompt).toContain("top player (defender)");
    expect(prompt).toContain(".usdz");
    expect(prompt).toContain("leg triangle");
    expect(prompt).toContain("trapped");
  });

  it("describes standing demonstrator and partner roles", () => {
    const scene = parseBjjNote("Standing collar drag");
    const prompt = generateBlenderPrompt(scene);

    expect(prompt).toContain("standing");
    expect(prompt).toContain("blue gi player (demonstrator)");
    expect(prompt).toContain("black gi player (partner)");
    expect(prompt).toContain("Collar grip");
  });
});
