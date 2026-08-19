/**
 * RESONANT Core Music Domain Types
 * Canonical internal model — provider IDs are secondary.
 */

export type Provider =
  | "spotify"
  | "apple_music"
  | "youtube"
  | "soundcloud"
  | "bandcamp"
  | "lastfm"
  | "musicbrainz"
  | "discogs"
  | "deezer"
  | "listenbrainz"
  | "internal";

export interface ExternalId {
  provider: Provider;
  id: string;
  url?: string;
}

export interface Provenance {
  source: Provider | "editorial" | "user" | "derived";
  confidence: number; // 0–1
  retrievedAt: string; // ISO
  field?: string;
}

export interface Artist {
  id: string; // internal UUID or slug
  name: string;
  sortName?: string;
  aliases?: string[];
  externalIds?: ExternalId[];
  country?: string;
  city?: string;
  formedYear?: number;
  disbandedYear?: number;
  type?: "person" | "group" | "orchestra" | "other";
  bio?: string;
  imageUrl?: string;
  genres?: string[];
  microgenres?: string[];
  scenes?: string[];
  labels?: string[];
  obscurityScore?: number; // 0–1 higher = more obscure
  provenance?: Provenance[];
}

export interface Label {
  id: string;
  name: string;
  country?: string;
  foundedYear?: number;
  externalIds: ExternalId[];
  description?: string;
}

export interface Album {
  id: string;
  title: string;
  artistIds: string[];
  artistNames: string[];
  releaseDate?: string;
  year?: number;
  labelId?: string;
  labelName?: string;
  type?: "album" | "ep" | "single" | "compilation" | "live" | "other";
  trackCount?: number;
  imageUrl?: string;
  externalIds: ExternalId[];
  genres?: string[];
  provenance?: Provenance[];
}

export interface Track {
  id: string;
  title: string;
  artistIds: string[];
  artistNames: string[];
  albumId?: string;
  albumTitle?: string;
  durationMs?: number;
  trackNumber?: number;
  discNumber?: number;
  year?: number;
  releaseDate?: string;
  labelName?: string;
  isrc?: string;
  externalIds?: ExternalId[];
  // Audio / taste features (when available)
  bpm?: number;
  key?: string;
  energy?: number;
  danceability?: number;
  acousticness?: number;
  instrumentalness?: number;
  valence?: number;
  // RESONANT enrichment
  microgenres?: string[];
  scenes?: string[];
  moods?: string[];
  textures?: string[];
  instruments?: string[];
  producers?: string[];
  composers?: string[];
  obscurityScore?: number;
  qualityScore?: number;
  previewUrl?: string;
  imageUrl?: string;
  provenance?: Provenance[];
}

export interface Scene {
  id: string;
  name: string;
  city?: string;
  country?: string;
  eraStart?: number;
  eraEnd?: number;
  description?: string;
  relatedGenres?: string[];
  keyArtists?: string[];
  keyLabels?: string[];
}

export type TasteZone =
  | "doom_jazz"
  | "velvety_deep_house"
  | "organic_electronic"
  | "dark_melancholia"
  | "triphop_bristol"
  | "jazzy_house"
  | "modern_classical"
  | "expressive_guitar"
  | "downtempo_warm"
  | "underground_hiphop";

export interface TasteDimension {
  id: string;
  name: string;
  value: number; // -1 to 1 or 0–1 depending on dim
  weight: number;
}

export interface TasteProfile {
  userId: string;
  zones: Record<TasteZone, number>; // affinity 0–1
  dimensions: TasteDimension[];
  preferredBpmRange: [number, number];
  preferredObscurity: number; // 0 mainstream … 1 deep underground
  noveltyAppetite: number; // 0 familiar … 1 unknown
  contexts: Record<string, Partial<TasteProfile>>;
  updatedAt: string;
}

export type FeedbackSignal =
  | "love"
  | "like"
  | "interesting"
  | "save"
  | "not_now"
  | "too_obvious"
  | "too_mainstream"
  | "too_fast"
  | "too_slow"
  | "too_dark"
  | "too_ambient"
  | "too_electronic"
  | "too_acoustic"
  | "wrong_mood"
  | "already_know"
  | "dislike"
  | "never_again";

export interface UserTrackSignal {
  userId: string;
  trackId: string;
  signal: FeedbackSignal | "play" | "skip" | "replay" | "complete";
  weight?: number;
  context?: string;
  sessionId?: string;
  timestamp: string;
  playDurationMs?: number;
}

export interface RecommendationReason {
  primary: string;
  details?: string;
  scores?: {
    tasteAffinity?: number;
    semanticSimilarity?: number;
    graphProximity?: number;
    contextMatch?: number;
    obscurity?: number;
    novelty?: number;
    historicalAffinity?: number;
    explorationPotential?: number;
    qualityConfidence?: number;
  };
  penalties?: string[];
}

export interface RecommendedTrack {
  track: Track;
  reason: RecommendationReason;
  score: number;
  position: number;
}

export interface ListeningSession {
  id: string;
  userId: string;
  startedAt: string;
  endedAt?: string;
  context?: string; // "night" | "work" | "driving" | ...
  seedTrackId?: string;
  seedPrompt?: string;
  trackIds: string[];
  feedback: UserTrackSignal[];
  finalMood?: string;
}

export interface Playlist {
  id: string;
  userId?: string;
  title: string;
  description?: string;
  trackIds: string[];
  isPublic: boolean;
  createdAt: string;
  type?: "user" | "ai" | "radio" | "journey";
  journeySpec?: string;
}

export interface RadioStation {
  id: string;
  name: string;
  description: string;
  seedZones: TasteZone[];
  seedPrompt?: string;
  currentQueue: RecommendedTrack[];
  feedbackHistory: UserTrackSignal[];
}

export interface NowPlayingState {
  track: Track | null;
  isPlaying: boolean;
  positionMs: number;
  durationMs: number;
  provider: Provider | null;
  queue: RecommendedTrack[];
  sessionId: string | null;
  reason?: RecommendationReason;
}
