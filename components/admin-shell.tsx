"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings, Trophy, Users } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin/settings", label: "Configuración", icon: Settings },
  { href: "/admin", label: "Usuarios", icon: Users },
  { href: "/admin/achievements", label: "Logros", icon: Trophy },
] as const;

export function AdminShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <SidebarProvider>
      <Sidebar collapsible="offcanvas" variant="inset">
        <SidebarHeader className="gap-2">
          <div className="flex items-center justify-between px-2">
            <div className="text-sm font-semibold">Admin</div>
            <SidebarTrigger />
          </div>
        </SidebarHeader>
        <SidebarSeparator />
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Gestión</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.href;
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={active}>
                        <Link href={item.href}>
                          <Icon />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>

      <SidebarInset>
        <header className={cn("border-b border-border bg-card")}
        >
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SidebarTrigger className="md:hidden" />
                <h1 className="text-lg font-semibold">{title}</h1>
              </div>
              <Link
                href="/dashboard"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Volver al dashboard
              </Link>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
