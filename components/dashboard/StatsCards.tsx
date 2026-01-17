"use client";

import { useMemo, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatCurrency, formatPercentage } from "@/lib/format";
import { calculatePlanStats } from "@/lib/analytics";
import type { DayResult, BettingConfig } from "@/lib/betting-types";
import { DollarSign, TrendingUp, Target, Percent, Zap } from "lucide-react";

interface StatsCardsProps {
  plan: DayResult[];
  config: BettingConfig;
  currentBalance: number;
}

interface StatCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  accentColor?: string;
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend = "neutral",
  accentColor,
}: StatCardProps) {
  const trendColors = {
    up: "text-chart-2",
    down: "text-destructive",
    neutral: "text-card-foreground",
  };

  return (
    <Card className="stats-card hover-lift border-primary/50 bg-primary/5">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={cn("rounded-full p-2", accentColor ?? "bg-primary/10")}>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div
          className={cn("text-2xl font-bold animate-count", trendColors[trend])}
        >
          {value}
        </div>
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

// Memoizar el componente StatCard individual
const MemoizedStatCard = memo(StatCard);

function StatsCardsComponent({
  plan,
  config,
  currentBalance,
}: StatsCardsProps) {
  const stats = useMemo(() => calculatePlanStats(plan, config), [plan, config]);

  const lastCompletedDay = useMemo(
    () => plan.findLast((day) => day.result === "completed"),
    [plan],
  );
  const hasCompletedDays = !!lastCompletedDay;

  const displayBalance = hasCompletedDays
    ? lastCompletedDay.balanceAfterDay
    : config.initialBudget;

  const profitTrend: "up" | "down" | "neutral" =
    stats.totalProfit > 0 ? "up" : stats.totalProfit < 0 ? "down" : "neutral";

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <MemoizedStatCard
        title={hasCompletedDays ? "Banca Actual" : "Capital Inicial"}
        value={formatCurrency(displayBalance)}
        subtitle={
          hasCompletedDays
            ? `Después del día ${lastCompletedDay.day}`
            : "Listo para comenzar"
        }
        icon={<DollarSign className="h-4 w-4 text-accent" />}
        accentColor="bg-accent/10"
      />

      <MemoizedStatCard
        title={hasCompletedDays ? "Ganancia Actual" : "Ganancia Proyectada"}
        value={formatCurrency(Math.abs(stats.totalProfit), { showSign: true })}
        subtitle={`${formatPercentage(stats.roi)} de retorno`}
        icon={<TrendingUp className="h-4 w-4 text-chart-2" />}
        trend={profitTrend}
        accentColor="bg-chart-2/10"
      />

      <MemoizedStatCard
        title="Win Rate"
        value={formatPercentage(stats.winRate)}
        subtitle={`${stats.wonBets}W / ${stats.lostBets}L de ${stats.totalBets} apuestas`}
        icon={<Target className="h-4 w-4 text-primary" />}
        accentColor="bg-primary/10"
      />

      <MemoizedStatCard
        title="Cuota Promedio"
        value={stats.averageOdds.toFixed(2)}
        subtitle={`${stats.completedDays} días completados`}
        icon={<Zap className="h-4 w-4 text-yellow-500" />}
        accentColor="bg-yellow-500/10"
      />
    </div>
  );
}

// Exportar versión memoizada
export const StatsCards = memo(StatsCardsComponent);
