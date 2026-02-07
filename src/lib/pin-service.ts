/**
 * PIN Service for Exception Approvals
 *
 * Handles PIN hashing, verification, and session management for manual
 * stornare/incasare operations that bypass manifest-based workflows.
 *
 * Security: PIN is stored as bcrypt hash, never plaintext.
 * Session: 5-minute expiry, one-time use for critical operations.
 */

import bcrypt from "bcryptjs";
import prisma from "./db";
import crypto from "crypto";

const PIN_SESSION_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const BCRYPT_ROUNDS = 10;

export interface PINSession {
  valid: boolean;
  expiresAt: Date;
  sessionToken?: string;
  error?: string;
}

/**
 * Hash a 6-digit PIN for storage
 */
export async function hashPIN(pin: string): Promise<string> {
  if (!/^\d{6}$/.test(pin)) {
    throw new Error("PIN must be exactly 6 digits");
  }
  return bcrypt.hash(pin, BCRYPT_ROUNDS);
}

/**
 * Set or update the PIN in Settings
 * Requires: settings.security permission
 */
export async function setPIN(pin: string, userId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    if (!/^\d{6}$/.test(pin)) {
      return { success: false, error: "PIN must be exactly 6 digits" };
    }

    const pinHash = await hashPIN(pin);

    await prisma.settings.upsert({
      where: { id: "default" },
      update: {
        pinHash,
        pinChangedAt: new Date()
      },
      create: {
        id: "default",
        pinHash,
        pinChangedAt: new Date()
      }
    });

    // Log PIN change for audit
    await prisma.auditLog.create({
      data: {
        userId,
        action: "pin.changed",
        entityType: "Settings",
        entityId: "default",
        metadata: {
          timestamp: new Date().toISOString(),
          action: "PIN updated"
        }
      }
    });

    return { success: true };
  } catch (error: unknown) {
    console.error("Error setting PIN:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: message };
  }
}

/**
 * Verify a PIN and return a session token if valid
 * Session token has 5-minute expiry for one-time use
 */
export async function verifyPIN(
  enteredPIN: string,
  userId?: string
): Promise<PINSession> {
  try {
    const settings = await prisma.settings.findUnique({
      where: { id: "default" }
    });

    if (!settings?.pinHash) {
      return {
        valid: false,
        expiresAt: new Date(),
        error: "PIN not configured"
      };
    }

    const isValid = await bcrypt.compare(enteredPIN, settings.pinHash);

    if (!isValid) {
      // Log failed attempt for security audit
      await prisma.auditLog.create({
        data: {
          userId: userId || null,
          action: "pin.failed_attempt",
          entityType: "Settings",
          entityId: "default",
          metadata: {
            timestamp: new Date().toISOString(),
            reason: "Invalid PIN entered"
          }
        }
      });

      return {
        valid: false,
        expiresAt: new Date(),
        error: "Invalid PIN"
      };
    }

    // Generate session token
    const sessionToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + PIN_SESSION_DURATION_MS);

    // Log successful verification
    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        action: "pin.verified",
        entityType: "Settings",
        entityId: "default",
        metadata: {
          timestamp: new Date().toISOString(),
          sessionExpiresAt: expiresAt.toISOString()
        }
      }
    });

    return {
      valid: true,
      expiresAt,
      sessionToken
    };
  } catch (error: unknown) {
    console.error("Error verifying PIN:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      valid: false,
      expiresAt: new Date(),
      error: message
    };
  }
}

/**
 * Check if PIN is configured in the system
 */
export async function isPINConfigured(): Promise<boolean> {
  const settings = await prisma.settings.findUnique({
    where: { id: "default" },
    select: { pinHash: true }
  });
  return !!settings?.pinHash;
}

/**
 * Validate session token format (UUID v4)
 * Note: This only validates format, not actual session validity
 * For a production system, consider storing sessions in database or Redis
 */
export function isValidSessionTokenFormat(token: string): boolean {
  const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidV4Regex.test(token);
}
