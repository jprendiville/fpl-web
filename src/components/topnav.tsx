// src/components/topnav.tsx
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { NavLink, useLocation } from "react-router-dom";

export default function TopNav() {
    const [open, setOpen] = useState(false);
    const ddRef = useRef<HTMLDivElement | null>(null);
    const { pathname } = useLocation();

    const playersActive =
        pathname.startsWith("/players") ||
        pathname.startsWith("/defence") ||
        pathname.startsWith("/transfers");

    // close dropdown on outside click / Esc
    useEffect(() => {
        const onDocClick = (e: MouseEvent) => {
            if (!ddRef.current) return;
            if (!ddRef.current.contains(e.target as Node)) setOpen(false);
        };
        const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
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
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000,
        background: colors.bg,
        borderBottom: `1px solid ${colors.border}`,
        backdropFilter: "blur(6px)",
    };
    const wrapStyle: CSSProperties = { maxWidth: "110%", margin: "0 auto", padding: 0 };
    const navStyle: CSSProperties = {
        display: "flex", alignItems: "center", height: 56, justifyContent: "flex-start", gap: 16,
    };
    const linkBase: CSSProperties = {
        padding: "8px 12px", borderRadius: 12, fontSize: 14, fontWeight: 600, textDecoration: "none",
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

                    {/* Players dropdown (left-aligned with future items) */}
                    <div style={{ position: "relative" }} ref={ddRef}>
                        <button
                            type="button"
                            className="nav-btn"
                            onClick={() => setOpen(v => !v)}
                            aria-haspopup="menu"
                            aria-expanded={open}
                            aria-controls="players-menu"
                            style={{
                                ...linkBase,
                                color: (open || playersActive) ? colors.onAccent : colors.text,
                                background: (open || playersActive) ? colors.accent : "transparent",
                                display: "flex", alignItems: "center", gap: 6, cursor: "pointer",
                            }}
                        >
                            Players
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"
                                 fill="currentColor" width={16} height={16}
                                 style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 120ms ease" }}>
                                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
                            </svg>
                        </button>

                        {open && (
                            <div
                                id="players-menu"
                                role="menu"
                                style={{
                                    position: "absolute",
                                    left: 0,          // align under the Players button
                                    marginTop: 8,
                                    width: 200,
                                    border: `1px solid ${colors.border}`,
                                    borderRadius: 12,
                                    background: colors.bg,
                                    boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)",
                                    overflow: "hidden",
                                    zIndex: 1100,
                                }}
                            >
                                <DropdownLink to="/players"   label="Players"   onClick={() => setOpen(false)} />
                                <DropdownLink to="/defence"   label="Defence"   onClick={() => setOpen(false)} />
                                <DropdownLink to="/transfers" label="Transfers" onClick={() => setOpen(false)} />
                            </div>
                        )}
                    </div>

                    {/* Add more top-level tabs here later... */}
                </nav>
            </div>
        </header>
    );
}

function DropdownLink(
    { to, label, onClick }: { to: string; label: string; onClick?: () => void }
) {
    const itemBase: CSSProperties = {
        display: "block", width: "100%", padding: "10px 12px",
        fontSize: 14, textAlign: "left", textDecoration: "none",
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
