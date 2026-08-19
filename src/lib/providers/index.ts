/**
 * Multi-provider retrieval layer
 * Combines internal catalog + MusicBrainz + Discogs
 */

import type { NormalizedTrack, ProviderSearchParams, ProviderSearchResult } from "./types";
import { musicbrainzProvider } from "./musicbrainz";
import { discogsProvider } from "./discogs";
import { SEED_TRACKS } from "../seed-catalog";
import { normalizeGenre } from "../genre-taxonomy";
import type { Track } from "@/types/music";

export * from "./types";
export { musicbrainzProvider } from "./musicbrainz";
export { discogsProvider } from "./discogs";

function internalToNormalized(t: Track): NormalizedTrack {
  return {
    id: t.id,
    provider: "internal",
    providerTrackId: t.id,
    title: t.title,
    artist: t.artistNames.join(", "),
    artistId: t.artistIds[0],
    album: t.albumTitle,
    genres: t.microgenres ?? [],
    normalizedGenres: (t.microgenres ?? [])
      .map((g) => normalizeGenre(g) || g)
      .filter(Boolean) as string[],
    releaseYear: t.year,
    durationMs: t.durationMs,
    bpm: t.bpm,
    moods: t.moods,
    microgenres: t.microgenres,
    obscurityScore: t.obscurityScore,
    qualityScore: t.qualityScore,
    metadataConfidence: 0.95,
  };
}

function searchInternal(params: ProviderSearchParams): ProviderSearchResult {
  const q = params.query.toLowerCase();
  const terms = q.split(/\s+/).filter(Boolean);
  const limit = params.limit ?? 40;

  const scored = SEED_TRACKS.map((t) => {
    const text = [
      t.title,
      ...t.artistNames,
      ...(t.microgenres ?? []),
      ...(t.moods ?? []),
      t.albumTitle ?? "",
    ]
      .join(" ")
      .toLowerCase();
    const hits = terms.filter((term) => text.includes(term)).length;
    return { track: t, score: hits / Math.max(1, terms.length) };
  })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return {
    tracks: scored.map((s) => internalToNormalized(s.track)),
    provider: "internal",
    rawCount: scored.length,
  };
}

export async function multiProviderSearch(
  queries: string[],
  options: { limitPerQuery?: number; offset?: number } = {}
): Promise<{ tracks: NormalizedTrack[]; stats: Record<string, number> }> {
  const limitPerQuery = options.limitPerQuery ?? 20;
  const all: NormalizedTrack[] = [];
  const stats: Record<string, number> = { internal: 0, musicbrainz: 0, discogs: 0 };

  for (const q of queries.slice(0, 8)) {
    const res = searchInternal({ query: q, limit: limitPerQuery });
    all.push(...res.tracks);
    stats.internal += res.rawCount;
  }

  const liveTasks: Promise<void>[] = [];

  for (const q of queries.slice(0, 4)) {
    liveTasks.push(
      (async () => {
        try {
          const res = await musicbrainzProvider.search({
            query: q,
            limit: Math.min(15, limitPerQuery),
            offset: options.offset,
          });
          all.push(...res.tracks);
          stats.musicbrainz += res.rawCount;
        } catch {
          /* soft fail */
        }
      })()
    );

    liveTasks.push(
      (async () => {
        try {
          const res = await discogsProvider.search({
            query: q,
            limit: Math.min(15, limitPerQuery),
            offset: options.offset,
          });
          all.push(...res.tracks);
          stats.discogs += res.rawCount;
        } catch {
          /* soft fail */
        }
      })()
    );
  }

  await Promise.allSettled(liveTasks);

  const seenIds = new Set<string>();
  const seenKeys = new Set<string>();
  const unique: NormalizedTrack[] = [];

  for (const t of all) {
    if (seenIds.has(t.id)) continue;
    const key = `${t.artist.toLowerCase().trim()}::${t.title.toLowerCase().trim()}`;
    if (seenKeys.has(key)) continue;
    seenIds.add(t.id);
    seenKeys.add(key);
    unique.push(t);
  }

  return { tracks: unique, stats };
}

export function normalizedToTrack(n: NormalizedTrack): Track {
  return {
    id: n.id,
    title: n.title,
    artistIds: n.artistId ? [n.artistId] : [n.artist],
    artistNames: [n.artist],
    albumTitle: n.album,
    year: n.releaseYear,
    durationMs: n.durationMs,
    bpm: n.bpm,
    microgenres: n.normalizedGenres.length ? n.normalizedGenres : n.microgenres ?? n.genres,
    moods: n.moods,
    obscurityScore: n.obscurityScore ?? 0.5,
    qualityScore: n.qualityScore ?? 0.7,
    imageUrl: n.artworkUrl,
  };
}
