/**
 * Centralized API client for all fetch requests
 */

export class ApiError extends Error {
    constructor(
        message: string,
        public status: number,
        public details?: unknown
    ) {
        super(message);
        this.name = "ApiError";
    }
}

export async function apiJson<T>(
    url: string,
    init?: RequestInit
): Promise<T> {
    const { headers, ...restInit } = init ?? {};

    const res = await fetch(url, {
        credentials: "include",
        cache: "no-store",
        ...restInit,
        headers: {
            "Content-Type": "application/json",
            ...(headers ?? {}),
        },
    });

    if (!res.ok) {
        let errorMessage = `HTTP ${res.status}`;
        let details: unknown = null;

        try {
            const body = await res.json();
            errorMessage = body?.error ?? body?.message ?? errorMessage;
            details = body;
        } catch {
            const text = await res.text().catch(() => "");
            if (text) errorMessage = text;
        }

        throw new ApiError(errorMessage, res.status, details);
    }

    return (await res.json()) as T;
}

export async function apiGet<T>(url: string): Promise<T> {
    return apiJson<T>(url, { method: "GET" });
}

export async function apiPost<T>(url: string, body?: unknown): Promise<T> {
    return apiJson<T>(url, {
        method: "POST",
        body: body ? JSON.stringify(body) : undefined,
    });
}

export async function apiPatch<T>(url: string, body?: unknown): Promise<T> {
    return apiJson<T>(url, {
        method: "PATCH",
        body: body ? JSON.stringify(body) : undefined,
    });
}

export async function apiDelete<T>(url: string): Promise<T> {
    return apiJson<T>(url, { method: "DELETE" });
}
