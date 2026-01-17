"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Calendar,
  BarChart3,
  History,
  Trophy,
} from "lucide-react";

const navItems = [
  {
    label: "Panel",
    value: "dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Plan",
    value: "plan",
    icon: Calendar,
  },
  {
    label: "Análisis",
    value: "analytics",
    icon: BarChart3,
  },
  {
    label: "Historial",
    value: "history",
    icon: History,
  },
  {
    label: "Logros",
    value: "achievements",
    icon: Trophy,
  },
];

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <div className="bottom-nav md:hidden">
      <nav className="flex items-center justify-around border-t border-border bg-card/95 backdrop-blur-sm px-2 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.value;

          return (
            <button
              key={item.value}
              onClick={() => onTabChange(item.value)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-lg px-3 py-2 text-xs transition-colors",
                "hover:bg-muted",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 transition-transform",
                  isActive && "scale-110"
                )}
              />
              <span className={cn(isActive && "font-medium")}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
