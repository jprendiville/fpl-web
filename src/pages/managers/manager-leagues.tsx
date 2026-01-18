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
        state =
            entry_rank < entry_last_rank
                ? "up"
                : entry_rank > entry_last_rank
                    ? "down"
                    : "same";
    }
    const glyph = state === "up" ? "▲" : state === "down" ? "▼" : "●";
    const color =
        state === "up" ? "#16a34a" : state === "down" ? "#dc2626" : "#111827";
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
            const r = await api.get("/managers/leagues/", {
                params: { ids: idsParam },
            });
            return r.data;
        },
        enabled: hasIds,
        keepPreviousData: true,
    });

    // -----------------------------
    // MUTATIONS THAT TRIGGER SPINNER
    // -----------------------------

    const progressionMut = useMutation({
        mutationFn: async (league_id: number) => {
            return qc.fetchQuery({
                queryKey: ["league-progression", league_id],
                queryFn: async () =>
                    (await api.get(`/league-progression/${league_id}/`)).data,
                staleTime: 30_000,
            });
        },
        onSuccess: (_, league_id) => {
            navigate(`/league-progression/${league_id}`);
        },
    });

    const standingsMut = useMutation({
        mutationFn: async (league_id: number) => {
            return qc.fetchQuery({
                queryKey: ["standings", league_id],
                queryFn: async () =>
                    (await api.get(`/standings/${league_id}/`)).data,
            });
        },
        onSuccess: (_, league_id) => {
            navigate(`/standings/${league_id}`);
        },
    });

    const liveMut = useMutation({
        mutationFn: async (league_id: number) => {
            return qc.fetchQuery({
                queryKey: ["live", league_id],
                queryFn: async () =>
                    (await api.get(`/live/${league_id}/`)).data,
            });
        },
        onSuccess: (_, league_id) => {
            navigate(`/live/${league_id}`);
        },
    });

    const reloadMut = useMutation({
        mutationFn: async (league_id: number) => {
            const managerId = data?.results?.[0]?.information?.id;
            return api.post(`/reload-league/${league_id}/`, {
                manager_id: managerId,
            });
        },
        onSuccess: () => refetch(),
    });

    const first = data?.results?.[0];
    const managerName =
        [first?.information?.formatted_name, "-", first?.information?.name]
            .filter(Boolean)
            .join(" ") || (hasIds ? `Manager ${idsParam}` : "");

    const leagues = (first?.classic_leagues ?? []).slice();

    return (
        <main className="mx-auto max-w-6xl px-4 page--compact">
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

                        {isLoading && (
                            <tr>
                                <td colSpan={5} className="center">
                                    Loading…
                                </td>
                            </tr>
                        )}

                        {leagues.map((lg) => (
                            <tr key={lg.league_id}>
                                <td>{lg.name}</td>

                                <td className="center">
                                    {lg.league_type === "x" && (
                                        <div
                                            style={{
                                                display: "flex",
                                                gap: 8,
                                                justifyContent: "center",
                                            }}
                                        >
                                            <button
                                                type="button"
                                                className="btn"
                                                onClick={() =>
                                                    standingsMut.mutate(
                                                        lg.league_id
                                                    )
                                                }
                                                disabled={
                                                    standingsMut.isPending
                                                }
                                            >
                                                Standings
                                            </button>

                                            <button
                                                type="button"
                                                className="btn"
                                                onClick={() =>
                                                    liveMut.mutate(
                                                        lg.league_id
                                                    )
                                                }
                                                disabled={liveMut.isPending}
                                            >
                                                Live
                                            </button>

                                            <button
                                                type="button"
                                                className="btn"
                                                onClick={() =>
                                                    progressionMut.mutate(
                                                        lg.league_id
                                                    )
                                                }
                                                disabled={
                                                    progressionMut.isPending
                                                }
                                            >
                                                Progression
                                            </button>

                                            <button
                                                type="button"
                                                className="btn"
                                                onClick={() =>
                                                    reloadMut.mutate(
                                                        lg.league_id
                                                    )
                                                }
                                                disabled={
                                                    reloadMut.isPending
                                                }
                                            >
                                                {reloadMut.isPending
                                                    ? "Reloading…"
                                                    : "Reload data"}
                                            </button>
                                        </div>
                                    )}
                                </td>

                                <td className="center">
                                    <Movement
                                        entry_rank={
                                            lg.entry_rank ?? null
                                        }
                                        entry_last_rank={
                                            lg.entry_last_rank ?? null
                                        }
                                        movement={lg.movement ?? null}
                                    />
                                </td>

                                <td className="num">
                                    {lg.entry_rank ?? ""}
                                </td>
                                <td className="num">
                                    {lg.entry_last_rank ?? ""}
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </main>
    );
}