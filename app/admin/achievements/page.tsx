import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { isAdminUser } from "@/lib/admin";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";
import { AdminAchievementsClient } from "@/components/admin-achievements-client";

export default async function AdminAchievementsPage() {
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
  if (!isAdminUser(user.id)) redirect("/dashboard");

  return <AdminAchievementsClient />;
}
