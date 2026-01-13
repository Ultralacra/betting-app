"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { toast } from "@/hooks/use-toast";

import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  description: string;
  result: "PENDING" | "HIT" | "MISS";
  likesCount: number;
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

  const [expandedDescriptions, setExpandedDescriptions] = useState<
    Record<string, boolean>
  >({});

  const [parleyName, setParleyName] = useState("");
  const [line, setLine] = useState("");
  const [momio, setMomio] = useState("");
  const [description, setDescription] = useState("");
  const [result, setResult] = useState<"PENDING" | "HIT" | "MISS">("PENDING");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editParleyName, setEditParleyName] = useState("");
  const [editLine, setEditLine] = useState("");
  const [editMomio, setEditMomio] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editResult, setEditResult] = useState<"PENDING" | "HIT" | "MISS">(
    "PENDING"
  );

  const [editModalOpen, setEditModalOpen] = useState(false);

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
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "achievement_likes" },
        () => {
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
          description: description.trim(),
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
      setDescription("");
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
  }, [canSubmit, parleyName, line, momio, description, result, load]);

  const startEdit = useCallback((row: AchievementRow) => {
    setEditingId(row.id);
    setEditParleyName(row.parleyName);
    setEditLine(row.line);
    setEditMomio(row.momio);
    setEditDescription(row.description ?? "");
    setEditResult(row.result);
    setEditModalOpen(true);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditParleyName("");
    setEditLine("");
    setEditMomio("");
    setEditDescription("");
    setEditResult("PENDING");
    setEditModalOpen(false);
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
          description: editDescription.trim(),
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
    editDescription,
    editResult,
    load,
    cancelEdit,
  ]);

  const updateStatus = useCallback(
    async (id: string, newStatus: "PENDING" | "HIT" | "MISS") => {
      // Feedback inmediato (optimista o loading)
      toast({ title: "Actualizando estado..." });
      try {
        const res = await fetch("/api/admin/achievements", {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id,
            result: newStatus,
          }),
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        toast({ title: "Estado actualizado correctamente" });
        await load();
      } catch (e) {
        toast({
          title: "Error al actualizar",
          description: String(e),
          variant: "destructive",
        });
      }
    },
    [load]
  );

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

  const toggleDescription = useCallback((id: string) => {
    setExpandedDescriptions((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Logros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-6">
            <Input
              value={parleyName}
              onChange={(e) => setParleyName(e.target.value)}
              placeholder="Nombre del parley"
              className="md:col-span-2"
            />
            <Input
              value={line}
              onChange={(e) => setLine(e.target.value)}
              placeholder="Línea"
              className="md:col-span-2"
            />
            <Input
              value={momio}
              onChange={(e) => setMomio(e.target.value)}
              placeholder="Momio (ej: -110, +120)"
              className="md:col-span-1"
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

            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción (opcional)"
              className="md:col-span-6"
            />

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
                    <TableHead className="w-auto min-w-[120px]">Parley</TableHead>
                    <TableHead className="w-auto">Línea</TableHead>
                    <TableHead className="w-auto">Momio</TableHead>
                    <TableHead className="w-full min-w-[200px]">Descripción</TableHead>
                    <TableHead className="w-20 text-center">Likes</TableHead>
                    <TableHead className="w-[140px]">Estado</TableHead>
                    <TableHead className="w-[140px]">Creado</TableHead>
                    <TableHead className="w-[140px] text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => {
                    const desc = r.description?.trim() ?? "";
                    const isExpanded = Boolean(expandedDescriptions[r.id]);
                    const isLong = desc.length >= 140 || desc.includes("\n");

                    return (
                      <TableRow key={r.id}>
                        <TableCell className="align-top">
                          <div className="font-medium wrap-break-word">
                            {r.parleyName}
                          </div>
                        </TableCell>

                        <TableCell className="align-top">
                          <div className="text-sm text-muted-foreground wrap-break-word">
                            {r.line}
                          </div>
                        </TableCell>

                        <TableCell className="align-top">
                          <Badge variant="outline">{r.momio}</Badge>
                        </TableCell>

                        <TableCell className="align-top">
                          {desc ? (
                            <div className="space-y-1">
                              <div
                                className={cn(
                                  "text-sm text-muted-foreground max-w-130 wrap-break-word whitespace-pre-wrap",
                                  isLong && !isExpanded
                                    ? "max-h-16 overflow-hidden"
                                    : "max-h-none"
                                )}
                              >
                                {desc}
                              </div>
                              {isLong ? (
                                <Button
                                  type="button"
                                  variant="link"
                                  size="sm"
                                  className="h-auto p-0 text-xs"
                                  onClick={() => toggleDescription(r.id)}
                                >
                                  {isExpanded ? "Ver menos" : "Ver más"}
                                </Button>
                              ) : null}
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground">—</div>
                          )}
                        </TableCell>

                        <TableCell className="align-top text-center">
                          <Badge variant="outline">{r.likesCount ?? 0}</Badge>
                        </TableCell>

                        <TableCell className="align-top">
                          <Select
                            value={r.result}
                            onValueChange={(val) =>
                              updateStatus(r.id, val as "PENDING" | "HIT" | "MISS")
                            }
                          >
                            <SelectTrigger
                              className={cn(
                                "h-8 w-[130px]",
                                r.result === "HIT" &&
                                  "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
                                r.result === "MISS" &&
                                  "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
                                r.result === "PENDING" && "text-muted-foreground"
                              )}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PENDING">Pendiente</SelectItem>
                              <SelectItem value="HIT">Pegó</SelectItem>
                              <SelectItem value="MISS">No pegó</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>

                        <TableCell className="align-top text-sm text-muted-foreground">
                          {new Date(r.createdAt).toLocaleString()}
                        </TableCell>

                        <TableCell className="align-top">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={saving}
                              onClick={() => startEdit(r)}
                            >
                              Ver / Editar
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={saving}
                              onClick={() => deleteRow(r.id)}
                            >
                              Eliminar
                            </Button>
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

      <Dialog open={editModalOpen} onOpenChange={(open) => !open && cancelEdit()}>
        <DialogContent className="sm:max-w-180">
          <DialogHeader>
            <DialogTitle>Detalle del logro</DialogTitle>
            <DialogDescription>
              Ajusta la info aquí para mantener la tabla limpia.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Parley</div>
                <Input
                  value={editParleyName}
                  onChange={(e) => setEditParleyName(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Estado</div>
                <Select value={editResult} onValueChange={(v) => setEditResult(v as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">Pendiente</SelectItem>
                    <SelectItem value="HIT">Pegó</SelectItem>
                    <SelectItem value="MISS">No pegó</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Línea</div>
                <Input value={editLine} onChange={(e) => setEditLine(e.target.value)} />
              </div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Momio</div>
                <Input value={editMomio} onChange={(e) => setEditMomio(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Descripción</div>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Descripción (opcional)"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" disabled={saving} onClick={cancelEdit}>
              Cancelar
            </Button>
            <Button disabled={saving} onClick={saveEdit}>
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
