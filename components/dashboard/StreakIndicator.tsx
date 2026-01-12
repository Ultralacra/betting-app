"use client";

import { useStreaks, getStreakDisplay } from "@/hooks/useStreaks";
import type { DayResult } from "@/lib/betting-types";
import { cn } from "@/lib/utils";
import { Flame, TrendingUp, TrendingDown, Award } from "lucide-react";

interface StreakIndicatorProps {
  plan: DayResult[];
  size?: "sm" | "md" | "lg";
  showStats?: boolean;
}

export function StreakIndicator({
  plan,
  size = "md",
  showStats = false,
}: StreakIndicatorProps) {
  const streak = useStreaks(plan);
  const display = getStreakDisplay(streak);

  const sizeClasses = {
    sm: "text-sm px-2 py-1",
    md: "text-base px-3 py-1.5",
    lg: "text-lg px-4 py-2",
  };

  const iconSize = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  if (streak.currentStreak === 0 && !showStats) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Main streak badge */}
      <div
        className={cn(
          "inline-flex items-center gap-2 rounded-full font-medium",
          display.bgColor,
          display.color,
          sizeClasses[size]
        )}
      >
        <span className={streak.type === "win" && streak.currentStreak >= 3 ? "animate-fire" : ""}>
          {display.emoji}
        </span>
        <span>{display.label}</span>
      </div>

      {/* Extended stats */}
      {showStats && (
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-2 rounded-lg bg-chart-2/10 px-3 py-2">
            <TrendingUp className={cn(iconSize[size], "text-chart-2")} />
            <div>
              <div className="text-xs text-muted-foreground">Mejor racha</div>
              <div className="font-semibold text-chart-2">
                {streak.longestWinStreak} días
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2">
            <TrendingDown className={cn(iconSize[size], "text-destructive")} />
            <div>
              <div className="text-xs text-muted-foreground">Peor racha</div>
              <div className="font-semibold text-destructive">
                {streak.longestLoseStreak} días
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2">
            <Award className={cn(iconSize[size], "text-primary")} />
            <div>
              <div className="text-xs text-muted-foreground">Días ganados</div>
              <div className="font-semibold text-primary">
                {streak.totalWins}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
            <Flame className={cn(iconSize[size], "text-muted-foreground")} />
            <div>
              <div className="text-xs text-muted-foreground">Win rate</div>
              <div className="font-semibold">
                {streak.totalWins + streak.totalLosses > 0
                  ? Math.round(
                      (streak.totalWins /
                        (streak.totalWins + streak.totalLosses)) *
                        100
                    )
                  : 0}
                %
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
