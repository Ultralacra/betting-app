import { NextResponse, type NextRequest } from "next/server"
import { createSupabaseRouteClient } from "@/lib/supabase/route"
import type { ThemeMode } from "@/lib/db"
import { BettingDataSchema } from "@/lib/validations"
import { handleApiError, Errors } from "@/lib/api-errors"

export async function POST(req: NextRequest) {
  try {
    const { supabase, cookiesToSet } = createSupabaseRouteClient(req)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      const res = Errors.unauthorized().toResponse()
      cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options))
      return res
    }

    const rawBody = await req.json()
    
    // Validar con Zod
    const parsed = BettingDataSchema.safeParse(rawBody)
    if (!parsed.success) {
      const res = Errors.validation(
        parsed.error.errors.map((e) => ({ field: e.path.join("."), message: e.message }))
      ).toResponse()
      cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options))
      return res
    }

    const body = parsed.data

    const config = body.configJson ? (JSON.parse(body.configJson) as unknown) : null
    const plan = body.planJson ? (JSON.parse(body.planJson) as unknown) : null

    const { error } = await supabase.from("betting_state").upsert(
      {
        user_id: user.id,
        config,
        plan,
        current_balance: body.currentBalance,
        theme: body.theme as ThemeMode,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    )

    if (error) {
      const res = Errors.internal(error.message).toResponse()
      cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options))
      return res
    }

    const res = NextResponse.json({ ok: true })
    cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options))
    return res
  } catch (error) {
    return handleApiError(error)
  }
}
