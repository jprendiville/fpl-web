// src/pages/settings/player-status.tsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import "../../styles/global.css";
import "../../styles/table.css";

interface PlayerStatus {
    status: string;
    description: string;
    can_play: boolean;
    colour: string;          // ← British spelling
    last_updated: string;
}

export default function PlayerStatusPage() {
    const queryClient = useQueryClient();

    // ---- Load statuses ----
    const { data, isLoading, error } = useQuery<PlayerStatus[]>({
        queryKey: ["player-status"],
        queryFn: async () => {
            const r = await api.get("/settings/player-status/");
            return r.data;
        },
        staleTime: 0,
    });

    const [rows, setRows] = useState<PlayerStatus[] | null>(null);

    // Initialise editable rows when data loads
    if (!rows && data) {
        setRows(data);
    }

    // ---- Save mutation ----
    const saveMutation = useMutation({
        mutationFn: async (updated: PlayerStatus[]) => {
            const r = await api.put("/settings/player-status/", updated);
            return r.data;
        },
        onSuccess: (newData) => {
            queryClient.setQueryData(["player-status"], newData);
            setRows(newData);
        },
        onError: () => {
            alert("Error saving statuses");
        },
    });

    function updateRow(idx: number, field: keyof PlayerStatus, value: any) {
        if (!rows) return;
        const updated = [...rows];
        updated[idx] = { ...updated[idx], [field]: value };
        setRows(updated);
    }

    if (isLoading || !rows) {
        return <div className="mx-auto max-w-4xl px-4">Loading…</div>;
    }

    if (error) {
        return <div className="mx-auto max-w-4xl px-4">Error loading data</div>;
    }

    return (
        <main className="mx-auto max-w-4xl px-4 page--compact">
            <div className="page-toolbar">
                <h1 className="page-title">Player Status Settings</h1>
            </div>

            <div className="table-wrap">
                <div className="table-scroll">
                    <table className="data">
                        <thead>
                        <tr>
                            <th>Status Code</th>
                            <th>Description</th>
                            <th>Can Play</th>
                            <th>Colour</th>
                        </tr>
                        </thead>

                        <tbody>
                        {rows.map((row, idx) => (
                            <tr key={row.status}>
                                <td className="center">{row.status}</td>

                                <td>
                                    <input
                                        type="text"
                                        value={row.description}
                                        onChange={(e) =>
                                            updateRow(idx, "description", e.target.value)
                                        }
                                        style={{
                                            width: "100%",
                                            padding: "6px 8px",
                                            border: "1px solid var(--border)",
                                            borderRadius: 8,
                                        }}
                                    />
                                </td>

                                <td className="center">
                                    <input
                                        type="checkbox"
                                        checked={row.can_play}
                                        onChange={(e) =>
                                            updateRow(idx, "can_play", e.target.checked)
                                        }
                                    />
                                </td>

                                {/* ---- Colour Picker ---- */}
                                <td className="center">
                                    <input
                                        type="color"
                                        value={row.colour}
                                        onChange={(e) =>
                                            updateRow(idx, "colour", e.target.value)
                                        }
                                        style={{
                                            width: 40,
                                            height: 30,
                                            padding: 0,
                                            border: "none",
                                            background: "transparent",
                                            cursor: "pointer",
                                        }}
                                    />
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div style={{ marginTop: 20 }}>
                <button
                    onClick={() => saveMutation.mutate(rows)}
                    disabled={saveMutation.isPending}
                    style={{
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        padding: "8px 14px",
                        fontSize: 14,
                        background: "var(--bg)",
                        cursor: "pointer",
                    }}
                >
                    {saveMutation.isPending ? "Saving…" : "Save Changes"}
                </button>
            </div>
        </main>
    );
}