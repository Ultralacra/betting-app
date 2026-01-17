/**
 * Hook para gestión del plan de apuestas
 * Encapsula la lógica de generación y recálculo de planes
 */
import { useCallback } from "react";
import type { BettingConfig, DayResult, IndividualBet } from "@/lib/betting-types";
import { DEFAULT_CONFIG } from "@/lib/constants";

function makeBetId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return String(Date.now());
}

export function useBettingPlan() {
  /**
   * Genera un plan completo basado en la configuración
   */
  const generatePlan = useCallback(
    (config: BettingConfig, startBalance: number): DayResult[] => {
      const plan: DayResult[] = [];
      let currentBalance = startBalance;
      const startDate = new Date(config.startDate);
      const endDate = new Date(config.endDate);

      const daysDiff =
        Math.ceil(
          (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
        ) + 1;

      for (let day = 1; day <= daysDiff; day++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + (day - 1));

        const bets: IndividualBet[] = Array.from(
          { length: config.betsPerDay },
          (_, i) => {
            const stake = (currentBalance * config.stakePercentage) / 100;
            const potentialWin = stake * config.odds;

            return {
              id: `${day}-${i}`,
              stakePercentage: config.stakePercentage,
              stake,
              odds: config.odds,
              potentialWin,
              result: null,
            };
          }
        );

        const totalStake = bets.reduce((sum, b) => sum + b.stake, 0);
        const totalPotentialWin = bets.reduce((sum, b) => sum + b.potentialWin, 0);
        const totalProfit = totalPotentialWin - totalStake;
        const balanceAfterDay =
          currentBalance + (totalProfit * config.reinvestmentPercentage) / 100;

        plan.push({
          day,
          date: currentDate.toISOString().split("T")[0],
          bets,
          currentBalance,
          totalStake,
          totalPotentialWin,
          balanceAfterDay,
          result: null,
        });

        currentBalance = balanceAfterDay;
      }

      return plan;
    },
    []
  );

  /**
   * Recalcula el plan desde un día específico hacia adelante
   */
  const recalcPlanFrom = useCallback(
    (plan: DayResult[], fromIndex: number, config: BettingConfig): DayResult[] => {
      const result = [...plan];

      for (let i = fromIndex; i < result.length; i++) {
        const day = result[i];
        const prevBalance = i === 0 ? day.currentBalance : result[i - 1].balanceAfterDay;
        
        // Actualizar balance actual del día
        day.currentBalance = prevBalance;

        // Recalcular cada apuesta
        day.bets = (day.bets ?? []).map((bet) => {
          const stake = (prevBalance * bet.stakePercentage) / 100;
          return {
            ...bet,
            stake,
            potentialWin: stake * bet.odds,
          };
        });

        // Recalcular totales del día
        day.totalStake = day.bets.reduce((sum, b) => sum + b.stake, 0);
        day.totalPotentialWin = day.bets.reduce((sum, b) => sum + b.potentialWin, 0);

        // Determinar resultado del día basado en las apuestas
        const completedBets = day.bets.filter((b) => b.result !== null);
        const allCompleted = completedBets.length === day.bets.length && day.bets.length > 0;

        if (!allCompleted) {
          // Día no completado: proyectar ganancia
          const profit = day.totalPotentialWin - day.totalStake;
          day.balanceAfterDay =
            prevBalance + (profit * config.reinvestmentPercentage) / 100;
          day.result = null;
        } else {
          // Día completado: calcular resultado real
          const wins = completedBets.filter((b) => b.result === "win");
          const losses = completedBets.filter((b) => b.result === "lose");

          let realProfit = 0;
          wins.forEach((b) => {
            realProfit += b.potentialWin - b.stake;
          });
          losses.forEach((b) => {
            realProfit -= b.stake;
          });

          day.balanceAfterDay =
            prevBalance + (realProfit * config.reinvestmentPercentage) / 100;

          // Marcar como completado (el tipo DayResult solo acepta "completed" o null)
          day.result = "completed";
        }
      }

      return result;
    },
    []
  );

  /**
   * Añade una apuesta a un día específico
   */
  const addBetToDay = useCallback(
    (
      plan: DayResult[],
      dayIndex: number,
      config: BettingConfig
    ): DayResult[] => {
      const result = plan.map((d) => ({
        ...d,
        bets: (d.bets ?? []).map((b) => ({ ...b })),
      }));

      const day = result[dayIndex];
      if (!day) return plan;

      const currentPerc = (day.bets ?? []).reduce(
        (sum, b) => sum + (b.stakePercentage ?? 0),
        0
      );
      const remaining = Math.max(0, 100 - currentPerc);
      const stakePct = Math.max(
        1,
        Math.min(config.stakePercentage, remaining || config.stakePercentage)
      );

      const stake = (day.currentBalance * stakePct) / 100;

      day.bets = [
        ...(day.bets ?? []),
        {
          id: makeBetId(),
          stakePercentage: stakePct,
          stake,
          odds: config.odds,
          potentialWin: stake * config.odds,
          result: null,
        },
      ];

      return recalcPlanFrom(result, dayIndex, config);
    },
    [recalcPlanFrom]
  );

  /**
   * Elimina una apuesta de un día específico
   */
  const removeBetFromDay = useCallback(
    (
      plan: DayResult[],
      dayIndex: number,
      betId: string,
      config: BettingConfig
    ): DayResult[] => {
      const result = plan.map((d) => ({
        ...d,
        bets: (d.bets ?? []).map((b) => ({ ...b })),
      }));

      const day = result[dayIndex];
      if (!day) return plan;

      day.bets = (day.bets ?? []).filter((b) => b.id !== betId);

      return recalcPlanFrom(result, dayIndex, config);
    },
    [recalcPlanFrom]
  );

  /**
   * Actualiza una apuesta específica
   */
  const updateBet = useCallback(
    (
      plan: DayResult[],
      dayIndex: number,
      betId: string,
      updates: Partial<IndividualBet>,
      config: BettingConfig
    ): DayResult[] => {
      const result = plan.map((d) => ({
        ...d,
        bets: (d.bets ?? []).map((b) => ({ ...b })),
      }));

      const day = result[dayIndex];
      if (!day) return plan;

      day.bets = (day.bets ?? []).map((b) => {
        if (b.id !== betId) return b;

        const nextStakePct = updates.stakePercentage ?? b.stakePercentage;
        const nextOdds = updates.odds ?? b.odds;
        const nextResult = updates.result === undefined ? b.result : updates.result;
        const stake = (day.currentBalance * nextStakePct) / 100;

        return {
          ...b,
          stakePercentage: nextStakePct,
          odds: nextOdds,
          stake,
          potentialWin: stake * nextOdds,
          result: nextResult,
        };
      });

      return recalcPlanFrom(result, dayIndex, config);
    },
    [recalcPlanFrom]
  );

  /**
   * Obtiene la configuración por defecto
   */
  const getDefaultConfig = useCallback((): BettingConfig => {
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + DEFAULT_CONFIG.PLAN_DAYS - 1);

    return {
      initialBudget: DEFAULT_CONFIG.INITIAL_BUDGET,
      odds: DEFAULT_CONFIG.ODDS,
      reinvestmentPercentage: DEFAULT_CONFIG.REINVESTMENT_PERCENTAGE,
      betsPerDay: DEFAULT_CONFIG.BETS_PER_DAY,
      stakePercentage: DEFAULT_CONFIG.STAKE_PERCENTAGE,
      startDate: today.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
    };
  }, []);

  return {
    generatePlan,
    recalcPlanFrom,
    addBetToDay,
    removeBetFromDay,
    updateBet,
    getDefaultConfig,
  };
}
