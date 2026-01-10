import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = (await req.json()) as {
    configJson: string | null
    planJson: string | null
    currentBalance: number
    theme: "light" | "dark"
  }

  await prisma.bettingData.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      configJson: body.configJson,
      planJson: body.planJson,
      currentBalance: body.currentBalance,
      theme: body.theme,
    },
    update: {
      configJson: body.configJson,
      planJson: body.planJson,
      currentBalance: body.currentBalance,
      theme: body.theme,
    },
  })

  return NextResponse.json({ ok: true })
}
