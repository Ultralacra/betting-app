/**
 * Analytics and calculations for betting statistics
 */

import type { DayResult, BettingConfig, IndividualBet } from "./betting-types";

export interface StreakInfo {
    currentStreak: number;
    type: "win" | "lose" | "none";
    longestWinStreak: number;
    longestLoseStreak: number;
    totalWins: number;
    totalLosses: number;
}

export interface PlanStats {
    totalDays: number;
    completedDays: number;
    pendingDays: number;
    winRate: number;
    roi: number;
    totalProfit: number;
    totalBets: number;
    wonBets: number;
    lostBets: number;
    averageOdds: number;
}

export interface OddsHistoryEntry {
    id: string;
    date: string;
    odds: number;
    stake: number;
    result: "win" | "lose" | null;
    profit: number;
}

/**
 * Calculate current and longest streaks from plan data
 */
export function calculateStreaks(plan: DayResult[]): StreakInfo {
    const completedDays = plan.filter((d) => d.result === "completed");

    if (completedDays.length === 0) {
        return {
            currentStreak: 0,
            type: "none",
            longestWinStreak: 0,
            longestLoseStreak: 0,
            totalWins: 0,
            totalLosses: 0,
        };
    }

    let currentStreak = 0;
    let currentType: "win" | "lose" | "none" = "none";
    let longestWinStreak = 0;
    let longestLoseStreak = 0;
    let tempWinStreak = 0;
    let tempLoseStreak = 0;
    let totalWins = 0;
    let totalLosses = 0;

    // Sort by day number ascending
    const sortedDays = [...completedDays].sort((a, b) => a.day - b.day);

    for (const day of sortedDays) {
        const dayNet = day.balanceAfterDay - day.currentBalance;
        const isWinDay = dayNet > 0;

        if (isWinDay) {
            totalWins++;
            tempWinStreak++;
            tempLoseStreak = 0;
            longestWinStreak = Math.max(longestWinStreak, tempWinStreak);
        } else {
            totalLosses++;
            tempLoseStreak++;
            tempWinStreak = 0;
            longestLoseStreak = Math.max(longestLoseStreak, tempLoseStreak);
        }
    }

    // Current streak is from the most recent day
    const lastDay = sortedDays[sortedDays.length - 1];
    const lastDayNet = lastDay.balanceAfterDay - lastDay.currentBalance;
    const lastDayWon = lastDayNet > 0;

    // Count backwards to find current streak
    currentStreak = 0;
    currentType = lastDayWon ? "win" : "lose";

    for (let i = sortedDays.length - 1; i >= 0; i--) {
        const day = sortedDays[i];
        const dayNet = day.balanceAfterDay - day.currentBalance;
        const isWinDay = dayNet > 0;

        if ((currentType === "win" && isWinDay) || (currentType === "lose" && !isWinDay)) {
            currentStreak++;
        } else {
            break;
        }
    }

    return {
        currentStreak,
        type: currentType,
        longestWinStreak,
        longestLoseStreak,
        totalWins,
        totalLosses,
    };
}

/**
 * Calculate comprehensive plan statistics
 */
export function calculatePlanStats(
    plan: DayResult[],
    config: BettingConfig
): PlanStats {
    const completedDays = plan.filter((d) => d.result === "completed");
    const pendingDays = plan.filter((d) => d.result === null);

    let totalBets = 0;
    let wonBets = 0;
    let lostBets = 0;
    let totalOdds = 0;
    let oddsCount = 0;

    for (const day of completedDays) {
        for (const bet of day.bets ?? []) {
            totalBets++;
            if (bet.result === "win") wonBets++;
            if (bet.result === "lose") lostBets++;
            if (bet.odds) {
                totalOdds += bet.odds;
                oddsCount++;
            }
        }
    }

    const lastCompletedDay = completedDays[completedDays.length - 1];
    const currentBalance = lastCompletedDay?.balanceAfterDay ?? config.initialBudget;
    const totalProfit = currentBalance - config.initialBudget;
    const roi = config.initialBudget > 0 ? (totalProfit / config.initialBudget) * 100 : 0;
    const winRate = totalBets > 0 ? (wonBets / totalBets) * 100 : 0;
    const averageOdds = oddsCount > 0 ? totalOdds / oddsCount : 0;

    return {
        totalDays: plan.length,
        completedDays: completedDays.length,
        pendingDays: pendingDays.length,
        winRate,
        roi,
        totalProfit,
        totalBets,
        wonBets,
        lostBets,
        averageOdds,
    };
}

/**
 * Build odds history from plan data
 */
export function buildOddsHistory(plan: DayResult[]): OddsHistoryEntry[] {
    const history: OddsHistoryEntry[] = [];

    for (const day of plan) {
        for (const bet of day.bets ?? []) {
            if (bet.result !== null) {
                const profit =
                    bet.result === "win"
                        ? (bet.potentialWin ?? 0) - (bet.stake ?? 0)
                        : -(bet.stake ?? 0);

                history.push({
                    id: bet.id,
                    date: day.date,
                    odds: bet.odds ?? 0,
                    stake: bet.stake ?? 0,
                    result: bet.result ?? null,
                    profit,
                });
            }
        }
    }

    // Sort by date descending (most recent first)
    return history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/**
 * Calculate parlay (combined) odds
 */
export function calculateParlayOdds(odds: number[]): number {
    if (odds.length === 0) return 0;
    return odds.reduce((acc, o) => acc * o, 1);
}

/**
 * Calculate potential win for a parlay bet
 */
export function calculateParlayPotentialWin(
    stake: number,
    odds: number[]
): { combinedOdds: number; potentialWin: number; profit: number } {
    const combinedOdds = calculateParlayOdds(odds);
    const potentialWin = stake * combinedOdds;
    const profit = potentialWin - stake;

    return { combinedOdds, potentialWin, profit };
}

/**
 * Check if balance is below threshold for bankroll alert
 */
export function checkBankrollAlert(
    currentBalance: number,
    initialBudget: number,
    thresholdPercentage: number = 20
): { isAlert: boolean; percentageRemaining: number; amountRemaining: number } {
    const percentageRemaining = (currentBalance / initialBudget) * 100;
    const isAlert = percentageRemaining <= thresholdPercentage;

    return {
        isAlert,
        percentageRemaining,
        amountRemaining: currentBalance,
    };
}

/**
 * Calculate goal progress
 */
export function calculateGoalProgress(
    currentBalance: number,
    initialBudget: number,
    goalAmount: number
): { progress: number; remaining: number; achieved: boolean } {
    const currentProfit = currentBalance - initialBudget;
    const progress = goalAmount > 0 ? (currentProfit / goalAmount) * 100 : 0;
    const remaining = Math.max(0, goalAmount - currentProfit);
    const achieved = currentProfit >= goalAmount;

    return { progress: Math.min(100, progress), remaining, achieved };
}
