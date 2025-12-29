import { useSearchParams } from "react-router-dom";

export function useTransferParams(namespace: string) {
    const [params, setParams] = useSearchParams();

    // Prefix all keys with the namespace ("in" or "out")
    const key = (k: string) => `${namespace}_${k}`;

    // Read
    const page = Number(params.get(key("page")) || "1");
    const fType = params.get(key("player_type")) || "";
    const fTeam = params.get(key("player_team")) || "";
    const fStatus = params.get(key("status")) || "";
    const fMaxPriceUi = params.get(key("max_cost")) || "";
    const fMaxCostTenths = toTenths(fMaxPriceUi);

    // Write
    function setParam(k: string, value?: string) {
        const next = new URLSearchParams(params);
        const namespaced = key(k);

        if (!value) next.delete(namespaced);
        else next.set(namespaced, value);

        // Reset page when changing filters
        if (k !== "page") next.set(key("page"), "1");

        setParams(next, { replace: true });
    }

    // Paging
    const goPage = (n: number) => setParam("page", String(n));
    const goFirst = () => goPage(1);
    const goLast = (totalPages?: number) => {
        if (typeof totalPages === "number" && totalPages > 0) goPage(totalPages);
    };

    // Clear only this table's filters
    const clearFilters = () => {
        const next = new URLSearchParams(params);

        for (const p of Array.from(next.keys())) {
            if (p.startsWith(namespace + "_")) next.delete(p);
        }

        next.set(key("page"), "1");
        setParams(next, { replace: true });
    };

    return {
        page,
        fType,
        fTeam,
        fStatus,
        fMaxPriceUi,
        fMaxCostTenths,
        setParam,
        goPage,
        goFirst,
        goLast,
        clearFilters,
    };
}

function toTenths(uiValue: string): number | null {
    if (!uiValue) return null;
    const n = Number(uiValue);
    return Number.isFinite(n) ? Math.round(n * 10) : null;
}