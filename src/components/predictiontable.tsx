// src/components/predictiontable.tsx
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
import PredictionHistoryModal from "../pages/players/prediction-history";

type AnyRow = Record<string, unknown>;
type DRFPage<T> = { count: number; next: string | null; previous: string | null; results: T[] };

const FDR_COLORS = getFdrColors();

interface PredictionsTableProps {
    endpoint: string;
    title: string;
    columnsToShow: string[];
    columnOverrides?: ColumnMap;
}

export default function PredictionsTable({
                                             endpoint,
                                             title,
                                             columnsToShow,
                                             columnOverrides = {},
                                         }: PredictionsTableProps) {
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

    // ---- Fetch predictions ----
    const { data, isLoading } = useQuery({
        queryKey: ["predictions", endpoint, page, fType, fTeam, fStatus, fMaxPriceUi],
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

    // ---- Fetch events (same as PlayerTable) ----
    const { data: events } = useQuery({
        queryKey: ["upcoming-events"],
        queryFn: async () => {
            const r = await api.get("/events/upcoming/");
            return r.data;
        },
        staleTime: 5 * 60 * 1000,
    });

    // ---- Flatten predictions into player-like rows ----
    const rows = useMemo(() => {
        if (!data?.results) return [];

        return data.results.map((p: any) => {
            const pl = p.player;

            return {
                // prediction-specific
                prediction: Number(p.prediction),
                gameweek_id: p.gameweek_id,

                // flatten all player fields
                ...pl,

                // aliases to match PlayerTable
                team: pl.team,
                type: pl.type,

                // next games
                next_games: pl.next_games ?? [],

                // enable history button
                history: true,
            };
        });
    }, [data]);

    // ---- Options: fetch all Player Statuses ----
    const { data: statusApi } = useQuery({
        queryKey: ["player-status-options"],
        queryFn: async () => {
            const r = await api.get("/settings/player-status/");
            return r.data;
        },
        staleTime: 5 * 60 * 1000,
    });

    const statusOptions = useMemo(() => {
        if (!statusApi) return [];
        return statusApi.map((s: any) => ({
            id: s.status,
            label: s.description || s.status.toUpperCase(),
            colour: s.colour,
        }));
    }, [statusApi]);

    // ---- Add status column override ----
    const mergedOverrides: ColumnMap = {
        ...columnOverrides,
        status: {
            label: "Status",
            format: (value: any, row: AnyRow) => {
                const colour = row.status?.colour || "#999";
                const description = row.status?.description || "";

                return (
                    <div
                        style={{
                            display: "grid",
                            placeItems: "center",   // ← perfect centring
                        }}
                        title={description}
                    >
                        <div
                            style={{
                                width: 12,
                                height: 12,
                                borderRadius: "50%",
                                backgroundColor: colour,
                                border: "1px solid #666",
                            }}
                        />
                    </div>
                );
            },
        },
    };

    // ---- Build columns ----
    const { columns } = buildColumnsOnly(
        rows,
        columnsToShow,
        mergedOverrides,
        { keepMissing: true }
    );

    // ---- Fetch teams ----
    const { data: teamsApi } = useQuery({
        queryKey: ["teams-options"],
        queryFn: async (): Promise<DRFPage<any>> => {
            const r = await api.get("/teams/");
            return normalizeToPage(r.data);
        },
        staleTime: 5 * 60 * 1000,
    });

    const teamOptions = useMemo(() => {
        const list = teamsApi?.results ?? [];
        return list.map((t: any) => ({
            id: t.id,
            label: t.short_name || t.name || String(t.id),
        }));
    }, [teamsApi]);

    // ---- Fetch element types ----
    const { data: typesApi } = useQuery({
        queryKey: ["types-options"],
        queryFn: async (): Promise<DRFPage<any>> => {
            const r = await api.get("/element-types/");
            return r.data;
        },
        staleTime: 5 * 60 * 1000,
    });

    const typeOptions = useMemo(() => {
        const list = typesApi?.results ?? [];
        return list.map((t: any) => ({
            id: t.id,
            label: t.singular_name_short || t.singular_name || t.name || String(t.id),
        }));
    }, [typesApi]);

    // ---- Pagination ----
    const pageSize = 20;
    const totalPages =
        data?.count ? Math.max(1, Math.ceil(data.count / pageSize)) : undefined;

    const canGoPrev = page > 1 && !isLoading;
    const canGoNext =
        !isLoading && (typeof totalPages === "number" ? page < totalPages : !!data?.next);
    const canGoFirst = canGoPrev;
    const canGoLast = typeof totalPages === "number" && page < totalPages && !isLoading;

    // ---- History modal ----
    const [hist, setHist] = useState<{ id: number; summary: any } | null>(null);

    function openHistory(row: AnyRow) {
        const teamObj = row["team"];
        const typeObj = row["type"];

        setHist({
            id: Number(row["id"]),
            summary: {
                name: row["web_name"] || "",
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
            {/* ---- Toolbar ---- */}
            <div className="page-toolbar">
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
                            {statusOptions.map((o) => (
                                <option key={o.id} value={o.id}>
                                    {o.label}
                                </option>
                            ))}
                        </select>
                    </label>

                    {/* Max price */}
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

                    <button onClick={clearFilters} style={btnStyle}>
                        Clear filters
                    </button>
                </div>
            </div>

            {/* ---- Table ---- */}
            <div className="table-wrap">
                <div className="table-scroll">
                    <table className="data">
                        <thead className="sr-only-thead">
                        <tr>
                            {columns.map((c) => (
                                <th key={c}>{headerLabel(c, mergedOverrides)}</th>
                            ))}
                        </tr>
                        </thead>

                        <tbody>
                        {/* Sticky header */}
                        <tr className="fake-header">
                            {columns.map((c) => {
                                const cfg = configFor(c, mergedOverrides);
                                const align = cfg.align ?? autoAlign(rows[0]?.[c]);
                                const alignCls =
                                    align === "right"
                                        ? "num"
                                        : align === "center"
                                            ? "center"
                                            : "";

                                const i = FREEZE_KEYS.indexOf(c as any);
                                const freeze = i >= 0 ? `freeze-${i}` : "";
                                const widthCls = COL_WIDTH_CLASS[c] || "";

                                return (
                                    <td
                                        key={c}
                                        className={["fake-th", alignCls, freeze, widthCls].join(" ")}
                                    >
                                        {headerLabel(c, mergedOverrides)}
                                    </td>
                                );
                            })}

                            {/* Event headers */}
                            {events?.map((ev: any) => (
                                <td key={`ev-${ev.id}`} className="fake-th center">
                                    <div>GW {ev.id}</div>
                                </td>
                            ))}
                        </tr>

                        {/* Data rows */}
                        {rows.map((row, idx) => (
                            <tr key={idx}>
                                {columns.map((c) => {
                                    const cfg = configFor(c, mergedOverrides);
                                    const v = (row as AnyRow)[c];
                                    const align = cfg.align ?? autoAlign(v);
                                    const alignCls =
                                        align === "right"
                                            ? "num"
                                            : align === "center"
                                                ? "center"
                                                : "";
                                    const rendered = cfg.format ? cfg.format(v, row) : formatCell(v);

                                    const i = FREEZE_KEYS.indexOf(c as any);
                                    const freeze = i >= 0 ? `freeze-${i}` : "";
                                    const widthCls = COL_WIDTH_CLASS[c] || "";

                                    // History button
                                    if (c === "history") {
                                        return (
                                            <td
                                                key={c}
                                                className={[alignCls, freeze, widthCls].join(" ")}
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => openHistory(row)}
                                                    title="View history"
                                                    aria-label={`View history for ${row["web_name"]}`}
                                                    style={eyeBtnStyle}
                                                >
                                                    👁
                                                </button>
                                            </td>
                                        );
                                    }

                                    return (
                                        <td
                                            key={c}
                                            className={[alignCls, freeze, widthCls].join(" ")}
                                        >
                                            {rendered}
                                        </td>
                                    );
                                })}

                                {/* next_games cells */}
                                {events?.map((ev: any) => {
                                    const ng = row.next_games?.find(
                                        (g: any) => g.event === ev.id
                                    );
                                    const opp = ng?.opponents;
                                    const bg = opp
                                        ? FDR_COLORS[opp.color] || "transparent"
                                        : "transparent";

                                    return (
                                        <td
                                            key={`ng-${row.id}-${ev.id}`}
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
                                <td
                                    colSpan={columns.length + (events?.length || 0)}
                                    style={{ padding: 16 }}
                                >
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

            {/* ---- History Modal ---- */}
            <PredictionHistoryModal
                open={!!hist}
                onClose={() => setHist(null)}
                playerId={hist?.id ?? 0}
                summary={hist?.summary}
            />
        </main>
    );
}

/* ---------- styles ---------- */
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