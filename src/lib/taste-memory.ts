/**
 * RESONANT Taste Memory
 *
 * Persistent, decaying memory of everything the listener has experienced.
 * Answers:
 *   - Have I heard this?
 *   - How recently?
 *   - Did I love / complete / skip / reject it?
 *   - How strongly does this artist / genre still matter?
 *   - What is still fresh vs fatigued?
 *
 * Memory decays so old favorites can gently return, while recent plays
 * stay suppressed. Never-again is permanent.
 */

import type { Track } from "@/types/music";
import { normalizeGenre } from "./genre-taxonomy";

// ─── Types ──────────────────────────────────────────────────────────────────

export type MemoryOutcome =
  | "shown"
  | "play"
  | "complete"
  | "love"
  | "like"
  | "save"
  | "skip"
  | "dislike"
  | "never_again";

export interface TrackMemory {
  trackId: string;
  artistIds: string[];
  genres: string[];
  firstSeenAt: number;
  lastSeenAt: number;
  showCount: number;
  playCount: number;
  completeCount: number;
  loveCount: number;
  likeCount: number;
  skipCount: number;
  dislikeCount: number;
  neverAgain: boolean;
  affinity: number;
  fatigue: number;
}

export interface ArtistMemory {
  artistId: string;
  name?: string;
  trackIds: string[];
  playCount: number;
  loveCount: number;
  lastSeenAt: number;
  affinity: number;
  fatigue: number;
  neverAgain: boolean;
}

export interface GenreMemory {
  genreId: string;
  playCount: number;
  loveCount: number;
  lastSeenAt: number;
  affinity: number;
}

export interface TasteMemoryState {
  tracks: Map<string, TrackMemory>;
  artists: Map<string, ArtistMemory>;
  genres: Map<string, GenreMemory>;
  recentTrackIds: string[];
  totalSignals: number;
  createdAt: number;
  updatedAt: number;
}

const AFFINITY_HALF_LIFE_DAYS = 21;
const FATIGUE_HALF_LIFE_HOURS = 18;
const MAX_RECENT = 200;

