import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"

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
        if (password !== TEST_PASSWORD) return null

        return {
          id: "demo-user",
          email: TEST_EMAIL,
          name: "Usuario Demo",
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
