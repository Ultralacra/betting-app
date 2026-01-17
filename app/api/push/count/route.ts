import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route";
import { isAdminUser } from "@/lib/admin";

export async function GET(req: NextRequest) {
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

  const { data, error } = await supabase.from("push_subscriptions").select("id", { count: "exact" }).limit(1);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const count = (data as any)?._count?.id ?? null;
  // Fallback: si la DB no devuelve _count (antiguo driver), obtenemos count directo
  if (count === null) {
    const { count: c, error: e } = await supabase.rpc("get_push_subscriptions_count").catch(() => ({ count: null, error: null }));
    if (e) return NextResponse.json({ error: e.message }, { status: 500 });
    return NextResponse.json({ count: c ?? 0 });
  }

  return NextResponse.json({ count });
}
