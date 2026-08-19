/**
 * Milestone 6 — Journey Engine
 * Trajectory instead of flat batches.
 * Roles: ENTRY → BRIDGE → DEEPENER → PEAK → RELEASE → LANDING
 */

import type { Track, RecommendedTrack } from "@/types/music";

export type JourneyRole =
  | "ENTRY"
  | "BRIDGE"
  | "DEEPENER"
  | "PEAK"
  | "RELEASE"
  | "LANDING";

export interface JourneyStep {
  role: JourneyRole;
  targetEnergy: number; // 0–1
  targetDark: number;
  targetIntensity: number;
  label: string;
}

export const JOURNEY_TEMPLATES: Record<string, JourneyStep[]> = {
  nocturnal_descent: [
    { role: "ENTRY", targetEnergy: 0.35, targetDark: 0.5, targetIntensity: 0.3, label: "Warm entry" },
    { role: "BRIDGE", targetEnergy: 0.3, targetDark: 0.65, targetIntensity: 0.4, label: "Nocturnal turn" },
    { role: "DEEPENER", targetEnergy: 0.25, targetDark: 0.8, targetIntensity: 0.55, label: "Deepen" },
    { role: "PEAK", targetEnergy: 0.4, targetDark: 0.85, targetIntensity: 0.75, label: "Peak dark" },
    { role: "RELEASE", targetEnergy: 0.3, targetDark: 0.6, targetIntensity: 0.4, label: "Release" },
    { role: "LANDING", targetEnergy: 0.2, targetDark: 0.4, targetIntensity: 0.2, label: "Soft landing" },
  ],
  warm_rise: [
    { role: "ENTRY", targetEnergy: 0.3, targetDark: 0.4, targetIntensity: 0.25, label: "Gentle open" },
    { role: "BRIDGE", targetEnergy: 0.45, targetDark: 0.3, targetIntensity: 0.4, label: "Warm build" },
    { role: "DEEPENER", targetEnergy: 0.55, targetDark: 0.25, targetIntensity: 0.5, label: "Expand" },
    { role: "PEAK", targetEnergy: 0.75, targetDark: 0.2, targetIntensity: 0.7, label: "Peak glow" },
    { role: "RELEASE", targetEnergy: 0.5, targetDark: 0.3, targetIntensity: 0.4, label: "Ease" },
    { role: "LANDING", targetEnergy: 0.35, targetDark: 0.35, targetIntensity: 0.25, label: "Settle" },
  ],
  hypnotic_loop: [
    { role: "ENTRY", targetEnergy: 0.4, targetDark: 0.5, targetIntensity: 0.4, label: "Pulse in" },
    { role: "BRIDGE", targetEnergy: 0.45, targetDark: 0.55, targetIntensity: 0.5, label: "Lock groove" },
    { role: "DEEPENER", targetEnergy: 0.5, targetDark: 0.6, targetIntensity: 0.6, label: "Deepen pulse" },
    { role: "PEAK", targetEnergy: 0.55, targetDark: 0.65, targetIntensity: 0.7, label: "Hypnotic peak" },
    { role: "RELEASE", targetEnergy: 0.4, targetDark: 0.5, targetIntensity: 0.45, label: "Release" },
    { role: "LANDING", targetEnergy: 0.3, targetDark: 0.4, targetIntensity: 0.3, label: "Fade" },
  ],
};

export function selectJourneyTemplate(moods: string[]): JourneyStep[] {
  const m = moods.map((x) => x.toLowerCase());
  if (m.some((x) => ["nocturnal", "dark", "melancholic"].includes(x))) {
    return JOURNEY_TEMPLATES.nocturnal_descent;
  }
  if (m.some((x) => ["euphoric", "warm", "bright"].includes(x))) {
    return JOURNEY_TEMPLATES.warm_rise;
  }
  return JOURNEY_TEMPLATES.hypnotic_loop;
}

function trackEnergy(t: Track): number {
  if (t.energy !== undefined) return t.energy / 100;
  if (t.bpm) return Math.min(1, Math.max(0, (t.bpm - 60) / 100));
  return 0.45;
}

function trackDark(t: Track): number {
  const moods = (t.moods ?? []).map((m) => m.toLowerCase());
  if (moods.some((m) => ["dark", "noir", "nocturnal", "shadow"].includes(m))) return 0.85;
  if (moods.some((m) => ["melancholic", "sad"].includes(m))) return 0.7;
  if (moods.some((m) => ["bright", "euphoric"].includes(m))) return 0.2;
  return 0.45;
}

export function assignJourneyRoles(
  ranked: RecommendedTrack[],
  moods: string[]
): RecommendedTrack[] {
  const steps = selectJourneyTemplate(moods);
  if (ranked.length === 0) return ranked;

  const used = new Set<string>();
  const result: RecommendedTrack[] = [];

  for (let i = 0; i < Math.min(steps.length, ranked.length); i++) {
    const step = steps[i];
    let best: RecommendedTrack | null = null;
    let bestScore = -Infinity;

    for (const r of ranked) {
      if (used.has(r.track.id)) continue;
      const e = trackEnergy(r.track);
      const d = trackDark(r.track);
      const fit =
        1 - Math.abs(e - step.targetEnergy) - Math.abs(d - step.targetDark) * 0.8;
      const score = fit + r.score * 0.3;
      if (score > bestScore) {
        bestScore = score;
        best = r;
      }
    }

    if (best) {
      used.add(best.track.id);
      result.push({
        ...best,
        position: i + 1,
        reason: {
          ...best.reason,
          primary: `${step.role}: ${step.label} · ${best.reason.primary}`,
        },
      });
    }
  }

  // Fill remaining with leftover ranked tracks
  for (const r of ranked) {
    if (result.length >= ranked.length) break;
    if (used.has(r.track.id)) continue;
    result.push({ ...r, position: result.length + 1 });
  }

  return result;
}
