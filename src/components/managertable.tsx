// src/components/ManagerTable.tsx
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

import { FREEZE_KEYS as PLAYER_FREEZE_KEYS,
    COL_WIDTH_CLASS as PLAYER_COL_WIDTH_CLASS, } from "../features/players/player-utils";
import { normalizeToPage, getFdrColors } from "../features/teams/team-utils";
import PlayerHistoryModal from "../pages/players/player-history";

type AnyRow = Record<string, unknown>;

const FDR_COLORS = getFdrColors();

const LOCAL_FREEZE_KEYS = [
    "position",   // lane 0
    "web_name",   // lane 1
    "history",    // lane 2
    "status",     // lane 3
    "team",       // lane 4
    "type",       // lane 5  <-- use the actual key you render
] as const;

const LOCAL_COL_WIDTH: Record<string, string> = {
    ...PLAYER_COL_WIDTH_CLASS,
    position: "col-slot",  // narrow slot column (44px)
    type: "col-pos",       // ensure type gets the same width as "pos"
};

/** Minimal shape of the /v1/managers/ response we actually use here */
type ManagersApiPick = {
    position: number;
    is_sub: boolean;
    player_name: string;
    format_expected_points?: string;
    player: AnyRow & {
        id: number;
        web_name?: string;
        team?: { id: number; short_name?: string; name?: string };
        type?: { id: number; singular_name_short?: string; singular_name?: string };
        next_games?: Array<{
            event: number;
            opponents?: { color?: number; text?: string };
        }>;
    };
};

type ManagersApiItem = {
    information: { id: number; formatted_name?: string; name?: string };
    manager_team: { id: number; display_active_chip?: string };
    total_expected?: string;
    classic_leagues?: Array<{ id: number; name: string; rank: number | null }>;
    picks: ManagersApiPick[];
};

type ManagersApiResponse = {
    results: ManagersApiItem[];
};

interface ManagerTableProps {
    /** Manager ids to request (comma separated or number[]). Optional—if omitted, a small input will be shown. */
    ids?: string | number[];
    /** Title shown at the top of the table */
    title?: string;
    /** Whitelist the columns (from the flattened pick rows) */
    columnsToShow: string[];
    /** Optional per-column overrides (label, align, formatter, etc.) */
    columnOverrides?: ColumnMap;
    /** Optional subheading (right side) */
    subtitleRight?: React.ReactNode;
}

/**
 * Flattens manager picks into simple rows that look like the Players table rows.
 * We copy relevant `player` fields to the root row and keep manager/pick context.
 */
function flattenManagerPicks(items: ManagersApiItem[]): AnyRow[] {
    const rows: AnyRow[] = [];

    for (const mgr of items) {
        const managerLabel =
            mgr.information?.formatted_name || mgr.information?.name || String(mgr.information?.id || "");

        for (const p of mgr.picks || []) {
            const player = p.player || {};
            const row: AnyRow = {
                id: player.id,
                web_name: player.web_name ?? p.player_name ?? "",
                team: player.team,
                type: player.type,
                status: player.status,
                form: player.form,
                now_cost: player.now_cost,
                total_points: player.total_points,
                bonus: player.bonus,
                ep_next: player.ep_next,
                vapm: player.vapm,
                history: "history",

                // context
                manager: { id: mgr.information?.id, name: managerLabel },
                manager_chip: mgr.manager_team?.display_active_chip ?? "",   // ⬅️ add this
                position: p.position,
                is_sub: p.is_sub,                                           // already present
                expected_points: p.format_expected_points ?? player.ep_next,

                next_games: player.next_games ?? [],
            };

            rows.push(row);
        }
    }

    return rows;
}

