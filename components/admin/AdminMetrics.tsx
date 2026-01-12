"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Crown, Activity, TrendingUp } from "lucide-react";

interface AdminMetricsProps {
  totalUsers: number;
  proUsers: number;
  freeUsers: number;
  activeToday?: number;
}

export function AdminMetrics({
  totalUsers,
  proUsers,
  freeUsers,
  activeToday = 0,
}: AdminMetricsProps) {
  const proPercentage =
    totalUsers > 0 ? ((proUsers / totalUsers) * 100).toFixed(1) : "0";

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="Total Usuarios"
        value={totalUsers}
        subtitle="Usuarios registrados"
        icon={<Users className="h-4 w-4" />}
        iconBg="bg-primary/10"
        iconColor="text-primary"
      />
      <MetricCard
        title="Usuarios PRO"
        value={proUsers}
        subtitle={`${proPercentage}% del total`}
        icon={<Crown className="h-4 w-4" />}
        iconBg="bg-yellow-500/10"
        iconColor="text-yellow-500"
        highlight
      />
      <MetricCard
        title="Usuarios FREE"
        value={freeUsers}
        subtitle="Plan gratuito"
        icon={<Users className="h-4 w-4" />}
        iconBg="bg-muted"
        iconColor="text-muted-foreground"
      />
      <MetricCard
        title="Activos Hoy"
        value={activeToday}
        subtitle="En las últimas 24h"
        icon={<Activity className="h-4 w-4" />}
        iconBg="bg-chart-2/10"
        iconColor="text-chart-2"
      />
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: number;
  subtitle: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  highlight?: boolean;
}

function MetricCard({
  title,
  value,
  subtitle,
  icon,
  iconBg,
  iconColor,
  highlight,
}: MetricCardProps) {
  return (
    <Card className={`hover-lift ${highlight ? "glass-card" : ""}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={`rounded-full p-2 ${iconBg}`}>
          <div className={iconColor}>{icon}</div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold animate-count">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      </CardContent>
    </Card>
  );
}
