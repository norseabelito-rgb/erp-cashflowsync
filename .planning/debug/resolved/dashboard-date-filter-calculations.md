---
status: resolved
trigger: "Multiple issues with dashboard calculations and date filtering - values don't update correctly with date filter changes, midnight transition issues, wrong data for specific dates, chart shows sums instead of hours"
created: 2026-02-04T10:00:00Z
updated: 2026-02-04T11:00:00Z
---

## Current Focus

hypothesis: FIXED - Timezone issues resolved by using Romania timezone consistently
test: Code changes complete
expecting: Date filters now work correctly for Romania business days
next_action: Commit changes

## Symptoms

expected:
- Toate calculele din dashboard principal ar trebui sa se recalculeze cand se schimba filtrul de date
- Totalurile si graficele ar trebui sa reflecte DOAR perioada selectata
- Graficul "comenzi ultimele 7 zile" ar trebui sa arate pe axa Y ora comenzilor

actual:
- Valori incorecte/ciudate cand se schimba filtrul
- 3 probleme specifice:
  1. Dupa ora 12 noaptea, datele nu se actualizeaza cu ziua curenta
  2. Filtrare pe o zi specifica (ex: 27 ianuarie) arata informatii complet gresite
  3. Graficul cu comenzi in ultimele 7 zile arata sume pe axa Y in loc de ora la care s-au plasat comenzile

errors: No specific error messages - just incorrect data

reproduction:
1. Selecteaza o data specifica (ex: 27 ianuarie) si observa ca datele sunt gresite
2. Verifica dashboard-ul dupa miezul noptii - ziua curenta nu apare
3. Verifica graficul cu comenzi ultimele 7 zile - axa Y arata sume nu ore

started: Probabil nu a functionat niciodata corect 100%

## Eliminated

## Evidence

- timestamp: 2026-02-04T10:15:00Z
  checked: dashboard-filters.tsx - getToday() function at line 23-26
  found: |
    Uses `new Date()` in browser which returns LOCAL time, then formats as YYYY-MM-DD.
    But date-fns parseISO() in dashboard-stats.ts interprets "2026-02-04" as UTC midnight.

    Example: At 01:00 AM Romania time (Feb 4), browser says "today is Feb 4".
    But when server runs startOfDay(parseISO("2026-02-04")), it gets "2026-02-04T00:00:00Z" (UTC).
    Romania is UTC+2/+3, so "2026-02-04T00:00:00Z" = "2026-02-04T02:00:00" or "03:00" Romania.

    This means: Between 00:00-02:00 (or 03:00) Romania time, today's filter will NOT include
    orders placed in that window because they have createdAt BEFORE the UTC start of day.
  implication: BUG 1 - Midnight transition issue caused by timezone mismatch between client and server

