"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CreditCard, LogOut, User as UserIcon } from "lucide-react";

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

  useEffect(() => {
    setLiveProfile(profile);
  }, [profile]);

  useEffect(() => {
    if (!liveProfile?.id) return;

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

          if (updatedAt && updatedAt !== lastSeen) {
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
  }, [supabase, liveProfile?.id]);

  const membershipBadge = useMemo(() => {
    const tier = liveProfile.membershipTier;
    if (tier !== "PRO") {
      return {
        variant: "secondary" as const,
        className: "",
        text: "Plan: FREE",
      };
    }

    const dur = liveProfile.membershipDuration ?? null;
    const label = membershipDurationLabel(dur);

    // Solo tokens del tema (sin colores hardcode).
    if (dur === "LIFETIME") {
      return {
        variant: "default" as const,
        className: "ring-1 ring-ring/30",
        text: `Plan: PRO${label ? ` (${label})` : ""}`,
      };
    }

    return {
      variant: "secondary" as const,
      className: "bg-accent text-accent-foreground",
      text: `Plan: PRO${label ? ` (${label})` : ""}`,
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

  const [name, setName] = useState(profile.name ?? "");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    setMessage("Perfil actualizado");
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
    setMessage("Contraseña actualizada");
  };

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserIcon className="h-5 w-5" />
              <h1 className="text-xl font-bold text-foreground">Perfil</h1>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={membershipBadge.variant}
                className={membershipBadge.className}
              >
                {membershipBadge.text}
              </Badge>
              {headerDaysLeft && (
                <span className="text-xs text-muted-foreground">
                  ({headerDaysLeft})
                </span>
              )}
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard">Volver</Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={logout}
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
                <span>Cerrar sesión</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Dialog
          open={membershipModalOpen}
          onOpenChange={setMembershipModalOpen}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {membershipModalText?.title ?? "Membresía"}
              </DialogTitle>
              <DialogDescription>
                {membershipModalText?.description ?? ""}
              </DialogDescription>
            </DialogHeader>
            {membershipModalRange && (
              <div className="text-sm text-muted-foreground">
                Desde: {membershipModalRange.from.toLocaleDateString()} · Hasta:{" "}
                {membershipModalRange.lifetime || !membershipModalRange.to
                  ? "Lifetime"
                  : membershipModalRange.to.toLocaleDateString()}
              </div>
            )}
            <div className="flex items-center justify-between">
              <Badge
                variant={membershipBadge.variant}
                className={membershipBadge.className}
              >
                {membershipBadge.text.replace("Plan: ", "")}
              </Badge>
              <Button onClick={() => setMembershipModalOpen(false)}>
                Entendido
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <div className="grid gap-6 max-w-xl">
          <Card>
            <CardHeader>
              <CardTitle>Cuenta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={profile.email ?? ""} readOnly />
              </div>

              <div className="space-y-2">
                <Label>Nombre</Label>
                <div className="flex gap-2">
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <Button onClick={saveProfile} disabled={loading}>
                    Guardar
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Nueva contraseña</Label>
                <Input
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <Button
                  onClick={changePassword}
                  variant="outline"
                  className="w-full bg-transparent"
                  disabled={loading}
                >
                  Actualizar contraseña
                </Button>
              </div>

              {message && (
                <p className="text-sm text-muted-foreground">{message}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Membresía
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm">
                Plan:{" "}
                <span className="font-medium">
                  {liveProfile.membershipTier}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                {liveProfile.membershipTier !== "PRO"
                  ? "FREE"
                  : liveProfile.membershipDuration === "LIFETIME"
                  ? "Lifetime"
                  : liveProfile.membershipExpiresAt
                  ? `Vence: ${new Date(
                      liveProfile.membershipExpiresAt
                    ).toLocaleDateString()}`
                  : "PRO"}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
