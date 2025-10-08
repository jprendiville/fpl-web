// src/pages/league-table.tsx
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../../lib/api";
import "../../styles/table.css";

type AnyRow = Record<string, unknown>;

export default function LeagueTablePage() {
    const [selectedGameweek, setGameweek] = useState<string>("");
    const [selectedDate, setDate] = useState<string>("");

    const { data: finishedGameweeks } = useQuery({
        queryKey: ["finished-gameweeks"],
        queryFn: async () => (await api.get("/v1/events/finished/")).data,
        staleTime: 5 * 60 * 1000,
    });

    const { data, isLoading } = useQuery({
        queryKey: ["league-table", selectedGameweek, selectedDate],
        queryFn: async () => {
            const params: any = {};
            if (selectedGameweek) params.gameweek = Number(selectedGameweek);
            if (selectedDate) params.event_date = selectedDate;
            return (await api.get("/v1/league-table/", { params })).data;
        },
        keepPreviousData: true,
    });

    const rows: AnyRow[] = data ?? [];

    return (
        // ⬇️ add page--compact just like Players
        <main className="mx-auto max-w-6xl px-4 page--compact">
            <div className="page-toolbar" role="region" aria-label="League Table filters">
                <h1 className="page-title">League Table</h1>

                <div className="filters-row">
                    <label>
                        <span style={{ fontSize: 12, color: "#374151" }}>FPL Gameweek</span>
                        <select
                            value={selectedGameweek}
                            onChange={(e) => { setGameweek(e.target.value); setDate(""); }}
                            style={selectStyle}
                        >
                            <option value="">—</option>
                            {finishedGameweeks?.map((gw: any) => (
                                <option key={gw.id} value={gw.id}>{gw.name}</option>
                            ))}
                        </select>
                    </label>

                    <label>
                        <span style={{ fontSize: 12, color: "#374151" }}>Date</span>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => { setDate(e.target.value); setGameweek(""); }}
                            style={selectStyle}
                        />
                    </label>
                </div>
            </div>

            {/* ⬇️ use the same wrappers as Players (drop fdr- classes) */}
            <div className="table-wrap">
                <div className="table-scroll">
                    <table className="data">
                        <thead className="sr-only-thead">
                        <tr>
                            <th>Rank</th><th>Team</th><th>Played</th><th>Wins</th>
                            <th>Draws</th><th>Losses</th><th>For</th>
                            <th>Against</th><th>GD</th><th>Points</th>
                        </tr>
                        </thead>
                        <tbody>
                        <tr className="fake-header">
                            <td className="fake-th">Rank</td>
                            <td className="fake-th">Team</td>
                            <td className="fake-th center">Played</td>
                            <td className="fake-th center">Wins</td>
                            <td className="fake-th center">Draws</td>
                            <td className="fake-th center">Losses</td>
                            <td className="fake-th center">For</td>
                            <td className="fake-th center">Against</td>
                            <td className="fake-th center">GD</td>
                            <td className="fake-th center">Points</td>
                        </tr>

                        {rows.map((row, idx) => (
                            <tr key={idx}>
                                <td className="num">{row["rank"]}</td>
                                <td>{row["name"]}</td>
                                <td className="num">{row["played"]}</td>
                                <td className="num">{row["wins"]}</td>
                                <td className="num">{row["draws"]}</td>
                                <td className="num">{row["losses"]}</td>
                                <td className="num">{row["goals_for"]}</td>
                                <td className="num">{row["goals_against"]}</td>
                                <td className="num">{row["goal_difference"]}</td>
                                <td className="num" style={{ fontWeight: 700 }}>{row["total_points"]}</td>
                            </tr>
                        ))}

                        {!rows.length && !isLoading && (
                            <tr><td colSpan={10} style={{ padding: 16 }}>No results</td></tr>
                        )}
                        </tbody>
                    </table>
                </div>
            </div>
        </main>
    );
}

const selectStyle: React.CSSProperties = {
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: "6px 10px",
    fontSize: 13,
    background: "var(--bg)",
};