export function createTasteMemory(): TasteMemoryState {
  return {
    tracks: new Map(),
    artists: new Map(),
    genres: new Map(),
    recentTrackIds: [],
    totalSignals: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

function decayValue(value: number, elapsedMs: number, halfLifeMs: number): number {
  if (elapsedMs <= 0 || value <= 0) return value;
  return value * Math.pow(0.5, elapsedMs / halfLifeMs);
}

function refreshTrackDecay(m: TrackMemory, now: number): TrackMemory {
  const hoursSince = (now - m.lastSeenAt) / 3_600_000;
  const daysSince = hoursSince / 24;
  return {
    ...m,
    fatigue: decayValue(m.fatigue, hoursSince * 3_600_000, FATIGUE_HALF_LIFE_HOURS * 3_600_000),
    affinity: decayValue(m.affinity, daysSince * 86_400_000, AFFINITY_HALF_LIFE_DAYS * 86_400_000),
  };
}

export function remember(
  mem: TasteMemoryState,
  track: Track,
  outcome: MemoryOutcome
): TasteMemoryState {
  const now = Date.now();
  const tracks = new Map(mem.tracks);
  const artists = new Map(mem.artists);
  const genres = new Map(mem.genres);

  let tm = tracks.get(track.id) ?? {
    trackId: track.id,
    artistIds: track.artistIds ?? [],
    genres: (track.microgenres ?? []).map((g) => normalizeGenre(g) || g),
    firstSeenAt: now,
    lastSeenAt: now,
    showCount: 0,
    playCount: 0,
    completeCount: 0,
    loveCount: 0,
    likeCount: 0,
    skipCount: 0,
    dislikeCount: 0,
    neverAgain: false,
    affinity: 0.4,
    fatigue: 0,
  };

  tm = refreshTrackDecay(tm, now);
  tm.lastSeenAt = now;

  switch (outcome) {
    case "shown":
      tm.showCount += 1;
      tm.fatigue = Math.min(1, tm.fatigue + 0.12);
      break;
    case "play":
      tm.playCount += 1;
      tm.fatigue = Math.min(1, tm.fatigue + 0.18);
      tm.affinity = Math.min(1, tm.affinity + 0.04);
      break;
    case "complete":
      tm.completeCount += 1;
      tm.playCount += 1;
      tm.affinity = Math.min(1, tm.affinity + 0.1);
      tm.fatigue = Math.min(1, tm.fatigue + 0.15);
      break;
    case "love":
      tm.loveCount += 1;
      tm.affinity = Math.min(1, tm.affinity + 0.28);
      tm.fatigue = Math.min(1, tm.fatigue + 0.08);
      break;
    case "like":
    case "save":
      tm.likeCount += 1;
      tm.affinity = Math.min(1, tm.affinity + 0.15);
      break;
    case "skip":
      tm.skipCount += 1;
      tm.affinity = Math.max(0, tm.affinity - 0.12);
      tm.fatigue = Math.min(1, tm.fatigue + 0.25);
      break;
    case "dislike":
      tm.dislikeCount += 1;
      tm.affinity = Math.max(0, tm.affinity - 0.25);
      tm.fatigue = Math.min(1, tm.fatigue + 0.3);
      break;
    case "never_again":
      tm.neverAgain = true;
      tm.affinity = 0;
      tm.fatigue = 1;
      break;
  }

  tracks.set(track.id, tm);

  for (const aid of track.artistIds ?? []) {
    const am = artists.get(aid) ?? {
      artistId: aid,
      name: track.artistNames?.[0],
      trackIds: [],
      playCount: 0,
      loveCount: 0,
      lastSeenAt: now,
      affinity: 0.4,
      fatigue: 0,
      neverAgain: false,
    };
    am.lastSeenAt = now;
    if (!am.trackIds.includes(track.id)) am.trackIds = [...am.trackIds, track.id].slice(-30);
    if (outcome === "play" || outcome === "complete") am.playCount += 1;
    if (outcome === "love") {
      am.loveCount += 1;
      am.affinity = Math.min(1, am.affinity + 0.2);
    }
    if (outcome === "like" || outcome === "save") am.affinity = Math.min(1, am.affinity + 0.08);
    if (outcome === "skip" || outcome === "dislike") am.affinity = Math.max(0, am.affinity - 0.1);
    if (outcome === "never_again") {
      am.neverAgain = true;
      am.affinity = 0;
    }
    if (outcome === "shown" || outcome === "play" || outcome === "complete") {
      am.fatigue = Math.min(1, am.fatigue + 0.1);
    }
    artists.set(aid, am);
  }

  for (const g of tm.genres) {
    const gm = genres.get(g) ?? {
      genreId: g,
      playCount: 0,
      loveCount: 0,
      lastSeenAt: now,
      affinity: 0.4,
    };
    gm.lastSeenAt = now;
    if (outcome === "play" || outcome === "complete") gm.playCount += 1;
    if (outcome === "love") {
      gm.loveCount += 1;
      gm.affinity = Math.min(1, gm.affinity + 0.15);
    }
    if (outcome === "like" || outcome === "save") gm.affinity = Math.min(1, gm.affinity + 0.06);
    if (outcome === "dislike" || outcome === "skip") gm.affinity = Math.max(0, gm.affinity - 0.08);
    genres.set(g, gm);
  }

  const recentTrackIds = [track.id, ...mem.recentTrackIds.filter((id) => id !== track.id)].slice(0, MAX_RECENT);

  return {
    tracks,
    artists,
    genres,
    recentTrackIds,
    totalSignals: mem.totalSignals + 1,
    createdAt: mem.createdAt,
    updatedAt: now,
  };
}

export function hasHeard(mem: TasteMemoryState, trackId: string): boolean {
  const m = mem.tracks.get(trackId);
  return !!m && (m.playCount > 0 || m.showCount > 0 || m.completeCount > 0);
}

export function isNeverAgain(mem: TasteMemoryState, trackId: string): boolean {
  return mem.tracks.get(trackId)?.neverAgain === true;
}

export function isArtistNeverAgain(mem: TasteMemoryState, artistId: string): boolean {
  return mem.artists.get(artistId)?.neverAgain === true;
}

export function trackFatigue(mem: TasteMemoryState, trackId: string, now = Date.now()): number {
  const m = mem.tracks.get(trackId);
  if (!m) return 0;
  return refreshTrackDecay(m, now).fatigue;
}

export function artistFatigue(mem: TasteMemoryState, artistId: string, now = Date.now()): number {
  const m = mem.artists.get(artistId);
  if (!m) return 0;
  const hours = (now - m.lastSeenAt) / 3_600_000;
  return decayValue(m.fatigue, hours * 3_600_000, FATIGUE_HALF_LIFE_HOURS * 3_600_000);
}

export function trackAffinity(mem: TasteMemoryState, trackId: string, now = Date.now()): number {
  const m = mem.tracks.get(trackId);
  if (!m) return 0.5;
  if (m.neverAgain) return 0;
  return refreshTrackDecay(m, now).affinity;
}

export function memoryPenalty(
  mem: TasteMemoryState,
  track: Track,
  now = Date.now()
): { penalty: number; bonus: number; reason: string } {
  if (isNeverAgain(mem, track.id)) {
    return { penalty: 1, bonus: 0, reason: "never_again" };
  }
  for (const aid of track.artistIds ?? []) {
    if (isArtistNeverAgain(mem, aid)) {
      return { penalty: 1, bonus: 0, reason: "artist_never_again" };
    }
  }

  const tf = trackFatigue(mem, track.id, now);
  const af = Math.max(
    0,
    ...(track.artistIds ?? []).map((a) => artistFatigue(mem, a, now))
  );
  const fatigue = Math.max(tf, af * 0.85);

  const aff = trackAffinity(mem, track.id, now);
  const bonus = aff > 0.7 && fatigue < 0.25 ? (aff - 0.7) * 0.3 : 0;

  return {
    penalty: fatigue * 0.85,
    bonus,
    reason: fatigue > 0.5 ? "fatigued" : bonus > 0 ? "familiar_favorite" : "neutral",
  };
}

export function eligibleTrackIds(
  mem: TasteMemoryState,
  allIds: string[],
  maxFatigue = 0.75
): string[] {
  const now = Date.now();
  return allIds.filter((id) => {
    if (isNeverAgain(mem, id)) return false;
    return trackFatigue(mem, id, now) < maxFatigue;
  });
}

export function summarizeMemory(mem: TasteMemoryState): string {
  const loved = [...mem.tracks.values()].filter((t) => t.loveCount > 0).length;
  const heard = [...mem.tracks.values()].filter((t) => t.playCount > 0 || t.showCount > 0).length;
  const blocked = [...mem.tracks.values()].filter((t) => t.neverAgain).length;
  return `heard ${heard} · loved ${loved} · blocked ${blocked} · signals ${mem.totalSignals}`;
}

export function serializeMemory(mem: TasteMemoryState): string {
  return JSON.stringify({
    tracks: [...mem.tracks.entries()],
    artists: [...mem.artists.entries()],
    genres: [...mem.genres.entries()],
    recentTrackIds: mem.recentTrackIds,
    totalSignals: mem.totalSignals,
    createdAt: mem.createdAt,
    updatedAt: mem.updatedAt,
  });
}

export function deserializeMemory(raw: string): TasteMemoryState {
  const data = JSON.parse(raw);
  return {
    tracks: new Map(data.tracks),
    artists: new Map(data.artists),
    genres: new Map(data.genres),
    recentTrackIds: data.recentTrackIds ?? [],
    totalSignals: data.totalSignals ?? 0,
    createdAt: data.createdAt ?? Date.now(),
    updatedAt: data.updatedAt ?? Date.now(),
  };
}
