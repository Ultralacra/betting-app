/**
 * Hook para persistencia de datos de apuestas
 * Maneja la sincronización con el backend de forma optimizada
 */
import { useCallback, useRef, useEffect } from "react";
import { TIMING, API_ENDPOINTS } from "@/lib/constants";
import type { BettingConfig, DayResult } from "@/lib/betting-types";

interface PersistenceOptions {
  /** Delay antes de guardar (debounce) */
  debounceMs?: number;
  /** Callback cuando se guarda exitosamente */
  onSuccess?: () => void;
  /** Callback cuando hay error */
  onError?: (error: Error) => void;
}

interface BettingState {
  config: BettingConfig | null;
  plan: DayResult[];
  currentBalance: number;
  theme: "light" | "dark";
}

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const { headers, ...restInit } = init ?? {};
  const res = await fetch(url, {
    credentials: "include",
    ...restInit,
    headers: {
      "Content-Type": "application/json",
      ...(headers ?? {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }

  return (await res.json()) as T;
}

export function usePlanPersistence(options: PersistenceOptions = {}) {
  const { 
    debounceMs = TIMING.AUTOSAVE_DELAY, 
    onSuccess, 
    onError 
  } = options;
  
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDataRef = useRef<BettingState | null>(null);
  const isSavingRef = useRef(false);

  // Limpiar timer al desmontar
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const saveToBackend = useCallback(async (state: BettingState) => {
    if (isSavingRef.current) {
      // Si ya está guardando, encolar para después
      pendingDataRef.current = state;
      return;
    }

    isSavingRef.current = true;

    try {
      await apiJson(API_ENDPOINTS.BETTING_DATA, {
        method: "POST",
        body: JSON.stringify({
          configJson: state.config ? JSON.stringify(state.config) : null,
          planJson: state.plan.length > 0 ? JSON.stringify(state.plan) : null,
          currentBalance: state.currentBalance,
          theme: state.theme,
        }),
      });
      onSuccess?.();
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error(String(error)));
    } finally {
      isSavingRef.current = false;

      // Si hay datos pendientes, guardarlos
      if (pendingDataRef.current) {
        const pending = pendingDataRef.current;
        pendingDataRef.current = null;
        void saveToBackend(pending);
      }
    }
  }, [onSuccess, onError]);

  const scheduleSave = useCallback((state: BettingState) => {
    // Cancelar timer anterior
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Programar nuevo guardado
    timerRef.current = setTimeout(() => {
      void saveToBackend(state);
    }, debounceMs);
  }, [debounceMs, saveToBackend]);

  const saveNow = useCallback((state: BettingState) => {
    // Cancelar timer pendiente
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    void saveToBackend(state);
  }, [saveToBackend]);

  const cancelPending = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    pendingDataRef.current = null;
  }, []);

  return {
    /** Programar guardado con debounce */
    scheduleSave,
    /** Guardar inmediatamente */
    saveNow,
    /** Cancelar guardado pendiente */
    cancelPending,
    /** Indica si hay una operación de guardado en progreso */
    get isSaving() {
      return isSavingRef.current;
    },
  };
}
