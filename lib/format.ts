/**
 * Formatting utilities for currency, dates, and numbers
 */

export function formatCurrency(
    amount: number | undefined | null,
    options?: { showSign?: boolean }
): string {
    if (amount === undefined || amount === null || isNaN(amount)) {
        return "$0.00";
    }

    const formatted = Math.abs(amount).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    if (options?.showSign) {
        return amount >= 0 ? `+$${formatted}` : `-$${formatted}`;
    }

    return `$${formatted}`;
}

export function formatPercentage(
    value: number | undefined | null,
    decimals = 1
): string {
    if (value === undefined || value === null || isNaN(value)) {
        return "0%";
    }
    return `${value.toFixed(decimals)}%`;
}

export function formatNumber(
    value: number | undefined | null,
    decimals = 2
): string {
    if (value === undefined || value === null || isNaN(value)) {
        return "0";
    }
    return value.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });
}

export function formatDate(
    date: Date | string,
    options?: Intl.DateTimeFormatOptions
): string {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("es-ES", {
        weekday: "short",
        month: "short",
        day: "numeric",
        ...options,
    });
}

export function formatTime(date: Date | string): string {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
    });
}

export function formatDateRange(from: Date, to: Date): string {
    const fromStr = formatDate(from, { month: "short", day: "numeric" });
    const toStr = formatDate(to, { month: "short", day: "numeric" });
    return `${fromStr} - ${toStr}`;
}

export function daysFromNow(date: Date | string): number {
    const d = typeof date === "string" ? new Date(date) : date;
    const diff = d.getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function formatRelativeTime(date: Date | string): string {
    const days = daysFromNow(date);

    if (days === 0) return "Hoy";
    if (days === 1) return "Mañana";
    if (days === -1) return "Ayer";
    if (days > 0) return `En ${days} días`;
    return `Hace ${Math.abs(days)} días`;
}
