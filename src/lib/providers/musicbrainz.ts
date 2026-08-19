/**
 * MusicBrainz provider adapter
 * Public search API — polite User-Agent and ~1 req/sec.
 */

import type { MusicProvider, NormalizedTrack, ProviderSearchParams, ProviderSearchResult } from "./types";
import { normalizeGenre } from "../genre-taxonomy";

const MB_BASE = "https://musicbrainz.org/ws/2";
const USER_AGENT = "RESONANT/0.1.0 (https://resonant-woad.vercel.app; music-intelligence)";

let lastRequest = 0;
async function politeFetch(url: string): Promise<Response> {
  const now = Date.now();
  const wait = Math.max(0, 1100 - (now - lastRequest));
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequest = Date.now();
  return fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json",
    },
  });
}

type MBRecording = {
  id?: string;
  title?: string;
  "artist-credit"?: Array<{
    name?: string;
    artist?: { id?: string; name?: string };
  }>;
  releases?: Array<{ id?: string; title?: string; date?: string }>;
  tags?: Array<{ name?: string }>;
};

function mapRecording(rec: MBRecording): NormalizedTrack | null {
  if (!rec?.title || !rec?.id) return null;
  const artistCredit = rec["artist-credit"]?.[0];
  const artistName = artistCredit?.name || artistCredit?.artist?.name || "Unknown";
  const artistId = artistCredit?.artist?.id;
  const release = rec.releases?.[0];
  const year = release?.date ? parseInt(String(release.date).slice(0, 4), 10) : undefined;
  const tags = (rec.tags || []).map((t) => t.name).filter((n): n is string => Boolean(n));
  const normalizedGenres = tags
    .map((t) => normalizeGenre(t))
    .filter((g): g is string => Boolean(g));

  return {
    id: `mb:${rec.id}`,
    provider: "musicbrainz",
    providerTrackId: rec.id,
    title: rec.title,
    artist: artistName,
    artistId: artistId ? `mb-artist:${artistId}` : undefined,
    album: release?.title,
    albumId: release?.id ? `mb-release:${release.id}` : undefined,
    genres: tags,
    normalizedGenres,
    releaseYear: Number.isFinite(year) ? year : undefined,
    metadataConfidence: tags.length > 0 ? 0.75 : 0.55,
    obscurityScore: 0.5,
    qualityScore: 0.7,
  };
}

export const musicbrainzProvider: MusicProvider = {
  name: "musicbrainz",

  async isAvailable() {
    try {
      const res = await politeFetch(`${MB_BASE}/recording?query=test&limit=1&fmt=json`);
      return res.ok || res.status === 503;
    } catch {
      return false;
    }
  },

  async search(params: ProviderSearchParams): Promise<ProviderSearchResult> {
    const limit = Math.min(params.limit ?? 25, 25);
    const offset = params.offset ?? 0;
    const q = encodeURIComponent(params.query);
    const url = `${MB_BASE}/recording?query=${q}&limit=${limit}&offset=${offset}&fmt=json`;

    try {
      const res = await politeFetch(url);
      if (!res.ok) {
        console.warn(`[musicbrainz] HTTP ${res.status}`);
        return { tracks: [], provider: "musicbrainz", rawCount: 0 };
      }
      const data = (await res.json()) as {
        recordings?: MBRecording[];
        count?: number;
      };
      const recordings = data.recordings || [];
      const tracks = recordings.map(mapRecording).filter(Boolean) as NormalizedTrack[];

      return {
        tracks,
        total: data.count,
        nextOffset: offset + limit < (data.count ?? 0) ? offset + limit : undefined,
        provider: "musicbrainz",
        rawCount: recordings.length,
      };
    } catch (err) {
      console.warn("[musicbrainz] search failed", err);
      return { tracks: [], provider: "musicbrainz", rawCount: 0 };
    }
  },
};
