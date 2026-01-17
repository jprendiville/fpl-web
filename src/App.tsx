import { Routes, Route, Navigate } from "react-router-dom";
import TopNav from "./components/topnav";
import HomePage from "./pages/home";
import PlayersPage from "./pages/players/players";
import DefencePage from "./pages/players/defence";
import TransfersPage from "./pages/players/transfers";
import NotFound from "./pages/notfound";
import FdrPage from "./pages/teams/fdr.tsx";
import LeagueTablePage from "./pages/teams/league-table.tsx";
import ManagersPage from "./pages/managers/managers.tsx";
import ManagerLeaguesPage from "./pages/managers/manager-leagues.tsx";
import ManagerLeagueProgressionPage
    from "./pages/managers/league-progression.tsx";
import PredictionsPage from "./pages/players/predictions.tsx";
import PlayerStatusPage from "./pages/settings/player-status.tsx";

export default function App() {
    return (
        <>
            <TopNav />
            <Routes>
                <Route path="/" element={<Navigate to="/home" replace />} />
                <Route path="/home" element={<HomePage />} />
                <Route path="/players" element={<PlayersPage />} />
                <Route path="/defence" element={<DefencePage />} />
                <Route path="/transfers" element={<TransfersPage />} />
                <Route path="/predictions" element={<PredictionsPage />} />
                <Route path="/managers" element={<ManagersPage />} />
                <Route path="/manager-leagues" element={<ManagerLeaguesPage />} />
                <Route path="/fdr" element={<FdrPage />} />
                <Route path="/league-table" element={<LeagueTablePage />} />
                <Route path="/league-progression" element={<ManagerLeagueProgressionPage />} />
                <Route path="/league-progression/:league_id" element={<ManagerLeagueProgressionPage />} />
                <Route path="/settings/player-status" element={<PlayerStatusPage />} />
                <Route path="*" element={<NotFound />} />
            </Routes>
        </>
    );
}
