"use client";

import { create } from "zustand";
import type { Track, RecommendedTrack, RecommendationReason, Provider } from "@/types/music";
import { getPrimaryListenUrl } from "@/lib/external-links";

export type PlaybackMode =
  | "idle"
  | "loading"
  | "preview"
  | "external_only"
  | "error";

interface PlayerState {
  track: Track | null;
  isPlaying: boolean;
  positionMs: number;
  durationMs: number;
  provider: Provider | null;
  queue: RecommendedTrack[];
  history: Track[];
  reason: RecommendationReason | null;
  sessionId: string | null;
  playbackMode: PlaybackMode;
  playbackMessage: string | null;

  play: (track: Track, reason?: RecommendationReason) => void;
  playRecommended: (rec: RecommendedTrack) => void;
  /** Call only after HTMLAudioElement.play() resolves */
  markPlaying: () => void;
  /** Call when play() rejects or media errors */
  markPlaybackFailed: (message?: string) => void;
  pause: () => void;
  resume: () => void;
  toggle: () => void;
  seek: (ms: number) => void;
  setQueue: (queue: RecommendedTrack[]) => void;
  next: () => void;
  prev: () => void;
  clear: () => void;
  clearMessage: () => void;
  openExternally: () => void;
}

function resolveInitial(track: Track): {
  mode: PlaybackMode;
  message: string | null;
  isPlaying: boolean;
} {
  if (track.previewUrl) {
    return { mode: "loading", message: null, isPlaying: false };
  }
  return {
    mode: "external_only",
    message:
      "Preview unavailable. Open this track on Spotify, Apple Music, YouTube, or SoundCloud.",
    isPlaying: false,
  };
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  track: null,
  isPlaying: false,
  positionMs: 0,
  durationMs: 0,
  provider: null,
  queue: [],
  history: [],
  reason: null,
  sessionId: null,
  playbackMode: "idle",
  playbackMessage: null,

  play: (track, reason) => {
    const prev = get().track;
    const resolved = resolveInitial(track);
    set({
      track,
      isPlaying: resolved.isPlaying,
      positionMs: 0,
      durationMs: track.durationMs ?? 0,
      reason: reason ?? null,
      playbackMode: resolved.mode,
      playbackMessage: resolved.message,
      history: prev ? [...get().history.slice(-49), prev] : get().history,
    });
  },

  playRecommended: (rec) => {
    get().play(rec.track, rec.reason);
    set({ queue: get().queue.length ? get().queue : [rec] });
  },

  markPlaying: () => {
    const t = get().track;
    if (!t?.previewUrl) return;
    set({ isPlaying: true, playbackMode: "preview", playbackMessage: null });
  },

  markPlaybackFailed: (message) => {
    set({
      isPlaying: false,
      playbackMode: "error",
      playbackMessage:
        message ??
        "Playback failed. Open this track on an external platform instead.",
    });
  },

  pause: () => set({ isPlaying: false }),

  resume: () => {
    const t = get().track;
    if (t?.previewUrl && get().playbackMode === "preview") {
      set({ isPlaying: true });
    }
  },

  toggle: () => {
    const s = get();
    if (s.playbackMode === "external_only" || s.playbackMode === "error") {
      s.openExternally();
      return;
    }
    if (s.isPlaying) s.pause();
    else s.resume();
  },

  seek: (ms) => set({ positionMs: ms }),

  setQueue: (queue) => set({ queue }),

  next: () => {
    const { queue, track } = get();
    if (!queue.length) return;
    const idx = queue.findIndex((r) => r.track.id === track?.id);
    const next = queue[idx + 1] ?? queue[0];
    if (next) get().playRecommended(next);
  },

  prev: () => {
    const { history } = get();
    const last = history[history.length - 1];
    if (last) get().play(last);
  },

  clear: () =>
    set({
      track: null,
      isPlaying: false,
      playbackMode: "idle",
      playbackMessage: null,
      reason: null,
    }),

  clearMessage: () => set({ playbackMessage: null }),

  openExternally: () => {
    const t = get().track;
    if (!t || typeof window === "undefined") return;
    window.open(getPrimaryListenUrl(t), "_blank", "noopener,noreferrer");
  },
}));
