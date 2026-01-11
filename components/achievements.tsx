"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock, XCircle } from "lucide-react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { toast } from "@/hooks/use-toast";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

type Achievement = {
  id: string;
  parley_name: string;
  line: string;
  momio: string;
  result: "PENDING" | "HIT" | "MISS";
  created_at: string;
};

type AchievementsResponse = {
  achievements: Achievement[];
  dailyLimit: number;
};

export function Achievements() {
  const [loading, setLoading] = useState(true);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [dailyLimit, setDailyLimit] = useState<number>(1);

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/achievements", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as any;
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }

      const data = (await res.json()) as AchievementsResponse;
      setAchievements(data.achievements ?? []);
      setDailyLimit(data.dailyLimit ?? 1);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      toast({
        title: "No se pudieron cargar los logros",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel("achievements-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "achievements" },
        () => {
          toast({
            title: "Nuevo logro agregado",
            description: "Se añadió un nuevo logro hoy.",
          });
          void load();
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "achievements" },
        () => {
          toast({
            title: "Logro actualizado",
            description: "Se actualizó un logro hoy.",
          });
          void load();
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "achievements" },
        () => {
          toast({
            title: "Logro eliminado",
            description: "Se eliminó un logro hoy.",
          });
          void load();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, load]);

  const emptyText = useMemo(() => {
    if (loading) return "Cargando…";
    if (achievements.length > 0) return null;
    return null;
  }, [loading, achievements.length]);

  const shownCount = achievements.length;
  const progressValue =
    dailyLimit > 0
      ? Math.min(100, Math.round((shownCount / dailyLimit) * 100))
      : 0;

  const statusMeta = (result: Achievement["result"]) => {
    if (result === "HIT") {
      return {
        label: "Pegó",
        badgeVariant: "secondary" as const,
        badgeClassName:
          "bg-chart-2/15 text-foreground border border-chart-2/30",
        Icon: CheckCircle2,
        accentClass: "border-chart-2/30 bg-chart-2/10",
        iconClass: "text-chart-2",
      };
    }
    if (result === "MISS") {
      return {
        label: "No pegó",
        badgeVariant: "secondary" as const,
        badgeClassName:
          "bg-destructive/12 text-foreground border border-destructive/25",
        Icon: XCircle,
        accentClass: "border-destructive/30 bg-destructive/10",
        iconClass: "text-destructive",
      };
    }
    return {
      label: "Pendiente",
      badgeVariant: "secondary" as const,
      Icon: Clock,
      accentClass: "border-muted-foreground/20 bg-muted/50",
      iconClass: "text-muted-foreground",
    };
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle>Logros de hoy</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                Vistos: {shownCount}/{dailyLimit}
              </Badge>
              <Badge>Límite: {dailyLimit}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Progreso del día</span>
              <span>
                {dailyLimit > 0 ? `${shownCount}/${dailyLimit}` : "—"}
              </span>
            </div>
            <Progress value={loading ? 0 : progressValue} />
          </div>

          <Separator />

          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : achievements.length === 0 ? (
            <Alert>
              <AlertTitle>Sin logros</AlertTitle>
              <AlertDescription>
                Hoy no se han agregado aún logros.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {achievements.map((a) =>
                (() => {
                  const meta = statusMeta(a.result);
                  const Icon = meta.Icon;
                  return (
                    <div
                      key={a.id}
                      className={cn("rounded-lg border p-4", meta.accentClass)}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className={cn("mt-0.5", meta.iconClass)}>
                            <Icon className="h-5 w-5" />
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <div className="font-medium text-foreground">
                                {a.parley_name}
                              </div>
                              <Badge
                                variant={meta.badgeVariant}
                                className={meta.badgeClassName}
                              >
                                {meta.label}
                              </Badge>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline">{a.line}</Badge>
                              <Badge variant="outline">{a.momio}</Badge>
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(a.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })()
              )}
            </div>
          )}

          {!loading && achievements.length >= dailyLimit && (
            <p className="text-xs text-muted-foreground">
              Si hoy se agregan más logros, puede que no los veas por tu límite
              diario.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