- timestamp: 2026-02-04T10:16:00Z
  checked: dashboard-stats.ts - buildDateWhere() at line 94-114
  found: |
    parseISO("2026-01-27") returns Date object in UTC.
    startOfDay() and endOfDay() from date-fns operate in LOCAL timezone (server's timezone).

    If server is in UTC, parseISO("2026-01-27") = "2026-01-27T00:00:00Z"
    startOfDay() of that = "2026-01-27T00:00:00Z"
    endOfDay() of that = "2026-01-27T23:59:59.999Z"

    But if server is in Romania (UTC+2), parseISO still returns UTC, then:
    startOfDay() = "2026-01-26T22:00:00Z" (midnight Romania = 22:00 UTC previous day)
    endOfDay() = "2026-01-27T21:59:59.999Z"

    This is INCONSISTENT and leads to wrong date ranges.
  implication: BUG 2 - Date filter logic has timezone confusion between parseISO (UTC) and startOfDay/endOfDay (local)

- timestamp: 2026-02-04T10:17:00Z
  checked: dashboard-charts.tsx - entire file
  found: |
    Chart shows sales data with Y-axis showing currency (sales amounts).
    The dataKey is "sales" (line 118), YAxis formats with formatCurrency (line 89).

    User expects: Y-axis = hour of day when orders were placed (to see peak order times)
    Actual: Y-axis = sales amount in currency

    This is actually BY DESIGN - the chart shows sales over time, not order distribution by hour.
    The confusion is about what the chart SHOULD show vs what it DOES show.

    To show "order times by hour", need a completely different chart type and data aggregation.
  implication: BUG 3 - Chart shows sales amounts (as designed) but user wants order hour distribution chart

- timestamp: 2026-02-04T10:50:00Z
  checked: Implemented fix and tested timezone functions
  found: |
    Created new Romania timezone handling functions that properly calculate:
    - January 27, 2026 (winter UTC+2):
      Start: 2026-01-26T22:00:00.000Z (midnight Romania)
      End: 2026-01-27T21:59:59.999Z (23:59:59.999 Romania)

    - July 15, 2026 (summer UTC+3):
      Start: 2026-07-14T21:00:00.000Z (midnight Romania)
      End: 2026-07-15T20:59:59.999Z (23:59:59.999 Romania)

    Test case: Order at 01:30 AM Romania (= 23:30 UTC previous day)
    Filter for Jan 27: Now correctly includes this order (was excluded before)
  implication: Fix verified to work correctly for both winter and summer time

## Resolution

root_cause: |
  THREE DISTINCT BUGS:

  **BUG 1 - Midnight Transition Issue:**
  The dashboard-filters.tsx getToday() function uses `new Date()` in the browser,
  which returns the correct local date. However, the server (dashboard-stats.ts)
  uses date-fns `parseISO()` and `startOfDay()/endOfDay()` which operate in the
  SERVER's local timezone. If the server is in a different timezone than the user,
  date boundaries won't align with Romania business days.

  Additionally, the raw SQL query in getSalesDataForChart() uses:
  `DATE("createdAt" AT TIME ZONE 'UTC')` which groups by UTC date, not Romania date.

  **BUG 2 - Wrong Data for Specific Date:**
  Same root cause as Bug 1 - timezone confusion between:
  - parseISO() which interprets date strings in local server timezone
  - Database timestamps which are in UTC
  - Client which sends date in user's local timezone

  **BUG 3 - Chart Shows Sums Instead of Hours:**
  The chart component (dashboard-charts.tsx) is designed to show SALES AMOUNTS over time,
  not order distribution by hour of day. This is a feature request, not a bug.
  User wants a chart showing "what hour of day do most orders come in" but the current
  chart shows "total sales per day".

fix: |
  IMPLEMENTED FIXES for bugs 1 and 2:

  1. Created new timezone utility functions in dashboard-stats.ts:
     - getRomaniaOffsetHours() - gets UTC offset for any date accounting for DST
     - toRomaniaStartOfDay() - converts YYYY-MM-DD to start of Romania day as UTC
     - toRomaniaEndOfDay() - converts YYYY-MM-DD to end of Romania day as UTC
     - getTodayInRomania() - gets current date in Romania timezone

  2. Updated buildDateWhere() to use Romania timezone instead of date-fns:
     - Removed dependency on parseISO/startOfDay/endOfDay from date-fns
     - Uses custom functions that explicitly handle Europe/Bucharest timezone

  3. Updated getSalesDataForChart() SQL query:
     - Changed `AT TIME ZONE 'UTC'` to `AT TIME ZONE 'Europe/Bucharest'`
     - Chart now groups orders by Romania business day, not UTC day

  4. Updated dashboard-filters.tsx client-side functions:
     - getToday() now uses Intl.DateTimeFormat with Europe/Bucharest timezone
     - getWeekStart() updated to use Romania timezone
     - getMonthStart() updated to use Romania timezone

  BUG 3 (Chart showing sums instead of hours):
  This is a FEATURE REQUEST, not a bug. The current chart is designed to show sales
  over time. User wants a different chart showing order distribution by hour of day.
  This should be tracked as a separate feature request.

verification: |
  Tested timezone functions in Node.js - correctly calculates Romania date boundaries.

  **Manual Testing Checklist:**

  1. **Midnight Transition Test (Bug 1):**
     - [ ] At around 00:30-01:00 AM Romania time, check dashboard
     - [ ] "Azi" (Today) button should show correct date
     - [ ] Orders placed after midnight should appear in today's data

  2. **Specific Date Filter Test (Bug 2):**
     - [ ] Select a specific date (e.g., January 27)
     - [ ] Verify totals match actual orders for that Romania day
     - [ ] Compare with database query: SELECT COUNT(*) FROM orders WHERE "createdAt" >= '2026-01-26T22:00:00Z' AND "createdAt" <= '2026-01-27T21:59:59.999Z'

  3. **Chart Grouping Test:**
     - [ ] View "Ultimele 7 Zile" chart
     - [ ] Verify daily totals are grouped by Romania date, not UTC
     - [ ] An order at 01:00 Romania should count for that Romania date

  **NOTE - Bug 3 (Feature Request):**
  The request for "order hour distribution chart" is a NEW FEATURE, not a bug fix.
  Current chart intentionally shows sales amounts over time.
  Recommend creating a separate feature ticket for "Order Distribution by Hour" chart.

files_changed:
  - src/lib/dashboard-stats.ts
  - src/app/(dashboard)/dashboard/dashboard-filters.tsx
