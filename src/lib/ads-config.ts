/**
 * Ads Configuration Helper
 * 
 * Obține setările pentru platformele de advertising din baza de date.
 * Folosit de meta-ads.ts și tiktok-ads.ts pentru a obține credențialele.
 */

import { prisma } from "@/lib/db";
import { AdsPlatform } from "@prisma/client";

export interface AdsConfig {
  appId: string;
  appSecret: string;
  redirectUri: string;
  isConfigured: boolean;
  testMode: boolean;
}

// Cache pentru setări (expiră după 5 minute)
const configCache: Map<string, { config: AdsConfig; timestamp: number }> = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minute

/**
 * Obține configurația pentru o platformă specifică
 */
export async function getAdsConfig(platform: AdsPlatform): Promise<AdsConfig | null> {
  // Verifică cache
  const cached = configCache.get(platform);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.config;
  }

  try {
    const settings = await prisma.adsSettings.findUnique({
      where: { platform },
    });

    if (!settings || !settings.isConfigured) {
      return null;
    }

    const config: AdsConfig = {
      appId: settings.appId || "",
      appSecret: settings.appSecret || "",
      redirectUri: settings.redirectUri || "",
      isConfigured: settings.isConfigured,
      testMode: settings.testMode,
    };

    // Salvează în cache
    configCache.set(platform, { config, timestamp: Date.now() });

    return config;
  } catch (error) {
    console.error(`Error fetching ads config for ${platform}:`, error);
    return null;
  }
}

/**
 * Verifică dacă o platformă este configurată
 */
export async function isPlatformConfigured(platform: AdsPlatform): Promise<boolean> {
  const config = await getAdsConfig(platform);
  return config?.isConfigured || false;
}

/**
 * Obține configurația Meta Ads
 */
export async function getMetaAdsConfig(): Promise<AdsConfig | null> {
  return getAdsConfig(AdsPlatform.META);
}

/**
 * Obține configurația TikTok Ads
 */
export async function getTikTokAdsConfig(): Promise<AdsConfig | null> {
  return getAdsConfig(AdsPlatform.TIKTOK);
}

/**
 * Obține configurația Google Ads
 */
export async function getGoogleAdsConfig(): Promise<AdsConfig | null> {
  return getAdsConfig(AdsPlatform.GOOGLE);
}

/**
 * Invalidează cache-ul pentru o platformă
 */
export function invalidateAdsConfigCache(platform?: AdsPlatform): void {
  if (platform) {
    configCache.delete(platform);
  } else {
    configCache.clear();
  }
}

/**
 * Obține URL-ul de redirect default pentru o platformă
 */
export function getDefaultRedirectUri(platform: AdsPlatform, baseUrl?: string): string {
  const base = baseUrl || process.env.NEXT_PUBLIC_APP_URL || "https://localhost:3000";
  
  switch (platform) {
    case AdsPlatform.META:
      return `${base}/api/ads/accounts/callback/meta`;
    case AdsPlatform.TIKTOK:
      return `${base}/api/ads/accounts/callback/tiktok`;
    case AdsPlatform.GOOGLE:
      return `${base}/api/ads/accounts/callback/google`;
    default:
      return base;
  }
}
