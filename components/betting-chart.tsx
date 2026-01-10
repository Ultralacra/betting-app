"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { DayResult } from "@/lib/betting-types"
import { LineChart } from "lucide-react"
import { useMemo } from "react"

interface BettingChartProps {
  plan: DayResult[]
  initialBudget: number
}

export function BettingChart({ plan, initialBudget }: BettingChartProps) {
  const chartData = useMemo(() => {
    const data = [{ day: 0, balance: initialBudget, isActual: true }]

    plan.forEach((dayResult) => {
      const balance = dayResult.result === "completed" ? dayResult.balanceAfterDay : dayResult.balanceAfterDay

      data.push({
        day: dayResult.day,
        balance,
        isActual: dayResult.result === "completed",
      })
    })

    return data
  }, [plan, initialBudget])

  const maxBalance = Math.max(...chartData.map((d) => d.balance), initialBudget)
  const minBalance = Math.min(...chartData.map((d) => d.balance), initialBudget)
  const range = maxBalance - minBalance
  const chartHeight = 200

  const getY = (balance: number) => {
    if (range === 0) return chartHeight / 2
    return chartHeight - ((balance - minBalance) / range) * chartHeight
  }

  const getX = (day: number) => {
    return (day / (plan.length || 1)) * 100
  }

  const actualPoints = chartData.filter((d) => d.isActual)
  const projectedPoints = chartData.filter((d, i) => {
    if (i === 0) return true
    const prevActual = chartData.slice(0, i + 1).findLast((p) => p.isActual)
    return prevActual?.day === d.day - 1 || d.day === chartData[i - 1]?.day + 1
  })

  const actualPath =
    actualPoints.length > 1
      ? actualPoints
          .map((point, i) => {
            const x = getX(point.day)
            const y = getY(point.balance)
            return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`
          })
          .join(" ")
      : ""

  const projectedStartDay = actualPoints[actualPoints.length - 1]?.day || 0
  const projectedPath = projectedPoints
    .filter((p) => p.day >= projectedStartDay)
    .map((point, i) => {
      const x = getX(point.day)
      const y = getY(point.balance)
      return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`
    })
    .join(" ")

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <LineChart className="h-4 w-4" />
          Evolución de Banca
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative w-full" style={{ height: chartHeight }}>
          <svg width="100%" height={chartHeight} className="overflow-visible">
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((percent) => {
              const y = chartHeight * percent
              const value = maxBalance - range * percent
              return (
                <g key={percent}>
                  <line
                    x1="0"
                    y1={y}
                    x2="100%"
                    y2={y}
                    stroke="currentColor"
                    strokeWidth="1"
                    className="text-border opacity-30"
                    strokeDasharray="4 4"
                  />
                  <text x="0" y={y - 4} fontSize="10" fill="currentColor" className="text-muted-foreground">
                    ${value.toFixed(0)}
                  </text>
                </g>
              )
            })}

            {/* Projected line */}
            {projectedPath && (
              <path
                d={projectedPath}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-muted-foreground"
                strokeDasharray="5 5"
                vectorEffect="non-scaling-stroke"
              />
            )}

            {/* Actual line */}
            {actualPath && (
              <path
                d={actualPath}
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                className="text-primary"
                vectorEffect="non-scaling-stroke"
              />
            )}

            {/* Points */}
            {chartData.map((point) => (
              <circle
                key={point.day}
                cx={`${getX(point.day)}%`}
                cy={getY(point.balance)}
                r="4"
                fill="currentColor"
                className={point.isActual ? "text-primary" : "text-muted-foreground"}
              />
            ))}
          </svg>
        </div>

        <div className="flex gap-4 mt-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-primary" />
            <span className="text-muted-foreground">Real</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-muted-foreground border-dashed border-t-2" />
            <span className="text-muted-foreground">Proyectado</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
