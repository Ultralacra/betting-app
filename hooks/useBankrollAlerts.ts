"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { checkBankrollAlert } from "@/lib/analytics";

const ALERTS_STORAGE_KEY = "betting-app:bankroll-alerts";

export interface BankrollAlertConfig {
    enabled: boolean;
    thresholdPercentage: number; // e.g., 20 means alert when balance is 20% or less of initial
    thresholdAmount: number | null; // Fixed amount threshold (alternative to percentage)
    mode: "percentage" | "amount";
}

export interface BankrollAlertState {
    isTriggered: boolean;
    percentageRemaining: number;
    amountRemaining: number;
    message: string;
    severity: "warning" | "critical";
}

const DEFAULT_CONFIG: BankrollAlertConfig = {
    enabled: true,
    thresholdPercentage: 20,
    thresholdAmount: null,
    mode: "percentage",
};

function loadConfigFromStorage(): BankrollAlertConfig {
    if (typeof window === "undefined") return DEFAULT_CONFIG;
    try {
        const stored = localStorage.getItem(ALERTS_STORAGE_KEY);
        return stored ? { ...DEFAULT_CONFIG, ...JSON.parse(stored) } : DEFAULT_CONFIG;
    } catch {
        return DEFAULT_CONFIG;
    }
}

function saveConfigToStorage(config: BankrollAlertConfig): void {
    if (typeof window === "undefined") return;
    try {
        localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(config));
    } catch {
        // Ignore storage errors
    }
}

/**
 * Hook for bankroll alerts when balance falls below threshold
 */
export function useBankrollAlerts(
    currentBalance: number,
    initialBudget: number
) {
    const [config, setConfig] = useState<BankrollAlertConfig>(DEFAULT_CONFIG);
    const [isLoaded, setIsLoaded] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    // Load config on mount
    useEffect(() => {
        setConfig(loadConfigFromStorage());
        setIsLoaded(true);
    }, []);

    // Calculate alert state
    const alertState = useMemo((): BankrollAlertState | null => {
        if (!config.enabled || dismissed) return null;
        if (initialBudget <= 0) return null;

        const threshold =
            config.mode === "percentage"
                ? config.thresholdPercentage
                : config.thresholdAmount
                    ? (config.thresholdAmount / initialBudget) * 100
                    : 20;

        const result = checkBankrollAlert(currentBalance, initialBudget, threshold);

        if (!result.isAlert) return null;

        const severity: "warning" | "critical" =
            result.percentageRemaining <= 10 ? "critical" : "warning";

        let message: string;
        if (severity === "critical") {
            message = `¡Alerta crítica! Tu banca está al ${result.percentageRemaining.toFixed(1)}% del capital inicial.`;
        } else {
            message = `Tu banca ha bajado al ${result.percentageRemaining.toFixed(1)}% del capital inicial.`;
        }

        return {
            isTriggered: true,
            percentageRemaining: result.percentageRemaining,
            amountRemaining: result.amountRemaining,
            message,
            severity,
        };
    }, [config, currentBalance, initialBudget, dismissed]);

    const updateConfig = useCallback(
        (updates: Partial<BankrollAlertConfig>) => {
            setConfig((prev) => {
                const updated = { ...prev, ...updates };
                saveConfigToStorage(updated);
                return updated;
            });
            // Reset dismissed state when config changes
            setDismissed(false);
        },
        []
    );

    const dismissAlert = useCallback(() => {
        setDismissed(true);
    }, []);

    const resetDismissed = useCallback(() => {
        setDismissed(false);
    }, []);

    return {
        config,
        alertState,
        isLoaded,
        updateConfig,
        dismissAlert,
        resetDismissed,
        isAlertActive: alertState !== null,
    };
}
