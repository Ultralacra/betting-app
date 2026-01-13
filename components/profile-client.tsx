"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CreditCard, LogOut, User as UserIcon, ShieldCheck, Mail, Lock } from "lucide-react";

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
  dur: MembershipDuration | null | undefined
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
  duration: MembershipDuration | null | undefined
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
          const isRecent = updatedAt && (Date.now() - new Date(updatedAt).getTime() < 60000);
          
          const lastSeen =
            typeof window !== "undefined"
              ? localStorage.getItem(seenKey)
              : null;

          const nextTier = next.membership_tier ?? liveProfile.membershipTier;
          const nextDuration =
            next.membership_duration === undefined
              ? liveProfile.membershipDuration ?? null
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
          const durationChanged = nextDuration !== liveProfile.membershipDuration;
          
          const prevExpires = liveProfile.membershipExpiresAt?.getTime() ?? 0;
          const newExpires = nextExpiresAt?.getTime() ?? 0;
          const expiresChanged = prevExpires !== newExpires;

          const isMembershipUpdate = tierChanged || durationChanged || expiresChanged;

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
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, liveProfile?.id, liveProfile.membershipDuration, liveProfile.membershipTier, liveProfile.membershipExpiresAt]);

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
      // Green color for success/gain, no shadow, pulse animation
      className: "bg-emerald-500 hover:bg-emerald-600 text-white border-0 px-3 py-1 animate-pulse-soft !shadow-none",
      text: `PRO${label ? ` · ${label}` : ""}`,
    };
  }, [liveProfile.membershipDuration, liveProfile.membershipTier]);

  const headerDaysLeft = useMemo(() => {
    if (liveProfile.membershipTier !== "PRO") return null;
    return daysLeftLabel(
      liveProfile.membershipExpiresAt,
      liveProfile.membershipDuration ?? null
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

              <Button asChild variant="ghost" size="sm" className="hidden sm:flex btn-hover-effect">
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
            <DialogContent className="glass-card border-primary/20 !shadow-none">
              <DialogHeader>
                <DialogTitle className="text-2xl text-primary">
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
                    <span className="font-medium text-foreground">{membershipModalRange.from.toLocaleDateString()}</span>
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
                <Button onClick={() => setMembershipModalOpen(false)} className="btn-hover-effect !shadow-none">
                  ¡Entendido!
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* User Info Card - Removed glass-card specific class to avoid blue tints if any, using standard bg-background or similar */}
          <Card className="bg-background border border-border/50 overflow-hidden !shadow-none">
             {/* Gradient line at top - keeping it subtle or neutral if needed, but user said 'gain colors green'. This separation line can correspond to gain/success if we want? I'll keep it standard primary-accent for now, or match gain color? sticking to primary for neutrality unless requested */}
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/20 to-primary/40 opacity-50" />
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-2xl">
                 <div className="p-2.5 rounded-full bg-primary/5 text-primary">
                   <ShieldCheck className="h-6 w-6" />
                 </div>
                Información Personal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                 <div className="space-y-2">
                  <Label className="text-muted-foreground font-medium flex items-center gap-2">
                    <Mail className="w-4 h-4" /> Email
                  </Label>
                  <div className="p-3 rounded-lg bg-muted/30 border border-border/50 font-mono text-sm">
                    {profile.email ?? "No registrado"}
                  </div>
                </div>

                <div className="space-y-2 col-span-2 sm:col-span-1">
                  <Label className="text-muted-foreground font-medium flex items-center gap-2">
                    <UserIcon className="w-4 h-4" /> Nombre
                  </Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-background/50 focus:bg-background transition-colors !shadow-none"
                    placeholder="Tu nombre completo"
                  />
                </div>
              </div>
              
               <div className="pt-2 flex justify-end">
                  <Button 
                    onClick={saveProfile} 
                    disabled={loading} 
                    className="btn-hover-effect min-w-[120px] !shadow-none"
                  >
                    Guardar Cambios
                  </Button>
               </div>

              <div className="border-t border-border/50 pt-6 space-y-4">
                <Label className="text-muted-foreground font-medium flex items-center gap-2">
                    <Lock className="w-4 h-4" /> Seguridad
                  </Label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Input
                    type="password"
                    placeholder="Nueva contraseña (mín. 6 caracteres)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                     className="bg-background/50 focus:bg-background transition-colors flex-1 !shadow-none"
                  />
                  <Button
                    onClick={changePassword}
                    variant="outline"
                    className="btn-hover-effect whitespace-nowrap !shadow-none"
                    disabled={loading}
                  >
                    Actualizar Contraseña
                  </Button>
                </div>
              </div>

              {message && (
                <div className="p-3 rounded-lg bg-primary/5 text-primary text-sm font-medium text-center animate-fade-in border border-primary/10">
                  {message}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Membership Card */}
          <Card className="bg-background border border-border/50 relative overflow-hidden group !shadow-none">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="p-2.5 rounded-full bg-primary/5 text-primary">
                    <CreditCard className="h-6 w-6" />
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
                  <div className="text-sm text-muted-foreground">Plan Actual</div>
                  <div className={`text-2xl font-bold ${liveProfile.membershipTier === "PRO" ? "text-emerald-500" : "text-foreground"}`}>
                    {liveProfile.membershipTier === "PRO" ? "Pro Member" : "Free Plan"}
                  </div>
                </div>
                
                {liveProfile.membershipTier === "PRO" && (
                   <div className="space-y-1">
                     <div className="text-sm text-muted-foreground">Tiempo Restante</div>
                     <div className="text-2xl font-bold text-foreground flex items-baseline gap-2">
                       {headerDaysLeft ?? "∞"} 
                       {headerDaysLeft && <span className="text-sm font-normal text-muted-foreground">días</span>}
                     </div>
                   </div>
                )}

                <div className="col-span-2 text-sm text-muted-foreground/80 mt-2 p-3 rounded-lg bg-muted/20 border border-border/30">
                  {liveProfile.membershipTier !== "PRO"
                    ? "Actualiza a PRO para desbloquear todas las funcionalidades avanzadas y límites extendidos."
                    : liveProfile.membershipDuration === "LIFETIME"
                    ? "¡Tienes acceso de por vida! Disfruta sin límites."
                    : liveProfile.membershipExpiresAt
                    ? `Tu suscripción vence el ${new Date(liveProfile.membershipExpiresAt).toLocaleDateString()}.`
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
