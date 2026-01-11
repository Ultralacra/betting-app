import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { isAdminUser } from "@/lib/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";
import webpush from "web-push";

type AchievementRow = {
  id: string;
  parleyName: string;
  line: string;
  momio: string;
  result: "PENDING" | "HIT" | "MISS";
  createdAt: string;
  updatedAt: string;
};

type AchievementResult = "PENDING" | "HIT" | "MISS";

function normalizeResult(value: unknown): AchievementResult {
  if (value === "HIT" || value === "MISS" || value === "PENDING") return value;
  return "PENDING";
}

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
    .from("achievements")
    .select("id,parley_name,line,momio,result,created_at,updated_at")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    return NextResponse.json(
      {
        error: error.message,
        hint: "¿Ejecutaste supabase/schema.sql para crear public.achievements y políticas?",
      },
      { status: 500 },
    );
  }

  const rows: AchievementRow[] = (data ?? []).map((r: any) => ({
    id: r.id,
    parleyName: r.parley_name ?? r.title,
    line: r.line ?? (r.description ?? ""),
    momio: r.momio ?? "",
    result: normalizeResult(r.result),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));

  return NextResponse.json({ achievements: rows });
}

export async function POST(req: Request) {
  const authz = await requireAdmin();
  if (!authz.ok) {
    return NextResponse.json(
      { error: authz.status === 401 ? "unauthenticated" : "forbidden" },
      { status: authz.status },
    );
  }

  const body = (await req.json().catch(() => null)) as
    | { parleyName?: string; line?: string; momio?: string; result?: AchievementResult }
    | null;

  const parleyName = body?.parleyName?.trim();
  const line = body?.line?.trim();
  const momio = body?.momio?.trim();
  const result = normalizeResult(body?.result);

  if (!parleyName || !line || !momio) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
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

  const { error } = await admin.from("achievements").insert({
    parley_name: parleyName,
    line,
    momio,
    result,
    created_by: authz.userId,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Notificación push (best-effort)
  try {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT ?? "mailto:admin@example.com";
    if (publicKey && privateKey) {
      webpush.setVapidDetails(subject, publicKey, privateKey);
      const { data: subs } = await admin
        .from("push_subscriptions")
        .select("endpoint,p256dh,auth");

      const payload = JSON.stringify({
        title: "Nuevo logro",
        body: `${parleyName} • ${line} • ${momio}`,
        url: "/dashboard",
      });

      await Promise.all(
        (subs ?? []).map(async (s: any) => {
          const subscription = {
            endpoint: s.endpoint,
            keys: { p256dh: s.p256dh, auth: s.auth },
          };
          try {
            await webpush.sendNotification(subscription as any, payload);
          } catch (e: any) {
            const statusCode = e?.statusCode;
            if (statusCode === 404 || statusCode === 410) {
              await admin
                .from("push_subscriptions")
                .delete()
                .eq("endpoint", s.endpoint);
            }
          }
        })
      );
    }
  } catch {
    // ignore
  }

  return NextResponse.json({ ok: true });
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
    | { id?: string; parleyName?: string; line?: string; momio?: string; result?: AchievementResult }
    | null;

  const id = body?.id;
  const parleyName = body?.parleyName?.trim();
  const line = body?.line?.trim();
  const momio = body?.momio?.trim();
  const result = normalizeResult(body?.result);

  if (!id || !parleyName || !line || !momio) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
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

  const update: Record<string, unknown> = {
    parley_name: parleyName,
    line,
    momio,
    result,
  };

  const { error } = await admin.from("achievements").update(update).eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const authz = await requireAdmin();
  if (!authz.ok) {
    return NextResponse.json(
      { error: authz.status === 401 ? "unauthenticated" : "forbidden" },
      { status: authz.status },
    );
  }

  const body = (await req.json().catch(() => null)) as | { id?: string } | null;
  const id = body?.id;

  if (!id) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
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

  const { error } = await admin.from("achievements").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
