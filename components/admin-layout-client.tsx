"use client";

import { usePathname } from "next/navigation";

import { AdminShell } from "@/components/admin-shell";

export function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const title = pathname.startsWith("/admin/settings")
    ? "Configuración"
    : pathname.startsWith("/admin/achievements")
      ? "Logros"
      : "Usuarios";

  return <AdminShell title={title}>{children}</AdminShell>;
}
