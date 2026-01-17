// src/pages/players/predictions.tsx
import PlayerTable from "../../components/predictiontable";
import type { ColumnMap } from "../../lib/columns";

const PLAYERS_ONLY = [
    "web_name",
    "history",
    "status",
    "team",
    "type",
    "form",
    "now_cost",
    "total_points",
    "ep_next",
    "prediction",
];

const PLAYERS_PAGE_OVERRIDES: ColumnMap = {
    web_name: {},
    history: { label: "History", align: "center" },
};

export default function PredictionsPage() {
    return (
        <PlayerTable
            endpoint="/predictions/"
            title="Predictions"
            columnsToShow={PLAYERS_ONLY}
            columnOverrides={PLAYERS_PAGE_OVERRIDES}
        />
    );
}