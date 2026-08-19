/**
 * Milestone 11 — Adaptive Queue
 * Queue is not fixed. Interaction → session update → rerank remaining.
 */

import type { Track, RecommendedTrack } from "@/types/music";

export interface QueueItem {
  track: Track;
  score: number;
  position: number;
  locked: boolean; // user pinned
  source: "recommendation" | "manual" | "journey";
}

export interface AdaptiveQueueState {
  items: QueueItem[];
  currentIndex: number;
  version: number;
}

export function createQueue(recs: RecommendedTrack[] = []): AdaptiveQueueState {
  return {
    items: recs.map((r, i) => ({
      track: r.track,
      score: r.score,
      position: i,
      locked: false,
      source: "recommendation" as const,
    })),
    currentIndex: 0,
    version: 1,
  };
}

export function skipCurrent(queue: AdaptiveQueueState): AdaptiveQueueState {
  const items = queue.items.map((item, i) =>
    i === queue.currentIndex ? { ...item, score: item.score * 0.5 } : item
  );
  // Rerank unlocked future items
  const past = items.slice(0, queue.currentIndex + 1);
  const future = items
    .slice(queue.currentIndex + 1)
    .filter((x) => !x.locked)
    .sort((a, b) => b.score - a.score);
  const lockedFuture = items.slice(queue.currentIndex + 1).filter((x) => x.locked);
  const merged = [...past, ...lockedFuture, ...future].map((item, i) => ({
    ...item,
    position: i,
  }));
  return {
    items: merged,
    currentIndex: Math.min(queue.currentIndex + 1, merged.length - 1),
    version: queue.version + 1,
  };
}

export function loveCurrent(queue: AdaptiveQueueState): AdaptiveQueueState {
  const items = queue.items.map((item, i) => {
    if (i === queue.currentIndex) return { ...item, score: Math.min(1, item.score + 0.15) };
    // Boost similar future items slightly (same primary artist)
    if (i > queue.currentIndex && !item.locked) {
      const cur = queue.items[queue.currentIndex];
      const sameArtist = cur.track.artistIds.some((a) => item.track.artistIds.includes(a));
      if (sameArtist) return { ...item, score: Math.min(1, item.score + 0.05) };
    }
    return item;
  });
  return { ...queue, items, version: queue.version + 1 };
}

export function dislikeCurrent(queue: AdaptiveQueueState): AdaptiveQueueState {
  const cur = queue.items[queue.currentIndex];
  if (!cur) return queue;
  const items = queue.items
    .map((item, i) => {
      if (i === queue.currentIndex) return { ...item, score: 0 };
      if (i > queue.currentIndex && !item.locked) {
        const sameArtist = cur.track.artistIds.some((a) => item.track.artistIds.includes(a));
        if (sameArtist) return { ...item, score: item.score * 0.4 };
      }
      return item;
    })
    .filter((item, i) => i <= queue.currentIndex || item.score > 0.05);

  const past = items.filter((_, i) => i <= queue.currentIndex);
  const future = items
    .filter((_, i) => i > queue.currentIndex)
    .sort((a, b) => b.score - a.score);
  const merged = [...past, ...future].map((item, i) => ({ ...item, position: i }));

  return {
    items: merged,
    currentIndex: Math.min(queue.currentIndex + 1, merged.length - 1),
    version: queue.version + 1,
  };
}

export function appendToQueue(
  queue: AdaptiveQueueState,
  recs: RecommendedTrack[]
): AdaptiveQueueState {
  const existing = new Set(queue.items.map((i) => i.track.id));
  const newItems = recs
    .filter((r) => !existing.has(r.track.id))
    .map((r, i) => ({
      track: r.track,
      score: r.score,
      position: queue.items.length + i,
      locked: false,
      source: "recommendation" as const,
    }));
  return {
    items: [...queue.items, ...newItems],
    currentIndex: queue.currentIndex,
    version: queue.version + 1,
  };
}
