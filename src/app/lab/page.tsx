"use client";

import { useState, useTransition } from "react";
import { GlassPanel } from "@/components/GlassPanel";
import { MiniPlayer } from "@/components/MiniPlayer";
import { BottomNav } from "@/components/BottomNav";
import { runFullStress, formatStressReport, type StressReport } from "@/lib/eval-lab";

export default function LabPage() {
  const [report, setReport] = useState<StressReport | null>(null);
  const [pending, start] = useTransition();
  const [log, setLog] = useState("");

  const run = () => {
    start(async () => {
      try {
        const r = await runFullStress(1);
        setReport(r);
        setLog(formatStressReport(r));
      } catch (e: unknown) {
        setLog(`Error: ${e instanceof Error ? e.message : String(e)}`);
      }
    });
  };

  return (
    <div className="relative min-h-dvh bg-background pb-44">
      <header className="safe-top relative z-30 px-5 pb-2 pt-5">
        <h1 className="text-xl font-semibold">Evaluation Lab</h1>
        <p className="mt-1 text-xs text-muted">Stress-test recommendation health across genre × mood</p>
      </header>
      <main className="relative z-20 space-y-4 px-4 pt-3">
        <button
          type="button"
          onClick={run}
          disabled={pending}
          className="w-full rounded-xl bg-accent py-3 text-sm font-medium text-black pressable touch-manipulation disabled:opacity-50"
        >
          {pending ? "Running…" : "Run stress suite"}
        </button>
        {report && (
          <GlassPanel className="space-y-1 p-3 text-xs">
            <p>
              Overall: <span className="text-accent font-semibold">{report.overall}</span>
            </p>
            <p>
              Cases {report.casesRun} · Passed {report.passed} · Failed {report.failed}
            </p>
            <p>Zero batches: {report.zeroBatches}</p>
            <p>
              Unique tracks {report.uniqueTracks} · artists {report.uniqueArtists}
            </p>
          </GlassPanel>
        )}
        {log && (
          <pre className="glass max-h-96 overflow-auto rounded-xl p-3 text-[10px] leading-relaxed text-white/70 whitespace-pre-wrap">
            {log}
          </pre>
        )}
      </main>
      <MiniPlayer />
      <BottomNav />
    </div>
  );
}
