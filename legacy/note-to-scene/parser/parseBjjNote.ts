import {
  type BjjScene,
  fixedVisualIdentity,
  groundPositions,
  standingPositions,
  techniqueDefinitions
} from "./techniqueOntology";

function normalize(note: string) {
  return note.toLowerCase().replace(/\s+/g, " ").trim();
}

function includesAny(note: string, phrases: string[]) {
  return phrases.some((phrase) => note.includes(phrase));
}

export function parseBjjNote(note: string): BjjScene {
  const normalized = normalize(note);
  const definition = techniqueDefinitions.find(
    (candidate) =>
      normalized.includes(candidate.technique) ||
      includesAny(normalized, candidate.aliases)
  );

  if (definition) {
    return {
      technique: definition.technique,
      starting_position: definition.starting_position,
      stance: definition.stance,
      primary_actor: definition.primary_actor,
      secondary_actor: definition.secondary_actor,
      primary_actor_role: definition.primary_actor_role,
      secondary_actor_role: definition.secondary_actor_role,
      visual_identity: fixedVisualIdentity({ stance: definition.stance }),
      intent: definition.intent,
      viewpoint: definition.viewpoint,
      camera_focus: definition.camera_focus,
      body_constraints: definition.body_constraints
    };
  }

  const inferredGround = groundPositions.find((position) =>
    normalized.includes(position)
  );
  const inferredStanding = standingPositions.find((position) =>
    normalized.includes(position)
  );

  if (inferredGround) {
    return {
      technique: "unclassified ground technique",
      starting_position: inferredGround,
      stance: "ground",
      primary_actor: "bottom_player",
      secondary_actor: "top_player",
      primary_actor_role: "attacker",
      secondary_actor_role: "defender",
      visual_identity: fixedVisualIdentity({ stance: "ground" }),
      intent: "transition",
      viewpoint: "third_person_side_view",
      camera_focus: [inferredGround, "primary grips", "hip position"],
      body_constraints: {
        bottom_player: "blue gi floor player",
        top_player: "black gi top player"
      },
      ambiguity_notes: [
        "Technique was not in the milestone ontology; inferred a ground scene from the starting position."
      ]
    };
  }

  return {
    technique: inferredStanding ?? "unclassified standing technique",
    starting_position: inferredStanding,
    stance: "standing",
    primary_actor: "blue_gi_player",
    secondary_actor: "black_gi_player",
    primary_actor_role: "demonstrator",
    secondary_actor_role: "partner",
    visual_identity: fixedVisualIdentity({ stance: "standing" }),
    intent: inferredStanding ? "takedown" : "transition",
    viewpoint: "third_person_side_view",
    camera_focus: ["standing posture", "grips", "movement direction"],
    body_constraints: {
      blue_gi_player: "primary demonstrator in blue gi",
      black_gi_player: "partner or opponent in black gi"
    },
    ambiguity_notes: [
      inferredStanding
        ? "Standing position was recognized, but the exact technique was not in the milestone ontology."
        : "No supported ground or standing position was recognized; defaulted to standing per project rules."
    ]
  };
}
