"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  TrendingUp,
  CheckCircle2,
  XCircle,
  Loader2,
  Mail,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function ConfirmEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [status, setStatus] = useState<
    "loading" | "success" | "error" | "expired"
  >("loading");
  const [message, setMessage] = useState("Verificando tu email...");

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      try {
        // Check for error in URL (e.g., expired link)
        const errorDescription = searchParams.get("error_description");
        const error = searchParams.get("error");

        if (error || errorDescription) {
          if (
            errorDescription?.includes("expired") ||
            errorDescription?.includes("invalid")
          ) {
            setStatus("expired");
            setMessage("El enlace de confirmación ha expirado o es inválido.");
          } else {
            setStatus("error");
            setMessage(errorDescription || "Error al confirmar el email.");
          }
          return;
        }

        // Check for token_hash and type (new Supabase format)
        const tokenHash = searchParams.get("token_hash");
        const type = searchParams.get("type");

        if (tokenHash && type === "email") {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: "email",
          });

          if (verifyError) {
            if (verifyError.message.includes("expired")) {
              setStatus("expired");
              setMessage("El enlace de confirmación ha expirado.");
            } else {
              setStatus("error");
              setMessage(verifyError.message);
            }
            return;
          }

          setStatus("success");
          setMessage("¡Tu email ha sido verificado correctamente!");

          // Redirect to dashboard after 3 seconds
          setTimeout(() => {
            router.push("/dashboard");
          }, 3000);
          return;
        }

        // Check current session (user might already be verified)
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user?.email_confirmed_at) {
          setStatus("success");
          setMessage("¡Tu email ya está verificado!");
          setTimeout(() => {
            router.push("/dashboard");
          }, 2000);
          return;
        }

        // No token found, show instructions
        setStatus("error");
        setMessage("No se encontró un enlace de confirmación válido.");
      } catch (err) {
        console.error("Email confirmation error:", err);
        setStatus("error");
        setMessage("Ocurrió un error inesperado. Por favor, intenta de nuevo.");
      }
    };

    handleEmailConfirmation();
  }, [searchParams, supabase, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      <div className="text-center max-w-md">
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg">
            <TrendingUp className="h-7 w-7" />
          </div>
          <span className="text-2xl font-bold tracking-tight">
            BetTracker Pro
          </span>
        </Link>

        {/* Status Icon */}
        <div className="mb-6">
          {status === "loading" && (
            <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
            </div>
          )}
          {status === "success" && (
            <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950">
              <CheckCircle2 className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
            </div>
          )}
          {(status === "error" || status === "expired") && (
            <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-950">
              <XCircle className="h-10 w-10 text-red-600 dark:text-red-400" />
            </div>
          )}
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold mb-4">
          {status === "loading" && "Verificando..."}
          {status === "success" && "¡Email Verificado!"}
          {status === "error" && "Error de Verificación"}
          {status === "expired" && "Enlace Expirado"}
        </h1>

        {/* Message */}
        <p className="text-muted-foreground mb-8 leading-relaxed">{message}</p>

        {/* Actions based on status */}
        {status === "success" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Serás redirigido al dashboard en unos segundos...
            </p>
            <Button asChild size="lg" className="gap-2">
              <Link href="/dashboard">
                Ir al Dashboard <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}

        {status === "expired" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground mb-4">
              Los enlaces de confirmación expiran después de 24 horas por
              seguridad.
            </p>
            <Button asChild size="lg" className="gap-2">
              <Link href="/login">
                <Mail className="h-4 w-4" />
                Solicitar nuevo enlace
              </Link>
            </Button>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-4">
            <Button asChild size="lg" className="gap-2">
              <Link href="/login">Volver a Iniciar Sesión</Link>
            </Button>
            <p className="text-sm text-muted-foreground">
              ¿Problemas?{" "}
              <a
                href="mailto:soporte@bettracker.pro"
                className="text-primary hover:underline"
              >
                Contacta soporte
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ConfirmEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <ConfirmEmailContent />
    </Suspense>
  );
}
