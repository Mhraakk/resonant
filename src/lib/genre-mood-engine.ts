/**
 * RESONANT Genre × Mood Discovery Engine
 * Production core: taxonomy-aware, multi-query, large-pool, health-gated.
 */

import type { Track, RecommendedTrack, RecommendationReason } from "@/types/music";
import { SEED_TRACKS } from "./seed-catalog";
import {
  GENRE_TAXONOMY,
  genreAffinity,
  type GenreId,
  TOP_LEVEL_GENRES,
} from "./genre-taxonomy";
import {
  combineMoods,
  moodFit,
  MOOD_PRESETS,
  type MoodVector,
} from "./mood-model";
import { multiProviderSearch, normalizedToTrack } from "./providers";
import {
  type TasteDNA,
  dnaAffinity,
  seedDNAFromSelection,
  createEmptyDNA,
  summarizeDNA,
  updateDNAFromTrack,
} from "./taste-dna";
import {
  type SessionBrainState,
  createSessionBrain,
  observe,
  applyDecay,
  effectiveDNA,
  brainAffinity,
  summarizeBrain,
  newSession,
  type SessionSignal,
} from "./session-brain";
import {
  getDepthPolicy,
  depthFit,
  depthRetrievalTerms,
  expandGenresForDepth,
  type DepthPolicy,
} from "./discovery-depth";
import {
  type TasteMemoryState,
  createTasteMemory,
  remember,
  memoryPenalty,
  isNeverAgain,
  isArtistNeverAgain,
  summarizeMemory,
  type MemoryOutcome,
} from "./taste-memory";
import {
  createNegativeTaste,
  learnNegativeFromTrack,
  negativePenalty,
  summarizeNegative,
  type NegativeTasteState,
} from "./negative-taste";
import { assignJourneyRoles } from "./journey-engine";
import { sceneAffinity, textureFit, summarizeScenes } from "./musical-graph";

// ─── Constants ──────────────────────────────────────────────────────────────
export const TARGET_BATCH_SIZE = 20;
export const MINIMUM_ACCEPTABLE_BATCH = 10;
export const MIN_RAW_POOL = 80;
export const MAX_RETRIEVAL_ROUNDS = 5;

// Active Session Brain (Long-Term + Phase + Session)
let brain: SessionBrainState = createSessionBrain();

// Persistent Taste Memory
let memory: TasteMemoryState = createTasteMemory();

// Negative Taste Memory
let negativeTaste: NegativeTasteState = createNegativeTaste();

export function getNegativeSummary(): string {
  return summarizeNegative(negativeTaste);
}

export function getMemory(): TasteMemoryState {
  return memory;
}

export function getMemorySummary(): string {
  return summarizeMemory(memory);
}

export function getBrain(): SessionBrainState {
  return brain;
}

export function getActiveDNA(): TasteDNA {
  return effectiveDNA(brain);
}

export function setActiveDNA(dna: TasteDNA) {
  brain = { ...brain, longTerm: dna };
}

export function applySignalToDNA(
  track: Track,
  signal: "love" | "like" | "dislike" | "skip" | "complete" | "save" | "never_again"
) {
  brain = observe(brain, track, signal as SessionSignal);
  memory = remember(memory, track, signal as MemoryOutcome);
  if (signal === "dislike" || signal === "skip" || signal === "never_again") {
    negativeTaste = learnNegativeFromTrack(negativeTaste, track, signal);
  }
  return effectiveDNA(brain);
}

export function startNewSession() {
  brain = newSession(brain);
  return brain;
}

export function getBrainSummary() {
  return summarizeBrain(brain);
}

// ─── Session seen (short-term) + Taste Memory (long-term) ───────────────────
const sessionSeen = new Set<string>();
const artistSessionCount = new Map<string, number>();

export function markExposed(trackId: string, artistId?: string, track?: Track) {
  sessionSeen.add(trackId);
  if (artistId) {
    artistSessionCount.set(artistId, (artistSessionCount.get(artistId) ?? 0) + 1);
  }
  // Write to persistent Taste Memory when we have the full track
  if (track) {
    memory = remember(memory, track, "shown");
  }
}

export function markNeverAgain(trackId: string, track?: Track) {
  if (track) {
    memory = remember(memory, track, "never_again");
  }
}

export function clearSession() {
  sessionSeen.clear();
  artistSessionCount.clear();
  brain = newSession(brain);
}

export function getSessionSeenSize() {
  return sessionSeen.size;
}

