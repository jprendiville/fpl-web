// src/components/playertable.tsx
import type React from "react";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import {
    type ColumnMap,
    buildColumnsOnly,
    configFor,
    headerLabel,
    autoAlign,
    formatCell,
} from "../lib/columns";
import "../styles/global.css";
import "../styles/table.css";
import { FREEZE_KEYS, COL_WIDTH_CLASS } from "../features/players/player-utils";
import { usePlayerParams } from "../features/players/player-params";
import PaginationBar from "./paginationbar";
import { normalizeToPage, getFdrColors } from "../features/teams/team-utils";
import PlayerHistoryModal from "../pages/players/player-history";

type AnyRow = Record<string, unknown>;
type DRFPage<T> = { count: number; next: string | null; previous: string | null; results: T[] };

const FDR_COLORS = getFdrColors();

interface PlayerTableProps {
    endpoint: string;
    title: string;
    columnsToShow: string[];
    columnOverrides?: ColumnMap;
}

export default function PlayerTable({
                                        endpoint,
                                        title,
                                        columnsToShow,
                                        columnOverrides = {},
                                    }: PlayerTableProps) {
    const {
        page,
        fType,
        fTeam,
        fStatus,
        fMaxPriceUi,
        fMaxCostTenths,
        setParam,
        goPage,
        goFirst,
        goLast,
        clearFilters,
    } = usePlayerParams();

    // ---- Data: players list ----
    const { data, isLoading } = useQuery({
        queryKey: ["players", endpoint, page, fType, fTeam, fStatus, fMaxPriceUi],
        queryFn: async (): Promise<DRFPage<AnyRow>> => {
            const resp = await api.get(endpoint, {
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
    const { columns } = buildColumnsOnly(
        rows,
        columnsToShow,
        columnOverrides,
        { keepMissing: true }
    );

    // ---- Data: upcoming events (for headers) ----
    const { data: events } = useQuery({
        queryKey: ["upcoming-events"],
        queryFn: async (): Promise<any[]> => {
            const r = await api.get("/v1/events/upcoming/");
            return r.data;
        },
        staleTime: 5 * 60 * 1000,
    });

    // ---- Options: fetch all Teams (unpaginated) ----
    const { data: teamsApi } = useQuery({
        queryKey: ["teams-options"],
        queryFn: async (): Promise<DRFPage<any>> => {
            const r = await api.get("/v1/teams/");
            return normalizeToPage(r.data);
        },
        staleTime: 5 * 60 * 1000,
    });

    // Team filter options
    const teamOptions = useMemo(() => {
        const list = teamsApi?.results ?? [];
        if (list.length) {
            return list.map((t: any) => ({
                id: t.id,
                label: t.short_name || t.name || String(t.id),
            }));
        }
        // fallback from rows
        const seen = new Map<number, string>();
        rows.forEach((r: AnyRow) => {
            const t = r["team"] as any;
            if (t && typeof t.id === "number")
                seen.set(t.id, t.short_name || t.name || String(t.id));
        });
        return Array.from(seen, ([id, label]) => ({ id, label }));
    }, [teamsApi, rows]);

    // ---- Options: fetch all Element Types (unpaginated) ----
    const { data: typesApi } = useQuery({
        queryKey: ["types-options"],
        queryFn: async (): Promise<DRFPage<any>> => {
            const r = await api.get("/v1/element-types/");
            return r.data;
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
        // fallback from rows
        const seen = new Map<number, string>();
        rows.forEach((r: AnyRow) => {
            const t = r["type"] as any;
            if (t && typeof t.id === "number")
                seen.set(t.id, t.singular_name_short || t.singular_name || String(t.id));
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

    const totalPages =
        data?.count ? Math.max(1, Math.ceil(data.count / pageSize)) : undefined;
    const canGoPrev = page > 1 && !isLoading;
    const canGoNext =
        !isLoading && (typeof totalPages === "number" ? page < totalPages : !!data?.next);
    const canGoFirst = canGoPrev;
    const canGoLast = typeof totalPages === "number" && page < totalPages && !isLoading;

    // ---- Player history modal state ----
    const [hist, setHist] = useState<{ id: number; summary: any } | null>(null);

    function openHistory(row: AnyRow) {
        const teamObj = row["team"] as any;
        const typeObj = row["type"] as any;

        setHist({
            id: Number(row["id"]),
            summary: {
                name: (row["web_name"] as string) || "",
                team: teamObj?.short_name || teamObj?.name || "",
                type: typeObj?.singular_name_short || typeObj?.singular_name || "",
                now_cost: row["now_cost"],
                total_points: row["total_points"],
                form: row["form"],
                vapm: row["vapm"],
                ep_next: row["ep_next"],
            },
        });
    }

    return (
        <main className="mx-auto max-w-6xl px-4 page--compact">
            {/* Toolbar: title + filters in one line */}
            <div className="page-toolbar" role="region" aria-label="Players filters">
                <h1 className="page-title">{title}</h1>

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
                            {typeOptions.map((o) => (
                                <option key={o.id} value={o.id}>
                                    {o.label}
                                </option>
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
                            {teamOptions.map((o) => (
                                <option key={o.id} value={o.id}>
                                    {o.label}
                                </option>
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
                            onChange={(e) =>
                                setParam("max_cost", e.target.value ? e.target.value : undefined)
                            }
                            placeholder="e.g. 6.5"
                            style={inputStyle}
                        />
                    </label>

                    {/* Clear */}
                    <button onClick={clearFilters} style={btnStyle}>
                        Clear filters
                    </button>
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
                                <th key={c}>{headerLabel(c, columnOverrides)}</th>
                            ))}
                        </tr>
                        </thead>

                        <tbody>
                        {/* FAKE sticky header that behaves like body cells */}
                        <tr className="fake-header">
                            {columns.map((c) => {
                                const cfg = configFor(c, columnOverrides);
                                const align = cfg.align ?? autoAlign(rows[0]?.[c]);
                                const alignCls =
                                    align === "right" ? "num" : align === "center" ? "center" : "";

                                // sticky + width classes
                                const i = FREEZE_KEYS.indexOf(c as any);
                                const freeze = i >= 0 ? `freeze-${i}` : "";
                                const widthCls = COL_WIDTH_CLASS[c] || "";

                                return (
                                    <td
                                        key={c}
                                        className={["fake-th", alignCls, freeze, widthCls].join(" ").trim()}
                                    >
                                        {headerLabel(c, columnOverrides)}
                                    </td>
                                );
                            })}

                            {/* Add dynamic event headers */}
                            {events?.map((ev) => {
                                const d = new Date(ev.deadline_time);
                                const day = d.getDate();
                                const month = d.toLocaleString("en-GB", { month: "short" });
                                const time = d.toLocaleTimeString("en-GB", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    hour12: false,
                                });

                                return (
                                    <td key={`ev-${ev.id}`} className="fake-th center">
                                        <div>{`Gameweek ${ev.id}`}</div>
                                        <div className="fake-th center">
                                            {day} {month} {time}
                                        </div>
                                    </td>
                                );
                            })}
                        </tr>

                        {/* DATA ROWS */}
                        {rows.map((row, idx) => (
                            <tr key={idx}>
                                {columns.map((c) => {
                                    const cfg = configFor(c, columnOverrides);
                                    const v = (row as AnyRow)[c];
                                    const align = cfg.align ?? autoAlign(v);
                                    const alignCls =
                                        align === "right" ? "num" : align === "center" ? "center" : "";
                                    const rendered = cfg.format ? cfg.format(v) : formatCell(v);

                                    // sticky & width classes
                                    const i = FREEZE_KEYS.indexOf(c as any);
                                    const freeze = i >= 0 ? `freeze-${i}` : "";
                                    const widthCls = COL_WIDTH_CLASS[c] || "";

                                    // eye button for history
                                    if (c === "history") {
                                        return (
                                            <td key={c} className={[alignCls, freeze, widthCls].join(" ").trim()}>
                                                <button
                                                    type="button"
                                                    onClick={() => openHistory(row)}
                                                    title="View history"
                                                    aria-label={`View history for ${(row["web_name"] as string) || "player"}`}
                                                    style={eyeBtnStyle}
                                                >
                                                    👁
                                                </button>
                                            </td>
                                        );
                                    }

                                    return (
                                        <td key={c} className={[alignCls, freeze, widthCls].join(" ").trim()}>
                                            {rendered}
                                        </td>
                                    );
                                })}
                                {/* Add next_games cells */}
                                {events?.map((ev) => {
                                    const nextGames: any[] = (row as AnyRow)["next_games"] ?? [];
                                    const ng = nextGames.find((g) => g.event === ev.id);
                                    const opp = ng?.opponents;

                                    const bg = opp ? FDR_COLORS[opp.color as number] || "transparent" : "transparent";

                                    return (
                                        <td
                                            key={`ng-${row["id"]}-${ev.id}`}
                                            className="center"
                                            style={{ backgroundColor: bg }}
                                        >
                                            {opp ? opp.text : ""}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}

                        {!rows.length && (
                            <tr>
                                <td colSpan={columns.length + (events?.length || 0)} style={{ padding: 16 }}>
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

            {/* ---- Player History Modal ---- */}
            <PlayerHistoryModal
                open={!!hist}
                onClose={() => setHist(null)}
                playerId={hist?.id ?? 0}
                summary={hist?.summary}
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

const eyeBtnStyle: React.CSSProperties = {
    border: "1px solid var(--border)",
    borderRadius: 10,
    padding: "2px 6px",
    fontSize: 12,
    background: "var(--bg)",
    cursor: "pointer",
    lineHeight: 1,
};