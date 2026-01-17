// src/pages/players/defence.tsx
import PlayerTable from "../../components/playertable";
import type { ColumnMap } from "../../lib/columns";

const DEFENCE_ONLY = [
    "web_name",
    "history",
    "status",
    "team",
    "type",
    "now_cost",
    "clean_sheets",
    "total_points",
    "ep_next",
    "vapm",
];

const DEFENCE_PAGE_OVERRIDES: ColumnMap = {
    web_name: {},
    history: { label: "History", align: "center" },
};

export default function DefencePage() {
    return (
        <PlayerTable
            endpoint="/defence/"
            title="Defence" // This will render inside PlayerTable's toolbar
            columnsToShow={DEFENCE_ONLY}
            columnOverrides={DEFENCE_PAGE_OVERRIDES}
        />
    );
}