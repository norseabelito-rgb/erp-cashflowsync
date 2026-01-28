---
id: quick-002
type: quick
title: Return AWB Mapping
status: planned
created: 2025-01-28
files_modified:
  - prisma/schema.prisma
  - src/lib/returns.ts
  - src/app/api/returns/scan/route.ts
  - src/app/(dashboard)/returns/page.tsx
autonomous: true
---

<objective>
Enable return AWB scanning and mapping to original orders.

When FanCourier marks an AWB as "return" (statuses S6, S7, S15, S16, S33, S43), they issue a NEW return AWB number. The user needs to scan this return AWB at the warehouse, and the system must map it back to the original order to enable invoice reversal (stornare) and stock return.

Purpose: Close the returns loop - connect physical return packages to their original orders for accounting and inventory reconciliation.

Output: New returns scan page + API + database model for tracking return AWBs mapped to original orders.
</objective>

<context>
Existing infrastructure:
- AWB model tracks outbound shipments (src/lib/awb-service.ts)
- FanCourier statuses track return events: S6 (refuz), S7 (refuz transport), S15 (refuz ramburs), S16 (retur termen), S33 (retur solicitat), S43 (retur)
- Handover scan page exists for outbound AWB predare (src/app/(dashboard)/handover/page.tsx)
- FanCourier tracking returns events with return AWB info in tracking data

Key insight from FanCourier workflow:
1. Original AWB (ex: 7000121083646) gets status S6/S43 (return)
2. FanCourier generates a NEW return AWB (different number) for the return shipment
3. Return AWB arrives at warehouse - needs scanning
4. System must link return AWB -> original AWB -> original Order
</context>

<tasks>

<task type="auto">
  <name>Task 1: Database schema for return AWB tracking</name>
  <files>prisma/schema.prisma</files>
  <action>
Add ReturnAWB model to track return shipments and their mapping to original orders:

```prisma
// Return AWB tracking - maps return shipments to original orders
model ReturnAWB {
  id                String   @id @default(cuid())

  // The return AWB number (scanned at warehouse)
  returnAwbNumber   String   @unique

  // Link to original AWB (the outbound shipment that was returned)
  originalAwbId     String?
  originalAwb       AWB?     @relation("OriginalToReturn", fields: [originalAwbId], references: [id])

  // Direct link to order (for cases where original AWB might be deleted)
  orderId           String?
  order             Order?   @relation(fields: [orderId], references: [id])

  // Status tracking
  status            String   @default("received") // received, processed, stock_returned, invoice_reversed

  // Scan info
  scannedAt         DateTime @default(now())
  scannedBy         String?
  scannedByName     String?

  // Processing info
  processedAt       DateTime?
  processedBy       String?
  processedByName   String?

  // Notes
  notes             String?

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([orderId])
  @@index([originalAwbId])
  @@index([status])
  @@index([scannedAt])
  @@map("return_awbs")
}
```

Also add relation to AWB model:
```prisma
// In model AWB, add:
returnAwbs        ReturnAWB[] @relation("OriginalToReturn")
```

And relation to Order model:
```prisma
// In model Order, add:
returnAwbs        ReturnAWB[]
```

After schema update, run: `npx prisma db push`
  </action>
  <verify>
- `npx prisma db push` completes without errors
- `npx prisma generate` regenerates client
- ReturnAWB model accessible via prisma.returnAWB
  </verify>
  <done>
ReturnAWB model exists in schema with proper relations to AWB and Order.
  </done>
</task>

<task type="auto">
  <name>Task 2: Return scan API and business logic</name>
  <files>src/lib/returns.ts, src/app/api/returns/scan/route.ts</files>
  <action>
Create src/lib/returns.ts with core business logic:

