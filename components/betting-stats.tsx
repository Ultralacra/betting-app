"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { DayResult, BettingConfig } from "@/lib/betting-types"
import { TrendingUp, DollarSign, Target, Percent } from "lucide-react"

interface BettingStatsProps {
  plan: DayResult[]
  config: BettingConfig
  currentBalance: number
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function BettingStats({ plan, config, currentBalance }: BettingStatsProps) {
  if (!plan || plan.length === 0) {
    return null
  }

  const lastCompletedDay = plan.findLast((day) => day.result === "completed")
  const nextDay = plan.find((day) => day.result === null)

  const lastDay = plan[plan.length - 1]
  const firstDay = plan[0]

  const actualBalance = lastCompletedDay ? lastCompletedDay.balanceAfterDay : config.initialBudget
  const projectedFinalBalance = lastDay?.balanceAfterDay ?? config.initialBudget

  const totalProfit = lastCompletedDay
    ? actualBalance - config.initialBudget
    : projectedFinalBalance - config.initialBudget

  const profitPercentage = (totalProfit / config.initialBudget) * 100

  const nextDayTotalStake = nextDay ? nextDay.totalStake : (firstDay?.totalStake ?? 0)
  const nextDayBetsCount = nextDay ? (nextDay.bets?.length ?? 0) : (firstDay?.bets?.length ?? 0)

  const lastDayTotalStake = lastDay?.totalStake ?? 0
  const lastDayBetsCount = lastDay?.bets?.length ?? 0

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {lastCompletedDay ? "Banca Actual" : "Saldo Final Proyectado"}
          </CardTitle>
          <DollarSign className="h-4 w-4 text-accent" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-card-foreground">
            ${formatCurrency(lastCompletedDay ? actualBalance : projectedFinalBalance)}
          </div>
          <p className="text-xs text-muted-foreground">
            {lastCompletedDay ? `Después del día ${lastCompletedDay.day}` : "Si ganas todas las apuestas"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {lastCompletedDay ? "Ganancia Actual" : "Ganancia Proyectada"}
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-accent" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${totalProfit >= 0 ? "text-accent" : "text-destructive"}`}>
            {totalProfit >= 0 ? "+" : ""}${formatCurrency(Math.abs(totalProfit))}
          </div>
          <p className="text-xs text-muted-foreground">
            {totalProfit >= 0 ? "+" : ""}
            {profitPercentage.toFixed(2)}
            {"% de retorno"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {nextDay ? "Próximo Día" : "Día Inicial"}
          </CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-card-foreground">${formatCurrency(nextDayTotalStake)}</div>
          <p className="text-xs text-muted-foreground">
            {nextDay
              ? `Día ${nextDay.day} - ${nextDayBetsCount} apuesta${nextDayBetsCount > 1 ? "s" : ""}`
              : `Día 1 - ${nextDayBetsCount} apuesta${nextDayBetsCount > 1 ? "s" : ""}`}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{"Último Día"}</CardTitle>
          <Percent className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-card-foreground">${formatCurrency(lastDayTotalStake)}</div>
          <p className="text-xs text-muted-foreground">
            Día {plan.length} - {lastDayBetsCount} apuesta{lastDayBetsCount > 1 ? "s" : ""}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
