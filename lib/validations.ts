/**
 * Esquemas de validación con Zod para la aplicación
 * Uso compartido entre cliente y servidor
 */
import { z } from "zod";
import { BETTING_LIMITS, VALIDATION } from "./constants";

// ==========================================
// ESQUEMAS BASE
// ==========================================

/** Esquema para configuración de apuestas */
export const BettingConfigSchema = z.object({
  initialBudget: z
    .number()
    .min(BETTING_LIMITS.MIN_INITIAL_BUDGET, "El presupuesto debe ser mayor a 0"),
  odds: z
    .number()
    .min(BETTING_LIMITS.MIN_ODDS, `La cuota mínima es ${BETTING_LIMITS.MIN_ODDS}`)
    .max(BETTING_LIMITS.MAX_ODDS, `La cuota máxima es ${BETTING_LIMITS.MAX_ODDS}`),
  reinvestmentPercentage: z
    .number()
    .min(BETTING_LIMITS.MIN_REINVESTMENT, "El porcentaje debe ser al menos 0%")
    .max(BETTING_LIMITS.MAX_REINVESTMENT, "El porcentaje no puede superar 100%"),
  betsPerDay: z
    .number()
    .int("Debe ser un número entero")
    .min(BETTING_LIMITS.MIN_BETS_PER_DAY, "Mínimo 1 apuesta por día")
    .max(BETTING_LIMITS.MAX_BETS_PER_DAY, `Máximo ${BETTING_LIMITS.MAX_BETS_PER_DAY} apuestas por día`),
  stakePercentage: z
    .number()
    .min(BETTING_LIMITS.MIN_STAKE_PERCENTAGE, "El stake mínimo es 1%")
    .max(BETTING_LIMITS.MAX_STAKE_PERCENTAGE, "El stake máximo es 100%"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)"),
});

export type BettingConfigInput = z.infer<typeof BettingConfigSchema>;

/** Esquema para apuesta individual */
export const IndividualBetSchema = z.object({
  id: z.string(),
  stakePercentage: z.number(),
  stake: z.number(),
  odds: z.number().min(BETTING_LIMITS.MIN_ODDS),
  potentialWin: z.number(),
  result: z.enum(["win", "lose"]).nullable(),
});

/** Esquema para resultado de día */
export const DayResultSchema = z.object({
  day: z.number().int().positive(),
  date: z.string(),
  bets: z.array(IndividualBetSchema),
  currentBalance: z.number(),
  totalStake: z.number(),
  totalPotentialWin: z.number(),
  balanceAfterDay: z.number(),
  result: z.enum(["win", "lose", "partial"]).nullable(),
});

// ==========================================
// ESQUEMAS PARA APIs
// ==========================================

/** Esquema para guardar datos de apuestas */
export const BettingDataSchema = z.object({
  configJson: z.string().nullable(),
  planJson: z.string().nullable(),
  currentBalance: z.number().nullable(),
  theme: z.enum(["light", "dark"]).nullable().optional(),
});

export type BettingDataInput = z.infer<typeof BettingDataSchema>;

/** Esquema para guardar un plan */
export const SavePlanSchema = z.object({
  id: z.string().optional(),
  name: z
    .string()
    .min(VALIDATION.MIN_PLAN_NAME_LENGTH, "El nombre es requerido")
    .max(VALIDATION.MAX_PLAN_NAME_LENGTH, `Máximo ${VALIDATION.MAX_PLAN_NAME_LENGTH} caracteres`),
  configJson: z.string(),
  planJson: z.string(),
});

export type SavePlanInput = z.infer<typeof SavePlanSchema>;

/** Esquema para suscripción push */
export const PushSubscriptionSchema = z.object({
  endpoint: z.string().url("Endpoint inválido"),
  keys: z.object({
    p256dh: z.string().min(1, "Clave p256dh requerida"),
    auth: z.string().min(1, "Clave auth requerida"),
  }),
  expirationTime: z.number().nullable().optional(),
});

export type PushSubscriptionInput = z.infer<typeof PushSubscriptionSchema>;

/** Esquema para enviar notificación push */
export const PushSendSchema = z.object({
  title: z.string().min(1, "Título requerido").max(100, "Título muy largo"),
  body: z.string().min(1, "Mensaje requerido").max(500, "Mensaje muy largo"),
  targetUserIds: z.array(z.string().uuid()).optional(),
  url: z.string().url().optional(),
});

export type PushSendInput = z.infer<typeof PushSendSchema>;

// ==========================================
// ESQUEMAS PARA ADMIN
// ==========================================

/** Esquema para actualizar usuario (admin) */
export const AdminUpdateUserSchema = z.object({
  userId: z.string().uuid("ID de usuario inválido"),
  membershipTier: z.enum(["FREE", "PRO"]).optional(),
  membershipDuration: z.enum(["1M", "2M", "3M", "1Y", "LIFETIME"]).nullable().optional(),
  role: z.enum(["ADMIN", "MEMBER"]).optional(),
});

export type AdminUpdateUserInput = z.infer<typeof AdminUpdateUserSchema>;

/** Esquema para crear/actualizar logro */
export const AchievementSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Título requerido").max(100),
  description: z.string().min(1, "Descripción requerida").max(500),
  icon: z.string().min(1, "Icono requerido"),
  category: z.enum(["streak", "milestone", "special", "daily"]),
  condition: z.string().optional(),
  threshold: z.number().int().positive().optional(),
  rarity: z.enum(["common", "rare", "epic", "legendary"]).default("common"),
  isActive: z.boolean().default(true),
});

export type AchievementInput = z.infer<typeof AchievementSchema>;

// ==========================================
// ESQUEMAS PARA METAS (GOALS)
// ==========================================

export const GoalSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Nombre requerido").max(VALIDATION.MAX_GOAL_DESCRIPTION_LENGTH),
  targetAmount: z.number().positive("El monto debe ser positivo"),
  currentAmount: z.number().min(0),
  createdAt: z.string(),
  targetDate: z.string().optional(),
  category: z.string().optional(),
});

export type GoalInput = z.infer<typeof GoalSchema>;

// ==========================================
// HELPERS DE VALIDACIÓN
// ==========================================

/**
 * Valida datos con un esquema Zod y retorna resultado tipado
 */
export function validateWithSchema<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Formatea errores de Zod para mostrar al usuario
 */
export function formatZodErrors(error: z.ZodError): string[] {
  return error.errors.map((err) => {
    const path = err.path.join(".");
    return path ? `${path}: ${err.message}` : err.message;
  });
}
