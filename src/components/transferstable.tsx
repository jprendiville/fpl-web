// src/components/transfertable.tsx
import type React from "react";
import { useState, useMemo } from "react";
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
import { COL_WIDTH_CLASS } from "../features/players/player-utils";
import { useTransferParams } from "../features/players/transfer-params";
import PaginationBar from "./paginationbar";
import { normalizeToPage } from "../features/teams/team-utils";
import PlayerHistoryModal from "../pages/players/player-history";

type AnyRow = Record<string, unknown>;
type DRFPage<T> = { count: number; next: string | null; previous: string | null; results: T[] };

interface TransfersTableProps {
    endpoint: string;
    title: string;
    transferField: string;
}

const TRANSFER_COLUMNS = [
    "web_name",
    "history",
    "status",
    "team",
    "type",
    "transfers",
    "selected_by_percent",
];

const BASE_OVERRIDES: ColumnMap = {
    history: { label: "History", align: "center" },
    transfers: { label: "Transfers", align: "right" },
    selected_by_percent: { label: "Ownership", align: "right" },
};

export default function TransfersTable({ endpoint, title, transferField }: TransfersTableProps) {
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
    } = useTransferParams(title === "Transfers In" ? "in" : "out");

    // ---- Fetch transfers ----
    const { data, isLoading } = useQuery({
        queryKey: ["transfers", endpoint, page, fType, fTeam, fStatus, fMaxPriceUi],
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

    // ---- Fetch status metadata ----
    const { data: statusApi } = useQuery({
        queryKey: ["player-status-options"],
        queryFn: async () => {
            const r = await api.get("/settings/player-status/");
            return r.data;
        },
        staleTime: 5 * 60 * 1000,
    });

    const statusLookup = useMemo(() => {
        const map = new Map<string, { colour: string; description: string }>();
        statusApi?.forEach((s: any) => {
            map.set(s.status, {
                colour: s.colour,
                description: s.description || s.status.toUpperCase(),
            });
        });
        return map;
    }, [statusApi]);

    // ---- Normalize rows ----
    const rows = (data?.results ?? []).map((row: any) => ({
        ...row,
        transfers: row[transferField],

        // Normalise status to match PlayerTable / PredictionsTable
        status: row.status,
    }));

    // ---- Status override ----
    const STATUS_OVERRIDE: ColumnMap = {
        status: {
            label: "Status",
            value: () => null,
            format: (value: any, row: AnyRow) => {
                const colour = row.status?.colour || "#999";
                const description = row.status?.description || "";

                return (
                    <div
                        style={{
                            display: "grid",
                            placeItems: "center",
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

    const mergedOverrides: ColumnMap = {
        ...BASE_OVERRIDES,
        ...STATUS_OVERRIDE,
    };

    const { columns } = buildColumnsOnly(rows, TRANSFER_COLUMNS, mergedOverrides, {
        keepMissing: true,
    });

    // ---- Fetch Teams ----
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

    // ---- Fetch Element Types ----
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

    const pageSize = 20;
    const totalPages = data?.count ? Math.ceil(data.count / pageSize) : 1;

    const [hist, setHist] = useState<{ id: number; summary: any } | null>(null);

    function openHistory(row: AnyRow) {
        const teamObj = row["team"] as any;
        const typeObj = row["type"] as any;

        setHist({
            id: Number(row["id"]),
            summary: {
                name: row["web_name"] as string,
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
        <main className="mx-auto px-4 page--compact">
            {/* Toolbar */}
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
                            {statusApi?.map((s: any) => (
                                <option key={s.status} value={s.status}>
                                    {s.description || s.status.toUpperCase()}
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

                                const widthCls = COL_WIDTH_CLASS[c] || "";

                                return (
                                    <td
                                        key={c}
                                        className={["fake-th", alignCls, widthCls].join(" ")}
                                    >
                                        {headerLabel(c, mergedOverrides)}
                                    </td>
                                );
                            })}
                        </tr>

                        {/* Data rows */}
                        {rows.map((row, idx) => (
                            <tr key={idx}>
                                {columns.map((c) => {
                                    const cfg = configFor(c, mergedOverrides);
                                    const v = row[c];
                                    const align = cfg.align ?? autoAlign(v);
                                    const alignCls =
                                        align === "right"
                                            ? "num"
                                            : align === "center"
                                                ? "center"
                                                : "";
                                    const rendered = cfg.format
                                        ? cfg.format(v, row)
                                        : formatCell(v);

                                    const widthCls = COL_WIDTH_CLASS[c] || "";

                                    if (c === "history") {
                                        return (
                                            <td key={c} className={[alignCls, widthCls].join(" ")}>
                                                <button
                                                    type="button"
                                                    onClick={() => openHistory(row)}
                                                    title="View history"
                                                    style={eyeBtnStyle}
                                                >
                                                    👁
                                                </button>
                                            </td>
                                        );
                                    }

                                    return (
                                        <td key={c} className={[alignCls, widthCls].join(" ")}>
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

            {/* Pagination */}
            <PaginationBar
                page={page}
                totalPages={totalPages}
                canGoFirst={page > 1}
                canGoPrev={page > 1}
                canGoNext={page < totalPages}
                canGoLast={page < totalPages}
                onFirst={goFirst}
                onPrev={() => goPage(Math.max(1, page - 1))}
                onNext={() => goPage(page + 1)}
                onLast={() => goLast(totalPages)}
            />

            {/* History modal */}
            <PlayerHistoryModal
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