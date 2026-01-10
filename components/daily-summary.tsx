"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, AlertCircle } from "lucide-react"
import type { DayResult } from "@/lib/betting-types"

interface DailySummaryProps {
  plan: DayResult[]
}

export function DailySummary({ plan }: DailySummaryProps) {
  const today = new Date().toISOString().split("T")[0]
  const todayPlan = plan.find((day) => day.date === today)

  if (!todayPlan) return null

  const isCompleted = todayPlan.result === "completed"
  const pendingBets = todayPlan.bets?.filter((bet) => !bet.result) || []
  const completedBets = todayPlan.bets?.filter((bet) => bet.result) || []
  const wonBets = completedBets.filter((bet) => bet.result === "win").length
  const lostBets = completedBets.filter((bet) => bet.result === "lose").length

  return (
    <Card className="border-primary/50 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Calendar className="h-4 w-4 text-primary" />
          Resumen de Hoy - Día {todayPlan.day}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Banca Disponible</p>
            <p className="text-xl font-bold text-primary">${todayPlan.currentBalance.toFixed(2)}</p>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Total a Apostar</p>
            <p className="text-xl font-bold">${todayPlan.totalStake.toFixed(2)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={isCompleted ? "default" : "secondary"}>
            {isCompleted ? "Completado" : `${pendingBets.length} pendiente${pendingBets.length !== 1 ? "s" : ""}`}
          </Badge>
          {wonBets > 0 && (
            <Badge variant="default" className="bg-green-500">
              {wonBets} ganada{wonBets !== 1 ? "s" : ""}
            </Badge>
          )}
          {lostBets > 0 && (
            <Badge variant="destructive">
              {lostBets} perdida{lostBets !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>

        {!isCompleted && (
          <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Recuerda marcar tus apuestas como ganadas o perdidas una vez finalicen
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
