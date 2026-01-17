import {useEffect, useRef, useState, type CSSProperties} from "react";
import {NavLink, useLocation} from "react-router-dom";
import "../styles/topnav.css";

export default function TopNav() {
    const [playersOpen, setPlayersOpen] = useState(false);
    const [managersOpen, setManagersOpen] = useState(false);
    const [teamsOpen, setTeamsOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);   // NEW

    const playersRef = useRef<HTMLDivElement | null>(null);
    const managersRef = useRef<HTMLDivElement | null>(null);
    const teamsRef = useRef<HTMLDivElement | null>(null);
    const settingsRef = useRef<HTMLDivElement | null>(null);   // NEW

    const {pathname} = useLocation();

    const playersActive =
        pathname.includes("/players") ||
        pathname.includes("/defence") ||
        pathname.includes("/transfers") ||
        pathname.includes("/predictions");

    const managersActive = pathname.includes("/managers");

    const teamsActive =
        pathname.includes("/fdr") ||
        pathname.includes("/league-table");

    // NEW: settings is never "active" because it doesn't navigate
    const settingsActive =
        pathname.includes("/settings");

    useEffect(() => {
        const onDocClick = (e: MouseEvent) => {
            if (playersRef.current && !playersRef.current.contains(e.target as Node)) setPlayersOpen(false);
            if (managersRef.current && !managersRef.current.contains(e.target as Node)) setManagersOpen(false);
            if (teamsRef.current && !teamsRef.current.contains(e.target as Node)) setTeamsOpen(false);
            if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) setSettingsOpen(false); // NEW
        };
        const onEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setPlayersOpen(false);
                setManagersOpen(false);
                setTeamsOpen(false);
                setSettingsOpen(false); // NEW
            }
        };
        document.addEventListener("click", onDocClick);
        document.addEventListener("keydown", onEsc);
        return () => {
            document.removeEventListener("click", onDocClick);
            document.removeEventListener("keydown", onEsc);
        };
    }, []);

    const colors = {
        bg: "var(--bg, #ffffff)",
        border: "var(--border, #e5e7eb)",
        text: "var(--text, #374151)",
        accent: "var(--accent, #111827)",
        onAccent: "var(--on-accent, #ffffff)",
    };

    const headerStyle: CSSProperties = {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: colors.bg,
        borderBottom: `1px solid ${colors.border}`,
        backdropFilter: "blur(6px)",
    };
    const wrapStyle: CSSProperties = {
        maxWidth: "110%",
        margin: "0 auto",
        padding: 0
    };
    const navStyle: CSSProperties = {
        display: "flex",
        alignItems: "center",
        height: "var(--nav-height)",
        justifyContent: "flex-start",
        gap: 16,
    };
    const linkBase: CSSProperties = {
        padding: "8px 12px",
        borderRadius: 12,
        fontSize: 14,
        fontWeight: 600,
        textDecoration: "none",
    };

    return (
        <>
            <header className="app-nav" style={headerStyle}>
                <div className="app-nav__wrap" style={wrapStyle}>
                    <nav className="app-nav__bar" style={navStyle}>

                        {/* Home */}
                        <NavLink
                            to="/home"
                            className="nav-btn"
                            style={({isActive}) => ({
                                ...linkBase,
                                color: isActive ? colors.onAccent : colors.text,
                                background: isActive ? colors.accent : "transparent",
                            })}
                        >
                            Home
                        </NavLink>

                        {/* Players dropdown */}
                        <div style={{position: "relative"}} ref={playersRef}>
                            <button
                                type="button"
                                className={`nav-btn ${playersOpen || playersActive ? "nav-active" : ""}`}
                                onClick={() => setPlayersOpen(v => !v)}
                            >
                                Players
                            </button>
                            {playersOpen && (
                                <div id="players-menu" role="menu" className="dropdown-menu">
                                    <DropdownLink to="/players" label="Players" onClick={() => setPlayersOpen(false)}/>
                                    <DropdownLink to="/defence" label="Defence" onClick={() => setPlayersOpen(false)}/>
                                    <DropdownLink to="/transfers" label="Transfers" onClick={() => setPlayersOpen(false)}/>
                                    <DropdownLink to="/predictions" label="Predictions" onClick={() => setPlayersOpen(false)}/>
                                </div>
                            )}
                        </div>

                        {/* Managers */}
                        <NavLink
                            to="/managers"
                            className="nav-btn"
                            style={({isActive}) => ({
                                ...linkBase,
                                color: isActive ? colors.onAccent : colors.text,
                                background: isActive ? colors.accent : "transparent",
                            })}
                        >
                            Managers
                        </NavLink>

                        {/* Teams dropdown */}
                        <div style={{position: "relative"}} ref={teamsRef}>
                            <button
                                type="button"
                                className={`nav-btn ${teamsOpen || teamsActive ? "nav-active" : ""}`}
                                onClick={() => setTeamsOpen(v => !v)}
                            >
                                Teams
                            </button>
                            {teamsOpen && (
                                <div id="teams-menu" role="menu" className="dropdown-menu">
                                    <DropdownLink to="/fdr" label="FDR" onClick={() => setTeamsOpen(false)}/>
                                    <DropdownLink to="/league-table" label="League Table" onClick={() => setTeamsOpen(false)}/>
                                </div>
                            )}
                        </div>

                        {/* ⭐ NEW: Settings dropdown */}
                        <div style={{position: "relative"}} ref={settingsRef}>
                            <button
                                type="button"
                                className={`nav-btn ${settingsOpen || settingsActive ? "nav-active" : ""}`}
                                onClick={() => setSettingsOpen(v => !v)}
                            >
                                Settings
                            </button>

                            {settingsOpen && (
                                <div id="settings-menu" role="menu" className="dropdown-menu">
                                    <DropdownLink to="/settings/player-status" label="Player Status" onClick={() => setSettingsOpen(false)}/>
                                </div>
                            )}
                        </div>

                    </nav>
                </div>
            </header>
        </>
    );
}

function DropdownLink({to, label, onClick}: { to: string; label: string; onClick?: () => void }) {
    return (
        <NavLink
            to={to}
            onClick={onClick}
            role="menuitem"
            className="dropdown-link"
        >
            {label}
        </NavLink>
    );
}