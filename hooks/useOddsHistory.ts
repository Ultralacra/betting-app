"use client";

import { useMemo } from "react";
import type { DayResult } from "@/lib/betting-types";
import { buildOddsHistory, type OddsHistoryEntry } from "@/lib/analytics";

export interface OddsStats {
    averageOdds: number;
    minOdds: number;
    maxOdds: number;
    mostUsedOdds: number;
    totalBets: number;
    winningOddsAverage: number;
    losingOddsAverage: number;
}

/**
 * Hook to track and analyze odds history
 */
export function useOddsHistory(plan: DayResult[]) {
    const history = useMemo(() => buildOddsHistory(plan), [plan]);

    const stats = useMemo((): OddsStats => {
        if (history.length === 0) {
            return {
                averageOdds: 0,
                minOdds: 0,
                maxOdds: 0,
                mostUsedOdds: 0,
                totalBets: 0,
                winningOddsAverage: 0,
                losingOddsAverage: 0,
            };
        }

        const odds = history.map((h) => h.odds);
        const sum = odds.reduce((acc, o) => acc + o, 0);
        const average = sum / odds.length;

        // Find most used odds (rounded to 2 decimals)
        const oddsCount = new Map<number, number>();
        for (const o of odds) {
            const rounded = Math.round(o * 100) / 100;
            oddsCount.set(rounded, (oddsCount.get(rounded) ?? 0) + 1);
        }
        let mostUsed = odds[0] ?? 0;
        let maxCount = 0;
        for (const [o, count] of oddsCount) {
            if (count > maxCount) {
                maxCount = count;
                mostUsed = o;
            }
        }

        // Calculate averages for winning and losing bets
        const winningBets = history.filter((h) => h.result === "win");
        const losingBets = history.filter((h) => h.result === "lose");

        const winningOddsSum = winningBets.reduce((acc, h) => acc + h.odds, 0);
        const losingOddsSum = losingBets.reduce((acc, h) => acc + h.odds, 0);

        return {
            averageOdds: average,
            minOdds: Math.min(...odds),
            maxOdds: Math.max(...odds),
            mostUsedOdds: mostUsed,
            totalBets: history.length,
            winningOddsAverage:
                winningBets.length > 0 ? winningOddsSum / winningBets.length : 0,
            losingOddsAverage:
                losingBets.length > 0 ? losingOddsSum / losingBets.length : 0,
        };
    }, [history]);

    const recentHistory = useMemo(() => history.slice(0, 20), [history]);

    return {
        history,
        recentHistory,
        stats,
    };
}
