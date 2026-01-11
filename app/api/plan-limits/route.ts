import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route";

type MembershipTier = "FREE" | "PRO";

type MembershipRow = {
  membership_tier: MembershipTier;
  membership_expires_at: string | null;
};

type PlanSettingsRow = {
  free_max_saved_plans: unknown;
  pro_max_saved_plans: unknown;
};

function isProActive(row: MembershipRow | null) {
  if (!row) return false;
  if (row.membership_tier !== "PRO") return false;
  if (!row.membership_expires_at) return true;
  return new Date(row.membership_expires_at).getTime() > Date.now();
}

function toInt(value: unknown, fallback: number) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.trunc(n);
}

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

  const { data: membershipRow, error: membershipError } = await supabase
    .from("app_users")
    .select("membership_tier,membership_expires_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError) {
    const res = NextResponse.json({ error: membershipError.message }, { status: 500 });
    cookiesToSet.forEach(({ name, value, options }) =>
      res.cookies.set(name, value, options)
    );
    return res;
  }

  const proActive = isProActive((membershipRow ?? null) as MembershipRow | null);

  const { data: settingsRow, error: settingsError } = await supabase
    .from("plan_settings")
    .select("free_max_saved_plans,pro_max_saved_plans")
    .eq("id", 1)
    .maybeSingle();

  if (settingsError) {
    const res = NextResponse.json({ error: settingsError.message }, { status: 500 });
    cookiesToSet.forEach(({ name, value, options }) =>
      res.cookies.set(name, value, options)
    );
    return res;
  }

  const freeMaxSavedPlans = toInt(
    (settingsRow as PlanSettingsRow | null)?.free_max_saved_plans,
    2
  );

  const rawProMax = (settingsRow as PlanSettingsRow | null)?.pro_max_saved_plans;
  const proMaxSavedPlans = rawProMax === null ? null : toInt(rawProMax, 0);

  const maxSavedPlans = proActive ? proMaxSavedPlans : freeMaxSavedPlans;

  const res = NextResponse.json({
    tier: proActive ? "PRO" : "FREE",
    maxSavedPlans,
    freeMaxSavedPlans,
    proMaxSavedPlans,
  });

  cookiesToSet.forEach(({ name, value, options }) =>
    res.cookies.set(name, value, options)
  );
  return res;
}
