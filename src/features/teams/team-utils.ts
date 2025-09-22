// src/features/teams/team-utils.ts

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
