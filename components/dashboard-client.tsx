"use client"

import { useEffect, useMemo, useState } from "react"
import { signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { TrendingUp, Moon, Sun, LogOut, User as UserIcon, CreditCard } from "lucide-react"

import { BettingForm } from "@/components/betting-form"
import { BettingPlan } from "@/components/betting-plan"
import { BettingStats } from "@/components/betting-stats"
import { BettingChart } from "@/components/betting-chart"
import { BettingAnalytics } from "@/components/betting-analytics"
import { BettingHistory } from "@/components/betting-history"
import { PlanManager } from "@/components/plan-manager"
import { QuickCalculator } from "@/components/quick-calculator"
import { DailySummary } from "@/components/daily-summary"

import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import type { BettingConfig, DayResult } from "@/lib/betting-types"

type MembershipTier = "FREE" | "PRO"

type UserSummary = {
  id: string
  email: string | null
  name: string | null
  membershipTier: MembershipTier
  membershipExpiresAt: Date | null
} | null

type SavedPlanDTO = {
  id: string
  name: string
  configJson: string
  planJson: string
  savedAt: Date
}

type BettingDataDTO = {
  configJson: string | null
  planJson: string | null
  currentBalance: number | null
  theme: string | null
}

interface Props {
  user: UserSummary
  initialBettingData: BettingDataDTO
  initialSavedPlans: SavedPlanDTO[]
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

    const bets = Array.from({ length: config.betsPerDay }, (_, i) => {
      const stake = (currentBalance * config.stakePercentage) / 100
      const potentialWin = stake * config.odds

      return {
        id: `${day}-${i}`,
        stakePercentage: config.stakePercentage,
        stake,
        odds: config.odds,
        potentialWin,
        result: null,
      }
    })

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

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `HTTP ${res.status}`)
  }

  return (await res.json()) as T
}

