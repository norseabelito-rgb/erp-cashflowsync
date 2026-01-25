# Phase 6: UX Foundation - Context

**Gathered:** 2026-01-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Consistent, intuitive user interface across all existing pages. This phase improves visual polish, interaction feedback, and responsiveness of current functionality. New features or pages are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Tooltip Behavior
- Text labels on all buttons - no icon-only buttons
- Tooltips show action + consequence (e.g., "Genereaza factura - se trimite catre Oblio")
- 300ms delay before tooltip appears
- Disabled buttons always show tooltip explaining why disabled

### Visual Baseline
- Fresh start - define new visual standards, update all pages to match
- Clean and minimal style (like Notion) - white space, subtle shadows, light colors
- Semantic colors for status indicators - each status type has distinct color (blue=info, purple=processing, red=error, green=success, etc.)
- Alternating row colors in tables for easier scanning

### Responsive Strategy
- Secondary priority - desktop is primary use, mobile is occasional fallback
- Tables use horizontal scroll on smaller screens
- Sidebar is collapsible - icon-only on tablets, hamburger menu on mobile
- Primary action buttons in fixed bottom bar on mobile

### Feedback Patterns
- Skeleton screens for all loading states
- Toast notifications for success messages (auto-dismiss)
- Modal for critical errors with clear, well-explained details in Romanian
- Empty states show illustration + guidance text + action button

### Claude's Discretion
- Specific color palette values
- Exact spacing/typography scale
- Skeleton animation style
- Illustration style for empty states
- Toast positioning and duration

</decisions>

<specifics>
## Specific Ideas

- "Clean and minimal like Notion" - reference for visual feel
- Error messages must be in Romanian, easy to understand, well explained
- Consistency across all pages is the main goal - every page should feel like the same app

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope

</deferred>

---

*Phase: 06-ux-foundation*
*Context gathered: 2026-01-25*