// ─── Multi-query expansion (depth-aware) ────────────────────────────────────
export function expandQueries(genres: string[], moodIds: string[], discoveryDepth = 50): string[] {
  const policy = getDepthPolicy(discoveryDepth);
  const queries = new Set<string>(depthRetrievalTerms(genres, moodIds, policy));

  const moodTerms: string[] = [];
  for (const mid of moodIds) {
    const p = MOOD_PRESETS[mid];
    if (p) moodTerms.push(...p.retrievalTerms);
  }

  const expandedGenres = expandGenresForDepth(genres, policy);

  for (const g of expandedGenres) {
    const def = GENRE_TAXONOMY[g];
    if (!def) continue;
    queries.add(def.label);
    def.retrievalTerms?.forEach((t) => queries.add(t));

    for (const mt of moodTerms) {
      queries.add(`${mt} ${def.label}`);
      queries.add(`${def.label} ${mt}`);
    }
  }

  // Multi-genre bridge
  if (genres.length >= 2) {
    queries.add(genres.map((g) => GENRE_TAXONOMY[g]?.label ?? g).join(" "));
  }

  return Array.from(queries).slice(0, 24);
}

// ─── Candidate generation (multi-provider) ──────────────────────────────────
async function retrieveCandidates(
  queries: string[],
  genres: string[],
  exclude: Set<string>
): Promise<{ tracks: Track[]; providerStats: Record<string, number> }> {
  const { tracks: normalized, stats } = await multiProviderSearch(queries, {
    limitPerQuery: 25,
  });

  const tracks: Track[] = [];
  for (const n of normalized) {
    if (exclude.has(n.id) || sessionSeen.has(n.id)) continue;
    if (isNeverAgain(memory, n.id)) continue;
    if ((n.artistId && isArtistNeverAgain(memory, n.artistId))) continue;
    tracks.push(normalizedToTrack(n));
  }

  // Also guarantee internal high-affinity tracks are present
  for (const t of SEED_TRACKS) {
    if (exclude.has(t.id) || sessionSeen.has(t.id)) continue;
    if (isNeverAgain(memory, t.id)) continue;
    if ((t.artistIds ?? []).some((a) => isArtistNeverAgain(memory, a))) continue;
    if (tracks.some((x) => x.id === t.id)) continue;
    const gAff = genreAffinity(genres, t.microgenres ?? []);
    if (gAff >= 0.4) tracks.push(t);
  }

  return { tracks, providerStats: stats };
}

