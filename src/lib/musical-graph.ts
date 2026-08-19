/**
 * Milestone 7–9 — Musical Graph + Scene/Era + Production Texture
 *
 * Graph edges: influence, stylistic_neighbor, same_scene, same_era,
 * same_production, shared_label, sampled.
 */

import type { Track } from "@/types/music";
import { GENRE_TAXONOMY, normalizeGenre } from "./genre-taxonomy";

export interface GraphNode {
  id: string;
  type: "track" | "artist" | "genre" | "scene" | "era" | "texture";
  label: string;
}

export interface GraphEdge {
  from: string;
  to: string;
  relation:
    | "influence"
    | "stylistic_neighbor"
    | "same_scene"
    | "same_era"
    | "same_production"
    | "shared_microgenre"
    | "mood_bridge";
  weight: number;
}

export interface SceneDefinition {
  id: string;
  label: string;
  era: string;
  location?: string;
  genres: string[];
  textures: string[];
  keywords: string[];
}

export const SCENES: SceneDefinition[] = [
  { id: "bristol-90s", label: "Bristol 1990s", era: "1990s", location: "Bristol", genres: ["trip-hop", "downtempo"], textures: ["dusty", "smoky", "cinematic"], keywords: ["bristol", "massiv", "portishead", "tricky"] },
  { id: "detroit-techno", label: "Detroit Techno", era: "1980s", location: "Detroit", genres: ["techno", "electro"], textures: ["synthetic", "raw"], keywords: ["detroit", "techno", "underground resistance"] },
  { id: "berlin-dub", label: "Berlin Dub Techno", era: "1990s", location: "Berlin", genres: ["dub-techno", "minimal"], textures: ["dub", "sparse", "analog"], keywords: ["basic channel", "rhythm & sound", "dub techno"] },
  { id: "ecm-jazz", label: "ECM Jazz", era: "1970s", location: "Europe", genres: ["jazz", "contemporary-jazz"], textures: ["spacious", "acoustic", "reverb"], keywords: ["ecm", "jarrett", "garbarek"] },
  { id: "manchester-postpunk", label: "Manchester Post-Punk", era: "1970s", location: "Manchester", genres: ["post-punk", "new-wave"], textures: ["angular", "raw"], keywords: ["joy division", "factory", "manchester"] },
  { id: "tokyo-citypop", label: "Tokyo City Pop", era: "1980s", location: "Tokyo", genres: ["city-pop", "funk", "soul"], textures: ["polished", "warm"], keywords: ["city pop", "tokyo", "tatsuro"] },
  { id: "uk-bass", label: "UK Bass / Garage", era: "2000s", location: "London", genres: ["uk-garage", "dubstep", "future-garage"], textures: ["vinyl", "rain", "broken"], keywords: ["burial", "uk garage", "dubstep"] },
  { id: "spiritual-jazz", label: "Spiritual Jazz Continuum", era: "1960s", location: "USA", genres: ["spiritual-jazz", "free-jazz"], textures: ["acoustic", "expansive"], keywords: ["coltrane", "sanders", "alice coltrane", "spiritual"] },
];

export const PRODUCTION_TEXTURES = [
  "tape", "analog", "digital", "lo-fi", "dusty", "vinyl", "reverb", "dry",
  "wide", "intimate", "broken-drums", "warm-rhodes", "deep-bass", "sparse",
  "dense", "organic", "synthetic", "cinematic", "smoky", "raw", "polished",
] as const;

export type ProductionTexture = (typeof PRODUCTION_TEXTURES)[number];

/** Infer scene affinity for a track */
export function sceneAffinity(track: Track): { sceneId: string; score: number }[] {
  const text = [
    track.title,
    ...(track.artistNames ?? []),
    ...(track.microgenres ?? []),
    ...(track.moods ?? []),
    ...(track.textures ?? []),
  ].join(" ").toLowerCase();

  return SCENES.map((s) => {
    let score = 0;
    for (const kw of s.keywords) {
      if (text.includes(kw)) score += 0.35;
    }
    for (const g of s.genres) {
      if ((track.microgenres ?? []).some((m) => m.includes(g) || g.includes(m))) score += 0.3;
    }
    for (const t of s.textures) {
      if ((track.textures ?? []).some((x) => x.includes(t))) score += 0.2;
    }
    if (track.year) {
      const decade = `${Math.floor(track.year / 10) * 10}s`;
      if (s.era.startsWith(decade.slice(0, 3))) score += 0.15;
    }
    return { sceneId: s.id, score: Math.min(1, score) };
  })
    .filter((x) => x.score > 0.15)
    .sort((a, b) => b.score - a.score);
}

