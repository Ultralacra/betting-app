"use client";

import { useCallback, useState } from "react";
import type { BettingConfig, DayResult } from "@/lib/betting-types";

export interface SimulationState {
    isActive: boolean;
    originalConfig: BettingConfig | null;
    originalPlan: DayResult[];
    simulatedConfig: BettingConfig | null;
    simulatedPlan: DayResult[];
}

/**
 * Hook for simulation mode - test strategies without affecting real data
 */
export function useSimulation() {
    const [simulation, setSimulation] = useState<SimulationState>({
        isActive: false,
        originalConfig: null,
        originalPlan: [],
        simulatedConfig: null,
        simulatedPlan: [],
    });

    const startSimulation = useCallback(
        (config: BettingConfig, plan: DayResult[]) => {
            // Deep clone the plan and config
            const clonedConfig = JSON.parse(JSON.stringify(config)) as BettingConfig;
            const clonedPlan = JSON.parse(JSON.stringify(plan)) as DayResult[];

            setSimulation({
                isActive: true,
                originalConfig: config,
                originalPlan: plan,
                simulatedConfig: clonedConfig,
                simulatedPlan: clonedPlan,
            });
        },
        []
    );

    const updateSimulatedPlan = useCallback((plan: DayResult[]) => {
        setSimulation((prev) => ({
            ...prev,
            simulatedPlan: plan,
        }));
    }, []);

    const updateSimulatedConfig = useCallback((config: BettingConfig) => {
        setSimulation((prev) => ({
            ...prev,
            simulatedConfig: config,
        }));
    }, []);

    const resetSimulation = useCallback(() => {
        setSimulation((prev) => {
            if (!prev.originalConfig || !prev.originalPlan) return prev;

            return {
                ...prev,
                simulatedConfig: JSON.parse(JSON.stringify(prev.originalConfig)),
                simulatedPlan: JSON.parse(JSON.stringify(prev.originalPlan)),
            };
        });
    }, []);

    const endSimulation = useCallback(() => {
        setSimulation({
            isActive: false,
            originalConfig: null,
            originalPlan: [],
            simulatedConfig: null,
            simulatedPlan: [],
        });
    }, []);

    const getComparison = useCallback(() => {
        if (!simulation.originalPlan.length || !simulation.simulatedPlan.length) {
            return null;
        }

        const originalLastDay = simulation.originalPlan.findLast(
            (d) => d.result === "completed"
        );
        const simulatedLastDay = simulation.simulatedPlan.findLast(
            (d) => d.result === "completed"
        );

        const originalBalance =
            originalLastDay?.balanceAfterDay ??
            simulation.originalConfig?.initialBudget ??
            0;
        const simulatedBalance =
            simulatedLastDay?.balanceAfterDay ??
            simulation.simulatedConfig?.initialBudget ??
            0;

        const originalProfit =
            originalBalance - (simulation.originalConfig?.initialBudget ?? 0);
        const simulatedProfit =
            simulatedBalance - (simulation.simulatedConfig?.initialBudget ?? 0);

        return {
            originalBalance,
            simulatedBalance,
            originalProfit,
            simulatedProfit,
            difference: simulatedProfit - originalProfit,
            percentageDifference:
                originalProfit !== 0
                    ? ((simulatedProfit - originalProfit) / Math.abs(originalProfit)) * 100
                    : simulatedProfit > 0
                        ? 100
                        : simulatedProfit < 0
                            ? -100
                            : 0,
        };
    }, [simulation]);

    return {
        ...simulation,
        startSimulation,
        updateSimulatedPlan,
        updateSimulatedConfig,
        resetSimulation,
        endSimulation,
        getComparison,
    };
}
