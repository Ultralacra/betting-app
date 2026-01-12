"use client";

import { useMemo } from "react";
import type { DayResult } from "@/lib/betting-types";
import { calculateStreaks, type StreakInfo } from "@/lib/analytics";

/**
 * Hook to calculate and track betting streaks
 */
export function useStreaks(plan: DayResult[]): StreakInfo {
    return useMemo(() => calculateStreaks(plan), [plan]);
}

/**
 * Get emoji and label for streak display
 */
export function getStreakDisplay(streak: StreakInfo): {
    emoji: string;
    label: string;
    color: string;
    bgColor: string;
} {
    if (streak.currentStreak === 0 || streak.type === "none") {
        return {
            emoji: "📊",
            label: "Sin racha",
            color: "text-foreground",
            bgColor: "bg-secondary",
        };
    }

    if (streak.type === "win") {
        if (streak.currentStreak >= 7) {
            return {
                emoji: "🔥",
                label: `${streak.currentStreak} días ganando`,
                color: "text-orange-500",
                bgColor: "bg-orange-500/10",
            };
        }
        if (streak.currentStreak >= 3) {
            return {
                emoji: "⚡",
                label: `${streak.currentStreak} días ganando`,
                color: "text-yellow-500",
                bgColor: "bg-yellow-500/10",
            };
        }
        return {
            emoji: "✅",
            label: `${streak.currentStreak} día${streak.currentStreak > 1 ? "s" : ""} ganando`,
            color: "text-chart-2",
            bgColor: "bg-chart-2/10",
        };
    }

    // Losing streak
    if (streak.currentStreak >= 5) {
        return {
            emoji: "❄️",
            label: `${streak.currentStreak} días perdiendo`,
            color: "text-blue-500",
            bgColor: "bg-blue-500/10",
        };
    }
    if (streak.currentStreak >= 3) {
        return {
            emoji: "📉",
            label: `${streak.currentStreak} días perdiendo`,
            color: "text-destructive",
            bgColor: "bg-destructive/10",
        };
    }
    return {
        emoji: "⚠️",
        label: `${streak.currentStreak} día${streak.currentStreak > 1 ? "s" : ""} perdiendo`,
        color: "text-yellow-600",
        bgColor: "bg-yellow-600/10",
    };
}
