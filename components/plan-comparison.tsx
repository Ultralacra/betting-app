"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatPercentage } from "@/lib/format";
import { calculatePlanStats, calculateStreaks } from "@/lib/analytics";
import type { SavedPlan } from "@/lib/plans/saved-plans";
import { cn } from "@/lib/utils";
import {
  GitCompare,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowRight,
} from "lucide-react";

interface PlanComparisonProps {
  plans: SavedPlan[];
}

export function PlanComparison({ plans, trigger }: PlanComparisonProps & { trigger?: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [planAId, setPlanAId] = useState<string>("");
  const [planBId, setPlanBId] = useState<string>("");

  const planA = plans.find((p) => p.id === planAId);
  const planB = plans.find((p) => p.id === planBId);

  const comparison = useMemo(() => {
    if (!planA || !planB) return null;

    const statsA = calculatePlanStats(planA.plan, planA.config);
    const statsB = calculatePlanStats(planB.plan, planB.config);
    const streaksA = calculateStreaks(planA.plan);
    const streaksB = calculateStreaks(planB.plan);

    return {
      a: { ...statsA, streaks: streaksA, name: planA.name },
      b: { ...statsB, streaks: streaksB, name: planB.name },
    };
  }, [planA, planB]);

  if (plans.length < 2) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <GitCompare className="h-4 w-4" />
            <span className="hidden sm:inline">Comparar</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitCompare className="h-5 w-5 text-primary" />
            Comparar Planes
          </DialogTitle>
          <DialogDescription>
            Compara el rendimiento de dos planes lado a lado
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Plan selectors */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Plan A</label>
              <Select value={planAId} onValueChange={setPlanAId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((p) => (
                    <SelectItem
                      key={p.id}
                      value={p.id}
                      disabled={p.id === planBId}
                    >
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Plan B</label>
              <Select value={planBId} onValueChange={setPlanBId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((p) => (
                    <SelectItem
                      key={p.id}
                      value={p.id}
                      disabled={p.id === planAId}
                    >
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Comparison table */}
          {comparison && (
            <div className="space-y-4 animate-fade-in">
              <Card className="glass-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Resumen</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="font-medium text-primary truncate">
                      {comparison.a.name}
                    </div>
                    <div className="text-muted-foreground">vs</div>
                    <div className="font-medium text-primary truncate">
                      {comparison.b.name}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <ComparisonRow
                label="Ganancia Total"
                valueA={formatCurrency(comparison.a.totalProfit, { showSign: true })}
                valueB={formatCurrency(comparison.b.totalProfit, { showSign: true })}
                winner={
                  comparison.a.totalProfit > comparison.b.totalProfit
                    ? "a"
                    : comparison.b.totalProfit > comparison.a.totalProfit
                    ? "b"
                    : null
                }
              />

              <ComparisonRow
                label="ROI"
                valueA={formatPercentage(comparison.a.roi)}
                valueB={formatPercentage(comparison.b.roi)}
                winner={
                  comparison.a.roi > comparison.b.roi
                    ? "a"
                    : comparison.b.roi > comparison.a.roi
                    ? "b"
                    : null
                }
              />

              <ComparisonRow
                label="Win Rate"
                valueA={formatPercentage(comparison.a.winRate)}
                valueB={formatPercentage(comparison.b.winRate)}
                winner={
                  comparison.a.winRate > comparison.b.winRate
                    ? "a"
                    : comparison.b.winRate > comparison.a.winRate
                    ? "b"
                    : null
                }
              />

              <ComparisonRow
                label="Total Apuestas"
                valueA={String(comparison.a.totalBets)}
                valueB={String(comparison.b.totalBets)}
              />

              <ComparisonRow
                label="Cuota Promedio"
                valueA={comparison.a.averageOdds.toFixed(2)}
                valueB={comparison.b.averageOdds.toFixed(2)}
              />

              <ComparisonRow
                label="Mejor Racha"
                valueA={`${comparison.a.streaks.longestWinStreak} días`}
                valueB={`${comparison.b.streaks.longestWinStreak} días`}
                winner={
                  comparison.a.streaks.longestWinStreak >
                  comparison.b.streaks.longestWinStreak
                    ? "a"
                    : comparison.b.streaks.longestWinStreak >
                      comparison.a.streaks.longestWinStreak
                    ? "b"
                    : null
                }
              />

              <ComparisonRow
                label="Días Completados"
                valueA={String(comparison.a.completedDays)}
                valueB={String(comparison.b.completedDays)}
              />
            </div>
          )}

          {!comparison && (
            <div className="text-center py-8">
              <GitCompare className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                Selecciona dos planes para compararlos
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ComparisonRow({
  label,
  valueA,
  valueB,
  winner,
}: {
  label: string;
  valueA: string;
  valueB: string;
  winner?: "a" | "b" | null;
}) {
  return (
    <div className="grid grid-cols-3 gap-4 items-center py-2 border-b border-border/50 last:border-0">
      <div
        className={cn(
          "text-right font-medium",
          winner === "a" && "text-chart-2"
        )}
      >
        {valueA}
        {winner === "a" && <TrendingUp className="h-3 w-3 inline ml-1" />}
      </div>
      <div className="text-center text-sm text-muted-foreground">{label}</div>
      <div
        className={cn(
          "text-left font-medium",
          winner === "b" && "text-chart-2"
        )}
      >
        {winner === "b" && <TrendingUp className="h-3 w-3 inline mr-1" />}
        {valueB}
      </div>
    </div>
  );
}
