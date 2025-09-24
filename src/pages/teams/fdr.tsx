// src/pages/teams/fdr.tsx
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import "../../styles/table.css";
import { FREEZE_KEYS, getFdrColors, normalizeToPage } from "../../features/teams/team-utils";

type AnyRow = Record<string, unknown>;
type DRFPage<T> = { count: number; next: string | null; previous: string | null; results: T[] };

const ENDPOINT = "/v1/fdr/";
const FDR_COLORS = getFdrColors();

const TEAMS_ONLY = ["short_name", "name"];

export default function TeamsPage() {
    // ---- Data: teams list ----
    const { data, isLoading } = useQuery({
        queryKey: ["teams-fdr"],
        queryFn: async (): Promise<DRFPage<any>> => {
            const resp = await api.get(ENDPOINT);
            return normalizeToPage(resp.data);
        },
        staleTime: 5 * 60 * 1000,
    });

    const rows = data?.results ?? [];

    // ---- Data: upcoming events (for headers) ----
    const { data: events } = useQuery({
        queryKey: ["upcoming-events"],
        queryFn: async (): Promise<any[]> => {
            const r = await api.get("/v1/events/upcoming/");
            return r.data; // list of { id, name, deadline_time }
        },
        staleTime: 5 * 60 * 1000,
    });

    return (
        <main className="mx-auto max-w-6xl px-4">
            <div className="page-toolbar" role="region" aria-label="Teams FDR">
                <h1 className="page-title">Teams – Fixture Difficulty</h1>
            </div>

            {/* ---- Table ---- */}
            <div className="table-wrap fdr-table">
                <div className="table-scroll fdr-scroll">
                    <table className="data">
                        {/* semantic thead for a11y */}
                        <thead className="sr-only-thead">
                        <tr>
                            {TEAMS_ONLY.map(c => <th key={c}>{c}</th>)}
                            {events?.map(ev => <th key={ev.id}>GW {ev.id}</th>)}
                        </tr>
                        </thead>

                        <tbody>
                        {/* Sticky-style header row */}
                        <tr className="fake-header">
                            <td className="fake-th freeze-0">Team</td>
                            {events?.map(ev => {
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
                                <td className="freeze-0 col-short_name">
                                    {row["short_name"] || row["name"]}
                                </td>

                                {events?.map(ev => {
                                    const nextGames: any[] = (row as AnyRow)["next_games"] ?? [];
                                    const ng = nextGames.find(g => g.event === ev.id);
                                    const opp = ng?.opponents;
                                    const bg =
                                        opp ? FDR_COLORS[opp.color as number] || "transparent" : "transparent";

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

                        {!rows.length && !isLoading && (
                            <tr>
                                <td colSpan={(events?.length ?? 0) + 1} style={{ padding: 16 }}>
                                    No results
                                </td>
                            </tr>
                        )}
                        </tbody>
                    </table>
                </div>
            </div>
        </main>
    );
}
