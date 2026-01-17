"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  TrendingUp,
  CheckCircle2,
  Loader2,
  Lock,
  ArrowLeft,
  Eye,
  EyeOff,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { supabaseAuthErrorToSpanish } from "@/lib/supabase/errors";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [status, setStatus] = useState<
    "loading" | "ready" | "success" | "error" | "expired"
  >("loading");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      try {
        // Check for error in URL
        const errorDescription = searchParams.get("error_description");
        const errorParam = searchParams.get("error");

        if (errorParam || errorDescription) {
          if (
            errorDescription?.includes("expired") ||
            errorDescription?.includes("invalid")
          ) {
            setStatus("expired");
          } else {
            setError(errorDescription || "Error al procesar el enlace");
            setStatus("error");
          }
          return;
        }

        // Check for recovery token
        const tokenHash = searchParams.get("token_hash");
        const type = searchParams.get("type");
        const accessToken = searchParams.get("access_token");

        // Handle PKCE flow (token_hash)
        if (tokenHash && type === "recovery") {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: "recovery",
          });

          if (verifyError) {
            if (verifyError.message.includes("expired")) {
              setStatus("expired");
            } else {
              setError(verifyError.message);
              setStatus("error");
            }
            return;
          }

          setStatus("ready");
          return;
        }

        // Handle implicit flow (access_token in hash)
        if (accessToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: searchParams.get("refresh_token") || "",
          });

          if (sessionError) {
            setError(sessionError.message);
            setStatus("error");
            return;
          }

          setStatus("ready");
          return;
        }

        // Check if user is already in recovery mode from hash fragment
        const hashParams = new URLSearchParams(
          window.location.hash.substring(1),
        );
        const hashType = hashParams.get("type");
        const hashAccessToken = hashParams.get("access_token");

        if (hashType === "recovery" && hashAccessToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: hashAccessToken,
            refresh_token: hashParams.get("refresh_token") || "",
          });

          if (sessionError) {
            setError(sessionError.message);
            setStatus("error");
            return;
          }

          setStatus("ready");
          return;
        }

        // Check current session
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          setStatus("ready");
          return;
        }

        // No valid token found
        setStatus("error");
        setError(
          "No se encontró un enlace de recuperación válido. Solicita uno nuevo.",
        );
      } catch (err) {
        console.error("Reset password error:", err);
        setStatus("error");
        setError("Ocurrió un error inesperado.");
      }
    };

    checkSession();
  }, [searchParams, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const next = newPassword.trim();
    const confirm = confirmPassword.trim();

    if (next.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      setLoading(false);
      return;
    }

    if (next !== confirm) {
      setError("Las contraseñas no coinciden");
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: next,
    });

    setLoading(false);

    if (updateError) {
      setError(supabaseAuthErrorToSpanish(updateError));
      return;
    }

    setStatus("success");

    // Redirect to dashboard after 3 seconds
    setTimeout(() => {
      router.push("/dashboard");
    }, 3000);
  };

  // Loading state
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Verificando enlace...</p>
        </div>
      </div>
    );
  }

  // Expired link
  if (status === "expired") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
        <div className="text-center max-w-md">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 mb-8"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg">
              <TrendingUp className="h-7 w-7" />
            </div>
            <span className="text-2xl font-bold tracking-tight">
              BetTracker Pro
            </span>
          </Link>

          <div className="mb-6">
            <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950">
              <Lock className="h-10 w-10 text-amber-600 dark:text-amber-400" />
            </div>
          </div>

          <h1 className="text-3xl font-bold mb-4">Enlace Expirado</h1>
          <p className="text-muted-foreground mb-8">
            Los enlaces de recuperación expiran después de 24 horas por
            seguridad. Por favor, solicita uno nuevo.
          </p>

          <Button asChild size="lg" className="gap-2">
            <Link href="/login">
              <ArrowLeft className="h-4 w-4" />
              Solicitar nuevo enlace
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // Error state
  if (status === "error") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
        <div className="text-center max-w-md">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 mb-8"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg">
              <TrendingUp className="h-7 w-7" />
            </div>
            <span className="text-2xl font-bold tracking-tight">
              BetTracker Pro
            </span>
          </Link>

          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>

          <Button asChild size="lg">
            <Link href="/login">Volver a Iniciar Sesión</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Success state
  if (status === "success") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
        <div className="text-center max-w-md">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 mb-8"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg">
              <TrendingUp className="h-7 w-7" />
            </div>
            <span className="text-2xl font-bold tracking-tight">
              BetTracker Pro
            </span>
          </Link>

          <div className="mb-6">
            <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950">
              <CheckCircle2 className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>

          <h1 className="text-3xl font-bold mb-4">¡Contraseña Actualizada!</h1>
          <p className="text-muted-foreground mb-8">
            Tu contraseña ha sido cambiada exitosamente. Serás redirigido al
            dashboard en unos segundos...
          </p>

          <Button asChild size="lg">
            <Link href="/dashboard">Ir al Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Ready state - show form
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg">
            <TrendingUp className="h-7 w-7" />
          </div>
          <span className="text-2xl font-bold tracking-tight">
            BetTracker Pro
          </span>
        </Link>

        <Card>
          <CardHeader className="text-center">
            <div className="mb-4 mx-auto">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Lock className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">Nueva Contraseña</CardTitle>
            <CardDescription>
              Ingresa tu nueva contraseña. Asegúrate de que sea segura y fácil
              de recordar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="newPassword">Nueva contraseña</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    required
                    minLength={6}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={
                      showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repite la contraseña"
                    required
                    minLength={6}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={
                      showConfirmPassword
                        ? "Ocultar contraseña"
                        : "Mostrar contraseña"
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Actualizando...
                  </>
                ) : (
                  "Actualizar Contraseña"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          <Link href="/login" className="text-primary hover:underline">
            ← Volver a Iniciar Sesión
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
