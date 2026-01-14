"use client";

import { useGoals, type GoalWithProgress } from "@/hooks/useGoals";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Target, Plus, Trophy, Clock, Trash2 } from "lucide-react";
import { useState } from "react";

interface GoalsWidgetProps {
  currentBalance: number;
  initialBudget: number;
}

export function GoalsWidget({
  currentBalance,
  initialBudget,
}: GoalsWidgetProps) {
  const { goals, activeGoal, addGoal, deleteGoal, isLoaded } = useGoals(
    currentBalance,
    initialBudget
  );

  const [isOpen, setIsOpen] = useState(false);
  const [newGoalName, setNewGoalName] = useState("");
  const [newGoalAmount, setNewGoalAmount] = useState("");
  const [newGoalDeadline, setNewGoalDeadline] = useState("");
  const [newGoalOdds, setNewGoalOdds] = useState("");

  const handleAddGoal = () => {
    if (!newGoalName.trim() || !newGoalAmount || !newGoalDeadline) return;

    addGoal(
      newGoalName.trim(),
      parseFloat(newGoalAmount),
      newGoalDeadline,
      newGoalOdds ? parseFloat(newGoalOdds) : undefined
    );
    setNewGoalName("");
    setNewGoalAmount("");
    setNewGoalDeadline("");
    setNewGoalOdds("");
    setIsOpen(false);
  };

  if (!isLoaded) {
    return (
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="skeleton h-16 rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover-lift border-primary/50 bg-primary/5">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Metas Financieras
          </CardTitle>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nueva Meta Financiera</DialogTitle>
                <DialogDescription>
                  Define un objetivo de ganancias y fecha límite
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="goal-name">Nombre de la meta</Label>
                  <Input
                    id="goal-name"
                    placeholder="Ej: Meta mensual enero"
                    value={newGoalName}
                    onChange={(e) => setNewGoalName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="goal-amount">Monto objetivo ($)</Label>
                  <Input
                    id="goal-amount"
                    type="number"
                    step="0.01"
                    min="1"
                    placeholder="500"
                    value={newGoalAmount}
                    onChange={(e) => setNewGoalAmount(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="goal-odds">Cuota estimada (Opcional)</Label>
                  <Input
                    id="goal-odds"
                    type="number"
                    step="0.01"
                    min="1.01"
                    placeholder="Ej: 1.80"
                    value={newGoalOdds}
                    onChange={(e) => setNewGoalOdds(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Cuota promedio con la que planeas jugar para esta meta.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="goal-deadline">Fecha límite</Label>
                  <Input
                    id="goal-deadline"
                    type="date"
                    value={newGoalDeadline}
                    onChange={(e) => setNewGoalDeadline(e.target.value)}
                  />
                </div>
                <Button onClick={handleAddGoal} className="w-full">
                  Crear Meta
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        {goals.length === 0 ? (
          <div className="text-center py-4">
            <Trophy className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Sin metas definidas</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => setIsOpen(true)}
            >
              Crear primera meta
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {goals.slice(0, 3).map((goal) => (
              <GoalItem
                key={goal.id}
                goal={goal}
                onDelete={() => deleteGoal(goal.id)}
              />
            ))}
            {goals.length > 3 && (
              <p className="text-xs text-muted-foreground text-center">
                +{goals.length - 3} metas más
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function GoalItem({
  goal,
  onDelete,
}: {
  goal: GoalWithProgress;
  onDelete: () => void;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-3 space-y-2 transition-colors",
        goal.achieved ? "border-accent/30 bg-accent/5" : "border-border/50"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {goal.achieved ? (
              <Trophy className="h-4 w-4 text-accent flex-shrink-0" />
            ) : (
              <Target className="h-4 w-4 text-primary flex-shrink-0" />
            )}
            <span className="font-medium text-sm truncate">{goal.name}</span>
          </div>
          <div className="flex flex-col gap-0.5 mt-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {goal.achieved ? (
                <span className="text-accent">¡Meta alcanzada!</span>
              ) : (
                <span>{goal.daysLeft} días restantes</span>
              )}
            </div>
            {goal.estimatedOdds && (
              <div className="text-xs text-muted-foreground/80">
                Estrategia: Cuota {goal.estimatedOdds.toFixed(2)}
              </div>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">
            {formatCurrency(goal.targetAmount - goal.remaining)} /{" "}
            {formatCurrency(goal.targetAmount)}
          </span>
          <span
            className={cn(
              "font-medium",
              goal.achieved ? "text-accent" : "text-primary"
            )}
          >
            {Math.round(goal.progress)}%
          </span>
        </div>
        <Progress
          value={goal.progress}
          className={cn("h-2", goal.achieved && "bg-accent/20")}
        />
      </div>
    </div>
  );
}
