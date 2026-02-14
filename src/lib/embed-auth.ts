import { NextRequest } from "next/server";

/**
 * Validates embed token from Authorization header against EMBED_SECRET_TOKEN env variable.
 * Used for iframe-based embed access (e.g., Daktela) where cookies don't work cross-origin.
 */
export function validateEmbedToken(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;

  const token = authHeader.slice(7);
  const secret = process.env.EMBED_SECRET_TOKEN;

  if (!secret || !token) return false;

  return token === secret;
}
