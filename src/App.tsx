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
                <Route path="/managers" element={<ManagersPage />} />
                <Route path="/fdr" element={<FdrPage />} />
                <Route path="/league-table" element={<LeagueTablePage />} />
                <Route path="*" element={<NotFound />} />
            </Routes>
        </>
    );
}
