// src/components/players/PredictionHistoryModal.tsx
import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import Modal from "../../components/modal.tsx";

type HistoryRow = {
    id: number;
    gameweek: number | null;
    opponent_short_name?: string | null;
    opponent_name?: string | null;
    home_away?: "H" | "A";
    team_h_score?: number | null;
    team_a_score?: number | null;
    total_points?: number | null;
    prediction?: number | null;
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

export default function PredictionHistoryModal({ open, onClose, playerId, summary }: Props) {

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ["prediction-history", playerId],
        enabled: open && !!playerId,
        queryFn: async (): Promise<HistoryRow[]> => {
            const r = await api.get(`/predictions/${playerId}/player-history/`);
            return r.data;
        },
    });

        const title = useMemo(() => {
        const name = summary?.name ?? "Player";
        const team = summary?.team || "";
        const pos = summary?.type || "";
        return `${name}${team ? ` (${team})` : ""}${pos ? ` - ${pos}` : ""}`;
    }, [summary]);

    return (
        <Modal open={open} onClose={onClose} title={title} width={800}>
            {/* Top summary (same style as PlayerHistoryModal) */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "160px 1fr 160px 1fr",
                    gap: 10,
                    marginBottom: 14,
                }}
            >
                <SummaryItem label="Cost" value={formatMoney(summary?.now_cost)} />
                <SummaryItem label="Points" value={summary?.total_points ?? "-"} />
                <SummaryItem label="Form" value={summary?.form ?? "-"} />
                <SummaryItem label="VAPM" value={summary?.vapm ?? "-"} />
                <SummaryItem label="Expected Points" value={summary?.ep_next ?? "-"} />
            </div>

            {/* Table */}
            <div className="table-wrap">
                <div className="table-scroll">
                    <table className="data" style={{ tableLayout: "fixed", width: "100%" }}>
                        <thead style={{ position: "sticky", top: 0, background: "var(--table-header,#f8fafc)", zIndex: 1 }}>
                        <tr>
                            <th style={{ width: 70, textAlign: "right" }}>Round</th>
                            <th style={{ width: 220, textAlign: "left" }}>Opponent</th>
                            <th style={{ width: 140, textAlign: "center" }}>Result</th>
                            <th style={{ width: 120, textAlign: "right" }}>Points</th>
                            <th style={{ width: 140, textAlign: "right" }}>Prediction</th>
                        </tr>
                        </thead>
                        <tbody>

                        {(data ?? []).map((r) => {
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
                                    <td className="num">{r.gameweek ?? "-"}</td>
                                    <td style={{ whiteSpace: "nowrap" }}>
                                        {opp}
                                        {ha}
                                    </td>
                                    <td className="center">{result}</td>
                                    <td className="num">{r.total_points ?? 0}</td>
                                    <td className="num">{r.prediction ?? 0}</td>
                                </tr>
                            );
                        })}

                        {(!data || data.length === 0) && (
                            <tr>
                                <td colSpan={5} style={{ padding: 16 }}>
                                    No history
                                </td>
                            </tr>
                        )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isLoading && <div style={{ marginTop: 8 }}>Loading…</div>}
            {isError && (
                <div style={{ marginTop: 8, color: "crimson" }}>
                    Failed to load prediction history
                    {(error as any)?.message ? `: ${(error as any).message}` : ""}.
                </div>
            )}
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
    const m = (now_cost / 10).toFixed(2);
    return `£${m}`;
}