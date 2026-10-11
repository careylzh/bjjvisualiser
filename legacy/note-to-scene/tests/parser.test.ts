import { describe, expect, it } from "vitest";
import { parseBjjNote } from "../parser/parseBjjNote";

describe("parseBjjNote", () => {
  it("maps triangle choke from closed guard to bottom-player attacker", () => {
    const scene = parseBjjNote("Triangle choke from closed guard");

    expect(scene.technique).toBe("triangle choke from closed guard");
    expect(scene.stance).toBe("ground");
    expect(scene.primary_actor).toBe("bottom_player");
    expect(scene.primary_actor_role).toBe("attacker");
    expect(scene.secondary_actor).toBe("top_player");
    expect(scene.secondary_actor_role).toBe("defender");
  });

  it("maps armbar from closed guard to bottom-player attacker", () => {
    const scene = parseBjjNote("Armbar from closed guard");

    expect(scene.technique).toBe("armbar from closed guard");
    expect(scene.stance).toBe("ground");
    expect(scene.primary_actor).toBe("bottom_player");
    expect(scene.primary_actor_role).toBe("attacker");
  });

  it("assigns bottom player blue gi and top player black gi for ground scenes", () => {
    const scene = parseBjjNote("Triangle choke from closed guard");

    expect(scene.visual_identity.bottom_player_gi).toBe("blue");
    expect(scene.visual_identity.top_player_gi).toBe("black");
    expect(scene.visual_identity.skin_color).toBe("beige");
  });

  it("assigns blue gi player as primary demonstrator for standing scenes", () => {
    const scene = parseBjjNote("Standing collar drag");

    expect(scene.stance).toBe("standing");
    expect(scene.primary_actor).toBe("blue_gi_player");
    expect(scene.secondary_actor).toBe("black_gi_player");
    expect(scene.primary_actor_role).toBe("demonstrator");
    expect(scene.secondary_actor_role).toBe("partner");
    expect(scene.visual_identity.primary_actor_gi).toBe("blue");
    expect(scene.visual_identity.secondary_actor_gi).toBe("black");
  });

  it("defaults ambiguous notes to standing with ambiguity notes", () => {
    const scene = parseBjjNote("Grip, move, and finish.");

    expect(scene.stance).toBe("standing");
    expect(scene.ambiguity_notes?.length).toBeGreaterThan(0);
  });
});
