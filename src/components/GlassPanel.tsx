"use client";

import { cn } from "@/lib/utils";
import { forwardRef, type HTMLAttributes } from "react";

interface GlassPanelProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "strong" | "panel";
  className?: string;
  children: React.ReactNode;
}

export const GlassPanel = forwardRef<HTMLDivElement, GlassPanelProps>(
  ({ variant = "default", className, children, ...props }, ref) => {
    const base =
      variant === "strong"
        ? "glass-strong"
        : variant === "panel"
          ? "glass-panel"
          : "glass";

    return (
      <div ref={ref} className={cn("relative rounded-2xl", base, className)} {...props}>
        {children}
      </div>
    );
  }
);

GlassPanel.displayName = "GlassPanel";
