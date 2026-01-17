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

import {
    FREEZE_KEYS as PLAYER_FREEZE_KEYS,
    COL_WIDTH_CLASS as PLAYER_COL_WIDTH_CLASS,
} from "../features/players/player-utils";

import { normalizeToPage, getFdrColors } from "../features/teams/team-utils";
import PlayerHistoryModal from "../pages/players/player-history";

type AnyRow = Record<string, unknown>;

const FDR_COLORS = getFdrColors();

const LOCAL_FREEZE_KEYS = [
    "position",
    "web_name",
    "history",
    "status",
    "team",
    "type",
] as const;

const LOCAL_COL_WIDTH: Record<string, string> = {
    ...PLAYER_COL_WIDTH_CLASS,
    position: "col-slot",
    type: "col-pos",
};

// ---------------- STATUS OVERRIDE ----------------
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

// ---------------- FLATTEN MANAGER PICKS ----------------
function flattenManagerPicks(items: any[]): AnyRow[] {
    const rows: AnyRow[] = [];

    for (const mgr of items) {
        const managerLabel =
            mgr.information?.formatted_name ||
            mgr.information?.name ||
            String(mgr.information?.id || "");

        for (const p of mgr.picks || []) {
            const player = p.player || {};

            const row: AnyRow = {
                id: player.id,
                web_name: player.web_name ?? p.player_name ?? "",
                team: player.team,
                type: player.type,
                status: player.status, // <-- already full object with colour
                form: player.form,
                now_cost: player.now_cost,
                total_points: player.total_points,
                bonus: player.bonus,
                ep_next: player.ep_next,
                vapm: player.vapm,
                history: "history",

                manager: { id: mgr.information?.id, name: managerLabel },
                manager_chip: mgr.manager_team?.display_active_chip ?? "",
                position: p.position,
                is_sub: p.is_sub,
                expected_points: p.format_expected_points ?? player.ep_next,

                next_games: player.next_games ?? [],
            };

            rows.push(row);
        }
    }

    return rows;
}

