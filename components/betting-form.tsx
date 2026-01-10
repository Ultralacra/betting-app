"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { BettingConfig } from "@/lib/betting-types"
import { Calculator, RotateCcw, Wallet, Plus } from "lucide-react"
import { DateRangePicker } from "./date-range-picker"
import type { DateRange } from "react-day-picker"
import { toast } from "@/hooks/use-toast"

interface BettingFormProps {
  onSubmit: (config: BettingConfig) => void
  initialConfig: BettingConfig | null
  onReset: () => void
  currentBalance: number
  onAddBalance: (amount: number) => void
}

export function BettingForm({ onSubmit, initialConfig, onReset, currentBalance, onAddBalance }: BettingFormProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    if (initialConfig?.startDate && initialConfig?.endDate) {
      return {
        from: new Date(initialConfig.startDate),
        to: new Date(initialConfig.endDate),
      }
    }
    return undefined
  })

  const [formData, setFormData] = useState<BettingConfig>(
    initialConfig || {
      initialBudget: 25,
      odds: 1.6,
      reinvestmentPercentage: 50,
      betsPerDay: 1,
      stakePercentage: 10,
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date(Date.now() + 29 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    },
  )

  const [rechargeAmount, setRechargeAmount] = useState<string>("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!dateRange?.from || !dateRange?.to) {
      toast({
        variant: "destructive",
        title: "Rango de fechas requerido",
        description: "Por favor selecciona un rango de fechas.",
      })
      return
    }
    const configWithDates = {
      ...formData,
      startDate: dateRange.from.toISOString().split("T")[0],
      endDate: dateRange.to.toISOString().split("T")[0],
    }
    onSubmit(configWithDates)
  }

  const handleChange = (field: keyof BettingConfig, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: ["initialBudget", "odds", "reinvestmentPercentage", "betsPerDay", "stakePercentage"].includes(field)
        ? Number.parseFloat(value) || 0
        : value,
    }))
  }

  const handleRecharge = () => {
    const amount = Number.parseFloat(rechargeAmount)
    if (isNaN(amount) || amount <= 0) {
      toast({
        variant: "destructive",
        title: "Monto inválido",
        description: "Por favor ingresa un monto válido.",
      })
      return
    }
    onAddBalance(amount)
    setRechargeAmount("")
    toast({ title: "Saldo agregado", description: `Se agregó $${amount.toFixed(2)} a tu banca.` })
  }

  const getDaysCount = () => {
    if (!dateRange?.from || !dateRange?.to) return 0
    const diff = dateRange.to.getTime() - dateRange.from.getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          {"Configuración"}
        </CardTitle>
        <CardDescription>{"Define los parámetros de tu estrategia"}</CardDescription>
      </CardHeader>
      <CardContent>
        {currentBalance > 0 && (
          <div className="mb-4 rounded-lg bg-primary/10 p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Wallet className="h-4 w-4" />
              {"Banca Actual"}
            </div>
            <div className="text-2xl font-bold text-primary">
              {"$"}
              {currentBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>

            {initialConfig && (
              <div className="mt-3 pt-3 border-t border-border/50">
                <Label htmlFor="recharge" className="text-xs text-muted-foreground mb-2 block">
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
                    disabled={!rechargeAmount || Number.parseFloat(rechargeAmount) <= 0}
                    className="h-9"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    {"Agregar"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{"Solo afecta días pendientes sin resultados"}</p>
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
              value={formData.initialBudget}
              onChange={(e) => handleChange("initialBudget", e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="odds">{"Cuota Promedio"}</Label>
            <Input
              id="odds"
              type="number"
              step="0.01"
              min="1.01"
              value={formData.odds}
              onChange={(e) => handleChange("odds", e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="stake">{"Porcentaje por Apuesta (%)"}</Label>
            <Input
              id="stake"
              type="number"
              step="1"
              min="1"
              max="100"
              value={formData.stakePercentage}
              onChange={(e) => handleChange("stakePercentage", e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">{"Del saldo actual por apuesta"}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reinvestment">{"Reinversión de Ganancias (%)"}</Label>
            <Input
              id="reinvestment"
              type="number"
              step="1"
              min="0"
              max="100"
              value={formData.reinvestmentPercentage}
              onChange={(e) => handleChange("reinvestmentPercentage", e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">{"Porcentaje de ganancia a reinvertir"}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="betsPerDay">{"Apuestas por Día"}</Label>
            <Input
              id="betsPerDay"
              type="number"
              step="1"
              min="1"
              max="10"
              value={formData.betsPerDay}
              onChange={(e) => handleChange("betsPerDay", e.target.value)}
              required
            />
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
            <Button type="submit" className="flex-1">
              {"Generar Plan"}
            </Button>
            {initialConfig && (
              <Button type="button" variant="outline" onClick={onReset}>
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