```typescript
/**
 * Returns Management - Business Logic
 *
 * Handles:
 * - Scanning return AWBs
 * - Mapping to original orders via FanCourier tracking
 * - Return status tracking
 */

import prisma from "@/lib/db";
import { FanCourierAPI, getDefaultFanCourier } from "@/lib/fancourier";

export interface ScanReturnResult {
  success: boolean;
  message: string;
  type: "success" | "error" | "warning";
  returnAwb?: {
    id: string;
    returnAwbNumber: string;
    originalAwbNumber: string | null;
    orderNumber: string | null;
    orderId: string | null;
    status: string;
  };
}

/**
 * Scan a return AWB and map it to the original order
 *
 * Strategy:
 * 1. Check if return AWB already scanned
 * 2. Search for AWB in our database (might be one of our original AWBs in return status)
 * 3. If not found directly, search for AWBs with return status and check if this is their return shipment
 * 4. Create ReturnAWB record with mapping
 */
export async function scanReturnAWB(
  returnAwbNumber: string,
  userId: string,
  userName: string
): Promise<ScanReturnResult> {
  // Clean the AWB number (handle barcode prefix)
  const cleanAwbNumber = returnAwbNumber.trim();
  const awbPrefix = cleanAwbNumber.length > 13 ? cleanAwbNumber.substring(0, 13) : cleanAwbNumber;

  // 1. Check if already scanned
  const existing = await prisma.returnAWB.findFirst({
    where: {
      OR: [
        { returnAwbNumber: cleanAwbNumber },
        { returnAwbNumber: awbPrefix },
      ],
    },
    include: {
      originalAwb: true,
      order: true,
    },
  });

  if (existing) {
    return {
      success: false,
      message: `AWB de retur ${cleanAwbNumber} a fost deja scanat pe ${existing.scannedAt.toLocaleDateString("ro-RO")}`,
      type: "error",
      returnAwb: {
        id: existing.id,
        returnAwbNumber: existing.returnAwbNumber,
        originalAwbNumber: existing.originalAwb?.awbNumber || null,
        orderNumber: existing.order?.shopifyOrderNumber || null,
        orderId: existing.orderId,
        status: existing.status,
      },
    };
  }

  // 2. Check if this AWB is actually one of our original AWBs (in return status)
  const directMatch = await prisma.aWB.findFirst({
    where: {
      OR: [
        { awbNumber: cleanAwbNumber },
        { awbNumber: awbPrefix },
      ],
    },
    include: {
      order: true,
    },
  });

  if (directMatch) {
    // This is our original AWB - check if it's in return status
    const isReturnStatus = ["returned", "S6", "S7", "S15", "S16", "S33", "S43"].some(
      s => directMatch.currentStatus?.toLowerCase().includes(s.toLowerCase())
    );

    if (isReturnStatus) {
      // Create return record for our own AWB
      const returnRecord = await prisma.returnAWB.create({
        data: {
          returnAwbNumber: cleanAwbNumber,
          originalAwbId: directMatch.id,
          orderId: directMatch.orderId,
          scannedBy: userId,
          scannedByName: userName,
          status: "received",
        },
        include: {
          originalAwb: true,
          order: true,
        },
      });

      return {
        success: true,
        message: `Retur scanat! Comanda ${directMatch.order?.shopifyOrderNumber || directMatch.orderId}`,
        type: "success",
        returnAwb: {
          id: returnRecord.id,
          returnAwbNumber: returnRecord.returnAwbNumber,
          originalAwbNumber: directMatch.awbNumber,
          orderNumber: directMatch.order?.shopifyOrderNumber || null,
          orderId: directMatch.orderId,
          status: returnRecord.status,
        },
      };
    }
  }

  // 3. Search for AWBs in return status - this might be a FanCourier return AWB
  // When FanCourier creates a return, they generate a new AWB number
  // We need to find orders with RETURNED status and no return scan yet
  const pendingReturns = await prisma.aWB.findMany({
    where: {
      currentStatus: {
        in: ["returned", "RETURNED", "S6", "S7", "S15", "S16", "S33", "S43", "Refuz primire", "Retur"],
      },
      returnAwbs: {
        none: {},
      },
    },
    include: {
      order: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
    take: 50, // Limit to recent returns
  });

  if (pendingReturns.length > 0) {
    // We have pending returns - create an unlinked return record
    // User can manually link it or we can try to match via FanCourier API later
    const returnRecord = await prisma.returnAWB.create({
      data: {
        returnAwbNumber: cleanAwbNumber,
        scannedBy: userId,
        scannedByName: userName,
        status: "received",
        notes: `Scanat manual. ${pendingReturns.length} comenzi in retur neprocesat.`,
      },
    });

    return {
      success: true,
      message: `AWB de retur ${cleanAwbNumber} scanat. Exista ${pendingReturns.length} comenzi in retur - selecteaza comanda originala pentru mapare.`,
      type: "warning",
      returnAwb: {
        id: returnRecord.id,
        returnAwbNumber: returnRecord.returnAwbNumber,
        originalAwbNumber: null,
        orderNumber: null,
        orderId: null,
        status: returnRecord.status,
      },
    };
  }

  // 4. No pending returns found - still record the scan for later processing
  const returnRecord = await prisma.returnAWB.create({
    data: {
      returnAwbNumber: cleanAwbNumber,
      scannedBy: userId,
      scannedByName: userName,
      status: "received",
      notes: "AWB scanat - nu s-a gasit comanda originala automat",
    },
  });

  return {
    success: true,
    message: `AWB ${cleanAwbNumber} inregistrat. Comanda originala trebuie mapata manual.`,
    type: "warning",
    returnAwb: {
      id: returnRecord.id,
      returnAwbNumber: returnRecord.returnAwbNumber,
      originalAwbNumber: null,
      orderNumber: null,
      orderId: null,
      status: returnRecord.status,
    },
  };
}

/**
 * Get list of scanned returns
 */
export async function getScannedReturns(options?: {
  status?: string;
  limit?: number;
  unmappedOnly?: boolean;
}) {
  const whereClause: any = {};

  if (options?.status) {
    whereClause.status = options.status;
  }

  if (options?.unmappedOnly) {
    whereClause.orderId = null;
  }

  return prisma.returnAWB.findMany({
    where: whereClause,
    include: {
      originalAwb: {
        include: {
          order: {
            select: {
              id: true,
              shopifyOrderNumber: true,
              customerFirstName: true,
              customerLastName: true,
              totalPrice: true,
            },
          },
        },
      },
      order: {
        select: {
          id: true,
          shopifyOrderNumber: true,
          customerFirstName: true,
          customerLastName: true,
          totalPrice: true,
        },
      },
    },
    orderBy: {
      scannedAt: "desc",
    },
    take: options?.limit || 100,
  });
}

/**
 * Get pending returns (AWBs in return status without a return scan)
 */
export async function getPendingReturns() {
  return prisma.aWB.findMany({
    where: {
      currentStatus: {
        in: ["returned", "RETURNED", "S6", "S7", "S15", "S16", "S33", "S43", "Refuz primire", "Retur"],
      },
      returnAwbs: {
        none: {},
      },
    },
    include: {
      order: {
        select: {
          id: true,
          shopifyOrderNumber: true,
          customerFirstName: true,
          customerLastName: true,
          shippingCity: true,
          totalPrice: true,
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });
}

/**
 * Link a return AWB to an order
 */
export async function linkReturnToOrder(
  returnAwbId: string,
  orderId: string,
  userId: string,
  userName: string
): Promise<{ success: boolean; message: string }> {
  const returnAwb = await prisma.returnAWB.findUnique({
    where: { id: returnAwbId },
  });

  if (!returnAwb) {
    return { success: false, message: "Return AWB nu a fost gasit" };
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { awb: true },
  });

  if (!order) {
    return { success: false, message: "Comanda nu a fost gasita" };
  }

  await prisma.returnAWB.update({
    where: { id: returnAwbId },
    data: {
      orderId: orderId,
      originalAwbId: order.awb?.id || null,
      processedBy: userId,
      processedByName: userName,
      processedAt: new Date(),
    },
  });

  return {
    success: true,
    message: `Return AWB mapat la comanda ${order.shopifyOrderNumber}`,
  };
}
```