// ---------------- COMPONENT ----------------
export default function ManagerTable({
                                         ids,
                                         title = "Manager Team",
                                         columnsToShow,
                                         columnOverrides = {},
                                         subtitleRight,
                                     }: {
    ids?: string | number[];
    title?: string;
    columnsToShow: string[];
    columnOverrides?: ColumnMap;
    subtitleRight?: React.ReactNode;
}) {
    const [idsLocal, setIdsLocal] = useState<string>("");

    const idsParam = useMemo(() => {
        if (typeof ids === "string") return ids;
        if (Array.isArray(ids)) return ids.join(",");
        return idsLocal;
    }, [ids, idsLocal]);

    const haveIds = !!idsParam && idsParam.trim().length > 0;

    // ---- Fetch managers ----
    const { data, isLoading } = useQuery({
        queryKey: ["managers", idsParam],
        queryFn: async () => {
            const resp = await api.get("/managers/", { params: { ids: idsParam } });
            return resp.data;
        },
        enabled: haveIds,
        keepPreviousData: true,
    });

    const flatRows = useMemo(
        () => flattenManagerPicks(data?.results ?? []),
        [data?.results]
    );

    // ---- MERGE OVERRIDES (IMPORTANT!) ----
    const mergedOverrides: ColumnMap = {
        ...columnOverrides,
        ...STATUS_OVERRIDE,
    };

    const { columns } = buildColumnsOnly(flatRows, columnsToShow, mergedOverrides, {
        keepMissing: true,
    });

    // ---- Upcoming events ----
    const { data: events } = useQuery({
        queryKey: ["upcoming-events"],
        queryFn: async () => (await api.get("/events/upcoming/")).data,
        staleTime: 5 * 60 * 1000,
    });

    // ---- Supporting lookups ----
    useQuery({
        queryKey: ["teams-options"],
        queryFn: async () => normalizeToPage((await api.get("/teams/")).data),
        staleTime: 5 * 60 * 1000,
    });

    useQuery({
        queryKey: ["types-options"],
        queryFn: async () => (await api.get("/element-types/")).data,
        staleTime: 5 * 60 * 1000,
    });

    // ---- History modal ----
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

    function submitIds(e: React.FormEvent) {
        e.preventDefault();
    }

    return (
        <main className="mx-auto max-w-6xl px-4 page--compact">
            {/* Toolbar */}
            <div className="page-toolbar">
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

                    {!ids && (
                        <form onSubmit={submitIds} style={{ display: "flex", gap: 8 }}>
                            <label>
                                <span style={{ fontSize: 12, color: "#374151" }}>
                                    Manager ID(s)
                                </span>
                                <input
                                    type="text"
                                    placeholder="e.g. 1162054 or 1162054,123456"
                                    value={idsLocal}
                                    onChange={(e) => setIdsLocal(e.target.value)}
                                    style={inputStyle}
                                />
                            </label>
                            <button type="submit" style={btnStyle}>
                                Load
                            </button>
                        </form>
                    )}

                    {subtitleRight ? <div>{subtitleRight}</div> : null}
                </div>
            </div>

            {/* ---- Table ---- */}
            <div className="table-wrap managers-table">
                <div className="table-scroll">
                    <table className="data">
                        <thead className="sr-only-thead">
                        <tr>
                            {columns.map((c) => (
                                <th key={c}>
                                    {c === "position"
                                        ? ""
                                        : headerLabel(c, mergedOverrides)}
                                </th>
                            ))}
                            {events?.map((ev) => (
                                <th key={`ev-th-${ev.id}`}>GW {ev.id}</th>
                            ))}
                        </tr>
                        </thead>

                        <tbody>
                        {/* Sticky header */}
                        <tr className="fake-header">
                            {columns.map((c) => {
                                const cfg = configFor(c, mergedOverrides);
                                const align =
                                    cfg.align ?? autoAlign(flatRows[0]?.[c]);
                                const alignCls =
                                    align === "right"
                                        ? "num"
                                        : align === "center"
                                            ? "center"
                                            : "";

                                const i = LOCAL_FREEZE_KEYS.indexOf(c as any);
                                const freeze = i >= 0 ? `freeze-${i}` : "";
                                const widthCls = LOCAL_COL_WIDTH[c] || "";

                                return (
                                    <td
                                        key={c}
                                        className={[
                                            "fake-th",
                                            alignCls,
                                            freeze,
                                            widthCls,
                                        ]
                                            .join(" ")
                                            .trim()}
                                    >
                                        {c === "position"
                                            ? ""
                                            : headerLabel(c, mergedOverrides)}
                                    </td>
                                );
                            })}

                            {events?.map((ev) => {
                                const d = new Date(ev.deadline_time);
                                const day = d.getDate();
                                const month = d.toLocaleString("en-GB", {
                                    month: "short",
                                });
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
                            const isBenchBoost = String(
                                row["manager_chip"] || ""
                            )
                                .trim()
                                .toLowerCase()
                                .startsWith("bench boost");

                            const muted = Boolean(row["is_sub"]) && !isBenchBoost;

                            return (
                                <tr key={idx} className={muted ? "muted-row" : ""}>
                                    {columns.map((c) => {
                                        const cfg = configFor(c, mergedOverrides);
                                        const v = row[c];
                                        const align =
                                            cfg.align ?? autoAlign(v);
                                        const alignCls =
                                            align === "right"
                                                ? "num"
                                                : align === "center"
                                                    ? "center"
                                                    : "";
                                        const rendered = cfg.format
                                            ? cfg.format(v, row)
                                            : formatCell(v);

                                        const i =
                                            LOCAL_FREEZE_KEYS.indexOf(c as any);
                                        const freeze =
                                            i >= 0 ? `freeze-${i}` : "";
                                        const widthCls =
                                            LOCAL_COL_WIDTH[c] || "";

                                        if (c === "history") {
                                            return (
                                                <td
                                                    key={c}
                                                    className={[
                                                        alignCls,
                                                        freeze,
                                                        widthCls,
                                                    ]
                                                        .join(" ")
                                                        .trim()}
                                                >
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            openHistory(row)
                                                        }
                                                        title="View history"
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
                                                className={[
                                                    alignCls,
                                                    freeze,
                                                    widthCls,
                                                ]
                                                    .join(" ")
                                                    .trim()}
                                            >
                                                {rendered}
                                            </td>
                                        );
                                    })}

                                    {/* FDR cells */}
                                    {events?.map((ev) => {
                                        const nextGames: any[] =
                                            (row as AnyRow)["next_games"] ??
                                            [];
                                        const ng = nextGames.find(
                                            (g) => g.event === ev.id
                                        );
                                        const opp = ng?.opponents;

                                        const bg = opp
                                            ? FDR_COLORS[
                                            opp.color as number
                                            ] || "transparent"
                                            : "transparent";

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
                                <td
                                    colSpan={
                                        columns.length + (events?.length || 0)
                                    }
                                    style={{ padding: 16 }}
                                >
                                    {haveIds
                                        ? "No results"
                                        : "Enter manager ID(s) and click Load"}
                                </td>
                            </tr>
                        )}
                        </tbody>
                    </table>
                </div>
            </div>

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