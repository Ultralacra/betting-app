"use client";

import { useState } from "react";
import { useSimulation } from "@/hooks/useSimulation";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { BettingConfig, DayResult } from "@/lib/betting-types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  FlaskConical,
  Play,
  RotateCcw,
  X,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

interface SimulationModeProps {
  config: BettingConfig | null;
  plan: DayResult[];
}

export function SimulationMode({ config, plan }: SimulationModeProps) {
  const simulation = useSimulation();
  const [confirmEndOpen, setConfirmEndOpen] = useState(false);

  if (!config || plan.length === 0) {
    return null;
  }

  const handleStart = () => {
    simulation.startSimulation(config, plan);
  };

  const handleEnd = () => {
    simulation.endSimulation();
    setConfirmEndOpen(false);
  };

  const comparison = simulation.getComparison();

  if (!simulation.isActive) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleStart}
        className="gap-2"
      >
        <FlaskConical className="h-4 w-4" />
        <span className="hidden sm:inline">Simulación</span>
      </Button>
    );
  }

  return (
    <div className="space-y-4">
      {/* Simulation banner */}
      <div className="rounded-lg border-2 border-dashed border-primary/50 bg-primary/5 p-4 animate-slide-up">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/20 p-2">
              <FlaskConical className="h-5 w-5 text-primary animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">Modo Simulación Activo</span>
                <Badge variant="secondary" className="bg-primary/20 text-primary">
                  Sandbox
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Los cambios NO afectarán tus datos reales
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={simulation.resetSimulation}
              className="gap-1"
            >
              <RotateCcw className="h-3 w-3" />
              Reiniciar
            </Button>

            <AlertDialog open={confirmEndOpen} onOpenChange={setConfirmEndOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  <X className="h-3 w-3" />
                  Salir
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    ¿Salir del modo simulación?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Todos los cambios realizados en la simulación se perderán y
                    volverás a tus datos reales.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Continuar simulando</AlertDialogCancel>
                  <AlertDialogAction onClick={handleEnd}>
                    Salir y descartar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      {/* Comparison card */}
      {comparison && (
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              Comparación en tiempo real
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">
                  Plan Original
                </div>
                <div className="text-lg font-bold">
                  {formatCurrency(comparison.originalBalance)}
                </div>
                <div
                  className={cn(
                    "text-sm",
                    comparison.originalProfit >= 0
                      ? "text-chart-2"
                      : "text-destructive"
                  )}
                >
                  {formatCurrency(Math.abs(comparison.originalProfit), {
                    showSign: true,
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  Simulación
                  <FlaskConical className="h-3 w-3" />
                </div>
                <div className="text-lg font-bold text-primary">
                  {formatCurrency(comparison.simulatedBalance)}
                </div>
                <div
                  className={cn(
                    "text-sm",
                    comparison.simulatedProfit >= 0
                      ? "text-chart-2"
                      : "text-destructive"
                  )}
                >
                  {formatCurrency(Math.abs(comparison.simulatedProfit), {
                    showSign: true,
                  })}
                </div>
              </div>
            </div>

            {/* Difference */}
            <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Diferencia</span>
              <div
                className={cn(
                  "flex items-center gap-1 font-semibold",
                  comparison.difference > 0
                    ? "text-chart-2"
                    : comparison.difference < 0
                    ? "text-destructive"
                    : "text-muted-foreground"
                )}
              >
                {comparison.difference > 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : comparison.difference < 0 ? (
                  <TrendingDown className="h-4 w-4" />
                ) : null}
                {formatCurrency(Math.abs(comparison.difference), {
                  showSign: true,
                })}
                <span className="text-xs">
                  ({comparison.percentageDifference > 0 ? "+" : ""}
                  {comparison.percentageDifference.toFixed(1)}%)
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
