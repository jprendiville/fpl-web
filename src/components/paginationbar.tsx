import React from "react";

export type PaginationBarProps = {
    page: number;
    totalPages?: number;
    canGoFirst: boolean;
    canGoPrev: boolean;
    canGoNext: boolean;
    canGoLast: boolean;
    onFirst: () => void;
    onPrev: () => void;
    onNext: () => void;
    onLast: () => void;
    style?: React.CSSProperties;
    buttonStyle?: React.CSSProperties;
};

const defaultBtnStyle: React.CSSProperties = {
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: "6px 10px",
    fontSize: 13,
    background: "var(--bg)",
    cursor: "pointer",
};

export default function PaginationBar({
                                          page,
                                          totalPages,
                                          canGoFirst,
                                          canGoPrev,
                                          canGoNext,
                                          canGoLast,
                                          onFirst,
                                          onPrev,
                                          onNext,
                                          onLast,
                                          style,
                                          buttonStyle,
                                      }: PaginationBarProps) {
    const btnStyle = { ...defaultBtnStyle, ...buttonStyle };
    return (
        <div
            style={{
                marginTop: 12,
                marginLeft: 16,
                marginRight: 16,
                display: "flex",
                gap: 8,
                alignItems: "center",
                flexWrap: "wrap",
                ...style,
            }}
        >
            <button onClick={onFirst} disabled={!canGoFirst} style={btnStyle} aria-label="First page" title="First page">
                « First
            </button>
            <button onClick={onPrev} disabled={!canGoPrev} style={btnStyle} aria-label="Previous page" title="Previous page">
                Previous
            </button>
            {typeof totalPages === "number" && (
                <span style={{ fontSize: 13 }}>
          Page <strong>{page}</strong> of <strong>{totalPages}</strong>
        </span>
            )}
            <button onClick={onNext} disabled={!canGoNext} style={btnStyle} aria-label="Next page" title="Next page">
                Next
            </button>
            {typeof totalPages === "number" && (
                <button onClick={onLast} disabled={!canGoLast} style={btnStyle} aria-label="Last page" title="Last page">
                    Last »
                </button>
            )}
        </div>
    );
}