export default function ManagerTable({
                                         ids,
                                         title = "Manager Team",
                                         columnsToShow,
                                         columnOverrides = {},
                                         subtitleRight,
                                     }: ManagerTableProps) {
    // If ids not supplied by parent, allow user to enter them.
    const [idsLocal, setIdsLocal] = useState<string>("");

    const idsParam = useMemo(() => {
        if (typeof ids === "string") return ids;
        if (Array.isArray(ids)) return ids.join(",");
        return idsLocal;
    }, [ids, idsLocal]);

    const haveIds = !!idsParam && idsParam.trim().length > 0;

    // ---- Fetch managers (no pagination) ----
    const { data, isLoading } = useQuery({
        queryKey: ["managers", idsParam],
        queryFn: async (): Promise<ManagersApiResponse> => {
            const resp = await api.get("/v1/managers/", { params: { ids: idsParam } });
            return resp.data;
        },
        enabled: haveIds,
        keepPreviousData: true,
    });

    const flatRows = useMemo(
        () => flattenManagerPicks(data?.results ?? []),
        [data?.results]
    );

    // Build columns strictly from whitelist, like Players
    const { columns } = buildColumnsOnly(flatRows, columnsToShow, columnOverrides, {
        keepMissing: true,
    });

    // ---- Upcoming events (for dynamic FDR header cells) ----
    const { data: events } = useQuery({
        queryKey: ["upcoming-events"],
        queryFn: async (): Promise<any[]> => {
            const r = await api.get("/v1/events/upcoming/");
            return r.data;
        },
        staleTime: 5 * 60 * 1000,
    });

    // ---- Optional supporting lookups (cached; parity with Players) ----
    useQuery({
        queryKey: ["teams-options"],
        queryFn: async () => normalizeToPage((await api.get("/v1/teams/")).data),
        staleTime: 5 * 60 * 1000,
    });
    useQuery({
        queryKey: ["types-options"],
        queryFn: async () => (await api.get("/v1/element-types/")).data,
        staleTime: 5 * 60 * 1000,
    });

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

    // simple local submit handler when ids prop not provided
    function submitIds(e: React.FormEvent) {
        e.preventDefault();
        // nothing else required; idsLocal already drives the query via idsParam
    }

    return (
        <main className="mx-auto max-w-6xl px-4 page--compact">
            {/* Toolbar */}
            <div className="page-toolbar" role="region" aria-label="Managers table">
                <div
                    style={{
                        display: "flex",
                        alignItems: "flex-end",
                        justifyContent: "space-between",
                        gap: 12,
                        flexWrap: "wrap",
                    }}
                >
                    <h1 className="page-title">{title}</h1>

                    {/* If parent didn't pass ids, show an input to collect them */}
                    {!ids && (
                        <form onSubmit={submitIds} style={{ display: "flex", gap: 8, alignItems: "end" }}>
                            <label>
                                <span style={{ fontSize: 12, color: "#374151" }}>Manager ID(s)</span>
                                <input
                                    type="text"
                                    placeholder="e.g. 1162054 or 1162054,123456"
                                    value={idsLocal}
                                    onChange={(e) => setIdsLocal(e.target.value)}
                                    style={inputStyle}
                                />
                            </label>
                            <button type="submit" style={btnStyle}>Load</button>
                        </form>
                    )}

                    {subtitleRight ? <div>{subtitleRight}</div> : null}
                </div>
            </div>

            {/* ---- Table ---- */}
            <div className="table-wrap managers-table">
                <div className="table-scroll">
                    <table className="data">
                        {/* semantic thead for a11y only */}
                        <thead className="sr-only-thead">
                        <tr>
                            {columns.map((c) => (
                                <th key={c}>
                                    {/* Suppress "position" header text */}
                                    {c === "position" ? "" : headerLabel(c, columnOverrides)}
                                </th>
                            ))}
                            {events?.map((ev) => (
                                <th key={`ev-th-${ev.id}`}>GW {ev.id}</th>
                            ))}
                        </tr>
                        </thead>

                        <tbody>
                        {/* Sticky fake header (behaves like body cells) */}
                        <tr className="fake-header">
                            {columns.map((c) => {
                                const cfg = configFor(c, columnOverrides);
                                const align = cfg.align ?? autoAlign(flatRows[0]?.[c]);
                                const alignCls = align === "right" ? "num" : align === "center" ? "center" : "";

                                // sticky + width classes
                                const i = LOCAL_FREEZE_KEYS.indexOf(c as any);
                                const freeze = i >= 0 ? `freeze-${i}` : "";
                                const widthCls = LOCAL_COL_WIDTH[c] || "";

                                return (
                                    <td
                                        key={c}
                                        className={["fake-th", alignCls, freeze, widthCls].join(" ").trim()}
                                    >
                                        {/* Suppress "position" header label */}
                                        {c === "position" ? "" : headerLabel(c, columnOverrides)}
                                    </td>
                                );
                            })}

                            {/* Dynamic GW headers (like Players) */}
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

                        {/* Data rows */}
                        {flatRows.map((row, idx) => {
                            const isBenchBoost = String(row["manager_chip"] || "")
                                .trim()
                                .toLowerCase()
                                .startsWith("bench boost");

                            const muted = Boolean(row["is_sub"]) && !isBenchBoost;

                            return (
                                <tr key={idx} className={muted ? "muted-row" : ""}>
                                    {columns.map((c) => {
                                        const cfg = configFor(c, columnOverrides);
                                        const v = row[c];
                                        const align = cfg.align ?? autoAlign(v);
                                        const alignCls = align === "right" ? "num" : align === "center" ? "center" : "";
                                        const rendered = cfg.format ? cfg.format(v) : formatCell(v);

                                        // sticky & width classes
                                        const i = LOCAL_FREEZE_KEYS.indexOf(c as any);
                                        const freeze = i >= 0 ? `freeze-${i}` : "";
                                        const widthCls = LOCAL_COL_WIDTH[c] || "";

                                        // 👁 History button cell
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

                                    {/* FDR cells (next_games) */}
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
                            );
                        })}

                        {!flatRows.length && !isLoading && (
                            <tr>
                                <td colSpan={columns.length + (events?.length || 0)} style={{ padding: 16 }}>
                                    {haveIds ? "No results" : "Enter manager ID(s) and click Load"}
                                </td>
                            </tr>
                        )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Player History Modal (reused) */}
            <PlayerHistoryModal
                open={!!hist}
                onClose={() => setHist(null)}
                playerId={hist?.id ?? 0}
                summary={hist?.summary}
            />
        </main>
    );
}

/* ---------- tiny local styles (mirror Players) ---------- */
const btnStyle: React.CSSProperties = {
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: "6px 10px",
    fontSize: 13,
    background: "var(--bg)",
    cursor: "pointer",
};
const inputStyle: React.CSSProperties = {
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: "6px 10px",
    fontSize: 13,
    background: "var(--bg)",
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
