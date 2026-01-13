"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { calculateGoalProgress } from "@/lib/analytics";

const GOALS_STORAGE_KEY = "betting-app:financial-goals";

export interface FinancialGoal {
    id: string;
    name: string;
    targetAmount: number;
    deadline: string; // ISO date string
    estimatedOdds?: number;
    createdAt: string;
}

export interface GoalWithProgress extends FinancialGoal {
    progress: number;
    remaining: number;
    achieved: boolean;
    daysLeft: number;
}

function loadGoalsFromStorage(): FinancialGoal[] {
    if (typeof window === "undefined") return [];
    try {
        const stored = localStorage.getItem(GOALS_STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

function saveGoalsToStorage(goals: FinancialGoal[]): void {
    if (typeof window === "undefined") return;
    try {
        localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(goals));
    } catch {
        // Ignore storage errors
    }
}

/**
 * Hook for managing financial goals with localStorage persistence
 */
export function useGoals(currentBalance: number, initialBudget: number) {
    const [goals, setGoals] = useState<FinancialGoal[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load goals on mount
    useEffect(() => {
        setGoals(loadGoalsFromStorage());
        setIsLoaded(true);
    }, []);

    // Calculate progress for all goals
    const goalsWithProgress = useMemo((): GoalWithProgress[] => {
        return goals.map((goal) => {
            const { progress, remaining, achieved } = calculateGoalProgress(
                currentBalance,
                initialBudget,
                goal.targetAmount
            );

            const deadlineDate = new Date(goal.deadline);
            const now = new Date();
            const daysLeft = Math.max(
                0,
                Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
            );

            return {
                ...goal,
                progress,
                remaining,
                achieved,
                daysLeft,
            };
        });
    }, [goals, currentBalance, initialBudget]);

    const addGoal = useCallback(
        (name: string, targetAmount: number, deadline: string, estimatedOdds?: number) => {
            const newGoal: FinancialGoal = {
                id: crypto.randomUUID?.() ?? String(Date.now()),
                name,
                targetAmount,
                deadline,
                estimatedOdds,
                createdAt: new Date().toISOString(),
            };

            setGoals((prev) => {
                const updated = [...prev, newGoal];
                saveGoalsToStorage(updated);
                return updated;
            });

            return newGoal;
        },
        []
    );

    const updateGoal = useCallback(
        (id: string, updates: Partial<Omit<FinancialGoal, "id" | "createdAt">>) => {
            setGoals((prev) => {
                const updated = prev.map((g) =>
                    g.id === id ? { ...g, ...updates } : g
                );
                saveGoalsToStorage(updated);
                return updated;
            });
        },
        []
    );

    const deleteGoal = useCallback((id: string) => {
        setGoals((prev) => {
            const updated = prev.filter((g) => g.id !== id);
            saveGoalsToStorage(updated);
            return updated;
        });
    }, []);

    const activeGoal = useMemo(() => {
        // Return the most recent non-achieved goal, or the most recent achieved
        const nonAchieved = goalsWithProgress.filter((g) => !g.achieved);
        if (nonAchieved.length > 0) {
            return nonAchieved.sort(
                (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            )[0];
        }
        return goalsWithProgress[0] ?? null;
    }, [goalsWithProgress]);

    return {
        goals: goalsWithProgress,
        activeGoal,
        isLoaded,
        addGoal,
        updateGoal,
        deleteGoal,
    };
}
