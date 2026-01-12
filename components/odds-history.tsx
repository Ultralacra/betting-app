"use client";

import { useOddsHistory } from "@/hooks/useOddsHistory";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DayResult } from "@/lib/betting-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import {
  History,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  BarChart3,
} from "lucide-react";
import { useState } from "react";

interface OddsHistoryProps {
  plan: DayResult[];
}

export function OddsHistory({ plan }: OddsHistoryProps) {
  const { recentHistory, stats } = useOddsHistory(plan);
  const [isExpanded, setIsExpanded] = useState(false);

  if (recentHistory.length === 0) {
    return (
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            Historial de Cuotas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <BarChart3 className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Sin apuestas registradas aún
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            Historial de Cuotas
          </CardTitle>
          <Badge variant="secondary">{stats.totalBets} apuestas</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg bg-muted/50 p-3">
            <div className="text-xs text-muted-foreground">Cuota promedio</div>
            <div className="text-lg font-bold">{stats.averageOdds.toFixed(2)}</div>
          </div>
          <div className="rounded-lg bg-chart-2/10 p-3">
            <div className="text-xs text-muted-foreground">Cuota ganadora avg</div>
            <div className="text-lg font-bold text-chart-2">
              {stats.winningOddsAverage.toFixed(2)}
            </div>
          </div>
          <div className="rounded-lg bg-destructive/10 p-3">
            <div className="text-xs text-muted-foreground">Cuota perdedora avg</div>
            <div className="text-lg font-bold text-destructive">
              {stats.losingOddsAverage.toFixed(2)}
            </div>
          </div>
          <div className="rounded-lg bg-primary/10 p-3">
            <div className="text-xs text-muted-foreground">Más usada</div>
            <div className="text-lg font-bold text-primary">
              {stats.mostUsedOdds.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Recent history table */}
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full flex items-center justify-between"
            >
              <span className="text-sm">
                Últimas {Math.min(recentHistory.length, 10)} apuestas
              </span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform",
                  isExpanded && "rotate-180"
                )}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="rounded-md border overflow-x-auto mt-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">Fecha</TableHead>
                    <TableHead className="w-20">Cuota</TableHead>
                    <TableHead className="w-24">Stake</TableHead>
                    <TableHead className="w-20">Resultado</TableHead>
                    <TableHead className="w-24 text-right">P/L</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentHistory.slice(0, 10).map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-xs">
                        {formatDate(entry.date, { weekday: undefined })}
                      </TableCell>
                      <TableCell className="font-medium">
                        {entry.odds.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatCurrency(entry.stake)}
                      </TableCell>
                      <TableCell>
                        {entry.result === "win" ? (
                          <Badge
                            variant="secondary"
                            className="bg-chart-2/20 text-chart-2"
                          >
                            <TrendingUp className="h-3 w-3 mr-1" />
                            Win
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="bg-destructive/20 text-destructive"
                          >
                            <TrendingDown className="h-3 w-3 mr-1" />
                            Loss
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right font-medium",
                          entry.profit >= 0 ? "text-chart-2" : "text-destructive"
                        )}
                      >
                        {formatCurrency(Math.abs(entry.profit), {
                          showSign: true,
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {recentHistory.length > 10 && (
              <p className="text-xs text-muted-foreground text-center mt-2">
                Mostrando 10 de {recentHistory.length} registros
              </p>
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
