"use client";

import { useEffect, useRef } from "react";
import { usePlayerStore } from "@/stores/player";
import { getPlatformLinks } from "@/lib/external-links";
import { cn } from "@/lib/utils";
import { Play, Pause, SkipForward, SkipBack, ExternalLink, X } from "lucide-react";
import Link from "next/link";

export function MiniPlayer() {
  const track = usePlayerStore((s) => s.track);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const playbackMode = usePlayerStore((s) => s.playbackMode);
  const playbackMessage = usePlayerStore((s) => s.playbackMessage);
  const toggle = usePlayerStore((s) => s.toggle);
  const next = usePlayerStore((s) => s.next);
  const prev = usePlayerStore((s) => s.prev);
  const clearMessage = usePlayerStore((s) => s.clearMessage);
  const openExternally = usePlayerStore((s) => s.openExternally);
  const markPlaying = usePlayerStore((s) => s.markPlaying);
  const markPlaybackFailed = usePlayerStore((s) => s.markPlaybackFailed);
  const pause = usePlayerStore((s) => s.pause);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Real audio lifecycle: only enter "playing" after play() resolves
  useEffect(() => {
    const el = audioRef.current;
    if (!el || !track) return;

    if (!track.previewUrl) {
      el.removeAttribute("src");
      el.load();
      return;
    }

    let cancelled = false;
    el.src = track.previewUrl;
    el.load();

    const tryPlay = async () => {
      try {
        await el.play();
        if (!cancelled) markPlaying();
      } catch (err) {
        if (!cancelled) {
          markPlaybackFailed(
            err instanceof Error ? err.message : "Playback was blocked or failed"
          );
        }
      }
    };

    if (playbackMode === "loading") {
      void tryPlay();
    }

    return () => {
      cancelled = true;
      el.pause();
    };
  }, [track?.id, track?.previewUrl, playbackMode, markPlaying, markPlaybackFailed]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    if (isPlaying && playbackMode === "preview") {
      void el.play().catch(() => markPlaybackFailed("Resume failed"));
    } else {
      el.pause();
    }
  }, [isPlaying, playbackMode, markPlaybackFailed]);

  if (!track) return null;

  const links = getPlatformLinks(track);
  const externalOnly =
    playbackMode === "external_only" || playbackMode === "error";

  return (
    <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-50 safe-bottom">
      <audio ref={audioRef} preload="none" className="hidden" />

      <div className="pointer-events-auto mx-auto max-w-lg px-3 pb-[4.5rem]">
        {playbackMessage && (
          <div className="mb-2 rounded-xl border border-accent/30 bg-background/95 px-3 py-2.5 text-[11px] leading-snug text-white/85 shadow-lg backdrop-blur-md">
            <div className="flex items-start justify-between gap-2">
              <p>{playbackMessage}</p>
              <button
                type="button"
                onClick={clearMessage}
                className="shrink-0 rounded-full p-1 text-muted hover:text-white"
                aria-label="Dismiss"
              >
                <X size={14} />
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {links.map((l) => (
                <a
                  key={l.id}
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-medium hover:border-accent/50 hover:bg-accent/20"
                >
                  {l.label}
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="glass-strong relative overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
          <div className="flex items-center gap-3 px-3 py-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-accent/40 to-warm/20 text-xs font-medium text-white/60">
              {track.artistNames[0]?.slice(0, 2).toUpperCase() ?? "RN"}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{track.title}</p>
              <p className="truncate text-xs text-muted">
                {track.artistNames.join(", ")}
                {externalOnly ? " · open externally to listen" : ""}
                {playbackMode === "loading" ? " · loading…" : ""}
              </p>
            </div>

            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={prev}
                className="rounded-full p-2 text-white/70 hover:text-white pressable touch-manipulation"
                aria-label="Previous"
              >
                <SkipBack size={18} />
              </button>
              <button
                type="button"
                onClick={externalOnly ? openExternally : toggle}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full pressable touch-manipulation",
                  externalOnly ? "bg-accent text-white" : "bg-white text-black"
                )}
                aria-label={externalOnly ? "Open externally" : isPlaying ? "Pause" : "Play"}
              >
                {externalOnly ? (
                  <ExternalLink size={16} />
                ) : isPlaying ? (
                  <Pause size={18} fill="currentColor" />
                ) : (
                  <Play size={18} fill="currentColor" className="ml-0.5" />
                )}
              </button>
              <button
                type="button"
                onClick={next}
                className="rounded-full p-2 text-white/70 hover:text-white pressable touch-manipulation"
                aria-label="Next"
              >
                <SkipForward size={18} />
              </button>
            </div>

            <Link
              href="/now-playing"
              className="rounded-full p-2 text-white/50 hover:text-white pressable"
              aria-label="Now playing"
            >
              <ExternalLink size={16} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
