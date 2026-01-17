"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  CheckCircle2,
  Mail,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";
import confetti from "canvas-confetti";

// SVG del logo de Google
function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      {...props}
    >
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

// Componente de animación de loading
function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <TrendingUp className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-primary" />
      </div>
      <p className="text-sm text-muted-foreground animate-pulse">
        Iniciando sesión...
      </p>
    </div>
  );
}
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
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);
  const [resendEmail, setResendEmail] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastSignUpEmail, setLastSignUpEmail] = useState<string | null>(null);
  const [signUpResendLoading, setSignUpResendLoading] = useState(false);
  const [signUpResendMessage, setSignUpResendMessage] = useState<string | null>(
    null,
  );
  const [googleLoading, setGoogleLoading] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError(null);
    setMessage(null);

    try {
      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo:
            typeof window !== "undefined"
              ? `${window.location.origin}/dashboard`
              : undefined,
          // Persistencia de sesión
          skipBrowserRedirect: false,
        },
      });

      if (signInError) {
        setError(supabaseAuthErrorToSpanish(signInError));
        setGoogleLoading(false);
        return;
      }

      // El navegador redirigirá automáticamente a Google
    } catch (err) {
      setError("Error al iniciar sesión con Google");
      setGoogleLoading(false);
    }
  };

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
    setNeedsEmailConfirmation(false);
    setResendEmail(null);
    setLoading(true);

    const normalizedEmail = email.trim().toLowerCase();
    const needsEmail =
      view === "login" || view === "register" || view === "forgot";
    if (needsEmail && !normalizedEmail) {
      setLoading(false);
      setError("Ingresa tu email");
      return;
    }

    if (view === "login") {
      setIsAuthenticating(true);
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });
      setLoading(false);

      if (signInError) {
        setIsAuthenticating(false);
        const code = (signInError as { code?: string }).code;
        const msg = (signInError as { message?: string }).message ?? "";
        const isEmailNotConfirmed =
          code === "email_not_confirmed" || msg.includes("Email not confirmed");

        if (isEmailNotConfirmed) {
          setNeedsEmailConfirmation(true);
          setResendEmail(normalizedEmail);
          setMessage(
            `Aún no confirmaste tu correo. Te enviamos un enlace de verificación a ${normalizedEmail}. ` +
              "Ábrelo para activar tu cuenta. Si no te llega, revisa spam o reenvíalo.",
          );
          return;
        }

        setError(supabaseAuthErrorToSpanish(signInError));
        return;
      }

      // Pequeño delay para mostrar la animación
      await new Promise((resolve) => setTimeout(resolve, 800));
      setIsAuthenticating(false);
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
              ? `${window.location.origin}/auth/confirm`
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
          "Ya existe una cuenta con este email. Ingresa o recupera tu contraseña.",
        );
        setView("login");
        return;
      }

      if (!data.user) {
        setError(
          "No se pudo crear la cuenta. Si ya tienes una, intenta iniciar sesión o recuperar tu contraseña.",
        );
        setView("login");
        return;
      }

      // Celebración de éxito con modal y confetti
      setLastSignUpEmail(normalizedEmail);
      setSignUpResendMessage(null);
      setShowSuccessModal(true);
      if (typeof window !== "undefined") {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#10b981", "#34d399", "#059669"], // Tonos esmeralda
          disableForReducedMotion: true,
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
              ? `${window.location.origin}/auth/reset-password`
              : undefined,
        },
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
      const confirm = confirmNewPassword.trim();
      if (next.length < 6) {
        setLoading(false);
        setError("La contraseña debe tener al menos 6 caracteres");
        return;
      }

      if (next !== confirm) {
        setLoading(false);
        setError("Las contraseñas no coinciden");
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
      setConfirmNewPassword("");
      return;
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 relative overflow-hidden">
      {/* Fondo animado sutil */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/4 -left-48 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Overlay de loading a pantalla completa */}
      {isAuthenticating && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <LoadingSpinner />
        </div>
      )}

      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-md text-center border-accent/20 shadow-lg shadow-accent/10">
          <DialogHeader className="flex flex-col items-center gap-4 pt-4">
            <div className="rounded-full bg-accent/10 p-4 ring-8 ring-accent/5">
              <CheckCircle2 className="h-12 w-12 text-accent" />
            </div>
            <DialogTitle className="text-2xl font-bold text-center">
              ¡Cuenta creada con éxito!
            </DialogTitle>
            <DialogDescription className="text-center text-lg">
              Estás a un paso de comenzar.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 flex flex-col items-center gap-4 text-center">
            <div className="bg-muted p-4 rounded-lg flex items-center gap-3 w-full justify-center border border-border/50">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm">
                Hemos enviado un correo de confirmación a{" "}
                <span className="font-semibold text-foreground">
                  {lastSignUpEmail ?? email}
                </span>
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Por favor revisa tu bandeja de entrada (y spam) para verificar tu
              cuenta y acceder a la plataforma.
            </p>

            {signUpResendMessage && (
              <p className="text-sm text-accent bg-accent/5 border border-accent/20 rounded-md px-3 py-2 w-full">
                {signUpResendMessage}
              </p>
            )}

            <Button
              type="button"
              variant="outline"
              className="w-full border-accent/30 text-accent hover:bg-accent/5"
              disabled={signUpResendLoading || !(lastSignUpEmail ?? email)}
              onClick={async () => {
                const targetEmail = (lastSignUpEmail ?? email)
                  .trim()
                  .toLowerCase();
                if (!targetEmail) return;
                setSignUpResendLoading(true);
                setSignUpResendMessage(null);
                try {
                  const { error: resendError } = await supabase.auth.resend({
                    type: "signup",
                    email: targetEmail,
                  });
                  if (resendError) {
                    setSignUpResendMessage(
                      supabaseAuthErrorToSpanish(resendError),
                    );
                    return;
                  }
                  setSignUpResendMessage(
                    `Listo. Reenviamos el correo de confirmación a ${targetEmail}. ` +
                      "Revisa tu bandeja de entrada y spam.",
                  );
                } finally {
                  setSignUpResendLoading(false);
                }
              }}
            >
              {signUpResendLoading
                ? "Reenviando correo..."
                : "No me llegó, reenviar correo"}
            </Button>

            <Button
              onClick={() => setShowSuccessModal(false)}
              className="w-full mt-2 bg-accent hover:bg-accent/90 text-accent-foreground"
              size="lg"
            >
              Entendido, ir al login
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card className="w-full max-w-md shadow-xl border-border/50 backdrop-blur-sm bg-card/95">
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 ring-4 ring-primary/5">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">BetTracker Pro</CardTitle>
              <CardDescription className="text-base">
                Gestión profesional de apuestas
              </CardDescription>
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
            <Alert
              className={
                needsEmailConfirmation
                  ? "border-accent/30 bg-accent/5"
                  : undefined
              }
            >
              {needsEmailConfirmation && (
                <Mail className="h-4 w-4 text-accent" />
              )}
              <AlertDescription
                className={
                  needsEmailConfirmation ? "text-foreground" : undefined
                }
              >
                <p>{message}</p>

                {needsEmailConfirmation && (
                  <div className="mt-2 flex w-full flex-col gap-2 sm:flex-row">
                    <Button
                      type="button"
                      className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground"
                      disabled={resendLoading || !resendEmail}
                      onClick={async () => {
                        if (!resendEmail) return;
                        setResendLoading(true);
                        setError(null);
                        try {
                          const { error: resendError } =
                            await supabase.auth.resend({
                              type: "signup",
                              email: resendEmail,
                            });
                          if (resendError) {
                            setError(supabaseAuthErrorToSpanish(resendError));
                            setMessage(null);
                            setNeedsEmailConfirmation(false);
                            setResendEmail(null);
                            return;
                          }
                          setMessage(
                            `Listo. Reenviamos el correo de confirmación a ${resendEmail}. ` +
                              "Revisa tu bandeja de entrada y spam.",
                          );
                        } finally {
                          setResendLoading(false);
                        }
                      }}
                    >
                      {resendLoading ? "Reenviando..." : "Reenviar correo"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={() => {
                        setMessage(null);
                        setNeedsEmailConfirmation(false);
                        setResendEmail(null);
                      }}
                    >
                      Cambiar email
                    </Button>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          <Tabs
            value={view}
            onValueChange={(v) => {
              setError(null);
              setMessage(null);
              setNeedsEmailConfirmation(false);
              setResendEmail(null);
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
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      aria-label={
                        showPassword
                          ? "Ocultar contraseña"
                          : "Mostrar contraseña"
                      }
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword((v) => !v)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full h-11 font-semibold"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Ingresando...
                    </>
                  ) : (
                    "Ingresar"
                  )}
                </Button>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border/50" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-3 text-muted-foreground font-medium">
                      O continúa con
                    </span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-11 font-medium border-border/50 hover:bg-accent/5 hover:border-accent/50 transition-all"
                  disabled={googleLoading || loading}
                  onClick={handleGoogleSignIn}
                >
                  {googleLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Conectando...
                    </>
                  ) : (
                    <>
                      <GoogleIcon className="mr-2" />
                      Continuar con Google
                    </>
                  )}
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
                  <div className="relative">
                    <Input
                      id="password-register"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      aria-label={
                        showPassword
                          ? "Ocultar contraseña"
                          : "Mostrar contraseña"
                      }
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword((v) => !v)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full h-11 font-semibold"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creando cuenta...
                    </>
                  ) : (
                    "Crear cuenta"
                  )}
                </Button>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border/50" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-3 text-muted-foreground font-medium">
                      O regístrate con
                    </span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-11 font-medium border-border/50 hover:bg-accent/5 hover:border-accent/50 transition-all"
                  disabled={googleLoading || loading}
                  onClick={handleGoogleSignIn}
                >
                  {googleLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Conectando...
                    </>
                  ) : (
                    <>
                      <GoogleIcon className="mr-2" />
                      Registrarse con Google
                    </>
                  )}
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
                <Button
                  type="submit"
                  className="w-full h-11 font-semibold"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    "Enviar email de recuperación"
                  )}
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
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      aria-label={
                        showNewPassword
                          ? "Ocultar contraseña"
                          : "Mostrar contraseña"
                      }
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowNewPassword((v) => !v)}
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-new-password">
                    Confirmar nueva contraseña
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirm-new-password"
                      type={showConfirmNewPassword ? "text" : "password"}
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      aria-label={
                        showConfirmNewPassword
                          ? "Ocultar contraseña"
                          : "Mostrar contraseña"
                      }
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowConfirmNewPassword((v) => !v)}
                    >
                      {showConfirmNewPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full h-11 font-semibold"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Actualizando...
                    </>
                  ) : (
                    "Actualizar contraseña"
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
