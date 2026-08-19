/**
 * RESONANT Session Brain
 *
 * Three independent taste layers:
 * 1. Long-Term Taste   → TasteDNA (persistent identity)
 * 2. Current Phase     → medium-term (hours / listening era)
 * 3. Current Session   → immediate context (this listening window)
 *
 * Ranking blends all three so a metal head who is currently in a soft jazz
 * session is not forced back into metal until the session ends.
 */

import type { Track } from "@/types/music";
import {
  type TasteDNA,
  type DNAVector,
  type DNADimension,
  DNA_DIMENSIONS,
  createEmptyDNA,
  inferTrackDNA,
  updateDNAFromTrack,
  dnaAffinity,
  seedDNAFromSelection,
  summarizeDNA,
} from "./taste-dna";
import { normalizeGenre, type GenreId } from "./genre-taxonomy";
import { combineMoods, type MoodVector } from "./mood-model";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SessionContext {
  sessionId: string;
  startedAt: number;
  lastActivityAt: number;
  /** Immediate vector (high learning rate, decays fast) */
  vector: DNAVector;
  /** Genres dominant in this session */
  dominantGenres: Record<string, number>;
  /** Moods dominant in this session */
  dominantMoods: Record<string, number>;
  trackCount: number;
  recentTrackIds: string[];
  recentArtistIds: string[];
  /** How strongly the session should override long-term DNA (0–1) */
  sessionStrength: number;
}

export interface PhaseContext {
  phaseId: string;
  startedAt: number;
  /** Medium-term vector */
  vector: DNAVector;
  dominantGenres: Record<string, number>;
  trackCount: number;
  /** Decays over ~4–12 hours of inactivity */
  strength: number;
}

