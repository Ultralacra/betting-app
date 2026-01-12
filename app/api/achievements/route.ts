import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route";

type MembershipTier = "FREE" | "PRO";

type AchievementRow = {
  id: string;
  parley_name: string;
  line: string;
  momio: string;
  description: string | null;
  result: "PENDING" | "HIT" | "MISS";
  created_at: string;
};

type AchievementLikeRow = {
  achievement_id: string;
  user_id: string;
};

function getTodayUtcRange() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

function isProActive(row: { membership_tier: MembershipTier; membership_expires_at: string | null } | null) {
  if (!row) return false;
  if (row.membership_tier !== "PRO") return false;
  if (!row.membership_expires_at) return true; // lifetime
  return new Date(row.membership_expires_at).getTime() > Date.now();
}

function toInt(value: unknown, fallback: number) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.trunc(n);
}

function clampInt(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export async function GET(req: NextRequest) {
  const { supabase, cookiesToSet } = createSupabaseRouteClient(req);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const res = NextResponse.json({ error: "unauthorized" }, { status: 401 });
    cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
    return res;
  }

  const { data: membershipRow, error: membershipError } = await supabase
    .from("app_users")
    .select("membership_tier,membership_expires_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError) {
    const res = NextResponse.json({ error: membershipError.message }, { status: 500 });
    cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
    return res;
  }

  const proActive = isProActive(
    (membershipRow ?? null) as { membership_tier: MembershipTier; membership_expires_at: string | null } | null,
  );

  const { data: settingsRow, error: settingsError } = await supabase
    .from("achievement_settings")
    .select("free_daily_limit,pro_daily_limit")
    .eq("id", 1)
    .maybeSingle();

  if (settingsError) {
    const res = NextResponse.json({ error: settingsError.message }, { status: 500 });
    cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
    return res;
  }

  const freeLimit = clampInt(toInt(settingsRow?.free_daily_limit, 1), 0, 100);
  const proLimit = clampInt(toInt(settingsRow?.pro_daily_limit, 3), 0, 100);
  const dailyLimit = proActive ? proLimit : freeLimit;

  const { startIso, endIso } = getTodayUtcRange();

  const { data, error } = await supabase
    .from("achievements")
    .select("id,parley_name,line,momio,description,result,created_at")
    .gte("created_at", startIso)
    .lt("created_at", endIso)
    .order("created_at", { ascending: false })
    .limit(dailyLimit);

  if (error) {
    const res = NextResponse.json({ error: error.message }, { status: 500 });
    cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
    return res;
  }

  const achievements = (data ?? []) as AchievementRow[];
  const ids = achievements.map((a) => a.id).filter(Boolean);

  // Likes (conteos + si el usuario actual ya dio like)
  let likesCountByAchievement: Record<string, number> = {};
  let likedByMeSet = new Set<string>();

  if (ids.length > 0) {
    const { data: likesAll, error: likesAllError } = await supabase
      .from("achievement_likes")
      .select("achievement_id,user_id")
      .in("achievement_id", ids);

    if (likesAllError) {
      const res = NextResponse.json({ error: likesAllError.message }, { status: 500 });
      cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      return res;
    }

    for (const row of (likesAll ?? []) as AchievementLikeRow[]) {
      likesCountByAchievement[row.achievement_id] =
        (likesCountByAchievement[row.achievement_id] ?? 0) + 1;
      if (row.user_id === user.id) likedByMeSet.add(row.achievement_id);
    }
  }

  const enriched = achievements.map((a) => ({
    ...a,
    likesCount: likesCountByAchievement[a.id] ?? 0,
    likedByMe: likedByMeSet.has(a.id),
  }));

  const res = NextResponse.json({ achievements: enriched, dailyLimit });
  cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
  return res;
}
