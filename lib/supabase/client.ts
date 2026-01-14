import { createBrowserClient } from "@supabase/ssr"
import { getSupabaseAnonKey, getSupabaseUrl } from "./env"

export function createSupabaseBrowserClient() {
  return createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    auth: {
      // Persistencia de sesión local (no se cierra al cerrar el navegador)
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // Storage personalizado para mejor control
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
  })
}
