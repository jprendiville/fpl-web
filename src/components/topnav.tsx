// src/components/topnav.tsx
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { NavLink, useLocation } from "react-router-dom";
import "../styles/topnav.css";

export default function TopNav() {
    const [playersOpen, setPlayersOpen] = useState(false);
    const [teamsOpen, setTeamsOpen] = useState(false);
    const playersRef = useRef<HTMLDivElement | null>(null);
    const teamsRef = useRef<HTMLDivElement | null>(null);
    const { pathname } = useLocation();

    const playersActive =
        pathname.includes("/players") ||
        pathname.includes("/defence") ||
        pathname.includes("/transfers");

    const teamsActive =
        pathname.includes("/fdr") ||
        pathname.includes("/league-table");

    // close dropdown on outside click / Esc
    useEffect(() => {
        const onDocClick = (e: MouseEvent) => {
            if (playersRef.current && !playersRef.current.contains(e.target as Node)) {
                setPlayersOpen(false);
            }
            if (teamsRef.current && !teamsRef.current.contains(e.target as Node)) {
                setTeamsOpen(false);
            }
        };
        const onEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setPlayersOpen(false);
                setTeamsOpen(false);
            }
        };
        document.addEventListener("click", onDocClick);
        document.addEventListener("keydown", onEsc);
        return () => {
            document.removeEventListener("click", onDocClick);
            document.removeEventListener("keydown", onEsc);
        };
    }, []);

    // Palette via CSS vars with safe fallbacks
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
    const wrapStyle: CSSProperties = { maxWidth: "110%", margin: "0 auto", padding: 0 };
    const navStyle: CSSProperties = {
        display: "flex",
        alignItems: "center",
        height: 56,
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
        <header style={headerStyle}>
            <div style={wrapStyle}>
                <nav style={navStyle}>
                    {/* Home (left) */}
                    <NavLink
                        to="/home"
                        className="nav-btn"
                        style={({ isActive }) => ({
                            ...linkBase,
                            color: isActive ? colors.onAccent : colors.text,
                            background: isActive ? colors.accent : "transparent",
                        })}
                    >
                        Home
                    </NavLink>

                    {/* Players dropdown */}
                    <div style={{ position: "relative" }} ref={playersRef}>
                        <button
                            type="button"
                            className={`nav-btn ${playersOpen || playersActive ? "nav-active" : ""}`}
                            onClick={() => setPlayersOpen(v => !v)}
                        >
                            Players
                        </button>

                        {playersOpen && (
                            <div id="players-menu" role="menu" className="dropdown-menu">
                                <DropdownLink to="/players" label="Players" onClick={() => setPlayersOpen(false)} />
                                <DropdownLink to="/defence" label="Defence" onClick={() => setPlayersOpen(false)} />
                                <DropdownLink to="/transfers" label="Transfers" onClick={() => setPlayersOpen(false)} />
                            </div>
                        )}
                    </div>

                    {/* Teams dropdown */}
                    <div style={{ position: "relative" }} ref={teamsRef}>
                        <button
                            type="button"
                            className={`nav-btn ${teamsOpen || teamsActive ? "nav-active" : ""}`}
                            onClick={() => setTeamsOpen(v => !v)}
                        >
                            Teams
                        </button>

                        {teamsOpen && (
                            <div id="teams-menu" role="menu" className="dropdown-menu">
                                <DropdownLink to="/fdr" label="FDR" onClick={() => setTeamsOpen(false)} />
                                <DropdownLink to="/league-table" label="League Table" onClick={() => setTeamsOpen(false)} />
                            </div>
                        )}
                    </div>
                </nav>
            </div>
        </header>
    );
}

function DropdownLink(
    { to, label, onClick }: { to: string; label: string; onClick?: () => void }
) {
    const itemBase: CSSProperties = {
        display: "block",
        width: "100%",
        padding: "10px 12px",
        fontSize: 14,
        textAlign: "left",
        textDecoration: "none",
        color: "var(--text, #374151)",
    };
    return (
        <NavLink
            to={to}
            onClick={onClick}
            role="menuitem"
            style={({ isActive }) => ({
                ...itemBase,
                background: isActive ? "var(--accent, #111827)" : "transparent",
                color: isActive ? "var(--on-accent, #ffffff)" : "var(--text, #374151)",
            })}
        >
            {label}
        </NavLink>
    );
}
