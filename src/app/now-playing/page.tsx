"use client";

import { usePlayerStore } from "@/stores/player";
import { formatDuration } from "@/lib/utils";
import { Play, Pause, SkipBack, SkipForward, Heart, ChevronDown, Share2 } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { GlassPanel } from "@/components/GlassPanel";

export default function NowPlayingPage() {
  const { track, isPlaying, positionMs, durationMs, reason, toggle, next, prev, queue } =
    usePlayerStore();

  if (!track) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 text-center">
        <p className="text-muted">Nothing playing</p>
        <Link href="/" className="mt-4 text-accent underline">
          Back to Home
        </Link>
      </div>
    );
  }

  const progress = durationMs > 0 ? Math.min(100, (positionMs / durationMs) * 100) : 0;

  return (
    <div className="relative min-h-dvh overflow-hidden bg-background">
      {/* Artwork ambient */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-accent/20 via-background to-background" />
        <div className="absolute -top-20 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-accent/15 blur-[140px]" />
      </div>

      <div className="relative z-10 flex min-h-dvh flex-col">
        {/* Header */}
        <div className="safe-top flex items-center justify-between px-5 pt-4">
          <Link
            href="/"
            className="flex h-10 w-10 items-center justify-center rounded-full glass pressable"
          >
            <ChevronDown size={20} />
          </Link>
          <p className="text-xs font-medium uppercase tracking-widest text-muted">Now Playing</p>
          <button className="flex h-10 w-10 items-center justify-center rounded-full glass pressable">
            <Share2 size={18} />
          </button>
        </div>

        {/* Artwork */}
        <div className="flex flex-1 flex-col items-center justify-center px-8 py-6">
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 24 }}
            className="aspect-square w-full max-w-sm overflow-hidden rounded-3xl shadow-2xl"
          >
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-accent/50 via-warm/30 to-black/80 text-6xl font-light tracking-tighter text-white/40">
              {track.artistNames[0]?.charAt(0) ?? "R"}
            </div>
          </motion.div>

          {/* Meta */}
          <div className="mt-8 w-full max-w-sm text-center">
            <h1 className="text-2xl font-semibold tracking-tight">{track.title}</h1>
            <p className="mt-1 text-base text-muted">{track.artistNames.join(", ")}</p>
            {track.albumTitle && (
              <p className="mt-0.5 text-sm text-muted/70">
                {track.albumTitle}
                {track.year ? ` · ${track.year}` : ""}
              </p>
            )}
          </div>

          {/* Reason */}
          {reason && (
            <GlassPanel className="mt-6 w-full max-w-sm px-4 py-3 text-left">
              <p className="text-[11px] uppercase tracking-wider text-muted">Why this track</p>
              <p className="mt-1 text-sm leading-snug text-white/90">{reason.primary}</p>
            </GlassPanel>
          )}
        </div>

        {/* Controls */}
        <div className="safe-bottom px-6 pb-8">
          {/* Progress */}
          <div className="mb-2 flex items-center justify-between text-[11px] tabular-nums text-muted">
            <span>{formatDuration(positionMs)}</span>
            <span>{formatDuration(durationMs)}</span>
          </div>
          <div className="mb-6 h-1 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-accent transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-center gap-6">
            <button
              onClick={prev}
              className="rounded-full p-3 text-white/70 hover:text-white pressable"
              aria-label="Previous"
            >
              <SkipBack size={24} />
            </button>
            <button
              onClick={toggle}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-black shadow-lg pressable"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause size={28} fill="currentColor" />
              ) : (
                <Play size={28} fill="currentColor" className="ml-1" />
              )}
            </button>
            <button
              onClick={next}
              className="rounded-full p-3 text-white/70 hover:text-white pressable"
              aria-label="Next"
            >
              <SkipForward size={24} />
            </button>
          </div>

          <div className="mt-6 flex justify-center">
            <button className="flex items-center gap-2 rounded-full glass px-5 py-2.5 text-sm pressable">
              <Heart size={16} />
              Love
            </button>
          </div>

          {queue.length > 0 && (
            <p className="mt-4 text-center text-xs text-muted">
              {queue.length} tracks in queue
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
