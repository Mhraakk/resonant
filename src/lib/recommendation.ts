/**
 * RESONANT Recommendation Engine (bootstrap layer)
 * Layered retrieval + scoring. Uses seed catalog until full graph + vector store is live.
 * Never returns empty. Always produces recoverable results.
 */

import type {
  RecommendedTrack,
  RecommendationReason,
  TasteZone,
  Track,
  TasteProfile,
} from "@/types/music";
import { SEED_TRACKS } from "./seed-catalog";
import { TASTE_ZONES } from "./taste-zones";

const DEFAULT_WEIGHTS = {
  tasteAffinity: 0.24,
  semanticSimilarity: 0.16,
  graphProximity: 0.14,
  contextMatch: 0.12,
  obscurity: 0.1,
  novelty: 0.1,
  historicalAffinity: 0.08,
  explorationPotential: 0.06,
};

export interface RecRequest {
  zones?: TasteZone[];
  context?: string;
  limit?: number;
  excludeIds?: string[];
  seedTrackId?: string;
  novelty?: number;
  obscurityMin?: number;
  bpmRange?: [number, number];
  prompt?: string;
}

function scoreTrack(
  track: Track,
  req: RecRequest
): { score: number; reason: RecommendationReason } {
  let tasteAffinity = 0.5;
  if (req.zones && track.microgenres) {
    const zoneMatches = req.zones.filter((z) => {
      const def = TASTE_ZONES[z];
      return track.microgenres!.some(
        (m) =>
          def.microgenres.some((mg) => m.toLowerCase().includes(mg.toLowerCase())) ||
          m.toLowerCase().includes(z.replace("_", " "))
      );
    });
    tasteAffinity = zoneMatches.length > 0 ? 0.7 + 0.2 * (zoneMatches.length / req.zones.length) : 0.3;
  }

  const obscurity = track.obscurityScore ?? 0.5;
  const novelty = req.novelty ?? 0.6;
  const obscurityScore = obscurity * (req.obscurityMin ? (obscurity >= req.obscurityMin ? 1 : 0.4) : 1);

  let bpmMatch = 1;
  if (req.bpmRange && track.bpm) {
    const [lo, hi] = req.bpmRange;
    bpmMatch = track.bpm >= lo && track.bpm <= hi ? 1 : 0.3;
  }

  const quality = track.qualityScore ?? 0.7;

  const score =
    DEFAULT_WEIGHTS.tasteAffinity * tasteAffinity +
    DEFAULT_WEIGHTS.obscurity * obscurityScore +
    DEFAULT_WEIGHTS.novelty * novelty +
    0.15 * quality +
    0.1 * bpmMatch;

  const primaryZone = req.zones?.[0] ? TASTE_ZONES[req.zones[0]].shortLabel : "taste";
  const reason: RecommendationReason = {
    primary: `Fits ${primaryZone} — warm production, emotional depth, and high repeat-listen potential`,
    details:
      track.obscurityScore && track.obscurityScore > 0.6
        ? "Selected for obscurity bias and underground character."
        : "Canonical but justified by core atmosphere match.",
    scores: {
      tasteAffinity,
      obscurity: obscurityScore,
      novelty,
      qualityConfidence: quality,
    },
  };

  return { score, reason };
}

export function generateRecommendations(req: RecRequest = {}): RecommendedTrack[] {
  const limit = req.limit ?? 12;
  const exclude = new Set(req.excludeIds ?? []);

  let candidates = SEED_TRACKS.filter((t) => !exclude.has(t.id));

  if (req.zones && req.zones.length > 0) {
    const zoneFiltered = candidates.filter((t) => {
      if (!t.microgenres) return false;
      return req.zones!.some((z) => {
        const def = TASTE_ZONES[z];
        return t.microgenres!.some((m) =>
          def.microgenres.some((mg) => m.toLowerCase().includes(mg.toLowerCase().split(" ")[0]))
        );
      });
    });
    if (zoneFiltered.length >= 3) candidates = zoneFiltered;
  }

  if (req.bpmRange) {
    const [lo, hi] = req.bpmRange;
    const bpmFiltered = candidates.filter((t) => t.bpm && t.bpm >= lo && t.bpm <= hi);
    if (bpmFiltered.length >= 2) candidates = bpmFiltered;
  }

  if (req.obscurityMin !== undefined) {
    const obs = candidates.filter((t) => (t.obscurityScore ?? 0) >= req.obscurityMin!);
    if (obs.length >= 2) candidates = obs;
  }

  const scored = candidates.map((track) => {
    const { score, reason } = scoreTrack(track, req);
    return { track, score, reason };
  });

  scored.sort((a, b) => b.score - a.score);

  const seenArtists = new Set<string>();
  const diversified: typeof scored = [];
  for (const item of scored) {
    const primaryArtist = item.track.artistIds[0];
    if (seenArtists.has(primaryArtist) && diversified.length > 2) continue;
    seenArtists.add(primaryArtist);
    diversified.push(item);
    if (diversified.length >= limit) break;
  }

  if (diversified.length === 0) {
    return SEED_TRACKS.filter((t) => !exclude.has(t.id))
      .sort((a, b) => (b.qualityScore ?? 0) - (a.qualityScore ?? 0))
      .slice(0, limit)
      .map((track, i) => ({
        track,
        score: 0.5,
        reason: {
          primary: "Editorial fallback — high quality material aligned with core listening philosophy",
        } as RecommendationReason,
        position: i + 1,
      }));
  }

  return diversified.map((item, i) => ({
    ...item,
    position: i + 1,
  }));
}

export function recommendForZone(zone: TasteZone, limit = 8): RecommendedTrack[] {
  const def = TASTE_ZONES[zone];
  return generateRecommendations({
    zones: [zone],
    bpmRange: def.bpmRange,
    limit,
    obscurityMin: 0.3,
    novelty: 0.65,
  });
}

export function recommendJourney(zones: TasteZone[], tracksPerZone = 3): RecommendedTrack[] {
  const result: RecommendedTrack[] = [];
  const used = new Set<string>();
  for (const z of zones) {
    const recs = generateRecommendations({
      zones: [z],
      limit: tracksPerZone + 2,
      excludeIds: Array.from(used),
    });
    for (const r of recs.slice(0, tracksPerZone)) {
      result.push({ ...r, position: result.length + 1 });
      used.add(r.track.id);
    }
  }
  return result;
}
