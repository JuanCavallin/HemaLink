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
  grid:          "#3D1520",  // rose-950 tint — visible but not harsh
  axisTick:      "#FECDD3",  // rose-200 — soft, readable ticks
  tooltipBg:     "#0D0509",  // near-black
  tooltipBorder: "#4C0519",  // rose-950 border
  tooltipText:   "#FFF1F2",  // rose-50 — near white
  referenceLine: "#FDA4AF",  // rose-300 — soft threshold line
  biomarkerLine: "#FB7185",  // rose-400 — biomarker trend line
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

// ── 3b. Standalone status / body text ─────────────────────────────────────
/** Error message color (no size — compose with text-sm etc. as needed). */
export const TEXT_ERROR   = "text-red-400";
/** Success / healthy message color. */
export const TEXT_SUCCESS = "text-green-400";
/** Body text inside dark cards and sections. */
export const TEXT_BODY    = "text-white/80";

// ── 4. Pill / badge tones ─────────────────────────────────────────────────
// Used by the <Pill> component in ResultsSummary.

export const PILL_TONES: Record<string, string> = {
  default: "bg-red-950/30 text-red-100 border-red-900/50",
  good:    "bg-green-900/30 text-green-300 border-green-700/50",
  bad:     "bg-red-900/40 text-red-300 border-red-700/60",
  muted:   "bg-black/40 text-red-200/70 border-red-900/30",
};

// ── 5. Reusable className strings ─────────────────────────────────────────

// -- Page wrapper (analysis, summary, upload pages) --
export const PAGE =
  "flex min-h-screen flex-col items-center p-8 md:p-16 bg-[var(--background)] text-[var(--foreground)]";

// -- Cards --
/** Standard dark card used throughout app pages. Add padding/spacing per use. */
export const CARD       = "rounded-lg border border-rose-900/30 bg-rose-950/10";
/** Slightly darker inset card for nested content. */
export const CARD_INNER = "rounded-lg border border-rose-900/20 bg-black/30";
/** Glass morphism card used on marketing/landing pages (header, howitworks, about). */
export const CARD_GLASS =
  "rounded-xl bg-black/40 border border-red-800/20 backdrop-blur-md shadow-[0_0_20px_rgba(255,0,60,0.1)]";
/** Red-tinted alert card for disease risk / out-of-range indicators. */
export const CARD_ALERT = "rounded-lg border border-red-800 bg-red-950/20";

// -- Links --
/** Accent-colored inline link (e.g. "Upload New", "View Details"). */
export const LINK_ACCENT = "text-rose-400 hover:text-rose-300";

// -- Buttons --
/** Standard primary button. */
export const BTN_PRIMARY =
  "rounded-md bg-red-900/60 border border-red-800/60 px-4 py-2 text-sm font-medium text-red-100 hover:bg-red-800/70 transition-colors";
/** Smaller button (e.g. Refresh). */
export const BTN_SM =
  "rounded-md bg-red-900/60 border border-red-800/60 px-3 py-1 text-sm font-medium text-red-100 hover:bg-red-800/70";
/** Red-to-rose gradient button used on landing pages (Sign in, Start Analysis). */
export const BTN_GRADIENT =
  "rounded-md bg-gradient-to-r from-red-600 to-rose-700 text-white hover:brightness-110";
/** Secondary ghost button (hero page, outline style). */
export const BTN_SECONDARY =
  "inline-flex items-center gap-2 rounded-md border border-red-800/30 px-6 py-3 text-sm text-white/90 hover:text-red-400";

// -- Form inputs --
export const INPUT =
  "w-full rounded-md border border-red-900/50 bg-black/40 p-2 text-white focus:border-red-700 focus:ring-red-700";
export const SELECT =
  "w-full rounded-md border border-red-900/50 bg-black/40 p-2 text-white focus:border-red-700 focus:ring-red-700";

// -- Table --
/** Column header text color (also used for section sub-headings like "Key biomarkers"). */
export const TABLE_HEADER_TEXT   = "text-red-300";
/** Unhealthy row: red-tinted background + top border. */
export const TABLE_ROW_UNHEALTHY = "border-t border-red-900/60 bg-red-950/40";
/** Healthy row: subtle top border. */
export const TABLE_ROW_HEALTHY   = "border-t border-rose-900/20";
/** Section/card divider border (use alongside `border-t` when needed). */
export const BORDER_MUTED        = "border-rose-900/30";

// -- Typography --
/** Dimmed helper / label text. */
export const TEXT_MUTED = "text-sm text-rose-200/50";
export const TEXT_LABEL = "text-xs text-rose-300";
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
