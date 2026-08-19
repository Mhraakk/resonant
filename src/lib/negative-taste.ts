/**
 * Milestone 5 — Negative Taste Memory
 * Models contradictions: "likes electronic but not polished",
 * "likes jazz but not saxophone tonight", "dark but not depressive".
 */

import type { Track } from "@/types/music";
import type { DNADimension } from "./taste-dna";
import { inferTrackDNA } from "./taste-dna";

export interface NegativePreference {
  id: string;
  /** Dimension or tag that is rejected when positive context is present */
  rejected: string;
  /** Optional context that activates this rejection */
  whenPositive?: string;
  strength: number; // 0–1
  evidence: number;
  createdAt: number;
  lastTriggeredAt?: number;
}

export interface NegativeTasteState {
  preferences: NegativePreference[];
  blockedTags: Map<string, number>; // tag → strength
}

export function createNegativeTaste(): NegativeTasteState {
  return { preferences: [], blockedTags: new Map() };
}

export function addNegative(
  state: NegativeTasteState,
  rejected: string,
  strength = 0.7,
  whenPositive?: string
): NegativeTasteState {
  const prefs = [...state.preferences];
  const existing = prefs.find(
    (p) => p.rejected === rejected && p.whenPositive === whenPositive
  );
  if (existing) {
    existing.strength = Math.min(1, existing.strength + 0.15);
    existing.evidence += 1;
  } else {
    prefs.push({
      id: `neg_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      rejected,
      whenPositive,
      strength,
      evidence: 1,
      createdAt: Date.now(),
    });
  }
  const blocked = new Map(state.blockedTags);
  blocked.set(rejected, Math.max(blocked.get(rejected) ?? 0, strength));
  return { preferences: prefs, blockedTags: blocked };
}

export function learnNegativeFromTrack(
  state: NegativeTasteState,
  track: Track,
  signal: "dislike" | "skip" | "never_again"
): NegativeTasteState {
  let next = state;
  const inferred = inferTrackDNA(track);
  const strength = signal === "never_again" ? 0.9 : signal === "dislike" ? 0.65 : 0.4;

  for (const [dim, val] of Object.entries(inferred)) {
    if ((val as number) > 0.7) {
      next = addNegative(next, dim, strength * 0.8);
    }
  }
  for (const g of track.microgenres ?? []) {
    next = addNegative(next, g, strength * 0.7);
  }
  for (const m of track.moods ?? []) {
    next = addNegative(next, m, strength * 0.6);
  }
  return next;
}

/** Penalty 0–1 if track triggers negative preferences */
export function negativePenalty(
  state: NegativeTasteState,
  track: Track,
  activePositives: string[] = []
): number {
  let penalty = 0;
  const inferred = inferTrackDNA(track);
  const trackTags = [
    ...Object.entries(inferred).filter(([, v]) => (v as number) > 0.6).map(([k]) => k),
    ...(track.microgenres ?? []),
    ...(track.moods ?? []),
  ];

  for (const pref of state.preferences) {
    const hitsRejected = trackTags.some(
      (t) => t === pref.rejected || t.includes(pref.rejected) || pref.rejected.includes(t)
    );
    if (!hitsRejected) continue;

    if (pref.whenPositive) {
      const ctxActive = activePositives.some(
        (p) => p === pref.whenPositive || p.includes(pref.whenPositive!)
      );
      if (!ctxActive) continue;
    }
    penalty = Math.max(penalty, pref.strength);
  }

  for (const [tag, strength] of state.blockedTags) {
    if (trackTags.some((t) => t === tag || t.includes(tag))) {
      penalty = Math.max(penalty, strength * 0.7);
    }
  }
  return Math.min(1, penalty);
}

export function summarizeNegative(state: NegativeTasteState): string {
  const top = state.preferences
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 4)
    .map((p) => (p.whenPositive ? `${p.rejected}|${p.whenPositive}` : p.rejected));
  return top.length ? `neg: ${top.join(", ")}` : "neg: none";
}
