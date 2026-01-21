/**
 * Cron Lock Service
 *
 * Prevents concurrent execution of cron jobs using database-based locking.
 * Uses atomic operations to ensure only one instance runs at a time.
 */

import prisma from "./db";

// Default lock TTL: 10 minutes (in milliseconds)
const DEFAULT_LOCK_TTL_MS = 10 * 60 * 1000;

interface CronLockResult {
  acquired: boolean;
  lockId?: string;
  existingLock?: {
    lockedAt: Date;
    lockedBy: string;
  };
}

/**
 * Try to acquire a lock for a cron job
 *
 * @param jobName - Unique identifier for the cron job
 * @param ttlMs - Lock TTL in milliseconds (default: 10 minutes)
 * @returns Object indicating if lock was acquired
 */
export async function acquireCronLock(
  jobName: string,
  ttlMs: number = DEFAULT_LOCK_TTL_MS
): Promise<CronLockResult> {
  const lockId = `${jobName}-${Date.now()}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMs);

  try {
    // Ensure the CronLock table exists (creates if not exists)
    await ensureCronLockTable();

    // Try to acquire lock atomically using raw SQL
    // This uses INSERT ... ON CONFLICT with a condition check for expired locks
    const result = await prisma.$executeRaw`
      INSERT INTO "CronLock" ("jobName", "lockId", "lockedAt", "expiresAt")
      VALUES (${jobName}, ${lockId}, ${now}, ${expiresAt})
      ON CONFLICT ("jobName")
      DO UPDATE SET
        "lockId" = ${lockId},
        "lockedAt" = ${now},
        "expiresAt" = ${expiresAt}
      WHERE "CronLock"."expiresAt" < ${now}
    `;

    // If result is 1, we acquired the lock (either inserted or updated expired lock)
    if (result === 1) {
      console.log(`[CronLock] Acquired lock for ${jobName} (ID: ${lockId})`);
      return { acquired: true, lockId };
    }

    // Lock not acquired - check existing lock
    const existingLock = await prisma.$queryRaw<Array<{ lockedAt: Date; lockId: string }>>`
      SELECT "lockedAt", "lockId" FROM "CronLock" WHERE "jobName" = ${jobName}
    `;

    if (existingLock.length > 0) {
      console.log(`[CronLock] Job ${jobName} is already running (locked by ${existingLock[0].lockId} at ${existingLock[0].lockedAt})`);
      return {
        acquired: false,
        existingLock: {
          lockedAt: existingLock[0].lockedAt,
          lockedBy: existingLock[0].lockId,
        },
      };
    }

    return { acquired: false };
  } catch (error) {
    console.error(`[CronLock] Error acquiring lock for ${jobName}:`, error);
    return { acquired: false };
  }
}

/**
 * Release a cron lock
 *
 * @param jobName - Unique identifier for the cron job
 * @param lockId - The lock ID returned from acquireCronLock
 */
export async function releaseCronLock(jobName: string, lockId?: string): Promise<boolean> {
  try {
    if (lockId) {
      // Only release if we own the lock
      const result = await prisma.$executeRaw`
        DELETE FROM "CronLock" WHERE "jobName" = ${jobName} AND "lockId" = ${lockId}
      `;
      if (result === 1) {
        console.log(`[CronLock] Released lock for ${jobName} (ID: ${lockId})`);
        return true;
      }
    } else {
      // Force release (for cleanup)
      await prisma.$executeRaw`
        DELETE FROM "CronLock" WHERE "jobName" = ${jobName}
      `;
      console.log(`[CronLock] Force released lock for ${jobName}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`[CronLock] Error releasing lock for ${jobName}:`, error);
    return false;
  }
}

/**
 * Execute a function with a cron lock
 * Automatically acquires and releases the lock
 *
 * @param jobName - Unique identifier for the cron job
 * @param fn - Function to execute if lock is acquired
 * @param ttlMs - Lock TTL in milliseconds
 * @returns Result of the function or null if lock not acquired
 */
export async function withCronLock<T>(
  jobName: string,
  fn: () => Promise<T>,
  ttlMs: number = DEFAULT_LOCK_TTL_MS
): Promise<{ success: boolean; result?: T; skipped?: boolean; reason?: string }> {
  const lock = await acquireCronLock(jobName, ttlMs);

  if (!lock.acquired) {
    return {
      success: false,
      skipped: true,
      reason: lock.existingLock
        ? `Job already running since ${lock.existingLock.lockedAt.toISOString()}`
        : "Could not acquire lock",
    };
  }

  try {
    const result = await fn();
    return { success: true, result };
  } finally {
    await releaseCronLock(jobName, lock.lockId);
  }
}

/**
 * Ensure the CronLock table exists
 * Creates it if it doesn't exist
 */
async function ensureCronLockTable(): Promise<void> {
  try {
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "CronLock" (
        "jobName" VARCHAR(100) PRIMARY KEY,
        "lockId" VARCHAR(100) NOT NULL,
        "lockedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "expiresAt" TIMESTAMP NOT NULL
      )
    `;
  } catch (error) {
    // Table might already exist, that's fine
    console.log("[CronLock] Table check completed");
  }
}

/**
 * Clean up expired locks (for maintenance)
 */
export async function cleanupExpiredLocks(): Promise<number> {
  try {
    const result = await prisma.$executeRaw`
      DELETE FROM "CronLock" WHERE "expiresAt" < NOW()
    `;
    if (result > 0) {
      console.log(`[CronLock] Cleaned up ${result} expired locks`);
    }
    return result;
  } catch (error) {
    console.error("[CronLock] Error cleaning up expired locks:", error);
    return 0;
  }
}
