"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { GlassPanel } from "@/components/GlassPanel";
import { TrackRow } from "@/components/TrackRow";
import { MiniPlayer } from "@/components/MiniPlayer";
import { BottomNav } from "@/components/BottomNav";
import {
  generateGenreMoodRecommendations,
  getTopLevelGenreOptions,
  type GenreMoodResponse,
} from "@/lib/genre-mood-engine";
import { cn } from "@/lib/utils";

export function SectionPage({
  title,
  subtitle,
  defaultGenres,
  defaultMoods,
  depth = 50,
}: {
  title: string;
  subtitle: string;
  defaultGenres: string[];
  defaultMoods: string[];
  depth?: number;
}) {
  const [response, setResponse] = useState<GenreMoodResponse | null>(null);
  const [isPending, startTransition] = useTransition();
  const genreOptions = useMemo(() => getTopLevelGenreOptions(), []);

  const load = useCallback(() => {
    startTransition(async () => {
      const res = await generateGenreMoodRecommendations({
        genres: defaultGenres,
        moods: defaultMoods,
        discoveryDepth: depth,
        limit: 16,
      });
      setResponse(res);
    });
  }, [defaultGenres, defaultMoods, depth]);

  useEffect(() => {
    load();
  }, [load]);

  const recs = response?.recommendations ?? [];

  return (
    <div className="relative min-h-dvh bg-background pb-44">
      <header className="safe-top relative z-30 px-5 pb-2 pt-5">
        <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted">RESONANT</p>
        <h1 className="mt-0.5 text-xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-xs text-muted">{subtitle}</p>
      </header>

      <main className="relative z-20 space-y-4 px-4 pt-3">
        <div className="flex flex-wrap gap-1.5">
          {defaultGenres.map((g) => (
            <span
              key={g}
              className="rounded-full bg-accent/20 px-3 py-1 text-[11px] font-medium text-accent"
            >
              {genreOptions.find((o) => o.id === g)?.label ?? g}
            </span>
          ))}
          {defaultMoods.map((m) => (
            <span key={m} className="glass rounded-full px-3 py-1 text-[11px] capitalize text-white/70">
              {m}
            </span>
          ))}
        </div>

        <GlassPanel variant="panel" className="overflow-hidden p-1">
          {recs.length === 0 && !isPending && (
            <p className="px-4 py-8 text-center text-sm text-muted">Loading discoveries…</p>
          )}
          {isPending && recs.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-muted">Updating…</p>
          )}
          {recs.map((rec, i) => (
            <TrackRow key={`${rec.track.id}-${i}`} rec={rec} index={i + 1} showReason />
          ))}
        </GlassPanel>

        <button
          type="button"
          onClick={load}
          disabled={isPending}
          className={cn(
            "glass w-full rounded-xl py-3 text-sm pressable touch-manipulation",
            isPending && "opacity-50"
          )}
        >
          Refresh
        </button>
      </main>

      <MiniPlayer />
      <BottomNav />
    </div>
  );
}
