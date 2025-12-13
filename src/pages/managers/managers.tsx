// src/pages/managers.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";  // <-- Link added
import ManagerTable from "../../components/managertable";
import type { ColumnMap } from "../../lib/columns";

const MANAGER_COLS = [
    "position",
    "web_name",
    "history",
    "status",
    "team",
    "type",
    "form",
    "now_cost",
    "total_points",
    "bonus",
    "ep_next",
    "vapm",
];

const MANAGER_OVERRIDES: ColumnMap = {
    position: { label: "\u00A0", align: "center" },
    web_name: {},
    history: { label: "History", align: "center" },
};

export default function ManagersPage() {
    const [sp, setSp] = useSearchParams();
    const [input, setInput] = useState(sp.get("ids") ?? "");

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

    const leaguesHref = `/manager-leagues${hasIds ? `?ids=${encodeURIComponent(idsParam)}` : ""}`;

    return (
        <main className="mx-auto max-w-6xl px-4 page--compact">
            <div className="page-toolbar" role="region" aria-label="Managers">
                <h1 className="page-title">Managers</h1>

                <form onSubmit={submit} className="filters-row" style={{ alignItems: "end" }}>
                    <label>
                        <span style={{ fontSize: 12, color: "#374151" }}>Manager ID(s)</span>
                        <input
                            type="text"
                            placeholder="e.g. 1234 or 1234,5678"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            style={{
                                border: "1px solid var(--border)",
                                borderRadius: 12,
                                padding: "6px 10px",
                                fontSize: 13,
                                background: "var(--bg)",
                            }}
                        />
                    </label>

                    <button type="submit" className="btn">Load</button>

                    {hasIds && (
                        <>
                            <button type="button" className="btn" onClick={clearIds}>Clear</button>
                            <Link
                                to={leaguesHref}
                                className="btn"
                                aria-disabled={!hasIds}
                                onClick={(e) => { if (!hasIds) e.preventDefault(); }}
                                style={{ textDecoration: "none" }}
                            >
                                Leagues
                            </Link>
                        </>
                    )}
                </form>
            </div>

            {!hasIds ? (
                <div className="table-wrap">
                    <div className="table-scroll">
                        <div style={{ padding: 16 }}>
                            Enter one or more manager IDs above, then click “Load”.
                        </div>
                    </div>
                </div>
            ) : (
                <ManagerTable
                    ids={idsParam}
                    title="Manager Picks"
                    columnsToShow={MANAGER_COLS}
                    columnOverrides={MANAGER_OVERRIDES}
                />
            )}
        </main>
    );
}
