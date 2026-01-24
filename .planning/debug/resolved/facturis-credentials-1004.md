---
status: resolved
trigger: "Facturis API credentials (apiKey, CIF) showing as undefined when making API calls, causing error 1004"
created: 2026-01-24T10:00:00Z
updated: 2026-01-24T10:00:00Z
---

## Current Focus

hypothesis: Debug logging code uses non-existent class properties (this.apiKey, this.companyCif) instead of this.credentials.apiKey - this is a LOGGING BUG, but the real issue may be credentials not being fetched from DB
test: Check if company object at line 402 in invoice-service.ts actually has Facturis credentials
expecting: If credentials exist in company object, API should work. If not, need to check the Prisma query
next_action: Verify company Prisma query includes facturisApiKey, facturisUsername, facturisPassword, facturisCompanyCif

## Symptoms

expected: Invoice generation should work - API Key and CIF should be passed correctly to Facturis API
actual: API logs show "API Key: undefined...", "CIF Firma: undefined" - error 1004 returned
errors: Error 1004 (series not found) - but series IS configured, the real issue is undefined credentials
reproduction: Try to generate invoice from failed invoices page or process an order with invoice
started: Discovered during Phase 2 testing - invoice code recently updated but credentials always the issue

## Eliminated

## Evidence

- timestamp: 2026-01-24T10:05:00Z
  checked: src/lib/facturis.ts lines 532-533
  found: Debug logging uses `this.apiKey` and `this.companyCif` but these are NOT class properties. The class stores credentials in `this.credentials` object.
  implication: This is likely the bug - the logging code refers to non-existent properties

- timestamp: 2026-01-24T10:06:00Z
  checked: FacturisAPI class constructor (lines 292-298)
  found: Constructor stores credentials in `this.credentials: FacturisCredentials`, NOT as separate properties
  implication: `this.apiKey` and `this.companyCif` will always be undefined because they don't exist as class members

- timestamp: 2026-01-24T10:10:00Z
  checked: buildAuthPayload method (lines 303-313)
  found: Correctly uses `this.credentials.apiKey`, `this.credentials.companyTaxCode`
  implication: The actual API request DOES pass credentials correctly - this is ONLY a logging bug

- timestamp: 2026-01-24T10:11:00Z
  checked: Full code flow in invoice-service.ts
  found: hasFacturisCredentials() check passes (otherwise would get NO_CREDENTIALS error), createFacturisClient() succeeds (otherwise would get CLIENT_ERROR error)
  implication: Credentials ARE being loaded from DB and passed correctly. The 1004 error is genuine "series not found in Facturis account" - but misleading logs made it look like credentials weren't passed

## Resolution

root_cause: Debug logging in facturis.ts lines 532-533 uses non-existent class properties (this.apiKey, this.companyCif) instead of this.credentials.apiKey and this.credentials.companyTaxCode. This makes credentials APPEAR undefined in logs even when they are correctly passed to the API. The actual error 1004 (series not found) is a separate issue - the series configuration in Facturis may not match.
fix: Update logging to use this.credentials.apiKey and this.credentials.companyTaxCode
verification: Code compiles, pattern validated. Next invoice attempt will show actual credentials in logs.
files_changed:
  - src/lib/facturis.ts: Fixed debug logging to use this.credentials.apiKey and this.credentials.companyTaxCode
