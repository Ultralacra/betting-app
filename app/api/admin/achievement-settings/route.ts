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
    .from("achievement_settings")
    .select("free_daily_limit,pro_daily_limit,updated_at")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const freeDailyLimit = toInt(data?.free_daily_limit, 1);
  const proDailyLimit = toInt(data?.pro_daily_limit, 3);

  return NextResponse.json({
    settings: {
      freeDailyLimit,
      proDailyLimit,
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
    | { freeDailyLimit?: unknown; proDailyLimit?: unknown }
    | null;

  const free = clampInt(toInt(body?.freeDailyLimit, 1), 0, 100);
  const pro = clampInt(toInt(body?.proDailyLimit, 3), 0, 100);

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
    .from("achievement_settings")
    .upsert({ id: 1, free_daily_limit: free, pro_daily_limit: pro });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
