/**
 * RESONANT Discovery Depth Engine
 *
 * Maps the 0–100 slider into concrete retrieval + ranking behavior.
 * Depth 100 is NEVER random — it still requires a musical connection
 * (shared influence, production, mood trajectory, or microgenre adjacency).
 */

import type { GenreId } from "./genre-taxonomy";
import { GENRE_TAXONOMY, genreDistance, genreAffinity } from "./genre-taxonomy";
import type { Track } from "@/types/music";

export type DepthBand =
  | "familiar"       // 0–20
  | "adjacent"       // 21–40
  | "deep"           // 41–60
  | "obscure"        // 61–80
  | "experimental";  // 81–100

export interface DepthPolicy {
  band: DepthBand;
  label: string;
  noveltyWeight: number;
  obscurityMin: number;
  minMusicalConnection: number;
  experimentalWeight: number;
  retrievalBoost: string[];
}

export function getDepthPolicy(depth: number): DepthPolicy {
  const d = Math.max(0, Math.min(100, depth));
  if (d <= 20) {
    return {
      band: "familiar",
      label: "Familiar",
      noveltyWeight: 0.15,
      obscurityMin: 0,
      minMusicalConnection: 0.55,
      experimentalWeight: 0,
      retrievalBoost: ["classic", "essential", "canonical"],
    };
  }
  if (d <= 40) {
    return {
      band: "adjacent",
      label: "Adjacent",
      noveltyWeight: 0.35,
      obscurityMin: 0.2,
      minMusicalConnection: 0.4,
      experimentalWeight: 0.1,
      retrievalBoost: ["related", "similar", "same scene"],
    };
  }
  if (d <= 60) {
    return {
      band: "deep",
      label: "Deep Discovery",
      noveltyWeight: 0.55,
      obscurityMin: 0.35,
      minMusicalConnection: 0.3,
      experimentalWeight: 0.25,
      retrievalBoost: ["deep cut", "underground", "cult"],
    };
  }
  if (d <= 80) {
    return {
      band: "obscure",
      label: "Obscure",
      noveltyWeight: 0.7,
      obscurityMin: 0.5,
      minMusicalConnection: 0.25,
      experimentalWeight: 0.4,
      retrievalBoost: ["rare", "obscure", "limited"],
    };
  }
  return {
    band: "experimental",
    label: "Experimental",
    noveltyWeight: 0.9,
    obscurityMin: 0.55,
    minMusicalConnection: 0.2,
    experimentalWeight: 0.7,
    retrievalBoost: ["experimental", "avant-garde", "leftfield"],
  };
}

export function depthFit(track: Track, policy: DepthPolicy, genres: string[]): number {
  const obscurity = track.obscurityScore ?? 0.5;
  const gAff = genreAffinity(genres, track.microgenres ?? []);
  let score = 0.5;

  // Prefer tracks near the requested obscurity band
  if (obscurity >= policy.obscurityMin) score += 0.25;
  else score -= 0.15 * (policy.obscurityMin - obscurity);

  score += gAff * policy.minMusicalConnection;
  score += (track.qualityScore ?? 0.7) * 0.1;

  if (policy.experimentalWeight > 0.3) {
    const micro = (track.microgenres ?? []).join(" ").toLowerCase();
    if (/experimental|avant|leftfield|noise|idm|glitch/.test(micro)) score += 0.15;
  }

  return Math.max(0, Math.min(1, score));
}

export function expandGenresForDepth(genres: string[], policy: DepthPolicy): string[] {
  const out = new Set(genres);
  for (const g of genres) {
    const def = GENRE_TAXONOMY[g];
    if (!def) continue;
    if (policy.band === "adjacent" || policy.band === "deep") {
      (def.adjacent ?? []).forEach((a) => out.add(a));
    }
    if (policy.band === "obscure" || policy.band === "experimental") {
      (def.adjacent ?? []).forEach((a) => out.add(a));
      (def.micro ?? []).slice(0, 4).forEach((m) => out.add(m));
    }
  }
  return Array.from(out);
}

export function depthRetrievalTerms(
  genres: string[],
  moodIds: string[],
  policy: DepthPolicy
): string[] {
  const terms = new Set<string>();
  policy.retrievalBoost.forEach((t) => terms.add(t));
  for (const g of genres) {
    const def = GENRE_TAXONOMY[g];
    if (def) {
      terms.add(def.label);
      (def.retrievalTerms ?? []).forEach((t) => terms.add(t));
    }
  }
  for (const m of moodIds) terms.add(m);
  if (policy.obscurityMin > 0.4) {
    terms.add("rare");
    terms.add("deep cut");
  }
  if (policy.experimentalWeight > 0.4) {
    terms.add("experimental");
    terms.add("avant-garde");
  }
  return Array.from(terms).slice(0, 28);
}
