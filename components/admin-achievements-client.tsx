"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { toast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AchievementRow = {
  id: string;
  parleyName: string;
  line: string;
  momio: string;
  result: "PENDING" | "HIT" | "MISS";
  createdAt: string;
  updatedAt: string;
};

type AdminAchievementsResponse = {
  achievements: AchievementRow[];
};

export function AdminAchievementsClient() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<AchievementRow[]>([]);

  const [parleyName, setParleyName] = useState("");
  const [line, setLine] = useState("");
  const [momio, setMomio] = useState("");
  const [result, setResult] = useState<"PENDING" | "HIT" | "MISS">("PENDING");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editParleyName, setEditParleyName] = useState("");
  const [editLine, setEditLine] = useState("");
  const [editMomio, setEditMomio] = useState("");
  const [editResult, setEditResult] = useState<"PENDING" | "HIT" | "MISS">(
    "PENDING"
  );

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/achievements", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as any;
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }

      const data = (await res.json()) as AdminAchievementsResponse;
      setRows(data.achievements ?? []);
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
      .channel("admin-achievements")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "achievements" },
        () => {
          toast({ title: "Nuevo logro agregado" });
          void load();
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "achievements" },
        () => {
          toast({ title: "Logro actualizado" });
          void load();
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "achievements" },
        () => {
          toast({ title: "Logro eliminado" });
          void load();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, load]);

  const canSubmit = useMemo(() => {
    return (
      parleyName.trim().length > 0 &&
      line.trim().length > 0 &&
      momio.trim().length > 0
    );
  }, [parleyName, line, momio]);

  const createAchievement = useCallback(async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/achievements", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parleyName: parleyName.trim(),
          line: line.trim(),
          momio: momio.trim(),
          result,
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as any;
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }

      setParleyName("");
      setLine("");
      setMomio("");
      setResult("PENDING");
      toast({ title: "Logro creado" });
      await load();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      toast({
        title: "Error al crear logro",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }, [canSubmit, parleyName, line, momio, result, load]);

  const startEdit = useCallback((row: AchievementRow) => {
    setEditingId(row.id);
    setEditParleyName(row.parleyName);
    setEditLine(row.line);
    setEditMomio(row.momio);
    setEditResult(row.result);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditParleyName("");
    setEditLine("");
    setEditMomio("");
    setEditResult("PENDING");
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editingId) return;
    if (!editParleyName.trim() || !editLine.trim() || !editMomio.trim()) {
      toast({
        title: "Completa nombre, línea y momio",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/achievements", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId,
          parleyName: editParleyName.trim(),
          line: editLine.trim(),
          momio: editMomio.trim(),
          result: editResult,
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as any;
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }

      toast({ title: "Logro actualizado" });
      cancelEdit();
      await load();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      toast({
        title: "Error al editar logro",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }, [
    editingId,
    editParleyName,
    editLine,
    editMomio,
    editResult,
    load,
    cancelEdit,
  ]);

  const deleteRow = useCallback(
    async (id: string) => {
      if (!confirm("¿Eliminar este logro?")) return;
      setSaving(true);
      try {
        const res = await fetch("/api/admin/achievements", {
          method: "DELETE",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });

        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as any;
          throw new Error(body?.error ?? `HTTP ${res.status}`);
        }

        toast({ title: "Logro eliminado" });
        await load();
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        toast({
          title: "Error al eliminar",
          description: message,
          variant: "destructive",
        });
      } finally {
        setSaving(false);
      }
    },
    [load]
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Logros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <Input
              value={parleyName}
              onChange={(e) => setParleyName(e.target.value)}
              placeholder="Nombre del parley"
            />
            <Input
              value={line}
              onChange={(e) => setLine(e.target.value)}
              placeholder="Línea"
            />
            <Input
              value={momio}
              onChange={(e) => setMomio(e.target.value)}
              placeholder="Momio (ej: -110, +120)"
            />
            <Select value={result} onValueChange={(v) => setResult(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PENDING">Pendiente</SelectItem>
                <SelectItem value="HIT">Pegó</SelectItem>
                <SelectItem value="MISS">No pegó</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                disabled={!canSubmit || saving}
                onClick={createAchievement}
              >
                Crear
              </Button>
              <Button variant="outline" disabled={saving} onClick={load}>
                Recargar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Logros existentes</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin logros aún.</p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[320px]">Parley</TableHead>
                    <TableHead>Detalle</TableHead>
                    <TableHead className="w-40">Estado</TableHead>
                    <TableHead className="w-52">Creado</TableHead>
                    <TableHead className="w-56 text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => {
                    const editing = editingId === r.id;
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="align-top">
                          {editing ? (
                            <Input
                              value={editParleyName}
                              onChange={(e) =>
                                setEditParleyName(e.target.value)
                              }
                            />
                          ) : (
                            <div className="font-medium">{r.parleyName}</div>
                          )}
                        </TableCell>

                        <TableCell className="align-top">
                          {editing ? (
                            <div className="grid gap-2 md:grid-cols-2">
                              <Input
                                value={editLine}
                                onChange={(e) => setEditLine(e.target.value)}
                                placeholder="Línea"
                              />
                              <Input
                                value={editMomio}
                                onChange={(e) => setEditMomio(e.target.value)}
                                placeholder="Momio"
                              />
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground">
                              Línea: {r.line} · Momio: {r.momio}
                            </div>
                          )}
                        </TableCell>

                        <TableCell className="align-top">
                          {editing ? (
                            <Select
                              value={editResult}
                              onValueChange={(v) => setEditResult(v as any)}
                            >
                              <SelectTrigger className="w-36">
                                <SelectValue placeholder="Estado" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="PENDING">
                                  Pendiente
                                </SelectItem>
                                <SelectItem value="HIT">Pegó</SelectItem>
                                <SelectItem value="MISS">No pegó</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge
                              variant={
                                r.result === "HIT"
                                  ? "default"
                                  : r.result === "MISS"
                                  ? "destructive"
                                  : "secondary"
                              }
                            >
                              {r.result === "HIT"
                                ? "Pegó"
                                : r.result === "MISS"
                                ? "No pegó"
                                : "Pendiente"}
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell className="align-top text-sm text-muted-foreground">
                          {new Date(r.createdAt).toLocaleString()}
                        </TableCell>

                        <TableCell className="align-top">
                          <div className="flex justify-end gap-2">
                            {editing ? (
                              <>
                                <Button
                                  size="sm"
                                  disabled={saving}
                                  onClick={saveEdit}
                                >
                                  Guardar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={saving}
                                  onClick={cancelEdit}
                                >
                                  Cancelar
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={saving}
                                  onClick={() => startEdit(r)}
                                >
                                  Editar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  disabled={saving}
                                  onClick={() => deleteRow(r.id)}
                                >
                                  Eliminar
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
