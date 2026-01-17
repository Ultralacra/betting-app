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
  description: string;
  result: "PENDING" | "HIT" | "MISS";
  likesCount: number;
  createdAt: string;
  updatedAt: string;
};

type AchievementLikeRow = {
  achievement_id: string;
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
    .select("id,parley_name,line,momio,description,result,created_at,updated_at")
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
    line: r.line ?? "",
    momio: r.momio ?? "",
    description: r.description ?? "",
    result: normalizeResult(r.result),
    likesCount: 0,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));

  const ids = rows.map((r) => r.id).filter(Boolean);
  if (ids.length > 0) {
    const { data: likesAll, error: likesAllError } = await admin
      .from("achievement_likes")
      .select("achievement_id")
      .in("achievement_id", ids);

    if (likesAllError) {
      return NextResponse.json({ error: likesAllError.message }, { status: 500 });
    }

    const counts: Record<string, number> = {};
    for (const row of (likesAll ?? []) as AchievementLikeRow[]) {
      counts[row.achievement_id] = (counts[row.achievement_id] ?? 0) + 1;
    }

    for (const r of rows) {
      r.likesCount = counts[r.id] ?? 0;
    }
  }

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
    | { parleyName?: string; line?: string; momio?: string; description?: string; result?: AchievementResult }
    | null;

  const parleyName = body?.parleyName?.trim();
  const line = body?.line?.trim();
  const momio = body?.momio?.trim();
  const description = body?.description?.trim();
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
    description: description && description.length > 0 ? description : null,
    result,
    created_by: authz.userId,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Notificación push (best-effort)
  let pushSent = 0;
  let pushFailed = 0;
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
        title: "🏆 Nuevo logro",
        body: `${parleyName} • ${line} • ${momio}`,
        url: "/dashboard",
      });

      // eslint-disable-next-line no-console
      console.log(`[Push] Enviando notificación a ${subs?.length ?? 0} suscriptores...`);

      const results = await Promise.all(
        (subs ?? []).map(async (s: any) => {
          const subscription = {
            endpoint: s.endpoint,
            keys: { p256dh: s.p256dh, auth: s.auth },
          };
          try {
            await webpush.sendNotification(subscription as any, payload);
            return { ok: true };
          } catch (e: any) {
            const statusCode = e?.statusCode;
            if (statusCode === 404 || statusCode === 410) {
              await admin
                .from("push_subscriptions")
                .delete()
                .eq("endpoint", s.endpoint);
            }
            return { ok: false, statusCode };
          }
        })
      );

      pushSent = results.filter((r) => r.ok).length;
      pushFailed = results.length - pushSent;

      // eslint-disable-next-line no-console
      console.log(`[Push] Resultado: ${pushSent} enviadas, ${pushFailed} fallidas`);
    } else {
      // eslint-disable-next-line no-console
      console.warn("[Push] VAPID keys no configuradas, no se enviaron notificaciones");
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[Push] Error al enviar notificaciones:", e);
  }

  return NextResponse.json({ ok: true, pushSent, pushFailed });
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
    | { id?: string; parleyName?: string; line?: string; momio?: string; description?: string; result?: AchievementResult }
    | null;

  const id = body?.id;
  if (!id) {
    return NextResponse.json({ error: "invalid_body", details: "Se requiere el campo 'id'" }, { status: 400 });
  }

  // Solo requerimos id, los demás campos son opcionales para actualización parcial
  const parleyName = body?.parleyName?.trim();
  const line = body?.line?.trim();
  const momio = body?.momio?.trim();
  const description = body?.description?.trim();
  const result = body?.result ? normalizeResult(body.result) : undefined;

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

  // Construir objeto de actualización solo con campos definidos
  const update: Record<string, unknown> = {};
  if (parleyName) update.parley_name = parleyName;
  if (line) update.line = line;
  if (momio) update.momio = momio;
  if (description !== undefined) update.description = description.length > 0 ? description : null;
  if (result !== undefined) update.result = result;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "invalid_body", details: "No hay campos para actualizar" }, { status: 400 });
  }

  // Obtener el logro actual para ver si cambió el resultado
  const { data: currentAchievement } = await admin
    .from("achievements")
    .select("parley_name, line, momio, result")
    .eq("id", id)
    .single();

  const { error } = await admin.from("achievements").update(update).eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Notificación push si el resultado cambió a HIT o MISS
  let pushSent = 0;
  let pushFailed = 0;
  const oldResult = currentAchievement?.result;
  const newResult = result;
  const shouldNotify = newResult && newResult !== oldResult && (newResult === "HIT" || newResult === "MISS");

  if (shouldNotify && currentAchievement) {
    try {
      const publicKey = process.env.VAPID_PUBLIC_KEY;
      const privateKey = process.env.VAPID_PRIVATE_KEY;
      const subject = process.env.VAPID_SUBJECT ?? "mailto:admin@example.com";
      if (publicKey && privateKey) {
        webpush.setVapidDetails(subject, publicKey, privateKey);
        const { data: subs } = await admin
          .from("push_subscriptions")
          .select("endpoint,p256dh,auth");

        const emoji = newResult === "HIT" ? "✅" : "❌";
        const statusText = newResult === "HIT" ? "¡PEGÓ!" : "No pegó";
        const payload = JSON.stringify({
          title: `${emoji} ${statusText}`,
          body: `${currentAchievement.parley_name} • ${currentAchievement.line} • ${currentAchievement.momio}`,
          url: "/dashboard",
        });

        // eslint-disable-next-line no-console
        console.log(`[Push] Notificando resultado ${newResult} a ${subs?.length ?? 0} suscriptores...`);

        const results = await Promise.all(
          (subs ?? []).map(async (s: any) => {
            const subscription = {
              endpoint: s.endpoint,
              keys: { p256dh: s.p256dh, auth: s.auth },
            };
            try {
              await webpush.sendNotification(subscription as any, payload);
              return { ok: true };
            } catch (e: any) {
              const statusCode = e?.statusCode;
              if (statusCode === 404 || statusCode === 410) {
                await admin.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
              }
              return { ok: false, statusCode };
            }
          })
        );

        pushSent = results.filter((r) => r.ok).length;
        pushFailed = results.length - pushSent;
        // eslint-disable-next-line no-console
        console.log(`[Push] Resultado: ${pushSent} enviadas, ${pushFailed} fallidas`);
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[Push] Error al enviar notificaciones:", e);
    }
  }

  return NextResponse.json({ ok: true, pushSent, pushFailed });
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
