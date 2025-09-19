import { useSearchParams } from "react-router-dom";

export function usePlayerParams() {
    const [params, setParams] = useSearchParams();

    // read
    const page = Number(params.get("page") || "1");
    const fType = params.get("player_type") || "";
    const fTeam = params.get("player_team") || "";
    const fStatus = params.get("status") || "";
    const fMaxPriceUi = params.get("max_cost") || "";
    const fMaxCostTenths = toTenths(fMaxPriceUi);

    // write (keeps page reset semantics)
    function setParam(key: string, value?: string) {
        const next = new URLSearchParams(params);
        if (!value) next.delete(key);
        else next.set(key, value);
        if (key !== "page") next.set("page", "1");
        setParams(next, { replace: true });
    }

    // paging helpers
    const goPage = (n: number) => setParam("page", String(n));
    const goFirst = () => goPage(1);
    const goLast = (totalPages?: number) => {
        if (typeof totalPages === "number" && totalPages > 0) goPage(totalPages);
    };
    const clearFilters = () => {
        setParams(new URLSearchParams({ page: "1" }), { replace: true });
    };

    return {
        params,
        page, fType, fTeam, fStatus, fMaxPriceUi, fMaxCostTenths,
        setParam, goPage, goFirst, goLast,
        clearFilters, setParams,
    };
}

function toTenths(uiValue: string): number | null {
    if (!uiValue) return null;
    const n = Number(uiValue);
    return Number.isFinite(n) ? Math.round(n * 10) : null;
}
