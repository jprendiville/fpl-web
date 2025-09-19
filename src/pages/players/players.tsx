// src/pages/players/players.tsx
import type React from "react";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import {
    type ColumnMap,
    buildColumnsOnly,
    configFor,
    headerLabel,
    autoAlign,
    formatCell,
} from "../../lib/columns";
import "../../styles/table.css";
import { FREEZE_KEYS, COL_WIDTH_CLASS } from "../../features/players/player-utils";
import { usePlayerParams } from "../../features/players/player-params";
import PaginationBar from "../../components/paginationbar";

type AnyRow = Record<string, unknown>;
type DRFPage<T> = { count: number; next: string | null; previous: string | null; results: T[] };

const ENDPOINT = "/v1/players/";

// Show ONLY these fields (in this order)
const PLAYERS_ONLY = [
    "web_name",
    "status",
    "team",
    "type",
    "form",
    "now_cost",
    "total_points",
    "bonus",
    "ep_next",
    "vapm",
];

// Page-specific tweaks (labels/formatters/align). Omit `label` to use base/camelCase.
const PLAYERS_PAGE_OVERRIDES: ColumnMap = {
    web_name: {},
};

export default function PlayersPage() {
    const {
        page, fType, fTeam, fStatus, fMaxPriceUi, fMaxCostTenths,
        setParam, goPage, goFirst, goLast, clearFilters
    } = usePlayerParams();

    // ---- Data: players list ----
    const { data, isLoading, isError, error } = useQuery({
        queryKey: ["players", page, fType, fTeam, fStatus, fMaxPriceUi],
        queryFn: async (): Promise<DRFPage<AnyRow>> => {
            const resp = await api.get(ENDPOINT, {
                params: {
                    page,
                    ...(fType ? { player_type: fType } : {}),
                    ...(fTeam ? { player_team: fTeam } : {}),
                    ...(fStatus ? { status: fStatus } : {}),
                    ...(Number.isFinite(fMaxCostTenths) ? { max_cost: fMaxCostTenths } : {}),
                },
            });
            return resp.data;
        },
        keepPreviousData: true,
    });

    const rows = data?.results ?? [];

    // Build columns strictly from whitelist
    const { columns } = buildColumnsOnly(rows, PLAYERS_ONLY, PLAYERS_PAGE_OVERRIDES, { keepMissing: true });

    // ---- Options: fetch all Teams & Types from dedicated endpoints (fallback to current page if needed) ----
    // Teams
    const { data: teamsApi } = useQuery({
        queryKey: ["teams-options"],
        queryFn: async (): Promise<DRFPage<any>> => {
            try {
                const r = await api.get("/v1/teams/", { params: { page_size: 200 } });
                return r.data;
            } catch {
                try {
                    const r2 = await api.get("/v1/clubs/", { params: { page_size: 200 } });
                    return r2.data;
                } catch {
                    return { count: 0, next: null, previous: null, results: [] };
                }
            }
        },
        staleTime: 5 * 60 * 1000,
    });

    const teamOptions = useMemo(() => {
        const list = teamsApi?.results ?? [];
        if (list.length) {
            return list.map((t: any) => ({
                id: t.id,
                label: t.short_name || t.name || String(t.id),
            }));
        }
        // fallback: derive from current page rows
        const seen = new Map<number, string>();
        rows.forEach((r: AnyRow) => {
            const t = r["team"] as any;
            if (t && typeof t.id === "number") seen.set(t.id, t.short_name || t.name || String(t.id));
        });
        return Array.from(seen, ([id, label]) => ({ id, label }));
    }, [teamsApi, rows]);

    // Element Types / Positions
    const { data: typesApi } = useQuery({
        queryKey: ["types-options"],
        queryFn: async (): Promise<DRFPage<any>> => {
            try {
                const r = await api.get("/v1/element-types/", { params: { page_size: 50 } });
                return r.data;
            } catch {
                try {
                    const r2 = await api.get("/v1/types/", { params: { page_size: 50 } });
                    return r2.data;
                } catch {
                    return { count: 0, next: null, previous: null, results: [] };
                }
            }
        },
        staleTime: 5 * 60 * 1000,
    });

    const typeOptions = useMemo(() => {
        const list = typesApi?.results ?? [];
        if (list.length) {
            return list.map((t: any) => ({
                id: t.id,
                label: t.singular_name_short || t.singular_name || t.name || String(t.id),
            }));
        }
        // fallback: derive from current page rows
        const seen = new Map<number, string>();
        rows.forEach((r: AnyRow) => {
            const t = r["type"] as any;
            if (t && typeof t.id === "number") seen.set(t.id, t.singular_name_short || t.singular_name || String(t.id));
        });
        return Array.from(seen, ([id, label]) => ({ id, label }));
    }, [typesApi, rows]);

    // Derive page size from next/prev if present; fallback 20
    const pageSize = (() => {
        const fallback = 20;
        try {
            const url = new URL(data?.next || data?.previous || "", location.origin);
            const p = url.searchParams.get("page_size") || url.searchParams.get("limit");
            return p ? Number(p) : fallback;
        } catch {
            return fallback;
        }
    })();

    const totalPages = data?.count ? Math.max(1, Math.ceil(data.count / pageSize)) : undefined;
    const canGoPrev = page > 1 && !isLoading;
    const canGoNext = !isLoading && (typeof totalPages === "number" ? page < totalPages : !!data?.next);
    const canGoFirst = canGoPrev;
    const canGoLast = typeof totalPages === "number" && page < totalPages && !isLoading;

    return (
        <main className="mx-auto max-w-6xl px-4 py-10">
            {/* Toolbar: title + filters in one line */}
            <div className="page-toolbar" role="region" aria-label="Players filters">
                <h1 className="page-title">Players</h1>

                <div className="filters-row">
                    {/* Position */}
                    <label>
                        <span style={{ fontSize: 12, color: "#374151" }}>Position</span>
                        <select
                            value={fType}
                            onChange={(e) => setParam("player_type", e.target.value || undefined)}
                            style={selectStyle}
                        >
                            <option value="">All</option>
                            {typeOptions.map(o => (
                                <option key={o.id} value={o.id}>{o.label}</option>
                            ))}
                        </select>
                    </label>

                    {/* Team */}
                    <label>
                        <span style={{ fontSize: 12, color: "#374151" }}>Team</span>
                        <select
                            value={fTeam}
                            onChange={(e) => setParam("player_team", e.target.value || undefined)}
                            style={selectStyle}
                        >
                            <option value="">All</option>
                            {teamOptions.map(o => (
                                <option key={o.id} value={o.id}>{o.label}</option>
                            ))}
                        </select>
                    </label>

                    {/* Status */}
                    <label>
                        <span style={{ fontSize: 12, color: "#374151" }}>Status</span>
                        <select
                            value={fStatus}
                            onChange={(e) => setParam("status", e.target.value || undefined)}
                            style={selectStyle}
                        >
                            <option value="">All</option>
                            <option value="a">Available</option>
                            <option value="d">Doubtful</option>
                            <option value="i">Injured</option>
                            <option value="s">Suspended</option>
                            <option value="u">Unavailable</option>
                        </select>
                    </label>

                    {/* Max price (m) */}
                    <label>
                        <span style={{ fontSize: 12, color: "#374151" }}>Max price (m)</span>
                        <input
                            type="number"
                            step="0.1"
                            min="3.5"
                            value={fMaxPriceUi}
                            onChange={(e) => setParam("max_cost", e.target.value ? e.target.value : undefined)}
                            placeholder="e.g. 6.5"
                            style={inputStyle}
                        />
                    </label>

                    {/* Clear */}
                    <button onClick={clearFilters} style={btnStyle}>Clear filters</button>

                </div>
            </div>

            {/* ---- Table ---- */}
            <div className="table-wrap">
                <div className="table-scroll">
                    <table className="data">
                        {/* keep a semantic thead for screen readers only */}
                        <thead className="sr-only-thead">
                        <tr>
                            {columns.map((c) => (
                                <th key={c}>{headerLabel(c, PLAYERS_PAGE_OVERRIDES)}</th>
                            ))}
                        </tr>
                        </thead>

                        <tbody>
                        {/* FAKE sticky header that behaves like body cells */}
                        <tr className="fake-header">
                            {columns.map((c) => {
                                const cfg = configFor(c, PLAYERS_PAGE_OVERRIDES);
                                const align = cfg.align ?? autoAlign(rows[0]?.[c]);
                                const alignCls = align === "right" ? "num" : align === "center" ? "center" : "";

                                // ✅ use the imported constants
                                const i = FREEZE_KEYS.indexOf(c as any);
                                const freeze = i >= 0 ? `freeze-${i}` : "";
                                const widthCls = COL_WIDTH_CLASS[c] || "";

                                return (
                                    <td
                                        key={c}
                                        className={["fake-th", alignCls, freeze, widthCls].join(" ").trim()}
                                    >
                                        {headerLabel(c, PLAYERS_PAGE_OVERRIDES)}
                                    </td>
                                );
                            })}
                        </tr>

                        {/* DATA ROWS */}
                        {rows.map((row, idx) => (
                            <tr key={idx}>
                                {columns.map((c) => {
                                    const cfg = configFor(c, PLAYERS_PAGE_OVERRIDES);
                                    const v = (row as AnyRow)[c];
                                    const align = cfg.align ?? autoAlign(v);
                                    const alignCls = align === "right" ? "num" : align === "center" ? "center" : "";
                                    const rendered = cfg.format ? cfg.format(v) : formatCell(v);

                                    // ✅ use the imported constants
                                    const i = FREEZE_KEYS.indexOf(c as any);
                                    const freeze = i >= 0 ? `freeze-${i}` : "";
                                    const widthCls = COL_WIDTH_CLASS[c] || "";

                                    return (
                                        <td key={c} className={[alignCls, freeze, widthCls].join(" ").trim()}>
                                            {rendered}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}


                        {!rows.length && (
                            <tr>
                                <td colSpan={columns.length} style={{ padding: 16 }}>
                                    No results
                                </td>
                            </tr>
                        )}
                        </tbody>
                    </table>
                </div>
            </div>


            {/* ---- Pagination ---- */}
            <PaginationBar
                page={page}
                totalPages={typeof totalPages === "number" ? totalPages : undefined}
                canGoFirst={canGoFirst}
                canGoPrev={canGoPrev}
                canGoNext={canGoNext}
                canGoLast={canGoLast}
                onFirst={goFirst}
                onPrev={() => goPage(Math.max(1, page - 1))}
                onNext={() => goPage(page + 1)}
                onLast={() => goLast(totalPages)}
            />
        </main>
    );
}

/* ---------- helpers & local styles ---------- */
const selectStyle: React.CSSProperties = {
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: "6px 10px",
    fontSize: 13,
    background: "var(--bg)",
};
const inputStyle = selectStyle;

const btnStyle: React.CSSProperties = {
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: "6px 10px",
    fontSize: 13,
    background: "var(--bg)",
    cursor: "pointer",
};
