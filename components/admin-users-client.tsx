"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type MembershipTier = "FREE" | "PRO";
type MembershipDuration = "1M" | "2M" | "3M" | "1Y" | "LIFETIME";

type AdminUserRow = {
  id: string;
  email: string | null;
  name: string | null;
  membershipTier: MembershipTier;
  membershipDuration: MembershipDuration | null;
  membershipExpiresAt: string | null;
  updatedAt?: string | null;
};

const DURATION_LABELS: Record<MembershipDuration, string> = {
  "1M": "1 mes",
  "2M": "2 meses",
  "3M": "3 meses",
  "1Y": "1 año",
  LIFETIME: "Lifetime",
};

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: "include",
    cache: "no-store",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }

  return (await res.json()) as T;
}

export function AdminUsersClient() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [durationsByUser, setDurationsByUser] = useState<
    Record<string, MembershipDuration | null>
  >({});

  const [pendingByUser, setPendingByUser] = useState<
    Record<
      string,
      { tier: MembershipTier; duration: MembershipDuration | null }
    >
  >({});

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);

    apiJson<{ users: AdminUserRow[] }>("/api/admin/users")
      .then((data) => {
        if (!alive) return;
        setUsers(data.users);

        // Inicializamos el selector desde el valor de DB.
        const nextDurations: Record<string, MembershipDuration | null> = {};
        const nextPending: Record<
          string,
          { tier: MembershipTier; duration: MembershipDuration | null }
        > = {};
        for (const u of data.users) {
          nextDurations[u.id] =
            u.membershipTier === "PRO" ? u.membershipDuration ?? null : null;
          nextPending[u.id] = {
            tier: u.membershipTier,
            duration:
              u.membershipTier === "PRO" ? u.membershipDuration ?? null : null,
          };
        }
        setDurationsByUser(nextDurations);
        setPendingByUser(nextPending);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Error al cargar usuarios");
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  const counts = useMemo(() => {
    const free = users.filter((u) => u.membershipTier === "FREE").length;
    const pro = users.filter((u) => u.membershipTier === "PRO").length;
    return { free, pro };
  }, [users]);

  const patchMembership = async (
    userId: string,
    payload:
      | { membershipTier: "FREE" }
      | { membershipTier: "PRO"; duration: MembershipDuration }
  ) => {
    const snapshot = users;
    setError(null);

    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== userId) return u;
        if (payload.membershipTier === "FREE") {
          return {
            ...u,
            membershipTier: "FREE",
            membershipDuration: null,
            membershipExpiresAt: null,
          };
        }
        return {
          ...u,
          membershipTier: "PRO",
          membershipDuration: payload.duration,
        };
      })
    );

    try {
      await apiJson<{ ok: true }>("/api/admin/users", {
        method: "PATCH",
        body: JSON.stringify({
          userId,
          membershipTier: payload.membershipTier,
          duration:
            payload.membershipTier === "PRO" ? payload.duration : undefined,
        }),
      });

      // Recargar para traer membership_expires_at real (y mantener consistencia).
      const { users: nextUsers } = await apiJson<{ users: AdminUserRow[] }>(
        "/api/admin/users"
      );
      setUsers(nextUsers);

      setDurationsByUser((prev) => {
        const nextMap: Record<string, MembershipDuration | null> = { ...prev };
        for (const u of nextUsers) {
          nextMap[u.id] =
            u.membershipTier === "PRO"
              ? u.membershipDuration ?? nextMap[u.id] ?? null
              : null;
        }
        return nextMap;
      });

      setPendingByUser((prev) => {
        const next = { ...prev };
        for (const u of nextUsers) {
          next[u.id] = {
            tier: u.membershipTier,
            duration:
              u.membershipTier === "PRO" ? u.membershipDuration ?? null : null,
          };
        }
        return next;
      });
    } catch (e) {
      setUsers(snapshot);
      setError(e instanceof Error ? e.message : "No se pudo actualizar");
    }
  };

  const daysLeft = (u: AdminUserRow): string => {
    if (u.membershipTier !== "PRO") return "-";
    if (u.membershipDuration === "LIFETIME" || !u.membershipExpiresAt)
      return "∞";
    const end = new Date(u.membershipExpiresAt).getTime();
    const now = Date.now();
    const diff = end - now;
    const d = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    return `${d}`;
  };

  const isPendingDifferent = (u: AdminUserRow) => {
    const p = pendingByUser[u.id];
    if (!p) return false;
    const curDur =
      u.membershipTier === "PRO" ? u.membershipDuration ?? null : null;
    return (
      p.tier !== u.membershipTier || (p.tier === "PRO" && p.duration !== curDur)
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Usuarios</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="text-sm text-muted-foreground">
            {loading
              ? "Cargando…"
              : `Total: ${users.length} · FREE: ${counts.free} · PRO: ${counts.pro}`}
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>UID</TableHead>
                  <TableHead className="w-40">Membresía</TableHead>
                  <TableHead className="w-40">Duración</TableHead>
                  <TableHead className="w-40">Vence</TableHead>
                  <TableHead className="w-28">Días</TableHead>
                  <TableHead className="w-40">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) =>
                  (() => {
                    const pending = pendingByUser[u.id] ?? {
                      tier: u.membershipTier,
                      duration:
                        u.membershipTier === "PRO"
                          ? u.membershipDuration ?? null
                          : null,
                    };

                    const pendingIsValid =
                      pending.tier === "FREE" ||
                      (pending.tier === "PRO" && pending.duration !== null);

                    return (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">
                          {u.email ?? "(sin email)"}
                        </TableCell>
                        <TableCell>{u.name ?? ""}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {u.id}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={pending.tier}
                            onValueChange={(v) => {
                              const nextTier = v as MembershipTier;
                              setPendingByUser((prev) => ({
                                ...prev,
                                [u.id]: {
                                  tier: nextTier,
                                  duration:
                                    nextTier === "PRO"
                                      ? durationsByUser[u.id] ?? null
                                      : null,
                                },
                              }));
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="FREE">FREE</SelectItem>
                              <SelectItem value="PRO">PRO</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={
                              pending.tier === "PRO"
                                ? ((pending.duration ?? "") as string)
                                : ""
                            }
                            onValueChange={(v) => {
                              const dur = v as MembershipDuration;
                              setDurationsByUser((prev) => ({
                                ...prev,
                                [u.id]: dur,
                              }));
                              setPendingByUser((prev) => ({
                                ...prev,
                                [u.id]: { tier: "PRO", duration: dur },
                              }));
                            }}
                            disabled={pending.tier !== "PRO"}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona…" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1M">
                                {DURATION_LABELS["1M"]}
                              </SelectItem>
                              <SelectItem value="2M">
                                {DURATION_LABELS["2M"]}
                              </SelectItem>
                              <SelectItem value="3M">
                                {DURATION_LABELS["3M"]}
                              </SelectItem>
                              <SelectItem value="1Y">
                                {DURATION_LABELS["1Y"]}
                              </SelectItem>
                              <SelectItem value="LIFETIME">
                                {DURATION_LABELS.LIFETIME}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {u.membershipTier === "PRO" && u.membershipExpiresAt
                            ? new Date(
                                u.membershipExpiresAt
                              ).toLocaleDateString()
                            : u.membershipTier === "PRO"
                            ? "Lifetime"
                            : "-"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {daysLeft(u)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              disabled={
                                !pendingIsValid || !isPendingDifferent(u)
                              }
                              onClick={() => {
                                if (pending.tier === "FREE") {
                                  void patchMembership(u.id, {
                                    membershipTier: "FREE",
                                  });
                                  return;
                                }
                                if (!pending.duration) return;
                                void patchMembership(u.id, {
                                  membershipTier: "PRO",
                                  duration: pending.duration,
                                });
                              }}
                            >
                              Confirmar
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              disabled={u.membershipTier !== "PRO"}
                              onClick={() => {
                                setPendingByUser((prev) => ({
                                  ...prev,
                                  [u.id]: { tier: "FREE", duration: null },
                                }));
                                void patchMembership(u.id, {
                                  membershipTier: "FREE",
                                });
                              }}
                            >
                              Revocar
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })()
                )}

                {!loading && users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">
                      No hay usuarios.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
