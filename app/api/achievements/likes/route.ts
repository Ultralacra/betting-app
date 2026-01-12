import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route";

type LikeAction = "toggle" | "like" | "unlike";

function normalizeAction(value: unknown): LikeAction {
  if (value === "like" || value === "unlike" || value === "toggle") return value;
  return "toggle";
}

function isPostgresUniqueViolation(error: any): boolean {
  return Boolean(error && (error.code === "23505" || error.details?.includes("duplicate key")));
}

export async function POST(req: NextRequest) {
  const { supabase, cookiesToSet } = createSupabaseRouteClient(req);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const res = NextResponse.json({ error: "unauthorized" }, { status: 401 });
    cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
    return res;
  }

  const body = (await req.json().catch(() => null)) as
    | { achievementId?: string; action?: LikeAction }
    | null;

  const achievementId = body?.achievementId;
  const action = normalizeAction(body?.action);

  if (!achievementId) {
    const res = NextResponse.json({ error: "invalid_body" }, { status: 400 });
    cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
    return res;
  }

  // Like / toggle like
  if (action === "toggle" || action === "like") {
    const { error } = await supabase.from("achievement_likes").insert({
      achievement_id: achievementId,
      user_id: user.id,
    });

    if (!error) {
      const res = NextResponse.json({ liked: true });
      cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      return res;
    }

    // Si ya existía y es toggle, entonces hacemos unlike.
    if (action === "toggle" && isPostgresUniqueViolation(error)) {
      const { error: delError } = await supabase
        .from("achievement_likes")
        .delete()
        .eq("achievement_id", achievementId)
        .eq("user_id", user.id);

      if (delError) {
        const res = NextResponse.json({ error: delError.message }, { status: 500 });
        cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
        return res;
      }

      const res = NextResponse.json({ liked: false });
      cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      return res;
    }

    const res = NextResponse.json({ error: error.message }, { status: 500 });
    cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
    return res;
  }

  // Unlike
  const { error } = await supabase
    .from("achievement_likes")
    .delete()
    .eq("achievement_id", achievementId)
    .eq("user_id", user.id);

  if (error) {
    const res = NextResponse.json({ error: error.message }, { status: 500 });
    cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
    return res;
  }

  const res = NextResponse.json({ liked: false });
  cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
  return res;
}
