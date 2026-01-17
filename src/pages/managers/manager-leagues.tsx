// src/pages/manager-leagues.tsx
import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";

import "../../styles/global.css";
import "../../styles/table.css";

type League = {
    league_id: number;
    name: string;
    league_type?: string;
    entry_rank: number | null;
    entry_last_rank?: number | null;
    movement?: "up" | "down" | "same" | string | null;
};

type ManagerLeaguesItem = {
    information?: { id: number; name?: string; formatted_name?: string };
    manager_team?: { id: number; display_active_chip?: string; name?: string };
    classic_leagues: League[];
};

type ManagerLeaguesResponse = { results: ManagerLeaguesItem[] };

function Movement({ entry_rank, entry_last_rank, movement }: Partial<League>) {
    let state: "up" | "down" | "same" = "same";
    if (movement === "up") state = "up";
    else if (movement === "down") state = "down";
    else if (entry_rank != null && entry_last_rank != null) {
        state = entry_rank < entry_last_rank ? "up" : entry_rank > entry_last_rank ? "down" : "same";
    }
    const glyph = state === "up" ? "▲" : state === "down" ? "▼" : "●";
    const color = state === "up" ? "#16a34a" : state === "down" ? "#dc2626" : "#111827";
    return <span style={{ color, fontSize: 12 }}>{glyph}</span>;
}

export default function ManagerLeaguesPage() {
    const [sp, setSp] = useSearchParams();
    const [input, setInput] = useState(sp.get("ids") ?? "");
    const navigate = useNavigate();
    const qc = useQueryClient();

    useEffect(() => setInput(sp.get("ids") ?? ""), [sp]);

    const idsParam = useMemo(() => (sp.get("ids") ?? "").trim(), [sp]);
    const hasIds = idsParam.length > 0;

    function submit(e: React.FormEvent) {
        e.preventDefault();
        const normalized = input
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
            .join(",");
        if (normalized) setSp({ ids: normalized });
        else setSp({});
    }
    function clearIds() {
        setInput("");
        setSp({});
    }

    const { data, isLoading, refetch } = useQuery({
        queryKey: ["manager-leagues", idsParam],
        queryFn: async (): Promise<ManagerLeaguesResponse> => {
            const r = await api.get("/managers/leagues/", { params: { ids: idsParam } });
            return r.data;
        },
        enabled: hasIds,
        keepPreviousData: true,
    });

    // ---- Reload mutation: POST /api/reload-league/<league_id>/ { manager_id } ----
    const reloadMut = useMutation({
        mutationFn: async (league_id: number) => {
            const managerId = data?.results?.[0]?.information?.id;
            return api.post(`/reload-league/${league_id}/`, {
                manager_id: managerId,
            });
        },
        onSuccess: () => refetch(),
    });

    // ---- Navigate to progression page; prefetch API first ----
    const goProgression = async (league_id: number) => {
        await qc.prefetchQuery({
            queryKey: ["league-progression", league_id],
            queryFn: async () => (await api.get(`/league-progression/${league_id}/`)).data,
            staleTime: 30_000,
        });

        navigate(`/league-progression/${encodeURIComponent(String(league_id))}`);

    };

    const first = data?.results?.[0];
    const managerName =
        [first?.information?.formatted_name, "-", first?.information?.name]
            .filter(Boolean)
            .join(" ") || (hasIds ? `Manager ${idsParam}` : "");

    const leagues = (first?.classic_leagues ?? []).slice();

    return (
        <main className="mx-auto max-w-6xl px-4 page--compact">
            {/* ... Toolbar and Manager name logic remains the same ... */}

            <div className="table-wrap">
                <div className="table-scroll">
                    <table className="data" style={{ minWidth: 720 }}>
                        <thead className="sr-only-thead">
                        <tr>
                            <th>League</th>
                            <th>Actions</th>
                            <th>Move</th>
                            <th>Current Rank</th>
                            <th>Last Rank</th>
                        </tr>
                        </thead>
                        <tbody>
                        <tr className="fake-header">
                            <td className="fake-th">League</td>
                            <td className="fake-th center">Actions</td>
                            <td className="fake-th center"></td>
                            <td className="fake-th">Current Rank</td>
                            <td className="fake-th">Last Rank</td>
                        </tr>

                        {/* ... (isLoading and empty states) ... */}

                        {leagues.map((lg) => (
                            <tr key={lg.league_id}>
                                <td>{lg.name}</td>
                                <td className="center">
                                    {/* ONLY RENDER BUTTONS IF LEAGUE_TYPE IS 'x' */}
                                    {lg.league_type === 'x' && (
                                        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                                            <button type="button" className="btn">Standings</button>
                                            <button type="button" className="btn">Live</button>
                                            <button
                                                type="button"
                                                className="btn"
                                                onClick={() => goProgression(lg.league_id)}
                                            >
                                                Progression
                                            </button>
                                            <button
                                                type="button"
                                                className="btn"
                                                onClick={() => reloadMut.mutate(lg.league_id)}
                                                disabled={reloadMut.isPending}
                                                title="Delete & rebuild standings"
                                            >
                                                {reloadMut.isPending ? "Reloading…" : "Reload data"}
                                            </button>
                                        </div>
                                    )}
                                </td>
                                <td className="center">
                                    <Movement
                                        entry_rank={lg.entry_rank ?? null}
                                        entry_last_rank={lg.entry_last_rank ?? null}
                                        movement={lg.movement ?? null}
                                    />
                                </td>
                                <td className="num">{lg.entry_rank ?? ""}</td>
                                <td className="num">{lg.entry_last_rank ?? ""}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </main>
    );
}
