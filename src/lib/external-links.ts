/**
 * External platform links for any track.
 * Prefer real URLs when present; otherwise build search deep-links.
 */

import type { Track } from "@/types/music";

export type PlatformId = "spotify" | "apple" | "youtube" | "soundcloud";

export interface PlatformLink {
  id: PlatformId;
  label: string;
  url: string;
  kind: "direct" | "search";
}

function q(s: string): string {
  return encodeURIComponent(s.trim());
}

function searchQuery(track: Track): string {
  const artist = track.artistNames?.[0] ?? "";
  return `${artist} ${track.title}`.trim();
}

/** Resolve platform links for a track. Always returns all four platforms. */
export function getPlatformLinks(track: Track): PlatformLink[] {
  const query = searchQuery(track);
  const artist = track.artistNames?.[0] ?? "";
  const title = track.title;

  const externals = track.externalIds ?? [];
  const byProvider = (name: string) =>
    externals.find((e) => e.provider === name || e.provider.includes(name));

  const spotifyDirect = track.previewUrl?.includes("spotify")
    ? undefined
    : byProvider("spotify");
  const appleDirect = byProvider("apple") || byProvider("itunes");

  return [
    {
      id: "spotify",
      label: "Spotify",
      kind: spotifyDirect ? "direct" : "search",
      url: spotifyDirect
        ? `https://open.spotify.com/track/${spotifyDirect.id}`
        : `https://open.spotify.com/search/${q(query)}`,
    },
    {
      id: "apple",
      label: "Apple Music",
      kind: appleDirect ? "direct" : "search",
      url: appleDirect
        ? `https://music.apple.com/us/song/${appleDirect.id}`
        : `https://music.apple.com/us/search?term=${q(query)}`,
    },
    {
      id: "youtube",
      label: "YouTube",
      kind: "search",
      url: `https://www.youtube.com/results?search_query=${q(`${artist} ${title}`)}`,
    },
    {
      id: "soundcloud",
      label: "SoundCloud",
      kind: "search",
      url: `https://soundcloud.com/search?q=${q(query)}`,
    },
  ];
}

/** Best external listen URL (prefer Spotify search, then YouTube). */
export function getPrimaryListenUrl(track: Track): string {
  const links = getPlatformLinks(track);
  return links.find((l) => l.id === "spotify")?.url ?? links[0].url;
}
