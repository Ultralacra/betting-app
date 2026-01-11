import type { BettingConfig, DayResult } from "@/lib/betting-types"

export type SavedPlan = {
  id: string
  name: string
  config: BettingConfig
  plan: DayResult[]
  savedAt: string
}

const CHANGE_EVENT = "betting-app:saved-plans-changed"

function emitChange() {
  if (typeof window === "undefined") return
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

export function subscribeSavedPlansChanged(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {}
  const onCustom = () => callback()
  window.addEventListener(CHANGE_EVENT, onCustom)

  return () => {
    window.removeEventListener(CHANGE_EVENT, onCustom)
  }
}

type ApiSavedPlanRow = {
  id: string
  name: string
  config: unknown
  plan: unknown
  saved_at: string
}

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    credentials: "include",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `HTTP ${res.status}`)
  }

  return (await res.json()) as T
}

function rowToSavedPlan(row: ApiSavedPlanRow): SavedPlan {
  return {
    id: row.id,
    name: row.name,
    config: row.config as BettingConfig,
    plan: row.plan as DayResult[],
    savedAt: row.saved_at,
  }
}

export async function loadSavedPlans(): Promise<SavedPlan[]> {
  const data = await apiJson<{ plans: ApiSavedPlanRow[] }>("/api/saved-plans")
  return (data.plans ?? []).map(rowToSavedPlan)
}

export async function saveSavedPlans(plans: SavedPlan[]): Promise<SavedPlan[]> {
  const payload = {
    plans: plans.map((p) => ({
      id: p.id,
      name: p.name,
      config: p.config,
      plan: p.plan,
      savedAt: p.savedAt,
    })),
  }

  const data = await apiJson<{ plans: ApiSavedPlanRow[] }>("/api/saved-plans", {
    method: "POST",
    body: JSON.stringify(payload),
  })

  emitChange()
  return (data.plans ?? []).map(rowToSavedPlan)
}

export async function addSavedPlan(plan: SavedPlan): Promise<SavedPlan[]> {
  const data = await apiJson<{ plans: ApiSavedPlanRow[] }>("/api/saved-plans", {
    method: "POST",
    body: JSON.stringify({
      plan: {
        id: plan.id,
        name: plan.name,
        config: plan.config,
        plan: plan.plan,
        savedAt: plan.savedAt,
      },
    }),
  })

  emitChange()
  return (data.plans ?? []).map(rowToSavedPlan)
}

export async function deleteSavedPlanById(id: string): Promise<SavedPlan[]> {
  const data = await apiJson<{ plans: ApiSavedPlanRow[] }>(
    `/api/saved-plans?id=${encodeURIComponent(id)}`,
    { method: "DELETE" },
  )

  emitChange()
  return (data.plans ?? []).map(rowToSavedPlan)
}

export async function getSavedPlansCount(): Promise<number> {
  const plans = await loadSavedPlans()
  return plans.length
}

export function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
  return String(Date.now())
}
