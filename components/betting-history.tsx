"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { History, ArrowUp, ArrowDown, Plus, Minus } from "lucide-react";
import type { DayResult } from "@/lib/betting-types";

interface HistoryEvent {
  type: "bet" | "recharge" | "withdrawal";
  date: string;
  day?: number;
  amount: number;
  result?: "win" | "lose";
  balance: number;
  description: string;
}

interface BettingHistoryProps {
  plan: DayResult[];
  initialBudget: number;
}

export function BettingHistory({ plan, initialBudget }: BettingHistoryProps) {
  const events: HistoryEvent[] = [];

  // Agregar evento inicial
  events.push({
    type: "recharge",
    date: plan[0]?.date || new Date().toISOString().split("T")[0],
    amount: initialBudget,
    balance: initialBudget,
    description: "Presupuesto inicial",
  });

  // Agregar apuestas completadas
  plan.forEach((day) => {
    if (day.result === "completed") {
      day.bets?.forEach((bet) => {
        if (bet.result) {
          const profit =
            bet.result === "win" ? bet.potentialWin - bet.stake : -bet.stake;
          events.push({
            type: "bet",
            date: day.date,
            day: day.day,
            amount: bet.stake,
            result: bet.result,
            balance: day.balanceAfterDay,
            description: `Apuesta @ ${bet.odds.toFixed(2)} - ${
              bet.result === "win" ? "Ganada" : "Perdida"
            }`,
          });
        }
      });
    }
  });

  events.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-4 w-4" />
          Historial de Movimientos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-75 pr-4">
          <div className="space-y-3">
            {events.map((event, index) => (
              <div
                key={index}
                className="flex flex-col gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="flex items-start gap-3 flex-1">
                  <div
                    className={`mt-0.5 p-1.5 rounded-full ${
                      event.type === "recharge"
                        ? "bg-blue-500/10"
                        : event.type === "withdrawal"
                        ? "bg-orange-500/10"
                        : event.result === "win"
                        ? "bg-accent/10"
                        : "bg-red-500/10"
                    }`}
                  >
                    {event.type === "recharge" && (
                      <Plus className="h-3 w-3 text-blue-500" />
                    )}
                    {event.type === "withdrawal" && (
                      <Minus className="h-3 w-3 text-orange-500" />
                    )}
                    {event.type === "bet" && event.result === "win" && (
                      <ArrowUp className="h-3 w-3 text-accent" />
                    )}
                    {event.type === "bet" && event.result === "lose" && (
                      <ArrowDown className="h-3 w-3 text-red-500" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{event.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-muted-foreground">
                        {new Date(event.date).toLocaleDateString()}
                        {event.day && ` - Día ${event.day}`}
                      </p>
                      {event.result && (
                        <Badge
                          variant={
                            event.result === "win" ? "default" : "destructive"
                          }
                          className="text-xs"
                        >
                          {event.result === "win" ? "W" : "L"}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <p
                    className={`text-sm font-bold ${
                      event.type === "bet" && event.result === "win"
                        ? "text-accent"
                        : event.type === "bet" && event.result === "lose"
                        ? "text-red-500"
                        : "text-foreground"
                    }`}
                  >
                    ${event.amount.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Balance: ${event.balance.toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
