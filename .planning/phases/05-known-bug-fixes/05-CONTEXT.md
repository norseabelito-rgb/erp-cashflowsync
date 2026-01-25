# Phase 5: Known Bug Fixes - Context

**Gathered:** 2026-01-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Resolve documented bugs discovered during Phase 1 codebase audit: image sync unique constraint failures, SKU dropdown showing assigned SKUs, order detail missing line items, and ads webhook notification duplicates. These are fixes to existing functionality, not new features.

</domain>

<decisions>
## Implementation Decisions

### Image sync behavior
- Skip silently if image URL already exists in database (no re-download)
- On download failure: collect all failures and show summary at end ("3 images failed to sync")
- One image record, multiple product references when same URL appears across products
- Show live progress indicator during sync: "Syncing images... 23/48"

### SKU assignment UX
- Dropdown has grouped sections: "Available" at top, "Already assigned" below (collapsed by default)
- Search filter is always enabled and filters across both sections
- Assigned SKUs show product name + clickable link to that product
- Clicking assigned SKU shows which product owns it (not selectable for assignment)
- If no available SKUs: show yellow warning banner "All SKUs assigned. Create more in inventory."
- Form remains submittable without SKU (warning, not blocking)

### Order detail display
- Line items shown as cards, each with: product image thumbnail, name, SKU, quantity, unit price, VAT, line total
- Cards layout (not table) for more visual presentation
- Quick actions available per line item: view product, check stock
- Empty state: yellow alert warning "Order has no line items. This may indicate a sync issue."

### Notification handling
- Deduplicate using Facebook's webhook event ID as unique key
- Keep first occurrence only, silently ignore duplicates
- No user settings for notifications in this phase

### Claude's Discretion
- Exact progress bar/indicator implementation style
- Image retry strategy details
- Current SKU handling in product edit form
- Deduplication time window (reasonable default)
- Stock check quick action implementation details

</decisions>

<specifics>
## Specific Ideas

- SKU dropdown should feel organized, not overwhelming — collapsed "already assigned" section keeps focus on available options
- Order line item cards should show enough info that warehouse staff can verify picking without clicking through
- Image sync progress should be non-blocking (user can navigate away if needed)

</specifics>

<deferred>
## Deferred Ideas

- Notification user preferences/settings (mute, frequency control) — future phase
- SKU reassignment flow (move SKU from one product to another) — not in scope

</deferred>

---

*Phase: 05-known-bug-fixes*
*Context gathered: 2026-01-25*
