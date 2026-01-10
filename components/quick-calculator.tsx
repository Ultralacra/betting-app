"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Calculator } from "lucide-react"

export function QuickCalculator() {
  const [bankroll, setBankroll] = useState<string>("")
  const [stake, setStake] = useState<string>("")
  const [odds, setOdds] = useState<string>("")

  const bankrollNum = Number.parseFloat(bankroll) || 0
  const stakeNum = Number.parseFloat(stake) || 0
  const oddsNum = Number.parseFloat(odds) || 0

  const stakeAmount = (bankrollNum * stakeNum) / 100
  const potentialReturn = stakeAmount * oddsNum
  const profit = potentialReturn - stakeAmount
  const stakePercentage = bankrollNum > 0 ? (stakeAmount / bankrollNum) * 100 : 0

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Calculator className="h-4 w-4 mr-2" />
          Calculadora
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Calculadora Rápida</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="calc-bankroll">Banca Disponible ($)</Label>
            <Input
              id="calc-bankroll"
              type="number"
              step="0.01"
              placeholder="100.00"
              value={bankroll}
              onChange={(e) => setBankroll(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="calc-stake">Porcentaje a Apostar (%)</Label>
            <Input
              id="calc-stake"
              type="number"
              step="0.1"
              placeholder="5"
              value={stake}
              onChange={(e) => setStake(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="calc-odds">Cuota</Label>
            <Input
              id="calc-odds"
              type="number"
              step="0.01"
              placeholder="1.80"
              value={odds}
              onChange={(e) => setOdds(e.target.value)}
            />
          </div>

          <Card className="bg-muted">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Resultados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Monto a Apostar:</span>
                <span className="font-bold">${stakeAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Retorno Total:</span>
                <span className="font-bold">${potentialReturn.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ganancia Neta:</span>
                <span className="font-bold text-accent">${profit.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="text-muted-foreground">Banca Final (si gana):</span>
                <span className="font-bold">${(bankrollNum + profit).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Banca Final (si pierde):</span>
                <span className="font-bold text-destructive">${(bankrollNum - stakeAmount).toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
