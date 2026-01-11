type SupabaseAuthErrorLike = {
  message?: string
  code?: string
}

const CODE_TO_ES: Record<string, string> = {
  email_not_confirmed: "Tu correo aún no está confirmado. Revisa tu email y confirma tu cuenta.",
  invalid_login_credentials: "Email o contraseña incorrectos.",
  user_already_exists: "Ya existe una cuenta con este email.",
  email_address_not_authorized: "Este email no está autorizado para registrarse.",
  signup_disabled: "El registro está deshabilitado en este momento.",
  over_email_send_rate_limit: "Has solicitado demasiados correos. Intenta nuevamente en unos minutos.",
  same_password: "La nueva contraseña no puede ser igual a la anterior.",
}

const MESSAGE_TO_ES: Array<{ includes: string; es: string }> = [
  {
    includes: "Email not confirmed",
    es: "Tu correo aún no está confirmado. Revisa tu email y confirma tu cuenta.",
  },
  {
    includes: "Invalid login credentials",
    es: "Email o contraseña incorrectos.",
  },
  {
    includes: "User already registered",
    es: "Ya existe una cuenta con este email.",
  },
  {
    includes: "Password should be at least",
    es: "La contraseña es demasiado corta.",
  },
]

export function supabaseAuthErrorToSpanish(error: unknown): string {
  if (!error) return "Ocurrió un error inesperado. Intenta nuevamente."

  const err = error as SupabaseAuthErrorLike
  if (err.code && CODE_TO_ES[err.code]) return CODE_TO_ES[err.code]

  const message = (err.message ?? "").trim()
  if (message) {
    const mapped = MESSAGE_TO_ES.find((m) => message.includes(m.includes))
    if (mapped) return mapped.es
    return message
  }

  return "Ocurrió un error inesperado. Intenta nuevamente."
}
