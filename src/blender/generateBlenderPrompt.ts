import type { BjjScene } from "../parser/techniqueOntology";

function formatBodyConstraints(bodyConstraints: Record<string, unknown>) {
  return JSON.stringify(bodyConstraints, null, 2);
}

function labelFor(actor: string, role: string) {
  return `${actor.replaceAll("_", " ")} (${role})`;
}

export function generateBlenderPrompt(
  scene: BjjScene,
  options: { exportTarget?: string } = {}
) {
  const exportTarget =
    options.exportTarget ??
    `data/generated/usdz/${scene.technique.replaceAll(" ", "-")}.usdz`;
  const startingContext = scene.starting_position
    ? `starting position "${scene.starting_position}"`
    : `stance "${scene.stance}"`;

  return [
    `Create an instructional sports-education BJJ 3D scene for: ${scene.technique}.`,
    "",
    "Scene requirements:",
    "- Include exactly two grapplers with beige skin.",
    `- Use ${startingContext}; overall stance is ${scene.stance}.`,
    `- Primary actor: ${labelFor(scene.primary_actor, scene.primary_actor_role)} wearing a blue gi.`,
    `- Secondary actor: ${labelFor(scene.secondary_actor, scene.secondary_actor_role)} wearing a black gi.`,
    "- Ground identity rule: floor/bottom player wears blue gi and top player wears black gi when applicable.",
    "- Keep the framing instructional and calm, with no violent styling, blood, injury, or dramatic impact effects.",
    "",
    "Precise limb and body placement:",
    formatBodyConstraints(scene.body_constraints),
    "",
    "Camera and review composition:",
    `- Viewpoint: ${scene.viewpoint}.`,
    `- Camera focus: ${scene.camera_focus.join(", ")}.`,
    "- Use a third-person side-view composition when specified, with enough space around both athletes for model review.",
    "- Add educational callouts as simple floating labels with leader lines for grips, trapped limbs, hip angle, leg position, and actor roles.",
    "",
    "USDZ export:",
    `- Export the finished visualization as .usdz to: ${exportTarget}.`,
    "- If practical, also export a matching .glb browser-preview companion with the same base filename for inline web orbit controls.",
    "- Optimize the scene for static GitHub Pages review in a USDZ-first viewer."
  ].join("\n");
}
