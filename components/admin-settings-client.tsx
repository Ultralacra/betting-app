"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { toast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SettingsResponse = {
  settings: {
    freeDailyLimit: number;
    proDailyLimit: number;
    updatedAt: string | null;
  };
};

type PlanSettingsResponse = {
  settings: {
    freeMaxSavedPlans: number;
    proMaxSavedPlans: number | null;
    updatedAt: string | null;
  };
};

function clampInt(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function AdminSettingsClient() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [freeDailyLimit, setFreeDailyLimit] = useState<number>(1);
  const [proDailyLimit, setProDailyLimit] = useState<number>(3);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const [freeMaxSavedPlans, setFreeMaxSavedPlans] = useState<number>(2);
  const [proMaxSavedPlans, setProMaxSavedPlans] = useState<string>("");
  const [plansUpdatedAt, setPlansUpdatedAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [achRes, planRes] = await Promise.all([
        fetch("/api/admin/achievement-settings", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        }),
        fetch("/api/admin/plan-settings", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        }),
      ]);

      if (!achRes.ok) {
        const body = (await achRes.json().catch(() => null)) as any;
        throw new Error(body?.error ?? `HTTP ${achRes.status}`);
      }
      if (!planRes.ok) {
        const body = (await planRes.json().catch(() => null)) as any;
        throw new Error(body?.error ?? `HTTP ${planRes.status}`);
      }

      const ach = (await achRes.json()) as SettingsResponse;
      const plan = (await planRes.json()) as PlanSettingsResponse;

      setFreeDailyLimit(ach.settings.freeDailyLimit);
      setProDailyLimit(ach.settings.proDailyLimit);
      setUpdatedAt(ach.settings.updatedAt);

      setFreeMaxSavedPlans(plan.settings.freeMaxSavedPlans);
      setProMaxSavedPlans(
        plan.settings.proMaxSavedPlans === null
          ? ""
          : String(plan.settings.proMaxSavedPlans)
      );
      setPlansUpdatedAt(plan.settings.updatedAt);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      toast({
        title: "No se pudo cargar la configuración",
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

  const canSave = useMemo(() => {
    return (
      Number.isFinite(freeDailyLimit) &&
      Number.isFinite(proDailyLimit) &&
      Number.isFinite(freeMaxSavedPlans)
    );
  }, [freeDailyLimit, proDailyLimit, freeMaxSavedPlans]);

  const save = useCallback(async () => {
    if (!canSave) return;

    const free = clampInt(Math.trunc(freeDailyLimit), 0, 100);
    const pro = clampInt(Math.trunc(proDailyLimit), 0, 100);

    const freePlans = clampInt(Math.trunc(freeMaxSavedPlans), 0, 1000);
    const proPlans =
      proMaxSavedPlans.trim() === ""
        ? null
        : clampInt(Math.trunc(Number(proMaxSavedPlans)), 0, 1000);

    setSaving(true);
    try {
      const [achRes, planRes] = await Promise.all([
        fetch("/api/admin/achievement-settings", {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ freeDailyLimit: free, proDailyLimit: pro }),
        }),
        fetch("/api/admin/plan-settings", {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            freeMaxSavedPlans: freePlans,
            proMaxSavedPlans: proPlans,
          }),
        }),
      ]);

      if (!achRes.ok) {
        const body = (await achRes.json().catch(() => null)) as any;
        throw new Error(body?.error ?? `HTTP ${achRes.status}`);
      }
      if (!planRes.ok) {
        const body = (await planRes.json().catch(() => null)) as any;
        throw new Error(body?.error ?? `HTTP ${planRes.status}`);
      }

      toast({ title: "Configuración guardada" });
      await load();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      toast({
        title: "No se pudo guardar",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }, [canSave, freeDailyLimit, proDailyLimit, load]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configuración</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Controla cuántos logros diarios ve cada plan.
          </p>

          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="freeDailyLimit">FREE · Logros por día</Label>
                <Input
                  id="freeDailyLimit"
                  type="number"
                  min={0}
                  max={100}
                  value={freeDailyLimit}
                  onChange={(e) => setFreeDailyLimit(Number(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="proDailyLimit">PRO · Logros por día</Label>
                <Input
                  id="proDailyLimit"
                  type="number"
                  min={0}
                  max={100}
                  value={proDailyLimit}
                  onChange={(e) => setProDailyLimit(Number(e.target.value))}
                />
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button disabled={loading || saving || !canSave} onClick={save}>
              Guardar
            </Button>
            <Button variant="outline" disabled={saving} onClick={load}>
              Recargar
            </Button>
          </div>

          {updatedAt && (
            <p className="text-xs text-muted-foreground">
              Última actualización: {new Date(updatedAt).toLocaleString()}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Planes guardados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Controla cuántos planes puede guardar cada plan.
          </p>

          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="freeMaxSavedPlans">
                  FREE · Máximo de planes
                </Label>
                <Input
                  id="freeMaxSavedPlans"
                  type="number"
                  min={0}
                  max={1000}
                  value={freeMaxSavedPlans}
                  onChange={(e) => setFreeMaxSavedPlans(Number(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="proMaxSavedPlans">
                  PRO · Máximo de planes (vacío = ilimitado)
                </Label>
                <Input
                  id="proMaxSavedPlans"
                  type="number"
                  min={0}
                  max={1000}
                  value={proMaxSavedPlans}
                  onChange={(e) => setProMaxSavedPlans(e.target.value)}
                  placeholder="Ilimitado"
                />
              </div>
            </div>
          )}

          {plansUpdatedAt && (
            <p className="text-xs text-muted-foreground">
              Última actualización: {new Date(plansUpdatedAt).toLocaleString()}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
