"use client";

import { useMemo, useState, useTransition } from "react";
import { GlassPanel } from "@/components/GlassPanel";
import { TrackRow } from "@/components/TrackRow";
import { MiniPlayer } from "@/components/MiniPlayer";
import { BottomNav } from "@/components/BottomNav";
import { generateGenreMoodRecommendations, getTopLevelGenreOptions } from "@/lib/genre-mood-engine";
import type { RecommendedTrack } from "@/types/music";
import { Search } from "lucide-react";

export default function SearchPage() {
  const genres = useMemo(() => getTopLevelGenreOptions(), []);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<RecommendedTrack[]>([]);
  const [pending, start] = useTransition();

  const run = (genreId?: string) => {
    start(async () => {
      const g = genreId ? [genreId] : q ? [q.toLowerCase().replace(/\s+/g, "-")] : ["electronic"];
      const res = await generateGenreMoodRecommendations({
        genres: g,
        moods: [],
        discoveryDepth: 50,
        limit: 20,
      });
      setResults(res.recommendations);
    });
  };

  return (
    <div className="relative min-h-dvh bg-background pb-44">
      <header className="safe-top relative z-30 px-5 pb-2 pt-5">
        <h1 className="text-xl font-semibold">Search</h1>
        <p className="mt-1 text-xs text-muted">Genre-led discovery search</p>
      </header>
      <main className="relative z-20 space-y-4 px-4 pt-3">
        <div className="glass relative z-30 flex items-center gap-2 rounded-xl px-3 py-2">
          <Search size={16} className="text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && run()}
            placeholder="Genre or mood…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-white/30"
          />
          <button
            type="button"
            onClick={() => run()}
            className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-black pressable touch-manipulation"
          >
            Go
          </button>
        </div>
        <div className="relative z-30 flex flex-wrap gap-1.5">
          {genres.slice(0, 12).map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => run(g.id)}
              className="glass rounded-full px-3 py-1.5 text-[11px] pressable touch-manipulation"
            >
              {g.label}
            </button>
          ))}
        </div>
        <GlassPanel variant="panel" className="overflow-hidden p-1">
          {pending && results.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-muted">Searching…</p>
          )}
          {results.map((rec, i) => (
            <TrackRow key={`${rec.track.id}-${i}`} rec={rec} index={i + 1} showReason />
          ))}
        </GlassPanel>
      </main>
      <MiniPlayer />
      <BottomNav />
    </div>
  );
}
