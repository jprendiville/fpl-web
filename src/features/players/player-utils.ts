// src/features/players/player-utils.ts

/** Freeze these 4 columns on the left, in this order (player-domain default) */
export const FREEZE_KEYS = ["web_name", "history", "status", "team", "type"] as const;

/** Width classes for the frozen columns (matches your CSS) */
export const COL_WIDTH_CLASS: Record<string, string> = {
    web_name: "col-player",
    history: "col-history",
    status:  "col-status",
    team:    "col-team",
    type:    "col-pos", // Pos
};
