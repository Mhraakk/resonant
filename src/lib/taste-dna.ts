/**
 * RESONANT Taste DNA 2.0
 * Multi-dimensional personalization profile that goes far beyond Genre × Mood.
 *
 * Dimensions:
 * Genre / Microgenre / Mood / Era / Scene / Production / Instrumentation /
 * Vocal Style / Energy / Obscurity / Experimentalism / Warmth / Density
 */

import type { Track } from "@/types/music";
import { normalizeGenre, genreAffinity, type GenreId } from "./genre-taxonomy";
import { combineMoods, moodFit, type MoodVector } from "./mood-model";

// ─── Dimension definitions ──────────────────────────────────────────────────

export type DNADimension =
  | "dark"
  | "bright"
  | "warm"
  | "cold"
  | "organic"
  | "synthetic"
  | "energy"
  | "calm"
  | "dense"
  | "sparse"
  | "intimate"
  | "expansive"
  | "melancholic"
  | "euphoric"
  | "hypnotic"
  | "dynamic"
  | "raw"
  | "polished"
  | "obscurity"
  | "experimentalism"
  | "vocal_presence"
  | "female_vocals"
  | "male_vocals"
  | "instrumental"
  | "analog"
  | "digital"
  | "tape"
  | "reverb"
  | "bass_weight"
  | "jazz_harmony"
  | "broken_rhythm"
  | "cinematic";

export const DNA_DIMENSIONS: DNADimension[] = [
  "dark", "bright", "warm", "cold", "organic", "synthetic",
  "energy", "calm", "dense", "sparse", "intimate", "expansive",
  "melancholic", "euphoric", "hypnotic", "dynamic", "raw", "polished",
  "obscurity", "experimentalism", "vocal_presence", "female_vocals",
  "male_vocals", "instrumental", "analog", "digital", "tape", "reverb",
  "bass_weight", "jazz_harmony", "broken_rhythm", "cinematic",
];

export type DNAVector = Record<DNADimension, number>; // 0–1

export interface GenreAffinityMap {
  [genreId: string]: { affinity: number; confidence: number; evidence: number };
}

export interface EraAffinity {
  decade: string; // "1960s" | "1970s" | ...
  affinity: number;
  confidence: number;
}

export interface SceneAffinity {
  sceneId: string;
  label: string;
  affinity: number;
  confidence: number;
}

export interface TasteDNA {
  userId: string;
  version: number;
  /** Continuous multi-dimensional taste vector */
  vector: DNAVector;
  /** Genre affinities with confidence */
  genres: GenreAffinityMap;
  /** Preferred eras */
  eras: EraAffinity[];
  /** Scene affinities */
  scenes: SceneAffinity[];
  /** Hard exclusions */
  neverAgainTrackIds: string[];
  neverAgainArtistIds: string[];
  blockedGenres: string[];
  /** Soft negative preferences (e.g. "likes electronic but not polished") */
  contradictions: Array<{
    positive: string;
    negative: string;
    strength: number;
  }>;
  /** Confidence that we understand this user overall */
  overallConfidence: number;
  /** Where we are most uncertain */
  uncertaintyHotspots: string[];
  createdAt: string;
  updatedAt: string;
  signalCount: number;
}

// ─── Default / empty DNA ────────────────────────────────────────────────────

