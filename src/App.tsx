// src/App.tsx
import { Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider, useIsFetching, useIsMutating } from "@tanstack/react-query";

import TopNav from "./components/topnav";
import HomePage from "./pages/home";
import PlayersPage from "./pages/players/players";
import DefencePage from "./pages/players/defence";
import TransfersPage from "./pages/players/transfers";
import NotFound from "./pages/notfound";
import FdrPage from "./pages/teams/fdr";
import LeagueTablePage from "./pages/teams/league-table";
import ManagersPage from "./pages/managers/managers";
import ManagerLeaguesPage from "./pages/managers/manager-leagues";
import ManagerLeagueProgressionPage from "./pages/managers/league-progression";
import PredictionsPage from "./pages/players/predictions";
import PlayerStatusPage from "./pages/settings/player-status";

import LoadingOverlay from "./components/loadingoverlay";

// Create React Query client
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: 1,
        },
    },
});

// Global spinner component
function GlobalSpinner() {
    const isFetching = useIsFetching();   // active queries
    const isMutating = useIsMutating();   // active mutations

    return <LoadingOverlay active={isFetching > 0 || isMutating > 0} />;
}

export default function App() {
    return (
        <QueryClientProvider client={queryClient}>
            {/* Global loading spinner */}
            <GlobalSpinner />

            {/* Your existing layout */}
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
        </QueryClientProvider>
    );
}