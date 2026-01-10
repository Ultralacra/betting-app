import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { DashboardClient } from "@/components/dashboard-client"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect("/login")

  const userId = session.user.id

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      membershipTier: true,
      membershipExpiresAt: true,
    },
  })

  const bettingData = await prisma.bettingData.findUnique({
    where: { userId },
    select: { configJson: true, planJson: true, currentBalance: true, theme: true },
  })

  const savedPlans = await prisma.savedPlan.findMany({
    where: { userId },
    select: { id: true, name: true, configJson: true, planJson: true, savedAt: true },
    orderBy: { savedAt: "desc" },
  })

  return (
    <DashboardClient
      user={user}
      initialBettingData={bettingData ?? { configJson: null, planJson: null, currentBalance: null, theme: "light" }}
      initialSavedPlans={savedPlans}
    />
  )
}
