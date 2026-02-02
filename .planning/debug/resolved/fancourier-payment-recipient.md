---
status: resolved
trigger: "Toate AWB-urile FanCourier se emit cu plata la destinatar, dar transportul este deja inclus în prețul comenzii"
created: 2026-01-28T10:00:00Z
updated: 2026-01-28T10:10:00Z
commit: ae21a72
---

## Current Focus

hypothesis: CONFIRMED - Logic confusion between COD payment type and shipping payment
test: Verify fix is correctly applied in all locations
expecting: All payment fields now set to "sender"
next_action: Archive session after verification

## Symptoms

expected: Transportul este inclus în suma totală a comenzii, nu trebuie sa se perceapa plata suplimentara la destinatar pentru transport
actual: AWB-urile FanCourier se emit cu plata la destinatar
errors: N/A - functioneaza dar cu setare gresita
reproduction: Emite orice AWB FanCourier - plata va fi la destinatar
started: Mereu a fost asa, de la implementare

## Eliminated

## Evidence

- timestamp: 2026-01-28T10:02:00Z
  checked: src/lib/fancourier.ts line 338
  found: Default payment was "recipient" - `payment: data.payment || "recipient"`
  implication: FanCourier API payload defaults to recipient paying for shipping

- timestamp: 2026-01-28T10:03:00Z
  checked: src/lib/awb-service.ts lines 225-228, 299
  found: |
    Code conflates two different concepts:
    1. paymentType refers to COD (cash on delivery) - who pays for products
    2. payment field in FanCourier API refers to who pays for SHIPPING

    Logic: `payment: isRamburs ? "recipient" : "sender"`
    This sets shipping payment based on whether COD is enabled, which is wrong.

    The two are independent:
    - COD (ramburs) = recipient pays for products on delivery (handled by `cod` field)
    - Shipping payment = who pays transport costs (handled by `payment` field)

    In this business model, shipping is ALWAYS included in order price,
    so sender should ALWAYS pay for transport regardless of COD status.
  implication: ROOT CAUSE FOUND - payment field is incorrectly tied to COD logic

- timestamp: 2026-01-28T10:04:00Z
  checked: src/lib/fancourier.ts line 1148
  found: Another instance of same bug in legacy createAWBForOrder function
  implication: Bug exists in two places - both need fixing

- timestamp: 2026-01-28T10:08:00Z
  checked: All three locations after fix
  found: |
    All instances now correctly use "sender":
    - fancourier.ts:338 - payment: data.payment || "sender"
    - fancourier.ts:1148 - payment: "sender"
    - awb-service.ts:299 - payment: "sender"
  implication: Fix verified in all locations

## Resolution

root_cause: |
  The code conflated two separate payment concepts:
  1. `payment` field in FanCourier API = who pays for SHIPPING/TRANSPORT
  2. `cod` field in FanCourier API = cash on delivery amount (what recipient pays for products)

  The code incorrectly tied shipping payment to COD status:
  `payment: isRamburs ? "recipient" : "sender"`

  This meant when COD was enabled (recipient pays for products), the code also
  set recipient to pay for shipping - which is wrong since shipping is included
  in the order price.

  The fix: shipping payment should ALWAYS be "sender" regardless of COD status.

fix: |
  Changed payment to always be "sender" in three locations:
  1. src/lib/awb-service.ts:299 - Changed from `isRamburs ? "recipient" : "sender"` to `"sender"`
  2. src/lib/fancourier.ts:338 - Changed default from `"recipient"` to `"sender"`
  3. src/lib/fancourier.ts:1148 - Changed from `isRamburs ? "recipient" : "sender"` to `"sender"`

verification: |
  - Grep confirms all three locations now use "sender"
  - No new TypeScript errors introduced (pre-existing errors in unrelated files)
  - Logic is now correct: shipping paid by sender, COD handled separately by cod field

files_changed:
  - src/lib/awb-service.ts
  - src/lib/fancourier.ts
