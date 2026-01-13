/**
 * Design System Constants
 * Single source of truth for design patterns across the application.
 * Import these constants to maintain consistent styling globally.
 */

// =============================================================================
// PAGE LAYOUT
// =============================================================================

/** Standard page padding - responsive from mobile to desktop */
export const PAGE_PADDING = "px-4 py-6 md:px-6 md:py-8 lg:px-8 lg:py-10";

/** Maximum content width with centering */
export const PAGE_MAX_WIDTH = "max-w-7xl mx-auto";

/** Combined page container styles */
export const PAGE_CONTAINER = `${PAGE_PADDING} ${PAGE_MAX_WIDTH}`;

// =============================================================================
// SPACING
// =============================================================================

/** Vertical spacing between major sections */
export const SECTION_SPACING = "space-y-6";

/** Vertical spacing within cards/containers */
export const CARD_SPACING = "space-y-4";

/** Gap for grid layouts */
export const GRID_GAP = "gap-4 md:gap-6";

// =============================================================================
// PAGE HEADER STYLES
// =============================================================================

export const PAGE_HEADER = {
  /** Wrapper for the entire header area */
  wrapper: "flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6 md:mb-8",
  /** Title and description container */
  content: "space-y-1",
  /** Page title styling */
  title: "text-2xl md:text-3xl font-semibold tracking-tight",
  /** Page description/subtitle styling */
  description: "text-muted-foreground text-sm md:text-base",
  /** Actions container (buttons, etc.) */
  actions: "flex items-center gap-2 flex-wrap",
} as const;

// =============================================================================
// TABLE STYLES
// =============================================================================

/** Standard table container with border and rounded corners */
export const TABLE_CONTAINER = "rounded-lg border bg-card overflow-hidden";

/** Table header row background */
export const TABLE_HEADER_ROW = "bg-muted/30";

/** Table cell padding */
export const TABLE_CELL = "px-4 py-3";

// =============================================================================
// FILTER BAR STYLES
// =============================================================================

/** Filter/search bar container */
export const FILTER_BAR = "flex flex-col sm:flex-row flex-wrap gap-3 md:gap-4 mb-4 md:mb-6";

/** Filter input minimum width */
export const FILTER_INPUT_WIDTH = "w-full sm:w-[200px] md:w-[280px]";

/** Select dropdown width */
export const FILTER_SELECT_WIDTH = "w-full sm:w-[180px]";

// =============================================================================
// EMPTY STATE STYLES
// =============================================================================

export const EMPTY_STATE = {
  /** Container wrapper */
  wrapper: "flex flex-col items-center justify-center py-16 px-4 text-center",
  /** Icon container */
  iconWrapper: "rounded-full bg-muted p-4 mb-4",
  /** Icon styling */
  icon: "h-8 w-8 text-muted-foreground",
  /** Title styling */
  title: "text-lg font-medium mb-1",
  /** Description styling */
  description: "text-sm text-muted-foreground mb-6 max-w-sm",
} as const;

// =============================================================================
// STATUS STYLES
// =============================================================================

/** Semantic status styling using CSS variable tokens */
export const STATUS_STYLES = {
  pending: "bg-status-warning/10 text-status-warning border border-status-warning/20",
  processing: "bg-status-info/10 text-status-info border border-status-info/20",
  success: "bg-status-success/10 text-status-success border border-status-success/20",
  error: "bg-status-error/10 text-status-error border border-status-error/20",
  neutral: "bg-status-neutral/10 text-status-neutral border border-status-neutral/20",
} as const;

export type StatusType = keyof typeof STATUS_STYLES;

// =============================================================================
// CARD STYLES
// =============================================================================

export const CARD_STYLES = {
  /** Default card styling */
  default: "rounded-lg border bg-card shadow-sm",
  /** Elevated card with more shadow */
  elevated: "rounded-lg border bg-card shadow-md",
  /** Interactive card with hover effect */
  interactive: "rounded-lg border bg-card shadow-sm transition-all hover:shadow-md hover:border-primary/30",
  /** Subtle card with minimal styling */
  subtle: "rounded-lg bg-muted/30",
} as const;

// =============================================================================
// ANIMATION CLASSES
// =============================================================================

export const ANIMATIONS = {
  /** Fade in animation */
  fadeIn: "animate-fade-in",
  /** Scale in animation */
  scaleIn: "animate-scale-in",
  /** Slide in from left */
  slideIn: "animate-slide-in",
  /** Pulse glow effect */
  pulseGlow: "animate-pulse-glow",
  /** Shimmer loading effect */
  shimmer: "animate-shimmer",
} as const;

// =============================================================================
// TRANSITION CLASSES
// =============================================================================

export const TRANSITIONS = {
  /** Fast transition (150ms) */
  fast: "transition-all duration-150 ease-out",
  /** Normal transition (200ms) */
  normal: "transition-all duration-200 ease-out",
  /** Slow transition (300ms) */
  slow: "transition-all duration-300 ease-out",
  /** Color only transition */
  colors: "transition-colors duration-200",
} as const;

// =============================================================================
// FOCUS STYLES
// =============================================================================

/** Standard focus ring styling */
export const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

/** Focus ring with background offset */
export const FOCUS_RING_OFFSET = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

// =============================================================================
// RESPONSIVE BREAKPOINTS (for reference)
// =============================================================================

export const BREAKPOINTS = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1400px",
} as const;

// =============================================================================
// Z-INDEX SCALE
// =============================================================================

export const Z_INDEX = {
  dropdown: "z-50",
  modal: "z-50",
  popover: "z-50",
  tooltip: "z-50",
  toast: "z-[100]",
  overlay: "z-40",
} as const;
