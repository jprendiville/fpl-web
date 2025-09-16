// src/lib/columns.tsx
import type { ReactNode } from "react";

/* ---------------- helpers ---------------- */

const pick =
    (key: string) =>
        (v: unknown): ReactNode =>
            typeof v === "object" && v !== null && key in (v as any)
                ? String((v as any)[key])
                : "";

export type Align = "left" | "right" | "center";

export type ColumnConfig = {
    label?: string;
    hide?: boolean;
    align?: Align;
    sticky?: boolean;
    format?: (v: unknown) => ReactNode;
};

export type ColumnMap = Record<string, ColumnConfig>;

/* number helpers */
export function toNumber(v: unknown): number | null {
    const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
    return Number.isFinite(n) ? n : null;
}
export function formatNumber(v: unknown, digits = 2): ReactNode {
    const n = toNumber(v);
    return n === null ? "" : n.toFixed(digits);
}
export function formatPercent(v: unknown, digits = 2): ReactNode {
    const n = toNumber(v);
    return n === null ? "" : `${n.toFixed(digits)}%`;
}
export function formatCurrency(v: unknown, symbol = "€"): ReactNode {
    const n = toNumber(v);
    if (n === null) return "";
    return `${symbol}${n.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

export function formatPrice(v: unknown, symbol = "€"): ReactNode {
    const n = toNumber(v);
    if (n === null) return "";
    return formatCurrency(n / 10, symbol);
}


/* ---------------- base column map (edit freely) ---------------- */

export const BASE_COLUMN_MAP: ColumnMap = {
    web_name: { label: "Player", sticky: true },

    team: { label: "Team", format: pick("short_name") },

    // If your payload has both `position` and `type`, keep one; here we use `type` → "FWD/MID/DEF/GKP"
    type: { label: "Pos", format: pick("singular_name_short") },
    status: { label: "Status"},

    now_cost: { label: "Price", align: "right", format: (v) => formatPrice(v, "£") },
    total_points: { label: "Total Points", align: "right" },

    selected_by_percent: { label: "Selected", align: "right", format: (v) => formatPercent(v) },
    event_points: { label: "Game Week Points", align: "right" },
    form: { label: "Form", align: "right", format: (v) => formatNumber(v, 2) },
    value_form: { label: "Value Form", align: "right", format: (v) => formatNumber(v, 2) },
    vapm: { label: "VAPM", align: "right", format: (v) => formatNumber(v, 2) },

    // Hide noisy/internal fields if you like:
    url: { hide: true },
    id: { hide: true },
};

/* ---------------- core builders ---------------- */

export function configFor(key: string, overrides?: ColumnMap): ColumnConfig {
    return { ...(BASE_COLUMN_MAP[key] || {}), ...(overrides?.[key] || {}) };
}

export function headerLabel(key: string, overrides?: ColumnMap): string {
    const cfg = configFor(key, overrides);
    if (cfg.label) return cfg.label;
    return snakeToCamel(key);
}

/** Auto alignment if not specified in config */
export function autoAlign(v: unknown): Align {
    if (typeof v === "number") return "right";
    if (typeof v === "boolean") return "center";
    if (typeof v === "string" && /^-?\d+(\.\d+)?$/.test(v.trim())) return "right";
    return "left";
}

/** Generic cell formatter when no custom format is defined */
export function formatCell(v: unknown): ReactNode {
    if (v == null) return "";
    if (typeof v === "boolean") return v ? "✓" : "✕";
    if (typeof v === "number") return String(v);
    if (typeof v === "string") return v;
    if (Array.isArray(v)) return v.join(", ");
    if (typeof v === "object") {
        const s = JSON.stringify(v);
        return <span className="code" title={s}>{truncate(s, 80)}</span>;
    }
    return String(v);
}

/**
 * Build the final column list from data:
 *  - union of keys across rows
 *  - apply hide filters
 *  - apply preferred order (front)
 */
export function buildColumns(
    rows: Array<Record<string, unknown>>,
    preferredOrder?: string[],
    overrides?: ColumnMap
): { columns: string[]; stickyKey: string | undefined } {
    const set = new Set<string>();
    (rows || []).forEach((row) => {
        Object.keys(row || {}).forEach((k) => {
            if (!configFor(k, overrides).hide) set.add(k);
        });
    });
    const all = Array.from(set);

    const front = (preferredOrder || []).filter(
        (k) => all.includes(k) && !configFor(k, overrides).hide
    );
    const rest = all.filter((k) => !front.includes(k));
    const columns = [...front, ...rest];

    const stickyKey = columns.find((k) => !!configFor(k, overrides).sticky) ?? columns[0];
    return { columns, stickyKey };
}

/* ---------------- misc helpers ---------------- */

export function snakeToCamel(s: string): string {
    return s.replace(/_([a-zA-Z0-9])/g, (_, c: string) => c.toUpperCase());
}

export function truncate(s: string, n: number) {
    return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
