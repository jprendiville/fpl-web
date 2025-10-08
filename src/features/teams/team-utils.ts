// src/features/teams/team-utils.ts

export const FREEZE_KEYS = ["name"] as const;

export interface DRFPage<T> {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
}

/**
 * Normalizes a DRF response so callers can always rely on { results: [...] }.
 * Works for both paginated (object) and unpaginated (array) endpoints.
 */
export function normalizeToPage<T>(data: unknown): DRFPage<T> {
    return Array.isArray(data)
        ? { count: data.length, next: null, previous: null, results: data as T[] }
        : (data as DRFPage<T>);
}

export function getFdrColors(): Record<number, string> {
    const styles = getComputedStyle(document.documentElement);
    return {
        2: styles.getPropertyValue("--fdr-easy").trim(),
        3: styles.getPropertyValue("--fdr-neutral").trim(),
        4: styles.getPropertyValue("--fdr-hard").trim(),
        5: styles.getPropertyValue("--fdr-very-hard").trim(),
    };
}