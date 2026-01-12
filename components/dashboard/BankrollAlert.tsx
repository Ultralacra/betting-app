"use client";

import { useBankrollAlerts } from "@/hooks/useBankrollAlerts";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AlertTriangle, X, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";

interface BankrollAlertProps {
  currentBalance: number;
  initialBudget: number;
}

export function BankrollAlert({
  currentBalance,
  initialBudget,
}: BankrollAlertProps) {
  const {
    config,
    alertState,
    updateConfig,
    dismissAlert,
    isAlertActive,
    isLoaded,
  } = useBankrollAlerts(currentBalance, initialBudget);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tempThreshold, setTempThreshold] = useState(
    String(config.thresholdPercentage)
  );

  if (!isLoaded || !isAlertActive || !alertState) {
    return null;
  }

  const severityClasses = {
    warning: "border-yellow-500/50 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
    critical: "border-destructive/50 bg-destructive/10 text-destructive animate-pulse-soft",
  };

  const handleSaveSettings = () => {
    const threshold = parseFloat(tempThreshold);
    if (!isNaN(threshold) && threshold > 0 && threshold <= 100) {
      updateConfig({ thresholdPercentage: threshold });
    }
    setSettingsOpen(false);
  };

  return (
    <div
      className={cn(
        "rounded-lg border p-4 flex items-start gap-3 animate-slide-up",
        severityClasses[alertState.severity]
      )}
    >
      <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
      
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm">{alertState.message}</div>
        <div className="text-xs mt-1 opacity-80">
          Balance actual: {formatCurrency(alertState.amountRemaining)} (
          {alertState.percentageRemaining.toFixed(1)}% del capital inicial)
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 opacity-60 hover:opacity-100"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Configurar Alertas de Bankroll</DialogTitle>
              <DialogDescription>
                Personaliza cuándo recibir alertas sobre tu capital
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="alert-enabled">Alertas activadas</Label>
                <Switch
                  id="alert-enabled"
                  checked={config.enabled}
                  onCheckedChange={(enabled) => updateConfig({ enabled })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="threshold">
                  Umbral de alerta (% del capital inicial)
                </Label>
                <Input
                  id="threshold"
                  type="number"
                  min="1"
                  max="100"
                  value={tempThreshold}
                  onChange={(e) => setTempThreshold(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Recibirás una alerta cuando tu balance sea igual o menor al{" "}
                  {tempThreshold}% de tu capital inicial
                </p>
              </div>

              <Button onClick={handleSaveSettings} className="w-full">
                Guardar Configuración
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 opacity-60 hover:opacity-100"
          onClick={dismissAlert}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
