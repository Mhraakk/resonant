"use client";

import { useState, useTransition } from "react";
import { GlassPanel } from "@/components/GlassPanel";
import { TrackRow } from "@/components/TrackRow";
import { MiniPlayer } from "@/components/MiniPlayer";
import { BottomNav } from "@/components/BottomNav";
import { applyAgentCommand, createAgentState, agentMoods } from "@/lib/agent-controller";
import { generateGenreMoodRecommendations } from "@/lib/genre-mood-engine";
import type { RecommendedTrack } from "@/types/music";

const SUGGESTIONS = [
  "Make it darker",
  "Warmer and more organic",
  "Take me deeper",
  "No vocals",
  "More energy",
  "Less mainstream",
];

export default function AIPage() {
  const [cmd, setCmd] = useState("");
  const [agent, setAgent] = useState(() => createAgentState(["jazz", "trip-hop"], ["nocturnal"], 55));
  const [interpretation, setInterpretation] = useState("");
  const [recs, setRecs] = useState<RecommendedTrack[]>([]);
  const [pending, start] = useTransition();

  const run = (text: string) => {
    const result = applyAgentCommand(agent, text);
    setAgent(result.state);
    setInterpretation(result.interpretation + (result.applied.length ? ` (${result.applied.join(", ")})` : ""));
    start(async () => {
      const res = await generateGenreMoodRecommendations({
        genres: result.state.genres,
        moods: agentMoods(result.state),
        discoveryDepth: result.state.discoveryDepth,
        limit: 14,
      });
      setRecs(res.recommendations);
    });
  };

  return (
    <div className="relative min-h-dvh bg-background pb-44">
      <header className="safe-top relative z-30 px-5 pb-2 pt-5">
        <h1 className="text-xl font-semibold">AI Companion</h1>
        <p className="mt-1 text-xs text-muted">Command the recommendation state in natural language</p>
      </header>
      <main className="relative z-20 space-y-4 px-4 pt-3">
        <div className="glass relative z-30 flex gap-2 rounded-xl p-2">
          <input
            value={cmd}
            onChange={(e) => setCmd(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && cmd.trim() && run(cmd.trim())}
            placeholder="e.g. Make it darker…"
            className="flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-white/30"
          />
          <button
            type="button"
            onClick={() => cmd.trim() && run(cmd.trim())}
            className="rounded-lg bg-accent px-3 py-2 text-xs font-medium text-black pressable touch-manipulation"
          >
            Apply
          </button>
        </div>
        <div className="relative z-30 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => run(s)}
              className="glass rounded-full px-3 py-1.5 text-[11px] pressable touch-manipulation"
            >
              {s}
            </button>
          ))}
        </div>
        {interpretation && (
          <p className="text-xs text-accent/90">{interpretation}</p>
        )}
        <GlassPanel variant="panel" className="overflow-hidden p-1">
          {pending && recs.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-muted">Thinking…</p>
          )}
          {recs.map((rec, i) => (
            <TrackRow key={`${rec.track.id}-${i}`} rec={rec} index={i + 1} showReason />
          ))}
        </GlassPanel>
      </main>
      <MiniPlayer />
      <BottomNav />
    </div>
  );
}
