// src/pages/players/players.tsx
import type React from "react";
import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import {
    type ColumnMap,
    buildColumnsOnly,   // ← whitelist builder
    configFor,
    headerLabel,
    autoAlign,
    formatCell,
} from "../../lib/columns";
import "../../styles/table.css";

type AnyRow = Record<string, unknown>;
type DRFPage<T> = { count: number; next: string | null; previous: string | null; results: T[] };

const ENDPOINT = "/v1/defence/";

// Show ONLY these fields (in this order)
const PLAYERS_ONLY = [
    "web_name",
    "status",
    "team",
    "type",
    "now_cost",
    "clean_sheets",
    "total_points",
    "ep_next",
];

// Page-specific tweaks (labels/formatters/align). Omit `label` to use base/camelCase.
const PLAYERS_PAGE_OVERRIDES: ColumnMap = {
    web_name: { sticky: true },
    // example tweak: now_cost: { label: "Price (€)", align: "right" },
};

export default function DefencePage() {
    const [params, setParams] = useSearchParams();
    const page = Number(params.get("page") || "1");

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ["defence", page],
        queryFn: async (): Promise<DRFPage<AnyRow>> => {
            const resp = await api.get(ENDPOINT, {
                params: {
                    page,                 // PageNumberPagination
                    limit: 20,            // LimitOffsetPagination (harmless if unused)
                    offset: (page - 1) * 20,
                },
            });
            return resp.data;
        },
        keepPreviousData: true,
    });

    const rows = data?.results ?? [];

    // Build columns strictly from whitelist; keepMissing shows headers even if some keys aren't on this page
    const { columns, stickyKey } = buildColumnsOnly(rows, PLAYERS_ONLY, PLAYERS_PAGE_OVERRIDES, { keepMissing: true });

    function goPage(n: number) {
        const next = new URLSearchParams(params);
        next.set("page", String(n));
        setParams(next, { replace: true });
    }

    // Derive page size from next/prev if present; fallback 20
    const pageSize = (() => {
        const fallback = 20;
        try {
            const url = new URL(data?.next || data?.previous || "", location.origin);
            const p = url.searchParams.get("page_size") || url.searchParams.get("limit");
            return p ? Number(p) : fallback;
        } catch {
            return fallback;
        }
    })();
    const totalPages = data?.count ? Math.max(1, Math.ceil(data.count / pageSize)) : undefined;

    const canGoPrev  = page > 1 && !isLoading;
    const canGoNext  = !isLoading && (typeof totalPages === "number" ? page < totalPages : !!data?.next);
    const canGoFirst = canGoPrev;
    const canGoLast  = typeof totalPages === "number" && page < totalPages && !isLoading;

    function goFirst() { goPage(1); }
    function goLast()  { if (typeof totalPages === "number") goPage(totalPages); }

    useEffect(() => {}, []);

    return (
        <main className="mx-auto max-w-6xl px-4 py-10">
            <h1 className="page-title" style={{ marginBottom: 12 }}>Defence</h1>

            <div className="table-wrap">
                {isLoading && <div style={{ padding: 16 }}>Loading…</div>}
                {isError && (
                    <div style={{ padding: 16, color: "#b91c1c" }}>
                        Error: {(error as Error)?.message}
                    </div>
                )}

                {!isLoading && !isError && (
                    <table className="data">
                        <thead>
                        <tr>
                            {columns.map((c) => (
                                <th key={c} className={c === stickyKey ? "sticky-col" : ""}>
                                    {headerLabel(c, PLAYERS_PAGE_OVERRIDES)}
                                </th>
                            ))}
                        </tr>
                        </thead>
                        <tbody>
                        {rows.map((row, idx) => (
                            <tr key={idx}>
                                {columns.map((c) => {
                                    const cfg = configFor(c, PLAYERS_PAGE_OVERRIDES);
                                    const v = (row as AnyRow)[c];
                                    const align = cfg.align ?? autoAlign(v);
                                    const cls =
                                        (c === stickyKey ? "sticky-col " : "") +
                                        (align === "right" ? "num" : align === "center" ? "center" : "");
                                    const rendered = cfg.format ? cfg.format(v) : formatCell(v);
                                    return (
                                        <td key={c} className={cls}>
                                            {rendered}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                        {!rows.length && (
                            <tr>
                                <td colSpan={columns.length} style={{ padding: 16 }}>
                                    No results
                                </td>
                            </tr>
                        )}
                        </tbody>
                    </table>
                )}
            </div>

            <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <button
                    onClick={goFirst}
                    disabled={!canGoFirst}
                    style={btnStyle}
                    aria-label="First page"
                    title="First page"
                >
                    « First
                </button>

                <button
                    onClick={() => goPage(Math.max(1, page - 1))}
                    disabled={!canGoPrev}
                    style={btnStyle}
                    aria-label="Previous page"
                    title="Previous page"
                >
                    Previous
                </button>

                {typeof totalPages === "number" && (
                    <span style={{ fontSize: 13 }}>
            Page <strong>{page}</strong> of <strong>{totalPages}</strong>
          </span>
                )}

                <button
                    onClick={() => goPage(page + 1)}
                    disabled={!canGoNext}
                    style={btnStyle}
                    aria-label="Next page"
                    title="Next page"
                >
                    Next
                </button>

                {typeof totalPages === "number" && (
                    <button
                        onClick={goLast}
                        disabled={!canGoLast}
                        style={btnStyle}
                        aria-label="Last page"
                        title="Last page"
                    >
                        Last »
                    </button>
                )}
            </div>
        </main>
    );
}

const btnStyle: React.CSSProperties = {
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: "6px 10px",
    fontSize: 13,
    background: "var(--bg)",
    cursor: "pointer",
};
