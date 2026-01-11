"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type {
  DayResult,
  BettingConfig,
  IndividualBet,
} from "@/lib/betting-types";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Edit2,
  Check,
  X,
  TrendingUp,
  TrendingDown,
  Plus,
  Trash2,
  RotateCcw,
} from "lucide-react";

interface BettingPlanProps {
  plan: DayResult[];
  config: BettingConfig;
  onUpdateBet: (
    dayIndex: number,
    betId: string,
    updates: Partial<IndividualBet>
  ) => void;
  onAddBet: (dayIndex: number) => void;
  onRemoveBet: (dayIndex: number, betId: string) => void;
}

export function BettingPlan({
  plan,
  config,
  onUpdateBet,
  onAddBet,
  onRemoveBet,
}: BettingPlanProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(plan.length / itemsPerPage);

  const [editingBet, setEditingBet] = useState<string | null>(null);
  const [editStake, setEditStake] = useState<string>("");
  const [editOdds, setEditOdds] = useState<string>("");
  const [editDayIndex, setEditDayIndex] = useState<number>(0);

  const [editingResult, setEditingResult] = useState<string | null>(null);

  const [openCompletedDay, setOpenCompletedDay] = useState<number | null>(null);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentDays = plan.slice(startIndex, endIndex);

  const handleEdit = (bet: IndividualBet, dayIndex: number) => {
    setEditingBet(bet.id);
    setEditStake(bet.stake.toString());
    setEditOdds(bet.odds.toString());
    setEditDayIndex(dayIndex);
  };

  const handleSave = (dayIndex: number, betId: string) => {
    const stakeAmount = Number.parseFloat(editStake) || 0;
    const oddsAmount = Number.parseFloat(editOdds) || 1.01;
    const day = plan[dayIndex];
    const stakePercentage = (stakeAmount / day.currentBalance) * 100;

    onUpdateBet(dayIndex, betId, {
      stakePercentage: stakePercentage,
      odds: oddsAmount,
    });
    setEditingBet(null);
  };

  const handleCancel = () => {
    setEditingBet(null);
  };

  const handleResult = (
    dayIndex: number,
    betId: string,
    result: "win" | "lose"
  ) => {
    onUpdateBet(dayIndex, betId, { result });
    setOpenCompletedDay(null);
  };

  const handleResetResult = (dayIndex: number, betId: string) => {
    onUpdateBet(dayIndex, betId, { result: null });
    setOpenCompletedDay(null);
  };

  const handleShowResultOptions = (betId: string) => {
    setEditingResult(betId);
  };

  const handleChangeResult = (
    dayIndex: number,
    betId: string,
    newResult: "win" | "lose"
  ) => {
    onUpdateBet(dayIndex, betId, { result: newResult });
    setEditingResult(null);
    setOpenCompletedDay(null);
  };

  const handleCancelResultEdit = () => {
    setEditingResult(null);
  };

  const formatCurrency = (amount: number | undefined | null): string => {
    if (amount === undefined || amount === null || isNaN(amount)) {
      return "0.00";
    }
    return amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const startDate = new Date(config.startDate);
  const endDate = new Date(config.endDate);
  const totalDays =
    Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {`Plan de ${totalDays} Días`}
            </CardTitle>
            <CardDescription>
              {"Proyección día a día - Página "}
              {currentPage}
              {" de "}
              {totalPages}
            </CardDescription>
          </div>
          <div className="flex gap-2 self-start sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setCurrentPage((prev) => Math.min(totalPages, prev + 1))
              }
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {currentDays.map((day, idx) => {
            const actualIndex = startIndex + idx;
            const isNextDay =
              day.result === null &&
              (actualIndex === 0 ||
                plan[actualIndex - 1].result === "completed");
            const canEdit = day.result === null && isNextDay;

            const bets = day.bets || [];

            let totalStakeForDay = 0;
            let totalPotentialWinForDay = 0;

            bets.forEach((bet) => {
              if (editingBet === bet.id && editDayIndex === actualIndex) {
                const currentStake = Number.parseFloat(editStake) || 0;
                const currentOdds = Number.parseFloat(editOdds) || 1;
                totalStakeForDay += currentStake;
                totalPotentialWinForDay += currentStake * (currentOdds - 1);
              } else {
                totalStakeForDay += bet.stake || 0;
                totalPotentialWinForDay += bet.potentialWin || 0;
              }
            });

            const dayNet =
              day.result === "completed"
                ? day.balanceAfterDay - day.currentBalance
                : 0;

            const dayBody = (
              <>
                <div className="space-y-2">
                  {bets.map((bet) => {
                    const isEditing = editingBet === bet.id;
                    const isEditingResultNow = editingResult === bet.id;
                    const betHasResult = bet.result !== null;

                    const currentStakeValue = isEditing
                      ? editStake === ""
                        ? 0
                        : Number.parseFloat(editStake)
                      : bet.stake;
                    const currentOddsValue = isEditing
                      ? editOdds === ""
                        ? 1
                        : Number.parseFloat(editOdds)
                      : bet.odds;
                    const currentPercentage =
                      (currentStakeValue / day.currentBalance) * 100;
                    const currentPotentialWin =
                      currentStakeValue * (currentOddsValue - 1);
                    const currentReturnTotal =
                      currentStakeValue + currentPotentialWin;

                    const exceedsBalance =
                      isEditing && currentStakeValue > day.currentBalance;

                    const resolvedDelta = betHasResult
                      ? bet.result === "win"
                        ? currentPotentialWin
                        : -currentStakeValue
                      : 0;

                    const resolvedBadgeClass =
                      bet.result === "win"
                        ? "bg-chart-2/20 text-chart-2"
                        : "bg-destructive/20 text-destructive";

                    const resolvedRowClass = betHasResult
                      ? bet.result === "win"
                        ? "border-chart-2/40 bg-chart-2/10"
                        : "border-destructive/40 bg-destructive/10"
                      : "border-border/50 bg-card";

                    return (
                      <div
                        key={bet.id}
                        className={`flex flex-col gap-3 p-3 rounded-md border sm:flex-row sm:items-center ${
                          exceedsBalance
                            ? "border-destructive bg-destructive/5"
                            : resolvedRowClass
                        }`}
                      >
                        <div className="w-full flex-1 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">
                              {"Monto a Apostar"}
                            </div>
                            {isEditing ? (
                              <div>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0.01"
                                  max={day.currentBalance}
                                  value={editStake}
                                  onChange={(e) => setEditStake(e.target.value)}
                                  className={`h-8 mb-1 w-full sm:w-24 ${
                                    exceedsBalance ? "border-destructive" : ""
                                  }`}
                                  placeholder="$0.00"
                                />
                                <div
                                  className={`text-xs ${
                                    exceedsBalance
                                      ? "text-destructive font-medium"
                                      : "text-muted-foreground"
                                  }`}
                                >
                                  {currentStakeValue > 0
                                    ? `${currentPercentage.toFixed(
                                        1
                                      )}% de la banca`
                                    : "0% de la banca"}
                                  {exceedsBalance && " ⚠️ Excede banca"}
                                </div>
                              </div>
                            ) : (
                              <div>
                                <div className="font-medium text-card-foreground">
                                  {"$"}
                                  {formatCurrency(bet.stake)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {bet.stakePercentage.toFixed(1)}% de la banca
                                </div>
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">
                              {"Cuota"}
                            </div>
                            {isEditing ? (
                              <Input
                                type="number"
                                step="0.01"
                                min="1.01"
                                value={editOdds}
                                onChange={(e) => setEditOdds(e.target.value)}
                                className="h-8 w-full sm:w-20"
                                placeholder="1.00"
                              />
                            ) : (
                              <div className="font-medium text-card-foreground">
                                {bet.odds?.toFixed(2) || "0.00"}
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">
                              {"Ganancia Potencial"}
                            </div>
                            <div
                              className={`font-medium ${
                                isEditing
                                  ? "text-primary"
                                  : betHasResult && bet.result === "win"
                                  ? "text-chart-2"
                                  : "text-accent"
                              }`}
                            >
                              {"$"}
                              {formatCurrency(currentPotentialWin)}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">
                              {"Retorno Total"}
                            </div>
                            <div
                              className={`font-medium ${
                                isEditing ? "text-primary" : "text-primary"
                              }`}
                            >
                              {"$"}
                              {formatCurrency(currentReturnTotal)}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 self-end sm:self-auto">
                          {isEditing ? (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleSave(actualIndex, bet.id)}
                                className="h-8 w-8 p-0"
                                disabled={
                                  exceedsBalance ||
                                  currentStakeValue <= 0 ||
                                  editStake === "" ||
                                  editOdds === ""
                                }
                              >
                                <Check className="h-4 w-4 text-chart-2" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleCancel}
                                className="h-8 w-8 p-0"
                              >
                                <X className="h-4 w-4 text-destructive" />
                              </Button>
                            </>
                          ) : isEditingResultNow ? (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  handleChangeResult(actualIndex, bet.id, "win")
                                }
                                className="h-8 px-3 text-chart-2 hover:text-chart-2 hover:bg-chart-2/20"
                                title="Marcar como ganada"
                              >
                                <TrendingUp className="h-3 w-3 mr-1" />
                                {"Ganó"}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  handleChangeResult(
                                    actualIndex,
                                    bet.id,
                                    "lose"
                                  )
                                }
                                className="h-8 px-3 text-destructive hover:text-destructive hover:bg-destructive/20"
                                title="Marcar como perdida"
                              >
                                <TrendingDown className="h-3 w-3 mr-1" />
                                {"Perdió"}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleCancelResultEdit}
                                className="h-8 w-8 p-0"
                                title="Cancelar"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          ) : betHasResult ? (
                            <>
                              <span
                                className={`inline-flex items-center gap-1 px-3 py-1 rounded text-xs font-medium ${resolvedBadgeClass}`}
                              >
                                {bet.result === "win" ? (
                                  <TrendingUp className="h-3 w-3" />
                                ) : (
                                  <TrendingDown className="h-3 w-3" />
                                )}
                                {bet.result === "win" ? "Ganó" : "Perdió"}
                              </span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleShowResultOptions(bet.id)}
                                className="h-8 w-8 p-0"
                                title="Cambiar resultado"
                              >
                                <RotateCcw className="h-3 w-3" />
                              </Button>
                            </>
                          ) : canEdit ? (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEdit(bet, actualIndex)}
                                className="h-8 w-8 p-0"
                                title="Editar"
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  handleResult(actualIndex, bet.id, "win")
                                }
                                className="h-8 px-3 text-chart-2 hover:text-chart-2"
                                title="Marcar ganada"
                              >
                                {"W"}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  handleResult(actualIndex, bet.id, "lose")
                                }
                                className="h-8 px-3 text-destructive hover:text-destructive"
                                title="Marcar perdida"
                              >
                                {"L"}
                              </Button>
                              {bets.length > 1 && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() =>
                                    onRemoveBet(actualIndex, bet.id)
                                  }
                                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                  title="Eliminar"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground px-3">
                              -
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-3 pt-3 border-t border-border flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap gap-6">
                    <div>
                      <div className="text-xs text-muted-foreground">
                        {"Total Apostado"}
                      </div>
                      <div
                        className={`text-lg font-bold ${
                          editingBet && editDayIndex === actualIndex
                            ? "text-primary"
                            : "text-card-foreground"
                        }`}
                      >
                        {"$"}
                        {formatCurrency(totalStakeForDay)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">
                        {"Ganancia Total Potencial"}
                      </div>
                      <div
                        className={`text-lg font-bold ${
                          editingBet && editDayIndex === actualIndex
                            ? "text-primary"
                            : "text-accent"
                        }`}
                      >
                        {"$"}
                        {formatCurrency(totalPotentialWinForDay)}
                      </div>
                    </div>
                  </div>
                  {day.result === "completed" && (
                    <div className="text-left sm:text-right">
                      <div className="text-xs text-muted-foreground">
                        {"Balance Final del Día"}
                      </div>
                      <div className="text-xl font-bold text-primary">
                        {"$"}
                        {formatCurrency(day.balanceAfterDay)}
                      </div>
                    </div>
                  )}
                </div>
              </>
            );

            const dayHeader = (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex flex-col">
                    <span className="text-lg font-bold text-card-foreground">
                      {"Día "}
                      {day.day}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(day.date).toLocaleDateString("es-ES", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  {isNextDay && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/20 text-primary">
                      {"Próximo"}
                    </span>
                  )}
                  {day.result === "completed" && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                      {"Completado"}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                  <div className="text-left sm:text-right">
                    <div className="text-xs text-muted-foreground">
                      {"Banca Disponible"}
                    </div>
                    <div className="text-lg font-bold text-card-foreground">
                      {"$"}
                      {formatCurrency(day.currentBalance)}
                    </div>
                  </div>
                  {canEdit && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onAddBet(actualIndex)}
                      className="h-8 w-full sm:w-auto"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      {"Agregar Apuesta"}
                    </Button>
                  )}
                </div>
              </div>
            );

            const dayContainerClass = `rounded-lg border border-border p-4 transition-colors ${
              isNextDay ? "border-primary bg-primary/5" : ""
            } ${day.result === "completed" ? "bg-muted/30" : ""}`;

            if (day.result === "completed") {
              return (
                <Collapsible
                  key={day.day}
                  open={openCompletedDay === day.day}
                  onOpenChange={(open) =>
                    setOpenCompletedDay(open ? day.day : null)
                  }
                >
                  <div className={dayContainerClass}>
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        className="w-full text-left [&[data-state=open]>svg]:rotate-180"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="flex flex-col">
                              <span className="text-lg font-bold text-card-foreground">
                                {"Día "}
                                {day.day}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(day.date).toLocaleDateString(
                                  "es-ES",
                                  {
                                    weekday: "short",
                                    month: "short",
                                    day: "numeric",
                                  }
                                )}
                              </span>
                            </div>
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                              {"Completado"}
                            </span>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="text-xs text-muted-foreground">
                                {"Resultado"}
                              </div>
                              <div
                                className={`text-sm font-semibold ${
                                  dayNet >= 0
                                    ? "text-chart-2"
                                    : "text-destructive"
                                }`}
                              >
                                {dayNet >= 0 ? "+" : "-"}$
                                {formatCurrency(Math.abs(dayNet))}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-muted-foreground">
                                {"Balance"}
                              </div>
                              <div className="text-sm font-semibold text-card-foreground">
                                {"$"}
                                {formatCurrency(day.balanceAfterDay)}
                              </div>
                            </div>
                            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform" />
                          </div>
                        </div>
                      </button>
                    </CollapsibleTrigger>

                    <CollapsibleContent className="data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down overflow-hidden">
                      <div className="mt-3">{dayBody}</div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            }

            return (
              <div key={day.day} className={dayContainerClass}>
                <div className="mb-3">{dayHeader}</div>
                {dayBody}
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`h-2 w-2 rounded-full transition-colors ${
                page === currentPage
                  ? "bg-primary"
                  : "bg-muted hover:bg-muted-foreground/50"
              }`}
              aria-label={`Página ${page}`}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
