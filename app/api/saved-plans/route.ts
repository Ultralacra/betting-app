import { NextResponse, type NextRequest } from "next/server"
import { createSupabaseRouteClient } from "@/lib/supabase/route"

type MembershipTier = "FREE" | "PRO"

type SavedPlanRow = {
  id: string
  user_id: string
  name: string
  config: unknown
  plan: unknown
  saved_at: string
}

function isProActive(row: { membership_tier: MembershipTier; membership_expires_at: string | null } | null) {
  if (!row) return false
  if (row.membership_tier !== "PRO") return false
  if (!row.membership_expires_at) return true
  return new Date(row.membership_expires_at).getTime() > Date.now()
}

function toInt(value: unknown, fallback: number) {
  const n = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.trunc(n)
}

export async function GET(req: NextRequest) {
  const { supabase, cookiesToSet } = createSupabaseRouteClient(req)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const res = NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options))
    return res
  }

  const { data, error } = await supabase
    .from("saved_plans")
    .select("id,user_id,name,config,plan,saved_at")
    .eq("user_id", user.id)
    .order("saved_at", { ascending: false })

  if (error) {
    const res = NextResponse.json({ error: error.message }, { status: 500 })
    cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options))
    return res
  }

  const res = NextResponse.json({ plans: (data ?? []) as SavedPlanRow[] })
  cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options))
  return res
}

export async function POST(req: NextRequest) {
  const { supabase, cookiesToSet } = createSupabaseRouteClient(req)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const res = NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options))
    return res
  }

  const body = (await req.json()) as
    | {
        plan: {
          id?: string
          name: string
          config: unknown
          plan: unknown
          savedAt?: string
        }
      }
    | {
        plans: Array<{
          id?: string
          name: string
          config: unknown
          plan: unknown
          savedAt?: string
        }>
      }

  const toRow = (p: { id?: string; name: string; config: unknown; plan: unknown; savedAt?: string }): Partial<SavedPlanRow> => ({
    id: p.id,
    user_id: user.id,
    name: p.name,
    config: p.config,
    plan: p.plan,
    saved_at: p.savedAt ?? new Date().toISOString(),
  })

  const rows = "plans" in body ? body.plans.map(toRow) : [toRow(body.plan)]

  // Enforce límites de planes por plan (FREE/PRO)
  const { data: membershipRow, error: membershipError } = await supabase
    .from("app_users")
    .select("membership_tier,membership_expires_at")
    .eq("user_id", user.id)
    .maybeSingle()

  if (membershipError) {
    const res = NextResponse.json({ error: membershipError.message }, { status: 500 })
    cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options))
    return res
  }

  const proActive = isProActive(
    (membershipRow ?? null) as { membership_tier: MembershipTier; membership_expires_at: string | null } | null,
  )

  const { data: settingsRow, error: settingsError } = await supabase
    .from("plan_settings")
    .select("free_max_saved_plans,pro_max_saved_plans")
    .eq("id", 1)
    .maybeSingle()

  if (settingsError) {
    const res = NextResponse.json({ error: settingsError.message }, { status: 500 })
    cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options))
    return res
  }

  const freeMax = toInt(settingsRow?.free_max_saved_plans, 2)
  const proMax = settingsRow?.pro_max_saved_plans === null ? null : toInt(settingsRow?.pro_max_saved_plans, 0)
  const maxAllowed = proActive ? proMax : freeMax

  if (maxAllowed !== null) {
    const { data: existing, error: existingError } = await supabase
      .from("saved_plans")
      .select("id")
      .eq("user_id", user.id)

    if (existingError) {
      const res = NextResponse.json({ error: existingError.message }, { status: 500 })
      cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options))
      return res
    }

    const existingIds = new Set((existing ?? []).map((r: any) => String(r.id)))
    const existingCount = existingIds.size

    // Cuenta solo los inserts nuevos (updates no consumen cupo)
    const inserts = rows.filter((r) => {
      const id = (r as any).id
      if (!id) return true
      return !existingIds.has(String(id))
    }).length

    if (existingCount + inserts > maxAllowed) {
      const res = NextResponse.json(
        {
          error: "plan_limit_reached",
          details: `Límite de planes guardados alcanzado (${maxAllowed}).`,
        },
        { status: 403 },
      )
      cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options))
      return res
    }
  }

  const { error } = await supabase.from("saved_plans").upsert(rows, { onConflict: "id" })

  if (error) {
    const res = NextResponse.json({ error: error.message }, { status: 500 })
    cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options))
    return res
  }

  const { data, error: readError } = await supabase
    .from("saved_plans")
    .select("id,user_id,name,config,plan,saved_at")
    .eq("user_id", user.id)
    .order("saved_at", { ascending: false })

  if (readError) {
    const res = NextResponse.json({ error: readError.message }, { status: 500 })
    cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options))
    return res
  }

  const res = NextResponse.json({ plans: (data ?? []) as SavedPlanRow[] })
  cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options))
  return res
}

export async function DELETE(req: NextRequest) {
  const { supabase, cookiesToSet } = createSupabaseRouteClient(req)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const res = NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options))
    return res
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) {
    const res = NextResponse.json({ error: "Missing id" }, { status: 400 })
    cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options))
    return res
  }

  const { error } = await supabase.from("saved_plans").delete().eq("user_id", user.id).eq("id", id)

  if (error) {
    const res = NextResponse.json({ error: error.message }, { status: 500 })
    cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options))
    return res
  }

  const { data, error: readError } = await supabase
    .from("saved_plans")
    .select("id,user_id,name,config,plan,saved_at")
    .eq("user_id", user.id)
    .order("saved_at", { ascending: false })

  if (readError) {
    const res = NextResponse.json({ error: readError.message }, { status: 500 })
    cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options))
    return res
  }

  const res = NextResponse.json({ plans: (data ?? []) as SavedPlanRow[] })
  cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options))
  return res
}
