"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TrendingUp, CheckCircle2, Mail } from "lucide-react";
import confetti from "canvas-confetti";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { supabaseAuthErrorToSpanish } from "@/lib/supabase/errors";

type AuthView = "login" | "register" | "forgot" | "updatePassword";

export default function LoginPage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [view, setView] = useState<AuthView>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const isRecoveryLink =
      typeof window !== "undefined" &&
      (window.location.hash.includes("type=recovery") ||
        new URLSearchParams(window.location.search).get("type") === "recovery");

    if (isRecoveryLink) {
      setView("updatePassword");
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      // Si venimos desde recuperación de contraseña, no redirigimos al dashboard.
      if (data.session && !isRecoveryLink) {
        router.push("/dashboard");
      }
    });

    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setView("updatePassword");
      }
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, [router, supabase]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setLoading(false);
      setError("Ingresa tu email");
      return;
    }

    if (view === "login") {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });
      setLoading(false);
      if (signInError) {
        setError(supabaseAuthErrorToSpanish(signInError));
        return;
      }
      router.push("/dashboard");
      return;
    }

    if (view === "register") {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo:
            typeof window !== "undefined"
              ? `${window.location.origin}/login`
              : undefined,
        },
      });
      setLoading(false);
      if (signUpError) {
        setError(supabaseAuthErrorToSpanish(signUpError));
        return;
      }

      // Supabase a veces responde 200 aunque el email ya exista (por seguridad).
      // En ese caso, `identities` suele venir vacío.
      const identities = (data.user as { identities?: unknown[] } | null)
        ?.identities;
      if (Array.isArray(identities) && identities.length === 0) {
        setError(
          "Ya existe una cuenta con este email. Ingresa o recupera tu contraseña."
        );
        setView("login");
        return;
      }

      if (!data.user) {
        setError(
          "No se pudo crear la cuenta. Si ya tienes una, intenta iniciar sesión o recuperar tu contraseña."
        );
        setView("login");
        return;
      }

      // Celebración de éxito con modal y confetti
      setShowSuccessModal(true);
      if (typeof window !== "undefined") {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#10b981', '#34d399', '#059669'], // Tonos esmeralda
          disableForReducedMotion: true
        });
      }
      
      setView("login"); 
      return;
    }

    if (view === "forgot") {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        normalizedEmail,
        {
          redirectTo:
            typeof window !== "undefined"
              ? `${window.location.origin}/login`
              : undefined,
        }
      );
      setLoading(false);
      if (resetError) {
        setError(supabaseAuthErrorToSpanish(resetError));
        return;
      }
      setMessage("Te enviamos un email para recuperar tu contraseña.");
      return;
    }

    if (view === "updatePassword") {
      const next = newPassword.trim();
      if (next.length < 6) {
        setLoading(false);
        setError("La contraseña debe tener al menos 6 caracteres");
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
      setMessage("Contraseña actualizada. Ya puedes ingresar.");
      setView("login");
      setNewPassword("");
      return;
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-md text-center border-emerald-500/20 shadow-lg shadow-emerald-500/10">
          <DialogHeader className="flex flex-col items-center gap-4 pt-4">
             <div className="rounded-full bg-emerald-100 p-4 ring-8 ring-emerald-50 animate-bounce-slow">
               <CheckCircle2 className="h-12 w-12 text-emerald-600" /> 
             </div>
            <DialogTitle className="text-2xl font-bold text-center">¡Cuenta creada con éxito!</DialogTitle>
            <DialogDescription className="text-center text-lg">
              Estás a un paso de comenzar.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 flex flex-col items-center gap-4 text-center">
             <div className="bg-muted p-4 rounded-lg flex items-center gap-3 w-full justify-center border border-border/50">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm">Hemos enviado un correo de confirmación a <span className="font-semibold text-foreground">{email}</span></span>
             </div>
             <p className="text-sm text-muted-foreground">
               Por favor revisa tu bandeja de entrada (y spam) para verificar tu cuenta y acceder a la plataforma.
             </p>
             <Button onClick={() => setShowSuccessModal(false)} className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 text-white" size="lg">
               Entendido, ir al login
             </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <TrendingUp className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <CardTitle>BetTracker Pro</CardTitle>
              <CardDescription>Accede con tu cuenta</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {message && (
            <Alert>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          <Tabs
            value={view}
            onValueChange={(v) => {
              setError(null);
              setMessage(null);
              setView(v as AuthView);
            }}
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Registro</TabsTrigger>
              <TabsTrigger value="forgot">Recuperar</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-4">
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Ingresando..." : "Ingresar"}
                </Button>
                <Button
                  type="button"
                  variant="link"
                  className="w-full"
                  onClick={() => {
                    setError(null);
                    setMessage(null);
                    setView("forgot");
                  }}
                >
                  ¿Olvidaste tu contraseña?
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register" className="mt-4">
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email-register">Email</Label>
                  <Input
                    id="email-register"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-register">Contraseña</Label>
                  <Input
                    id="password-register"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Creando..." : "Crear cuenta"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="forgot" className="mt-4">
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email-forgot">Email</Label>
                  <Input
                    id="email-forgot"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Enviando..." : "Enviar email de recuperación"}
                </Button>
                <Button
                  type="button"
                  variant="link"
                  className="w-full"
                  onClick={() => {
                    setError(null);
                    setMessage(null);
                    setView("login");
                  }}
                >
                  Volver a login
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="updatePassword" className="mt-4">
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nueva contraseña</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Actualizando..." : "Actualizar contraseña"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