// ─── Ranking ────────────────────────────────────────────────────────────────
function rankCandidates(
  candidates: Track[],
  genres: string[],
  moodVector: MoodVector,
  discoveryDepth: number
): RecommendedTrack[] {
  const now = Date.now();
  const results: RecommendedTrack[] = [];
  brain = applyDecay(brain, now);
  const policy = getDepthPolicy(discoveryDepth);

  const genreRequired = genres.length > 0;
  // When user picks a genre, require real affinity — prevents Rock/Hip-Hop collapse
  const minGenreAff = genreRequired ? Math.max(0.35, policy.minMusicalConnection * 0.9) : 0;

  for (const track of candidates) {
    const gAff = genreAffinity(genres, track.microgenres ?? []);
    // Soft-penalize pure title-token matches (e.g. track titled exactly "Hip-Hop")
    let titleTokenPenalty = 0;
    if (genres.length > 0) {
      const titleNorm = (track.title ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      for (const g of genres) {
        const gNorm = g.replace(/-/g, " ");
        if (
          titleNorm === gNorm ||
          titleNorm === `the ${gNorm}` ||
          titleNorm === `real ${gNorm}` ||
          titleNorm === `${gNorm} song`
        ) {
          titleTokenPenalty = Math.max(titleTokenPenalty, 0.22);
        }
      }
    }
    const mFit = moodFit(moodVector, track.moods, track.energy ? track.energy / 100 : undefined);
    const dnaFit = brainAffinity(brain, track);
    const dFit = depthFit(track, policy, genres);

    // Hard genre gate when genres are selected
    if (genreRequired && gAff < minGenreAff) continue;

    // Depth musical-connection gate
    if (gAff < policy.minMusicalConnection && dFit < 0.15) continue;

    const obscurity = track.obscurityScore ?? 0.5;

    if (isNeverAgain(memory, track.id)) continue;
    if ((track.artistIds ?? []).some((a) => isArtistNeverAgain(memory, a))) continue;

    const artistId = track.artistIds[0] ?? track.artistNames[0];
    const artistCount = artistSessionCount.get(artistId) ?? 0;
    const artistPenalty = Math.min(0.6, artistCount * 0.2);

    const mem = memoryPenalty(memory, track, now);
    const negPen = negativePenalty(negativeTaste, track);

    // Genre is the dominant signal when user selected one
    const score =
      (genreRequired ? 0.4 : 0.22) * gAff -
      titleTokenPenalty +
      0.18 * mFit +
      0.15 * dnaFit +
      0.12 * dFit +
      0.08 * (track.qualityScore ?? 0.7) +
      0.05 * obscurity * policy.noveltyWeight +
      mem.bonus -
      artistPenalty -
      mem.penalty -
      negPen * 0.5;

    if (score < 0.12) continue;

    const reason: RecommendationReason = {
      primary:
        buildReason(genres, moodVector, gAff, mFit) +
        ` · DNA ${(dnaFit * 100).toFixed(0)}% · ${policy.label}`,
      scores: {
        tasteAffinity: dnaFit,
        contextMatch: mFit,
        obscurity,
        novelty: dFit,
      },
    };

    results.push({ track, score, reason, position: 0 });
  }

  // Prefer higher genre affinity, then score
  results.sort((a, b) => b.score - a.score);

  // Strict artist diversity: max 2 tracks per artist in a batch
  const artistCountMap = new Map<string, number>();
  const diversified: RecommendedTrack[] = [];
  for (const r of results) {
    const aid = r.track.artistIds[0] ?? r.track.artistNames[0] ?? r.track.id;
    const c = artistCountMap.get(aid) ?? 0;
    if (c >= 2) continue;
    artistCountMap.set(aid, c + 1);
    diversified.push(r);
  }
  return diversified;
}

function buildReason(genres: GenreId[], mood: MoodVector, gAff: number, mFit: number): string {
  const gLabel = genres.map((g) => GENRE_TAXONOMY[g]?.label ?? g).join(" + ");
  const moodParts = Object.entries(mood)
    .filter(([, v]) => (v as number) > 0.6)
    .map(([k]) => k)
    .slice(0, 2)
    .join(" · ");
  return `${gLabel}${moodParts ? ` · ${moodParts}` : ""} · affinity ${(gAff * 100).toFixed(0)}% · mood ${(mFit * 100).toFixed(0)}%`;
}

// ─── Health scores ──────────────────────────────────────────────────────────
export interface HealthReport {
  recommendationHealth: number;
  genreHealth: number;
  moodHealth: number;
  uniqueTracks: number;
  uniqueArtists: number;
  rawCount: number;
  finalCount: number;
  fallbackLevel: number;
}

function computeHealth(
  final: RecommendedTrack[],
  rawCount: number,
  genres: GenreId[],
  moodVector: MoodVector
): HealthReport {
  const uniqueTracks = final.length;
  const uniqueArtists = new Set(final.map((r) => r.track.artistIds[0] ?? r.track.artistNames[0])).size;
  const avgGenre =
    final.reduce((s, r) => s + genreAffinity(genres, r.track.microgenres ?? []), 0) / Math.max(1, final.length);
  const avgMood =
    final.reduce((s, r) => s + moodFit(moodVector, r.track.moods), 0) / Math.max(1, final.length);

  const recHealth =
    0.25 * Math.min(1, uniqueTracks / TARGET_BATCH_SIZE) +
    0.2 * Math.min(1, uniqueArtists / Math.max(1, uniqueTracks * 0.7)) +
    0.25 * avgGenre +
    0.2 * avgMood +
    0.1 * Math.min(1, rawCount / MIN_RAW_POOL);

  return {
    recommendationHealth: recHealth,
    genreHealth: avgGenre,
    moodHealth: avgMood,
    uniqueTracks,
    uniqueArtists,
    rawCount,
    finalCount: final.length,
    fallbackLevel: 0,
  };
}

// ─── Main entry ─────────────────────────────────────────────────────────────
export interface GenreMoodRequest {
  genres: string[];
  moods: string[];
  discoveryDepth?: number; // 0–100
  limit?: number;
  excludeIds?: string[];
  requestId?: string;
}

export interface GenreMoodResponse {
  requestId: string;
  selectedGenres: string[];
  selectedMoods: string[];
  recommendations: RecommendedTrack[];
  health: HealthReport;
  queries: string[];
  hasMore: boolean;
  fallbackLevel: number;
  dnaSummary: string;
  dnaConfidence: number;
  stats: {
    raw: number;
    afterGenre: number;
    afterMood: number;
    afterExposure: number;
    ranked: number;
  };
}

export async function generateGenreMoodRecommendations(req: GenreMoodRequest): Promise<GenreMoodResponse> {
  const requestId = req.requestId ?? `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const genres = req.genres.length ? req.genres : ["electronic"];
  const moods = req.moods;
  const depth = req.discoveryDepth ?? 50;
  const limit = req.limit ?? TARGET_BATCH_SIZE;
  const exclude = new Set([...(req.excludeIds ?? []), ...sessionSeen]);

  // Seed long-term DNA from Genre × Mood when still young
  if (brain.longTerm.signalCount < 5) {
    brain = { ...brain, longTerm: seedDNAFromSelection(genres, moods, depth) };
  }

  let fallbackLevel = 0;
  let raw: Track[] = [];
  let queries: string[] = [];
  let providerStats: Record<string, number> = {};

  // Multi-round retrieval with soft relaxation + live providers
  for (let round = 0; round < MAX_RETRIEVAL_ROUNDS; round++) {
    const effectiveDepth = Math.min(100, depth + round * 15);
    queries = expandQueries(genres, moods, effectiveDepth);
    const result = await retrieveCandidates(queries, genres, exclude);
    raw = result.tracks;
    providerStats = result.providerStats;

    if (raw.length >= MIN_RAW_POOL || round === MAX_RETRIEVAL_ROUNDS - 1) break;
    fallbackLevel = round + 1;
  }

  const moodVector = combineMoods(moods);
  let ranked = rankCandidates(raw, genres, moodVector, depth);

  // Soft relaxation if too few
  if (ranked.length < MINIMUM_ACCEPTABLE_BATCH && fallbackLevel < 4) {
    // broaden by dropping hard genre filter threshold
    const broader = rankCandidates(raw, genres, moodVector, Math.min(100, depth + 30));
    if (broader.length > ranked.length) {
      ranked = broader;
      fallbackLevel = Math.max(fallbackLevel, 3);
    }
  }

  const sliced = ranked.slice(0, limit).map((r, i) => ({ ...r, position: i + 1 }));
  const final = assignJourneyRoles(sliced, moods);

  // Mark exposure
  for (const r of final) {
    markExposed(r.track.id, r.track.artistIds[0], r.track);
  }

  const health = computeHealth(final, raw.length, genres, moodVector);
  health.fallbackLevel = fallbackLevel;

  // Health gate: if critically low, still return but flag
  if (health.recommendationHealth < 0.25 && final.length < 5) {
    // last-resort: return highest quality remaining
    const emergency = SEED_TRACKS.filter((t) => !exclude.has(t.id) && !sessionSeen.has(t.id))
      .map((t) => ({ t, g: genreAffinity(genres, t.microgenres ?? []) }))
      .sort((a, b) => b.g - a.g || (b.t.qualityScore ?? 0) - (a.t.qualityScore ?? 0))
      .slice(0, limit)
      .map(({ t: track, g }, i) => ({
        track,
        score: 0.25 + g * 0.3,
        reason: { primary: `Emergency genre-aware fallback · affinity ${(g * 100).toFixed(0)}%` },
        position: i + 1,
      }));
    return {
      requestId,
      selectedGenres: genres,
      selectedMoods: moods,
      recommendations: emergency,
      health: { ...health, finalCount: emergency.length, fallbackLevel: 5 },
      queries,
      hasMore: true,
      fallbackLevel: 5,
      dnaSummary: summarizeDNA(effectiveDNA(brain)) + " · " + summarizeBrain(brain) + " · " + summarizeMemory(memory),
      dnaConfidence: effectiveDNA(brain).overallConfidence,
      stats: {
        raw: raw.length,
        afterGenre: raw.length,
        afterMood: ranked.length,
        afterExposure: ranked.length,
        ranked: ranked.length,
      },
    };
  }

  return {
    requestId,
    selectedGenres: genres,
    selectedMoods: moods,
    recommendations: final,
    health,
    queries,
    hasMore: ranked.length > limit,
    fallbackLevel,
    dnaSummary: summarizeDNA(effectiveDNA(brain)) + " · " + summarizeBrain(brain) + " · " + summarizeMemory(memory),
    dnaConfidence: effectiveDNA(brain).overallConfidence,
    stats: {
      raw: raw.length,
      afterGenre: raw.length,
      afterMood: ranked.length,
      afterExposure: ranked.length,
      ranked: ranked.length,
    },
  };
}

// ─── Convenience for UI ─────────────────────────────────────────────────────
export function getTopLevelGenreOptions() {
  return TOP_LEVEL_GENRES.map((id) => ({
    id,
    label: GENRE_TAXONOMY[id]?.label ?? id,
  }));
}
