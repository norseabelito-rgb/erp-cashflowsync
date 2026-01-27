import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { createFanCourierClient } from "@/lib/fancourier";
import prisma from "@/lib/db";

/**
 * POST /api/awb/repair/bulk
 *
 * Bulk repair AWBs using prefix matching against all FanCourier borderou data.
 *
 * This endpoint:
 * 1. Fetches ALL borderou data for a date range (default: last 60 days)
 * 2. Builds a map of "first N chars" → "full AWB number" for all AWBs in FanCourier
 * 3. For each AWB in our database, looks up the full AWB using prefix matching
 * 4. Updates AWBs where a match is found
 *
 * Request body:
 * - startDate?: string (ISO date for borderou fetch, default: 60 days ago)
 * - endDate?: string (ISO date for borderou fetch, default: today)
 * - awbIds?: string[] (specific AWB IDs to repair, or all if not provided)
 * - prefixLength?: number (how many chars to use for matching, default: 13)
 * - dryRun?: boolean (default: true)
 * - limit?: number (max AWBs to process, default: 100)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Trebuie sa fii autentificat" },
        { status: 401 }
      );
    }

    // Require admin permission
    const isAdmin = await hasPermission(session.user.id, "admin");
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: "Doar administratorii pot repara AWB-uri" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      startDate,
      endDate,
      awbIds,
      prefixLength = 13,
      dryRun = true,
      limit = 100,
    } = body;

    const bordereauxEndDate = endDate ? new Date(endDate) : new Date();
    const bordereauxStartDate = startDate
      ? new Date(startDate)
      : new Date(Date.now() - 14 * 24 * 60 * 60 * 1000); // 14 days ago (reduced for faster response)

    console.log("\n" + "=".repeat(60));
    console.log("BULK AWB REPAIR - PREFIX MATCHING");
    console.log("=".repeat(60));
    console.log(`User: ${session.user.email}`);
    console.log(`Bordeaux date range: ${bordereauxStartDate.toISOString().split('T')[0]} to ${bordereauxEndDate.toISOString().split('T')[0]}`);
    console.log(`Prefix length: ${prefixLength}`);
    console.log(`Dry Run: ${dryRun}`);
    console.log(`Limit: ${limit}`);
    if (awbIds) console.log(`Specific AWBs: ${awbIds.length}`);
    console.log("=".repeat(60) + "\n");

    const result = {
      bordeauxFetched: 0,
      prefixMapSize: 0,
      checked: 0,
      matched: 0,
      repaired: 0,
      noMatch: 0,
      alreadyCorrect: 0,
      errors: 0,
      details: [] as Array<{
        awbId: string;
        orderNumber: string;
        oldAwb: string;
        newAwb?: string;
        status: "repaired" | "already_correct" | "no_match" | "error";
        message: string;
      }>,
    };

    // Step 1: Fetch all borderou data for the date range
    console.log("📥 Fetching borderou data from FanCourier...\n");
    const fancourier = await createFanCourierClient();

    // Build prefix map: first N chars → full AWB number
    const prefixMap = new Map<string, string[]>();

    // Generate all dates in range
    const dates: string[] = [];
    const currentDate = new Date(bordereauxStartDate);
    while (currentDate <= bordereauxEndDate) {
      dates.push(currentDate.toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log(`📅 Fetching ${dates.length} days of borderou data...\n`);

    for (const date of dates) {
      try {
        const response = await fancourier.getAllAWBsForDate(date);

        if (response.success && response.data) {
          result.bordeauxFetched += response.data.length;

          for (const item of response.data) {
            const fullAwb = String(item.info?.awbNumber || '');
            if (fullAwb.length >= prefixLength) {
              const prefix = fullAwb.substring(0, prefixLength);
              if (!prefixMap.has(prefix)) {
                prefixMap.set(prefix, []);
              }
              // Only add if not already in the list
              const existing = prefixMap.get(prefix)!;
              if (!existing.includes(fullAwb)) {
                existing.push(fullAwb);
              }
            }
          }
        }
      } catch (error: any) {
        console.error(`   ⚠️ Error fetching ${date}: ${error.message}`);
      }
    }

    result.prefixMapSize = prefixMap.size;
    console.log(`\n📋 Built prefix map with ${prefixMap.size} unique prefixes from ${result.bordeauxFetched} AWBs\n`);

    // Debug: show some sample mappings
    let sampleCount = 0;
    for (const [prefix, fullAwbs] of prefixMap) {
      if (sampleCount < 5) {
        console.log(`   Sample: ${prefix} → ${fullAwbs.join(', ')}`);
        sampleCount++;
      }
    }
    console.log("");

    // Step 2: Get AWBs from our database
    const awbs = await prisma.aWB.findMany({
      where: awbIds && awbIds.length > 0
        ? { id: { in: awbIds }, awbNumber: { not: null } }
        : { awbNumber: { not: null } },
      include: {
        order: {
          select: { shopifyOrderNumber: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    console.log(`📋 Found ${awbs.length} AWBs to check\n`);

    // Step 3: Match and repair
    for (const awb of awbs) {
      if (!awb.awbNumber) continue;

      result.checked++;
      const orderNumber = awb.order?.shopifyOrderNumber || awb.orderId;
      const currentAwb = awb.awbNumber;

      // Use the current AWB as the prefix (it's truncated)
      const prefix = currentAwb.length >= prefixLength
        ? currentAwb.substring(0, prefixLength)
        : currentAwb;

      console.log(`[${result.checked}/${awbs.length}] Order: ${orderNumber}, Current AWB: ${currentAwb}`);

      const matches = prefixMap.get(prefix) || [];

      if (matches.length === 0) {
        // No match found - try shorter prefixes
        let foundMatch: string | null = null;
        for (let len = currentAwb.length; len >= Math.min(10, currentAwb.length); len--) {
          const shorterPrefix = currentAwb.substring(0, len);
          for (const [mapPrefix, mapValues] of prefixMap) {
            if (mapPrefix.startsWith(shorterPrefix) || mapValues.some(v => v.startsWith(currentAwb))) {
              foundMatch = mapValues.find(v => v.startsWith(currentAwb)) || null;
              if (foundMatch) break;
            }
          }
          if (foundMatch) break;
        }

        if (foundMatch) {
          matches.push(foundMatch);
        }
      }

      if (matches.length === 0) {
        console.log(`   ❌ No match found in borderou`);
        result.noMatch++;
        result.details.push({
          awbId: awb.id,
          orderNumber,
          oldAwb: currentAwb,
          status: "no_match",
          message: "No matching AWB found in FanCourier borderou",
        });
      } else if (matches.length === 1) {
        const fullAwb = matches[0];

        if (fullAwb === currentAwb) {
          console.log(`   ✅ Already correct`);
          result.alreadyCorrect++;
          result.details.push({
            awbId: awb.id,
            orderNumber,
            oldAwb: currentAwb,
            status: "already_correct",
            message: "AWB is already correct",
          });
        } else {
          console.log(`   🎯 Match found: ${currentAwb} → ${fullAwb}`);
          result.matched++;

          if (!dryRun) {
            await prisma.aWB.update({
              where: { id: awb.id },
              data: { awbNumber: fullAwb },
            });
            console.log(`   ✅ Updated in database`);
            result.repaired++;
          }

          result.details.push({
            awbId: awb.id,
            orderNumber,
            oldAwb: currentAwb,
            newAwb: fullAwb,
            status: "repaired",
            message: dryRun ? `[DRY RUN] Would update: ${currentAwb} → ${fullAwb}` : `Updated: ${currentAwb} → ${fullAwb}`,
          });
        }
      } else {
        console.log(`   ⚠️ Multiple matches: ${matches.join(', ')}`);
        result.errors++;
        result.details.push({
          awbId: awb.id,
          orderNumber,
          oldAwb: currentAwb,
          status: "error",
          message: `Multiple matches found: ${matches.join(', ')}`,
        });
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("BULK REPAIR SUMMARY");
    console.log("=".repeat(60));
    console.log(`Bordeaux fetched: ${result.bordeauxFetched}`);
    console.log(`Prefix map size: ${result.prefixMapSize}`);
    console.log(`AWBs checked: ${result.checked}`);
    console.log(`Matches found: ${result.matched}`);
    console.log(`Repaired: ${result.repaired}`);
    console.log(`Already correct: ${result.alreadyCorrect}`);
    console.log(`No match: ${result.noMatch}`);
    console.log(`Errors: ${result.errors}`);
    console.log("=".repeat(60) + "\n");

    return NextResponse.json({
      success: true,
      dryRun,
      ...result,
    });
  } catch (error: any) {
    console.error("Error in bulk repair:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
