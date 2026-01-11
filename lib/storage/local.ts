export function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined"
}

export function getItem(key: string): string | null {
  if (!isBrowser()) return null
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

export function setItem(key: string, value: string): void {
  if (!isBrowser()) return
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // ignore
  }
}

export function removeItem(key: string): void {
  if (!isBrowser()) return
  try {
    window.localStorage.removeItem(key)
  } catch {
    // ignore
  }
}

export function getJson<T>(key: string, fallback: T): T {
  const raw = getItem(key)
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function setJson<T>(key: string, value: T): void {
  setItem(key, JSON.stringify(value))
}
