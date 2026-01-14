import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";
import { ProfileClient } from "@/components/profile-client";
import { isAdminUser } from "@/lib/admin";

export default async function ProfilePage() {
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

  // Verificar si el usuario ya existe y si los datos son actuales para evitar updates innecesarios.
  const { data: existingUser } = await supabase
    .from("app_users")
    .select("user_id, display_name, role")
    .eq("user_id", user.id)
    .single();

  const newDisplayName =
    user.user_metadata?.full_name ?? user.user_metadata?.name ?? null;
  const newRole = isAdminUser(user.id) ? "ADMIN" : "MEMBER";

  // Solo hacemos upsert si no existe o si hay cambios reales en los datos básicos.
  // Evitamos actualizar 'updated_at' innecesariamente para no disparar el modal en el cliente.
  if (
    !existingUser ||
    existingUser.display_name !== newDisplayName ||
    existingUser.role !== newRole
  ) {
    await supabase.from("app_users").upsert(
      {
        user_id: user.id,
        email: user.email ?? null,
        display_name: newDisplayName,
        role: newRole,
      },
      { onConflict: "user_id" }
    );
  }

  const { data: appUserRow } = await supabase
    .from("app_users")
    .select("membership_tier,membership_duration,membership_expires_at")
    .eq("user_id", user.id)
    .maybeSingle();

  // Obtener información del proveedor de autenticación
  const provider = user.app_metadata?.provider ?? "email";
  const hasPassword = user.app_metadata?.provider === "email";

  const profile = {
    id: user.id,
    email: user.email ?? null,
    name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
    provider,
    hasPassword,
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
      : (null as Date | null),
  };

  return <ProfileClient profile={profile} />;
}
