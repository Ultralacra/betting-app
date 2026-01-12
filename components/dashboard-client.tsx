"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TrendingUp, Moon, Sun, LogOut, User as UserIcon, ChevronDown, Calculator, Zap, GitCompare, Wrench } from "lucide-react";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { BettingForm } from "@/components/betting-form";
import { BettingPlan } from "@/components/betting-plan";
import { BettingChart } from "@/components/betting-chart";
import { BettingAnalytics } from "@/components/betting-analytics";
import { BettingHistory } from "@/components/betting-history";
import { PlanManager } from "@/components/plan-manager";
import { QuickCalculator } from "@/components/quick-calculator";
import { Achievements } from "@/components/achievements";
import { DailySummary } from "@/components/daily-summary";

// New components
import { StatsCards } from "@/components/dashboard/StatsCards";
import { StreakIndicator } from "@/components/dashboard/StreakIndicator";
import { GoalsWidget } from "@/components/dashboard/GoalsWidget";
import { BankrollAlert } from "@/components/dashboard/BankrollAlert";
import { BottomNav } from "@/components/dashboard/BottomNav";
import { ParlayCalculator } from "@/components/parlay-calculator";
import { PlanComparison } from "@/components/plan-comparison";
import { SimulationMode } from "@/components/simulation-mode";
import { OddsHistory } from "@/components/odds-history";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { BettingConfig, DayResult } from "@/lib/betting-types";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  addSavedPlan,
  loadSavedPlans,
  makeId,
  subscribeSavedPlansChanged,
  type SavedPlan,
} from "@/lib/plans/saved-plans";

type MembershipTier = "FREE" | "PRO";
type MembershipDuration = "1M" | "2M" | "3M" | "1Y" | "LIFETIME";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type UserSummary = {
  id: string;
  email: string | null;
  name: string | null;
  membershipTier: MembershipTier;
  membershipDuration?: MembershipDuration | null;
  membershipExpiresAt: Date | null;
} | null;

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

function formatMembershipMessage(u: UserSummary): {
  title: string;
  description: string;
} {
  if (!u) return { title: "Membresía", description: "" };

  if (u.membershipTier !== "PRO") {
    return {
      title: "Membresía actualizada",
      description: "Tu plan ahora es FREE.",
    };
  }

  const durLabel = membershipDurationLabel(u.membershipDuration ?? null);
  if (
    u.membershipDuration === "LIFETIME" ||
    (!u.membershipExpiresAt && durLabel)
  ) {
    return {
      title: "¡Membresía PRO activada!",
      description: `Tu plan es PRO (${durLabel}).`,
    };
  }

  return {
    title: "¡Membresía PRO activada!",
    description: `Tu plan es PRO${durLabel ? ` (${durLabel})` : ""}${
      u.membershipExpiresAt
        ? ` y vence el ${u.membershipExpiresAt.toLocaleDateString()}.`
        : "."
    }`,
  };
}

type MembershipPerks = {
  dailyAchievementsLimit: number | null;
  maxSavedPlans: number | null;
};

function buildMembershipDescription(
  tier: "FREE" | "PRO",
  perks: MembershipPerks
): string {
  const lines: string[] = [];

  if (tier === "PRO") {
    lines.push("Ahora tu plan incluye:");
    if (typeof perks.dailyAchievementsLimit === "number") {
      lines.push(`• ${perks.dailyAchievementsLimit} logros diarios`);
    }
    lines.push("• Logros sorpresa");
    if (perks.maxSavedPlans === null) {
      lines.push("• Planes ilimitados");
    } else if (typeof perks.maxSavedPlans === "number") {
      lines.push(`• Hasta ${perks.maxSavedPlans} planes guardados`);
    }
    return lines.join("\n");
  }

  // FREE
  lines.push("Tu plan ahora es FREE. Incluye:");
  if (typeof perks.dailyAchievementsLimit === "number") {
    lines.push(`• ${perks.dailyAchievementsLimit} logro(s) diarios`);
  }
  if (typeof perks.maxSavedPlans === "number") {
    lines.push(`• Hasta ${perks.maxSavedPlans} planes guardados`);
  }
  return lines.join("\n");
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

type SavedPlanDTO = {
  id: string;
  name: string;
  configJson: string;
  planJson: string;
  savedAt: Date;
};

type BettingDataDTO = {
  configJson: string | null;
  planJson: string | null;
  currentBalance: number | null;
  theme: string | null;
};

type PlanModalMode = "first" | "new" | "edit";

type ActiveSavedPlanMeta = {
  id: string;
  name: string;
  savedAt: string;
};

interface Props {
  user: UserSummary;
  initialBettingData: BettingDataDTO;
  initialSavedPlans: SavedPlanDTO[];
}

function generatePlan(
  config: BettingConfig,
  startBalance: number
): DayResult[] {
  const plan: DayResult[] = [];
  let currentBalance = startBalance;
  const startDate = new Date(config.startDate);
  const endDate = new Date(config.endDate);

  const daysDiff =
    Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;

  for (let day = 1; day <= daysDiff; day++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + (day - 1));

    const bets = Array.from({ length: config.betsPerDay }, (_, i) => {
      const stake = (currentBalance * config.stakePercentage) / 100;
      const potentialWin = stake * config.odds;

      return {
        id: `${day}-${i}`,
        stakePercentage: config.stakePercentage,
        stake,
        odds: config.odds,
        potentialWin,
        result: null,
      };
    });

    const totalStake = bets.reduce((sum, b) => sum + b.stake, 0);
    const totalPotentialWin = bets.reduce((sum, b) => sum + b.potentialWin, 0);
    const totalProfit = totalPotentialWin - totalStake;
    const balanceAfterDay =
      currentBalance + (totalProfit * config.reinvestmentPercentage) / 100;

    plan.push({
      day,
      date: currentDate.toISOString().split("T")[0],
      bets,
      currentBalance,
      totalStake,
      totalPotentialWin,
      balanceAfterDay,
      result: null,
    });

    currentBalance = balanceAfterDay;
  }

  return plan;
}

