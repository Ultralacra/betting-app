export interface BettingConfig {
  initialBudget: number
  odds: number
  reinvestmentPercentage: number
  betsPerDay: number
  stakePercentage: number
  startDate: string
  endDate: string
}

export interface IndividualBet {
  id: string
  stakePercentage: number
  stake: number
  odds: number
  potentialWin: number
  result?: "win" | "lose" | null
}

export interface DayResult {
  day: number
  date: string
  bets: IndividualBet[]
  currentBalance: number
  totalStake: number
  totalPotentialWin: number
  balanceAfterDay: number
  result?: "completed" | null
}
