import type { CSSProperties } from "react"
import { cn } from "@/lib/utils"

const BASE_BADGE_CLASS =
  "inline-flex rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap"

// Tailwind classes for each preset name
const PRESET_CLASS_MAP: Record<string, string> = {
  sky:     "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
  red:     "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300",
  emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  violet:  "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
  cyan:    "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300",
  amber:   "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  zinc:    "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
}

// Hex equivalents of each preset — used for the color input and swatch displays
export const PRESET_HEX: Record<string, string> = {
  sky:     "#0ea5e9",
  red:     "#ef4444",
  emerald: "#10b981",
  violet:  "#8b5cf6",
  cyan:    "#06b6d4",
  amber:   "#f59e0b",
  zinc:    "#71717a",
}

/** Convert a color value (preset name OR hex string) to a hex string. */
export function colorToHex(color: string): string {
  if (color.startsWith("#")) return color
  return PRESET_HEX[color] ?? PRESET_HEX.zinc
}

export interface BadgeProps {
  className: string
  style?: CSSProperties
}

/**
 * Returns className + optional inline style for a badge.
 * Preset names use Tailwind classes; arbitrary hex values use inline styles.
 */
export function getBadgeProps(color: string): BadgeProps {
  if (color in PRESET_CLASS_MAP) {
    return { className: cn(BASE_BADGE_CLASS, PRESET_CLASS_MAP[color]) }
  }
  // Custom hex — tinted background at ~12 % opacity, full-opacity text
  return {
    className: BASE_BADGE_CLASS,
    style: { backgroundColor: `${color}1e`, color },
  }
}

/** @deprecated Prefer getBadgeProps. Returns className only; custom hex colors fall back to zinc. */
export function getBadgeClassByColor(color: string): string {
  return getBadgeProps(color in PRESET_CLASS_MAP ? color : "zinc").className
}

export function getNeutralBadgeClass(): string {
  return cn(BASE_BADGE_CLASS, PRESET_CLASS_MAP.zinc)
}
