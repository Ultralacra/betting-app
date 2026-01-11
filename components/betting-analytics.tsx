"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { DayResult } from "@/lib/betting-types"
import { Target, TrendingUp, TrendingDown, Flame } from "lucide-react"

interface BettingAnalyticsProps {
  plan: DayResult[]
  initialBudget: number
}

export function BettingAnalytics({ plan, initialBudget }: BettingAnalyticsProps) {
  const completedBets = plan.flatMap((day) =>
    (day.bets || []).filter((bet) => bet.result !== null && bet.result !== undefined),
  )

  const totalBets = completedBets.length
  const wonBets = completedBets.filter((bet) => bet.result === "win").length
  const lostBets = completedBets.filter((bet) => bet.result === "lose").length
  const winRate = totalBets > 0 ? (wonBets / totalBets) * 100 : 0

  const completedDays = plan.filter((day) => day.result === "completed")
  const lastCompletedDay = completedDays[completedDays.length - 1]
  const currentBalance = lastCompletedDay?.balanceAfterDay || initialBudget
  const totalProfit = currentBalance - initialBudget
  const roi = initialBudget > 0 ? (totalProfit / initialBudget) * 100 : 0

  // Calcular rachas
  let currentStreak = 0
  let bestWinStreak = 0
  let worstLoseStreak = 0
  let tempWinStreak = 0
  let tempLoseStreak = 0

  completedBets.forEach((bet, index) => {
    if (bet.result === "win") {
      tempWinStreak++
      tempLoseStreak = 0
      if (index === completedBets.length - 1) currentStreak = tempWinStreak
      bestWinStreak = Math.max(bestWinStreak, tempWinStreak)
    } else {
      tempLoseStreak++
      tempWinStreak = 0
      if (index === completedBets.length - 1) currentStreak = -tempLoseStreak
      worstLoseStreak = Math.max(worstLoseStreak, tempLoseStreak)
    }
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="h-4 w-4" />
          Análisis de Rendimiento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Win Rate</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold">{winRate.toFixed(1)}%</p>
              <Badge variant={winRate >= 50 ? "default" : "destructive"} className="text-xs">
                {wonBets}W / {lostBets}L
              </Badge>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">ROI Total</p>
            <div className="flex items-baseline gap-2">
              <p className={`text-2xl font-bold ${roi >= 0 ? "text-accent" : "text-destructive"}`}>
                {roi >= 0 ? "+" : ""}
                {roi.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-2 border-t">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-muted-foreground">Racha Actual</span>
            </div>
            <Badge variant={currentStreak > 0 ? "default" : currentStreak < 0 ? "destructive" : "secondary"}>
              {currentStreak > 0 ? `+${currentStreak}` : currentStreak}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Mejor Racha</span>
            </div>
            <Badge variant="default">{bestWinStreak} victorias</Badge>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-500" />
              <span className="text-sm text-muted-foreground">Peor Racha</span>
            </div>
            <Badge variant="destructive">{worstLoseStreak} derrotas</Badge>
          </div>
        </div>

        <div className="pt-2 border-t text-xs text-muted-foreground">Total de apuestas completadas: {totalBets}</div>
      </CardContent>
    </Card>
  )
}
