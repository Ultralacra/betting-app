"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  LogOut,
  User as UserIcon,
  ShieldCheck,
  Mail,
  Lock,
} from "lucide-react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { supabaseAuthErrorToSpanish } from "@/lib/supabase/errors";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type MembershipTier = "FREE" | "PRO";
type MembershipDuration = "1M" | "2M" | "3M" | "1Y" | "LIFETIME";

function membershipDurationLabel(
  dur: MembershipDuration | null | undefined,
): string {
  if (!dur) return "";
  if (dur === "LIFETIME") return "Lifetime";
  if (dur === "1Y") return "1 año";
  if (dur === "1M") return "1 mes";
  if (dur === "2M") return "2 meses";
  return "3 meses";
}

function daysLeftLabel(
  expiresAt: Date | null,
  duration: MembershipDuration | null | undefined,
): string | null {
  if (duration === "LIFETIME") return "Lifetime";
  if (!expiresAt) return null;
  const diff = expiresAt.getTime() - Date.now();
  const days = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  return `${days} días`;
}

function getInitials(name: string | null | undefined): string {
  if (!name) return "U";
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

type Profile = {
  id: string;
  email: string | null;
  name: string | null;
  provider: string;
  hasPassword: boolean;
  membershipTier: MembershipTier;
  membershipDuration?: MembershipDuration | null;
  membershipExpiresAt: Date | null;
};

interface Props {
  profile: Profile;
}

export function ProfileClient({ profile }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [liveProfile, setLiveProfile] = useState(profile);
  const [membershipModalOpen, setMembershipModalOpen] = useState(false);
  const [membershipModalText, setMembershipModalText] = useState<{
    title: string;
    description: string;
  } | null>(null);
  const [membershipModalRange, setMembershipModalRange] = useState<{
    from: Date;
    to: Date | null;
    lifetime: boolean;
  } | null>(null);

  // States for profile editing
  const [name, setName] = useState(profile.name ?? "");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLiveProfile(profile);
    if (profile.name) setName(profile.name);
  }, [profile]);

  useEffect(() => {
    if (!liveProfile?.id) return;

    // Use a unique key for tracking
    const seenKey = `bt.membership.seenUpdatedAt:${liveProfile.id}`;

    const channel = supabase
      .channel(`app_users:${liveProfile.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "app_users",
          filter: `user_id=eq.${liveProfile.id}`,
        },
        (payload) => {
          const next = payload.new as {
            membership_tier?: "FREE" | "PRO";
            membership_expires_at?: string | null;
            membership_duration?: MembershipDuration | null;
            updated_at?: string;
          };

          const updatedAt = next.updated_at ?? null;
          // Sólo mostramos el modal si el evento ocurrió hace menos de 1 minuto
          const isRecent =
            updatedAt && Date.now() - new Date(updatedAt).getTime() < 60000;

          const lastSeen =
            typeof window !== "undefined"
              ? localStorage.getItem(seenKey)
              : null;

          const nextTier = next.membership_tier ?? liveProfile.membershipTier;
          const nextDuration =
            next.membership_duration === undefined
              ? (liveProfile.membershipDuration ?? null)
              : next.membership_duration;
          const nextExpiresAt = next.membership_expires_at
            ? new Date(next.membership_expires_at)
            : null;

          setLiveProfile((prev) => ({
            ...prev,
            membershipTier: nextTier,
            membershipDuration: nextDuration,
            membershipExpiresAt: nextExpiresAt,
          }));

          // Detectar cambio REAL en la membresía
          const tierChanged = nextTier !== liveProfile.membershipTier;
          const durationChanged =
            nextDuration !== liveProfile.membershipDuration;

          const prevExpires = liveProfile.membershipExpiresAt?.getTime() ?? 0;
          const newExpires = nextExpiresAt?.getTime() ?? 0;
          const expiresChanged = prevExpires !== newExpires;

          const isMembershipUpdate =
            tierChanged || durationChanged || expiresChanged;

          if (updatedAt && isRecent && isMembershipUpdate) {
            const durLabel = membershipDurationLabel(nextDuration);
            const description =
              nextTier !== "PRO"
                ? "Tu plan ahora es FREE."
                : nextDuration === "LIFETIME" || (!nextExpiresAt && durLabel)
                  ? `Tu plan es PRO (${durLabel}).`
                  : `Tu plan es PRO${durLabel ? ` (${durLabel})` : ""}${
                      nextExpiresAt
                        ? ` y vence el ${nextExpiresAt.toLocaleDateString()}.`
                        : "."
                    }`;

            setMembershipModalText({
              title:
                nextTier === "PRO"
                  ? "¡Membresía PRO activada!"
                  : "Membresía actualizada",
              description,
            });
            const from = new Date(updatedAt);
            const lifetime = nextDuration === "LIFETIME" || !nextExpiresAt;
            setMembershipModalRange({ from, to: nextExpiresAt, lifetime });
            setMembershipModalOpen(true);
            try {
              localStorage.setItem(seenKey, updatedAt);
            } catch {
              // ignore
            }
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [
    supabase,
    liveProfile?.id,
    liveProfile.membershipDuration,
    liveProfile.membershipTier,
    liveProfile.membershipExpiresAt,
  ]);

  const membershipBadge = useMemo(() => {
    const tier = liveProfile.membershipTier;
    if (tier !== "PRO") {
      return {
        variant: "secondary" as const,
        className: "bg-muted text-muted-foreground border-border px-3 py-1",
        text: "Plan FREE",
      };
    }

    const dur = liveProfile.membershipDuration ?? null;
    const label = membershipDurationLabel(dur);

    return {
      variant: "default" as const,
      // Accent color profesional
      className:
        "bg-accent hover:bg-accent/90 text-accent-foreground border-0 px-3 py-1 animate-pulse-soft shadow-none",
      text: `PRO${label ? ` · ${label}` : ""}`,
    };
  }, [liveProfile.membershipDuration, liveProfile.membershipTier]);

  const headerDaysLeft = useMemo(() => {
    if (liveProfile.membershipTier !== "PRO") return null;
    return daysLeftLabel(
      liveProfile.membershipExpiresAt,
      liveProfile.membershipDuration ?? null,
    );
  }, [
    liveProfile.membershipDuration,
    liveProfile.membershipExpiresAt,
    liveProfile.membershipTier,
  ]);

  const saveProfile = async () => {
    setMessage(null);
    setLoading(true);
    const { error } = await supabase.auth.updateUser({
      data: {
        full_name: name.trim(),
      },
    });
    setLoading(false);
    if (error) {
      setMessage(supabaseAuthErrorToSpanish(error));
      return;
    }
    setMessage("Perfil actualizado correctamente");
    router.refresh();
  };

  const changePassword = async () => {
    setMessage(null);
    const next = newPassword.trim();
    if (next.length < 6) {
      setMessage("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: next });
    setLoading(false);

    if (error) {
      setMessage(supabaseAuthErrorToSpanish(error));
      return;
    }

    setNewPassword("");
    setMessage("Contraseña actualizada correctamente");
  };

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border/40 backdrop-blur-md bg-background/80 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-3 group">
              <div className="p-2 rounded-xl bg-primary/5 text-foreground group-hover:bg-primary/10 transition-colors">
                <UserIcon className="h-5 w-5" />
              </div>
              <h1 className="text-xl font-bold tracking-tight">Mi Perfil</h1>
            </Link>

            <div className="flex items-center gap-4">
              {/* User Avatar & Name using neutral colors */}
              <div className="hidden md:flex items-center gap-3 mr-2 px-3 py-1.5 rounded-full bg-muted/40 border border-border/50">
                <Avatar className="h-8 w-8 border border-border/50">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-muted text-muted-foreground text-xs font-medium">
                    {getInitials(liveProfile.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-foreground">
                  {liveProfile.name || "Usuario"}
                </span>
              </div>

              <Button
                asChild
                variant="ghost"
                size="sm"
                className="hidden sm:flex btn-hover-effect"
              >
                <Link href="/dashboard">Volver al Dashboard</Link>
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={logout}
                className="gap-2 btn-hover-effect rounded-full px-4 !shadow-none"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Cerrar Sesión</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-8 animate-fade-in">
        <div className="w-full max-w-2xl grid gap-8">
          <Dialog
            open={membershipModalOpen}
            onOpenChange={setMembershipModalOpen}
          >
            <DialogContent className="border-accent/20 shadow-xl">
              <DialogHeader>
                <DialogTitle className="text-2xl text-accent">
                  {membershipModalText?.title ?? "Membresía"}
                </DialogTitle>
                <DialogDescription className="text-lg text-foreground/80">
                  {membershipModalText?.description ?? ""}
                </DialogDescription>
              </DialogHeader>
              {membershipModalRange && (
                <div className="p-4 rounded-lg bg-background/50 border border-border/50 text-sm text-muted-foreground flex flex-col gap-1">
                  <div className="flex justify-between">
                    <span>Inicio:</span>
                    <span className="font-medium text-foreground">
                      {membershipModalRange.from.toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Vencimiento:</span>
                    <span className="font-medium text-foreground">
                      {membershipModalRange.lifetime || !membershipModalRange.to
                        ? "De por vida (Lifetime)"
                        : membershipModalRange.to.toLocaleDateString()}
                    </span>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between mt-4">
                <Badge
                  variant={membershipBadge.variant}
                  className={membershipBadge.className}
                >
                  {membershipBadge.text.replace("Plan: ", "")}
                </Badge>
                <Button
                  onClick={() => setMembershipModalOpen(false)}
                  className="btn-hover-effect !shadow-none"
                >
                  ¡Entendido!
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* User Info Card - Removed glass-card specific class to avoid blue tints if any, using standard bg-background or similar */}
          <Card className="bg-background border border-border/50 overflow-hidden !shadow-none">
            {/* Gradient line at top - keeping it subtle or neutral if needed, but user said 'gain colors green'. This separation line can correspond to gain/success if we want? I'll keep it standard primary-accent for now, or match gain color? sticking to primary for neutrality unless requested */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/20 to-primary/40 opacity-50" />
            <CardHeader className="pb-4 pt-6">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 rounded-lg bg-accent/10 text-accent">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                Información Personal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground/80 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-accent" /> Email
                  </Label>
                  <div className="p-3.5 rounded-lg bg-accent/5 border border-accent/20 font-mono text-sm hover:border-accent/40 transition-colors">
                    <span className="text-foreground">
                      {profile.email ?? "No registrado"}
                    </span>
                  </div>
                  {profile.provider === "google" && (
                    <div className="flex items-center gap-2 pt-1">
                      <Badge
                        variant="outline"
                        className="text-xs bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          width="12"
                          height="12"
                          className="mr-1.5"
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
                        Google
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Cuenta vinculada
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-2 col-span-2 sm:col-span-1">
                  <Label className="text-sm font-semibold text-foreground/80 flex items-center gap-2">
                    <UserIcon className="w-4 h-4 text-accent" /> Nombre
                  </Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-accent/5 border-accent/20 focus:border-accent/40 transition-all !shadow-none"
                    placeholder="Tu nombre completo"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  onClick={saveProfile}
                  disabled={loading}
                  className="bg-accent hover:bg-accent/90 text-white min-w-[120px] !shadow-none"
                >
                  Guardar Cambios
                </Button>
              </div>

              {profile.hasPassword && (
                <div className="border-t border-border/50 pt-6 space-y-4">
                  <Label className="text-sm font-semibold text-foreground/80 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-accent" /> Seguridad
                  </Label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Input
                      type="password"
                      placeholder="Nueva contraseña (mín. 6 caracteres)"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="bg-accent/5 border-accent/20 focus:border-accent/40 transition-all flex-1 !shadow-none"
                    />
                    <Button
                      onClick={changePassword}
                      variant="outline"
                      className="border-accent/30 hover:bg-accent/10 hover:text-accent whitespace-nowrap !shadow-none"
                      disabled={loading}
                    >
                      Actualizar Contraseña
                    </Button>
                  </div>
                </div>
              )}

              {!profile.hasPassword && (
                <div className="border-t border-border/50 pt-6">
                  <div className="p-4 rounded-lg bg-accent/5 border border-accent/20 flex items-start gap-3">
                    <ShieldCheck className="h-5 w-5 text-accent mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        Cuenta protegida por Google
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Tu cuenta usa la autenticación segura de Google. No
                        necesitas gestionar contraseñas.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {message && (
                <div className="p-3 rounded-lg bg-primary/5 text-primary text-sm font-medium text-center animate-fade-in border border-primary/10">
                  {message}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Membership Card */}
          <Card className="bg-card border border-border/50 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-accent/40 via-primary/30 to-accent/40" />
            <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <CardHeader className="pt-6">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-accent/10 text-accent">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  Estado de Membresía
                </div>
                <Badge
                  variant={membershipBadge.variant}
                  className={`${membershipBadge.className} text-sm py-1 px-3 !shadow-none`}
                >
                  {membershipBadge.text}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="grid sm:grid-cols-2 gap-6 mt-2">
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">
                    Plan Actual
                  </div>
                  <div
                    className={`text-2xl font-bold ${
                      liveProfile.membershipTier === "PRO"
                        ? "text-accent"
                        : "text-foreground"
                    }`}
                  >
                    {liveProfile.membershipTier === "PRO"
                      ? "Pro Member"
                      : "Free Plan"}
                  </div>
                </div>

                {liveProfile.membershipTier === "PRO" && (
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">
                      Tiempo Restante
                    </div>
                    <div className="text-2xl font-bold text-foreground flex items-baseline gap-2">
                      {headerDaysLeft ?? "∞"}
                      {headerDaysLeft && (
                        <span className="text-sm font-normal text-muted-foreground">
                          días
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="col-span-2 text-sm text-muted-foreground/80 mt-2 p-3 rounded-lg bg-muted/20 border border-border/30">
                  {liveProfile.membershipTier !== "PRO"
                    ? "Actualiza a PRO para desbloquear todas las funcionalidades avanzadas y límites extendidos."
                    : liveProfile.membershipDuration === "LIFETIME"
                      ? "¡Tienes acceso de por vida! Disfruta sin límites."
                      : liveProfile.membershipExpiresAt
                        ? `Tu suscripción vence el ${new Date(
                            liveProfile.membershipExpiresAt,
                          ).toLocaleDateString()}.`
                        : "Suscripción activa."}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
