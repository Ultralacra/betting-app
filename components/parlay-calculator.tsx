"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/format";
import { calculateParlayPotentialWin } from "@/lib/analytics";
import { Calculator, Plus, Trash2, Zap } from "lucide-react";

export function ParlayCalculator({ trigger }: { trigger?: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [stake, setStake] = useState("");
  const [odds, setOdds] = useState<string[]>([""]);

  const handleAddOdds = () => {
    setOdds((prev) => [...prev, ""]);
  };

  const handleRemoveOdds = (index: number) => {
    if (odds.length <= 1) return;
    setOdds((prev) => prev.filter((_, i) => i !== index));
  };

  const handleOddsChange = (index: number, value: string) => {
    setOdds((prev) => prev.map((o, i) => (i === index ? value : o)));
  };

  const calculation = useMemo(() => {
    const stakeNum = parseFloat(stake) || 0;
    const oddsNums = odds
      .map((o) => parseFloat(o))
      .filter((o) => !isNaN(o) && o >= 1);

    if (stakeNum <= 0 || oddsNums.length === 0) {
      return null;
    }

    return calculateParlayPotentialWin(stakeNum, oddsNums);
  }, [stake, odds]);

  const handleClear = () => {
    setStake("");
    setOdds([""]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Calculator className="h-4 w-4" />
            <span className="hidden sm:inline">Parlays</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Calculadora de Parlays
          </DialogTitle>
          <DialogDescription>
            Calcula cuotas combinadas para apuestas múltiples
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Stake input */}
          <div className="space-y-2">
            <Label htmlFor="parlay-stake">Monto a apostar ($)</Label>
            <Input
              id="parlay-stake"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="25.00"
              value={stake}
              onChange={(e) => setStake(e.target.value)}
            />
          </div>

          {/* Odds inputs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Cuotas</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAddOdds}
                className="h-8 gap-1"
              >
                <Plus className="h-3 w-3" />
                Agregar
              </Button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {odds.map((odd, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-6">
                    #{index + 1}
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    min="1.01"
                    placeholder="1.80"
                    value={odd}
                    onChange={(e) => handleOddsChange(index, e.target.value)}
                    className="flex-1"
                  />
                  {odds.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveOdds(index)}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Results */}
          {calculation && (
            <Card className="glass-card animate-scale-in">
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Cuota combinada
                  </span>
                  <span className="text-lg font-bold text-primary">
                    {calculation.combinedOdds.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Ganancia potencial
                  </span>
                  <span className="text-lg font-bold text-chart-2">
                    {formatCurrency(calculation.profit)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-border">
                  <span className="text-sm font-medium">Retorno total</span>
                  <span className="text-xl font-bold text-accent">
                    {formatCurrency(calculation.potentialWin)}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={handleClear}
              className="flex-1"
            >
              Limpiar
            </Button>
            <Button onClick={() => setIsOpen(false)} className="flex-1">
              Cerrar
            </Button>
          </div>

          {/* Tip */}
          <p className="text-xs text-muted-foreground text-center">
            💡 A mayor número de selecciones, mayor riesgo pero mayor
            potencial de ganancia
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
