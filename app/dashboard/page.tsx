import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";
import { DashboardClient } from "@/components/dashboard-client";
import { isAdminUser } from "@/lib/admin";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const userId = user.id;

  // Asegura que exista el registro del usuario en app_users.
  await supabase.from("app_users").upsert(
    {
      user_id: userId,
      email: user.email ?? null,
      display_name:
        user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
      role: isAdminUser(userId) ? "ADMIN" : "MEMBER",
    },
    { onConflict: "user_id" }
  );

  const { data: appUserRow } = await supabase
    .from("app_users")
    .select("membership_tier,membership_duration,membership_expires_at")
    .eq("user_id", userId)
    .maybeSingle();

  const appUser = {
    id: userId,
    email: user.email ?? null,
    name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
    membershipTier: (appUserRow?.membership_tier ?? "FREE") as "FREE" | "PRO",
    membershipDuration: (appUserRow?.membership_duration ?? null) as
      | "1M"
      | "2M"
      | "3M"
      | "1Y"
      | "LIFETIME"
      | null,
    membershipExpiresAt: appUserRow?.membership_expires_at
      ? new Date(appUserRow.membership_expires_at)
      : null,
    role: (isAdminUser(userId) ? "ADMIN" : "MEMBER") as "ADMIN" | "MEMBER",
  };

  const { data: state, error } = await supabase
    .from("betting_state")
    .select("config,plan,current_balance,theme")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    // Si falla la lectura, seguimos con estado vacío para no romper la UI.
  }

  const bettingData = {
    configJson: state?.config ? JSON.stringify(state.config) : null,
    planJson: state?.plan ? JSON.stringify(state.plan) : null,
    currentBalance: state?.current_balance ?? null,
    theme: state?.theme ?? null,
  };

  return (
    <DashboardClient
      user={appUser}
      initialBettingData={bettingData}
      initialSavedPlans={[]}
    />
  );
}
