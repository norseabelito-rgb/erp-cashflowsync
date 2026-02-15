---
status: resolved
trigger: "Customer names displayed on the customers page don't match the actual order data."
created: 2026-02-15T00:00:00Z
updated: 2026-02-15T00:03:00Z
---

## Current Focus

hypothesis: CONFIRMED - MAX() on name fields independently picks wrong names
test: N/A - fix applied and verified
expecting: N/A
next_action: Archive and commit

## Symptoms

expected: Customer name on the customers page should match the name on their orders
actual: Customer names are wrong/mixed up - order has different name than customers page shows
errors: No errors - data is just wrong
reproduction: Pick any customer from customers page, find their order, compare names
started: After recent fix that changed customer grouping from email-only to composite key (email > phone > name)

## Eliminated

## Evidence

- timestamp: 2026-02-15T00:01:00Z
  checked: src/app/api/customers/route.ts - SQL aggregation query
  found: |
    The query uses:
    - COALESCE(email, phone, 'name:First Last') as grouping key
    - MAX(customerFirstName) as firstName
    - MAX(customerLastName) as lastName
    These are independent MAX() calls across all orders in a group.
  implication: |
    BUG 1 (Frankenstein names): If a customer (grouped by email) has orders with
    firstName "Ana" and "Zoe", MAX picks "Zoe". If lastName has "Barbu" and "Ionescu",
    MAX picks "Ionescu". Result: "Zoe Ionescu" which may not be any real person.

    BUG 2 (Wrong person): When grouping by phone, different people who share a phone
    (e.g., family members, company phone) get merged. MAX picks one name arbitrarily.

    The detail endpoint ([email]/route.ts) correctly uses the most recent order's name
    (line 177-194), so the list page shows MAX-based name but detail shows most-recent name.
    This explains the mismatch the user reported.

- timestamp: 2026-02-15T00:01:00Z
  checked: src/app/api/customers/[email]/route.ts - Detail endpoint
  found: |
    Line 177-194: Uses mostRecentOrder = orders[0] (ordered by createdAt desc)
    to get customer info. This is correct - shows the most recent name.
  implication: |
    The list page (MAX-based) and detail page (most-recent-based) use DIFFERENT
    strategies to determine the customer name. This is the direct cause of the mismatch.

- timestamp: 2026-02-15T00:02:00Z
  checked: TypeScript compilation after fix
  found: Zero type errors in customer files. Pre-existing errors only in unrelated files (docs, intercompany, returns manifest).
  implication: Fix compiles cleanly.

- timestamp: 2026-02-15T00:02:00Z
  checked: Embed client (customers-embed-client.tsx)
  found: Uses the same /api/customers endpoint. No separate SQL logic.
  implication: Fix covers both dashboard and embed views.

## Resolution

root_cause: |
  The customers list query uses MAX(customerFirstName) and MAX(customerLastName) independently
  to pick display names. MAX() selects the alphabetically-last value across ALL orders in a group.
  This causes two problems:
  1. Frankenstein names: firstName from one order, lastName from another (e.g., "Zoe Ionescu"
     when neither "Zoe Ionescu" nor any real person has that combination)
  2. Inconsistency with detail view: detail endpoint uses most recent order's name, but
     list page uses MAX(). User sees one name in the list, different name in detail.

fix: |
  Replaced the flat GROUP BY + MAX() query with a CTE + ROW_NUMBER() approach:
  - CTE "ranked" assigns ROW_NUMBER() per customer group, ordered by createdAt DESC
  - Main query joins all rows with the rn=1 (most recent) row per group
  - Name, email, phone fields come from the most recent order (via the "latest" join)
  - Aggregate fields (count, sum, max/min dates) still computed across all orders
  This matches the detail endpoint's strategy of using the most recent order for customer info.

verification: |
  - TypeScript compilation: zero errors in customer files
  - SQL logic verified: JOIN produces same row count (no duplication), GROUP BY is correct
  - Both dashboard and embed views use same API endpoint, so both are fixed
  - Build failed due to unrelated ETIMEDOUT network issue (cssnano webpack), not code-related

files_changed:
  - src/app/api/customers/route.ts
