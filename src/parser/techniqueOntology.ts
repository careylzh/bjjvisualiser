export type Stance = "ground" | "standing" | "transition";
export type Actor =
  | "bottom_player"
  | "top_player"
  | "blue_gi_player"
  | "black_gi_player";
export type ActorRole = "attacker" | "defender" | "demonstrator" | "partner";
export type Intent =
  | "submission"
  | "escape"
  | "sweep"
  | "pass"
  | "control"
  | "takedown"
  | "transition";
export type Viewpoint =
  | "third_person_side_view"
  | "attacker_view"
  | "defender_view";

export interface BjjScene {
  technique: string;
  starting_position?: string;
  stance: Stance;
  primary_actor: Actor;
  secondary_actor: Actor;
  primary_actor_role: ActorRole;
  secondary_actor_role: ActorRole;
  visual_identity: {
    bottom_player_gi?: "blue";
    top_player_gi?: "black";
    primary_actor_gi: "blue";
    secondary_actor_gi: "black";
    skin_color: "beige";
  };
  intent: Intent;
  viewpoint: Viewpoint;
  camera_focus: string[];
  body_constraints: Record<string, unknown>;
  ambiguity_notes?: string[];
}

export interface TechniqueDefinition {
  technique: string;
  aliases: string[];
  starting_position?: string;
  stance: Stance;
  intent: Intent;
  primary_actor: Actor;
  secondary_actor: Actor;
  primary_actor_role: ActorRole;
  secondary_actor_role: ActorRole;
  viewpoint: Viewpoint;
  camera_focus: string[];
  body_constraints: Record<string, unknown>;
}

export const groundPositions = [
  "closed guard",
  "mount",
  "side control",
  "half guard",
  "back control"
];

export const standingPositions = [
  "standing collar drag",
  "single leg takedown",
  "double leg takedown",
  "standing grip fight"
];

export const techniqueDefinitions: TechniqueDefinition[] = [
  {
    technique: "triangle choke from closed guard",
    aliases: ["triangle choke", "triangle from closed guard"],
    starting_position: "closed guard",
    stance: "ground",
    intent: "submission",
    primary_actor: "bottom_player",
    secondary_actor: "top_player",
    primary_actor_role: "attacker",
    secondary_actor_role: "defender",
    viewpoint: "third_person_side_view",
    camera_focus: [
      "leg triangle around defender head",
      "one trapped defender arm",
      "attacker hip angle",
      "closed guard transition"
    ],
    body_constraints: {
      bottom_player: {
        legs: "one leg crosses behind top defender neck while the other clamps over the ankle to form a triangle",
        hips: "angled slightly off center to tighten the triangle",
        arms: "control the trapped arm across the centerline"
      },
      top_player: {
        head: "inside the blue gi attacker's leg triangle",
        trapped_arm: "one arm pulled across the attacker's torso",
        free_arm: "posted near the mat for balance"
      },
      labels: [
        "Blue gi bottom attacker",
        "Black gi top defender",
        "Leg triangle",
        "Trapped arm"
      ]
    }
  },
  {
    technique: "armbar from closed guard",
    aliases: ["armbar", "juji gatame from closed guard"],
    starting_position: "closed guard",
    stance: "ground",
    intent: "submission",
    primary_actor: "bottom_player",
    secondary_actor: "top_player",
    primary_actor_role: "attacker",
    secondary_actor_role: "defender",
    viewpoint: "third_person_side_view",
    camera_focus: [
      "attacker hips under defender shoulder",
      "leg over defender head",
      "trapped straight arm",
      "closed guard angle"
    ],
    body_constraints: {
      bottom_player: {
        hips: "rotated perpendicular to the top defender",
        legs: "one leg clamps across the defender upper back and one leg crosses over the defender head",
        arms: "control and extend one defender arm with thumb oriented upward"
      },
      top_player: {
        trapped_arm: "extended between the attacker's knees",
        posture: "pulled forward with shoulder line controlled",
        free_arm: "bent near the attacker's torso"
      },
      labels: [
        "Blue gi bottom attacker",
        "Black gi top defender",
        "Leg over head",
        "Controlled arm"
      ]
    }
  },
  {
    technique: "standing collar drag",
    aliases: ["collar drag", "standing collar drag takedown"],
    starting_position: "standing grip fight",
    stance: "standing",
    intent: "takedown",
    primary_actor: "blue_gi_player",
    secondary_actor: "black_gi_player",
    primary_actor_role: "demonstrator",
    secondary_actor_role: "partner",
    viewpoint: "third_person_side_view",
    camera_focus: [
      "blue gi collar grip",
      "sleeve control",
      "offline step",
      "partner forward posture"
    ],
    body_constraints: {
      blue_gi_player: {
        stance: "standing with one foot stepped outside the partner's lead foot",
        grips: "one hand grips the black gi collar while the other controls the sleeve",
        pull: "draws the partner forward and diagonally past the shoulder line"
      },
      black_gi_player: {
        posture: "standing but tilted forward from the collar drag",
        feet: "lead foot light and beginning to step to recover balance",
        arms: "collar and sleeve are visibly controlled"
      },
      labels: [
        "Blue gi demonstrator",
        "Black gi partner",
        "Collar grip",
        "Drag direction"
      ]
    }
  }
];

export function fixedVisualIdentity(scene: Pick<BjjScene, "stance">) {
  if (scene.stance === "ground") {
    return {
      bottom_player_gi: "blue" as const,
      top_player_gi: "black" as const,
      primary_actor_gi: "blue" as const,
      secondary_actor_gi: "black" as const,
      skin_color: "beige" as const
    };
  }

  return {
    primary_actor_gi: "blue" as const,
    secondary_actor_gi: "black" as const,
    skin_color: "beige" as const
  };
}
