"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { GlassPanel } from "@/components/GlassPanel";
import { TrackRow } from "@/components/TrackRow";
import { MiniPlayer } from "@/components/MiniPlayer";
import { BottomNav } from "@/components/BottomNav";
import {
  generateGenreMoodRecommendations,
  getTopLevelGenreOptions,
  clearSession,
  getSessionSeenSize,
  type GenreMoodResponse,
} from "@/lib/genre-mood-engine";
import { UI_MOOD_CHIPS } from "@/lib/mood-model";
import { RefreshCw, Plus, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

// Lazy debug panel — not critical path
const DebugPanel = dynamic(
  () =>
    Promise.resolve(function DebugPanelInner({
      response,
    }: {
      response: GenreMoodResponse;
    }) {
      return (
        <GlassPanel className="relative z-20 space-y-1 p-3 text-[11px] leading-relaxed text-white/70">
          <p>
            <span className="text-accent">Genres:</span> {response.selectedGenres.join(", ")}
          </p>
          <p>
            <span className="text-accent">Moods:</span> {response.selectedMoods.join(", ")}
          </p>
          <p>
            <span className="text-accent">Queries:</span> {response.queries.slice(0, 6).join(" · ")}
            {response.queries.length > 6 ? "…" : ""}
          </p>
          <p>
            RAW {response.stats.raw} → RANKED {response.stats.ranked} → FINAL{" "}
            {response.health.finalCount}
          </p>
          <p>
            Genre Health {(response.health.genreHealth * 100).toFixed(0)}% · Mood Health{" "}
            {(response.health.moodHealth * 100).toFixed(0)}% · Rec Health{" "}
            {(response.health.recommendationHealth * 100).toFixed(0)}%
          </p>
          <p>
            Fallback L{response.fallbackLevel} · Session seen {getSessionSeenSize()} · Artists{" "}
            {response.health.uniqueArtists}
          </p>
          <p>
            <span className="text-accent">Taste DNA:</span> {response.dnaSummary ?? "—"}
          </p>
          <p>DNA confidence {((response.dnaConfidence ?? 0) * 100).toFixed(0)}%</p>
        </GlassPanel>
      );
    }),
  { ssr: false }
);

export default function HomePage() {
  const genreOptions = useMemo(() => getTopLevelGenreOptions(), []);
  const [selectedGenres, setSelectedGenres] = useState<string[]>(["jazz"]);
  const [selectedMoods, setSelectedMoods] = useState<string[]>(["nocturnal"]);
  const [discoveryDepth, setDiscoveryDepth] = useState(55);
  const [response, setResponse] = useState<GenreMoodResponse | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showDebug, setShowDebug] = useState(false);

  const runQuery = useCallback(
    (genres: string[], moods: string[], depth: number, append = false) => {
      startTransition(async () => {
        try {
          let excludeIds: string[] = [];
          if (append) {
            // Read latest recommendations via functional state access pattern
            setResponse((prev) => {
              excludeIds = prev ? prev.recommendations.map((r) => r.track.id) : [];
              return prev;
            });
          }
          // Small yield so setResponse above applies before we read — use previous snapshot for exclude
          const res = await generateGenreMoodRecommendations({
            genres,
            moods,
            discoveryDepth: depth,
            limit: 16,
            excludeIds: append ? excludeIds : [],
          });
          if (append) {
            setResponse((prev) =>
              prev
                ? {
                    ...res,
                    recommendations: [...prev.recommendations, ...res.recommendations],
                  }
                : res
            );
          } else {
            setResponse(res);
          }
        } catch (err) {
          console.error("[RESONANT] recommendation failed", err);
        }
      });
    },
    []
  );

  useEffect(() => {
    runQuery(selectedGenres, selectedMoods, discoveryDepth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Exclusive selection: one primary genre (and mood) at a time so taps always change the universe.
  const selectGenre = useCallback(
    (id: string) => {
      setSelectedGenres([id]);
      runQuery([id], selectedMoods, discoveryDepth);
    },
    [runQuery, selectedMoods, discoveryDepth]
  );

  const selectMood = useCallback(
    (id: string) => {
      setSelectedMoods([id]);
      runQuery(selectedGenres, [id], discoveryDepth);
    },
    [runQuery, selectedGenres, discoveryDepth]
  );

  const handleFresh = useCallback(() => {
    runQuery(selectedGenres, selectedMoods, discoveryDepth, false);
  }, [runQuery, selectedGenres, selectedMoods, discoveryDepth]);

  const handleShowMore = useCallback(() => {
    runQuery(selectedGenres, selectedMoods, discoveryDepth, true);
  }, [runQuery, selectedGenres, selectedMoods, discoveryDepth]);

  const handleDepthChange = useCallback(
    (v: number) => {
      setDiscoveryDepth(v);
      runQuery(selectedGenres, selectedMoods, v);
    },
    [runQuery, selectedGenres, selectedMoods]
  );

  const recs = response?.recommendations ?? [];

  return (
    <div className="relative min-h-dvh bg-background pb-44">
      {/* Decorative glow — never intercepts input */}
      <div
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
        aria-hidden
      >
        <div className="absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-accent/10 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-warm/5 blur-[100px]" />
      </div>

      <header className="safe-top relative z-30 px-5 pb-2 pt-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted">
              Genre × Mood Engine
            </p>
            <h1 className="mt-0.5 text-xl font-semibold tracking-tight">RESONANT</h1>
          </div>
          <div className="relative z-30 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowDebug((s) => !s)}
              className="glass relative z-30 flex h-9 w-9 items-center justify-center rounded-full pressable touch-manipulation"
              aria-label="Debug"
            >
              <Activity size={16} className={showDebug ? "text-accent" : "text-muted"} />
            </button>
            <button
              type="button"
              onClick={handleFresh}
              disabled={isPending}
              className="glass relative z-30 flex h-9 items-center gap-1.5 rounded-full px-3 text-xs pressable touch-manipulation disabled:opacity-50"
            >
              <RefreshCw size={14} className={cn(isPending && "animate-spin")} />
              Fresh
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-30 space-y-5 px-4 pt-3">
        {/* Genre chips — explicit pointer-events + touch */}
        <section className="relative z-30">
          <p className="mb-2 px-1 text-[10px] uppercase tracking-[0.18em] text-muted">Genre</p>
          <div className="relative z-30 flex flex-wrap gap-1.5">
            {genreOptions.map((g) => {
              const active = selectedGenres.includes(g.id);
              return (
                <button
                  key={g.id}
                  type="button"
                  data-testid={`genre-${g.id}`}
                  onClick={() => selectGenre(g.id)}
                  onPointerUp={(e) => {
                    // Prefer pointerup for mobile; ignore secondary buttons
                    if (e.button !== 0 && e.pointerType === "mouse") return;
                  }}
                  className={cn(
                    "relative z-40 min-h-[44px] min-w-[44px] cursor-pointer touch-manipulation select-none rounded-full px-3.5 py-2.5 text-[12px] font-medium transition-colors",
                    "pointer-events-auto isolate",
                    active
                      ? "bg-accent text-black shadow-[0_0_20px_rgba(232,90,42,0.35)]"
                      : "glass text-white/70 hover:text-white"
                  )}
                  aria-pressed={active}
                >
                  {g.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* Mood chips */}
        <section className="relative z-30">
          <p className="mb-2 px-1 text-[10px] uppercase tracking-[0.18em] text-muted">
            Mood / Vibe
          </p>
          <div className="relative z-30 flex flex-wrap gap-1.5">
            {UI_MOOD_CHIPS.map((m) => {
              const active = selectedMoods.includes(m);
              return (
                <button
                  key={m}
                  type="button"
                  data-testid={`mood-${m}`}
                  onClick={() => selectMood(m)}
                  className={cn(
                    "relative z-40 min-h-[44px] min-w-[44px] cursor-pointer touch-manipulation select-none rounded-full px-3.5 py-2.5 text-[12px] capitalize transition-colors",
                    "pointer-events-auto isolate",
                    active
                      ? "border border-accent/40 bg-white/15 text-accent"
                      : "glass text-white/60 hover:text-white"
                  )}
                  aria-pressed={active}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </section>

        {/* Discovery depth */}
        <section className="relative z-30 px-1">
          <div className="flex items-center justify-between text-[10px] text-muted">
            <span>Discovery Depth</span>
            <span className="text-accent">
              {discoveryDepth <= 20
                ? "Familiar"
                : discoveryDepth <= 40
                  ? "Adjacent"
                  : discoveryDepth <= 60
                    ? "Deep Discovery"
                    : discoveryDepth <= 80
                      ? "Obscure"
                      : "Experimental"}{" "}
              · {discoveryDepth}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={discoveryDepth}
            onChange={(e) => handleDepthChange(Number(e.target.value))}
            className="relative z-30 mt-1.5 w-full touch-manipulation accent-[var(--accent)]"
          />
          <div className="mt-1 flex justify-between text-[9px] text-white/30">
            <span>Known</span>
            <span>Adjacent</span>
            <span>Deep</span>
            <span>Obscure</span>
            <span>Experimental</span>
          </div>
        </section>

        {showDebug && response && (
          <div className="relative z-20">
            <DebugPanel response={response} />
          </div>
        )}

        {/* Results */}
        <section className="relative z-20">
          <div className="mb-2 flex items-end justify-between px-1">
            <div>
              <h2 className="text-base font-semibold">
                {selectedGenres
                  .map((g) => genreOptions.find((o) => o.id === g)?.label ?? g)
                  .join(" + ")}
                {selectedMoods.length ? ` · ${selectedMoods.join(" · ")}` : ""}
              </h2>
              <p className="text-[11px] text-muted">
                {recs.length} tracks · health{" "}
                {response
                  ? `${(response.health.recommendationHealth * 100).toFixed(0)}%`
                  : "—"}
                {isPending ? " · updating…" : ""}
              </p>
            </div>
          </div>

          <GlassPanel variant="panel" className="relative z-20 overflow-hidden p-1">
            {recs.length === 0 && !isPending && (
              <p className="px-4 py-8 text-center text-sm text-muted">
                No results — try another genre or mood…
              </p>
            )}
            {recs.map((rec, i) => (
              <TrackRow key={`${rec.track.id}-${i}`} rec={rec} index={i + 1} showReason />
            ))}
          </GlassPanel>

          <div className="relative z-20 mt-3 flex gap-2">
            <button
              type="button"
              onClick={handleShowMore}
              disabled={isPending}
              className="glass flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm pressable touch-manipulation disabled:opacity-50"
            >
              <Plus size={16} />
              Show More
            </button>
            <button
              type="button"
              onClick={() => {
                clearSession();
                handleFresh();
              }}
              className="glass rounded-xl px-4 py-3 text-xs text-muted pressable touch-manipulation"
            >
              Reset Session
            </button>
          </div>
        </section>
      </main>

      <MiniPlayer />
      <BottomNav />
    </div>
  );
}
