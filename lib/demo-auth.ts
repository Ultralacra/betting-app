export const DEMO_CREDENTIALS = {
  email: "demo@bettracker.pro",
  password: "demo123",
} as const

const SESSION_KEY = "demoSession"

export type DemoSession = {
  email: string
  name: string
  createdAt: string
}

export function getDemoSession(): DemoSession | null {
  if (typeof window === "undefined") return null
  const raw = window.localStorage.getItem(SESSION_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as DemoSession
  } catch {
    return null
  }
}

export function isDemoAuthed(): boolean {
  return getDemoSession() !== null
}

export function demoSignIn(email: string, password: string): { ok: boolean; error?: string } {
  if (typeof window === "undefined") return { ok: false, error: "No disponible" }

  const normalizedEmail = email.trim().toLowerCase()
  if (normalizedEmail !== DEMO_CREDENTIALS.email || password !== DEMO_CREDENTIALS.password) {
    return { ok: false, error: "Credenciales inválidas" }
  }

  const session: DemoSession = {
    email: DEMO_CREDENTIALS.email,
    name: "Usuario Demo",
    createdAt: new Date().toISOString(),
  }
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  return { ok: true }
}

export function demoSignOut() {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(SESSION_KEY)
}
