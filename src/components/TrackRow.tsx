"use client";

import { memo, useCallback } from "react";
import { cn, formatDuration } from "@/lib/utils";
import type { RecommendedTrack, Track } from "@/types/music";
import { usePlayerStore } from "@/stores/player";
import { getPlatformLinks } from "@/lib/external-links";
import { Play, Pause, ExternalLink } from "lucide-react";

interface TrackRowProps {
  rec?: RecommendedTrack;
  track?: Track;
  index?: number;
  showReason?: boolean;
  className?: string;
}

function TrackRowInner({
  rec,
  track: trackProp,
  index,
  showReason = false,
  className,
}: TrackRowProps) {
  const track = rec?.track ?? trackProp;
  const reason = rec?.reason;
  const currentId = usePlayerStore((s) => s.track?.id);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const playRecommended = usePlayerStore((s) => s.playRecommended);
  const play = usePlayerStore((s) => s.play);
  const toggle = usePlayerStore((s) => s.toggle);

  const isCurrent = track ? currentId === track.id : false;
  const playing = isCurrent && isPlaying;

  const handlePlay = useCallback(() => {
    if (!track) return;
    if (isCurrent) {
      toggle();
    } else if (rec) {
      playRecommended(rec);
    } else {
      play(track);
    }
  }, [track, isCurrent, toggle, rec, playRecommended, play]);

  if (!track) return null;

  const links = getPlatformLinks(track);

  return (
    <div
      className={cn(
        "group relative z-10 flex flex-col gap-2 rounded-xl px-3 py-2.5 transition-colors",
        "hover:bg-white/[0.04] active:bg-white/[0.06]",
        isCurrent && "bg-white/[0.06]",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handlePlay}
          className={cn(
            "relative z-20 flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
            "bg-white/[0.08] text-white/90 transition-colors",
            "hover:bg-accent hover:text-white pressable touch-manipulation",
            playing && "bg-accent text-white"
          )}
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? (
            <Pause size={16} fill="currentColor" />
          ) : (
            <Play size={16} fill="currentColor" className="ml-0.5" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            {typeof index === "number" && (
              <span className="w-4 text-xs tabular-nums text-muted">{index}</span>
            )}
            <p className={cn("truncate text-sm font-medium", isCurrent && "text-accent")}>
              {track.title}
            </p>
          </div>
          <p className="truncate text-xs text-muted">
            {track.artistNames.join(", ")}
            {track.year ? ` · ${track.year}` : ""}
            {track.durationMs ? ` · ${formatDuration(track.durationMs)}` : ""}
          </p>
          {showReason && reason?.primary && (
            <p className="mt-0.5 truncate text-[11px] text-muted/80">{reason.primary}</p>
          )}
        </div>
      </div>

      <div
        className="relative z-20 flex flex-wrap items-center gap-1.5 pl-[52px]"
        onClick={(e) => e.stopPropagation()}
      >
        {links.map((link) => (
          <a
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.06] px-2 py-1",
              "text-[10px] font-medium text-white/75 transition-colors",
              "hover:border-accent/40 hover:bg-accent/15 hover:text-white",
              "pressable touch-manipulation"
            )}
            aria-label={`Open on ${link.label}`}
          >
            <ExternalLink size={10} className="opacity-70" />
            {link.label}
          </a>
        ))}
      </div>
    </div>
  );
}

export const TrackRow = memo(TrackRowInner);