function makeBetId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto)
    return crypto.randomUUID();
  return String(Date.now());
}

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const { headers, ...restInit } = init ?? {};
  const res = await fetch(url, {
    credentials: "include",
    ...restInit,
    headers: {
      "Content-Type": "application/json",
      ...(headers ?? {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }

  return (await res.json()) as T;
}

export function DashboardClient({
  user,
  initialBettingData,
  initialSavedPlans,
}: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [userSummary, setUserSummary] = useState(user);

  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [pwaBusy, setPwaBusy] = useState(false);

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
    setUserSummary(user);
  }, [user]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    };
  }, []);

  const ensureServiceWorker = useCallback(async () => {
    if (typeof window === "undefined") return null;
    if (!("serviceWorker" in navigator)) return null;
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      return reg;
    } catch {
      return null;
    }
  }, []);

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const installAndEnableNotifications = useCallback(async () => {
    if (pwaBusy) return;
    setPwaBusy(true);
    try {
      const reg = await ensureServiceWorker();
      if (!reg) {
        toast({
          variant: "destructive",
          title: "No compatible",
          description: "Este navegador no soporta Service Worker (PWA).",
        });
        return;
      }

      // 1) Prompt de instalación (si está disponible)
      if (installPrompt) {
        await installPrompt.prompt();
        await installPrompt.userChoice.catch(() => null);
        setInstallPrompt(null);
      }

      // 2) Notificaciones
      if (!("Notification" in window)) {
        toast({
          variant: "destructive",
          title: "No compatible",
          description: "Este navegador no soporta notificaciones.",
        });
        return;
      }

      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        toast({
          variant: "destructive",
          title: "Permiso denegado",
          description: "No se pudieron activar las notificaciones.",
        });
        return;
      }

      // 3) Suscripción Push
      const keyRes = await fetch("/api/push/vapid-public-key", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      if (!keyRes.ok) {
        const body = (await keyRes.json().catch(() => null)) as any;
        throw new Error(body?.details ?? "No se pudo obtener la llave VAPID");
      }

      const keyJson = (await keyRes.json()) as { publicKey: string };
      const existing = await reg.pushManager.getSubscription();
      const subscription =
        existing ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(keyJson.publicKey),
        }));

      const subRes = await fetch("/api/push/subscribe", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription }),
      });

      if (!subRes.ok) {
        const body = (await subRes.json().catch(() => null)) as any;
        throw new Error(body?.error ?? "No se pudo guardar la suscripción");
      }

      toast({
        title: "Listo",
        description: "App instalada y notificaciones activadas.",
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "No se pudo completar";
      toast({
        variant: "destructive",
        title: "Error",
        description: msg,
      });
    } finally {
      setPwaBusy(false);
    }
  }, [ensureServiceWorker, installPrompt, pwaBusy]);

  useEffect(() => {
    if (!userSummary?.id) return;

    const seenKey = `bt.membership.seenUpdatedAt:${userSummary.id}`;

    const onMembershipChange = (payload: any) => {
      const next = payload.new as {
        membership_tier?: "FREE" | "PRO";
        membership_expires_at?: string | null;
        membership_duration?: MembershipDuration | null;
        updated_at?: string;
      };

      const updatedAt = next.updated_at ?? null;
      const lastSeen =
        typeof window !== "undefined" ? localStorage.getItem(seenKey) : null;

      // Actualizamos estado visible (badge) siempre.
      setUserSummary((prev) => {
        if (!prev) return prev;
        const merged = {
          ...prev,
          membershipTier: next.membership_tier ?? prev.membershipTier,
          membershipDuration:
            next.membership_duration === undefined
              ? prev.membershipDuration
              : next.membership_duration,
          membershipExpiresAt: next.membership_expires_at
            ? new Date(next.membership_expires_at)
            : null,
        };

        // Disparar modal solo una vez por cambio (updated_at).
        if (updatedAt && updatedAt !== lastSeen) {
          setMembershipModalText(formatMembershipMessage(merged));
          const from = new Date(updatedAt);
          const lifetime =
            merged.membershipDuration === "LIFETIME" ||
            !merged.membershipExpiresAt;
          setMembershipModalRange({
            from,
            to: merged.membershipExpiresAt,
            lifetime,
          });
          setMembershipModalOpen(true);
          try {
            localStorage.setItem(seenKey, updatedAt);
          } catch {
            // ignore
          }
        }

        return merged;
      });
    };

    const channel = supabase
      .channel(`app_users:${userSummary.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "app_users",
          filter: `user_id=eq.${userSummary.id}`,
        },
        onMembershipChange
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "app_users",
          filter: `user_id=eq.${userSummary.id}`,
        },
        onMembershipChange
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, userSummary?.id]);

  useEffect(() => {
    if (!membershipModalOpen) return;
    if (!userSummary) return;

    let cancelled = false;
    const tier = userSummary.membershipTier;

    const loadPerks = async () => {
      try {
        const [achRes, planRes] = await Promise.all([
          fetch("/api/achievements", {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          }),
          fetch("/api/plan-limits", {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          }),
        ]);

        const achJson = achRes.ok
          ? ((await achRes.json()) as { dailyLimit?: number })
          : null;

        const planJson = planRes.ok
          ? ((await planRes.json()) as { maxSavedPlans?: number | null })
          : null;

        const perks: MembershipPerks = {
          dailyAchievementsLimit:
            typeof achJson?.dailyLimit === "number" ? achJson.dailyLimit : null,
          maxSavedPlans:
            planJson?.maxSavedPlans === undefined
              ? null
              : planJson.maxSavedPlans,
        };

        if (cancelled) return;
        setMembershipModalText((prev) => {
          const title =
            prev?.title ?? formatMembershipMessage(userSummary).title;
          return {
            title,
            description: buildMembershipDescription(tier, perks),
          };
        });
      } catch {
        // ignore
      }
    };

    void loadPerks();
    return () => {
      cancelled = true;
    };
  }, [membershipModalOpen, userSummary]);

  const membershipBadge = useMemo(() => {
    const tier = userSummary?.membershipTier ?? "FREE";
    if (tier !== "PRO") {
      return {
        variant: "secondary" as const,
        className: "",
        text: "Plan: FREE",
      };
    }

    const dur = userSummary?.membershipDuration ?? null;
    const label = membershipDurationLabel(dur);

    // Importante: usamos solo tokens existentes (primary/accent), sin colores hardcode.
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
  }, [userSummary?.membershipDuration, userSummary?.membershipTier]);

  const headerDaysLeft = useMemo(() => {
    if (!userSummary) return null;
    if (userSummary.membershipTier !== "PRO") return null;
    return daysLeftLabel(
      userSummary.membershipExpiresAt,
      userSummary.membershipDuration ?? null
    );
  }, [userSummary]);

  const initialConfig = useMemo(() => {
    if (!initialBettingData.configJson) return null;
    try {
      return JSON.parse(initialBettingData.configJson) as BettingConfig;
    } catch {
      return null;
    }
  }, [initialBettingData.configJson]);

  const initialPlan = useMemo(() => {
    if (!initialBettingData.planJson) return [];
    try {
      return JSON.parse(initialBettingData.planJson) as DayResult[];
    } catch {
      return [];
    }
  }, [initialBettingData.planJson]);

  const [config, setConfig] = useState<BettingConfig | null>(initialConfig);
  const [plan, setPlan] = useState<DayResult[]>(initialPlan);
  const [currentBalance, setCurrentBalance] = useState<number>(
    initialBettingData.currentBalance ?? initialConfig?.initialBudget ?? 0
  );
  const { theme, setTheme, resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === "dark";

  useEffect(() => {
    if (initialBettingData.theme === "dark" || initialBettingData.theme === "light") {
        setTheme(initialBettingData.theme);
    }
  }, []);

  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>([]);
  const [savedPlansLoaded, setSavedPlansLoaded] = useState(false);
  const [activeSavedPlan, setActiveSavedPlan] =
    useState<ActiveSavedPlanMeta | null>(null);
  const activeSavedPlanRef = useRef<ActiveSavedPlanMeta | null>(null);
  useEffect(() => {
    activeSavedPlanRef.current = activeSavedPlan;
  }, [activeSavedPlan]);
  const savedPlansCount = savedPlans.length;
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [planModalMode, setPlanModalMode] = useState<PlanModalMode>("first");
  const [editingPlan, setEditingPlan] = useState<SavedPlan | null>(null);
  const [firstPlanName, setFirstPlanName] = useState("Mi primer plan");

  const [planLimitModalOpen, setPlanLimitModalOpen] = useState(false);
  const [planLimitModalText, setPlanLimitModalText] = useState<{
    title: string;
    description: string;
  } | null>(null);

  const showPlanLimitModalFromError = (e: unknown) => {
    const message = e instanceof Error ? e.message : String(e);
    try {
      const parsed = JSON.parse(message) as {
        error?: string;
        details?: string;
      };
      if (parsed?.error === "plan_limit_reached") {
        setPlanLimitModalText({
          title: "Límite de planes",
          description:
            parsed.details ??
            "Tu plan alcanzó el máximo de planes guardados según la configuración.",
        });
        setPlanLimitModalOpen(true);
        return true;
      }
    } catch {
      // ignore
    }
    return false;
  };

  // Theme managed globally

  useEffect(() => {
    let isMounted = true;
    const refresh = async () => {
      try {
        const plans = await loadSavedPlans();
        if (!isMounted) return;
        setSavedPlans(plans);
        setSavedPlansLoaded(true);
      } catch {
        if (!isMounted) return;
        setSavedPlansLoaded(true);
      }
    };

    void refresh();
    const unsub = subscribeSavedPlansChanged(() => {
      void refresh();
    });

    return () => {
      isMounted = false;
      unsub();
    };
  }, []);

  useEffect(() => {
    if (!savedPlansLoaded) return;
    if (savedPlansCount === 0) {
      setPlanModalMode("first");
      setEditingPlan(null);
      setPlanModalOpen(true);
    } else {
      // Si ya hay planes, el modal solo abre por acción explícita (Nuevo plan / Editar).
      if (planModalMode === "first") setPlanModalOpen(false);
    }
  }, [savedPlansCount, savedPlansLoaded]);

  useEffect(() => {
    if (!savedPlansLoaded) return;
    // Si hay exactamente 1 plan guardado y no hay plan actual cargado, lo cargamos automáticamente.
    if (savedPlansCount !== 1) return;
    if (config && plan.length > 0) return;

    const only = savedPlans[0];
    if (!only) return;
    void handleLoadPlan(only.config, only.plan, {
      id: only.id,
      name: only.name,
      savedAt: only.savedAt,
    });
  }, [savedPlans, savedPlansCount, savedPlansLoaded, config, plan.length]);

  useEffect(() => {
    if (!savedPlansLoaded) return;
    if (savedPlansCount !== 0) return;
    // Si el usuario eliminó todos los planes guardados, limpiamos el plan actual.
    if (config === null && plan.length === 0 && currentBalance === 0) return;
    (async () => {
      setConfig(null);
      setPlan([]);
      setCurrentBalance(0);
      setActiveSavedPlan(null);
      try {
        await persistBettingDataNow({
          config: null,
          plan: [],
          currentBalance: 0,
          theme: isDarkMode ? "dark" : "light",
        });
      } catch {
        // ignore
      }
    })();
  }, [
    savedPlansCount,
    savedPlansLoaded,
    config,
    plan.length,
    currentBalance,
    isDarkMode,
  ]);

  const saveCurrentPlanToStorage = async (
    name: string,
    cfg: BettingConfig,
    pl: DayResult[]
  ) => {
    const newPlan = {
      id: makeId(),
      name: name.trim() || "Mi primer plan",
      config: cfg,
      plan: pl,
      savedAt: new Date().toISOString(),
    };
    try {
      const updated = await addSavedPlan(newPlan);
      setSavedPlans(updated);
    } catch (e) {
      if (showPlanLimitModalFromError(e)) return;
      const msg = e instanceof Error ? e.message : "No se pudo guardar el plan";
      toast({
        variant: "destructive",
        title: "No se pudo guardar",
        description: msg,
      });
    }
  };

  const openNewPlanModal = () => {
    setEditingPlan(null);
    setPlanModalMode("new");
    setFirstPlanName("Nuevo plan");
    setPlanModalOpen(true);
  };

  const openEditPlanModal = (p: SavedPlan) => {
    setEditingPlan(p);
    setPlanModalMode("edit");
    setFirstPlanName(p.name);
    setPlanModalOpen(true);
  };

  type PersistPayload = {
    config: BettingConfig | null;
    plan: DayResult[];
    currentBalance: number;
    theme: "light" | "dark";
  };

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSaveRef = useRef<PersistPayload | null>(null);
  const saveChainRef = useRef<Promise<void>>(Promise.resolve());

  const persistBettingDataNow = useCallback(async (next: PersistPayload) => {
    await apiJson<{ ok: true }>("/api/betting-data", {
      method: "POST",
      body: JSON.stringify({
        configJson: next.config ? JSON.stringify(next.config) : null,
        planJson: next.plan.length ? JSON.stringify(next.plan) : null,
        currentBalance: next.currentBalance,
        theme: next.theme,
      }),
    });
  }, []);

  const flushPendingSave = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    const payload = pendingSaveRef.current;
    if (!payload) return;
    pendingSaveRef.current = null;

    saveChainRef.current = saveChainRef.current
      .catch(() => {
        // ignore
      })
      .then(() => persistBettingDataNow(payload))
      .catch(() => {
        // ignore
      });
  }, [persistBettingDataNow]);

  const schedulePersistBettingData = useCallback(
    (next: PersistPayload, opts?: { immediate?: boolean }) => {
      pendingSaveRef.current = next;

      if (opts?.immediate) {
        flushPendingSave();
        return;
      }

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        flushPendingSave();
      }, 400);
    },
    [flushPendingSave]
  );

  const savedPlanSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const pendingSavedPlanSaveRef = useRef<{
    config: BettingConfig;
    plan: DayResult[];
  } | null>(null);
  const savedPlanSaveChainRef = useRef<Promise<void>>(Promise.resolve());

  const flushPendingSavedPlanSave = useCallback(() => {
    if (savedPlanSaveTimerRef.current) {
      clearTimeout(savedPlanSaveTimerRef.current);
      savedPlanSaveTimerRef.current = null;
    }

    const payload = pendingSavedPlanSaveRef.current;
    pendingSavedPlanSaveRef.current = null;
    if (!payload) return;

    const meta = activeSavedPlanRef.current;
    if (!meta) return;

    savedPlanSaveChainRef.current = savedPlanSaveChainRef.current
      .catch(() => {
        // ignore
      })
      .then(async () => {
        await addSavedPlan({
          id: meta.id,
          name: meta.name,
          config: payload.config,
          plan: payload.plan,
          savedAt: meta.savedAt,
        });
      })
      .catch(() => {
        // ignore
      });
  }, []);

  const schedulePersistActiveSavedPlan = useCallback(
    (cfg: BettingConfig, pl: DayResult[]) => {
      if (!activeSavedPlanRef.current) return;
      pendingSavedPlanSaveRef.current = { config: cfg, plan: pl };
      if (savedPlanSaveTimerRef.current)
        clearTimeout(savedPlanSaveTimerRef.current);
      savedPlanSaveTimerRef.current = setTimeout(() => {
        flushPendingSavedPlanSave();
      }, 600);
    },
    [flushPendingSavedPlanSave]
  );

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") flushPendingSave();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      flushPendingSave();
    };
  }, [flushPendingSave]);

  const recalcPlanFrom = (
    basePlan: DayResult[],
    fromIndex: number,
    activeConfig: BettingConfig
  ) => {
    const next = basePlan.map((d) => ({
      ...d,
      bets: (d.bets ?? []).map((b) => ({ ...b })),
    }));

    const startBalance =
      fromIndex === 0
        ? next[0].currentBalance
        : next[fromIndex - 1].balanceAfterDay;
    let runningBalance = startBalance;

    for (let i = fromIndex; i < next.length; i++) {
      const day = next[i];
      day.currentBalance = runningBalance;

      day.bets = (day.bets ?? []).map((bet) => {
        const stake = (day.currentBalance * bet.stakePercentage) / 100;
        const odds = bet.odds;
        return {
          ...bet,
          stake,
          odds,
          potentialWin: stake * odds,
        };
      });

      day.totalStake = day.bets.reduce((sum, b) => sum + (b.stake ?? 0), 0);
      day.totalPotentialWin = day.bets.reduce(
        (sum, b) => sum + (b.potentialWin ?? 0),
        0
      );

      const allResolved =
        day.bets.length > 0 &&
        day.bets.every((b) => b.result !== null && b.result !== undefined);
      day.result = allResolved ? "completed" : null;

      if (day.result === "completed") {
        let endBalance = day.currentBalance;
        for (const b of day.bets) {
          if (b.result === "win") {
            const profit = (b.potentialWin ?? 0) - (b.stake ?? 0);
            endBalance += (profit * activeConfig.reinvestmentPercentage) / 100;
          } else if (b.result === "lose") {
            endBalance -= b.stake ?? 0;
          }
        }
        day.balanceAfterDay = endBalance;
      } else {
        const totalProfit = day.totalPotentialWin - day.totalStake;
        day.balanceAfterDay =
          day.currentBalance +
          (totalProfit * activeConfig.reinvestmentPercentage) / 100;
      }

      runningBalance = day.balanceAfterDay;
    }

    return next;
  };

  const syncAfterPlanChange = (
    nextPlan: DayResult[],
    activeConfig: BettingConfig | null
  ) => {
    if (!activeConfig) return;

    const lastCompleted = nextPlan.findLast((d) => d.result === "completed");
    const balance = lastCompleted
      ? lastCompleted.balanceAfterDay
      : activeConfig.initialBudget;
    setCurrentBalance(balance);

    schedulePersistBettingData({
      config: activeConfig,
      plan: nextPlan,
      currentBalance: balance,
      theme: isDarkMode ? "dark" : "light",
    });

    schedulePersistActiveSavedPlan(activeConfig, nextPlan);
  };

  const handleUpdateBet = (
    dayIndex: number,
    betId: string,
    updates: {
      stakePercentage?: number;
      odds?: number;
      result?: "win" | "lose" | null;
    }
  ) => {
    if (!config) return;
    setPlan((prev) => {
      const base = prev.map((d) => ({
        ...d,
        bets: (d.bets ?? []).map((b) => ({ ...b })),
      }));

      const day = base[dayIndex];
      if (!day) return prev;

      day.bets = (day.bets ?? []).map((b) => {
        if (b.id !== betId) return b;
        const nextStakePct = updates.stakePercentage ?? b.stakePercentage;
        const nextOdds = updates.odds ?? b.odds;
        const nextResult =
          updates.result === undefined ? b.result : updates.result;
        const stake = (day.currentBalance * nextStakePct) / 100;
        return {
          ...b,
          stakePercentage: nextStakePct,
          odds: nextOdds,
          stake,
          potentialWin: stake * nextOdds,
          result: nextResult,
        };
      });

      const nextPlan = recalcPlanFrom(base, dayIndex, config);
      syncAfterPlanChange(nextPlan, config);
      return nextPlan;
    });
  };

  const handleAddBet = (dayIndex: number) => {
    if (!config) return;
    setPlan((prev) => {
      const base = prev.map((d) => ({
        ...d,
        bets: (d.bets ?? []).map((b) => ({ ...b })),
      }));
      const day = base[dayIndex];
      if (!day) return prev;

      const currentPerc = (day.bets ?? []).reduce(
        (sum, b) => sum + (b.stakePercentage ?? 0),
        0
      );
      const remaining = Math.max(0, 100 - currentPerc);
      const stakePct = Math.max(
        1,
        Math.min(config.stakePercentage, remaining || config.stakePercentage)
      );

      const stake = (day.currentBalance * stakePct) / 100;
      const odds = config.odds;

      day.bets = [
        ...(day.bets ?? []),
        {
          id: makeBetId(),
          stakePercentage: stakePct,
          stake,
          odds,
          potentialWin: stake * odds,
          result: null,
        },
      ];

      const nextPlan = recalcPlanFrom(base, dayIndex, config);
      syncAfterPlanChange(nextPlan, config);
      return nextPlan;
    });
  };

  const handleRemoveBet = (dayIndex: number, betId: string) => {
    if (!config) return;
    setPlan((prev) => {
      const base = prev.map((d) => ({
        ...d,
        bets: (d.bets ?? []).map((b) => ({ ...b })),
      }));
      const day = base[dayIndex];
      if (!day) return prev;
      day.bets = (day.bets ?? []).filter((b) => b.id !== betId);

      const nextPlan = recalcPlanFrom(base, dayIndex, config);
      syncAfterPlanChange(nextPlan, config);
      return nextPlan;
    });
  };



  const handleConfigSubmit = async (newConfig: BettingConfig) => {
    const generatedPlan = generatePlan(newConfig, newConfig.initialBudget);
    setConfig(newConfig);
    setPlan(generatedPlan);
    setCurrentBalance(newConfig.initialBudget);

    await persistBettingDataNow({
      config: newConfig,
      plan: generatedPlan,
      currentBalance: newConfig.initialBudget,
      theme: isDarkMode ? "dark" : "light",
    });

    // El modal de primer plan se cierra solo cuando exista al menos un plan guardado.
  };

  const handleCompleteFirstPlan = async (newConfig: BettingConfig) => {
    const generatedPlan = generatePlan(newConfig, newConfig.initialBudget);
    setConfig(newConfig);
    setPlan(generatedPlan);
    setCurrentBalance(newConfig.initialBudget);

    await persistBettingDataNow({
      config: newConfig,
      plan: generatedPlan,
      currentBalance: newConfig.initialBudget,
      theme: isDarkMode ? "dark" : "light",
    });

    // Guardar como plan (nuevo o actualización)
    const planId = editingPlan?.id ?? makeId();
    const planName =
      firstPlanName.trim() ||
      (planModalMode === "edit" ? editingPlan?.name ?? "Mi plan" : "Mi plan");
    const savedAt =
      planModalMode === "edit" && editingPlan?.savedAt
        ? editingPlan.savedAt
        : new Date().toISOString();
    try {
      const updated = await addSavedPlan({
        id: planId,
        name: planName,
        config: newConfig,
        plan: generatedPlan,
        savedAt,
      });
      setSavedPlans(updated);
      setEditingPlan(null);
      setActiveSavedPlan({ id: planId, name: planName, savedAt });
      setPlanModalOpen(false);
    } catch (e) {
      if (showPlanLimitModalFromError(e)) return;
      const msg = e instanceof Error ? e.message : "No se pudo guardar el plan";
      toast({
        variant: "destructive",
        title: "No se pudo guardar",
        description: msg,
      });
    }
  };

  const handleReset = async () => {
    setConfig(null);
    setPlan([]);
    setCurrentBalance(0);

    await persistBettingDataNow({
      config: null,
      plan: [],
      currentBalance: 0,
      theme: isDarkMode ? "dark" : "light",
    });

    // Si no hay planes guardados, se forzará el modal automáticamente.
  };

  const handleAddBalance = async (amount: number) => {
    if (!config || amount <= 0) return;

    // Reutilizamos la lógica original simplificada: aumenta balance inicial y regenera plan.
    const newInitialBalance = currentBalance + amount;
    const newConfig = { ...config, initialBudget: newInitialBalance };
    const generatedPlan = generatePlan(newConfig, newInitialBalance);

    setConfig(newConfig);
    setCurrentBalance(newInitialBalance);
    setPlan(generatedPlan);

    await persistBettingDataNow({
      config: newConfig,
      plan: generatedPlan,
      currentBalance: newInitialBalance,
      theme: isDarkMode ? "dark" : "light",
    });
  };

  const handleLoadPlan = async (
    loadedConfig: BettingConfig,
    loadedPlan: DayResult[],
    meta?: ActiveSavedPlanMeta
  ) => {
    setConfig(loadedConfig);
    setPlan(loadedPlan);
    setActiveSavedPlan(meta ?? null);

    const lastCompleted = loadedPlan.findLast((d) => d.result === "completed");
    const balance = lastCompleted
      ? lastCompleted.balanceAfterDay
      : loadedConfig.initialBudget;
    setCurrentBalance(balance);

    await persistBettingDataNow({
      config: loadedConfig,
      plan: loadedPlan,
      currentBalance: balance,
      theme: isDarkMode ? "dark" : "light",
    });
  };

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <TrendingUp className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  BetTracker Pro
                </h1>
                <p className="text-sm text-muted-foreground">
                  Gestión inteligente de apuestas
                </p>
              </div>
            </div>

            <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:justify-end">
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
              <Button
                variant="outline"
                size="sm"
                onClick={installAndEnableNotifications}
                disabled={pwaBusy}
              >
                {pwaBusy ? "Configurando…" : "Instalar app"}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Wrench className="h-4 w-4" />
                    <span className="hidden sm:inline">Herramientas</span>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Utilidades</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <QuickCalculator trigger={
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <Calculator className="mr-2 h-4 w-4" />
                      <span>Calculadora Rápida</span>
                    </DropdownMenuItem>
                  } />
                  <ParlayCalculator trigger={
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <Zap className="mr-2 h-4 w-4 text-yellow-500" />
                      <span>Calculadora Parlays</span>
                    </DropdownMenuItem>
                  } />
                  <PlanComparison plans={savedPlans} trigger={
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <GitCompare className="mr-2 h-4 w-4" />
                      <span>Comparar Planes</span>
                    </DropdownMenuItem>
                  } />
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <UserIcon className="h-4 w-4" />
                    <span className="hidden sm:inline">Cuenta</span>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="cursor-pointer">
                      <UserIcon className="mr-2 h-4 w-4" />
                      <span>Perfil</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Cerrar sesión</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <AlertDialog
          open={planLimitModalOpen}
          onOpenChange={setPlanLimitModalOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {planLimitModalText?.title ?? "Límite"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {planLimitModalText?.description ?? ""}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setPlanLimitModalOpen(false)}>
                Entendido
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog
          open={membershipModalOpen}
          onOpenChange={setMembershipModalOpen}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {membershipModalText?.title ?? "Membresía"}
              </DialogTitle>
              <DialogDescription className="whitespace-pre-line">
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

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1 space-y-6">
            <div className="flex gap-2">
              <Button className="flex-1" onClick={openNewPlanModal}>
                Nuevo plan
              </Button>
            </div>

            <PlanManager
              currentConfig={config}
              currentPlan={plan}
              onLoadPlan={handleLoadPlan}
              onEditPlan={openEditPlanModal}
            />
          </div>

          <div className="lg:col-span-2">
            {config && plan.length > 0 ? (
              <>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="w-full max-w-full justify-start overflow-x-auto scrollbar-hide">
                    <TabsTrigger value="dashboard" className="flex-none">
                      Panel
                    </TabsTrigger>
                    <TabsTrigger value="plan" className="flex-none">
                      Plan
                    </TabsTrigger>
                    <TabsTrigger value="analytics" className="flex-none">
                      Análisis
                    </TabsTrigger>
                    <TabsTrigger value="history" className="flex-none">
                      Historial
                    </TabsTrigger>
                    <TabsTrigger value="achievements" className="flex-none">
                      Logros
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="dashboard" className="space-y-6 mt-6">
                    <BankrollAlert
                      currentBalance={currentBalance}
                      initialBudget={config.initialBudget}
                    />
                    <SimulationMode config={config} plan={plan} />

                    <div className="flex flex-col gap-6">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <DailySummary plan={plan} />
                        <StreakIndicator plan={plan} size="lg" showStats />
                      </div>

                      <StatsCards
                        plan={plan}
                        config={config}
                        currentBalance={currentBalance}
                      />

                      <div className="grid gap-6 md:grid-cols-2">
                        <GoalsWidget
                          currentBalance={currentBalance}
                          initialBudget={config.initialBudget}
                        />
                        <OddsHistory plan={plan} />
                      </div>
                    </div>
                  </TabsContent>

                <TabsContent value="plan" className="space-y-6 mt-6">
                  <BettingPlan
                    plan={plan}
                    config={config}
                    onUpdateBet={handleUpdateBet}
                    onAddBet={handleAddBet}
                    onRemoveBet={handleRemoveBet}
                  />
                  <p className="text-xs text-muted-foreground">
                    Puedes agregar apuestas, editar monto/cuota y marcar W/L.
                  </p>
                </TabsContent>

                <TabsContent value="analytics" className="space-y-6 mt-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <BettingChart
                      plan={plan}
                      initialBudget={config.initialBudget}
                    />
                    <BettingAnalytics
                      plan={plan}
                      initialBudget={config.initialBudget}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="history" className="space-y-6 mt-6">
                  <BettingHistory
                    plan={plan}
                    initialBudget={config.initialBudget}
                  />
                </TabsContent>

                <TabsContent value="achievements" className="space-y-6 mt-6">
                  <Achievements />
                </TabsContent>
                </Tabs>
                <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
              </>
            ) : (
              <div className="rounded-lg border border-border bg-card p-12 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <TrendingUp className="h-8 w-8 text-muted-foreground" />
                </div>
                {savedPlansLoaded && savedPlansCount > 1 ? (
                  <>
                    <h3 className="mt-4 text-lg font-semibold text-card-foreground">
                      Selecciona un plan guardado
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Tienes {savedPlansCount} planes. Elige cuál abrir.
                    </p>

                    <div className="mt-6 grid gap-3 text-left">
                      {savedPlans.map((p) => (
                        <Card key={p.id}>
                          <CardHeader className="py-4">
                            <CardTitle className="text-base">
                              {p.name}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pt-0 pb-4 flex items-center justify-between gap-3">
                            <div className="text-sm text-muted-foreground">
                              ${p.config.initialBudget} • {p.config.startDate} →{" "}
                              {p.config.endDate}
                            </div>
                            <Button
                              size="sm"
                              onClick={() =>
                                void handleLoadPlan(p.config, p.plan, {
                                  id: p.id,
                                  name: p.name,
                                  savedAt: p.savedAt,
                                })
                              }
                            >
                              Abrir
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="mt-4 text-lg font-semibold text-card-foreground">
                      Configura tu plan de apuestas
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {savedPlansLoaded
                        ? "Completa el formulario para generar tu estrategia personalizada"
                        : "Cargando tus planes..."}
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      <Dialog
        open={planModalOpen}
        onOpenChange={(open) => {
          if (!open && savedPlansCount === 0) return;
          setPlanModalOpen(open);
          if (!open) setEditingPlan(null);
        }}
      >
        <DialogContent
          showCloseButton={savedPlansCount !== 0}
          onEscapeKeyDown={(e) => {
            if (savedPlansCount === 0) e.preventDefault();
          }}
          onInteractOutside={(e) => {
            if (savedPlansCount === 0) e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {planModalMode === "edit"
                ? "Editar plan"
                : planModalMode === "new"
                ? "Nuevo plan"
                : "Configura tu primer plan"}
            </DialogTitle>
            <DialogDescription>
              {planModalMode === "first"
                ? "Para continuar, necesitas guardar al menos un plan."
                : "Completa la configuración para generar el plan."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label>Nombre del plan</Label>
            <Input
              value={firstPlanName}
              onChange={(e) => setFirstPlanName(e.target.value)}
            />
          </div>

          <BettingForm
            onSubmit={handleCompleteFirstPlan}
            initialConfig={editingPlan?.config ?? null}
            onReset={() => {}}
            currentBalance={0}
            onAddBalance={() => {}}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
