"use client";

import type React from "react";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { BettingConfig } from "@/lib/betting-types";
import { Calculator, RotateCcw, Wallet, Plus, AlertCircle } from "lucide-react";
import { DateRangePicker } from "./date-range-picker";
import type { DateRange } from "react-day-picker";
import { toast } from "@/hooks/use-toast";
import { Spinner } from "@/components/ui/spinner";
import { BettingConfigSchema, formatZodErrors } from "@/lib/validations";
import { BETTING_LIMITS } from "@/lib/constants";

interface BettingFormProps {
  onSubmit: (config: BettingConfig) => void | Promise<void>;
  initialConfig: BettingConfig | null;
  onReset: () => void;
  currentBalance: number;
  onAddBalance: (amount: number) => void;
}

export function BettingForm({
  onSubmit,
  initialConfig,
  onReset,
  currentBalance,
  onAddBalance,
}: BettingFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    if (initialConfig?.startDate && initialConfig?.endDate) {
      return {
        from: new Date(initialConfig.startDate),
        to: new Date(initialConfig.endDate),
      };
    }
    return undefined;
  });

  const [formData, setFormData] = useState<BettingConfig>(
    initialConfig || {
      initialBudget: 25,
      odds: 1.6,
      reinvestmentPercentage: 50,
      betsPerDay: 1,
      stakePercentage: 10,
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date(Date.now() + 29 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
    },
  );

  // Estado de inputs como strings para permitir borrado completo
  const [inputValues, setInputValues] = useState({
    initialBudget: String(initialConfig?.initialBudget ?? 25),
    odds: String(initialConfig?.odds ?? 1.6),
    reinvestmentPercentage: String(initialConfig?.reinvestmentPercentage ?? 50),
    betsPerDay: String(initialConfig?.betsPerDay ?? 1),
    stakePercentage: String(initialConfig?.stakePercentage ?? 10),
  });

  const [rechargeAmount, setRechargeAmount] = useState<string>("");

  // Sincronizar inputValues cuando cambie initialConfig (ej. al editar un plan)
  useEffect(() => {
    if (initialConfig) {
      setInputValues({
        initialBudget: String(initialConfig.initialBudget),
        odds: String(initialConfig.odds),
        reinvestmentPercentage: String(initialConfig.reinvestmentPercentage),
        betsPerDay: String(initialConfig.betsPerDay),
        stakePercentage: String(initialConfig.stakePercentage),
      });
      setFormData(initialConfig);
      if (initialConfig.startDate && initialConfig.endDate) {
        setDateRange({
          from: new Date(initialConfig.startDate),
          to: new Date(initialConfig.endDate),
        });
      }
    }
  }, [initialConfig]);

  // Validación en tiempo real con Zod
  const validationErrors = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return {};

    const configToValidate = {
      ...formData,
      startDate: dateRange.from.toISOString().split("T")[0],
      endDate: dateRange.to.toISOString().split("T")[0],
    };

    const result = BettingConfigSchema.safeParse(configToValidate);
    if (result.success) return {};

    const errors: Record<string, string> = {};
    result.error.errors.forEach((err) => {
      const field = err.path[0] as string;
      if (!errors[field]) {
        errors[field] = err.message;
      }
    });
    return errors;
  }, [formData, dateRange]);

  const hasErrors = Object.keys(validationErrors).length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!dateRange?.from || !dateRange?.to) {
      toast({
        variant: "destructive",
        title: "Rango de fechas requerido",
        description: "Por favor selecciona un rango de fechas.",
      });
      return;
    }
    const configWithDates = {
      ...formData,
      startDate: dateRange.from.toISOString().split("T")[0],
      endDate: dateRange.to.toISOString().split("T")[0],
    };

    // Validar con Zod antes de enviar
    const validation = BettingConfigSchema.safeParse(configWithDates);
    if (!validation.success) {
      toast({
        variant: "destructive",
        title: "Datos inválidos",
        description: formatZodErrors(validation.error).join(", "),
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit(configWithDates);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: keyof BettingConfig, value: string) => {
    const numericFields = [
      "initialBudget",
      "odds",
      "reinvestmentPercentage",
      "betsPerDay",
      "stakePercentage",
    ] as const;

    if (numericFields.includes(field as (typeof numericFields)[number])) {
      // Actualizar el valor del input como string (permite vacío)
      setInputValues((prev) => ({
        ...prev,
        [field]: value,
      }));
      // Actualizar formData con el valor numérico (o 0 si está vacío)
      setFormData((prev) => ({
        ...prev,
        [field]: value === "" ? 0 : Number.parseFloat(value) || 0,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  const handleRecharge = () => {
    const amount = Number.parseFloat(rechargeAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        variant: "destructive",
        title: "Monto inválido",
        description: "Por favor ingresa un monto válido.",
      });
      return;
    }
    onAddBalance(amount);
    setRechargeAmount("");
    toast({
      title: "Saldo agregado",
      description: `Se agregó $${amount.toFixed(2)} a tu banca.`,
    });
  };

  const getDaysCount = () => {
    if (!dateRange?.from || !dateRange?.to) return 0;
    const diff = dateRange.to.getTime() - dateRange.from.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          {"Configuración"}
        </CardTitle>
        <CardDescription>
          {"Define los parámetros de tu estrategia"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <fieldset disabled={isSubmitting} className="space-y-4">
          {currentBalance > 0 && (
            <div className="mb-4 rounded-lg bg-primary/10 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Wallet className="h-4 w-4" />
                {"Banca Actual"}
              </div>
              <div className="text-2xl font-bold text-primary">
                {"$"}
                {currentBalance.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>

              {initialConfig && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <Label
                    htmlFor="recharge"
                    className="text-xs text-muted-foreground mb-2 block"
                  >
                    {"Recargar Saldo"}
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="recharge"
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="$0.00"
                      value={rechargeAmount}
                      onChange={(e) => setRechargeAmount(e.target.value)}
                      className="h-9"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleRecharge}
                      disabled={
                        !rechargeAmount ||
                        Number.parseFloat(rechargeAmount) <= 0
                      }
                      className="h-9"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      {"Agregar"}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {"Solo afecta días pendientes sin resultados"}
                  </p>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="budget">{"Presupuesto Inicial ($)"}</Label>
              <Input
                id="budget"
                type="number"
                step="0.01"
                min={BETTING_LIMITS.MIN_INITIAL_BUDGET}
                value={inputValues.initialBudget}
                onChange={(e) => handleChange("initialBudget", e.target.value)}
                className={
                  validationErrors.initialBudget ? "border-destructive" : ""
                }
                aria-invalid={!!validationErrors.initialBudget}
                required
              />
              {validationErrors.initialBudget && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {validationErrors.initialBudget}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="odds">{"Cuota Promedio"}</Label>
              <Input
                id="odds"
                type="number"
                step="0.01"
                min={BETTING_LIMITS.MIN_ODDS}
                max={BETTING_LIMITS.MAX_ODDS}
                value={inputValues.odds}
                onChange={(e) => handleChange("odds", e.target.value)}
                className={validationErrors.odds ? "border-destructive" : ""}
                aria-invalid={!!validationErrors.odds}
                required
              />
              {validationErrors.odds && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {validationErrors.odds}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="stake">{"Porcentaje por Apuesta (%)"}</Label>
              <Input
                id="stake"
                type="number"
                step="1"
                min={BETTING_LIMITS.MIN_STAKE_PERCENTAGE}
                max={BETTING_LIMITS.MAX_STAKE_PERCENTAGE}
                value={inputValues.stakePercentage}
                onChange={(e) =>
                  handleChange("stakePercentage", e.target.value)
                }
                className={
                  validationErrors.stakePercentage ? "border-destructive" : ""
                }
                aria-invalid={!!validationErrors.stakePercentage}
                required
              />
              {validationErrors.stakePercentage ? (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {validationErrors.stakePercentage}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {"Del saldo actual por apuesta"}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="reinvestment">
                {"Reinversión de Ganancias (%)"}
              </Label>
              <Input
                id="reinvestment"
                type="number"
                step="1"
                min={BETTING_LIMITS.MIN_REINVESTMENT}
                max={BETTING_LIMITS.MAX_REINVESTMENT}
                value={inputValues.reinvestmentPercentage}
                onChange={(e) =>
                  handleChange("reinvestmentPercentage", e.target.value)
                }
                className={
                  validationErrors.reinvestmentPercentage
                    ? "border-destructive"
                    : ""
                }
                aria-invalid={!!validationErrors.reinvestmentPercentage}
                required
              />
              {validationErrors.reinvestmentPercentage ? (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {validationErrors.reinvestmentPercentage}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {"Porcentaje de ganancia a reinvertir"}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="betsPerDay">{"Apuestas por Día"}</Label>
              <Input
                id="betsPerDay"
                type="number"
                step="1"
                min={BETTING_LIMITS.MIN_BETS_PER_DAY}
                max={BETTING_LIMITS.MAX_BETS_PER_DAY}
                value={inputValues.betsPerDay}
                onChange={(e) => handleChange("betsPerDay", e.target.value)}
                className={
                  validationErrors.betsPerDay ? "border-destructive" : ""
                }
                aria-invalid={!!validationErrors.betsPerDay}
                required
              />
              {validationErrors.betsPerDay && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {validationErrors.betsPerDay}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>{"Rango de Fechas"}</Label>
              <DateRangePicker value={dateRange} onChange={setDateRange} />
              {dateRange?.from && dateRange?.to && (
                <p className="text-xs text-muted-foreground">
                  {"Plan de "}
                  {getDaysCount()}
                  {" días"}
                </p>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="submit"
                className="flex-1"
                disabled={isSubmitting || hasErrors}
                aria-label="Generar plan de apuestas"
              >
                {isSubmitting ? (
                  <>
                    <Spinner className="mr-2" />
                    {"Generando..."}
                  </>
                ) : (
                  "Generar Plan"
                )}
              </Button>
              {initialConfig && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onReset}
                  aria-label="Reiniciar configuración"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              )}
            </div>
          </form>
        </fieldset>
      </CardContent>
    </Card>
  );
}
