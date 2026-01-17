// src/pages/players/players.tsx
import PlayerTable from "../../components/playertable";
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
    "bonus",
    "ep_next",
    "vapm",
];

const PLAYERS_PAGE_OVERRIDES: ColumnMap = {
    web_name: {},
    history: { label: "History", align: "center" },
};

export default function PlayersPage() {
    return (
        <PlayerTable
            endpoint="/players/"
            title="Players"
            columnsToShow={PLAYERS_ONLY}
            columnOverrides={PLAYERS_PAGE_OVERRIDES}
        />
    );
}