export function DashboardClient({ user, initialBettingData, initialSavedPlans }: Props) {
  const router = useRouter()

  const initialConfig = useMemo(() => {
    if (!initialBettingData.configJson) return null
    try {
      return JSON.parse(initialBettingData.configJson) as BettingConfig
    } catch {
      return null
    }
  }, [initialBettingData.configJson])

  const initialPlan = useMemo(() => {
    if (!initialBettingData.planJson) return []
    try {
      return JSON.parse(initialBettingData.planJson) as DayResult[]
    } catch {
      return []
    }
  }, [initialBettingData.planJson])

  const [config, setConfig] = useState<BettingConfig | null>(initialConfig)
  const [plan, setPlan] = useState<DayResult[]>(initialPlan)
  const [currentBalance, setCurrentBalance] = useState<number>(initialBettingData.currentBalance ?? initialConfig?.initialBudget ?? 0)
  const [isDarkMode, setIsDarkMode] = useState((initialBettingData.theme ?? "light") === "dark")

  const [savedPlans, setSavedPlans] = useState(initialSavedPlans)

  const [showFirstPlanModal, setShowFirstPlanModal] = useState(false)

  const [profileName, setProfileName] = useState(user?.name ?? "")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [profileMessage, setProfileMessage] = useState<string | null>(null)

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode)
  }, [isDarkMode])

  useEffect(() => {
    const hasPlan = !!config && plan.length > 0
    if (!hasPlan) setShowFirstPlanModal(true)
  }, [config, plan.length])

  const persistBettingData = async (next: {
    config: BettingConfig | null
    plan: DayResult[]
    currentBalance: number
    theme: "light" | "dark"
  }) => {
    await apiJson<{ ok: true }>("/api/betting-data", {
      method: "POST",
      body: JSON.stringify({
        configJson: next.config ? JSON.stringify(next.config) : null,
        planJson: next.plan.length ? JSON.stringify(next.plan) : null,
        currentBalance: next.currentBalance,
        theme: next.theme,
      }),
    })
  }

  const toggleDarkMode = async () => {
    const next = !isDarkMode
    setIsDarkMode(next)
    await persistBettingData({
      config,
      plan,
      currentBalance,
      theme: next ? "dark" : "light",
    })
  }

  const handleConfigSubmit = async (newConfig: BettingConfig) => {
    const generatedPlan = generatePlan(newConfig, newConfig.initialBudget)
    setConfig(newConfig)
    setPlan(generatedPlan)
    setCurrentBalance(newConfig.initialBudget)

    await persistBettingData({
      config: newConfig,
      plan: generatedPlan,
      currentBalance: newConfig.initialBudget,
      theme: isDarkMode ? "dark" : "light",
    })

    setShowFirstPlanModal(false)
  }

  const handleReset = async () => {
    setConfig(null)
    setPlan([])
    setCurrentBalance(0)

    await persistBettingData({
      config: null,
      plan: [],
      currentBalance: 0,
      theme: isDarkMode ? "dark" : "light",
    })

    setShowFirstPlanModal(true)
  }

  const handleAddBalance = async (amount: number) => {
    if (!config || amount <= 0) return

    // Reutilizamos la lógica original simplificada: aumenta balance inicial y regenera plan.
    const newInitialBalance = currentBalance + amount
    const newConfig = { ...config, initialBudget: newInitialBalance }
    const generatedPlan = generatePlan(newConfig, newInitialBalance)

    setConfig(newConfig)
    setCurrentBalance(newInitialBalance)
    setPlan(generatedPlan)

    await persistBettingData({
      config: newConfig,
      plan: generatedPlan,
      currentBalance: newInitialBalance,
      theme: isDarkMode ? "dark" : "light",
    })
  }

  const handleLoadPlan = async (loadedConfig: BettingConfig, loadedPlan: DayResult[]) => {
    setConfig(loadedConfig)
    setPlan(loadedPlan)

    const lastCompleted = loadedPlan.findLast((d) => d.result === "completed")
    const balance = lastCompleted ? lastCompleted.balanceAfterDay : loadedConfig.initialBudget
    setCurrentBalance(balance)

    await persistBettingData({
      config: loadedConfig,
      plan: loadedPlan,
      currentBalance: balance,
      theme: isDarkMode ? "dark" : "light",
    })
  }

  const updateProfileName = async () => {
    setProfileMessage(null)
    await apiJson<{ ok: true }>("/api/profile", {
      method: "POST",
      body: JSON.stringify({ name: profileName }),
    })
    setProfileMessage("Nombre actualizado")
    router.refresh()
  }

  const updatePassword = async () => {
    setProfileMessage(null)
    await apiJson<{ ok: true }>("/api/profile/password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    })
    setCurrentPassword("")
    setNewPassword("")
    setProfileMessage("Contraseña actualizada")
  }

  const logout = async () => {
    await signOut({ redirect: true, callbackUrl: "/login" })
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
                <p className="text-sm text-muted-foreground">Gestión inteligente de apuestas</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <QuickCalculator />
              <Button variant="outline" size="sm" onClick={toggleDarkMode}>
                {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="sm" onClick={logout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <UserIcon className="h-4 w-4" />
                  Cuenta
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={user?.email ?? ""} readOnly />
                </div>
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <div className="flex gap-2">
                    <Input value={profileName} onChange={(e) => setProfileName(e.target.value)} />
                    <Button onClick={updateProfileName} size="sm">
                      Guardar
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Cambiar contraseña</Label>
                  <Input
                    type="password"
                    placeholder="Contraseña actual"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                  <Input
                    type="password"
                    placeholder="Nueva contraseña"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <Button onClick={updatePassword} variant="outline" className="w-full bg-transparent">
                    Actualizar contraseña
                  </Button>
                </div>
                {profileMessage && <p className="text-sm text-muted-foreground">{profileMessage}</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CreditCard className="h-4 w-4" />
                  Membresía
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm">
                  Plan: <span className="font-medium">{user?.membershipTier ?? "FREE"}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {user?.membershipTier === "PRO" && user?.membershipExpiresAt
                    ? `Vence: ${new Date(user.membershipExpiresAt).toLocaleDateString()}`
                    : "Sin vencimiento"}
                </div>
                <Button variant="outline" className="w-full bg-transparent" disabled>
                  Gestionar membresía (próximamente)
                </Button>
              </CardContent>
            </Card>

            <BettingForm
              onSubmit={handleConfigSubmit}
              initialConfig={config}
              onReset={handleReset}
              currentBalance={currentBalance}
              onAddBalance={handleAddBalance}
            />

            <PlanManager
              currentConfig={config}
              currentPlan={plan}
              onLoadPlan={handleLoadPlan}
            />
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
                    // por ahora reutilizamos lo existente: el plan es proyección, no editable persistente aquí
                    onUpdateBet={() => {}}
                    onAddBet={() => {}}
                    onRemoveBet={() => {}}
                  />
                  <p className="text-xs text-muted-foreground">
                    Nota: edición de resultados/apuestas se habilita en la siguiente iteración.
                  </p>
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
                <h3 className="mt-4 text-lg font-semibold text-card-foreground">Configura tu plan de apuestas</h3>
                <p className="mt-2 text-sm text-muted-foreground">Completa el formulario para generar tu estrategia personalizada</p>
              </div>
            )}
          </div>
        </div>
      </main>

      <Dialog open={showFirstPlanModal} onOpenChange={setShowFirstPlanModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configura tu nuevo plan</DialogTitle>
            <DialogDescription>
              Para empezar, crea tu primer plan de apuestas. Podrás guardarlo y ver estadísticas.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button onClick={() => setShowFirstPlanModal(false)}>Entendido</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
