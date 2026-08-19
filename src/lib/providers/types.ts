/**
 * Normalized provider contract for RESONANT
 */

export type ProviderName = "musicbrainz" | "discogs" | "internal" | "spotify" | "deezer";

export interface NormalizedTrack {
  id: string;
  provider: ProviderName;
  providerTrackId: string;
  title: string;
  artist: string;
  artistId?: string;
  album?: string;
  albumId?: string;
  genres: string[];
  normalizedGenres: string[];
  artworkUrl?: string;
  previewUrl?: string;
  releaseYear?: number;
  popularity?: number;
  metadataConfidence: number;
  bpm?: number;
  durationMs?: number;
  moods?: string[];
  microgenres?: string[];
  obscurityScore?: number;
  qualityScore?: number;
}

export interface ProviderSearchParams {
  query: string;
  limit?: number;
  offset?: number;
  genres?: string[];
}

export interface ProviderSearchResult {
  tracks: NormalizedTrack[];
  total?: number;
  nextOffset?: number;
  provider: ProviderName;
  rawCount: number;
}

export interface MusicProvider {
  name: ProviderName;
  search(params: ProviderSearchParams): Promise<ProviderSearchResult>;
  isAvailable(): Promise<boolean>;
}