export interface SessionBrainState {
  longTerm: TasteDNA;
  phase: PhaseContext;
  session: SessionContext;
  /** Blend weights used in ranking */
  weights: {
    longTerm: number;
    phase: number;
    session: number;
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function neutralVector(): DNAVector {
  const v = {} as DNAVector;
  for (const d of DNA_DIMENSIONS) v[d] = 0.5;
  return v;
}

function blendVectors(
  vectors: Array<{ vector: DNAVector; weight: number }>
): DNAVector {
  const out = neutralVector();
  for (const d of DNA_DIMENSIONS) {
    let sum = 0;
    let wSum = 0;
    for (const { vector, weight } of vectors) {
      sum += (vector[d] ?? 0.5) * weight;
      wSum += weight;
    }
    out[d] = wSum > 0 ? sum / wSum : 0.5;
  }
  return out;
}

function decay(value: number, hoursSince: number, halfLifeHours: number): number {
  if (hoursSince <= 0) return value;
  return value * Math.pow(0.5, hoursSince / halfLifeHours);
}

// ─── Create / Reset ─────────────────────────────────────────────────────────

export function createSessionContext(): SessionContext {
  return {
    sessionId: `sess_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    startedAt: Date.now(),
    lastActivityAt: Date.now(),
    vector: neutralVector(),
    dominantGenres: {},
    dominantMoods: {},
    trackCount: 0,
    recentTrackIds: [],
    recentArtistIds: [],
    sessionStrength: 0.15,
  };
}

export function createPhaseContext(): PhaseContext {
  return {
    phaseId: `phase_${Date.now()}`,
    startedAt: Date.now(),
    vector: neutralVector(),
    dominantGenres: {},
    trackCount: 0,
    strength: 0.2,
  };
}

export function createSessionBrain(longTerm?: TasteDNA): SessionBrainState {
  return {
    longTerm: longTerm ?? createEmptyDNA(),
    phase: createPhaseContext(),
    session: createSessionContext(),
    weights: { longTerm: 0.45, phase: 0.25, session: 0.3 },
  };
}

// ─── Activity & Learning ────────────────────────────────────────────────────

export type SessionSignal =
  | "play"
  | "complete"
  | "love"
  | "like"
  | "skip"
  | "dislike"
  | "save"
  | "never_again";

export function observe(
  brain: SessionBrainState,
  track: Track,
  signal: SessionSignal
): SessionBrainState {
  const now = Date.now();
  const inferred = inferTrackDNA(track);
  const session = { ...brain.session };
  const phase = { ...brain.phase };
  let longTerm = brain.longTerm;

  const sessionLR =
    signal === "love" || signal === "complete" ? 0.22
    : signal === "like" || signal === "save" || signal === "play" ? 0.12
    : signal === "skip" || signal === "dislike" ? -0.15
    : signal === "never_again" ? -0.25
    : 0.08;

  const nextSessionVec = { ...session.vector };
  for (const [dim, val] of Object.entries(inferred)) {
    const k = dim as DNADimension;
    const cur = nextSessionVec[k] ?? 0.5;
    nextSessionVec[k] = Math.max(0, Math.min(1, cur + sessionLR * ((val as number) - cur)));
  }
  session.vector = nextSessionVec;
  session.lastActivityAt = now;
  session.trackCount += 1;
  session.recentTrackIds = [track.id, ...session.recentTrackIds].slice(0, 40);
  if (track.artistIds[0]) {
    session.recentArtistIds = [track.artistIds[0], ...session.recentArtistIds].slice(0, 20);
  }

  for (const g of track.microgenres ?? []) {
    const id = normalizeGenre(g) || g;
    session.dominantGenres[id] = (session.dominantGenres[id] ?? 0) + (sessionLR > 0 ? 1 : -0.5);
  }
  for (const m of track.moods ?? []) {
    session.dominantMoods[m] = (session.dominantMoods[m] ?? 0) + (sessionLR > 0 ? 1 : -0.5);
  }

  session.sessionStrength = Math.min(0.75, 0.15 + session.trackCount * 0.04);

  const phaseLR = sessionLR * 0.45;
  const nextPhaseVec = { ...phase.vector };
  for (const [dim, val] of Object.entries(inferred)) {
    const k = dim as DNADimension;
    const cur = nextPhaseVec[k] ?? 0.5;
    nextPhaseVec[k] = Math.max(0, Math.min(1, cur + phaseLR * ((val as number) - cur)));
  }
  phase.vector = nextPhaseVec;
  phase.trackCount += 1;
  phase.strength = Math.min(0.6, 0.2 + phase.trackCount * 0.025);
  for (const g of track.microgenres ?? []) {
    const id = normalizeGenre(g) || g;
    phase.dominantGenres[id] = (phase.dominantGenres[id] ?? 0) + (phaseLR > 0 ? 0.6 : -0.3);
  }

  if (signal === "love" || signal === "never_again" || signal === "dislike" || signal === "save") {
    const mapped =
      signal === "love" || signal === "save" ? "love"
      : signal === "never_again" ? "never_again"
      : "dislike";
    longTerm = updateDNAFromTrack(longTerm, track, mapped, 0.7);
  } else if (signal === "complete" && session.trackCount % 4 === 0) {
    longTerm = updateDNAFromTrack(longTerm, track, "like", 0.35);
  }

  const sessionW = session.sessionStrength;
  const phaseW = phase.strength * 0.7;
  const longW = Math.max(0.2, 1 - sessionW - phaseW);
  const total = longW + phaseW + sessionW;

  return {
    longTerm,
    phase,
    session,
    weights: {
      longTerm: longW / total,
      phase: phaseW / total,
      session: sessionW / total,
    },
  };
}

export function applyDecay(brain: SessionBrainState, now = Date.now()): SessionBrainState {
  const sessionHours = (now - brain.session.lastActivityAt) / 3_600_000;
  const phaseHours = (now - brain.phase.startedAt) / 3_600_000;

  const session = { ...brain.session };
  if (sessionHours > 0.3) {
    session.sessionStrength = decay(session.sessionStrength, sessionHours, 0.75);
    const pull = Math.min(0.4, sessionHours * 0.15);
    const nextVec = { ...session.vector };
    for (const d of DNA_DIMENSIONS) {
      nextVec[d] = nextVec[d] * (1 - pull) + 0.5 * pull;
    }
    session.vector = nextVec;
  }

  const phase = { ...brain.phase };
  if (phaseHours > 2) {
    phase.strength = decay(phase.strength, phaseHours, 6);
  }

  const sessionW = session.sessionStrength;
  const phaseW = phase.strength * 0.7;
  const longW = Math.max(0.2, 1 - sessionW - phaseW);
  const total = longW + phaseW + sessionW;

  return {
    ...brain,
    session,
    phase,
    weights: {
      longTerm: longW / total,
      phase: phaseW / total,
      session: sessionW / total,
    },
  };
}

export function newSession(brain: SessionBrainState): SessionBrainState {
  return {
    ...brain,
    session: createSessionContext(),
    weights: {
      longTerm: 0.55,
      phase: brain.phase.strength * 0.6,
      session: 0.15,
    },
  };
}

export function newPhase(brain: SessionBrainState): SessionBrainState {
  return {
    ...brain,
    phase: createPhaseContext(),
    session: createSessionContext(),
    weights: { longTerm: 0.7, phase: 0.15, session: 0.15 },
  };
}

export function effectiveDNA(brain: SessionBrainState): TasteDNA {
  const blended = blendVectors([
    { vector: brain.longTerm.vector, weight: brain.weights.longTerm },
    { vector: brain.phase.vector, weight: brain.weights.phase },
    { vector: brain.session.vector, weight: brain.weights.session },
  ]);

  const genres = { ...brain.longTerm.genres };
  for (const [g, count] of Object.entries(brain.session.dominantGenres)) {
    if (count > 1) {
      const prev = genres[g] ?? { affinity: 0.5, confidence: 0.2, evidence: 0 };
      genres[g] = {
        affinity: Math.min(1, prev.affinity + 0.15 * Math.min(count, 5)),
        confidence: Math.min(1, prev.confidence + 0.1),
        evidence: prev.evidence + count,
      };
    }
  }

  return {
    ...brain.longTerm,
    vector: blended,
    genres,
  };
}

export function brainAffinity(brain: SessionBrainState, track: Track): number {
  const eff = effectiveDNA(brain);
  return dnaAffinity(eff, track);
}

export function summarizeBrain(brain: SessionBrainState): string {
  const topSession = Object.entries(brain.session.dominantGenres)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([g]) => g);

  return [
    `LT ${(brain.weights.longTerm * 100).toFixed(0)}%`,
    `Phase ${(brain.weights.phase * 100).toFixed(0)}%`,
    `Session ${(brain.weights.session * 100).toFixed(0)}%`,
    topSession.length ? `now: ${topSession.join("/")}` : "session neutral",
    `tracks ${brain.session.trackCount}`,
  ].join(" · ");
}

export function getSessionDominantMoods(brain: SessionBrainState, limit = 4): string[] {
  return Object.entries(brain.session.dominantMoods)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([m]) => m);
}
