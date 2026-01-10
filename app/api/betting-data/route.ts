import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { upsertBettingData, type ThemeMode } from "@/lib/db"

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = (await req.json()) as {
    configJson: string | null
    planJson: string | null
    currentBalance: number | null
    theme: ThemeMode
  }

  upsertBettingData(session.user.id, {
    configJson: body.configJson,
    planJson: body.planJson,
    currentBalance: body.currentBalance,
    theme: body.theme,
  })

  return NextResponse.json({ ok: true })
}
