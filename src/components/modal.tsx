// src/components/modal.tsx
import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

type ModalProps = {
    open: boolean;
    onClose: () => void;
    title?: React.ReactNode;
    width?: number | string;
    children: React.ReactNode;
};

export default function Modal({ open, onClose, title, width = 900, children }: ModalProps) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    if (!open) return null;

    return createPortal(
        <div
            aria-modal="true"
            role="dialog"
            aria-label={typeof title === "string" ? title : "Dialog"}
            className="modal-overlay"
            onMouseDown={(e) => {
                // close when clicking backdrop only
                if (e.target === e.currentTarget) onClose();
            }}
            style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,.45)",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "center",
                padding: "6vh 24px",
                zIndex: 2000, // higher than header/table
            }}
        >
            <div
                ref={ref}
                className="modal-card"
                style={{
                    width,
                    maxWidth: "min(96vw, 1200px)",
                    background: "var(--bg, #fff)",
                    color: "var(--fg, #111)",
                    borderRadius: 12,
                    boxShadow: "0 20px 60px rgba(0,0,0,.25)",
                    overflow: "hidden",
                }}
            >
                <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--border,#e5e7eb)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: 22, fontWeight: 700 }}>{title}</div>
                    <button onClick={onClose} aria-label="Close" style={{ border: "1px solid var(--border,#e5e7eb)", borderRadius: 8, padding: "4px 8px", background: "var(--bg,#fff)", cursor: "pointer" }}>✕</button>
                </div>
                <div style={{ padding: 20 }}>{children}</div>
                <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border,#e5e7eb)", textAlign: "right" }}>
                    <button onClick={onClose} style={{ border: "1px solid var(--border,#e5e7eb)", borderRadius: 8, padding: "6px 12px", background: "var(--bg,#fff)", cursor: "pointer" }}>
                        Close
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