/** Production texture match 0–1 */
export function textureFit(track: Track, wanted: string[]): number {
  if (!wanted.length) return 0.5;
  const have = new Set([
    ...(track.textures ?? []).map((t) => t.toLowerCase()),
    ...(track.instruments ?? []).map((i) => i.toLowerCase()),
  ]);
  let hits = 0;
  for (const w of wanted) {
    const wl = w.toLowerCase();
    if ([...have].some((h) => h.includes(wl) || wl.includes(h))) hits += 1;
  }
  return hits / wanted.length;
}

/** Same-feeling / different-genre bridge score */
export function moodBridgeScore(a: Track, b: Track): number {
  const moodsA = new Set((a.moods ?? []).map((m) => m.toLowerCase()));
  const moodsB = new Set((b.moods ?? []).map((m) => m.toLowerCase()));
  if (!moodsA.size || !moodsB.size) return 0;
  let shared = 0;
  for (const m of moodsA) if (moodsB.has(m)) shared += 1;
  const moodSim = shared / Math.max(moodsA.size, moodsB.size);

  const genresA = new Set((a.microgenres ?? []).map((g) => normalizeGenre(g) || g));
  const genresB = new Set((b.microgenres ?? []).map((g) => normalizeGenre(g) || g));
  let genreOverlap = 0;
  for (const g of genresA) if (genresB.has(g)) genreOverlap += 1;
  const genreDiff = 1 - genreOverlap / Math.max(1, Math.max(genresA.size, genresB.size));

  // High when mood similar AND genre different
  return moodSim * 0.7 + genreDiff * 0.3;
}

/** Build simple neighbor list for a seed track from a catalog */
export function graphNeighbors(
  seed: Track,
  catalog: Track[],
  limit = 8
): Array<{ track: Track; relation: string; weight: number }> {
  const results: Array<{ track: Track; relation: string; weight: number }> = [];

  for (const t of catalog) {
    if (t.id === seed.id) continue;
    let bestRel = "stylistic_neighbor";
    let weight = 0;

    // Shared microgenre
    const sharedG = (seed.microgenres ?? []).filter((g) =>
      (t.microgenres ?? []).some((x) => x.includes(g) || g.includes(x))
    );
    if (sharedG.length) {
      weight = Math.max(weight, 0.4 + sharedG.length * 0.15);
      bestRel = "shared_microgenre";
    }

    // Mood bridge
    const mb = moodBridgeScore(seed, t);
    if (mb > 0.45) {
      weight = Math.max(weight, mb);
      bestRel = "mood_bridge";
    }

    // Same era
    if (seed.year && t.year && Math.abs(seed.year - t.year) <= 6) {
      weight = Math.max(weight, 0.35);
      bestRel = weight > 0.45 ? bestRel : "same_era";
    }

    // Scene
    const scenesSeed = sceneAffinity(seed);
    const scenesT = sceneAffinity(t);
    if (scenesSeed[0] && scenesT[0] && scenesSeed[0].sceneId === scenesT[0].sceneId) {
      weight = Math.max(weight, 0.5 + scenesSeed[0].score * 0.2);
      bestRel = "same_scene";
    }

    // Texture
    const texShared = (seed.textures ?? []).filter((x) =>
      (t.textures ?? []).some((y) => y.includes(x) || x.includes(y))
    );
    if (texShared.length) {
      weight = Math.max(weight, 0.3 + texShared.length * 0.1);
      if (weight > 0.5) bestRel = "same_production";
    }

    if (weight > 0.3) results.push({ track: t, relation: bestRel, weight });
  }

  return results.sort((a, b) => b.weight - a.weight).slice(0, limit);
}

export function summarizeScenes(track: Track): string {
  const top = sceneAffinity(track).slice(0, 2);
  if (!top.length) return "scene: —";
  return "scene: " + top.map((s) => {
    const def = SCENES.find((x) => x.id === s.sceneId);
    return `${def?.label ?? s.sceneId} ${(s.score * 100).toFixed(0)}%`;
  }).join(", ");
}
