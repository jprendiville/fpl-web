import { Routes, Route, Navigate } from "react-router-dom";
import TopNav from "./components/topnav";
import HomePage from "./pages/home";
import PlayersPage from "./pages/players/players";
import DefencePage from "./pages/players/defence";
import TransfersPage from "./pages/players/transfers";
import NotFound from "./pages/notfound";

export default function App() {
    return (
        <>
            <TopNav />
            <div style={{ height: 56 }} aria-hidden="true" />
            <Routes>
                <Route path="/" element={<Navigate to="/home" replace />} />
                <Route path="/home" element={<HomePage />} />
                <Route path="/players" element={<PlayersPage />} />
                <Route path="/defence" element={<DefencePage />} />
                <Route path="/transfers" element={<TransfersPage />} />
                <Route path="*" element={<NotFound />} />
            </Routes>
        </>
    );
}
