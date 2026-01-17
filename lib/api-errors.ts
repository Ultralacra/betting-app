/**
 * Utilidades para manejo de errores en APIs
 * Proporciona formato consistente y helpers
 */
import { NextResponse } from "next/server";
import { ZodError } from "zod";

// ==========================================
// TIPOS DE ERROR
// ==========================================

export interface ApiErrorResponse {
  error: string;
  code: ApiErrorCode;
  details?: unknown;
  timestamp?: string;
}

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "PLAN_LIMIT_REACHED"
  | "INTERNAL_ERROR"
  | "BAD_REQUEST"
  | "SERVICE_UNAVAILABLE";

// ==========================================
// CLASE DE ERROR PERSONALIZADA
// ==========================================

export class ApiError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
    public readonly statusCode: number = 500,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }

  toResponse(): NextResponse<ApiErrorResponse> {
    return NextResponse.json(
      {
        error: this.message,
        code: this.code,
        details: this.details,
        timestamp: new Date().toISOString(),
      },
      { status: this.statusCode }
    );
  }
}

// ==========================================
// ERRORES PREDEFINIDOS
// ==========================================

export const Errors = {
  /** Error de validación (400) */
  validation: (details?: unknown) =>
    new ApiError("VALIDATION_ERROR", "Datos de entrada inválidos", 400, details),

  /** No autenticado (401) */
  unauthorized: (message = "No autenticado") =>
    new ApiError("UNAUTHORIZED", message, 401),

  /** Sin permisos (403) */
  forbidden: (message = "No tienes permisos para esta acción") =>
    new ApiError("FORBIDDEN", message, 403),

  /** Recurso no encontrado (404) */
  notFound: (resource = "Recurso") =>
    new ApiError("NOT_FOUND", `${resource} no encontrado`, 404),

  /** Conflicto (409) */
  conflict: (message: string) =>
    new ApiError("CONFLICT", message, 409),

  /** Límite de plan alcanzado (403) */
  planLimitReached: (details: { current: number; max: number }) =>
    new ApiError(
      "PLAN_LIMIT_REACHED",
      `Has alcanzado el límite de ${details.max} planes`,
      403,
      details
    ),

  /** Rate limiting (429) */
  rateLimited: (retryAfter?: number) =>
    new ApiError(
      "RATE_LIMITED",
      "Demasiadas solicitudes, intenta más tarde",
      429,
      retryAfter ? { retryAfter } : undefined
    ),

  /** Error interno (500) */
  internal: (message = "Error interno del servidor") =>
    new ApiError("INTERNAL_ERROR", message, 500),

  /** Servicio no disponible (503) */
  serviceUnavailable: (message = "Servicio temporalmente no disponible") =>
    new ApiError("SERVICE_UNAVAILABLE", message, 503),

  /** Bad request genérico (400) */
  badRequest: (message: string) =>
    new ApiError("BAD_REQUEST", message, 400),
};

// ==========================================
// HELPERS
// ==========================================

/**
 * Convierte un ZodError a respuesta de API
 */
export function zodErrorToResponse(error: ZodError): NextResponse<ApiErrorResponse> {
  const formattedErrors = error.errors.map((err) => ({
    field: err.path.join("."),
    message: err.message,
  }));

  return Errors.validation(formattedErrors).toResponse();
}

/**
 * Handler genérico para capturar errores en rutas de API
 */
export function handleApiError(error: unknown): NextResponse<ApiErrorResponse> {
  // Error conocido de la API
  if (error instanceof ApiError) {
    return error.toResponse();
  }

  // Error de validación de Zod
  if (error instanceof ZodError) {
    return zodErrorToResponse(error);
  }

  // Error genérico de JavaScript
  if (error instanceof Error) {
    console.error("[API Error]:", error.message, error.stack);
    return Errors.internal(
      process.env.NODE_ENV === "development" ? error.message : undefined
    ).toResponse();
  }

  // Error desconocido
  console.error("[API Unknown Error]:", error);
  return Errors.internal().toResponse();
}

/**
 * Wrapper para rutas de API que captura errores automáticamente
 */
export function withErrorHandling<T>(
  handler: () => Promise<NextResponse<T>>
): Promise<NextResponse<T | ApiErrorResponse>> {
  return handler().catch(handleApiError);
}

/**
 * Respuesta exitosa estandarizada
 */
export function successResponse<T>(data: T, status = 200): NextResponse<T> {
  return NextResponse.json(data, { status });
}

/**
 * Respuesta vacía exitosa (204)
 */
export function noContentResponse(): NextResponse {
  return new NextResponse(null, { status: 204 });
}
