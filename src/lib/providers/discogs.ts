/**
 * Discogs provider adapter
 * Public search works with User-Agent. Token improves rate limits.
 */

import type { MusicProvider, NormalizedTrack, ProviderSearchParams, ProviderSearchResult } from "./types";
import { normalizeGenre } from "../genre-taxonomy";

const DISCOGS_BASE = "https://api.discogs.com";
const USER_AGENT = "RESONANT/0.1.0 +https://resonant-woad.vercel.app";

type DiscogsItem = {
  id?: number | string;
  title?: string;
  artist?: string;
  genre?: string[];
  style?: string[];
  year?: string | number;
  thumb?: string;
  cover_image?: string;
};

function mapResult(item: DiscogsItem): NormalizedTrack | null {
  if (!item?.title) return null;
  const rawTitle = item.title;
  const parts = rawTitle.split(" - ");
  const artist = parts.length > 1 ? parts[0].trim() : item.artist || "Unknown";
  const title = parts.length > 1 ? parts.slice(1).join(" - ").trim() : rawTitle;

  const genres = [...(item.genre || []), ...(item.style || [])].filter(Boolean);
  const normalizedGenres = genres
    .map((g) => normalizeGenre(g))
    .filter((g): g is string => Boolean(g));

  const year = item.year ? parseInt(String(item.year), 10) : undefined;

  return {
    id: `discogs:${item.id}`,
    provider: "discogs",
    providerTrackId: String(item.id),
    title,
    artist,
    album: item.title,
    genres,
    normalizedGenres,
    artworkUrl: item.thumb || item.cover_image,
    releaseYear: Number.isFinite(year) ? year : undefined,
    metadataConfidence: genres.length > 0 ? 0.8 : 0.6,
    obscurityScore: 0.55,
    qualityScore: 0.75,
  };
}

export const discogsProvider: MusicProvider = {
  name: "discogs",

  async isAvailable() {
    try {
      const res = await fetch(
        `${DISCOGS_BASE}/database/search?q=test&type=release&per_page=1`,
        { headers: { "User-Agent": USER_AGENT } }
      );
      return res.ok || res.status === 401 || res.status === 429;
    } catch {
      return false;
    }
  },

  async search(params: ProviderSearchParams): Promise<ProviderSearchResult> {
    const limit = Math.min(params.limit ?? 25, 50);
    const page = Math.floor((params.offset ?? 0) / limit) + 1;
    const q = encodeURIComponent(params.query);
    const url = `${DISCOGS_BASE}/database/search?q=${q}&type=release&per_page=${limit}&page=${page}`;

    try {
      const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
      if (!res.ok) {
        console.warn(`[discogs] HTTP ${res.status}`);
        return { tracks: [], provider: "discogs", rawCount: 0 };
      }
      const data = (await res.json()) as {
        results?: DiscogsItem[];
        pagination?: { items?: number; page?: number; pages?: number };
      };
      const results = data.results || [];
      const tracks = results.map(mapResult).filter(Boolean) as NormalizedTrack[];

      return {
        tracks,
        total: data.pagination?.items,
        nextOffset:
          data.pagination?.page != null &&
          data.pagination?.pages != null &&
          data.pagination.page < data.pagination.pages
            ? page * limit
            : undefined,
        provider: "discogs",
        rawCount: results.length,
      };
    } catch (err) {
      console.warn("[discogs] search failed", err);
      return { tracks: [], provider: "discogs", rawCount: 0 };
    }
  },
};
