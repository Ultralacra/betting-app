"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Save, FolderOpen, Trash2, Settings, Copy, Upload, CheckCircle2 } from "lucide-react"
import type { BettingConfig, DayResult } from "@/lib/betting-types"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/spinner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "@/hooks/use-toast"

interface SavedPlan {
  id: string
  name: string
  config: BettingConfig
  plan: DayResult[]
  savedAt: string
}

interface PlanManagerProps {
  currentConfig: BettingConfig | null
  currentPlan: DayResult[]
  onLoadPlan: (config: BettingConfig, plan: DayResult[]) => void
}

export function PlanManager({ currentConfig, currentPlan, onLoadPlan }: PlanManagerProps) {
  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>(() => {
    const saved = localStorage.getItem("savedPlans")
    return saved ? JSON.parse(saved) : []
  })
  const [planName, setPlanName] = useState("")
  const [showSaved, setShowSaved] = useState(false)

  const [exportOpen, setExportOpen] = useState(false)
  const [exportCode, setExportCode] = useState("")
  const [exportTitle, setExportTitle] = useState("")
  const [exportCopyStatus, setExportCopyStatus] = useState<"idle" | "copied" | "error">("idle")

  const [importOpen, setImportOpen] = useState(false)
  const [importCode, setImportCode] = useState("")
  const [importStatus, setImportStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [importError, setImportError] = useState<string | null>(null)
  const [importedPlanName, setImportedPlanName] = useState("")
  const [showConfetti, setShowConfetti] = useState(false)
  const [confettiKey, setConfettiKey] = useState(0)

  const [loadConfirmOpen, setLoadConfirmOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [pendingPlan, setPendingPlan] = useState<SavedPlan | null>(null)

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

  const mulberry32 = (seed: number) => {
    return () => {
      let t = (seed += 0x6d2b79f5)
      t = Math.imul(t ^ (t >>> 15), t | 1)
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }

  const confettiPieces = useMemo(() => {
    const rand = mulberry32(confettiKey + 1)
    const colorClasses = ["bg-primary", "bg-accent", "bg-chart-2", "bg-chart-4", "bg-chart-5"]

    return Array.from({ length: 36 }, (_, idx) => {
      const left = rand() * 100
      const delayMs = Math.floor(rand() * 120)
      const durationMs = 900 + Math.floor(rand() * 600)
      const rotateDeg = Math.floor(rand() * 360)
      const driftPx = Math.floor((rand() - 0.5) * 120)
      const sizePx = 6 + Math.floor(rand() * 6)
      const colorClass = colorClasses[Math.floor(rand() * colorClasses.length)]
      return { idx, left, delayMs, durationMs, rotateDeg, driftPx, sizePx, colorClass }
    })
  }, [confettiKey])

  const toBase64 = (value: string) => {
    // btoa no soporta Unicode directo.
    return btoa(unescape(encodeURIComponent(value)))
  }

  const fromBase64 = (value: string) => {
    return decodeURIComponent(escape(atob(value)))
  }

  const buildExportCode = (plan: SavedPlan) => {
    const payload = {
      v: 1,
      name: plan.name,
      config: plan.config,
      plan: plan.plan,
      savedAt: plan.savedAt,
    }
    return toBase64(JSON.stringify(payload))
  }

  const parseImportCode = (code: string) => {
    const trimmed = code.trim()
    if (!trimmed) throw new Error("Código vacío")

    const json = fromBase64(trimmed)
    const payload = JSON.parse(json) as {
      v?: number
      name?: string
      config?: BettingConfig
      plan?: DayResult[]
      savedAt?: string
    }

    if (!payload.config || !payload.plan) throw new Error("Código inválido")

    return {
      name: (payload.name ?? "Plan importado").toString(),
      config: payload.config,
      plan: payload.plan,
      savedAt: payload.savedAt ?? new Date().toISOString(),
    }
  }

  const handleSavePlan = () => {
    if (!currentConfig || !planName.trim()) {
      toast({
        variant: "destructive",
        title: "Falta el nombre",
        description: "Por favor ingresa un nombre para el plan.",
      })
      return
    }

    const newPlan: SavedPlan = {
      id: Date.now().toString(),
      name: planName.trim(),
      config: currentConfig,
      plan: currentPlan,
      savedAt: new Date().toISOString(),
    }

    const updated = [...savedPlans, newPlan]
    setSavedPlans(updated)
    localStorage.setItem("savedPlans", JSON.stringify(updated))
    setPlanName("")
    toast({
      title: "Plan guardado",
      description: `“${newPlan.name}” se guardó exitosamente.`,
    })
  }

  const requestLoadPlan = (saved: SavedPlan) => {
    setPendingPlan(saved)
    setLoadConfirmOpen(true)
  }

  const confirmLoadPlan = () => {
    if (!pendingPlan) return
    onLoadPlan(pendingPlan.config, pendingPlan.plan)
    setShowSaved(false)
    setLoadConfirmOpen(false)
    toast({
      title: "Plan cargado",
      description: `“${pendingPlan.name}” se cargó y reemplazó el plan actual.`,
    })
    setPendingPlan(null)
  }

  const requestDeletePlan = (plan: SavedPlan) => {
    setPendingPlan(plan)
    setDeleteConfirmOpen(true)
  }

  const confirmDeletePlan = () => {
    if (!pendingPlan) return
    const updated = savedPlans.filter((p) => p.id !== pendingPlan.id)
    setSavedPlans(updated)
    localStorage.setItem("savedPlans", JSON.stringify(updated))
    setDeleteConfirmOpen(false)
    toast({
      title: "Plan eliminado",
      description: `“${pendingPlan.name}” fue eliminado.`,
    })
    setPendingPlan(null)
  }

  const handleExportPlan = (plan: SavedPlan) => {
    setExportTitle(plan.name)
    setExportCode(buildExportCode(plan))
    setExportCopyStatus("idle")
    setExportOpen(true)
  }

  const handleCopyExportCode = async () => {
    try {
      await navigator.clipboard.writeText(exportCode)
      setExportCopyStatus("copied")
      toast({ title: "Código copiado", description: "Se copió al portapapeles." })
    } catch {
      setExportCopyStatus("error")
      toast({
        variant: "destructive",
        title: "No se pudo copiar",
        description: "Copia el texto manualmente.",
      })
    }
  }

  const triggerConfetti = () => {
    setConfettiKey((k) => k + 1)
    setShowConfetti(true)
    window.setTimeout(() => setShowConfetti(false), 1600)
  }

  const handleImport = async () => {
    setImportError(null)
    setImportedPlanName("")
    setImportStatus("loading")

    try {
      // Pequeña pausa para que se note el estado “cargando”.
      await sleep(650)

      const parsed = parseImportCode(importCode)
      const newPlan: SavedPlan = {
        id: Date.now().toString(),
        name: parsed.name,
        config: parsed.config,
        plan: parsed.plan,
        savedAt: new Date().toISOString(),
      }

      const updated = [newPlan, ...savedPlans]
      setSavedPlans(updated)
      localStorage.setItem("savedPlans", JSON.stringify(updated))
      setShowSaved(true)
      setImportedPlanName(newPlan.name)
      setImportStatus("success")
      triggerConfetti()
      toast({ title: "Plan importado", description: `“${newPlan.name}” ya está en Planes Guardados.` })
    } catch (e) {
      const message = e instanceof Error ? e.message : "Código inválido"
      setImportStatus("error")
      setImportError(message)
      toast({ variant: "destructive", title: "No se pudo importar", description: message })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FolderOpen className="h-4 w-4" />
          Gestión de Planes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {currentConfig && (
          <div className="space-y-2">
            <Label htmlFor="planName">Guardar Plan Actual</Label>
            <div className="flex gap-2">
              <Input
                id="planName"
                placeholder="Nombre del plan..."
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
              />
              <Button onClick={handleSavePlan} size="sm">
                <Save className="h-4 w-4 mr-1" />
                Guardar
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 bg-transparent" onClick={() => setShowSaved(!showSaved)}>
              <FolderOpen className="h-4 w-4 mr-2" />
              Planes Guardados ({savedPlans.length})
            </Button>
            <Button variant="outline" className="bg-transparent" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Importar
            </Button>
          </div>

          {showSaved && savedPlans.length > 0 && (
            <ScrollArea className="h-50 rounded-md border p-2">
              <div className="space-y-2">
                {savedPlans.map((saved) => (
                  <div
                    key={saved.id}
                    className="flex items-center justify-between p-2 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{saved.name}</p>
                      <p className="text-xs text-muted-foreground">
                        ${saved.config.initialBudget} • {new Date(saved.savedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => requestLoadPlan(saved)} title="Cargar">
                        <FolderOpen className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleExportPlan(saved)}
                        title="Exportar"
                        className="gap-1"
                      >
                        <Settings className="h-3 w-3" />
                        <span className="hidden sm:inline">Exportar</span>
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => requestDeletePlan(saved)} title="Eliminar">
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {showSaved && savedPlans.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No hay planes guardados</p>
          )}
        </div>
      </CardContent>

      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent className="max-h-[85vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Exportar plan</DialogTitle>
            <DialogDescription>
              Copia este código y guárdalo. Luego podrás importarlo desde “Gestión de Planes”.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label>Plan</Label>
            <Input value={exportTitle} readOnly />
          </div>

          <div className="space-y-2">
            <Label>Código</Label>
            <Textarea
              value={exportCode}
              readOnly
              className="min-h-32 max-h-[45vh] overflow-auto font-mono text-xs whitespace-pre-wrap break-all"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" className="bg-transparent" onClick={handleCopyExportCode}>
              <Copy className="h-4 w-4 mr-2" />
              Copiar
            </Button>
            <Button onClick={() => setExportOpen(false)}>Cerrar</Button>
          </div>

          {exportCopyStatus !== "idle" && (
            <p className="text-xs text-muted-foreground">
              {exportCopyStatus === "copied" ? "Código copiado al portapapeles." : "No se pudo copiar. Copia el texto manualmente."}
            </p>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={importOpen}
        onOpenChange={(open) => {
          setImportOpen(open)
          if (open) {
            setImportStatus("idle")
            setImportError(null)
            setImportedPlanName("")
            setShowConfetti(false)
          }
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Importar plan</DialogTitle>
            <DialogDescription>Pega el código exportado para recuperar el plan completo.</DialogDescription>
          </DialogHeader>

          {importStatus === "loading" && (
            <div className="flex items-center justify-center gap-2 py-10">
              <Spinner className="size-5" />
              <p className="text-sm text-muted-foreground">Importando plan…</p>
            </div>
          )}

          {importStatus === "success" && (
            <div className="py-10 text-center space-y-2">
              <CheckCircle2 className="mx-auto size-8 text-chart-2" />
              <p className="font-medium">Plan importado</p>
              <p className="text-sm text-muted-foreground">“{importedPlanName}” ya está en Planes Guardados.</p>
            </div>
          )}

          {(importStatus === "idle" || importStatus === "error") && (
            <div className="space-y-2">
              <Label>Código</Label>
              <Textarea
                value={importCode}
                onChange={(e) => {
                  setImportCode(e.target.value)
                  if (importStatus === "error") setImportStatus("idle")
                  setImportError(null)
                }}
                placeholder="Pega aquí el código..."
                className="min-h-32 max-h-[45vh] overflow-auto font-mono text-xs whitespace-pre-wrap break-all"
              />
              {importError && <p className="text-sm text-destructive">{importError}</p>}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              className="bg-transparent"
              onClick={() => setImportOpen(false)}
              disabled={importStatus === "loading"}
            >
              Cancelar
            </Button>
            {importStatus === "success" ? (
              <Button onClick={() => setImportOpen(false)}>Cerrar</Button>
            ) : (
              <Button onClick={handleImport} disabled={importStatus === "loading" || !importCode.trim()}>
                Importar
              </Button>
            )}
          </div>

          {showConfetti && importStatus === "success" && (
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              {confettiPieces.map((p) => (
                <div
                  key={`${confettiKey}-${p.idx}`}
                  className={`confetti-piece absolute top-0 rounded-sm ${p.colorClass}`}
                  style={{
                    left: `${p.left}%`,
                    width: `${p.sizePx}px`,
                    height: `${p.sizePx}px`,
                    animationDelay: `${p.delayMs}ms`,
                    animationDuration: `${p.durationMs}ms`,
                    ["--confetti-rotate" as never]: `${p.rotateDeg}deg`,
                    ["--confetti-drift" as never]: `${p.driftPx}px`,
                  }}
                />
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={loadConfirmOpen} onOpenChange={setLoadConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cargar este plan?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingPlan
                ? `Se cargará “${pendingPlan.name}” y se reemplazará tu plan actual.`
                : "Se reemplazará tu plan actual."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmLoadPlan}>Cargar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este plan?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingPlan ? `Se eliminará “${pendingPlan.name}”. Esta acción no se puede deshacer.` : "Esta acción no se puede deshacer."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent">Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={confirmDeletePlan}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
