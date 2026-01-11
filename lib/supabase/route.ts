import type { NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { getSupabaseAnonKey, getSupabaseUrl } from "./env"

export function createSupabaseRouteClient(request: NextRequest) {
  const cookiesToSet: Array<{
    name: string
    value: string
    options?: Record<string, unknown>
  }> = []

  const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookies) {
        cookies.forEach(({ name, value, options }) => {
          cookiesToSet.push({ name, value, options: options as Record<string, unknown> })
        })
      },
    },
  })

  return { supabase, cookiesToSet }
}
