import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { isAdminUser } from "@/lib/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

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

  if (!user) {
    return { ok: false as const, status: 401 as const, userId: null };
  }

  if (!isAdminUser(user.id)) {
    return { ok: false as const, status: 403 as const, userId: user.id };
  }

  return { ok: true as const, status: 200 as const, userId: user.id };
}

export async function GET() {
  const authz = await requireAdmin();
  if (!authz.ok) {
    return NextResponse.json(
      { error: authz.status === 401 ? "unauthenticated" : "forbidden" },
      { status: authz.status }
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
      { status: 500 }
    );
  }

  // 1) Listar usuarios auth (paginated)
  const users: Array<{ id: string; email?: string | null; user_metadata?: any }> = [];
  let page = 1;
  const perPage = 200;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const batch = data.users ?? [];
    users.push(
      ...batch.map((u) => ({
        id: u.id,
        email: u.email ?? null,
        user_metadata: u.user_metadata,
      }))
    );

    if (batch.length < perPage) break;
    page += 1;
  }

  const ids = users.map((u) => u.id);

  if (ids.length === 0) {
    return NextResponse.json({ users: [] as AdminUserRow[] });
  }

  // 2) Asegurar filas en app_users (para que todos aparezcan)
  if (ids.length > 0) {
    const upsertRows = users.map((u) => ({
      user_id: u.id,
      email: u.email ?? null,
      display_name: (u.user_metadata?.full_name ?? u.user_metadata?.name ?? null) as
        | string
        | null,
    }));

    // Upsert con service role (bypassa RLS).
    const { error: upsertError } = await admin
      .from("app_users")
      .upsert(upsertRows, { onConflict: "user_id" });

    if (upsertError) {
      return NextResponse.json(
        {
          error: upsertError.message,
          hint: "¿Ejecutaste supabase/schema.sql para crear la tabla public.app_users?",
        },
        { status: 500 }
      );
    }
  }

  // 3) Leer app_users para membresía
  const { data: rows, error: rowsError } = await admin
    .from("app_users")
    .select(
      "user_id,email,display_name,membership_tier,membership_duration,membership_expires_at,updated_at"
    )
    .in("user_id", ids);

  if (rowsError) {
    return NextResponse.json(
      {
        error: rowsError.message,
        hint: "¿Ejecutaste supabase/schema.sql para crear la tabla public.app_users?",
      },
      { status: 500 }
    );
  }

  const byId = new Map<string, any>((rows ?? []).map((r) => [r.user_id, r]));

  const result: AdminUserRow[] = users
    .map((u) => {
      const r = byId.get(u.id);
      return {
        id: u.id,
        email: (r?.email ?? u.email ?? null) as string | null,
        name: (r?.display_name ??
          u.user_metadata?.full_name ??
          u.user_metadata?.name ??
          null) as string | null,
        membershipTier: (r?.membership_tier ?? "FREE") as MembershipTier,
        membershipDuration: (r?.membership_duration ?? null) as MembershipDuration | null,
        membershipExpiresAt: (r?.membership_expires_at ?? null) as string | null,
        updatedAt: (r?.updated_at ?? null) as string | null,
      };
    })
    .sort((a, b) => (a.email ?? "").localeCompare(b.email ?? ""));

  return NextResponse.json({ users: result });
}

export async function PATCH(req: Request) {
  const authz = await requireAdmin();
  if (!authz.ok) {
    return NextResponse.json(
      { error: authz.status === 401 ? "unauthenticated" : "forbidden" },
      { status: authz.status }
    );
  }

  const body = (await req.json().catch(() => null)) as
    | { userId?: string; membershipTier?: MembershipTier; duration?: MembershipDuration }
    | null;

  const userId = body?.userId;
  const membershipTier = body?.membershipTier;
  const duration = body?.duration;

  if (!userId || (membershipTier !== "FREE" && membershipTier !== "PRO")) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (membershipTier === "PRO" && duration === undefined) {
    return NextResponse.json(
      { error: "duration_required" },
      { status: 400 }
    );
  }

  if (
    membershipTier === "PRO" &&
    duration !== undefined &&
    duration !== "1M" &&
    duration !== "2M" &&
    duration !== "3M" &&
    duration !== "1Y" &&
    duration !== "LIFETIME"
  ) {
    return NextResponse.json({ error: "invalid_duration" }, { status: 400 });
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
      { status: 500 }
    );
  }

  let membershipExpiresAt: string | null = null;
  let membershipDuration: MembershipDuration | null = null;
  if (membershipTier === "PRO") {
    const dur = duration ?? "1M";
    if (dur === "LIFETIME") {
      membershipExpiresAt = null;
      membershipDuration = "LIFETIME";
    } else {
      const now = new Date();
      const next = new Date(now);
      if (dur === "1Y") {
        next.setFullYear(now.getFullYear() + 1);
      } else {
        const monthsToAdd = dur === "1M" ? 1 : dur === "2M" ? 2 : 3;
        next.setMonth(now.getMonth() + monthsToAdd);
      }
      membershipExpiresAt = next.toISOString();
      membershipDuration = dur;
    }
  }

  const { error } = await admin
    .from("app_users")
    .update({
      membership_tier: membershipTier,
      membership_duration: membershipTier === "FREE" ? null : membershipDuration,
      membership_expires_at: membershipExpiresAt,
    })
    .eq("user_id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
