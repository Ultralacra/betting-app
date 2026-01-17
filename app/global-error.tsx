"use client";

import { useEffect } from "react";
import { TrendingUp, RefreshCw, Home, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console (could be sent to error tracking service)
    console.error("Global error:", error);
  }, [error]);

  return (
    <html lang="es">
      <body className="font-sans antialiased bg-background text-foreground">
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
          <div className="text-center max-w-md">
            {/* Logo */}
            <div className="flex items-center justify-center gap-2 mb-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg">
                <TrendingUp className="h-7 w-7" />
              </div>
              <span className="text-2xl font-bold tracking-tight">
                BetTracker Pro
              </span>
            </div>

            {/* Error Icon */}
            <div className="mb-6">
              <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-950">
                <AlertTriangle className="h-10 w-10 text-red-600 dark:text-red-400" />
              </div>
            </div>

            {/* Error Message */}
            <h1 className="text-3xl font-bold mb-4">¡Ups! Algo salió mal</h1>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              Ha ocurrido un error inesperado. Nuestro equipo ha sido notificado
              y estamos trabajando para solucionarlo.
            </p>

            {/* Error Details (only in development) */}
            {process.env.NODE_ENV === "development" && error.message && (
              <div className="mb-8 p-4 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg text-left">
                <p className="text-sm font-mono text-red-800 dark:text-red-200 break-words">
                  {error.message}
                </p>
                {error.digest && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                    Error ID: {error.digest}
                  </p>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={reset} size="lg" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Intentar de nuevo
              </Button>
              <Button asChild variant="outline" size="lg" className="gap-2">
                <Link href="/">
                  <Home className="h-4 w-4" />
                  Ir al inicio
                </Link>
              </Button>
            </div>

            {/* Support Link */}
            <p className="mt-8 text-sm text-muted-foreground">
              ¿El problema persiste?{" "}
              <a
                href="mailto:soporte@bettracker.pro"
                className="text-primary hover:underline"
              >
                Contacta soporte
              </a>
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}
