"use client";

import { useServiceWorker } from "@/hooks/useServiceWorker";
import { Button } from "@/components/ui/button";
import { RefreshCw, X } from "lucide-react";
import { useState } from "react";

export function UpdateBanner() {
  const { isUpdateAvailable, updateApp } = useServiceWorker();
  const [dismissed, setDismissed] = useState(false);

  if (!isUpdateAvailable || dismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 md:bottom-4 md:left-auto md:right-4 md:w-96">
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-lg shadow-lg p-4 flex items-center gap-3">
        <div className="flex-1">
          <p className="font-semibold text-sm">🚀 Nueva versión disponible</p>
          <p className="text-xs text-emerald-100 mt-0.5">
            Actualiza para obtener las últimas mejoras
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={updateApp}
            className="bg-white text-emerald-700 hover:bg-emerald-50 h-8 px-3"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Actualizar
          </Button>
          <button
            onClick={() => setDismissed(true)}
            className="text-emerald-200 hover:text-white p-1"
            aria-label="Descartar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
