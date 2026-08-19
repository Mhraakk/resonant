/**
 * RESONANT Canonical Mood Model
 * Friendly UI labels map to internal continuous vectors.
 */

export type MoodDimension =
  | "dark"
  | "bright"
  | "melancholic"
  | "euphoric"
  | "calm"
  | "intense"
  | "warm"
  | "cold"
  | "intimate"
  | "expansive"
  | "organic"
  | "synthetic"
  | "raw"
  | "polished"
  | "hypnotic"
  | "dynamic"
  | "aggressive"
  | "gentle"
  | "sparse"
  | "dense"
  | "nocturnal"
  | "energy";

export type MoodVector = Partial<Record<MoodDimension, number>>; // 0–1

export interface MoodPreset {
  id: string;
  label: string;
  vector: MoodVector;
  retrievalTerms: string[];
}

export const MOOD_PRESETS: Record<string, MoodPreset> = {
  nocturnal: {
    id: "nocturnal",
    label: "Nocturnal",
    vector: { dark: 0.85, energy: 0.3, intimate: 0.75, bright: 0.15, hypnotic: 0.7, calm: 0.6 },
    retrievalTerms: ["nocturnal", "late night", "midnight", "after dark", "night"],
  },
  melancholic: {
    id: "melancholic",
    label: "Melancholic",
    vector: { melancholic: 0.9, dark: 0.6, energy: 0.25, bright: 0.2, intimate: 0.7 },
    retrievalTerms: ["melancholic", "sad", "wistful", "blue", "sorrow"],
  },
  warm: {
    id: "warm",
    label: "Warm",
    vector: { warm: 0.9, organic: 0.7, intimate: 0.65, cold: 0.1, bright: 0.45 },
    retrievalTerms: ["warm", "sunny", "golden", "cozy", "analog"],
  },
  dark: {
    id: "dark",
    label: "Dark",
    vector: { dark: 0.9, bright: 0.1, melancholic: 0.55, energy: 0.4 },
    retrievalTerms: ["dark", "noir", "shadow", "black", "ominous"],
  },
  calm: {
    id: "calm",
    label: "Calm",
    vector: { calm: 0.9, energy: 0.15, intense: 0.1, sparse: 0.6, gentle: 0.8 },
    retrievalTerms: ["calm", "peaceful", "serene", "quiet", "still"],
  },
  euphoric: {
    id: "euphoric",
    label: "Euphoric",
    vector: { euphoric: 0.9, bright: 0.8, energy: 0.75, melancholic: 0.1 },
    retrievalTerms: ["euphoric", "uplifting", "joyful", "ecstatic"],
  },
  intense: {
    id: "intense",
    label: "Intense",
    vector: { intense: 0.9, energy: 0.85, dense: 0.7, calm: 0.1 },
    retrievalTerms: ["intense", "powerful", "driving", "forceful"],
  },
  organic: {
    id: "organic",
    label: "Organic",
    vector: { organic: 0.9, synthetic: 0.15, warm: 0.6, raw: 0.5 },
    retrievalTerms: ["organic", "acoustic", "natural", "live"],
  },
  hypnotic: {
    id: "hypnotic",
    label: "Hypnotic",
    vector: { hypnotic: 0.9, sparse: 0.5, dynamic: 0.3, energy: 0.4 },
    retrievalTerms: ["hypnotic", "repetitive", "trance", "loop"],
  },
  sparse: {
    id: "sparse",
    label: "Sparse",
    vector: { sparse: 0.9, dense: 0.1, calm: 0.7, intimate: 0.6 },
    retrievalTerms: ["sparse", "minimal", "empty", "space"],
  },
  aggressive: {
    id: "aggressive",
    label: "Aggressive",
    vector: { aggressive: 0.9, intense: 0.85, energy: 0.9, gentle: 0.05 },
    retrievalTerms: ["aggressive", "heavy", "harsh", "brutal"],
  },
  gentle: {
    id: "gentle",
    label: "Gentle",
    vector: { gentle: 0.9, aggressive: 0.05, calm: 0.8, intimate: 0.7 },
    retrievalTerms: ["gentle", "soft", "tender", "delicate"],
  },
  cinematic: {
    id: "cinematic",
    label: "Cinematic",
    vector: { expansive: 0.8, dark: 0.5, energy: 0.45, dense: 0.5 },
    retrievalTerms: ["cinematic", "soundtrack", "epic", "film"],
  },
};

/** Combine multiple mood presets into a single vector (max of each dimension) */
export function combineMoods(presetIds: string[]): MoodVector {
  const out: MoodVector = {};
  for (const id of presetIds) {
    const p = MOOD_PRESETS[id];
    if (!p) continue;
    for (const [k, v] of Object.entries(p.vector)) {
      const key = k as MoodDimension;
      out[key] = Math.max(out[key] ?? 0, v ?? 0);
    }
  }
  return out;
}

/** Simple mood fit score 0–1 between a requested vector and a track’s estimated mood tags */
export function moodFit(requested: MoodVector, trackMoods: string[] = [], trackEnergy?: number): number {
  if (Object.keys(requested).length === 0) return 0.5;

  let score = 0.5;
  const tags = trackMoods.map((t) => t.toLowerCase());

  // Keyword boosts
  for (const [dim, weight] of Object.entries(requested)) {
    if ((weight as number) < 0.4) continue;
    if (tags.some((t) => t.includes(dim) || dim.includes(t))) {
      score += 0.12 * (weight as number);
    }
  }

  // Energy alignment
  if (requested.energy !== undefined && trackEnergy !== undefined) {
    const delta = Math.abs(requested.energy - trackEnergy);
    score += (1 - delta) * 0.15;
  }

  // Dark / nocturnal special case
  if ((requested.dark ?? 0) > 0.7 || (requested.nocturnal ?? 0) > 0.7) {
    if (tags.some((t) => ["dark", "noir", "night", "nocturnal", "shadow", "melancholic"].includes(t))) {
      score += 0.18;
    }
  }

  // Warm special case
  if ((requested.warm ?? 0) > 0.7) {
    if (tags.some((t) => ["warm", "organic", "analog", "dusty", "soulful"].includes(t))) {
      score += 0.15;
    }
  }

  return Math.max(0, Math.min(1, score));
}

export const UI_MOOD_CHIPS = [
  "nocturnal",
  "melancholic",
  "warm",
  "dark",
  "calm",
  "euphoric",
  "intense",
  "organic",
  "hypnotic",
  "cinematic",
];
