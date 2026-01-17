// src/components/players/PlayerHistoryModal.tsx
import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import Modal from "../../components/modal.tsx";

type HistoryRow = {
    id: number;
    round: number | null;
    kickoff_time: string | null;
    opponent_short_name?: string | null;
    opponent_name?: string | null;
    home_away?: "H" | "A";
    team_h_score?: number | null;
    team_a_score?: number | null;
    minutes?: number | null;
    total_points?: number | null;
    bonus?: number | null;
    goals_scored?: number | null;
    assists?: number | null;
    clean_sheets?: number | null;
};

type PlayerSummary = {
    web_name?: string;
    team?: { short_name?: string; name?: string };
    type?: { singular_name_short?: string; singular_name?: string; name?: string };
    now_cost?: number;
    total_points?: number;
    form?: string | number;
    vapm?: string | number;
    ep_next?: string | number;
};

type Props = {
    open: boolean;
    onClose: () => void;
    playerId: number;
    summary?: PlayerSummary;
};

export default function PlayerHistoryModal({ open, onClose, playerId, summary }: Props) {

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ["player-history", playerId],
        enabled: open && !!playerId,
        queryFn: async (): Promise<HistoryRow[]> => {
            const r = await api.get(`/players/${playerId}/player-history/`);
            return r.data;
        },
    });

    const title = useMemo(() => {
        const name = summary?.name ?? "Player";
        const team = summary?.team || "";
        const pos = summary?.type || "";
        return `${name}${team ? ` (${team})` : ""}${pos ? ` - ${pos}` : ""}`;
    }, [summary]);

    const totals = useMemo(() => {
        const rows = data ?? [];
        const sum = (k: keyof HistoryRow) =>
            rows.reduce((acc, r) => acc + (Number(r[k] ?? 0) || 0), 0);
        return {
            points: sum("total_points"),
            bonus: sum("bonus"),
            goals: sum("goals_scored"),
            assists: sum("assists"),
            clean_sheets: sum("clean_sheets"),
        };
    }, [data]);

    return (
        <Modal open={open} onClose={onClose} title={title} width={1000}>
            {/* Top summary */}
            <div style={{ display: "grid", gridTemplateColumns: "160px 1fr 160px 1fr", gap: 10, marginBottom: 14 }}>
                <SummaryItem label="Cost" value={formatMoney(summary?.now_cost)} />
                <SummaryItem label="Points" value={summary?.total_points ?? "-"} />
                <SummaryItem label="Form" value={summary?.form ?? "-"} />
                <SummaryItem label="VAPM" value={summary?.vapm ?? "-"} />
                <SummaryItem label="Expected Points" value={summary?.ep_next ?? "-"} />
            </div>

            {/* Table */}
            <div className="table-wrap">
                <div className="table-scroll">
                    <table className="data">
                        <thead
                            style={{
                                position: "sticky",
                                top: 0,
                                background: "var(--table-header,#f8fafc)",
                                zIndex: 1
                            }}
                        >
                        <tr>
                            <th>Round</th>
                            <th>Date</th>
                            <th>Opponent</th>
                            <th>Result</th>
                            <th>Minutes</th>
                            <th>Points</th>
                            <th>Goals</th>
                            <th>Assists</th>
                            <th>Clean Sheets</th>
                            <th>Bonus</th>
                        </tr>

                        {/* Totals row — same number of columns, no colSpan */}
                        <tr style={{ fontWeight: 600 }}>
                            <th style={{ textAlign: "left" }}>Totals</th>
                            <th></th>
                            <th></th>
                            <th></th>
                            <th></th>
                            <th className="num">{totals.points}</th>
                            <th className="num">{totals.goals}</th>
                            <th className="num">{totals.assists}</th>
                            <th className="num">{totals.clean_sheets}</th>
                            <th className="num">{totals.bonus}</th>
                        </tr>
                        </thead>

                        <tbody>


                        {(data ?? []).map((r) => {
                            const date = r.kickoff_time ? new Date(r.kickoff_time) : null;
                            const dateStr = date
                                ? date.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })
                                : "-";
                            const result =
                                r.team_h_score == null || r.team_a_score == null
                                    ? "-"
                                    : r.home_away === "H"
                                        ? `${r.team_h_score} - ${r.team_a_score}`
                                        : `${r.team_a_score} - ${r.team_h_score}`;
                            const opp = r.opponent_short_name || r.opponent_name || "-";
                            const ha = r.home_away ? ` (${r.home_away})` : "";
                            return (
                                <tr key={r.id}>
                                    <td className="num">{r.round ?? "-"}</td>
                                    <td>{dateStr}</td>
                                    <td>{opp}{ha}</td>
                                    <td className="center">{result}</td>
                                    <td className="num">{r.minutes ?? 0}</td>
                                    <td className="num">{r.total_points ?? 0}</td>
                                    <td className="num">{r.goals_scored ?? 0}</td>
                                    <td className="num">{r.assists ?? 0}</td>
                                    <td className="num">{r.clean_sheets ?? 0}</td>
                                    <td className="num">{r.bonus ?? 0}</td>

                                </tr>
                            );
                        })}

                        {(!data || data.length === 0) && (
                            <tr>
                                <td colSpan={10} style={{ padding: 16 }}>No history</td>
                            </tr>
                        )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isLoading && <div style={{ marginTop: 8 }}>Loading…</div>}
            {isError && <div style={{ marginTop: 8, color: "crimson" }}>
                Failed to load player history{(error as any)?.message ? `: ${(error as any).message}` : ""}.
            </div>}
        </Modal>
    );
}

function SummaryItem({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <>
            <div style={{ color: "#6b7280" }}>{label}</div>
            <div>{value}</div>
        </>
    );
}

function formatMoney(now_cost?: number) {
    if (now_cost == null) return "-";
    // your API price is tenths (e.g., 57 => £5.7m). Adjust if different.
    const m = (now_cost / 10).toFixed(2);
    return `£${m}`;
}
