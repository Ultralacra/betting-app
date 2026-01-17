import { NextResponse, type NextRequest } from "next/server";
import webpush from "web-push";

import { isAdminUser } from "@/lib/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseRouteClient } from "@/lib/supabase/route";

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Falta ${name} en el servidor`);
  return v;
}

export async function POST(req: NextRequest) {
  const { supabase, cookiesToSet } = createSupabaseRouteClient(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const res = NextResponse.json({ error: "unauthorized" }, { status: 401 });
    cookiesToSet.forEach(({ name, value, options }) =>
      res.cookies.set(name, value, options)
    );
    return res;
  }

  if (!isAdminUser(user.id)) {
    const res = NextResponse.json({ error: "forbidden" }, { status: 403 });
    cookiesToSet.forEach(({ name, value, options }) =>
      res.cookies.set(name, value, options)
    );
    return res;
  }

  const body = (await req.json().catch(() => null)) as
    | { title?: string; body?: string; url?: string }
    | null;

  const title = body?.title ?? "BetTracker";
  const message = body?.body ?? "Tienes una actualización.";
  const url = body?.url ?? "/";

  let admin;
  try {
    admin = createSupabaseAdminClient();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "server_misconfigured", details: msg },
      { status: 500 }
    );
  }

  const publicKey = requireEnv("VAPID_PUBLIC_KEY");
  const privateKey = requireEnv("VAPID_PRIVATE_KEY");
  const subject = process.env.VAPID_SUBJECT ?? "mailto:admin@example.com";

  webpush.setVapidDetails(subject, publicKey, privateKey);

  const { data: subs, error } = await admin
    .from("push_subscriptions")
    .select("endpoint,p256dh,auth");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const payload = JSON.stringify({
    title,
    body: message,
    url,
  });

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
        // Si el endpoint ya no existe, lo borramos.
        const statusCode = e?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await admin.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
        }
        return { ok: false, statusCode };
      }
    })
  );

  const sent = results.filter((r) => r.ok).length;
  const failed = results.length - sent;

  // Registrar historial en la tabla `notifications` si existe
  try {
    await admin.from("notifications").insert({
      title,
      body: message,
      url,
      sent_count: sent,
      failed_count: failed,
      created_by: user.id,
    });
  } catch (e) {
    // No fatal; registrar en logs de server si hay error.
    // eslint-disable-next-line no-console
    console.warn("No se pudo guardar el historial de notificación:", e);
  }

  const res = NextResponse.json({ ok: true, sent, failed });
  cookiesToSet.forEach(({ name, value, options }) =>
    res.cookies.set(name, value, options)
  );
  return res;
}
