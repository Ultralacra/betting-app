import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { isAdminUser } from "@/lib/admin";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";
import { AdminUsersClient } from "@/components/admin-users-client";
import AdminPushClient from "@/components/admin-push-client";

export default async function AdminPage() {
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

  // Renderiza el panel de usuarios y el panel admin de notificaciones
  return (
    <>
      <AdminUsersClient />
      <div className="mt-6">
        {/* @ts-expect-error Server -> Client */}
        <AdminPushClient />
      </div>
    </>
  );
}
