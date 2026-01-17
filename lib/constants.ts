/**
 * Constantes centralizadas de la aplicación
 * Evita valores hardcodeados dispersos en el código
 */

// ==========================================
// PAGINACIÓN
// ==========================================
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
} as const;

// ==========================================
// TIMEOUTS Y DELAYS
// ==========================================
export const TIMING = {
  /** Delay para auto-guardar cambios (ms) */
  AUTOSAVE_DELAY: 1000,
  /** Delay para remover toasts (ms) */
  TOAST_REMOVE_DELAY: 5000,
  /** Delay para debounce de búsqueda (ms) */
  SEARCH_DEBOUNCE: 300,
  /** Timeout para operaciones de red (ms) */
  NETWORK_TIMEOUT: 30000,
} as const;

// ==========================================
// LÍMITES DE APUESTAS
// ==========================================
export const BETTING_LIMITS = {
  /** Cuota mínima permitida */
  MIN_ODDS: 1.01,
  /** Cuota máxima permitida */
  MAX_ODDS: 100,
  /** Porcentaje mínimo de stake */
  MIN_STAKE_PERCENTAGE: 1,
  /** Porcentaje máximo de stake */
  MAX_STAKE_PERCENTAGE: 100,
  /** Porcentaje mínimo de reinversión */
  MIN_REINVESTMENT: 0,
  /** Porcentaje máximo de reinversión */
  MAX_REINVESTMENT: 100,
  /** Apuestas mínimas por día */
  MIN_BETS_PER_DAY: 1,
  /** Apuestas máximas por día */
  MAX_BETS_PER_DAY: 10,
  /** Presupuesto mínimo inicial */
  MIN_INITIAL_BUDGET: 0.01,
} as const;

// ==========================================
// VALORES POR DEFECTO
// ==========================================
export const DEFAULT_CONFIG = {
  INITIAL_BUDGET: 25,
  ODDS: 1.6,
  REINVESTMENT_PERCENTAGE: 50,
  BETS_PER_DAY: 1,
  STAKE_PERCENTAGE: 10,
  /** Días por defecto para el plan */
  PLAN_DAYS: 30,
} as const;

// ==========================================
// MEMBRESÍAS
// ==========================================
export const MEMBERSHIP = {
  TIERS: {
    FREE: "FREE",
    PRO: "PRO",
  },
  DURATIONS: {
    ONE_MONTH: "1M",
    TWO_MONTHS: "2M",
    THREE_MONTHS: "3M",
    ONE_YEAR: "1Y",
    LIFETIME: "LIFETIME",
  },
} as const;

// ==========================================
// ALMACENAMIENTO LOCAL
// ==========================================
export const STORAGE_KEYS = {
  GOALS: "bettracker_goals",
  THEME: "theme",
  SIMULATION_MODE: "simulation_mode",
  BANKROLL_ALERTS: "bankroll_alerts",
} as const;

// ==========================================
// API ENDPOINTS (para uso interno)
// ==========================================
export const API_ENDPOINTS = {
  BETTING_DATA: "/api/betting-data",
  SAVED_PLANS: "/api/saved-plans",
  ACHIEVEMENTS: "/api/achievements",
  PUSH_SUBSCRIBE: "/api/push/subscribe",
  PUSH_SEND: "/api/push/send",
} as const;

// ==========================================
// UI / ANIMACIONES
// ==========================================
export const UI = {
  /** Duración de animaciones en ms */
  ANIMATION_DURATION: 200,
  /** Ancho del sidebar en px */
  SIDEBAR_WIDTH: 256,
  /** Altura del bottom nav en px */
  BOTTOM_NAV_HEIGHT: 64,
} as const;

// ==========================================
// VALIDACIÓN
// ==========================================
export const VALIDATION = {
  /** Longitud mínima para nombre de plan */
  MIN_PLAN_NAME_LENGTH: 1,
  /** Longitud máxima para nombre de plan */
  MAX_PLAN_NAME_LENGTH: 100,
  /** Longitud máxima para descripción de meta */
  MAX_GOAL_DESCRIPTION_LENGTH: 200,
} as const;
