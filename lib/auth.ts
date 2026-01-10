import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"

const TEST_EMAIL = "test@bettracker.pro"
const TEST_PASSWORD = "123456"

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      name: "Credenciales",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase()
        const password = credentials?.password ?? ""

        if (!email || !password) return null

        // Login de pruebas: solo habilitamos el usuario de test.
        if (email !== TEST_EMAIL) return null

        let user = await prisma.user.findUnique({ where: { email } })

        if (!user) {
          const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10)
          user = await prisma.user.create({
            data: {
              email,
              name: "Usuario Demo",
              passwordHash,
              membershipTier: "FREE",
            },
          })
          await prisma.bettingData.create({
            data: {
              userId: user.id,
              theme: "light",
            },
          })
        }

        if (!user.passwordHash) return null
        const ok = await bcrypt.compare(password, user.passwordHash)
        if (!ok) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) token.sub = user.id
      return token
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        ;(session.user as { id: string }).id = token.sub
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
}

export const testCredentials = {
  email: TEST_EMAIL,
  password: TEST_PASSWORD,
}
