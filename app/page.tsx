"use client"

import { useState, useEffect } from "react"
import { BettingForm } from "@/components/betting-form"
import { BettingPlan } from "@/components/betting-plan"
import { BettingStats } from "@/components/betting-stats"
import { BettingChart } from "@/components/betting-chart"
import { BettingAnalytics } from "@/components/betting-analytics"
import { BettingHistory } from "@/components/betting-history"
import { PlanManager } from "@/components/plan-manager"
import { QuickCalculator } from "@/components/quick-calculator"
import { DailySummary } from "@/components/daily-summary"
import { TrendingUp, Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/hooks/use-toast"

export interface BettingConfig {
  initialBudget: number
  odds: number
  reinvestmentPercentage: number
  betsPerDay: number
  stakePercentage: number
  startDate: string
  endDate: string
}

export interface IndividualBet {
  id: string
  stakePercentage: number
  stake: number
  odds: number
  potentialWin: number
  result?: "win" | "lose" | null
}

export interface DayResult {
  day: number
  date: string
  bets: IndividualBet[]
  currentBalance: number
  totalStake: number
  totalPotentialWin: number
  balanceAfterDay: number
  result?: "completed" | null
}

export default function Page() {
  const [config, setConfig] = useState<BettingConfig | null>(null)
  const [plan, setPlan] = useState<DayResult[]>([])
  const [currentBalance, setCurrentBalance] = useState<number>(0)
  const [isDarkMode, setIsDarkMode] = useState(false)

  useEffect(() => {
    const savedConfig = localStorage.getItem("bettingConfig")
    const savedPlan = localStorage.getItem("bettingPlan")
    const savedBalance = localStorage.getItem("currentBalance")
    const savedTheme = localStorage.getItem("theme")

    if (savedConfig) {
      setConfig(JSON.parse(savedConfig))
    }
    if (savedPlan) {
      setPlan(JSON.parse(savedPlan))
    }
    if (savedBalance) {
      setCurrentBalance(Number.parseFloat(savedBalance))
    }
    if (savedTheme === "dark") {
      setIsDarkMode(true)
      document.documentElement.classList.add("dark")
    }
  }, [])

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode)
    if (!isDarkMode) {
      document.documentElement.classList.add("dark")
      localStorage.setItem("theme", "dark")
    } else {
      document.documentElement.classList.remove("dark")
      localStorage.setItem("theme", "light")
    }
  }

  const handleConfigSubmit = (newConfig: BettingConfig) => {
    setConfig(newConfig)
    setCurrentBalance(newConfig.initialBudget)
    localStorage.setItem("bettingConfig", JSON.stringify(newConfig))
    localStorage.setItem("currentBalance", newConfig.initialBudget.toString())

    const generatedPlan = generatePlan(newConfig, newConfig.initialBudget)
    setPlan(generatedPlan)
    localStorage.setItem("bettingPlan", JSON.stringify(generatedPlan))
  }

  const handleReset = () => {
    setConfig(null)
    setPlan([])
    setCurrentBalance(0)
    localStorage.removeItem("bettingConfig")
    localStorage.removeItem("bettingPlan")
    localStorage.removeItem("currentBalance")
  }

  const handleUpdateBet = (dayIndex: number, betId: string, updates: Partial<IndividualBet>) => {
    if (!config) return

    const updatedPlan = [...plan]
    const day = updatedPlan[dayIndex]
    const betIndex = day.bets.findIndex((b) => b.id === betId)

    if (betIndex === -1) return

    const bet = day.bets[betIndex]

    if (updates.stakePercentage !== undefined) {
      bet.stakePercentage = updates.stakePercentage
    }
    if (updates.odds !== undefined) {
      bet.odds = updates.odds
    }
    if (updates.result !== undefined) {
      bet.result = updates.result
    }

    bet.stake = (day.currentBalance * bet.stakePercentage) / 100
    bet.potentialWin = bet.stake * bet.odds

    day.totalStake = day.bets.reduce((sum, b) => sum + b.stake, 0)
    day.totalPotentialWin = day.bets.reduce((sum, b) => sum + b.potentialWin, 0)

    if (day.totalStake > day.currentBalance) {
      toast({
        variant: "destructive",
        title: "Banca insuficiente",
        description: `El total apostado ($${day.totalStake.toFixed(2)}) excede la banca disponible ($${day.currentBalance.toFixed(2)}).`,
      })
      return
    }

    const allBetsCompleted = day.bets.every((b) => b.result !== null && b.result !== undefined)

    if (allBetsCompleted) {
      day.result = "completed"

      let netResult = 0
      day.bets.forEach((b) => {
        if (b.result === "win") {
          const profit = b.potentialWin - b.stake
          netResult += (profit * config.reinvestmentPercentage) / 100
        } else if (b.result === "lose") {
          netResult -= b.stake
        }
      })

      day.balanceAfterDay = day.currentBalance + netResult
    }

    setPlan(updatedPlan)
    localStorage.setItem("bettingPlan", JSON.stringify(updatedPlan))

    if (day.result === "completed") {
      recalculateFollowingDays(updatedPlan, dayIndex)
    }
  }

  const handleAddBet = (dayIndex: number) => {
    if (!config) return

    const updatedPlan = [...plan]
    const day = updatedPlan[dayIndex]

    const newBet: IndividualBet = {
      id: `${day.day}-${Date.now()}`,
      stakePercentage: config.stakePercentage,
      stake: (day.currentBalance * config.stakePercentage) / 100,
      odds: config.odds,
      potentialWin: 0,
      result: null,
    }

    newBet.potentialWin = newBet.stake * newBet.odds

    day.bets.push(newBet)
    day.totalStake = day.bets.reduce((sum, b) => sum + b.stake, 0)
    day.totalPotentialWin = day.bets.reduce((sum, b) => sum + b.potentialWin, 0)

    setPlan(updatedPlan)
    localStorage.setItem("bettingPlan", JSON.stringify(updatedPlan))
  }

  const handleRemoveBet = (dayIndex: number, betId: string) => {
    const updatedPlan = [...plan]
    const day = updatedPlan[dayIndex]

    if (day.bets.length === 1) {
      toast({
        variant: "destructive",
        title: "No se puede eliminar",
        description: "Debe haber al menos una apuesta por día.",
      })
      return
    }

    day.bets = day.bets.filter((b) => b.id !== betId)
    day.totalStake = day.bets.reduce((sum, b) => sum + b.stake, 0)
    day.totalPotentialWin = day.bets.reduce((sum, b) => sum + b.potentialWin, 0)

    setPlan(updatedPlan)
    localStorage.setItem("bettingPlan", JSON.stringify(updatedPlan))
  }

  const recalculateFollowingDays = (updatedPlan: DayResult[], fromIndex: number) => {
    if (!config) return

    for (let i = fromIndex + 1; i < updatedPlan.length; i++) {
      const prevDay = updatedPlan[i - 1]
      const currentDay = updatedPlan[i]

      if (prevDay.result === "completed") {
        currentDay.currentBalance = prevDay.balanceAfterDay
      } else {
        currentDay.currentBalance = prevDay.currentBalance
      }

      currentDay.bets.forEach((bet) => {
        bet.stake = (currentDay.currentBalance * bet.stakePercentage) / 100
        bet.potentialWin = bet.stake * bet.odds
      })

      currentDay.totalStake = currentDay.bets.reduce((sum, b) => sum + b.stake, 0)
      currentDay.totalPotentialWin = currentDay.bets.reduce((sum, b) => sum + b.potentialWin, 0)

      if (currentDay.result === "completed") {
        let netResult = 0
        currentDay.bets.forEach((b) => {
          if (b.result === "win") {
            const profit = b.potentialWin - b.stake
            netResult += (profit * config.reinvestmentPercentage) / 100
          } else if (b.result === "lose") {
            netResult -= b.stake
          }
        })
        currentDay.balanceAfterDay = currentDay.currentBalance + netResult
      }
    }

    setPlan(updatedPlan)
    localStorage.setItem("bettingPlan", JSON.stringify(updatedPlan))

    const lastCompletedDay = updatedPlan.findLast((d) => d.result === "completed")
    if (lastCompletedDay) {
      setCurrentBalance(lastCompletedDay.balanceAfterDay)
      localStorage.setItem("currentBalance", lastCompletedDay.balanceAfterDay.toString())
    }
  }

  const handleAddBalance = (amount: number) => {
    if (!config || amount <= 0) return

    const updatedPlan = [...plan]

    const lastCompletedIndex = updatedPlan.findIndex((d) => d.result !== "completed")
    const startIndex = lastCompletedIndex === -1 ? updatedPlan.length : lastCompletedIndex

    if (startIndex === 0) {
      const newInitialBalance = currentBalance + amount
      setCurrentBalance(newInitialBalance)
      localStorage.setItem("currentBalance", newInitialBalance.toString())

      const newConfig = { ...config, initialBudget: newInitialBalance }
      const generatedPlan = generatePlan(newConfig, newInitialBalance)
      setPlan(generatedPlan)
      localStorage.setItem("bettingPlan", JSON.stringify(generatedPlan))
      return
    }

    const newBalance = currentBalance + amount
    setCurrentBalance(newBalance)
    localStorage.setItem("currentBalance", newBalance.toString())

    for (let i = startIndex; i < updatedPlan.length; i++) {
      const day = updatedPlan[i]

      if (i === startIndex && i > 0 && updatedPlan[i - 1].result === "completed") {
        day.currentBalance = updatedPlan[i - 1].balanceAfterDay + amount
      } else if (i > startIndex && updatedPlan[i - 1].result === "completed") {
        day.currentBalance = updatedPlan[i - 1].balanceAfterDay
      } else if (i === startIndex) {
        day.currentBalance = newBalance
      }

      day.bets.forEach((bet) => {
        bet.stake = (day.currentBalance * bet.stakePercentage) / 100
        bet.potentialWin = bet.stake * bet.odds
      })

      day.totalStake = day.bets.reduce((sum, b) => sum + b.stake, 0)
      day.totalPotentialWin = day.bets.reduce((sum, b) => sum + b.potentialWin, 0)

      const totalProfit = day.totalPotentialWin - day.totalStake
      day.balanceAfterDay = day.currentBalance + (totalProfit * config.reinvestmentPercentage) / 100
    }

    setPlan(updatedPlan)
    localStorage.setItem("bettingPlan", JSON.stringify(updatedPlan))
  }

  const handleLoadPlan = (loadedConfig: BettingConfig, loadedPlan: DayResult[]) => {
    setConfig(loadedConfig)
    setPlan(loadedPlan)

    const lastCompleted = loadedPlan.findLast((d) => d.result === "completed")
    const balance = lastCompleted ? lastCompleted.balanceAfterDay : loadedConfig.initialBudget
    setCurrentBalance(balance)

    localStorage.setItem("bettingConfig", JSON.stringify(loadedConfig))
    localStorage.setItem("bettingPlan", JSON.stringify(loadedPlan))
    localStorage.setItem("currentBalance", balance.toString())
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <TrendingUp className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">BetTracker Pro</h1>
                <p className="text-sm text-muted-foreground">{"Gestión inteligente de apuestas"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <QuickCalculator />
              <Button variant="outline" size="sm" onClick={toggleDarkMode}>
                {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1 space-y-6">
            <BettingForm
              onSubmit={handleConfigSubmit}
              initialConfig={config}
              onReset={handleReset}
              currentBalance={currentBalance}
              onAddBalance={handleAddBalance}
            />
            <PlanManager currentConfig={config} currentPlan={plan} onLoadPlan={handleLoadPlan} />
          </div>

          <div className="lg:col-span-2">
            {config && plan.length > 0 ? (
              <Tabs defaultValue="dashboard" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="dashboard">Panel</TabsTrigger>
                  <TabsTrigger value="plan">Plan</TabsTrigger>
                  <TabsTrigger value="analytics">Análisis</TabsTrigger>
                  <TabsTrigger value="history">Historial</TabsTrigger>
                  <TabsTrigger value="calculator">Calculadora</TabsTrigger>
                </TabsList>

                <TabsContent value="dashboard" className="space-y-6 mt-6">
                  <DailySummary plan={plan} />
                  <BettingStats plan={plan} config={config} currentBalance={currentBalance} />
                </TabsContent>

                <TabsContent value="plan" className="space-y-6 mt-6">
                  <BettingPlan
                    plan={plan}
                    config={config}
                    onUpdateBet={handleUpdateBet}
                    onAddBet={handleAddBet}
                    onRemoveBet={handleRemoveBet}
                  />
                </TabsContent>

                <TabsContent value="analytics" className="space-y-6 mt-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <BettingChart plan={plan} initialBudget={config.initialBudget} />
                    <BettingAnalytics plan={plan} initialBudget={config.initialBudget} />
                  </div>
                </TabsContent>

                <TabsContent value="history" className="space-y-6 mt-6">
                  <BettingHistory plan={plan} initialBudget={config.initialBudget} />
                </TabsContent>

                <TabsContent value="calculator" className="space-y-6 mt-6">
                  <div className="rounded-lg border border-border bg-card p-6">
                    <h3 className="text-lg font-semibold mb-4">Calculadora Rápida</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Usa el botón de calculadora en el header para simulaciones rápidas.
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="rounded-lg border border-border bg-card p-12 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <TrendingUp className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-card-foreground">{"Configura tu plan de apuestas"}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {"Completa el formulario para generar tu estrategia personalizada"}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

function generatePlan(config: BettingConfig, startBalance: number): DayResult[] {
  const plan: DayResult[] = []
  let currentBalance = startBalance
  const startDate = new Date(config.startDate)
  const endDate = new Date(config.endDate)

  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1

  for (let day = 1; day <= daysDiff; day++) {
    const currentDate = new Date(startDate)
    currentDate.setDate(startDate.getDate() + (day - 1))

    const bets: IndividualBet[] = []

    for (let i = 0; i < config.betsPerDay; i++) {
      const stake = (currentBalance * config.stakePercentage) / 100
      const potentialWin = stake * config.odds

      bets.push({
        id: `${day}-${i}`,
        stakePercentage: config.stakePercentage,
        stake,
        odds: config.odds,
        potentialWin,
        result: null,
      })
    }

    const totalStake = bets.reduce((sum, b) => sum + b.stake, 0)
    const totalPotentialWin = bets.reduce((sum, b) => sum + b.potentialWin, 0)
    const totalProfit = totalPotentialWin - totalStake
    const balanceAfterDay = currentBalance + (totalProfit * config.reinvestmentPercentage) / 100

    plan.push({
      day,
      date: currentDate.toISOString().split("T")[0],
      bets,
      currentBalance,
      totalStake,
      totalPotentialWin,
      balanceAfterDay,
      result: null,
    })

    currentBalance = balanceAfterDay
  }

  return plan
}
