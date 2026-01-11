import { NextResponse, type NextRequest } from "next/server"
import { createSupabaseRouteClient } from "@/lib/supabase/route"
import type { ThemeMode } from "@/lib/db"

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

  const body = (await req.json()) as {
    configJson: string | null
    planJson: string | null
    currentBalance: number | null
    theme: ThemeMode
  }

  const config = body.configJson ? (JSON.parse(body.configJson) as unknown) : null
  const plan = body.planJson ? (JSON.parse(body.planJson) as unknown) : null

  const { error } = await supabase.from("betting_state").upsert(
    {
      user_id: user.id,
      config,
      plan,
      current_balance: body.currentBalance,
      theme: body.theme,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  )

  if (error) {
    const res = NextResponse.json({ error: error.message }, { status: 500 })
    cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options))
    return res
  }

  const res = NextResponse.json({ ok: true })
  cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options))
  return res
}
