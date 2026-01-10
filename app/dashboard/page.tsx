import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getBettingData } from "@/lib/db"
import { DashboardClient } from "@/components/dashboard-client"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect("/login")

  const userId = session.user.id

  const user = {
    id: userId,
    email: session.user.email ?? null,
    name: session.user.name ?? null,
    membershipTier: "FREE" as const,
    membershipExpiresAt: null,
  }

  const bettingData = getBettingData(userId)

  return (
    <DashboardClient
      user={user}
      initialBettingData={bettingData}
      initialSavedPlans={[]}
    />
  )
}
