"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Save,
  FolderOpen,
  Trash2,
  Settings,
  Copy,
  Upload,
  CheckCircle2,
} from "lucide-react";
import type { BettingConfig, DayResult } from "@/lib/betting-types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";

import {
  addSavedPlan,
  deleteSavedPlanById,
  loadSavedPlans,
  makeId,
  subscribeSavedPlansChanged,
  type SavedPlan,
} from "@/lib/plans/saved-plans";

interface PlanManagerProps {
  currentConfig: BettingConfig | null;
  currentPlan: DayResult[];
  onLoadPlan: (
    config: BettingConfig,
    plan: DayResult[],
    meta?: { id: string; name: string; savedAt: string },
  ) => void;
  onEditPlan?: (plan: SavedPlan) => void;
  onSavedPlansCountChange?: (count: number) => void;
}

export function PlanManager({
  currentConfig,
  currentPlan,
  onLoadPlan,
  onEditPlan,
  onSavedPlansCountChange,
}: PlanManagerProps) {
  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>([]);
  const [planName, setPlanName] = useState("");
  const [showSaved, setShowSaved] = useState(false);

  const [planLimitOpen, setPlanLimitOpen] = useState(false);
  const [planLimitText, setPlanLimitText] = useState<string>(
    "Tu plan alcanzó el máximo de planes guardados.",
  );

  const tryShowPlanLimit = (e: unknown) => {
    const message = e instanceof Error ? e.message : String(e);
    try {
      const parsed = JSON.parse(message) as {
        error?: string;
        details?: string;
      };
      if (parsed?.error === "plan_limit_reached") {
        setPlanLimitText(
          parsed.details ?? "Tu plan alcanzó el máximo de planes guardados.",
        );
        setPlanLimitOpen(true);
        return true;
      }
    } catch {
      // ignore
    }
    return false;
  };

  useEffect(() => {
    let isMounted = true;
    const refresh = async () => {
      try {
        const plans = await loadSavedPlans();
        if (isMounted) setSavedPlans(plans);
      } catch {
        toast({
          variant: "destructive",
          title: "No se pudieron cargar los planes",
          description: "Intenta nuevamente.",
        });
      }
    };

    void refresh();
    const unsub = subscribeSavedPlansChanged(() => {
      void refresh();
    });

    return () => {
      isMounted = false;
      unsub();
    };
  }, []);

  useEffect(() => {
    // Evita loops cuando el padre pasa un callback inline (identidad cambia cada render).
    // Solo notificamos cuando cambia el conteo, usando la última referencia del callback.
  }, []);

  const onSavedPlansCountChangeRef = useRef(onSavedPlansCountChange);
  useEffect(() => {
    onSavedPlansCountChangeRef.current = onSavedPlansCountChange;
  }, [onSavedPlansCountChange]);

  useEffect(() => {
    onSavedPlansCountChangeRef.current?.(savedPlans.length);
  }, [savedPlans.length]);

  const persistSavedPlans = (next: SavedPlan[]) => {
    setSavedPlans(next);
  };

  const [exportOpen, setExportOpen] = useState(false);
  const [exportCode, setExportCode] = useState("");
  const [exportTitle, setExportTitle] = useState("");
  const [exportCopyStatus, setExportCopyStatus] = useState<
    "idle" | "copied" | "error"
  >("idle");

  const [importOpen, setImportOpen] = useState(false);
  const [importCode, setImportCode] = useState("");
  const [importStatus, setImportStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [importError, setImportError] = useState<string | null>(null);
  const [importedPlanName, setImportedPlanName] = useState("");
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiKey, setConfettiKey] = useState(0);

  const [loadConfirmOpen, setLoadConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<SavedPlan | null>(null);

  const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  const mulberry32 = (seed: number) => {
    return () => {
      let t = (seed += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  const confettiPieces = useMemo(() => {
    const rand = mulberry32(confettiKey + 1);
    const colorClasses = [
      "bg-primary",
      "bg-accent",
      "bg-chart-2",
      "bg-chart-4",
      "bg-chart-5",
    ];

    return Array.from({ length: 36 }, (_, idx) => {
      const left = rand() * 100;
      const delayMs = Math.floor(rand() * 120);
      const durationMs = 900 + Math.floor(rand() * 600);
      const rotateDeg = Math.floor(rand() * 360);
      const driftPx = Math.floor((rand() - 0.5) * 120);
      const sizePx = 6 + Math.floor(rand() * 6);
      const colorClass = colorClasses[Math.floor(rand() * colorClasses.length)];
      return {
        idx,
        left,
        delayMs,
        durationMs,
        rotateDeg,
        driftPx,
        sizePx,
        colorClass,
      };
    });
  }, [confettiKey]);

  const toBase64 = (value: string) => {
    // btoa no soporta Unicode directo.
    return btoa(unescape(encodeURIComponent(value)));
  };

  const fromBase64 = (value: string) => {
    return decodeURIComponent(escape(atob(value)));
  };

  const buildExportCode = (plan: SavedPlan) => {
    const payload = {
      v: 1,
      name: plan.name,
      config: plan.config,
      plan: plan.plan,
      savedAt: plan.savedAt,
    };
    return toBase64(JSON.stringify(payload));
  };

  const parseImportCode = (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) throw new Error("Código vacío");

    const json = fromBase64(trimmed);
    const payload = JSON.parse(json) as {
      v?: number;
      name?: string;
      config?: BettingConfig;
      plan?: DayResult[];
      savedAt?: string;
    };

    if (!payload.config || !payload.plan) throw new Error("Código inválido");

    return {
      name: (payload.name ?? "Plan importado").toString(),
      config: payload.config,
      plan: payload.plan,
      savedAt: payload.savedAt ?? new Date().toISOString(),
    };
  };

  const handleSavePlan = async () => {
    if (!currentConfig || !planName.trim()) {
      toast({
        variant: "destructive",
        title: "Falta el nombre",
        description: "Por favor ingresa un nombre para el plan.",
      });
      return;
    }

    const newPlan: SavedPlan = {
      id: makeId(),
      name: planName.trim(),
      config: currentConfig,
      plan: currentPlan,
      savedAt: new Date().toISOString(),
    };

    try {
      const updated = await addSavedPlan(newPlan);
      setSavedPlans(updated);
      setShowSaved(true);
      setPlanName("");
      toast({
        title: "Plan guardado",
        description: `“${newPlan.name}” se guardó exitosamente.`,
      });
    } catch (e) {
      if (tryShowPlanLimit(e)) return;
      toast({
        variant: "destructive",
        title: "No se pudo guardar",
        description: "Intenta nuevamente.",
      });
    }
  };

  const requestLoadPlan = (saved: SavedPlan) => {
    setPendingPlan(saved);
    setLoadConfirmOpen(true);
  };

  const confirmLoadPlan = () => {
    if (!pendingPlan) return;
    onLoadPlan(pendingPlan.config, pendingPlan.plan, {
      id: pendingPlan.id,
      name: pendingPlan.name,
      savedAt: pendingPlan.savedAt,
    });
    setShowSaved(false);
    setLoadConfirmOpen(false);
    toast({
      title: "Plan cargado",
      description: `“${pendingPlan.name}” se cargó y reemplazó el plan actual.`,
    });
    setPendingPlan(null);
  };

  const requestDeletePlan = (plan: SavedPlan) => {
    setPendingPlan(plan);
    setDeleteConfirmOpen(true);
  };

  const confirmDeletePlan = async () => {
    if (!pendingPlan) return;

    try {
      const updated = await deleteSavedPlanById(pendingPlan.id);
      setSavedPlans(updated);
      setDeleteConfirmOpen(false);
      toast({
        title: "Plan eliminado",
        description: `“${pendingPlan.name}” fue eliminado.`,
      });
      setPendingPlan(null);
    } catch {
      toast({
        variant: "destructive",
        title: "No se pudo eliminar",
        description: "Intenta nuevamente.",
      });
    }
  };

  const handleExportPlan = (plan: SavedPlan) => {
    setExportTitle(plan.name);
    setExportCode(buildExportCode(plan));
    setExportCopyStatus("idle");
    setExportOpen(true);
  };

  const handleCopyExportCode = async () => {
    try {
      await navigator.clipboard.writeText(exportCode);
      setExportCopyStatus("copied");
      toast({
        title: "Código copiado",
        description: "Se copió al portapapeles.",
      });
    } catch {
      setExportCopyStatus("error");
      toast({
        variant: "destructive",
        title: "No se pudo copiar",
        description: "Copia el texto manualmente.",
      });
    }
  };

  const triggerConfetti = () => {
    setConfettiKey((k) => k + 1);
    setShowConfetti(true);
    window.setTimeout(() => setShowConfetti(false), 1600);
  };

  const handleImport = async () => {
    setImportError(null);
    setImportedPlanName("");
    setImportStatus("loading");

    try {
      // Pequeña pausa para que se note el estado “cargando”.
      await sleep(650);

      const parsed = parseImportCode(importCode);
      const newPlan: SavedPlan = {
        id: makeId(),
        name: parsed.name,
        config: parsed.config,
        plan: parsed.plan,
        savedAt: new Date().toISOString(),
      };

      const updated = await addSavedPlan(newPlan);
      setSavedPlans(updated);
      setShowSaved(true);

      // Cargar automáticamente el plan importado para que se renderice altiro.
      onLoadPlan(newPlan.config, newPlan.plan, {
        id: newPlan.id,
        name: newPlan.name,
        savedAt: newPlan.savedAt,
      });

      setImportedPlanName(newPlan.name);
      setImportStatus("success");
      triggerConfetti();
      toast({
        title: "Plan importado",
        description: `“${newPlan.name}” ya está en Planes Guardados.`,
      });
    } catch (e) {
      if (tryShowPlanLimit(e)) {
        setImportStatus("error");
        setImportError(planLimitText);
        return;
      }
      const message = e instanceof Error ? e.message : "Código inválido";
      setImportStatus("error");
      setImportError(message);
      toast({
        variant: "destructive",
        title: "No se pudo importar",
        description: message,
      });
    }
  };

  return (
    <Card>
      <AlertDialog open={planLimitOpen} onOpenChange={setPlanLimitOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Límite de planes</AlertDialogTitle>
            <AlertDialogDescription>{planLimitText}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setPlanLimitOpen(false)}>
              Entendido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="planName"
                placeholder="Nombre del plan..."
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
              />
              <Button
                onClick={handleSavePlan}
                size="sm"
                className="w-full sm:w-auto"
              >
                <Save className="h-4 w-4 mr-1" />
                Guardar
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              className="flex-1 bg-transparent"
              onClick={() => setShowSaved(!showSaved)}
            >
              <FolderOpen className="h-4 w-4 mr-2" />
              Planes Guardados ({savedPlans.length})
            </Button>
            <Button
              variant="outline"
              className="bg-transparent w-full sm:w-auto"
              onClick={() => setImportOpen(true)}
            >
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
                      <p className="font-medium text-sm truncate">
                        {saved.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ${saved.config.initialBudget} •{" "}
                        {new Date(saved.savedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => requestLoadPlan(saved)}
                        title="Cargar"
                        aria-label={`Cargar plan ${saved.name}`}
                      >
                        <FolderOpen className="h-3 w-3" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Opciones"
                            className="gap-1"
                            aria-label={`Opciones para plan ${saved.name}`}
                          >
                            <Settings className="h-3 w-3" />
                            <span className="hidden sm:inline">Opciones</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              onEditPlan?.(saved);
                            }}
                          >
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleExportPlan(saved)}
                          >
                            Exportar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => requestDeletePlan(saved)}
                        title="Eliminar"
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {showSaved && savedPlans.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No hay planes guardados
            </p>
          )}
        </div>
      </CardContent>

      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent className="max-h-[85vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Exportar plan</DialogTitle>
            <DialogDescription>
              Copia este código y guárdalo. Luego podrás importarlo desde
              “Gestión de Planes”.
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
            <Button
              variant="outline"
              className="bg-transparent"
              onClick={handleCopyExportCode}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copiar
            </Button>
            <Button onClick={() => setExportOpen(false)}>Cerrar</Button>
          </div>

          {exportCopyStatus !== "idle" && (
            <p className="text-xs text-muted-foreground">
              {exportCopyStatus === "copied"
                ? "Código copiado al portapapeles."
                : "No se pudo copiar. Copia el texto manualmente."}
            </p>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={importOpen}
        onOpenChange={(open) => {
          setImportOpen(open);
          if (open) {
            setImportStatus("idle");
            setImportError(null);
            setImportedPlanName("");
            setShowConfetti(false);
          }
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Importar plan</DialogTitle>
            <DialogDescription>
              Pega el código exportado para recuperar el plan completo.
            </DialogDescription>
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
              <p className="text-sm text-muted-foreground">
                “{importedPlanName}” ya está en Planes Guardados.
              </p>
            </div>
          )}

          {(importStatus === "idle" || importStatus === "error") && (
            <div className="space-y-2">
              <Label>Código</Label>
              <Textarea
                value={importCode}
                onChange={(e) => {
                  setImportCode(e.target.value);
                  if (importStatus === "error") setImportStatus("idle");
                  setImportError(null);
                }}
                placeholder="Pega aquí el código..."
                className="min-h-32 max-h-[45vh] overflow-auto font-mono text-xs whitespace-pre-wrap break-all"
              />
              {importError && (
                <p className="text-sm text-destructive">{importError}</p>
              )}
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
              <Button
                onClick={handleImport}
                disabled={importStatus === "loading" || !importCode.trim()}
              >
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
            <AlertDialogCancel className="bg-transparent">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmLoadPlan}>
              Cargar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este plan?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingPlan
                ? `Se eliminará “${pendingPlan.name}”. Esta acción no se puede deshacer.`
                : "Esta acción no se puede deshacer."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDeletePlan}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
