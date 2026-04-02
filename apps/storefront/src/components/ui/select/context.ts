"use client";

/**
 * Select shared context & types — extracted to break circular dependency
 * between select.tsx, combobox.tsx, and select-item.tsx.
 *
 * @module ui/select/context
 */

import type { FC, ReactNode } from "react";
import { createContext } from "react";

// ── Shared types ───────────────────────────────────────────────────────────

export type SelectItemType = {
    id: string;
    label?: string;
    avatarUrl?: string;
    isDisabled?: boolean;
    supportingText?: string;
    icon?: FC | ReactNode;
};

export interface CommonProps {
    hint?: string;
    label?: string;
    tooltip?: string;
    size?: "sm" | "md";
    placeholder?: string;
}

export const sizes = {
    sm: { root: "py-2 px-3", shortcut: "pr-2.5" },
    md: { root: "py-2.5 px-3.5", shortcut: "pr-3" },
};

// ── Shared context ─────────────────────────────────────────────────────────

export const SelectContext = createContext<{ size: "sm" | "md" }>({ size: "sm" });
