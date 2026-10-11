// plain-language.mjs — the jargon gate for every field a practitioner reads first.
//
// The app is for the average jiu-jitsu practitioner, not a clinician. Fields shown up front
// (region `plain`, target `plain`, `summary`, position notes) must use gym words: knee, elbow,
// shoulder blade, lats, ribs, windpipe, ankle tendon, "hyperextends the elbow". The precise
// anatomy stays in `anatomy`, `mechanism` and `structures`, shown only under "Anatomy detail".
//
// Each entry: [regex, plain-word suggestion]. Matching is case-insensitive on word starts.
export const JARGON = [
  [/\b(glenohumeral|humeroulnar|humeroradial|radiocarpal|tibiofemoral|talocrural|subtalar|patellofemoral|atlanto\w*|acromioclavicular)/i, "name the joint: shoulder / elbow / wrist / knee / ankle"],
  [/\b(humer(us|al)|ulna[r]?|radial|femur|femoral|tibia[l]?|fibula[r]?|patella[r]?|scapula[r]?|clavic\w*|sternum|sternal|mandib\w*|hyoid|occip\w*)/i, "upper-arm bone / forearm / thigh / shin / kneecap / shoulder blade / collarbone / breastbone / jaw / back of the head"],
  [/\b(carp(al|us)|metacarp\w*|tars(al|us)|metatars\w*|phalan\w*|calcane\w*|talus)\b/i, "hand / foot / toes / heel"],
  [/\b(olecranon|fossa|condyl\w*|epicondyl\w*|malleol\w*)/i, "tip of the elbow / bony bump"],
  [/\b(cervical|thoracic|lumbar|vertebra\w*|intervertebral|facet joint)/i, "neck / upper back / lower back / spine"],
  [/\b(carotid|jugular|trachea\w*|larynx|laryn\w*|baroreceptor|vag(al|us)|cerebral|ischemi\w*|hypoxi\w*)/i, "arteries on the side of the neck / windpipe / blood flow to the brain"],
  [/\b(brachii|brachialis|brachial|plexus|gastrocnemius|soleus|quadriceps|latissimus|pectoralis|trapezius|sternocleidomastoid|intercostal|adductor\w*|gracilis|piriformis)/i, "biceps / calf / quads / lats / pecs / traps / groin"],
  [/\b(menisc\w*|cruciate|collateral|capsul\w*|labrum|syndesmo\w*|articular|articulation|osseous)/i, "knee cartilage / ACL, MCL / joint / ligaments"],
  [/\b(flexion|flexor|extensor|pronat\w*|supinat\w*|abduct\w*|adduct\w*|dorsiflex\w*|plantarflex\w*|plantar|eversion|valgus|varus|torsion)/i, "bend / straighten / palm up, palm down / arm out, arm in / toes up, point the toes / twist"],
  [/\b(anterior|posterior|medial|lateral(?! drop)|proximal|distal)\b/i, "front / back / inside / outside"],
];

/** Returns the list of jargon hits in `text` as [match, suggestion] pairs. */
export function jargonHits(text) {
  if (!text) return [];
  const hits = [];
  for (const [re, hint] of JARGON) { const m = String(text).match(re); if (m) hits.push([m[0], hint]); }
  return hits;
}
