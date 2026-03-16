/**
 * styles.ts — Central design tokens for HemaLink
 *
 * All colors, reusable Tailwind className strings, and recharts hex values
 * live here. Import from this file instead of hardcoding values in components.
 *
 * Sections:
 *   1. Disease risk colors  (hex, used in recharts Lines)
 *   2. Chart hex values     (recharts-specific, can't use Tailwind)
 *   3. Status tone maps     (label → Tailwind class)
 *   4. Pill / badge tones   (ResultsSummary Pill component)
 *   5. Reusable className strings
 */

// ── 1. Disease risk colors ─────────────────────────────────────────────────
// Used as recharts <Line stroke> values. CKD is defined but unused until
// the model is ready — uncomment the entry to activate it.

export const DISEASE_COLORS: Record<string, string> = {
  Anemia:   "#EF4444",  // red-500
  Thyroid:  "#EAB308",  // yellow-500
  Diabetes: "#F97316",  // orange-500
  // CKD:   "#A855F7",  // purple-500 — model not yet in use
};

// ── 2. Chart hex values ────────────────────────────────────────────────────
// Tailwind classes cannot be used inside recharts props — these must stay hex.

export const CHART = {
  grid:          "#374151",  // gray-700
  axisTick:      "#9CA3AF",  // gray-400
  tooltipBg:     "#1F2937",  // gray-800
  tooltipBorder: "#374151",  // gray-700
  tooltipText:   "#F9FAFB",  // gray-50
  referenceLine: "#6B7280",  // gray-500
  biomarkerLine: "#3B82F6",  // blue-500
} as const;

/** Drop-in contentStyle for all recharts <Tooltip> components. */
export const TOOLTIP_STYLE = {
  backgroundColor: CHART.tooltipBg,
  border:          `1px solid ${CHART.tooltipBorder}`,
  borderRadius:    "6px",
  color:           CHART.tooltipText,
} as const;

// ── 3. Status tone → Tailwind class ───────────────────────────────────────
// Used in analysis table and disease stats row for change % coloring.

export const TONE_CLASSES: Record<string, string> = {
  good:    "text-green-400",
  bad:     "text-red-300",
  neutral: "text-gray-400",
};

// ── 4. Pill / badge tones ─────────────────────────────────────────────────
// Used by the <Pill> component in ResultsSummary.

export const PILL_TONES: Record<string, string> = {
  default: "bg-gray-800 text-gray-100 border-gray-700",
  good:    "bg-green-900/30 text-green-300 border-green-700/50",
  bad:     "bg-red-900/30 text-red-300 border-red-700/50",
  muted:   "bg-gray-900/50 text-gray-300 border-gray-700/60",
};

// ── 5. Reusable className strings ─────────────────────────────────────────

// -- Page wrapper (analysis, summary, upload pages) --
export const PAGE =
  "flex min-h-screen flex-col items-center p-8 md:p-16 bg-[var(--background)] text-[var(--foreground)]";

// -- Cards --
/** Standard dark card used throughout app pages. Add padding/spacing per use. */
export const CARD       = "rounded-lg border border-gray-800 bg-gray-900";
/** Slightly darker inset card for nested content. */
export const CARD_INNER = "rounded-lg border border-gray-800 bg-gray-950";
/** Glass morphism card used on marketing/landing pages (header, howitworks, about). */
export const CARD_GLASS =
  "rounded-xl bg-black/40 border border-red-800/20 backdrop-blur-md shadow-[0_0_20px_rgba(255,0,60,0.1)]";
/** Red-tinted alert card for disease risk / out-of-range indicators. */
export const CARD_ALERT = "rounded-lg border border-red-800 bg-red-950/20";

// -- Buttons --
/** Standard primary blue button. */
export const BTN_PRIMARY =
  "rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors";
/** Smaller blue button (e.g. Refresh). */
export const BTN_SM =
  "rounded-md bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700";
/** Red-to-rose gradient button used on landing pages (Sign in, Start Analysis). */
export const BTN_GRADIENT =
  "rounded-md bg-gradient-to-r from-red-600 to-rose-700 text-white hover:brightness-110";

// -- Form inputs --
export const INPUT =
  "w-full rounded-md border border-gray-600 bg-gray-700 p-2 text-white focus:border-blue-500 focus:ring-blue-500";
export const SELECT =
  "w-full rounded-md border border-gray-600 bg-gray-700 p-2 text-white focus:border-blue-500 focus:ring-blue-500";

// -- Typography --
/** Dimmed helper / label text. */
export const TEXT_MUTED = "text-sm text-gray-400";
export const TEXT_LABEL = "text-xs text-gray-500";
/** Nav link style (header). */
export const NAV_LINK   = "text-sm text-white/85 hover:text-red-400";

// -- Brand gradients --
/** Gradient text — softer red-to-rose (hero heading, about). */
export const GRADIENT_TEXT =
  "bg-gradient-to-r from-red-400 to-rose-500 bg-clip-text text-transparent";
/** Gradient text — stronger red-to-rose (logo). */
export const GRADIENT_TEXT_STRONG =
  "bg-gradient-to-r from-red-600 to-rose-700 bg-clip-text text-transparent";
/** Thin decorative gradient bar used as a section divider. */
export const GRADIENT_BAR =
  "h-1 rounded-full bg-gradient-to-r from-red-500 to-rose-600 shadow-[0_0_20px_rgba(255,0,60,0.12)]";

// -- Icon accent (landing page feature cards) --
export const ICON_CONTAINER =
  "flex h-12 w-12 items-center justify-center rounded-md bg-red-900/20";
export const ICON_ACCENT = "text-red-400";