export function createEmptyDNA(userId = "default"): TasteDNA {
  const vector = {} as DNAVector;
  for (const d of DNA_DIMENSIONS) vector[d] = 0.5; // neutral start
  return {
    userId,
    version: 1,
    vector,
    genres: {},
    eras: [],
    scenes: [],
    neverAgainTrackIds: [],
    neverAgainArtistIds: [],
    blockedGenres: [],
    contradictions: [],
    overallConfidence: 0.1,
    uncertaintyHotspots: ["all"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    signalCount: 0,
  };
}

// ─── Infer DNA features from a track ────────────────────────────────────────

export function inferTrackDNA(track: Track): Partial<DNAVector> {
  const v: Partial<DNAVector> = {};
  const moods = (track.moods ?? []).map((m) => m.toLowerCase());
  const micros = (track.microgenres ?? []).map((m) => m.toLowerCase());
  const textures = (track.textures ?? []).map((t) => t.toLowerCase());
  const instruments = (track.instruments ?? []).map((i) => i.toLowerCase());

  // Moods
  if (moods.some((m) => ["dark", "noir", "nocturnal", "shadow"].includes(m))) v.dark = 0.85;
  if (moods.some((m) => ["bright", "sunny", "uplifting"].includes(m))) v.bright = 0.8;
  if (moods.some((m) => ["warm", "golden", "cozy", "analog"].includes(m))) v.warm = 0.85;
  if (moods.some((m) => ["cold", "arctic", "icy"].includes(m))) v.cold = 0.8;
  if (moods.some((m) => ["melancholic", "sad", "wistful", "blue"].includes(m))) v.melancholic = 0.9;
  if (moods.some((m) => ["euphoric", "joyful", "ecstatic"].includes(m))) v.euphoric = 0.85;
  if (moods.some((m) => ["calm", "peaceful", "serene", "still"].includes(m))) v.calm = 0.85;
  if (moods.some((m) => ["intense", "powerful", "driving"].includes(m))) v.energy = 0.85;
  if (moods.some((m) => ["hypnotic", "trance", "repetitive"].includes(m))) v.hypnotic = 0.9;
  if (moods.some((m) => ["intimate", "close", "personal"].includes(m))) v.intimate = 0.85;
  if (moods.some((m) => ["expansive", "cinematic", "epic", "wide"].includes(m))) {
    v.expansive = 0.85;
    v.cinematic = 0.8;
  }
  if (moods.some((m) => ["spiritual", "sacred"].includes(m))) v.expansive = Math.max(v.expansive ?? 0, 0.7);

  // Textures / production
  if (textures.some((t) => ["organic", "acoustic", "natural", "live"].includes(t))) v.organic = 0.9;
  if (textures.some((t) => ["digital", "synthetic", "electronic"].includes(t))) v.synthetic = 0.8;
  if (textures.some((t) => ["dusty", "vinyl", "tape", "analog", "warm"].includes(t))) {
    v.analog = 0.85;
    v.tape = 0.7;
    v.warm = Math.max(v.warm ?? 0, 0.7);
  }
  if (textures.some((t) => ["reverb", "space", "echo", "gauze"].includes(t))) v.reverb = 0.85;
  if (textures.some((t) => ["sparse", "minimal", "empty"].includes(t))) v.sparse = 0.85;
  if (textures.some((t) => ["dense", "wall", "thick"].includes(t))) v.dense = 0.85;
  if (textures.some((t) => ["raw", "lo-fi", "gritty"].includes(t))) v.raw = 0.8;
  if (textures.some((t) => ["polished", "clean", "glossy"].includes(t))) v.polished = 0.8;
  if (textures.some((t) => ["dub", "bass"].includes(t))) v.bass_weight = 0.75;

  // Instruments
  if (instruments.some((i) => ["sax", "trumpet", "piano", "rhodes", "upright", "double bass"].includes(i))) {
    v.jazz_harmony = 0.8;
  }
  if (instruments.some((i) => ["vocals", "voice", "singer"].includes(i))) v.vocal_presence = 0.85;
  if (instruments.length > 0 && !instruments.some((i) => i.includes("vocal"))) v.instrumental = 0.7;

  // Microgenres
  if (micros.some((m) => m.includes("jazz"))) v.jazz_harmony = Math.max(v.jazz_harmony ?? 0, 0.75);
  if (micros.some((m) => m.includes("trip-hop") || m.includes("break"))) v.broken_rhythm = 0.8;
  if (micros.some((m) => m.includes("ambient") || m.includes("drone"))) {
    v.sparse = Math.max(v.sparse ?? 0, 0.7);
    v.calm = Math.max(v.calm ?? 0, 0.6);
  }
  if (micros.some((m) => m.includes("experimental") || m.includes("avant") || m.includes("idm"))) {
    v.experimentalism = 0.85;
  }

  // Explicit scores from track
  if (track.obscurityScore !== undefined) v.obscurity = track.obscurityScore;
  if (track.energy !== undefined) v.energy = track.energy / 100;
  if (track.bpm) {
    if (track.bpm < 80) v.calm = Math.max(v.calm ?? 0, 0.65);
    if (track.bpm > 130) v.energy = Math.max(v.energy ?? 0, 0.7);
  }

  return v;
}

// ─── Update DNA from a signal ───────────────────────────────────────────────

export type DNASignalType = "love" | "like" | "dislike" | "skip" | "complete" | "save" | "never_again";

export function updateDNAFromTrack(
  dna: TasteDNA,
  track: Track,
  signal: DNASignalType,
  weight = 1
): TasteDNA {
  const inferred = inferTrackDNA(track);
  const learningRate = signal === "love" ? 0.18 * weight
    : signal === "like" || signal === "save" || signal === "complete" ? 0.1 * weight
    : signal === "dislike" || signal === "skip" ? -0.12 * weight
    : signal === "never_again" ? -0.3 * weight
    : 0.05 * weight;

  const nextVector = { ...dna.vector };
  for (const [dim, val] of Object.entries(inferred)) {
    const key = dim as DNADimension;
    const current = nextVector[key] ?? 0.5;
    // Move toward (or away from) the inferred value
    nextVector[key] = Math.max(0, Math.min(1, current + learningRate * ((val as number) - current)));
  }

  // Genre affinities
  const nextGenres = { ...dna.genres };
  for (const raw of track.microgenres ?? []) {
    const id = normalizeGenre(raw) || raw;
    const prev = nextGenres[id] ?? { affinity: 0.5, confidence: 0.1, evidence: 0 };
    const delta = learningRate > 0 ? 0.12 : -0.15;
    nextGenres[id] = {
      affinity: Math.max(0, Math.min(1, prev.affinity + delta * weight)),
      confidence: Math.min(1, prev.confidence + 0.08),
      evidence: prev.evidence + 1,
    };
  }

  // Never-again
  let neverTracks = [...dna.neverAgainTrackIds];
  let neverArtists = [...dna.neverAgainArtistIds];
  if (signal === "never_again") {
    neverTracks = Array.from(new Set([...neverTracks, track.id]));
    if (track.artistIds[0]) neverArtists = Array.from(new Set([...neverArtists, track.artistIds[0]]));
  }

  // Era
  const nextEras = [...dna.eras];
  if (track.year) {
    const decade = `${Math.floor(track.year / 10) * 10}s`;
    const existing = nextEras.find((e) => e.decade === decade);
    if (existing) {
      existing.affinity = Math.max(0, Math.min(1, existing.affinity + learningRate * 0.5));
      existing.confidence = Math.min(1, existing.confidence + 0.05);
    } else if (learningRate > 0) {
      nextEras.push({ decade, affinity: 0.55 + learningRate, confidence: 0.2 });
    }
  }

  const signalCount = dna.signalCount + 1;
  const overallConfidence = Math.min(0.95, 0.1 + signalCount * 0.04);

  // Uncertainty hotspots = dimensions still near 0.5 with low evidence
  const uncertaintyHotspots = DNA_DIMENSIONS.filter((d) => {
    const v = nextVector[d];
    return v > 0.4 && v < 0.6;
  }).slice(0, 6);

  return {
    ...dna,
    vector: nextVector,
    genres: nextGenres,
    eras: nextEras,
    neverAgainTrackIds: neverTracks,
    neverAgainArtistIds: neverArtists,
    overallConfidence,
    uncertaintyHotspots,
    updatedAt: new Date().toISOString(),
    signalCount,
    version: dna.version + 1,
  };
}

// ─── Score a track against Taste DNA ────────────────────────────────────────

export function dnaAffinity(dna: TasteDNA, track: Track): number {
  // Hard exclusions
  if (dna.neverAgainTrackIds.includes(track.id)) return 0;
  if (track.artistIds.some((a) => dna.neverAgainArtistIds.includes(a))) return 0;

  const inferred = inferTrackDNA(track);
  let score = 0;
  let weightSum = 0;

  for (const [dim, trackVal] of Object.entries(inferred)) {
    const key = dim as DNADimension;
    const userVal = dna.vector[key] ?? 0.5;
    // Similarity: 1 - absolute difference
    const sim = 1 - Math.abs(userVal - (trackVal as number));
    // Weight dimensions the user has strong opinions about more heavily
    const opinionStrength = Math.abs(userVal - 0.5) * 2; // 0 at neutral, 1 at extreme
    const w = 0.5 + opinionStrength;
    score += sim * w;
    weightSum += w;
  }

  // Genre affinity boost
  let genreBoost = 0;
  for (const raw of track.microgenres ?? []) {
    const id = normalizeGenre(raw) || raw;
    const g = dna.genres[id];
    if (g) genreBoost = Math.max(genreBoost, g.affinity * g.confidence);
  }

  const base = weightSum > 0 ? score / weightSum : 0.5;
  return Math.max(0, Math.min(1, 0.65 * base + 0.35 * genreBoost));
}

// ─── Human-readable summary of DNA ──────────────────────────────────────────

export function summarizeDNA(dna: TasteDNA): string {
  const strong = DNA_DIMENSIONS
    .map((d) => ({ dim: d, val: dna.vector[d] ?? 0.5 }))
    .filter((x) => x.val > 0.65 || x.val < 0.35)
    .sort((a, b) => Math.abs(b.val - 0.5) - Math.abs(a.val - 0.5))
    .slice(0, 8)
    .map((x) => (x.val > 0.5 ? x.dim : `anti-${x.dim}`));

  const topGenres = Object.entries(dna.genres)
    .filter(([, v]) => v.affinity > 0.6)
    .sort((a, b) => b[1].affinity - a[1].affinity)
    .slice(0, 4)
    .map(([id]) => id);

  const parts = [];
  if (strong.length) parts.push(strong.join(" · "));
  if (topGenres.length) parts.push(`genres: ${topGenres.join(", ")}`);
  parts.push(`confidence ${(dna.overallConfidence * 100).toFixed(0)}%`);
  return parts.join(" | ");
}

// ─── Seed a DNA from initial Genre × Mood selection ─────────────────────────

export function seedDNAFromSelection(
  genres: string[],
  moodIds: string[],
  discoveryDepth = 50
): TasteDNA {
  const dna = createEmptyDNA();
  const moodVec = combineMoods(moodIds);

  // Map mood vector into DNA
  for (const [k, v] of Object.entries(moodVec)) {
    if (k in dna.vector) dna.vector[k as DNADimension] = v as number;
  }

  // Boost selected genres
  for (const g of genres) {
    dna.genres[g] = { affinity: 0.85, confidence: 0.6, evidence: 3 };
  }

  // Discovery depth → obscurity + experimentalism
  dna.vector.obscurity = discoveryDepth / 100;
  dna.vector.experimentalism = Math.max(0.2, (discoveryDepth - 30) / 100);

  dna.overallConfidence = 0.35;
  dna.signalCount = 3;
  dna.updatedAt = new Date().toISOString();
  return dna;
}
