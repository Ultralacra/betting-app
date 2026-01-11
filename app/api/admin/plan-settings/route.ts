import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { isAdminUser } from "@/lib/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

async function requireAdmin() {
  const cookieStore = await cookies();
  const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {
        // No necesitamos mutar cookies en estas rutas.
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false as const, status: 401 as const };
  if (!isAdminUser(user.id)) return { ok: false as const, status: 403 as const };

  return { ok: true as const, status: 200 as const };
}

function toIntOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function toInt(value: unknown, fallback: number) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.trunc(n);
}

function clampInt(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export async function GET() {
  const authz = await requireAdmin();
  if (!authz.ok) {
    return NextResponse.json(
      { error: authz.status === 401 ? "unauthenticated" : "forbidden" },
      { status: authz.status },
    );
  }

  let admin: ReturnType<typeof createSupabaseAdminClient>;
  try {
    admin = createSupabaseAdminClient();
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      {
        error: "server_misconfigured",
        details: message,
        hint: "Verifica SUPABASE_SERVICE_ROLE_KEY en .env.local y reinicia el servidor.",
      },
      { status: 500 },
    );
  }

  const { data, error } = await admin
    .from("plan_settings")
    .select("free_max_saved_plans,pro_max_saved_plans,updated_at")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    settings: {
      freeMaxSavedPlans: toInt(data?.free_max_saved_plans, 2),
      proMaxSavedPlans: data?.pro_max_saved_plans === null ? null : toInt(data?.pro_max_saved_plans, 0),
      updatedAt: data?.updated_at ?? null,
    },
  });
}

export async function PATCH(req: Request) {
  const authz = await requireAdmin();
  if (!authz.ok) {
    return NextResponse.json(
      { error: authz.status === 401 ? "unauthenticated" : "forbidden" },
      { status: authz.status },
    );
  }

  const body = (await req.json().catch(() => null)) as
    | { freeMaxSavedPlans?: unknown; proMaxSavedPlans?: unknown }
    | null;

  const free = clampInt(toInt(body?.freeMaxSavedPlans, 2), 0, 1000);
  const proRaw = toIntOrNull(body?.proMaxSavedPlans);
  const pro = proRaw === null ? null : clampInt(proRaw, 0, 1000);

  let admin: ReturnType<typeof createSupabaseAdminClient>;
  try {
    admin = createSupabaseAdminClient();
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      {
        error: "server_misconfigured",
        details: message,
        hint: "Verifica SUPABASE_SERVICE_ROLE_KEY en .env.local y reinicia el servidor.",
      },
      { status: 500 },
    );
  }

  const { error } = await admin
    .from("plan_settings")
    .upsert({ id: 1, free_max_saved_plans: free, pro_max_saved_plans: pro });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