Create src/app/api/returns/scan/route.ts:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { scanReturnAWB } from "@/lib/returns";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    // Check permission (reuse handover.scan or create returns.scan)
    const canScan = await hasPermission(session.user.id, "handover.scan");
    if (!canScan) {
      return NextResponse.json(
        { error: "Nu ai permisiunea de a scana retururi" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { awbNumber } = body;

    if (!awbNumber) {
      return NextResponse.json({
        success: false,
        message: "Numarul AWB este obligatoriu",
        type: "error",
      });
    }

    const userName = session.user.name || session.user.email || "Unknown";
    const result = await scanReturnAWB(awbNumber, session.user.id, userName);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error in POST /api/returns/scan:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Eroare la scanare retur",
        type: "error",
      },
      { status: 500 }
    );
  }
}
```
  </action>
  <verify>
- File src/lib/returns.ts exists with scanReturnAWB, getScannedReturns, getPendingReturns, linkReturnToOrder functions
- File src/app/api/returns/scan/route.ts exists
- TypeScript compiles without errors: `npx tsc --noEmit`
  </verify>
  <done>
Return scan API and business logic implemented with automatic mapping and manual linking support.
  </done>
</task>

<task type="auto">
  <name>Task 3: Returns scan page UI</name>
  <files>src/app/(dashboard)/returns/page.tsx</files>
  <action>
Create src/app/(dashboard)/returns/page.tsx - a simplified version of the handover page focused on return scanning:

Key features:
1. Scanner input field (auto-focus, same as handover page)
2. List of recently scanned returns with status
3. List of pending returns (AWBs in return status without scan)
4. Manual linking for unmatched returns
5. Success/warning/error feedback with sounds (reuse handover pattern)

UI structure:
- Header: "Scanare Retururi" title
- Stats cards: Total scanate azi, Nemapate, Comenzi in retur
- Main area split:
  - Left: Scanner input + recent scans list
  - Right: Pending returns (orders awaiting physical return)
- Dialog for manual order linking when scan doesn't auto-match

Follow the same patterns from src/app/(dashboard)/handover/page.tsx:
- useQuery for data fetching
- useMutation for scan action
- Auto-focus on input
- Sound feedback (success/error beeps)
- Toast notifications

Key differences from handover:
- No session open/close (returns are ongoing)
- Show unmapped returns prominently
- Allow manual linking to pending return orders
  </action>
  <verify>
- File src/app/(dashboard)/returns/page.tsx exists
- Page renders at /returns route
- Scanner input accepts AWB and calls API
- Results display correctly with success/warning/error states
  </verify>
  <done>
Returns scan page implemented with scanner, status display, and manual linking capability.
  </done>
</task>

</tasks>

<verification>
After all tasks complete:
1. Database: `npx prisma studio` shows ReturnAWB table
2. API: `curl -X POST /api/returns/scan -d '{"awbNumber":"test123"}'` returns response
3. UI: Navigate to /returns, scan works, results display
4. Flow: Scan return AWB -> maps to order -> shows order info
</verification>

<success_criteria>
- User can navigate to /returns page
- User can scan a return AWB number
- System attempts to auto-map to original order
- If auto-map fails, user can manually link to pending return orders
- Scanned returns are tracked with status
- Foundation ready for future: invoice reversal, stock return processing
</success_criteria>
