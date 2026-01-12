"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Users,
  Trophy,
  Settings,
  BarChart3,
  ChevronLeft,
  Home,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  {
    label: "Dashboard",
    href: "/admin",
    icon: BarChart3,
  },
  {
    label: "Usuarios",
    href: "/admin",
    icon: Users,
  },
  {
    label: "Logros",
    href: "/admin/achievements",
    icon: Trophy,
  },
  {
    label: "Configuración",
    href: "/admin/settings",
    icon: Settings,
  },
];

interface AdminSidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export function AdminSidebar({ collapsed = false, onToggle }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-border bg-card transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b border-border px-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Settings className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold">Admin Panel</span>
          </div>
        )}
        {collapsed && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary mx-auto">
            <Settings className="h-4 w-4 text-primary-foreground" />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href + item.label}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                "hover:bg-muted hover:text-foreground",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground",
                collapsed && "justify-center px-2"
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-2">
        <Link
          href="/dashboard"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            "hover:bg-muted text-muted-foreground hover:text-foreground",
            collapsed && "justify-center px-2"
          )}
          title={collapsed ? "Volver al Dashboard" : undefined}
        >
          <Home className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span>Volver al Dashboard</span>}
        </Link>
      </div>
    </aside>
  );
}
