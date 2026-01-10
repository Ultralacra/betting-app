export type ThemeMode = "light" | "dark"

export type BettingDataDTO = {
  configJson: string | null
  planJson: string | null
  currentBalance: number | null
  theme: ThemeMode
}

const bettingDataByUserId = new Map<string, BettingDataDTO>()

export function getBettingData(userId: string): BettingDataDTO {
  return (
    bettingDataByUserId.get(userId) ?? {
      configJson: null,
      planJson: null,
      currentBalance: null,
      theme: "light",
    }
  )
}

export function upsertBettingData(
  userId: string,
  data: {
    configJson: string | null
    planJson: string | null
    currentBalance: number | null
    theme: ThemeMode
  }
): void {
  bettingDataByUserId.set(userId, {
    configJson: data.configJson,
    planJson: data.planJson,
    currentBalance: data.currentBalance,
    theme: data.theme,
  })
}
